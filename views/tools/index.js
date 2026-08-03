import { siteHeadFor } from "../../config/site.js";

const TOOLS = [
  {
    href: "/tools/dns-lookup",
    name: "DNS Lookup",
    desc: "Look up A, AAAA, MX, TXT, NS, CNAME and SOA records.",
    icon: `<circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M3 12h18M12 3c2.5 2.6 4 6 4 9s-1.5 6.4-4 9c-2.5-2.6-4-6-4-9s1.5-6.4 4-9z"/>`,
  },
  {
    href: "/tools/obfuscate",
    name: "JavaScript Obfuscator",
    desc: "Obfuscate JavaScript source code instantly.",
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-12M6 9l-3 3 3 3M18 9l3 3-3 3"/>`,
  },
  {
    href: "/tools/qr-code",
    name: "QR Code Generator",
    desc: "Turn any text or URL into a scannable QR code.",
    icon: `<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM14 20h3M20 14v3M20 20h.01"/>`,
  },
  {
    href: "/tools/ssl-checker",
    name: "SSL Certificate Checker",
    desc: "Check a domain's TLS certificate — issuer, expiry, validity.",
    icon: `<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>`,
  },
  {
    href: "/tools/whois",
    name: "WHOIS Lookup",
    desc: "Domain registration info — owner, registrar, dates.",
    icon: `<circle cx="11" cy="11" r="7"/><path stroke-linecap="round" d="M21 21l-4.3-4.3"/>`,
  },
  {
    href: "/tools/base64",
    name: "Base64 Encode / Decode",
    desc: "Encode text to Base64, or decode it back.",
    icon: `<rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M7 9h4M7 13h6M7 17h3"/>`,
  },
  {
    href: "/tools/jwt-decode",
    name: "JWT Decoder",
    desc: "Decode a JSON Web Token's header and payload.",
    icon: `<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/><circle cx="12" cy="16" r="1.4"/>`,
  },
  {
    href: "/tools/json-formatter",
    name: "JSON Formatter",
    desc: "Format and validate JSON, pretty-printed.",
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M7 4a2 2 0 00-2 2v3a2 2 0 01-2 2 2 2 0 012 2v3a2 2 0 002 2M17 4a2 2 0 012 2v3a2 2 0 002 2 2 2 0 00-2 2v3a2 2 0 01-2 2"/>`,
  },
];

export function renderToolsIndex(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script>document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("tools")}
<script>(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<title>Free Tools — ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
${cfg.protectionCSS || ""}
:root{
  --accent:#00E0FF;--accent2:#7c5cff;
  --dark:#0A0A0F;--dark3:#13131C;--card:#15151F;--card2:#1B1B27;
  --border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);
  --text:#F3F3FA;--muted:rgba(255,255,255,.42);
  --font-display:'Space Grotesk',Inter,-apple-system,sans-serif;
  --font-body:'Inter',-apple-system,sans-serif;
  --ease:cubic-bezier(.22,1,.36,1);
}
:root[data-theme="light"]{
  --dark:#F5F6FA;--card:#FFFFFF;--card2:#F0F1F5;
  --border:rgba(0,0,0,.08);--border-strong:rgba(0,0,0,.14);
  --text:#14141C;--muted:rgba(20,20,28,.55);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{min-height:100%}
body{
  background:var(--dark);color:var(--text);font-family:var(--font-body);padding:24px;padding-bottom:60px;
  background-image:
    radial-gradient(900px 500px at 15% -10%,rgba(0,224,255,.06),transparent 60%),
    radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.04),transparent 55%);
}
a{color:inherit;text-decoration:none}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
.wrap{width:100%;max-width:760px;margin:0 auto}
.back-row{margin-bottom:14px}
.back-link{display:inline-flex;align-items:center;gap:6px;color:var(--muted);font-size:.82rem;font-weight:600}
.back-link:hover{color:var(--accent)}
.back-link svg{width:16px;height:16px}
.page-logo{
  display:flex;align-items:center;gap:10px;margin-bottom:20px;
  font-family:var(--font-display);font-size:1.3rem;font-weight:700;letter-spacing:-.02em;
  background:linear-gradient(90deg,var(--accent),var(--accent2));
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
h1{font-family:var(--font-display);font-size:1.6rem;margin-bottom:6px}
.subtitle{color:var(--muted);font-size:.88rem;margin-bottom:24px;line-height:1.6;max-width:52ch}
.tools-grid{display:grid;grid-template-columns:1fr;gap:12px}
@media(min-width:640px){ .tools-grid{grid-template-columns:1fr 1fr} }
.tool-link-card{
  display:flex;gap:14px;align-items:flex-start;background:var(--card);border:1px solid var(--border);
  border-radius:14px;padding:16px;transition:border-color .18s var(--ease),transform .1s var(--ease);
}
.tool-link-card:hover{border-color:var(--border-strong);transform:translateY(-1px)}
.tool-link-icon{
  width:36px;height:36px;border-radius:10px;background:var(--card2);display:flex;align-items:center;
  justify-content:center;color:var(--accent);flex-shrink:0;
}
.tool-link-icon svg{width:18px;height:18px}
.tool-link-name{font-weight:700;font-size:.92rem;margin-bottom:3px}
.tool-link-desc{font-size:.78rem;color:var(--muted);line-height:1.5}
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
  <h1>Free Tools</h1>
  <p class="subtitle">Free, fast, no ads — 3 uses a day per tool, unlimited once your account is verified.</p>
  <div class="tools-grid">
    ${TOOLS.map((t) => `
    <a class="tool-link-card" href="${t.href}">
      <span class="tool-link-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${t.icon}</svg></span>
      <span>
        <span class="tool-link-name" style="display:block">${t.name}</span>
        <span class="tool-link-desc">${t.desc}</span>
      </span>
    </a>`).join("")}
  </div>
</div>
</body>
</html>`;
}
