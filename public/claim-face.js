const CF_OVERLAY_ID = 'claimFaceOverlay';
const CF_STYLE_ID = 'claimFaceStyles';
const CF_CAPTURE_TIMEOUT_MS = 45000;
const CF_DETECT_INPUT_SIZE = 160;
const CF_DETECT_SCORE_THRESHOLD = 0.2;
const CF_WORK_CANVAS_MAX = 480;
const CF_MIN_FACE_RATIO = 0.12;
const CF_CAMERA_SETTLE_MS = 420;
const CF_DESCRIPTOR_LENGTH = 128;
const CF_SLOW_FRAME_MS = 3000;
const CF_SAMPLE_TARGET = 3;
const CF_SOFT_DEADLINE_MS = 5000;
const CF_NO_FACE_TIMEOUT_MS = 22000;
const CF_MIN_NO_FACE_ATTEMPTS = 12;
const CF_WATCHDOG_GRACE_MS = 6000;
const CF_STARTUP_TIMEOUT_MS = 40000;
const CF_ERROR_BACKOFF_MS = 250;
const CF_RESULT_HOLD_MS = 420;
const CF_DETECT_FAILED = {};

let cfModelsLoaded = false;
let cfLoadingPromise = null;
let cfFaceapi = null;
let cfWarmupPromise = null;

async function cfLoadModels() {
  if (cfLoadingPromise) return cfLoadingPromise;
  cfLoadingPromise = (async () => {
    if (!cfFaceapi) cfFaceapi = await import('/vendor/face-api.esm.js');
    try {
      await cfFaceapi.tf.setBackend('webgl');
      await cfFaceapi.tf.ready();
    } catch (e) {}
    if (!cfModelsLoaded) {
      await Promise.all([
        cfFaceapi.nets.tinyFaceDetector.loadFromUri('/vendor/face-api-models'),
        cfFaceapi.nets.faceLandmark68Net.loadFromUri('/vendor/face-api-models'),
        cfFaceapi.nets.faceRecognitionNet.loadFromUri('/vendor/face-api-models'),
      ]);
      cfModelsLoaded = true;
    }
    return cfFaceapi;
  })();
  return cfLoadingPromise;
}

function cfWarmUp() {
  if (cfWarmupPromise) return cfWarmupPromise;
  cfWarmupPromise = (async () => {
    const faceapi = await cfLoadModels();
    try {
      const canvas = document.createElement('canvas');
      canvas.width = CF_WORK_CANVAS_MAX;
      canvas.height = CF_WORK_CANVAS_MAX;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: CF_DETECT_INPUT_SIZE,
        scoreThreshold: CF_DETECT_SCORE_THRESHOLD,
      });
      await faceapi.detectSingleFace(canvas, options).withFaceLandmarks().withFaceDescriptor();
    } catch (e) {}
    return faceapi;
  })();
  return cfWarmupPromise;
}

export function preloadClaimFaceModels() {
  cfWarmUp().catch(() => {});
}

let cfAudioCtx = null;
function cfAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!cfAudioCtx) cfAudioCtx = new Ctx();
  if (cfAudioCtx.state === 'suspended') cfAudioCtx.resume();
  return cfAudioCtx;
}

export function playCoinSound() {
  const ctx = cfAudio();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const notes = [
      { f: 988, at: 0, dur: 0.1 },
      { f: 1319, at: 0.075, dur: 0.34 },
    ];
    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, t + note.at);
      gain.gain.setValueAtTime(0.0001, t + note.at);
      gain.gain.exponentialRampToValueAtTime(0.14, t + note.at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.at + note.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + note.at);
      osc.stop(t + note.at + note.dur + 0.02);
    });
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(2637, t + 0.075);
    shimmerGain.gain.setValueAtTime(0.0001, t + 0.075);
    shimmerGain.gain.exponentialRampToValueAtTime(0.05, t + 0.1);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    shimmer.connect(shimmerGain).connect(ctx.destination);
    shimmer.start(t + 0.075);
    shimmer.stop(t + 0.44);
  } catch (e) {}
}

function cfPlayFailSound() {
  const ctx = cfAudio();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(150, t + 0.24);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  } catch (e) {}
}

function cfEnsureStyles() {
  if (document.getElementById(CF_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = CF_STYLE_ID;
  style.textContent = `
#${CF_OVERLAY_ID}{position:fixed;inset:0;z-index:2400;background:rgba(6,5,3,.94);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;
  font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
#${CF_OVERLAY_ID} .cf-stage{position:relative;width:min(210px,58vw);height:min(210px,58vw);flex-shrink:0;
  border-radius:26%;overflow:hidden;background:#0a0a0f;
  box-shadow:0 0 0 2px rgba(244,183,51,.45),0 18px 44px rgba(0,0,0,.55)}
#${CF_OVERLAY_ID} .cf-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
#${CF_OVERLAY_ID} .cf-veil{position:absolute;inset:0;background:rgba(8,7,4,.9);transition:opacity .25s ease}
#${CF_OVERLAY_ID}.cf-live .cf-veil{opacity:0}
#${CF_OVERLAY_ID}.cf-live.cf-done .cf-veil,#${CF_OVERLAY_ID}.cf-live.cf-failed .cf-veil{opacity:1}
#${CF_OVERLAY_ID} .cf-sweep{position:absolute;left:0;right:0;top:0;height:3px;
  background:linear-gradient(90deg,transparent,rgba(244,183,51,.95),transparent);
  box-shadow:0 0 14px 2px rgba(244,183,51,.55);will-change:transform;
  animation:cfSweep 2s ease-in-out infinite}
@keyframes cfSweep{0%{transform:translateY(6px)}50%{transform:translateY(190px)}100%{transform:translateY(6px)}}
#${CF_OVERLAY_ID}.cf-done .cf-sweep,#${CF_OVERLAY_ID}.cf-failed .cf-sweep{display:none}
#${CF_OVERLAY_ID} .cf-coin{position:absolute;inset:0;margin:auto;width:64px;height:64px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;color:rgba(120,78,4,.9);
  background:linear-gradient(150deg,#FFE9A6,#F4B733 45%,#C98A12);
  box-shadow:0 0 26px rgba(244,183,51,.5);animation:cfBob 1.8s ease-in-out infinite;
  transition:opacity .2s ease,transform .2s ease}
@keyframes cfBob{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-6px) scale(1.04)}}
#${CF_OVERLAY_ID}.cf-live .cf-coin{opacity:0;transform:scale(.7)}
#${CF_OVERLAY_ID} .cf-result{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  opacity:0;transform:scale(.6);transition:opacity .25s ease,transform .25s cubic-bezier(.34,1.56,.64,1)}
#${CF_OVERLAY_ID} .cf-result svg{width:64px;height:64px}
#${CF_OVERLAY_ID} .cf-result path{stroke-dasharray:40;stroke-dashoffset:40;transition:stroke-dashoffset .34s ease .1s}
#${CF_OVERLAY_ID}.cf-done .cf-check,#${CF_OVERLAY_ID}.cf-failed .cf-cross{opacity:1;transform:scale(1)}
#${CF_OVERLAY_ID}.cf-done .cf-check path,#${CF_OVERLAY_ID}.cf-failed .cf-cross path{stroke-dashoffset:0}
#${CF_OVERLAY_ID} .cf-heading{color:#FFF6E2;font-size:.95rem;font-weight:700;text-align:center;letter-spacing:.01em}
#${CF_OVERLAY_ID} .cf-status{color:rgba(255,246,226,.72);font-size:.8rem;font-weight:500;text-align:center;
  max-width:270px;min-height:1.2em;line-height:1.5}
#${CF_OVERLAY_ID} .cf-cancel{background:transparent;border:1px solid rgba(255,255,255,.2);
  color:rgba(255,255,255,.7);padding:8px 22px;border-radius:20px;font-size:.78rem;font-weight:600;
  cursor:pointer;font-family:inherit;margin-top:4px}
`;
  document.head.appendChild(style);
}

function cfAverage(list) {
  const out = new Array(CF_DESCRIPTOR_LENGTH).fill(0);
  list.forEach((d) => {
    for (let i = 0; i < CF_DESCRIPTOR_LENGTH; i++) out[i] += d[i];
  });
  for (let i = 0; i < CF_DESCRIPTOR_LENGTH; i++) out[i] /= list.length;
  return out;
}

export function captureClaimFace() {
  cfEnsureStyles();
  const overlay = document.createElement('div');
  overlay.id = CF_OVERLAY_ID;
  overlay.innerHTML =
    '<div class="cf-stage">' +
      '<video class="cf-video" autoplay playsinline muted></video>' +
      '<div class="cf-veil"></div>' +
      '<div class="cf-sweep"></div>' +
      '<div class="cf-coin">&#8358;</div>' +
      '<div class="cf-result cf-check"><svg viewBox="0 0 24 24" fill="none" stroke="#F4B733" stroke-width="2.6"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg></div>' +
      '<div class="cf-result cf-cross"><svg viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" stroke-width="2.6"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg></div>' +
    '</div>' +
    '<div class="cf-heading">Claim Face Check</div>' +
    '<div class="cf-status">Starting camera…</div>' +
    '<button type="button" class="cf-cancel">Cancel</button>';

  document.body.appendChild(overlay);

  const video = overlay.querySelector('video');
  const statusEl = overlay.querySelector('.cf-status');
  const cancelBtn = overlay.querySelector('.cf-cancel');

  function setStatus(text) {
    statusEl.textContent = text;
  }

  let stream = null;
  let cancelled = false;
  let loopTimer = null;
  let watchdogTimer = null;

  function cleanup() {
    if (loopTimer) clearTimeout(loopTimer);
    if (watchdogTimer) clearTimeout(watchdogTimer);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    overlay.remove();
  }

  return new Promise((resolve, reject) => {
    watchdogTimer = setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      console.log('[claim-face] startup watchdog fired before scanning began');
      cleanup();
      reject(new Error('Face check could not start. Check your connection and try again.'));
    }, CF_STARTUP_TIMEOUT_MS);

    cancelBtn.addEventListener('click', () => {
      cancelled = true;
      cleanup();
      reject(new Error('Face check cancelled.'));
    });

    (async () => {
      try {
        const modelsPromise = cfWarmUp();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        video.srcObject = stream;
        if (video.readyState < 2) {
          await new Promise((r) => {
            video.onloadeddata = r;
            video.onloadedmetadata = r;
          });
        }
        if (cancelled) return;
        video.play().catch(() => {});
        const videoReadyAt = Date.now();

        const faceapi = await modelsPromise;
        if (cancelled) return;

        overlay.classList.add('cf-live');
        setStatus('Center your face and hold still');

        const srcW = video.videoWidth || 480;
        const srcH = video.videoHeight || 480;
        const scale = Math.min(1, CF_WORK_CANVAS_MAX / Math.max(srcW, srcH));
        const work = document.createElement('canvas');
        work.width = Math.round(srcW * scale);
        work.height = Math.round(srcH * scale);
        const workCtx = work.getContext('2d', { willReadFrequently: true });

        const detectOptions = new faceapi.TinyFaceDetectorOptions({
          inputSize: CF_DETECT_INPUT_SIZE,
          scoreThreshold: CF_DETECT_SCORE_THRESHOLD,
        });

        const collected = [];
        const startTime = Date.now();
        let noFaceCount = 0;
        let tooSmallCount = 0;
        let slowFrames = 0;
        let detectErrors = 0;
        let lastError = '';
        let backend = '';
        try { backend = faceapi.tf.getBackend() || '?'; } catch (e) { backend = '?'; }

        const attemptCount = () => noFaceCount + tooSmallCount + detectErrors;

        function report() {
          return 'no-face=' + noFaceCount + ' too-small=' + tooSmallCount +
            ' slow=' + slowFrames + ' errors=' + detectErrors +
            ' samples=' + collected.length + ' backend=' + backend +
            ' src=' + srcW + 'x' + srcH +
            ' elapsed=' + Math.round((Date.now() - startTime) / 1000) + 's' +
            (lastError ? ' last-error=' + lastError : '');
        }

        if (watchdogTimer) clearTimeout(watchdogTimer);
        watchdogTimer = setTimeout(() => {
          if (cancelled) return;
          console.log('[claim-face] watchdog fired: ' + report());
          cleanup();
          reject(new Error('Face check stalled, please try again.'));
        }, CF_CAPTURE_TIMEOUT_MS + CF_WATCHDOG_GRACE_MS);

        const finish = () => {
          console.log('[claim-face] captured: ' + report());
          overlay.classList.add('cf-done');
          setStatus('Face captured');
          setTimeout(() => {
            cleanup();
            resolve({ descriptor: cfAverage(collected), samples: collected });
          }, CF_RESULT_HOLD_MS);
        };

        const again = (fn, delay) => { loopTimer = setTimeout(fn, delay || 0); };

        const runDetect = async (withLandmarks, withDescriptor) => {
          const started = Date.now();
          try {
            let task = faceapi.detectSingleFace(work, detectOptions);
            if (withLandmarks) {
              task = task.withFaceLandmarks();
              if (withDescriptor) task = task.withFaceDescriptor();
            }
            const out = await task;
            if (Date.now() - started > CF_SLOW_FRAME_MS) slowFrames++;
            return out;
          } catch (err) {
            detectErrors++;
            lastError = String((err && err.message) || err).slice(0, 70);
            return CF_DETECT_FAILED;
          }
        };

        const giveUp = (label) => {
          console.log('[claim-face] ' + label + ': ' + report());
          overlay.classList.add('cf-failed');
          cfPlayFailSound();
          let message;
          if (detectErrors > noFaceCount) {
            message = 'The face engine failed on this device. Try again later.';
          } else if (slowFrames > 0 && attemptCount() < CF_MIN_NO_FACE_ATTEMPTS) {
            message = 'This device is too slow to run the face check right now. Please try again.';
          } else if (tooSmallCount > noFaceCount) {
            message = 'Hold the phone a bit closer to your face and try again.';
          } else {
            message = "Couldn't see your face. Move somewhere brighter and try again.";
          }
          setStatus(message);
          setTimeout(() => {
            cleanup();
            reject(new Error(message));
          }, CF_RESULT_HOLD_MS);
        };

        const tick = async () => {
          if (cancelled) return;
          const elapsed = Date.now() - startTime;
          if (collected.length > 0 && elapsed > CF_SOFT_DEADLINE_MS) {
            finish();
            return;
          }
          if (collected.length === 0 && elapsed > CF_NO_FACE_TIMEOUT_MS &&
              attemptCount() >= CF_MIN_NO_FACE_ATTEMPTS) {
            giveUp('giving up early');
            return;
          }
          if (elapsed > CF_CAPTURE_TIMEOUT_MS) {
            giveUp('timed out');
            return;
          }

          if (video.readyState < 2 || Date.now() - videoReadyAt < CF_CAMERA_SETTLE_MS) {
            again(safeTick);
            return;
          }

          workCtx.drawImage(video, 0, 0, work.width, work.height);

          const probe = await runDetect(false, false);
          if (cancelled) return;
          if (probe === CF_DETECT_FAILED) {
            again(safeTick, CF_ERROR_BACKOFF_MS);
            return;
          }
          if (!probe) {
            noFaceCount++;
            setStatus('Center your face and hold still');
            again(safeTick);
            return;
          }
          if (probe.box.width < work.width * CF_MIN_FACE_RATIO) {
            tooSmallCount++;
            setStatus('Move a little closer');
            again(safeTick);
            return;
          }
          setStatus('Hold still');

          const result = await runDetect(true, true);
          if (cancelled) return;
          if (result === CF_DETECT_FAILED) {
            again(safeTick, CF_ERROR_BACKOFF_MS);
            return;
          }
          if (!result || !result.descriptor) {
            noFaceCount++;
            again(safeTick);
            return;
          }

          const descriptor = Array.from(result.descriptor);
          if (descriptor.length !== CF_DESCRIPTOR_LENGTH) {
            again(safeTick);
            return;
          }

          collected.push(descriptor);
          if (collected.length >= CF_SAMPLE_TARGET) {
            finish();
            return;
          }
          again(safeTick);
        };

        const safeTick = () => {
          tick().catch((err) => {
            if (cancelled) return;
            detectErrors++;
            lastError = String((err && err.message) || err).slice(0, 70);
            again(safeTick);
          });
        };

        again(safeTick);
      } catch (err) {
        cleanup();
        reject(err);
      }
    })();
  });
}
