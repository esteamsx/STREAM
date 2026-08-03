import { siteHeadFor } from "../../config/site.js";
import { musicPlayerStyle, musicPlayerHtml, musicPlayerScript } from "../music-player.js";

const CATEGORIES = [
  {
    name: "Network & Security",
    tools: [
      { href: "/tools/dns-lookup", name: "DNS Lookup", desc: "Look up A, AAAA, MX, TXT, NS, CNAME and SOA records.", icon: `<circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M3 12h18M12 3c2.5 2.6 4 6 4 9s-1.5 6.4-4 9c-2.5-2.6-4-6-4-9s1.5-6.4 4-9z"/>` },
      { href: "/tools/ssl-checker", name: "SSL Certificate Checker", desc: "Check a domain's TLS certificate — issuer, expiry, validity.", icon: `<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>` },
      { href: "/tools/whois", name: "WHOIS Lookup", desc: "Domain registration info — owner, registrar, dates.", icon: `<circle cx="11" cy="11" r="7"/><path stroke-linecap="round" d="M21 21l-4.3-4.3"/>` },
      { href: "/tools/user-agent-parser", name: "User Agent Parser", desc: "Break down a User-Agent string into browser, OS, device.", icon: `<rect x="4" y="3" width="16" height="12" rx="2"/><path stroke-linecap="round" d="M9 21h6M12 15v6"/>` },
      { href: "/tools/subnet-calculator", name: "Subnet / CIDR Calculator", desc: "Network range, broadcast address and host count.", icon: `<circle cx="5" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path stroke-linecap="round" d="M7 12h5M12 12l5-6M12 12l5 6"/>` },
    ],
  },
  {
    name: "Developer Tools",
    tools: [
      { href: "/tools/json-formatter", name: "JSON Formatter", desc: "Format and validate JSON, pretty-printed.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M7 4a2 2 0 00-2 2v3a2 2 0 01-2 2 2 2 0 012 2v3a2 2 0 002 2M17 4a2 2 0 012 2v3a2 2 0 002 2 2 2 0 00-2 2v3a2 2 0 01-2 2"/>` },
      { href: "/tools/jwt-decode", name: "JWT Decoder", desc: "Decode a JSON Web Token's header and payload.", icon: `<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/><circle cx="12" cy="16" r="1.4"/>` },
      { href: "/tools/base64", name: "Base64 Encode / Decode", desc: "Encode text to Base64, or decode it back.", icon: `<rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M7 9h4M7 13h6M7 17h3"/>` },
      { href: "/tools/regex-tester", name: "Regex Tester", desc: "Test a regular expression and see every match.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 4v16M15 4v16M4 9h16M4 15h16"/>` },
      { href: "/tools/hash-generator", name: "Hash Generator", desc: "MD5, SHA-1, SHA-256 and SHA-512 for text or files.", icon: `<path stroke-linecap="round" d="M5 9h14M5 15h14M9 3L7 21M17 3l-2 18"/>` },
      { href: "/tools/obfuscate", name: "JavaScript Obfuscator", desc: "Obfuscate JavaScript source code instantly.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-12M6 9l-3 3 3 3M18 9l3 3-3 3"/>` },
      { href: "/tools/timestamp-converter", name: "Timestamp Converter", desc: "Unix timestamps to and from human-readable dates.", icon: `<circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 3"/>` },
      { href: "/tools/url-encoder", name: "URL Encoder / Decoder", desc: "Percent-encode or decode text for URLs.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11 5"/><path stroke-linecap="round" stroke-linejoin="round" d="M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07L13 19"/>` },
      { href: "/tools/html-entity", name: "HTML Entity Encoder / Decoder", desc: "Escape or unescape HTML special characters.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>` },
      { href: "/tools/hex-text", name: "Hex ↔ Text Converter", desc: "Convert text to hexadecimal and back.", icon: `<rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M7 9h2m2 0h2m2 0h2M7 15h10"/>` },
      { href: "/tools/binary-text", name: "Binary ↔ Text Converter", desc: "Convert text to binary and back.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 4v16M15 4v16M4 9l3 3-3 3M21 9l-3 3 3 3"/>` },
      { href: "/tools/caesar-cipher", name: "ROT13 / Caesar Cipher", desc: "Shift letters by any amount, including ROT13.", icon: `<circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v9l6 3"/>` },
      { href: "/tools/base-converter", name: "Number Base Converter", desc: "Binary, octal, decimal and hexadecimal, any base.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>` },
    ],
  },
  {
    name: "Generators",
    tools: [
      { href: "/tools/password-generator", name: "Password Generator", desc: "Strong, cryptographically random passwords.", icon: `<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>` },
      { href: "/tools/qr-code", name: "QR Code Generator", desc: "Turn any text or URL into a scannable QR code.", icon: `<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM14 20h3M20 14v3M20 20h.01"/>` },
      { href: "/tools/uuid-generator", name: "UUID Generator", desc: "Generate RFC 4122 v4 UUIDs.", icon: `<rect x="3" y="8" width="18" height="8" rx="2"/><path stroke-linecap="round" d="M7 8v8M12 8v8M17 8v8"/>` },
      { href: "/tools/random-number", name: "Random Number Generator", desc: "Cryptographically random integers within a range.", icon: `<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/>` },
      { href: "/tools/dice-roller", name: "Coin Flip / Dice Roller", desc: "Flip a coin or roll dice with any number of sides.", icon: `<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/><circle cx="12" cy="12" r="1"/>` },
      { href: "/tools/lorem-ipsum", name: "Lorem Ipsum Generator", desc: "Placeholder paragraphs for mockups and layouts.", icon: `<path d="M4 6h16M4 12h16M4 18h10"/>` },
      { href: "/tools/color-converter", name: "Color Converter", desc: "Convert between Hex, RGB and HSL.", icon: `<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 000 18 4.5 4.5 0 000-9h1a3 3 0 000-6"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="10" cy="7" r="1"/>` },
    ],
  },
  {
    name: "Text Tools",
    tools: [
      { href: "/tools/fancy-text", name: "Fancy Text Generator", desc: "30 stylish Unicode fonts — bold, script, circled and more.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M4 7V5h16v2M9 5v14m0 0h6M9 19H9"/>` },
      { href: "/tools/word-counter", name: "Word & Character Counter", desc: "Count words, characters, sentences and paragraphs.", icon: `<path d="M4 6h16M4 12h10M4 18h16"/>` },
      { href: "/tools/case-converter", name: "Case Converter", desc: "UPPER, lower, Title, camelCase, snake_case and more.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M4 20l4-14 4 14M5.5 15h5M14 20V6h4a3 3 0 010 6h-4"/>` },
      { href: "/tools/slug-generator", name: "Slug Generator", desc: "Turn any text into a clean, URL-friendly slug.", icon: `<path stroke-linecap="round" d="M6 12h12M6 8h12M6 16h8"/>` },
      { href: "/tools/dedupe-lines", name: "Duplicate Line Remover", desc: "Remove duplicate lines from a block of text.", icon: `<path d="M4 6h16M4 12h11M4 18h11"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 15l-2 2-2-2"/>` },
      { href: "/tools/sort-lines", name: "Text Sorter", desc: "Sort lines alphabetically or numerically.", icon: `<path stroke-linecap="round" d="M7 6h13M7 12h9M7 18h5"/><path stroke-linecap="round" stroke-linejoin="round" d="M3 16l1.5 2L6 16"/><path d="M4.5 6v12"/>` },
    ],
  },
  {
    name: "Fun & Misc",
    tools: [
      { href: "/tools/roman-numeral", name: "Roman Numeral Converter", desc: "Convert between numbers and Roman numerals.", icon: `<path stroke-linecap="round" d="M5 6v12M9 6v12M13 6l4 12M20 6l-4 12"/>` },
      { href: "/tools/age-calculator", name: "Age Calculator", desc: "Exact age in years, months and days from a birth date.", icon: `<rect x="3" y="5" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M3 10h18M8 3v4M16 3v4"/>` },
    ],
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
html,body{height:100%;overflow:hidden}
body{
  background:var(--dark);color:var(--text);font-family:var(--font-body);
  display:flex;flex-direction:column;
  background-image:
    radial-gradient(900px 500px at 15% -10%,rgba(0,224,255,.06),transparent 60%),
    radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.04),transparent 55%);
}
a{color:inherit;text-decoration:none}
button{font-family:inherit;cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
.wrap{width:100%;max-width:860px;margin:0 auto;display:flex;flex-direction:column;min-height:0;flex:1;position:relative}
.tools-header{flex-shrink:0;padding:24px 24px 0}
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
.subtitle{color:var(--muted);font-size:.88rem;margin-bottom:16px;line-height:1.6;max-width:52ch}
.search-wrap{position:relative;margin-bottom:18px}
.search-wrap svg{position:absolute;left:13px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--muted)}
#toolSearch{
  width:100%;background:var(--card2);border:1px solid var(--border-strong);border-radius:10px;
  padding:11px 13px 11px 38px;color:var(--text);font-family:var(--font-body);font-size:.85rem;
}
#toolSearch:focus{outline:2px solid var(--accent);outline-offset:-1px}
.tools-scroll{flex:1;min-height:0;overflow-y:auto;padding:0 24px 32px}
.tool-category{margin-bottom:22px}
.tool-category-title{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:10px}
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
.no-results{color:var(--muted);font-size:.85rem;padding:20px 0;text-align:center;display:none}
.scroll-top-btn{
  position:absolute;right:20px;bottom:76px;width:42px;height:42px;border-radius:50%;
  background:linear-gradient(90deg,var(--accent),var(--accent2));color:#04121a;border:none;
  display:none;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(0,0,0,.35);
  transition:opacity .2s var(--ease),transform .15s var(--ease);z-index:20;
}
.scroll-top-btn.show{display:flex}
.scroll-top-btn:hover{transform:translateY(-2px)}
.scroll-top-btn:active{transform:scale(.94)}
.scroll-top-btn svg{width:20px;height:20px}
${musicPlayerStyle()}
</style>
</head>
<body>
<div class="wrap">
  <div class="tools-header">
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
    <div class="search-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input type="text" id="toolSearch" placeholder="Search tools…" autocomplete="off" spellcheck="false">
    </div>
  </div>
  <div class="tools-scroll" id="toolsScroll">
    <div id="toolsContainer">
      ${CATEGORIES.map((cat) => `
      <div class="tool-category" data-category>
        <div class="tool-category-title">${cat.name}</div>
        <div class="tools-grid">
          ${cat.tools.map((t) => `
          <a class="tool-link-card" href="${t.href}" data-name="${t.name.toLowerCase()}" data-desc="${t.desc.toLowerCase()}">
            <span class="tool-link-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${t.icon}</svg></span>
            <span>
              <span class="tool-link-name" style="display:block">${t.name}</span>
              <span class="tool-link-desc">${t.desc}</span>
            </span>
          </a>`).join("")}
        </div>
      </div>`).join("")}
    </div>
    <div class="no-results" id="noResults">No tools match your search.</div>
  </div>
  <button class="scroll-top-btn" id="scrollTopBtn" type="button" aria-label="Scroll to top">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19V5M5 12l7-7 7 7"/></svg>
  </button>
</div>
${musicPlayerHtml()}
<script>
(function(){
  var searchInput = document.getElementById('toolSearch');
  var categories = Array.prototype.slice.call(document.querySelectorAll('[data-category]'));
  var noResults = document.getElementById('noResults');
  searchInput.addEventListener('input', function(){
    var q = searchInput.value.trim().toLowerCase();
    var anyVisible = false;
    categories.forEach(function(cat){
      var cards = Array.prototype.slice.call(cat.querySelectorAll('.tool-link-card'));
      var catHasMatch = false;
      cards.forEach(function(card){
        var match = !q || card.dataset.name.indexOf(q) !== -1 || card.dataset.desc.indexOf(q) !== -1;
        card.style.display = match ? '' : 'none';
        if (match) catHasMatch = true;
      });
      cat.style.display = catHasMatch ? '' : 'none';
      if (catHasMatch) anyVisible = true;
    });
    noResults.style.display = anyVisible ? 'none' : 'block';
  });

  var scrollEl = document.getElementById('toolsScroll');
  var scrollTopBtn = document.getElementById('scrollTopBtn');
  scrollEl.addEventListener('scroll', function(){
    scrollTopBtn.classList.toggle('show', scrollEl.scrollTop > 200);
  });
  scrollTopBtn.addEventListener('click', function(){
    scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
${musicPlayerScript()}
</script>
</body>
</html>`;
}
