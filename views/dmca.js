import { siteHeadFor } from "../config/site.js";

export function renderDmca(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("dmca")}
<script nonce="__CSP_NONCE__">(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<script nonce="__CSP_NONCE__" src="/interactive.js" defer></script>
<title>ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script nonce="__CSP_NONCE__" async defer src="https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js" type="module"></script>
<style>
${cfg.protectionCSS || ""}
:root{
  --red:#FF3B5C;--red-dim:#8f1530;--accent:#00E0FF;--accent2:#7c5cff;
  --dark:#0A0A0F;--dark2:#0F0F16;--dark3:#13131C;
  --card:#15151F;--card2:#1B1B27;
  --border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);
  --text:#F3F3FA;--muted:rgba(255,255,255,.42);--muted2:rgba(255,255,255,.22);
  --font-display:'Space Grotesk',Inter,-apple-system,sans-serif;
  --font-body:'Inter',-apple-system,sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,monospace;
  --ease:cubic-bezier(.22,1,.36,1);
}
:root[data-theme="light"]{
  --dark:#F5F6FA;--dark2:#FFFFFF;--dark3:#ECEEF3;
  --card:#FFFFFF;--card2:#F0F1F5;
  --border:rgba(0,0,0,.08);--border-strong:rgba(0,0,0,.14);
  --text:#14141C;--muted:rgba(20,20,28,.55);--muted2:rgba(20,20,28,.3);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{min-height:100%}
body{
  background:var(--dark);color:var(--text);font-family:var(--font-body);
  padding:24px;
  background-image:
    radial-gradient(900px 500px at 15% -10%,rgba(0,224,255,.06),transparent 60%),
    radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.04),transparent 55%);
}
button{font-family:inherit;cursor:pointer}
input,textarea{font-family:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
a{color:var(--accent)}

.wrap{width:100%;max-width:640px;margin:0 auto}
.back-row{margin-bottom:14px}
.back-link{
  display:inline-flex;align-items:center;gap:6px;color:var(--muted);text-decoration:none;
  font-size:.82rem;font-weight:600;
}
.back-link:hover{color:var(--accent)}
.back-link svg{width:16px;height:16px}

.page-logo{
  display:flex;align-items:center;gap:10px;margin-bottom:20px;
  font-family:var(--font-display);font-size:1.3rem;font-weight:700;letter-spacing:-.02em;
  background:linear-gradient(90deg,var(--accent),var(--accent2));
  -webkit-background-clip:text;background-clip:text;color:transparent;
}

h1{font-family:var(--font-display);font-size:1.4rem;margin-bottom:6px}
.subtitle{color:var(--muted);font-size:.85rem;margin-bottom:24px;line-height:1.6}

.policy-card{
  background:var(--card);border:1px solid var(--border);border-radius:16px;
  padding:24px;margin-bottom:20px;font-size:.86rem;line-height:1.7;color:var(--muted);
}
.policy-card h2{font-family:var(--font-display);font-size:.95rem;color:var(--text);margin:18px 0 6px}
.policy-card h2:first-child{margin-top:0}
.policy-card p{margin:0 0 4px}
.agent-box{
  background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;
  padding:12px 14px;margin:10px 0;font-family:var(--font-mono);font-size:.8rem;color:var(--text);
}

.form-card{
  background:var(--card);border:1px solid var(--border);border-radius:16px;
  padding:24px;display:flex;flex-direction:column;gap:14px;
}
.form-card h2{font-family:var(--font-display);font-size:1rem;margin-bottom:2px}

.field{display:flex;flex-direction:column;gap:6px}
.field label{font-size:.72rem;font-weight:600;color:var(--muted);letter-spacing:.02em}
.field label .req{color:var(--red)}
.field input,.field textarea{
  width:100%;background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;
  padding:11px 13px;color:var(--text);font-size:.88rem;transition:border-color .2s var(--ease);resize:vertical;
}
.field textarea{min-height:80px}
.field input::placeholder,.field textarea::placeholder{color:var(--muted2)}
.field input:focus,.field textarea:focus{border-color:var(--accent)}

.checkbox-field{display:flex;align-items:flex-start;gap:10px}
.checkbox-field input{width:16px;height:16px;margin-top:2px;flex-shrink:0}
.checkbox-field label{font-size:.8rem;color:var(--muted);line-height:1.5;letter-spacing:0;font-weight:400}

@keyframes spin{to{transform:rotate(360deg)}}
.btn-spinner{
  width:15px;height:15px;border:2px solid rgba(4,20,26,.35);border-top-color:#04141a;
  border-radius:50%;display:inline-block;vertical-align:-3px;margin-right:8px;
  animation:spin .6s linear infinite;
}
.submit-btn{
  background:linear-gradient(90deg,var(--accent),var(--accent2));border:none;color:#04141a;
  font-weight:700;font-size:.9rem;padding:12px;border-radius:10px;
  transition:transform .15s var(--ease),box-shadow .15s var(--ease);margin-top:4px;
}
.submit-btn:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,224,255,.25)}
.submit-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}

.form-msg{
  font-size:.8rem;padding:10px 12px;border-radius:8px;display:none;
}
.form-msg.error{background:rgba(255,59,92,.1);border:1px solid rgba(255,59,92,.3);color:var(--red);display:block}
.form-msg.success{background:rgba(0,224,255,.08);border:1px solid rgba(0,224,255,.25);color:var(--accent);display:block}
</style>
</head>
<body>

<div class="wrap">
  <div class="back-row">
    <a href="/" class="back-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
      Back
    </a>
  </div>

  <div class="page-logo">
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" style="width:24px;height:24px;flex-shrink:0"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
    ES TEAMS TV
  </div>

  <h1>DMCA / Copyright Policy</h1>
  <p class="subtitle">How we handle copyright takedown requests under the Digital Millennium Copyright Act, and how to submit one.</p>

  <div class="policy-card">
    <h2>Our Policy</h2>
    <p>ES TEAMS TV respects the intellectual property rights of others and expects users to do the same. We respond to clear notices of alleged copyright infringement that comply with the DMCA (17 U.S.C. § 512) and equivalent laws in other jurisdictions.</p>

    <h2>Filing a Notice</h2>
    <p>To file a takedown notice, use the form below or email our designated agent directly. Your notice must include:</p>
    <p>1. A physical or electronic signature of the copyright owner or someone authorized to act on their behalf.</p>
    <p>2. Identification of the copyrighted work claimed to be infringed.</p>
    <p>3. Identification of the material you claim is infringing, including the specific URL(s) on this site.</p>
    <p>4. Your contact information: name, address, phone number, and email.</p>
    <p>5. A statement that you have a good-faith belief the use is not authorized by the copyright owner, its agent, or the law.</p>
    <p>6. A statement, under penalty of perjury, that the information in the notice is accurate and that you are authorized to act on behalf of the owner.</p>

    <h2>Designated Agent</h2>
    <div class="agent-box">
      ES TEAMS TV, Copyright Agent<br>
      Email: <span id="agentEmail">-</span>
    </div>

    <h2>Counter-Notification</h2>
    <p>If content you posted was removed and you believe this was a mistake or misidentification, you may submit a counter-notice to the same address with your contact information, identification of the removed material, and a statement under penalty of perjury that you have a good-faith belief the material was removed in error.</p>

    <h2>Repeat Infringers</h2>
    <p>Accounts found to be repeat infringers may be suspended or terminated at our discretion.</p>
  </div>

  <div class="form-card">
    <h2>Submit a Takedown Request</h2>
    <div class="form-msg" id="formMsg"></div>

    <div class="field">
      <label>Your Name <span class="req">*</span></label>
      <input type="text" id="reporterName" placeholder="Full name" required>
    </div>
    <div class="field">
      <label>Your Email <span class="req">*</span></label>
      <input type="email" id="reporterEmail" placeholder="you@example.com" required>
    </div>
    <div class="field">
      <label>Copyright Owner <span class="req">*</span></label>
      <input type="text" id="copyrightOwner" placeholder="Name of the rights holder (if not you)" required>
    </div>
    <div class="field">
      <label>Description of Copyrighted Work <span class="req">*</span></label>
      <textarea id="workDescription" placeholder="What is the work being infringed?" required></textarea>
    </div>
    <div class="field">
      <label>Infringing URL(s) on This Site <span class="req">*</span></label>
      <textarea id="infringingUrls" placeholder="One URL per line" required></textarea>
    </div>

    <div class="checkbox-field">
      <input type="checkbox" id="goodFaithCheck" required>
      <label for="goodFaithCheck">I have a good-faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</label>
    </div>
    <div class="checkbox-field">
      <input type="checkbox" id="accuracyCheck" required>
      <label for="accuracyCheck">Under penalty of perjury, I state that the information in this notice is accurate and that I am the copyright owner or authorized to act on their behalf.</label>
    </div>

    <div class="field">
      <label>Electronic Signature (type your full legal name) <span class="req">*</span></label>
      <input type="text" id="signature" placeholder="Full legal name" required>
    </div>

    <altcha-widget id="dmcaAltcha" name="dmcaAltcha" challengeurl="/api/captcha/challenge" workers="4"></altcha-widget>

    <button type="button" class="submit-btn" id="dmcaSubmit" disabled>Submit Takedown Request</button>
  </div>
</div>

<script nonce="__CSP_NONCE__">
(function(){
  fetch('/api/dmca-agent-email').then(function(r){ return r.json(); }).then(function(d){
    var el = document.getElementById('agentEmail');
    if (el && d && d.email) el.textContent = d.email;
  }).catch(function(){});

  var msg = document.getElementById('formMsg');
  function showMsg(text, isError){
    msg.textContent = text;
    msg.className = 'form-msg ' + (isError ? 'error' : 'success');
  }

  var requiredFields = ['reporterName', 'reporterEmail', 'copyrightOwner', 'workDescription', 'infringingUrls', 'signature'];
  var captchaPassed = false;
  var captchaValue = '';
  var submitBtn = document.getElementById('dmcaSubmit');

  function updateSubmitState(){
    var allFilled = requiredFields.every(function(id){
      return document.getElementById(id).value.trim().length > 0;
    });
    var bothChecked = document.getElementById('goodFaithCheck').checked && document.getElementById('accuracyCheck').checked;
    submitBtn.disabled = !(allFilled && bothChecked && captchaPassed);
  }

  requiredFields.forEach(function(id){
    document.getElementById(id).addEventListener('input', updateSubmitState);
  });
  document.getElementById('goodFaithCheck').addEventListener('change', updateSubmitState);
  document.getElementById('accuracyCheck').addEventListener('change', updateSubmitState);

  var dmcaAltcha = document.getElementById('dmcaAltcha');
  dmcaAltcha.addEventListener('statechange', function(ev){
    var state = ev.detail.state;
    captchaPassed = state === 'verified';
    captchaValue = captchaPassed ? ev.detail.payload : '';
    updateSubmitState();
  });

  document.getElementById('dmcaSubmit').addEventListener('click', async function(){
    msg.className = 'form-msg';
    var reporterName = document.getElementById('reporterName').value.trim();
    var reporterEmail = document.getElementById('reporterEmail').value.trim();
    var copyrightOwner = document.getElementById('copyrightOwner').value.trim();
    var workDescription = document.getElementById('workDescription').value.trim();
    var infringingUrls = document.getElementById('infringingUrls').value.trim();
    var goodFaithChecked = document.getElementById('goodFaithCheck').checked;
    var accuracyChecked = document.getElementById('accuracyCheck').checked;
    var signature = document.getElementById('signature').value.trim();

    if (!reporterName || !reporterEmail || !copyrightOwner || !workDescription || !infringingUrls || !signature) {
      showMsg('Please fill in all required fields.', true);
      return;
    }
    if (!goodFaithChecked || !accuracyChecked) {
      showMsg('Please confirm both statements above before submitting.', true);
      return;
    }
    if (!captchaPassed) {
      showMsg('Please complete the captcha before submitting.', true);
      return;
    }

    var btn = document.getElementById('dmcaSubmit');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span>Submitting…';

    try {
      var res = await fetch('/api/dmca-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterName: reporterName,
          reporterEmail: reporterEmail,
          copyrightOwner: copyrightOwner,
          workDescription: workDescription,
          infringingUrls: infringingUrls,
          goodFaithStatement: 'I have a good-faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.',
          accuracyStatement: 'Under penalty of perjury, the information in this notice is accurate and the submitter is the copyright owner or authorized to act on their behalf.',
          signature: signature,
          altcha: captchaValue,
        }),
      });
      var data = await res.json().catch(function(){ return {}; });
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      showMsg('Your takedown request has been submitted. We will review it and respond by email.', false);
      document.querySelectorAll('.form-card input, .form-card textarea').forEach(function(el){
        if (el.type === 'checkbox') el.checked = false; else el.value = '';
      });
      if (dmcaAltcha.reset) dmcaAltcha.reset();
      captchaPassed = false;
      captchaValue = '';
    } catch (err) {
      showMsg(err.message, true);
    }
    btn.textContent = 'Submit Takedown Request';
    updateSubmitState();
  });
})();

</script>
</body>
</html>`;
}
