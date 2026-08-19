import express from "express";
import {
  getCoinRequestLink,
  createCoinRequestPayment,
  getCoinRequestPayment,
  finalizeCoinRequestPayment,
  COIN_REQUEST_NGN_PER_COIN,
} from "../services/auth.js";
import { initializeTransaction, verifyTransaction } from "../services/paystack.js";
import { SimpleRateLimiter } from "../middleware/security-middleware.js";

const router = express.Router();

const PUBLIC_BASE = "https://esteamstv.devs.surf";
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || "";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const payInitLimiter = new SimpleRateLimiter(
  10,
  60 * 60 * 1000,
  (req) => req.ip,
  "Too many payment attempts. Please try again in a bit."
).middleware();
const payConfirmLimiter = new SimpleRateLimiter(30, 60 * 60 * 1000, (req) => req.ip).middleware();

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nairaPlain(amount) {
  return "₦" + Number(amount || 0).toLocaleString("en-NG");
}

function naira(amount) {
  return "&#8358;" + Number(amount || 0).toLocaleString("en-NG");
}

const PAGE_HEAD_FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">`;

const PAGE_BASE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  :root{
    --dark:#0A0A0F;--text:#F3F3FA;--muted:rgba(255,255,255,.55);
    --cyan:#00E0FF;--purple:#7C5CFF;--red:#FF3B5C;--green:#25D06A;
    --font-display:'Space Grotesk',Inter,-apple-system,sans-serif;
    --font-body:'Inter',-apple-system,sans-serif;
    --font-mono:'JetBrains Mono',ui-monospace,monospace;
  }
  html,body{min-height:100%}
  body{min-height:100vh;background:var(--dark);color:var(--text);font-family:var(--font-body);
    display:flex;align-items:center;justify-content:center;padding:24px;position:relative;overflow-x:hidden}
  .blob{position:fixed;border-radius:50%;filter:blur(90px);pointer-events:none;z-index:0}
  .blob-1{width:min(60vw,420px);height:min(60vw,420px);left:-14vw;top:-12vh;background:rgba(0,224,255,.22)}
  .blob-2{width:min(66vw,460px);height:min(66vw,460px);right:-16vw;bottom:-16vh;background:rgba(124,92,255,.24)}
  .card{position:relative;z-index:1;width:100%;max-width:390px;padding:26px 22px 22px;border-radius:22px;
    background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(255,255,255,.06);
    border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(22px) saturate(150%);
    -webkit-backdrop-filter:blur(22px) saturate(150%);box-shadow:0 24px 60px rgba(0,0,0,.45)}
  .brand{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:18px}
  .brand svg{width:26px;height:26px}
  .brand-name{font-family:var(--font-display);font-size:.86rem;font-weight:700;letter-spacing:.14em;
    text-transform:uppercase;background:linear-gradient(90deg,var(--cyan),var(--purple));
    -webkit-background-clip:text;background-clip:text;color:transparent}
`;

const LOGO_SVG = `<svg viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id="esg" gradientUnits="userSpaceOnUse" x1="96" y1="128" x2="416" y2="400"><stop offset="0" stop-color="#00E0FF"/><stop offset="1" stop-color="#7C5CFF"/></linearGradient></defs><rect x="96" y="128" width="320" height="216" rx="36" fill="none" stroke="url(#esg)" stroke-width="26"/><path d="M232 196v80l70-40z" fill="url(#esg)"/><path d="M196 384h120" stroke="url(#esg)" stroke-width="26" stroke-linecap="round"/></svg>`;

function expiredPage() {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payment link expired: ES TEAMS TV</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/pay-icon.png" type="image/png">
${PAGE_HEAD_FONTS}
<style>${PAGE_BASE_CSS}
  .card{text-align:center}
  .expired-icon{width:54px;height:54px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;
    justify-content:center;background:rgba(255,59,92,.12);border:1px solid rgba(255,59,92,.35);color:var(--red)}
  .expired-icon svg{width:26px;height:26px}
  .title{font-family:var(--font-display);font-size:1.12rem;font-weight:700;margin-bottom:8px}
  .sub{font-size:.82rem;color:var(--muted);margin-bottom:20px}
  .visit-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 26px;border-radius:12px;
    background:linear-gradient(90deg,var(--cyan),var(--purple));color:#04121a;font-weight:700;
    font-size:.85rem;text-decoration:none}
  .visit-btn svg{width:15px;height:15px;flex-shrink:0}
</style></head><body>
<div class="blob blob-1"></div><div class="blob blob-2"></div>
<div class="card">
  <div class="brand">${LOGO_SVG}<span class="brand-name">ES Teams TV</span></div>
  <div class="expired-icon">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 7.5V12l3 2"/></svg>
  </div>
  <div class="title">Payment link is expired</div>
  <div class="sub">To generate more ;</div>
  <a class="visit-btn" href="${esc(PUBLIC_BASE)}" rel="noopener">
    Visit Page
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>
  </a>
</div>
</body></html>`;
}

const PHOTO_DATA_URL_RE = /^data:image\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const PHOTO_HTTPS_RE = /^https:\/\/[A-Za-z0-9._~:/?#[\]@!$&*+,;=%-]+$/;
const PHOTO_MAX_CHARS = 950 * 1024;

function safePhotoUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > PHOTO_MAX_CHARS) return "";
  if (PHOTO_DATA_URL_RE.test(raw)) return raw;
  if (PHOTO_HTTPS_RE.test(raw)) return raw;
  return "";
}

function payPage(link) {
  const photoUrl = safePhotoUrl(link.photoURL);
  const title = `Send coins directly to ${link.displayName}`;
  const description = `${link.displayName} is requesting ${link.coins} coins on ES TEAMS TV. Pay ${nairaPlain(link.amountNgn)} securely and it lands straight in their balance.`;
  const url = `${PUBLIC_BASE}/pay/${link.token}`;
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0A0A0F">
<link rel="icon" href="/pay-icon.png" type="image/png">
<link rel="apple-touch-icon" href="/pay-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ES TEAMS TV">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(PUBLIC_BASE)}/pay-og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(PUBLIC_BASE)}/pay-og.png">
${PAGE_HEAD_FONTS}
<style>${PAGE_BASE_CSS}
  .who{text-align:center;margin-bottom:18px}
  .who-avatar{width:72px;height:72px;margin:0 auto 12px;border-radius:50%;display:flex;align-items:center;
    justify-content:center;font-family:var(--font-display);font-size:1.7rem;font-weight:700;color:#04121a;
    background:linear-gradient(140deg,var(--cyan),var(--purple));background-size:cover;background-position:center;
    box-shadow:0 8px 24px rgba(0,224,255,.22);border:2px solid rgba(255,255,255,.16)}
  .who-avatar.has-photo{color:transparent}
  .who-title{font-family:var(--font-display);font-size:1.08rem;font-weight:700;line-height:1.35}
  .who-sub{font-size:.76rem;color:var(--muted);margin-top:6px}
  .amount-box{margin:18px 0;padding:16px;border-radius:16px;text-align:center;
    background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}
  .amount-val{font-family:var(--font-display);font-size:1.9rem;font-weight:700;letter-spacing:-.02em}
  .amount-coins{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:4px 12px;border-radius:20px;
    font-size:.74rem;font-weight:600;background:rgba(244,183,51,.14);color:#F4B733;border:1px solid rgba(244,183,51,.3)}
  .amount-coins svg{width:13px;height:13px}
  .field{margin-bottom:12px}
  .field label{display:block;font-size:.68rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:var(--muted);margin-bottom:6px}
  .field input{width:100%;padding:11px 13px;border-radius:11px;background:rgba(255,255,255,.05);
    border:1px solid rgba(255,255,255,.12);color:var(--text);font-size:.85rem;font-family:var(--font-body);outline:none}
  .field input:focus{border-color:rgba(0,224,255,.5)}
  .pay-btn{width:100%;padding:13px;border:none;border-radius:12px;font-family:var(--font-body);
    font-size:.88rem;font-weight:700;color:#04121a;background:linear-gradient(90deg,var(--cyan),var(--purple));
    display:flex;align-items:center;justify-content:center;gap:8px}
  .pay-btn:disabled{opacity:.55}
  .pay-btn svg{width:15px;height:15px}
  .countdown{margin-top:14px;text-align:center;font-size:.72rem;color:var(--muted)}
  .countdown b{color:var(--text);font-family:var(--font-mono);font-weight:600}
  .msg{margin-top:12px;font-size:.78rem;text-align:center;min-height:1.1em}
  .msg.err{color:var(--red)}
  .msg.ok{color:var(--green)}
  .foot{margin-top:16px;text-align:center;font-size:.66rem;color:rgba(255,255,255,.35);line-height:1.6}
  .done{display:none;text-align:center}
  .done-icon{width:58px;height:58px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;
    justify-content:center;background:rgba(37,208,106,.12);border:1px solid rgba(37,208,106,.4);color:var(--green)}
  .done-icon svg{width:28px;height:28px}
  body.paid .pay-form{display:none}
  body.paid .done{display:block}
</style></head><body>
<div class="blob blob-1"></div><div class="blob blob-2"></div>
<div class="card">
  <div class="brand">${LOGO_SVG}<span class="brand-name">ES Teams TV</span></div>

  <div class="pay-form">
    <div class="who">
      <div class="who-avatar${photoUrl ? " has-photo" : ""}"${photoUrl ? ` style="background-image:url('${esc(photoUrl)}')"` : ""}>${esc((link.displayName || "?").trim().charAt(0).toUpperCase())}</div>
      <div class="who-title">Send coins directly to ${esc(link.displayName)}</div>
      <div class="who-sub">${link.username ? "@" + esc(link.username) : "ES TEAMS TV member"}</div>
    </div>

    <div class="amount-box">
      <div class="amount-val">${naira(link.amountNgn)}</div>
      <div class="amount-coins">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M8.5 9.5a2 2 0 013-1.7M15.5 14.5a2 2 0 01-3 1.7"/></svg>
        ${link.coins} coins
      </div>
    </div>

    <div class="field">
      <label for="payerEmail">Your email (for the receipt)</label>
      <input type="email" id="payerEmail" placeholder="you@example.com" autocomplete="email" inputmode="email">
    </div>

    <button type="button" class="pay-btn" id="payBtn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
      <span id="payBtnLabel">Pay ${naira(link.amountNgn)}</span>
    </button>

    <div class="countdown">This link expires in <b id="payCountdown">--:--</b></div>
    <div class="msg" id="payMsg"></div>
  </div>

  <div class="done">
    <div class="done-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>
    </div>
    <div class="who-title">Payment received</div>
    <div class="who-sub" id="doneSub">${link.coins} coins were added to ${esc(link.displayName)}'s balance.</div>
  </div>

  <div class="foot">Payments are processed securely. Coins are added to the recipient's ES TEAMS TV balance.</div>
</div>
<script nonce="__CSP_NONCE__" src="https://js.paystack.co/v1/inline.js"></script>
<script nonce="__CSP_NONCE__">
(function(){
  var TOKEN = ${JSON.stringify(link.token)};
  var EXPIRES_AT = ${Number(link.expiresAt)};
  var COINS = ${Number(link.coins)};
  var btn = document.getElementById('payBtn');
  var emailInput = document.getElementById('payerEmail');
  var msg = document.getElementById('payMsg');
  var countdown = document.getElementById('payCountdown');

  function setMsg(text, ok){
    msg.textContent = text || '';
    msg.className = 'msg' + (text ? (ok ? ' ok' : ' err') : '');
  }

  function pad(n){ return (n < 10 ? '0' : '') + n; }

  function tickCountdown(){
    var left = EXPIRES_AT - Date.now();
    if (left <= 0){
      countdown.textContent = 'expired';
      btn.disabled = true;
      setMsg('This payment link has expired.', false);
      return;
    }
    var total = Math.floor(left / 1000);
    countdown.textContent = pad(Math.floor(total / 60)) + ':' + pad(total % 60);
    setTimeout(tickCountdown, 1000);
  }
  tickCountdown();

  async function postJSON(url, body){
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    var data = await res.json().catch(function(){ return {}; });
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }

  async function confirmPayment(reference){
    setMsg('Confirming your payment…', true);
    try {
      await postJSON('/pay/' + encodeURIComponent(TOKEN) + '/confirm', { reference: reference });
      document.body.classList.add('paid');
      setMsg('', true);
    } catch (err) {
      setMsg(err.message || 'We could not confirm that payment. If you were charged, contact support.', false);
    }
  }

  btn.addEventListener('click', async function(){
    var email = (emailInput.value || '').trim();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email)){
      setMsg('Enter a valid email address.', false);
      emailInput.focus();
      return;
    }
    if (typeof PaystackPop === 'undefined'){
      setMsg('Payments are temporarily unavailable. Please try again later.', false);
      return;
    }
    btn.disabled = true;
    setMsg('Starting secure checkout…', true);
    var data;
    try {
      data = await postJSON('/pay/' + encodeURIComponent(TOKEN) + '/initialize', { email: email });
    } catch (err) {
      btn.disabled = false;
      setMsg(err.message || 'Could not start the payment.', false);
      return;
    }
    btn.disabled = false;
    setMsg('');
    var handler = PaystackPop.setup({
      key: data.publicKey,
      email: data.email,
      amount: data.amountKobo,
      ref: data.reference,
      currency: 'NGN',
      onClose: function(){ setMsg('Payment cancelled.', false); },
      callback: function(response){ confirmPayment(response.reference); },
    });
    handler.openIframe();
  });
})();
</script>
</body></html>`;
}

router.get("/pay/:token", async (req, res) => {
  res.set("Cache-Control", "no-store");
  let link = null;
  try {
    link = await getCoinRequestLink(req.params.token);
  } catch (err) {
    console.error("pay link lookup error:", err.message);
  }
  if (!link || link.expired) {
    return res.status(410).type("html").send(expiredPage());
  }
  res.type("html").send(payPage(link));
});

router.post("/pay/:token/initialize", payInitLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 120) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    const link = await getCoinRequestLink(req.params.token);
    if (!link || link.expired) {
      return res.status(410).json({ error: "This payment link has expired." });
    }
    const amountKobo = link.amountNgn * 100;
    const data = await initializeTransaction({
      email,
      amountKobo,
      metadata: { uid: link.uid, purpose: "coin_request", token: link.token, coins: link.coins },
    });
    await createCoinRequestPayment(link.token, data.reference, amountKobo, email);
    res.json({
      reference: data.reference,
      publicKey: PAYSTACK_PUBLIC_KEY,
      email,
      amountKobo,
      coins: link.coins,
    });
  } catch (err) {
    console.error("pay link initialize error:", err.message);
    res.status(err.status || 400).json({ error: err.message || "Could not start that payment." });
  }
});

router.post("/pay/:token/confirm", payConfirmLimiter, async (req, res) => {
  try {
    const reference = String(req.body?.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "Missing payment reference." });

    const record = await getCoinRequestPayment(reference);
    if (!record || record.token !== req.params.token) {
      return res.status(404).json({ error: "Payment not found." });
    }
    if (record.status === "success") return res.json({ ok: true, coins: record.coins || 0 });

    const paystackData = await verifyTransaction(reference);
    const result = await finalizeCoinRequestPayment(reference, paystackData);
    res.json({ ok: true, coins: result.coins || record.coins || 0 });
  } catch (err) {
    console.error("pay link confirm error:", err.message);
    res.status(400).json({ error: err.message || "Could not confirm that payment." });
  }
});

export { router as payLinkRouter, COIN_REQUEST_NGN_PER_COIN, payPage, expiredPage };
