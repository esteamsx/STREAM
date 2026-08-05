const OVERLAY_ID = 'faceScanOverlay';
const CAPTURE_TIMEOUT_MS = 15000;
const EAR_BLINK_THRESHOLD = 0.21;
const EAR_OPEN_THRESHOLD = 0.28;

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

function ensureOverlayStyles() {
  if (document.getElementById('faceScanStyles')) return;
  const style = document.createElement('style');
  style.id = 'faceScanStyles';
  style.textContent = `
#${OVERLAY_ID}{position:fixed;inset:0;z-index:2000;background:rgba(5,5,8,.92);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px}
#${OVERLAY_ID} video{width:min(320px,80vw);height:min(320px,80vw);object-fit:cover;
  border-radius:50%;transform:scaleX(-1);border:3px solid rgba(0,224,255,.4);
  box-shadow:0 0 40px rgba(0,224,255,.25);background:#000}
#${OVERLAY_ID} .fs-status{color:#F3F3FA;font-family:system-ui,-apple-system,sans-serif;font-size:.85rem;
  font-weight:600;text-align:center;max-width:280px}
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

export function captureFaceDescriptor() {
  ensureOverlayStyles();
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.innerHTML =
    '<video autoplay playsinline muted></video>' +
    '<div class="fs-status">Starting camera…</div>' +
    '<button type="button" class="fs-cancel">Cancel</button>';
  document.body.appendChild(overlay);

  const video = overlay.querySelector('video');
  const statusEl = overlay.querySelector('.fs-status');
  const cancelBtn = overlay.querySelector('.fs-cancel');

  let stream = null;
  let cancelled = false;
  let rafId = null;

  function cleanup() {
    if (rafId) cancelAnimationFrame(rafId);
    if (stream) stream.getTracks().forEach((t) => t.stop());
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

        statusEl.textContent = 'Loading…';
        const faceapi = await loadModels();
        if (cancelled) return;

        statusEl.textContent = 'Position your face in the circle…';

        const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        let blinkDetected = false;
        let wasOpen = false;
        const startTime = Date.now();

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
            statusEl.textContent = 'Position your face in the circle…';
            rafId = requestAnimationFrame(tick);
            return;
          }

          const leftEAR = eyeAspectRatio(result.landmarks.getLeftEye());
          const rightEAR = eyeAspectRatio(result.landmarks.getRightEye());
          const avgEAR = (leftEAR + rightEAR) / 2;

          if (!blinkDetected) {
            if (avgEAR > EAR_OPEN_THRESHOLD) {
              wasOpen = true;
              statusEl.textContent = 'Now blink…';
            } else if (wasOpen && avgEAR < EAR_BLINK_THRESHOLD) {
              blinkDetected = true;
              statusEl.textContent = 'Got it, verifying…';
            }
          }

          if (blinkDetected) {
            const descriptor = Array.from(result.descriptor);
            cleanup();
            resolve(descriptor);
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
