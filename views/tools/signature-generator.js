import { renderToolPage } from "./page-shell.js";

export function renderSignatureGenerator(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsSignatureGenerator",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M3 17c3-6 5 4 8-2s5 4 8-3"/><path stroke-linecap="round" d="M3 21h18"/></svg>`,
    heading: "Signature Generator",
    subtitle: "Draw your signature with your mouse, finger, or stylus, and export it as a transparent PNG.",
    bodyHtml: `
      <div class="field-row">
        <div class="field">
          <label for="penColor">Ink Color</label>
          <input type="color" id="penColor" value="#00e0ff" style="height:42px;padding:4px;cursor:pointer">
        </div>
        <div class="field">
          <label for="penWidth">Pen Width</label>
          <select id="penWidth">
            <option value="2">Thin</option>
            <option value="4" selected>Medium</option>
            <option value="7">Thick</option>
          </select>
        </div>
      </div>
      <canvas id="sigCanvas" style="width:100%;height:200px;background:repeating-conic-gradient(#0000 0 25%,rgba(255,255,255,.06) 0 50%) 0 0/16px 16px;border:1.5px dashed var(--border-strong);border-radius:10px;touch-action:none;margin-bottom:10px"></canvas>
      <button class="copy-btn" id="clearSigBtn" type="button" style="margin-bottom:14px">Clear</button>`,
    script: `
      var canvas = document.getElementById('sigCanvas');
      var ctx = canvas.getContext('2d');
      var penColor = document.getElementById('penColor');
      var penWidth = document.getElementById('penWidth');
      var clearSigBtn = document.getElementById('clearSigBtn');
      var drawing = false;
      var hasStroke = false;
      var last = null;
      setExtraValid(false);

      function resizeCanvas(){
        var rect = canvas.getBoundingClientRect();
        var ratio = window.devicePixelRatio || 1;
        var prev = hasStroke ? canvas.toDataURL() : null;
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        ctx.scale(ratio, ratio);
        if (prev) {
          var img = new Image();
          img.onload = function(){ ctx.drawImage(img, 0, 0, rect.width, rect.height); };
          img.src = prev;
        }
      }
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      function pos(e){
        var rect = canvas.getBoundingClientRect();
        var t = e.touches && e.touches[0] ? e.touches[0] : e;
        return { x: t.clientX - rect.left, y: t.clientY - rect.top };
      }
      function start(e){ e.preventDefault(); drawing = true; last = pos(e); }
      function move(e){
        if (!drawing) return;
        e.preventDefault();
        var p = pos(e);
        ctx.strokeStyle = penColor.value;
        ctx.lineWidth = parseInt(penWidth.value, 10);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        last = p;
        if (!hasStroke) { hasStroke = true; setExtraValid(true); }
      }
      function end(){ drawing = false; }

      canvas.addEventListener('mousedown', start);
      canvas.addEventListener('mousemove', move);
      window.addEventListener('mouseup', end);
      canvas.addEventListener('touchstart', start, { passive: false });
      canvas.addEventListener('touchmove', move, { passive: false });
      canvas.addEventListener('touchend', end);

      clearSigBtn.addEventListener('click', function(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasStroke = false;
        setExtraValid(false);
        hideResult();
      });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        if (!hasStroke) { showMsg('Draw a signature first.', false); return; }
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Preparing…';
        try {
          await postTool('/api/tools/signature-gate', {});
          resultEl.innerHTML = '<div class="result-head"><span>Signature Ready</span><button class="copy-btn" id="dlResultBtn" type="button">Download PNG</button></div>';
          showResult();
          bindAnimatedDownload(document.getElementById('dlResultBtn'), function(){
            triggerDataUrlDownload(canvas.toDataURL('image/png'), 'signature.png');
          });
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Export Signature';
        resetAltcha();
      });`,
  });
}
