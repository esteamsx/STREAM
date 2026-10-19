
const CONNECT_TIMEOUT_MS = 12000;   // how long one attempt may take
const DISCONNECT_GRACE_MS = 4000;   // short network blips are given time to recover
const MAX_ATTEMPTS = 4;
const DUPLICATE_CALL_MS = 1500;     // ignore a second "call them" request that arrives straight after the first

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const newSid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function createVoice({ post, getIce, onChange }) {
  let ctx = null;                 // { gameId, key, uid, role, color, players, error }
  let ice = [{ urls: "stun:stun.l.google.com:19302" }];
  let hasTurn = false;
  let micTrack = null;
  let micStream = null;
  let audioCtx = null;
  let localAnalyser = null;
  let mutedAll = false;
  let audioBlocked = false;
  let sendChain = Promise.resolve();
  const peers = new Map();        // uid -> peer
  const earlyIce = new Map();     // uid -> [{ sid, candidate }] that arrived before their call existed
  let levelBuf = null;

  const notify = () => { try { onChange && onChange(); } catch { /* ignore */ } };

  function audioContext() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    } catch { /* no audio context */ }
    return audioCtx;
  }

  function analyserFor(stream) {
    const c = audioContext();
    if (!c) return null;
    try {
      const src = c.createMediaStreamSource(stream);
      const an = c.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      const silent = c.createGain();
      silent.gain.value = 0;
      an.connect(silent);
      silent.connect(c.destination);
      an._keep = [src, silent];
      return an;
    } catch { return null; }
  }

  function levelOf(an) {
    if (!an) return 0;
    if (!levelBuf || levelBuf.length !== an.fftSize) levelBuf = new Uint8Array(an.fftSize);
    an.getByteTimeDomainData(levelBuf);
    let sum = 0;
    for (let i = 0; i < levelBuf.length; i++) { const v = (levelBuf[i] - 128) / 128; sum += v * v; }
    const rms = Math.sqrt(sum / levelBuf.length);
    return Math.min(1, Math.sqrt(rms) * 2.4);
  }

  function tryPlay(p) {
    if (!p.el) return;
    p.el.muted = mutedAll || p.muted;
    const r = p.el.play();
    if (r && r.then) {
      r.then(() => { if (audioBlocked) { audioBlocked = false; notify(); } })
        .catch((e) => { if (e && e.name === "NotAllowedError") { audioBlocked = true; notify(); } });
    }
  }
  function resumeAudio() {
    audioContext();
    for (const p of peers.values()) tryPlay(p);
  }
  try { window.addEventListener("pointerdown", () => { if (audioBlocked || (audioCtx && audioCtx.state === "suspended")) resumeAudio(); }, { capture: true, passive: true }); } catch { /* not in a browser */ }

  function send(to, data) {
    const c = ctx;
    if (!c) return;
    sendChain = sendChain.then(async () => {
      for (let i = 0; i < 3; i++) {
        if (ctx !== c && data.kind !== "bye") return;
        try { await post("/voice/signal", { gameId: c.gameId, key: c.key, to, data }); return; }
        catch (e) {
          if (e && (e.status === 403 || e.status === 404 || e.status === 400)) return;   // the room is gone, resending will not help
          await sleep(350 * (i + 1));
        }
      }
    }).catch(() => {});
  }

  function clearTimers(p) { clearTimeout(p.timer); clearTimeout(p.graceTimer); p.timer = null; p.graceTimer = null; }

  function closePeer(uid, tell) {
    const p = peers.get(uid);
    if (!p) return;
    clearTimers(p);
    p.closed = true;
    try { p.pc.onicecandidate = null; p.pc.ontrack = null; p.pc.onconnectionstatechange = null; p.pc.oniceconnectionstatechange = null; p.pc.close(); } catch { /* ignore */ }
    if (p.el) { try { p.el.pause(); p.el.srcObject = null; p.el.remove(); } catch { /* ignore */ } }
    peers.delete(uid);
    if (tell && ctx) send(uid, { kind: "bye", sid: p.sid });
    notify();
  }

  function failMessage() {
    return hasTurn
      ? "Voice could not connect. This network may be blocking voice. Try another connection."
      : "Voice could not connect. This network needs a relay server for voice.";
  }

  function onAttemptTimeout(p) {
    if (p.closed || peers.get(p.uid) !== p || p.state === "connected" || !ctx) return;
    if (p.initiator) {
      if (p.attempts < MAX_ATTEMPTS) { call(p.uid, p.role, { retry: true }); return; }
    } else if (p.attempts < 2) {
      p.attempts++;
      p.timer = setTimeout(() => onAttemptTimeout(p), CONNECT_TIMEOUT_MS);
      post("/voice/join", { gameId: ctx.gameId, key: ctx.key }).catch(() => {});
      return;
    }
    p.state = "failed";
    p.error = failMessage();
    notify();
  }

  function refreshState(p) {
    if (p.closed || peers.get(p.uid) !== p) return;
    const cs = p.pc.connectionState;
    const is = p.pc.iceConnectionState;
    const up = cs === "connected" || is === "connected" || is === "completed";
    if (up) {
      clearTimers(p);
      p.state = "connected"; p.error = null; p.attempts = 0;
      tryPlay(p);
    } else if (cs === "failed" || is === "failed") {
      clearTimers(p);
      if (p.initiator && p.attempts < MAX_ATTEMPTS) { p.state = "connecting"; setTimeout(() => { if (ctx && peers.get(p.uid) === p && p.state !== "connected") call(p.uid, p.role, { retry: true }); }, 800); }
      else { p.state = "failed"; p.error = failMessage(); }
    } else if (cs === "disconnected" || is === "disconnected") {
      p.state = "connecting";
      if (!p.graceTimer) p.graceTimer = setTimeout(() => {
        p.graceTimer = null;
        if (p.closed || peers.get(p.uid) !== p || p.state === "connected") return;
        if (p.initiator) call(p.uid, p.role, { retry: true });
      }, DISCONNECT_GRACE_MS);
    }
    notify();
  }

  function makePeer(uid, role, sid, initiator, attempts) {
    const old = peers.get(uid);
    const keepMute = old ? old.muted : false;
    if (old) closePeer(uid, false);
    const pc = new RTCPeerConnection({ iceServers: ice, bundlePolicy: "max-bundle" });
    const p = { uid, role, sid, pc, initiator, el: null, analyser: null, muted: keepMute, state: "connecting", error: null, attempts: attempts || 0, queued: [], remoteSet: false, tr: null, startedAt: Date.now(), timer: null, graceTimer: null, closed: false };
    pc.onicecandidate = (e) => { if (e.candidate && !p.closed) send(uid, { kind: "ice", sid, candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
    pc.ontrack = (e) => {
      const stream = e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track]);
      if (!p.el) {
        p.el = document.createElement("audio");
        p.el.autoplay = true; p.el.playsInline = true; p.el.setAttribute("playsinline", ""); p.el.style.display = "none";
        document.body.appendChild(p.el);
      }
      p.el.srcObject = stream;
      tryPlay(p);
      e.track.onunmute = () => tryPlay(p);
      p.analyser = analyserFor(stream);
      notify();
    };
    pc.onconnectionstatechange = () => refreshState(p);
    pc.oniceconnectionstatechange = () => refreshState(p);
    p.timer = setTimeout(() => onAttemptTimeout(p), CONNECT_TIMEOUT_MS);
    peers.set(uid, p);
    const held = earlyIce.get(uid);
    if (held) { earlyIce.delete(uid); for (const x of held) if (!x.sid || x.sid === sid) p.queued.push(x.candidate); }
    return p;
  }

  async function flushIce(p) {
    for (const c of p.queued.splice(0)) { try { await p.pc.addIceCandidate(c); } catch { /* a stale candidate is harmless */ } }
  }

  async function attachMic(p) {
    if (!micTrack || !p.tr || !p.tr.sender) return;
    const d = p.tr.direction;
    if (d === "sendrecv" || d === "sendonly") { try { await p.tr.sender.replaceTrack(micTrack); } catch { /* ignore */ } }
  }

  async function call(uid, theirRole, opts = {}) {
    if (!ctx) return;
    const old = peers.get(uid);
    if (old && old.initiator && !opts.retry && !old.closed && Date.now() - old.startedAt < DUPLICATE_CALL_MS) return;
    const attempts = opts.retry && old ? old.attempts + 1 : 0;
    const p = makePeer(uid, theirRole, newSid(), true, attempts);
    const bothPlayers = ctx.role === "player" && theirRole === "player";
    try {
      p.tr = p.pc.addTransceiver("audio", { direction: bothPlayers ? "sendrecv" : "recvonly" });
      await attachMic(p);
      const offer = await p.pc.createOffer(opts.retry ? { iceRestart: true } : undefined);
      if (p.closed || peers.get(uid) !== p) return;
      await p.pc.setLocalDescription(offer);
      if (p.closed || peers.get(uid) !== p) return;
      send(uid, { kind: "offer", sid: p.sid, sdp: p.pc.localDescription.sdp, role: ctx.role });
    } catch {
      if (peers.get(uid) === p) { p.state = "failed"; p.error = "Voice could not start on this device."; notify(); }
    }
  }

  async function answer(uid, theirRole, sid, sdp) {
    if (!ctx || !sid || !sdp) return;
    const cur = peers.get(uid);
    if (cur && !cur.initiator && cur.sid === sid) return;          // the same offer twice
    const p = makePeer(uid, theirRole, sid, false, 0);
    try {
      await p.pc.setRemoteDescription({ type: "offer", sdp });
      if (p.closed || peers.get(uid) !== p) return;
      p.remoteSet = true;
      p.tr = p.pc.getTransceivers().find((t) => t.receiver && t.receiver.track && t.receiver.track.kind === "audio") || p.pc.getTransceivers()[0] || null;
      if (p.tr) {
        if (ctx.role === "player") p.tr.direction = theirRole === "spectator" ? "sendonly" : "sendrecv";
        else p.tr.direction = "recvonly";
        await attachMic(p);
      }
      const ans = await p.pc.createAnswer();
      if (p.closed || peers.get(uid) !== p) return;
      await p.pc.setLocalDescription(ans);
      if (p.closed || peers.get(uid) !== p) return;
      send(uid, { kind: "answer", sid, sdp: p.pc.localDescription.sdp });
      await flushIce(p);
    } catch {
      if (peers.get(uid) === p) { p.state = "failed"; p.error = "Voice could not start on this device."; notify(); }
    }
  }

  async function onAnswer(uid, sid, sdp) {
    const p = peers.get(uid);
    if (!p || !p.initiator || p.sid !== sid || p.pc.signalingState !== "have-local-offer") return;
    try {
      await p.pc.setRemoteDescription({ type: "answer", sdp });
      p.remoteSet = true;
      await flushIce(p);
    } catch { /* the attempt timer will try again */ }
  }

  async function onIce(uid, sid, candidate) {
    const p = peers.get(uid);
    if (!p || (sid && p.sid !== sid)) {
      if (!p || !sid || p.sid !== sid) {
        const list = earlyIce.get(uid) || [];
        if (list.length < 60) list.push({ sid, candidate });
        earlyIce.set(uid, list);
      }
      return;
    }
    if (!p.remoteSet) { p.queued.push(candidate); return; }
    try { await p.pc.addIceCandidate(candidate); } catch { /* ignore */ }
  }

  function ensureCalls() {
    if (!ctx || !ctx.players) return;
    if (ctx.role === "spectator") {
      for (const col of ["w", "b"]) {
        const uid = ctx.players[col];
        const p = uid ? peers.get(uid) : null;
        if (uid && uid !== ctx.uid && (!p || p.state === "failed")) call(uid, "player");
      }
    } else if (ctx.role === "player" && ctx.color === "w") {
      const uid = ctx.players.b;
      const p = uid ? peers.get(uid) : null;
      if (uid && (!p || p.state === "failed")) call(uid, "player");
    }
  }

  function micError(e) {
    const name = (e && e.name) || "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") return "Microphone access is blocked. Allow the microphone for this site in your browser settings, then tap the mic again.";
    if (name === "NotFoundError" || name === "DevicesNotFoundError") return "No microphone was found on this device.";
    if (name === "NotReadableError" || name === "TrackStartError") return "Your microphone is busy. Close other apps or browser tabs that are using it, then try again.";
    return "The microphone could not start" + (name ? " (" + name + ")" : "") + ". Try again.";
  }

  async function getMic() {
    if (typeof window !== "undefined" && window.isSecureContext === false) throw new Error("Voice needs a secure (https) connection.");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("This browser cannot use the microphone here. Open the site in Chrome or Safari.");
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) {
      if (e && (e.name === "OverconstrainedError" || e.name === "ConstraintNotSatisfiedError" || e.name === "TypeError" || e.name === "AbortError")) {
        try { return await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e2) { throw new Error(micError(e2)); }
      }
      throw new Error(micError(e));
    }
  }

  async function rejoin() {
    if (!ctx) return;
    const c = ctx;
    try {
      const j = await post("/voice/join", { gameId: c.gameId, key: c.key });
      if (ctx !== c) return;
      c.players = j.players || c.players;
      c.role = j.role || c.role;
      c.color = j.color || c.color;
      c.error = null;
    } catch (e) {
      if (ctx !== c) return;
      c.error = e && e.message ? "Voice could not start: " + e.message : "Voice could not start.";
    }
    ensureCalls();
    notify();
  }

  return {
    get active() { return !!ctx; },
    get micOn() { return !!micTrack; },
    get mutedAll() { return mutedAll; },
    get audioBlocked() { return audioBlocked; },
    peers: () => [...peers.values()].map((p) => ({ uid: p.uid, role: p.role, state: p.state, muted: p.muted, error: p.error })),

    status() {
      if (!ctx) return { state: "idle" };
      const list = [...peers.values()];
      if (list.some((p) => p.state === "connected")) return { state: "connected", audioBlocked };
      if (ctx.error && !list.length) return { state: "failed", message: ctx.error };
      if (!list.length) return { state: "waiting" };
      if (list.every((p) => p.state === "failed")) return { state: "failed", message: list[0].error || failMessage() };
      return { state: "connecting" };
    },

    async start(c) {
      if (ctx && ctx.gameId === c.gameId && ctx.key === c.key && ctx.uid === c.uid) {
        ctx.players = c.players || ctx.players;
        await rejoin();
        return;
      }
      this.stop();
      ctx = c;
      const mine = ctx;
      try {
        const d = await getIce();
        if (ctx !== mine) return;
        if (d && Array.isArray(d.iceServers) && d.iceServers.length) ice = d.iceServers;
      } catch { /* the default STUN is used */ }
      hasTurn = ice.some((s) => [].concat(s.urls || []).some((u) => /^turns?:/i.test(u)));
      await rejoin();
    },

    onPeer({ uid, role }) {
      if (!ctx || uid === ctx.uid) return;
      if (ctx.role === "spectator" && role === "player") call(uid, "player");
      else if (ctx.role === "player" && role === "player" && ctx.color === "w") call(uid, "player");
    },

    onSignal({ from, role, data }) {
      if (!ctx || !data) return;
      if (data.kind === "offer") answer(from, role, data.sid, data.sdp);
      else if (data.kind === "answer") onAnswer(from, data.sid, data.sdp);
      else if (data.kind === "ice") onIce(from, data.sid, data.candidate);
      else if (data.kind === "bye") { const p = peers.get(from); if (p && (!data.sid || p.sid === data.sid)) closePeer(from, false); }
    },

    retry() {
      if (!ctx) return;
      for (const p of [...peers.values()]) { if (p.state === "failed") { if (p.initiator) call(p.uid, p.role); else { p.state = "connecting"; p.error = null; p.attempts = 0; clearTimeout(p.timer); p.timer = setTimeout(() => onAttemptTimeout(p), CONNECT_TIMEOUT_MS); } } }
      rejoin();
      resumeAudio();
      notify();
    },

    resumeAudio,

    async setMic(on) {
      if (!ctx || ctx.role !== "player") return false;
      if (!on) {
        if (micTrack) micTrack.stop();
        micTrack = null; micStream = null; localAnalyser = null;
        for (const p of peers.values()) if (p.tr && p.tr.sender) { try { await p.tr.sender.replaceTrack(null); } catch { /* ignore */ } }
        notify();
        return true;
      }
      resumeAudio();                       // this tap also unlocks sound for the other player's voice
      if (micTrack) return true;
      micStream = await getMic();
      micTrack = micStream.getAudioTracks()[0];
      if (!micTrack) { micStream = null; throw new Error("No microphone was found on this device."); }
      micTrack.enabled = true;
      micTrack.onended = () => { micTrack = null; micStream = null; localAnalyser = null; notify(); };
      localAnalyser = analyserFor(micStream);
      for (const p of peers.values()) await attachMic(p);
      notify();
      return true;
    },

    muteAll(on) {
      mutedAll = !!on;
      for (const p of peers.values()) if (p.el) p.el.muted = mutedAll || p.muted;
      resumeAudio();
      notify();
    },
    mutePeer(uid, on) {
      const p = peers.get(uid);
      if (!p) return;
      p.muted = !!on;
      if (p.el) p.el.muted = mutedAll || p.muted;
      notify();
    },

    debug: () => ({
      micOn: !!micTrack, hasAnalyser: !!localAnalyser, ctx: audioCtx && audioCtx.state, trackState: micTrack && micTrack.readyState, muted: micTrack && micTrack.muted,
      hasTurn, iceServers: ice.length, audioBlocked,
      peers: [...peers.values()].map((p) => ({ uid: p.uid, initiator: p.initiator, state: p.state, conn: p.pc.connectionState, ice: p.pc.iceConnectionState, signalling: p.pc.signalingState, attempts: p.attempts, error: p.error })),
    }),
    async diagnose() {
      const out = [];
      for (const p of peers.values()) {
        let route = "unknown";
        try {
          const stats = await p.pc.getStats();
          let pairId = null;
          stats.forEach((s) => { if (s.type === "transport" && s.selectedCandidatePairId) pairId = s.selectedCandidatePairId; });
          stats.forEach((s) => { if (s.type === "candidate-pair" && (s.id === pairId || (s.nominated && s.state === "succeeded"))) { const l = stats.get(s.localCandidateId); if (l) route = l.candidateType; } });
        } catch { /* ignore */ }
        out.push({ uid: p.uid, state: p.state, route });
      }
      return out;
    },
    myLevel: () => (micTrack ? levelOf(localAnalyser) : 0),
    peerLevel: (uid) => { const p = peers.get(uid); return p && p.analyser && !(mutedAll || p.muted) ? levelOf(p.analyser) : 0; },
    incomingLevel() {
      if (mutedAll) return 0;
      let max = 0;
      for (const p of peers.values()) if (p.analyser && !p.muted) max = Math.max(max, levelOf(p.analyser));
      return max;
    },

    stop() {
      const had = ctx;
      for (const uid of [...peers.keys()]) closePeer(uid, !!had);
      if (micTrack) micTrack.stop();
      micTrack = null; micStream = null; localAnalyser = null;
      earlyIce.clear();
      audioBlocked = false;
      ctx = null;
      notify();
    },
  };
}
