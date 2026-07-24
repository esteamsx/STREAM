export function renderDevelopers(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script>document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Developer API — ES TEAMS TV</title>
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
html,body{height:100%}
body{
  background:var(--dark);color:var(--text);font-family:var(--font-body);
  min-height:100%;
  background-image:
    radial-gradient(900px 500px at 15% -10%,rgba(0,224,255,.06),transparent 60%),
    radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.04),transparent 55%);
}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
code,pre{font-family:var(--font-mono)}
code{background:var(--card2);padding:2px 6px;border-radius:5px;font-size:.85em}
pre{
  background:var(--card2);border:1px solid var(--border);border-radius:10px;
  padding:14px 16px;overflow-x:auto;font-size:.82rem;line-height:1.6;margin:10px 0 18px;
}
.wrap{max-width:760px;margin:0 auto;padding:32px 20px 80px}
.top-logo{
  display:flex;align-items:center;gap:10px;margin-bottom:28px;
  font-family:var(--font-display);font-size:1.15rem;font-weight:700;
}
.top-logo a{color:var(--text);text-decoration:none;display:flex;align-items:center;gap:8px}
h1{font-family:var(--font-display);font-size:1.7rem;margin-bottom:8px}
h2{font-family:var(--font-display);font-size:1.15rem;margin:34px 0 10px;padding-top:14px;border-top:1px solid var(--border)}
p{color:var(--muted);line-height:1.65;margin-bottom:10px;font-size:.92rem}
table{width:100%;border-collapse:collapse;margin:10px 0 18px;font-size:.85rem}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--border)}
th{color:var(--muted);font-weight:600}
.badge{display:inline-block;padding:3px 9px;border-radius:6px;font-size:.72rem;font-weight:700;font-family:var(--font-mono)}
.badge-get{background:rgba(0,224,255,.12);color:var(--accent)}
.badge-post{background:rgba(124,92,255,.15);color:var(--accent2)}
.badge-delete{background:rgba(255,59,92,.12);color:var(--red)}
.note{
  background:rgba(0,224,255,.06);border:1px solid rgba(0,224,255,.2);border-radius:10px;
  padding:12px 14px;font-size:.85rem;color:var(--text);margin:14px 0;
}
.cta{
  display:inline-block;margin-top:10px;padding:10px 18px;border-radius:10px;
  background:linear-gradient(90deg,var(--accent),var(--accent2));color:#04121a;font-weight:700;font-size:.85rem;
}
.cta:hover{text-decoration:none;opacity:.92}
</style>
</head>
<body>
<div class="wrap">

  <div class="top-logo">
    <a href="/">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4V8z" fill="var(--accent)" stroke="none"/></svg>
      ES TEAMS TV
    </a>
  </div>

  <h1>Developer API</h1>
  <p>Pull live channels into your own site, bot, or app — with a key tied to your account, and a link that never exposes the real stream source.</p>

  <h2>Getting a key</h2>
  <p>Create an API key from <a href="/account">Account Settings → Developer API</a>. The raw key is shown once, so save it somewhere safe. You can have up to 5 keys, and revoke any of them at any time.</p>

  <h2>Authentication</h2>
  <p>Pass your key in the <code>x-api-key</code> header on every request.</p>
  <pre>x-api-key: estv_your_key_here</pre>

  <h2>List channels</h2>
  <p><span class="badge badge-get">GET</span> <code>/api/v1/channels</code></p>
  <p>Returns every channel id you can request, grouped by category. No key required.</p>
  <pre>curl https://esteamstv.devs.surf/api/v1/channels</pre>
  <pre>{
  "channels": [
    { "id": "nickelodeon", "name": "Nickelodeon", "category": "Kids" },
    { "id": "espn", "name": "ESPN", "category": "Sports" },
    ...
  ]
}</pre>

  <h2>Get a stream link</h2>
  <p><span class="badge badge-get">GET</span> <code>/api/v1/stream/:channel</code></p>
  <p>Give it a channel id (e.g. <code>nickelodeon</code>) and get back a watermarked, single-use embed link. It is <strong>not</strong> the real stream URL — it's a short-lived link to our own player, which is the only thing that ever talks to the actual source.</p>
  <pre>curl -H "x-api-key: estv_your_key_here" \\
  https://esteamstv.devs.surf/api/v1/stream/nickelodeon</pre>
  <pre>{
  "channel": "nickelodeon",
  "embed_url": "https://esteamstv.devs.surf/embed/nickelodeon?token=...",
  "expires_at": "2026-07-24T18:00:00.000Z",
  "note": "Embed this URL in an iframe (or open it directly)."
}</pre>

  <h2>Using the link</h2>
  <p>Drop <code>embed_url</code> straight into an iframe on your site:</p>
  <pre>&lt;iframe src="https://esteamstv.devs.surf/embed/nickelodeon?token=..." 
        width="100%" height="400" frameborder="0" allowfullscreen&gt;
&lt;/iframe&gt;</pre>
  <p>Or, in a Telegram bot, send it as a link or a Web App button so it opens in-app. Either way, viewers see the ES TEAMS TV watermark on the player — that stays on regardless of where it's embedded.</p>

  <h2>Link lifetime</h2>
  <table>
    <tr><th>Thing</th><th>Expires after</th></tr>
    <tr><td>Embed link (<code>embed_url</code>)</td><td>6 hours</td></tr>
  </table>
  <p>Once a link expires, call <code>/api/v1/stream/:channel</code> again for a fresh one. Don't try to cache or redistribute the underlying player URL past its expiry — it stops working, by design.</p>

  <h2>Rate limits</h2>
  <p>30 requests per minute per API key on the issuance endpoints. That's plenty for normal use — one call per viewer session, not per segment.</p>

  <h2>Errors</h2>
  <table>
    <tr><th>Status</th><th>Meaning</th></tr>
    <tr><td>401</td><td>Missing, invalid, or revoked API key</td></tr>
    <tr><td>404</td><td>Unknown channel id — check <code>/api/v1/channels</code></td></tr>
    <tr><td>429</td><td>Rate limit hit — slow down</td></tr>
    <tr><td>502</td><td>Could not reach the stream source — try again shortly</td></tr>
  </table>

  <div class="note">This is an early version of the API. Endpoints and limits may change — nothing here is guaranteed stable yet.</div>

  <a class="cta" href="/account">Get your API key →</a>

</div>
</body>
</html>`;
}
