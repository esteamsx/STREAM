const OVERLAY_ID = 'faceScanOverlay';
const CLIP_ID = 'faceScanClipPath';
const CAPTURE_TIMEOUT_MS = 20000;
const EAR_BLINK_THRESHOLD = 0.21;
const EAR_OPEN_THRESHOLD = 0.28;
const STABLE_FRAMES_NEEDED = 4;
const SUCCESS_HOLD_MS = 700;

const FACE_CLIP_PATH_D =
  'M 0.5 0.03 C 0.75 0.03 0.95 0.22 0.95 0.42 C 0.95 0.60 0.85 0.72 0.80 0.80 ' +
  'C 0.72 0.92 0.62 0.98 0.5 0.98 C 0.38 0.98 0.28 0.92 0.20 0.80 ' +
  'C 0.15 0.72 0.05 0.60 0.05 0.42 C 0.05 0.22 0.25 0.03 0.5 0.03 Z';

let modelsLoaded = false;
let faceapiModule = null;

async function loadModels() {
  if (!faceapiModule) faceapiModule = await import('/vendor/face-api.esm.js');
  if (!modelsLoaded) {
    await Promise.all([
      faceapiModule.nets.tinyFaceDetector.loadFromUri('/vendor/face-api-models'),
      faceapiModule.nets.faceLandmark68Net.loadFromUri('/vendor/face-api-models'),
      faceapiModule.nets.faceRecognitionNet.loadFromUri('/vendor/face-api-models'),
    ]);
    modelsLoaded = true;
  }
  return faceapiModule;
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

function ensureOverlayStyles() {
  if (document.getElementById('faceScanStyles')) return;
  const style = document.createElement('style');
  style.id = 'faceScanStyles';
  style.textContent = `
#${OVERLAY_ID}{position:fixed;inset:0;z-index:2000;background:rgba(5,5,8,.92);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px}
#${OVERLAY_ID} .fs-frame{position:relative;width:min(260px,72vw);height:min(340px,94vw);flex-shrink:0}
#${OVERLAY_ID} .fs-frame-outline{position:absolute;inset:-4px;pointer-events:none;
  filter:drop-shadow(0 0 18px rgba(0,224,255,.45))}
#${OVERLAY_ID} .fs-frame-outline path{fill:none;stroke:rgba(0,224,255,.7);stroke-width:2.5}
#${OVERLAY_ID} .fs-frame-outline.success path{stroke:var(--accent,#00E0FF)}
#${OVERLAY_ID} video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
  transform:scaleX(-1);background:#000;clip-path:url(#${CLIP_ID})}
#${OVERLAY_ID} .fs-scanline{position:absolute;left:6%;right:6%;height:3px;top:8%;
  background:linear-gradient(90deg,transparent,rgba(0,224,255,.9),transparent);
  box-shadow:0 0 12px 2px rgba(0,224,255,.6);clip-path:url(#${CLIP_ID});
  animation:fsScan 2.1s ease-in-out infinite}
@keyframes fsScan{
  0%{top:6%}
  50%{top:88%}
  100%{top:6%}
}
#${OVERLAY_ID} .fs-check{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  opacity:0;transform:scale(.5);transition:opacity .25s ease,transform .25s cubic-bezier(.34,1.56,.64,1)}
#${OVERLAY_ID}.fs-success .fs-check{opacity:1;transform:scale(1)}
#${OVERLAY_ID}.fs-success .fs-scanline{display:none}
#${OVERLAY_ID} .fs-check svg{width:64px;height:64px}
#${OVERLAY_ID} .fs-check-path{stroke-dasharray:36;stroke-dashoffset:36;transition:stroke-dashoffset .35s ease .1s}
#${OVERLAY_ID}.fs-success .fs-check-path{stroke-dashoffset:0}
#${OVERLAY_ID} .fs-status{color:#F3F3FA;font-family:system-ui,-apple-system,sans-serif;font-size:.85rem;
  font-weight:600;text-align:center;max-width:280px;min-height:1.2em}
#${OVERLAY_ID} .fs-cancel{background:transparent;border:1px solid rgba(255,255,255,.2);
  color:rgba(255,255,255,.7);padding:8px 20px;border-radius:20px;font-size:.78rem;
  font-weight:600;cursor:pointer;font-family:inherit}
`;
  document.head.appendChild(style);
}

function eyeAspectRatio(eye) {
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const vertical = (dist(eye[1], eye[5]) + dist(eye[2], eye[4])) / 2;
  const horizontal = dist(eye[0], eye[3]);
  return vertical / horizontal;
}

export function captureFaceDescriptor({ requireLiveness = true } = {}) {
  ensureOverlayStyles();
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.innerHTML =
    '<svg width="0" height="0" style="position:absolute">' +
      '<clipPath id="' + CLIP_ID + '" clipPathUnits="objectBoundingBox"><path d="' + FACE_CLIP_PATH_D + '"/></clipPath>' +
    '</svg>' +
    '<div class="fs-frame">' +
      '<video autoplay playsinline muted></video>' +
      '<div class="fs-scanline"></div>' +
      '<div class="fs-check"><svg viewBox="0 0 24 24" fill="none" stroke="#00E0FF" stroke-width="2.6"><path class="fs-check-path" stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg></div>' +
      '<svg class="fs-frame-outline" viewBox="0 0 1 1" preserveAspectRatio="none"><path d="' + FACE_CLIP_PATH_D + '" vector-effect="non-scaling-stroke"/></svg>' +
    '</div>' +
    '<div class="fs-status">Starting camera…</div>' +
    '<button type="button" class="fs-cancel">Cancel</button>';
  document.body.appendChild(overlay);

  const video = overlay.querySelector('video');
  const statusEl = overlay.querySelector('.fs-status');
  const cancelBtn = overlay.querySelector('.fs-cancel');
  const frameOutline = overlay.querySelector('.fs-frame-outline');

  function setStatus(text) {
    statusEl.textContent = text;
    speak(text);
  }

  let stream = null;
  let cancelled = false;
  let rafId = null;

  function cleanup() {
    if (rafId) cancelAnimationFrame(rafId);
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
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 320, height: 320 },
        });
        if (cancelled) return;
        video.srcObject = stream;
        await new Promise((r) => { video.onloadedmetadata = r; });
        if (cancelled) return;

        setStatus('Loading…');
        const faceapi = await loadModels();
        if (cancelled) return;

        setStatus('Position your face in the frame');

        const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        let blinkDetected = false;
        let wasOpen = false;
        let stableFrames = 0;
        let capturedDescriptor = null;
        const startTime = Date.now();

        const finishWithSuccess = (descriptor) => {
          overlay.classList.add('fs-success');
          frameOutline.classList.add('success');
          setStatus('Face recognized');
          setTimeout(() => {
            cleanup();
            resolve(descriptor);
          }, SUCCESS_HOLD_MS);
        };

        const tick = async () => {
          if (cancelled) return;
          if (Date.now() - startTime > CAPTURE_TIMEOUT_MS) {
            cleanup();
            reject(new Error('Timed out waiting for a face. Try again.'));
            return;
          }

          const result = await faceapi
            .detectSingleFace(video, detectorOptions)
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (cancelled) return;

          if (!result) {
            stableFrames = 0;
            setStatus('Position your face in the frame');
            rafId = requestAnimationFrame(tick);
            return;
          }

          if (!requireLiveness) {
            stableFrames++;
            if (stableFrames === 1) setStatus('Hold still…');
            if (stableFrames >= STABLE_FRAMES_NEEDED) {
              capturedDescriptor = Array.from(result.descriptor);
              finishWithSuccess(capturedDescriptor);
              return;
            }
            rafId = requestAnimationFrame(tick);
            return;
          }

          const leftEAR = eyeAspectRatio(result.landmarks.getLeftEye());
          const rightEAR = eyeAspectRatio(result.landmarks.getRightEye());
          const avgEAR = (leftEAR + rightEAR) / 2;

          if (!blinkDetected) {
            if (avgEAR > EAR_OPEN_THRESHOLD) {
              wasOpen = true;
              setStatus('Now blink for us');
            } else if (wasOpen && avgEAR < EAR_BLINK_THRESHOLD) {
              blinkDetected = true;
            }
          }

          if (blinkDetected) {
            capturedDescriptor = Array.from(result.descriptor);
            finishWithSuccess(capturedDescriptor);
            return;
          }

          rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
      } catch (err) {
        cleanup();
        reject(err);
      }
    })();
  });
}
