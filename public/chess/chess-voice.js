
const MAX_RETRY = 2;

export function createVoice({ post, getIce, onChange }) {
  let ctx = null;                 // { gameId, key, uid, role, color, players }
  let ice = [{ urls: "stun:stun.l.google.com:19302" }];
  let micTrack = null;
  let micStream = null;
  let audioCtx = null;
  let localAnalyser = null;
  let mutedAll = false;
  const peers = new Map();        // uid -> { uid, role, pc, el, analyser, muted, state, retries, queued: [] , remoteSet }
  let levelBuf = null;

  const notify = () => { try { onChange && onChange(); } catch { /* ignore */ } };

  function audioContext() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
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

  function send(to, data) {
    if (!ctx) return;
    post("/voice/signal", { gameId: ctx.gameId, key: ctx.key, to, data }).catch(() => {});
  }

  function closePeer(uid, tell) {
    const p = peers.get(uid);
    if (!p) return;
    try { p.pc.onicecandidate = null; p.pc.ontrack = null; p.pc.onconnectionstatechange = null; p.pc.close(); } catch { /* ignore */ }
    if (p.el) { try { p.el.pause(); p.el.srcObject = null; } catch { /* ignore */ } }
    peers.delete(uid);
    if (tell) send(uid, { kind: "bye" });
    notify();
  }

  function makePeer(uid, role) {
    const old = peers.get(uid);
    const keepMute = old ? old.muted : false;
    if (old) closePeer(uid, false);
    const pc = new RTCPeerConnection({ iceServers: ice });
    const p = { uid, role, pc, el: null, analyser: null, muted: keepMute, state: "connecting", retries: old ? old.retries : 0, queued: [], remoteSet: false };
    pc.onicecandidate = (e) => { if (e.candidate) send(uid, { kind: "ice", candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
    pc.ontrack = (e) => {
      const stream = e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track]);
      if (!p.el) { p.el = new Audio(); p.el.autoplay = true; p.el.playsInline = true; }
      p.el.srcObject = stream;
      p.el.muted = mutedAll || p.muted;
      p.el.play().catch(() => {});
      p.analyser = analyserFor(stream);
      notify();
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      p.state = st === "connected" ? "connected" : st === "failed" || st === "disconnected" ? "failed" : "connecting";
      if (st === "failed" && p.initiator && p.retries < MAX_RETRY && peers.get(uid) === p) {
        const retries = p.retries + 1;
        setTimeout(() => { if (ctx && peers.get(uid) === p) { call(uid, p.role); const np = peers.get(uid); if (np) np.retries = retries; } }, 1500);
      }
      notify();
    };
    peers.set(uid, p);
    return p;
  }

  async function call(uid, theirRole) {
    if (!ctx) return;
    const p = makePeer(uid, theirRole);
    p.initiator = true;
    const bothPlayers = ctx.role === "player" && theirRole === "player";
    const tr = p.pc.addTransceiver("audio", { direction: bothPlayers ? "sendrecv" : "recvonly" });
    if (bothPlayers && micTrack) { try { await tr.sender.replaceTrack(micTrack); } catch { /* ignore */ } }
    try {
      const offer = await p.pc.createOffer();
      await p.pc.setLocalDescription(offer);
      send(uid, { kind: "offer", sdp: p.pc.localDescription.sdp, role: ctx.role });
    } catch { p.state = "failed"; notify(); }
  }

  async function answer(uid, theirRole, sdp) {
    if (!ctx) return;
    const p = makePeer(uid, theirRole);
    p.initiator = false;
    try {
      await p.pc.setRemoteDescription({ type: "offer", sdp });
      p.remoteSet = true;
      const tr = p.pc.getTransceivers()[0];
      if (tr) {
        if (ctx.role === "player") {
          tr.direction = theirRole === "spectator" ? "sendonly" : "sendrecv";
          if (micTrack) { try { await tr.sender.replaceTrack(micTrack); } catch { /* ignore */ } }
        } else tr.direction = "recvonly";
      }
      const ans = await p.pc.createAnswer();
      await p.pc.setLocalDescription(ans);
      send(uid, { kind: "answer", sdp: p.pc.localDescription.sdp });
      for (const c of p.queued.splice(0)) { try { await p.pc.addIceCandidate(c); } catch { /* ignore */ } }
    } catch { p.state = "failed"; notify(); }
  }

  async function onAnswer(uid, sdp) {
    const p = peers.get(uid);
    if (!p || !p.initiator) return;
    try {
      await p.pc.setRemoteDescription({ type: "answer", sdp });
      p.remoteSet = true;
      for (const c of p.queued.splice(0)) { try { await p.pc.addIceCandidate(c); } catch { /* ignore */ } }
    } catch { /* ignore */ }
  }

  async function onIce(uid, candidate) {
    const p = peers.get(uid);
    if (!p) return;
    if (!p.remoteSet) { p.queued.push(candidate); return; }
    try { await p.pc.addIceCandidate(candidate); } catch { /* ignore */ }
  }

  return {
    get active() { return !!ctx; },
    get micOn() { return !!micTrack; },
    get mutedAll() { return mutedAll; },
    peers: () => [...peers.values()].map((p) => ({ uid: p.uid, role: p.role, state: p.state, muted: p.muted })),

    async start(c) {
      this.stop();
      ctx = c;
      try { const d = await getIce(); if (d && d.iceServers) ice = d.iceServers; } catch { /* the default STUN is used */ }
      try {
        const j = await post("/voice/join", { gameId: c.gameId, key: c.key });
        ctx.players = j.players || c.players;
        ctx.role = j.role || c.role;
        ctx.color = j.color || c.color;
      } catch { /* voice is optional; the game still works */ }
      if (ctx.role === "spectator") {
        for (const col of ["w", "b"]) if (ctx.players && ctx.players[col]) call(ctx.players[col], "player");
      } else if (ctx.role === "player" && ctx.color === "w") {
        const other = ctx.players && ctx.players.b;
        if (other) call(other, "player");
      }
      notify();
    },

    onPeer({ uid, role, color }) {
      if (!ctx || uid === ctx.uid) return;
      if (ctx.role === "spectator" && role === "player") call(uid, "player");
      else if (ctx.role === "player" && role === "player" && ctx.color === "w") call(uid, "player");
    },

    onSignal({ from, role, data }) {
      if (!ctx || !data) return;
      if (data.kind === "offer") answer(from, role, data.sdp);
      else if (data.kind === "answer") onAnswer(from, data.sdp);
      else if (data.kind === "ice") onIce(from, data.candidate);
      else if (data.kind === "bye") closePeer(from, false);
    },

    async setMic(on) {
      if (!ctx || ctx.role !== "player") return false;
      if (!on) {
        if (micTrack) micTrack.stop();
        micTrack = null; micStream = null; localAnalyser = null;
        for (const p of peers.values()) for (const tr of p.pc.getTransceivers()) if (tr.sender) { try { await tr.sender.replaceTrack(null); } catch { /* ignore */ } }
        notify();
        return true;
      }
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      } catch (e) {
        const denied = e && (e.name === "NotAllowedError" || e.name === "SecurityError");
        throw new Error(denied ? "Microphone access was blocked. Allow it in your browser settings." : "No microphone was found.");
      }
      micTrack = micStream.getAudioTracks()[0];
      micTrack.onended = () => { micTrack = null; notify(); };
      localAnalyser = analyserFor(micStream);
      for (const p of peers.values()) {
        for (const tr of p.pc.getTransceivers()) {
          const d = tr.currentDirection || tr.direction;
          if (tr.sender && (d === "sendrecv" || d === "sendonly")) { try { await tr.sender.replaceTrack(micTrack); } catch { /* ignore */ } }
        }
      }
      notify();
      return true;
    },

    muteAll(on) {
      mutedAll = !!on;
      for (const p of peers.values()) if (p.el) p.el.muted = mutedAll || p.muted;
      notify();
    },
    mutePeer(uid, on) {
      const p = peers.get(uid);
      if (!p) return;
      p.muted = !!on;
      if (p.el) p.el.muted = mutedAll || p.muted;
      notify();
    },

    debug: () => ({ micOn: !!micTrack, hasAnalyser: !!localAnalyser, ctx: audioCtx && audioCtx.state, trackState: micTrack && micTrack.readyState, muted: micTrack && micTrack.muted }),
    myLevel: () => (micTrack ? levelOf(localAnalyser) : 0),
    peerLevel: (uid) => { const p = peers.get(uid); return p && p.analyser && !(mutedAll || p.muted) ? levelOf(p.analyser) : 0; },
    incomingLevel() {
      if (mutedAll) return 0;
      let max = 0;
      for (const p of peers.values()) if (p.analyser && !p.muted) max = Math.max(max, levelOf(p.analyser));
      return max;
    },

    stop() {
      for (const uid of [...peers.keys()]) closePeer(uid, !!ctx);
      if (micTrack) micTrack.stop();
      micTrack = null; micStream = null; localAnalyser = null;
      ctx = null;
      notify();
    },
  };
}
