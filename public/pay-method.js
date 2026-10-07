/* Shared payment helper: choose Apple Pay or Paystack, show $ amounts (1 USD = 1500 NGN),
   and open the Paystack v2 popup from a server-created access code. */
(function () {
  var RATE = 1500;

  function usd(ngn) { return Math.round((Number(ngn) / RATE) * 100) / 100; }
  function fmtUsd(ngn) { return '$' + usd(ngn).toFixed(2); }
  function fmtNgn(ngn) { return '\u20A6' + Number(ngn || 0).toLocaleString('en-NG'); }
  function parseNgn(text) {
    var m = String(text || '').replace(/,/g, '').match(/\d+(\.\d+)?/);
    return m ? Number(m[0]) : 0;
  }
  function appleReady() {
    try { return !!(window.ApplePaySession && window.ApplePaySession.canMakePayments()); }
    catch (e) { return false; }
  }

  var CSS = [
    '.es-pay-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9600;display:none;align-items:flex-end;justify-content:center}',
    '.es-pay-overlay.show{display:flex}',
    '.es-pay-sheet{background:var(--card,#14141d);color:var(--text,#fff);border-radius:16px 16px 0 0;width:100%;max-width:400px;padding:16px 14px;padding-bottom:calc(14px + env(safe-area-inset-bottom,0px))}',
    '.es-pay-title{font-family:var(--font-display,inherit);font-weight:700;font-size:1rem;text-align:center}',
    '.es-pay-amount{text-align:center;margin:6px 0 14px;font-size:.82rem;color:var(--muted,#9a9aaa)}',
    '.es-pay-amount b{color:var(--text,#fff);font-size:1.05rem}',
    '.es-pay-btn{width:100%;padding:14px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:.9rem;font-weight:700;margin-bottom:10px;border:1px solid var(--border-strong,rgba(255,255,255,.14))}',
    '.es-pay-btn svg{width:18px;height:18px;flex-shrink:0}',
    '.es-pay-btn.apple{background:#000;color:#fff;border-color:#000}',
    '.es-pay-btn.paystack{background:var(--card2,#1B1B27);color:var(--text,#fff)}',
    '.es-pay-btn[disabled]{opacity:.45}',
    '.es-pay-note{font-size:.7rem;color:var(--muted,#9a9aaa);text-align:center;margin:-4px 0 10px}',
    '.es-pay-cancel{width:100%;padding:12px;background:none;border:none;color:var(--muted,#9a9aaa);font-size:.82rem;font-weight:600}'
  ].join('\n');

  var APPLE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>';
  var CARD_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/></svg>';

  var styleAdded = false;
  function ensureStyle() {
    if (styleAdded) return;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    styleAdded = true;
  }

  function choose(opts) {
    opts = opts || {};
    ensureStyle();
    var ngn = Number(opts.ngn) || 0;
    var apple = appleReady();
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'es-pay-overlay';
      overlay.innerHTML =
        '<div class="es-pay-sheet" role="dialog" aria-label="Choose payment method">' +
          '<div class="es-pay-title">Choose payment method</div>' +
          '<div class="es-pay-amount"><b>' + fmtNgn(ngn) + '</b> &middot; ' + fmtUsd(ngn) + ' <span>($1 = ' + fmtNgn(RATE) + ')</span></div>' +
          '<button type="button" class="es-pay-btn apple" data-m="apple_pay"' + (apple ? '' : ' disabled') + '>' + APPLE_SVG + 'Pay ' + fmtUsd(ngn) + ' with Apple Pay</button>' +
          (apple ? '' : '<div class="es-pay-note">Apple Pay works on Apple devices with Safari.</div>') +
          '<button type="button" class="es-pay-btn paystack" data-m="paystack">' + CARD_SVG + 'Pay ' + fmtNgn(ngn) + ' with Paystack</button>' +
          '<button type="button" class="es-pay-cancel" data-m="">Cancel</button>' +
        '</div>';
      document.body.appendChild(overlay);
      requestAnimationFrame(function () { overlay.classList.add('show'); });

      function finish(value) {
        overlay.classList.remove('show');
        setTimeout(function () { overlay.remove(); }, 0);
        resolve(value || null);
      }
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) return finish(null);
        var b = e.target.closest('[data-m]');
        if (!b || b.disabled) return;
        finish(b.getAttribute('data-m'));
      });
    });
  }

  function open(data, cb) {
    cb = cb || {};
    if (typeof PaystackPop === 'undefined' || !data || !data.accessCode) {
      if (cb.onError) cb.onError(new Error('Payments are temporarily unavailable.'));
      return;
    }
    var pop = new PaystackPop();
    pop.resumeTransaction(data.accessCode, {
      onSuccess: function (tx) { if (cb.onSuccess) cb.onSuccess((tx && tx.reference) || data.reference); },
      onCancel: function () { if (cb.onClose) cb.onClose(); },
      onError: function (err) { if (cb.onError) cb.onError(err); }
    });
  }

  window.esPay = { RATE: RATE, usd: usd, fmtUsd: fmtUsd, fmtNgn: fmtNgn, parseNgn: parseNgn, appleReady: appleReady, choose: choose, open: open };
})();
