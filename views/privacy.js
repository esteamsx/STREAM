import { siteHeadFor } from "../config/site.js";

export function renderPrivacy(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("privacy")}
<script nonce="__CSP_NONCE__">(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<script nonce="__CSP_NONCE__" src="/interactive.js" defer></script>
<title>ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
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
  padding:24px;overflow-x:hidden;position:relative;
}
.aurora{position:fixed;inset:0;overflow:hidden;z-index:0;pointer-events:none}
.blob{position:absolute;border-radius:50%;filter:blur(65px);mix-blend-mode:screen}
.blob-1{width:560px;height:560px;background:radial-gradient(circle,var(--accent),transparent 70%);opacity:.5;top:-160px;left:-140px}
.blob-2{width:500px;height:500px;background:radial-gradient(circle,var(--accent2),transparent 70%);opacity:.45;bottom:-180px;right:-120px}
.blob-3{width:420px;height:420px;background:radial-gradient(circle,#ff5cb8,transparent 70%);opacity:.32;top:38%;left:50%;transform:translate(-50%,-50%)}
:root[data-theme="light"] .blob{filter:blur(70px);mix-blend-mode:normal}
:root[data-theme="light"] .blob-1{background:radial-gradient(circle,rgba(0,224,255,.5),transparent 70%);opacity:1}
:root[data-theme="light"] .blob-2{background:radial-gradient(circle,rgba(124,92,255,.45),transparent 70%);opacity:1}
:root[data-theme="light"] .blob-3{background:radial-gradient(circle,rgba(255,92,184,.35),transparent 70%);opacity:1}
a{color:var(--accent)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}

.wrap{width:100%;max-width:640px;margin:0 auto;position:relative;z-index:1}
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
  background:linear-gradient(155deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 40%,rgba(255,255,255,.04) 100%),rgba(255,255,255,.045);
  border:1px solid rgba(255,255,255,.16);
  box-shadow:0 16px 40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.12);
  border-radius:16px;
  padding:24px;margin-bottom:20px;font-size:.86rem;line-height:1.7;color:var(--muted);
}
:root[data-theme="light"] .policy-card{
  background:linear-gradient(155deg,rgba(255,255,255,.5),rgba(255,255,255,.16) 40%,rgba(255,255,255,.24) 100%);
  border:1px solid rgba(255,255,255,.55);
  box-shadow:0 16px 40px rgba(20,20,28,.1),inset 0 1px 0 rgba(255,255,255,.6);
}
.policy-card h2{font-family:var(--font-display);font-size:.95rem;color:var(--text);margin:18px 0 6px}
.policy-card h2:first-child{margin-top:0}
.policy-card p{margin:0 0 4px}
.policy-card ul{margin:6px 0 4px 20px}
.policy-card li{margin:0 0 4px}
.contact-box{
  background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;
  padding:12px 14px;margin:10px 0;font-family:var(--font-mono);font-size:.8rem;color:var(--text);
}
</style>
</head>
<body>

<div class="aurora">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>
</div>

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

  <h1>Privacy Policy</h1>
  <p class="subtitle">What we collect, why we collect it, and how it's kept. Last updated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}.</p>

  <div class="policy-card">
    <h2>Information We Collect</h2>
    <p>When you create an account, we collect:</p>
    <ul>
      <li>Your name, email address, and chosen username</li>
      <li>Your password, handled by Firebase Authentication (we never see or store it in plain text)</li>
      <li>Profile info you choose to add, such as an avatar</li>
      <li>Sign-in method, if you use Google Sign-In, a passkey, or two-factor authentication</li>
    </ul>
    <p>We also automatically collect:</p>
    <ul>
      <li>A session cookie, used to keep you signed in (it's not used for tracking or advertising)</li>
      <li>Basic technical info like IP address and browser type, used for security purposes (rate limiting, abuse prevention, and fraud/bot detection)</li>
    </ul>

    <h2>How We Use It</h2>
    <ul>
      <li>To create and secure your account, and keep you signed in</li>
      <li>To send account-related emails: verification codes, password resets, and security notices</li>
      <li>To detect and prevent abuse, spam, and unauthorized access</li>
      <li>To respond to support requests and DMCA notices</li>
    </ul>
    <p>We do not sell your personal information, and we do not use it for third-party advertising.</p>

    <h2>Third-Party Services</h2>
    <p>We rely on a small number of third-party services to run the site:</p>
    <ul>
      <li><strong>Firebase (Google)</strong>: authentication and account data storage</li>
      <li><strong>Google Sign-In</strong>: optional sign-in method, if you choose to use it</li>
      <li><strong>Gmail / Google Workspace</strong>: sending verification and account emails</li>
      <li><strong>Gravatar</strong>: profile avatars, if you've set one up there</li>
    </ul>
    <p>Each of these providers has its own privacy policy governing how they handle data on their end.</p>

    <h2>Cookies</h2>
    <p>We use a single essential session cookie to keep you signed in. It's required for the site to function and isn't used to track you across other websites.</p>

    <h2>Data Retention</h2>
    <p>We keep your account data for as long as your account is active. If you delete your account, associated data is scheduled for removal; some information may be retained briefly where required for security or legal purposes.</p>

    <h2>Your Choices</h2>
    <ul>
      <li>You can update or remove profile information at any time from your Account settings</li>
      <li>You can enable two-factor authentication or passkeys for extra account security</li>
      <li>You can request account deletion from your Account settings</li>
    </ul>

    <h2>Children's Privacy</h2>
    <p>This site is not directed at children under 13, and we do not knowingly collect information from children under that age.</p>

    <h2>Changes to This Policy</h2>
    <p>We may update this policy from time to time. Material changes will be reflected by updating the date at the top of this page.</p>

    <h2>Contact</h2>
    <p>Questions about this policy, or requests regarding your data, can be sent to:</p>
    <div class="contact-box" id="contactEmail">-</div>
  </div>
</div>

<script nonce="__CSP_NONCE__">
(function(){
  fetch('/api/dmca-agent-email').then(function(r){ return r.json(); }).then(function(d){
    var el = document.getElementById('contactEmail');
    if (el && d && d.email) el.textContent = d.email;
  }).catch(function(){});
})();
</script>
</body>
</html>`;
}
