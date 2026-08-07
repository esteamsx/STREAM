const OVERLAY_ID = 'faceScanOverlay';
const CLIP_ID = 'faceScanClipPath';
const CAPTURE_TIMEOUT_MS = 60000;
const TURN_THRESHOLD = 0.16;
const CENTER_THRESHOLD = 0.09;
const NOD_THRESHOLD = 0.12;
const RESULT_HOLD_MS = 400;
const DETECT_INPUT_SIZE = 160;
const DETECT_SCORE_THRESHOLD = 0.2;
const WORK_CANVAS_MAX = 480;
const MIN_FACE_RATIO = 0.12;
const CAMERA_SETTLE_MS = 420;
const DESCRIPTOR_LENGTH = 128;
const DETECT_TIMEOUT_MS = 3000;
const DEFAULT_SAMPLES = 3;
const SOFT_DEADLINE_MS = 5000;
const NO_FACE_TIMEOUT_MS = 25000;
const MIN_NO_FACE_ATTEMPTS = 18;
const DETECT_TIMEOUT_SENTINEL = {};

const FACE_CLIP_PATH_D =
  'M 0.5 0.03 C 0.75 0.03 0.95 0.22 0.95 0.42 C 0.95 0.60 0.85 0.72 0.80 0.80 ' +
  'C 0.72 0.92 0.62 0.98 0.5 0.98 C 0.38 0.98 0.28 0.92 0.20 0.80 ' +
  'C 0.15 0.72 0.05 0.60 0.05 0.42 C 0.05 0.22 0.25 0.03 0.5 0.03 Z';

const FACE_GLYPH_PATHS =
  '<path d="M4 8V6a2 2 0 012-2h2"/><path d="M16 4h2a2 2 0 012 2v2"/><path d="M20 16v2a2 2 0 01-2 2h-2"/><path d="M8 20H6a2 2 0 01-2-2v-2"/>' +
  '<circle class="fs-eye" cx="9" cy="10" r=".8" fill="currentColor" stroke="none"/><circle class="fs-eye" cx="15" cy="10" r=".8" fill="currentColor" stroke="none"/>' +
  '<path d="M9 15c1 1 5 1 6 0"/>';

let modelsLoaded = false;
let modelsLoadingPromise = null;
let faceapiModule = null;
let warmupPromise = null;

async function loadModels() {
  if (modelsLoadingPromise) return modelsLoadingPromise;
  modelsLoadingPromise = (async () => {
    if (!faceapiModule) faceapiModule = await import('/vendor/face-api.esm.js');
    try {
      await faceapiModule.tf.setBackend('webgl');
      await faceapiModule.tf.ready();
    } catch (e) {}
    if (!modelsLoaded) {
      await Promise.all([
        faceapiModule.nets.tinyFaceDetector.loadFromUri('/vendor/face-api-models'),
        faceapiModule.nets.faceLandmark68Net.loadFromUri('/vendor/face-api-models'),
        faceapiModule.nets.faceRecognitionNet.loadFromUri('/vendor/face-api-models'),
      ]);
      modelsLoaded = true;
    }
    return faceapiModule;
  })();
  return modelsLoadingPromise;
}

function warmUpModels() {
  if (warmupPromise) return warmupPromise;
  warmupPromise = (async () => {
    const faceapi = await loadModels();
    try {
      const canvas = document.createElement('canvas');
      canvas.width = WORK_CANVAS_MAX;
      canvas.height = WORK_CANVAS_MAX;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: DETECT_INPUT_SIZE,
        scoreThreshold: DETECT_SCORE_THRESHOLD,
      });
      await faceapi.detectSingleFace(canvas, options).withFaceLandmarks().withFaceDescriptor();
    } catch (e) {}
    return faceapi;
  })();
  return warmupPromise;
}

export function preloadFaceModels() {
  warmUpModels().catch(() => {});
}

let lastSpoken = '';
function speak(text) {
  if (!window.speechSynthesis || !text || text === lastSpoken) return;
  lastSpoken = text;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.02;
    utter.volume = 0.9;
    window.speechSynthesis.speak(utter);
  } catch (e) {}
}

let audioCtx = null;
function getAudioCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playSuccessSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    [0, 0.09].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 740 : 990, t + offset);
      gain.gain.setValueAtTime(0.0001, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.18, t + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + 0.18);
    });
  } catch (e) {}
}

function playErrorSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(170, t + 0.22);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.28);
  } catch (e) {}
}

function ensureOverlayStyles() {
  if (document.getElementById('faceScanStyles')) return;
  const style = document.createElement('style');
  style.id = 'faceScanStyles';
  style.textContent = `
#${OVERLAY_ID}{position:fixed;inset:0;z-index:2000;background:rgba(5,5,8,.92);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px}
#${OVERLAY_ID}.fs-top-mode{background:transparent;justify-content:flex-start;pointer-events:none;
  padding-top:max(28px,env(safe-area-inset-top));gap:10px}
#${OVERLAY_ID}.fs-top-mode .fs-abstract,#${OVERLAY_ID}.fs-top-mode .fs-status,#${OVERLAY_ID}.fs-top-mode .fs-cancel{
  pointer-events:auto}
#${OVERLAY_ID}.fs-top-mode .fs-abstract{width:158px;height:158px}
#${OVERLAY_ID}.fs-top-mode .fs-abstract-face{width:60px;height:60px}
#${OVERLAY_ID}.fs-top-mode .fs-abstract-check,#${OVERLAY_ID}.fs-top-mode .fs-abstract-cross{width:52px;height:52px}
#${OVERLAY_ID}.fs-top-mode .fs-status{background:rgba(20,20,28,.75);backdrop-filter:blur(12px);
  padding:6px 14px;border-radius:14px;font-size:.76rem}
#${OVERLAY_ID}.fs-top-mode .fs-cancel{padding:5px 16px;font-size:.72rem}
#${OVERLAY_ID} .fs-frame{position:relative;width:min(260px,72vw);height:min(340px,94vw);flex-shrink:0}
#${OVERLAY_ID} .fs-clip{position:absolute;inset:0;clip-path:url(#${CLIP_ID});overflow:hidden;background:#000}
#${OVERLAY_ID} .fs-clip video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
#${OVERLAY_ID} .fs-scanline{position:absolute;left:0;right:0;top:0;height:3px;
  background:linear-gradient(90deg,transparent,rgba(0,224,255,.9),transparent);
  box-shadow:0 0 12px 2px rgba(0,224,255,.6);will-change:transform;
  animation:fsScan 2.1s ease-in-out infinite}
@keyframes fsScan{
  0%{transform:translateY(10px)}
  50%{transform:translateY(310px)}
  100%{transform:translateY(10px)}
}
#${OVERLAY_ID} .fs-check{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  opacity:0;transform:scale(.5);transition:opacity .25s ease,transform .25s cubic-bezier(.34,1.56,.64,1);
  background:rgba(0,20,26,.55)}
#${OVERLAY_ID}.fs-success .fs-check{opacity:1;transform:scale(1)}
#${OVERLAY_ID}.fs-success .fs-scanline{display:none}
#${OVERLAY_ID} .fs-check svg{width:64px;height:64px}
#${OVERLAY_ID} .fs-check-path{stroke-dasharray:36;stroke-dashoffset:36;transition:stroke-dashoffset .35s ease .1s}
#${OVERLAY_ID}.fs-success .fs-check-path{stroke-dashoffset:0}
#${OVERLAY_ID} .fs-frame-outline{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;
  filter:drop-shadow(0 0 18px rgba(0,224,255,.45))}
#${OVERLAY_ID} .fs-frame-outline path{fill:none;stroke-width:.008}
#${OVERLAY_ID} .fs-frame-outline-bg{stroke:rgba(0,224,255,.25)}
#${OVERLAY_ID} .fs-frame-outline-progress{stroke:#00E0FF;transition:stroke-dashoffset .4s ease}
#${OVERLAY_ID}.fs-success .fs-frame-outline-bg{stroke:rgba(0,224,255,.25)}
#${OVERLAY_ID}.fs-success .fs-frame-outline-progress{stroke:#00E0FF}

#${OVERLAY_ID} .fs-abstract{position:relative;width:120px;height:120px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;color:#00E0FF;border-radius:32%;overflow:hidden}
#${OVERLAY_ID} .fs-scan-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:1;
  transform:scaleX(-1)}
#${OVERLAY_ID} .fs-abstract-backdrop{position:absolute;inset:0;background:rgba(10,10,16,.94);
  transition:opacity .25s ease}
#${OVERLAY_ID} .fs-abstract.fs-live .fs-abstract-backdrop{opacity:0}
#${OVERLAY_ID} .fs-abstract.fs-live .fs-abstract-ring{border-width:3px;border-color:rgba(0,224,255,.8);
  box-shadow:0 0 0 1px rgba(0,0,0,.35),0 10px 30px rgba(0,0,0,.45)}
#${OVERLAY_ID} .fs-abstract.fs-live .fs-abstract-face{opacity:0;transform:scale(.7)}
#${OVERLAY_ID} .fs-abstract.fs-live.success .fs-abstract-backdrop,
#${OVERLAY_ID} .fs-abstract.fs-live.failed .fs-abstract-backdrop{opacity:1}
#${OVERLAY_ID} .fs-abstract-ring{position:absolute;inset:0;border-radius:32%;border:2px solid rgba(0,224,255,.35);
  animation:fsPulse 1.6s ease-in-out infinite}
@keyframes fsPulse{
  0%,100%{transform:scale(1);opacity:.6}
  50%{transform:scale(1.08);opacity:1}
}
#${OVERLAY_ID} .fs-abstract-face{position:relative;width:64px;height:64px;transition:opacity .2s ease,transform .2s ease}
#${OVERLAY_ID} .fs-abstract-face .fs-eye{transform-box:fill-box;transform-origin:center;animation:fsBlink 2.4s ease-in-out infinite}
@keyframes fsBlink{
  0%,88%,100%{transform:scaleY(1)}
  92%{transform:scaleY(.1)}
}
#${OVERLAY_ID} .fs-abstract-check,#${OVERLAY_ID} .fs-abstract-cross{position:absolute;width:56px;height:56px;
  opacity:0;transform:scale(.5);transition:opacity .25s ease,transform .25s cubic-bezier(.34,1.56,.64,1)}
#${OVERLAY_ID} .fs-abstract-check-path,#${OVERLAY_ID} .fs-abstract-cross-path{
  stroke-dasharray:36;stroke-dashoffset:36;transition:stroke-dashoffset .3s ease .1s}
#${OVERLAY_ID} .fs-abstract.success .fs-abstract-face{opacity:0;transform:scale(.6)}
#${OVERLAY_ID} .fs-abstract.success .fs-abstract-check{opacity:1;transform:scale(1)}
#${OVERLAY_ID} .fs-abstract.success .fs-abstract-check-path{stroke-dashoffset:0}
#${OVERLAY_ID} .fs-abstract.success .fs-abstract-ring{animation:none;border-color:#00E0FF}
#${OVERLAY_ID} .fs-abstract.failed .fs-abstract-face{opacity:0;transform:scale(.6)}
#${OVERLAY_ID} .fs-abstract.failed .fs-abstract-cross{opacity:1;transform:scale(1)}
#${OVERLAY_ID} .fs-abstract.failed .fs-abstract-cross-path{stroke-dashoffset:0}
#${OVERLAY_ID} .fs-abstract.failed .fs-abstract-ring{animation:none;border-color:#FF3B5C}

#${OVERLAY_ID} .fs-status{color:#F3F3FA;font-family:system-ui,-apple-system,sans-serif;font-size:.85rem;
  font-weight:600;text-align:center;max-width:280px;min-height:1.2em}
#${OVERLAY_ID} .fs-cancel{background:transparent;border:1px solid rgba(255,255,255,.2);
  color:rgba(255,255,255,.7);padding:8px 20px;border-radius:20px;font-size:.78rem;
  font-weight:600;cursor:pointer;font-family:inherit}
`;
  document.head.appendChild(style);
}

function avgPoint(points) {
  const sum = points.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function headTurnRatio(landmarks) {
  const leftEye = avgPoint(landmarks.getLeftEye());
  const rightEye = avgPoint(landmarks.getRightEye());
  const nose = avgPoint(landmarks.getNose());
  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) || 1;
  return -((nose.x - eyeMidX) / eyeDist);
}

function averageDescriptors(list) {
  const out = new Array(DESCRIPTOR_LENGTH).fill(0);
  list.forEach((d) => {
    for (let i = 0; i < DESCRIPTOR_LENGTH; i++) out[i] += d[i];
  });
  for (let i = 0; i < DESCRIPTOR_LENGTH; i++) out[i] /= list.length;
  return out;
}

function headPitchRatio(landmarks) {
  const leftEye = avgPoint(landmarks.getLeftEye());
  const rightEye = avgPoint(landmarks.getRightEye());
  const jaw = landmarks.getJawOutline();
  const chin = jaw[8] || jaw[Math.floor(jaw.length / 2)];
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) || 1;
  return (chin.y - eyeMidY) / eyeDist;
}

export function captureFaceDescriptor({ requireLiveness = true, showCamera = true, verify = null, voice = true, samples = DEFAULT_SAMPLES, returnSamples = false } = {}) {
  const sampleTarget = Math.max(1, samples);
  ensureOverlayStyles();
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  if (!showCamera) overlay.classList.add('fs-top-mode');

  if (showCamera) {
    overlay.innerHTML =
      '<svg width="0" height="0" style="position:absolute">' +
        '<clipPath id="' + CLIP_ID + '" clipPathUnits="objectBoundingBox"><path d="' + FACE_CLIP_PATH_D + '"/></clipPath>' +
      '</svg>' +
      '<div class="fs-frame">' +
        '<div class="fs-clip">' +
          '<video autoplay playsinline muted></video>' +
          '<div class="fs-scanline"></div>' +
          '<div class="fs-check"><svg viewBox="0 0 24 24" fill="none" stroke="#00E0FF" stroke-width="2.6"><path class="fs-check-path" stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg></div>' +
        '</div>' +
        '<svg class="fs-frame-outline" viewBox="0 0 1 1" preserveAspectRatio="none">' +
          '<path class="fs-frame-outline-bg" d="' + FACE_CLIP_PATH_D + '"/>' +
          '<path class="fs-frame-outline-progress" d="' + FACE_CLIP_PATH_D + '"/>' +
        '</svg>' +
      '</div>' +
      '<div class="fs-status">Starting camera…</div>' +
      '<button type="button" class="fs-cancel">Cancel</button>';
  } else {
    overlay.innerHTML =
      '<div class="fs-abstract" id="fsAbstract">' +
        '<video class="fs-scan-video" autoplay playsinline muted></video>' +
        '<div class="fs-abstract-backdrop"></div>' +
        '<div class="fs-abstract-ring"></div>' +
        '<svg class="fs-abstract-face" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' + FACE_GLYPH_PATHS + '</svg>' +
        '<svg class="fs-abstract-check" viewBox="0 0 24 24" fill="none" stroke="#00E0FF" stroke-width="2.6"><path class="fs-abstract-check-path" stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>' +
        '<svg class="fs-abstract-cross" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" stroke-width="2.6"><path class="fs-abstract-cross-path" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>' +
      '</div>' +
      '<div class="fs-status">Starting camera…</div>' +
      '<button type="button" class="fs-cancel">Cancel</button>';
  }

  document.body.appendChild(overlay);

  const video = overlay.querySelector('video');
  const statusEl = overlay.querySelector('.fs-status');
  const cancelBtn = overlay.querySelector('.fs-cancel');
  const abstractEl = overlay.querySelector('.fs-abstract');
  const outlineProgressPath = overlay.querySelector('.fs-frame-outline-progress');
  let outlineLen = 0;
  if (outlineProgressPath) {
    outlineLen = outlineProgressPath.getTotalLength();
    outlineProgressPath.style.strokeDasharray = String(outlineLen);
    outlineProgressPath.style.strokeDashoffset = requireLiveness ? String(outlineLen) : '0';
  }

  function setStatus(text) {
    statusEl.textContent = text;
    if (voice) speak(text);
  }

  function setStep(index) {
    if (!outlineProgressPath) return;
    outlineProgressPath.style.strokeDashoffset = String(outlineLen * (1 - index / 3));
  }

  let stream = null;
  let cancelled = false;
  let loopTimer = null;

  function cleanup() {
    if (loopTimer) clearTimeout(loopTimer);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    lastSpoken = '';
    overlay.remove();
  }

  return new Promise((resolve, reject) => {
    cancelBtn.addEventListener('click', () => {
      cancelled = true;
      cleanup();
      reject(new Error('Face scan cancelled.'));
    });

    (async () => {
      try {
        const modelsPromise = warmUpModels();
        const cameraPromise = navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
        });

        stream = await cameraPromise;
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

        if (abstractEl) abstractEl.classList.add('fs-live');
        setStatus(showCamera ? 'Position your face in the frame' : 'Center your face in the circle');

        const srcW = video.videoWidth || 480;
        const srcH = video.videoHeight || 480;
        const scale = Math.min(1, WORK_CANVAS_MAX / Math.max(srcW, srcH));
        const work = document.createElement('canvas');
        work.width = Math.round(srcW * scale);
        work.height = Math.round(srcH * scale);
        const workCtx = work.getContext('2d', { willReadFrequently: true });

        const detectOptions = new faceapi.TinyFaceDetectorOptions({
          inputSize: DETECT_INPUT_SIZE,
          scoreThreshold: DETECT_SCORE_THRESHOLD,
        });

        let turnStage = 0;
        let nodBaseline = null;
        let neutralPitch = null;
        const collected = [];
        const startTime = Date.now();
        let noFaceCount = 0;
        let tooSmallCount = 0;
        let detectTimeouts = 0;

        function scanReport(){
          return 'attempts(no-face)=' + noFaceCount + ' too-small=' + tooSmallCount +
            ' detector-timeouts=' + detectTimeouts + ' samples=' + collected.length +
            ' elapsed=' + Math.round((Date.now() - startTime) / 1000) + 's';
        }

        const finishCapture = async (collected) => {
          console.log('[face-scan] captured: ' + scanReport());
          const descriptor = averageDescriptors(collected);
          const payload = returnSamples ? { descriptor, samples: collected } : descriptor;

          if (!verify) {
            overlay.classList.add('fs-success');
            if (abstractEl) abstractEl.classList.add('success');
            playSuccessSound();
            setStatus('Face recognized');
            setTimeout(() => {
              cleanup();
              resolve(payload);
            }, RESULT_HOLD_MS);
            return;
          }

          setStatus('Verifying…');
          try {
            const outcome = await verify(descriptor, collected);
            overlay.classList.add('fs-success');
            if (abstractEl) abstractEl.classList.add('success');
            playSuccessSound();
            setStatus('Verified');
            setTimeout(() => {
              cleanup();
              resolve(outcome);
            }, RESULT_HOLD_MS);
          } catch (err) {
            overlay.classList.add('fs-failed');
            if (abstractEl) abstractEl.classList.add('failed');
            playErrorSound();
            setStatus(err.message || 'Not recognized');
            setTimeout(() => {
              cleanup();
              reject(err);
            }, RESULT_HOLD_MS);
          }
        };

        const again = (fn) => { loopTimer = setTimeout(fn, 0); };

        const runDetect = (withLandmarks, withDescriptor) => {
          let task = faceapi.detectSingleFace(work, detectOptions);
          if (withLandmarks) {
            task = task.withFaceLandmarks();
            if (withDescriptor) task = task.withFaceDescriptor();
          }
          return Promise.race([
            task,
            new Promise((r) => setTimeout(() => r(DETECT_TIMEOUT_SENTINEL), DETECT_TIMEOUT_MS)),
          ]);
        };

        const tick = async () => {
          if (cancelled) return;
          const elapsed = Date.now() - startTime;
          if (!requireLiveness && collected.length > 0 && elapsed > SOFT_DEADLINE_MS) {
            finishCapture(collected);
            return;
          }
          if (!requireLiveness && collected.length === 0 && elapsed > NO_FACE_TIMEOUT_MS &&
              (noFaceCount + tooSmallCount) >= MIN_NO_FACE_ATTEMPTS) {
            console.log('[face-scan] giving up early: ' + scanReport());
            cleanup();
            reject(new Error(tooSmallCount > noFaceCount
              ? 'Hold the phone a bit closer to your face and try again.'
              : "Couldn't see your face. Make sure the camera isn't blocked, move somewhere brighter, and try again."));
            return;
          }
          if (elapsed > CAPTURE_TIMEOUT_MS) {
            console.log('[face-scan] timed out: ' + scanReport());
            cleanup();
            reject(new Error(tooSmallCount > 0
              ? 'Hold the phone a bit closer to your face and try again.'
              : 'Timed out waiting for a face. Try again.'));
            return;
          }

          if (video.readyState < 2 || Date.now() - videoReadyAt < CAMERA_SETTLE_MS) {
            again(tick);
            return;
          }

          workCtx.drawImage(video, 0, 0, work.width, work.height);

          const probe = await runDetect(false, false);
          if (cancelled) return;
          if (probe === DETECT_TIMEOUT_SENTINEL) {
            detectTimeouts++;
            again(tick);
            return;
          }
          if (!probe) {
            noFaceCount++;
            setStatus(showCamera ? 'Position your face in the frame' : 'Center your face in the circle');
            again(tick);
            return;
          }
          if (probe.box.width < work.width * MIN_FACE_RATIO) {
            tooSmallCount++;
            setStatus('Move a little closer');
            again(tick);
            return;
          }
          if (!requireLiveness) setStatus('Hold still');

          const wantDescriptor = !requireLiveness || turnStage === 3;
          const result = await runDetect(true, wantDescriptor);
          if (cancelled) return;
          if (result === DETECT_TIMEOUT_SENTINEL) {
            detectTimeouts++;
            again(tick);
            return;
          }
          if (!result) {
            noFaceCount++;
            again(tick);
            return;
          }

          const descriptor = wantDescriptor && result.descriptor ? Array.from(result.descriptor) : null;
          if (wantDescriptor && (!descriptor || descriptor.length !== DESCRIPTOR_LENGTH)) {
            again(tick);
            return;
          }

          if (!requireLiveness) {
            collected.push(descriptor);
            if (collected.length >= sampleTarget) {
              finishCapture(collected);
              return;
            }
            again(tick);
            return;
          }

          const turnRatio = headTurnRatio(result.landmarks);

          if (turnStage === 0) {
            if (neutralPitch === null && Math.abs(turnRatio) < CENTER_THRESHOLD) {
              neutralPitch = headPitchRatio(result.landmarks);
            }
            setStatus('Turn your head to the left');
            if (turnRatio < -TURN_THRESHOLD) {
              turnStage = 1;
              setStep(1);
              setStatus('Now turn to the right');
            }
          } else if (turnStage === 1) {
            if (turnRatio > TURN_THRESHOLD) {
              turnStage = 2;
              nodBaseline = null;
              setStep(2);
              setStatus('Now nod your head');
            }
          } else if (turnStage === 2) {
            const pitchRatio = headPitchRatio(result.landmarks);
            if (nodBaseline === null) nodBaseline = pitchRatio;
            if (Math.abs(pitchRatio - nodBaseline) > NOD_THRESHOLD) {
              turnStage = 3;
              setStep(3);
              setStatus('Hold still');
            }
          } else if (turnStage === 3) {
            const levelEnough =
              neutralPitch === null ||
              Math.abs(headPitchRatio(result.landmarks) - neutralPitch) < NOD_THRESHOLD;
            if (Math.abs(turnRatio) < CENTER_THRESHOLD && levelEnough) {
              collected.push(descriptor);
              if (collected.length >= sampleTarget) {
                finishCapture(collected);
                return;
              }
            } else {
              setStatus('Look straight at the camera and hold still');
            }
          }

          again(tick);
        };

        again(tick);
      } catch (err) {
        cleanup();
        reject(err);
      }
    })();
  });
}
