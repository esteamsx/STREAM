// Shared site footer (brand, social links, page links). Used at the bottom of the profile and account pages.
const SOCIAL = [
  { label: "WhatsApp Channel", href: "https://whatsapp.com/channel/0029VatAyCwFy72JdZXFPm29",
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21l1.65-4.9A9 9 0 1 1 8.1 19.4L3 21z"/><path d="M9 8.5c0 3.6 3 6.5 6.5 6.5l1.2-1.4c.2-.3.1-.6-.2-.8l-1.5-.8c-.3-.1-.6 0-.8.2l-.5.6c-1.1-.4-2.3-1.6-2.7-2.7l.6-.5c.2-.2.3-.5.2-.8l-.8-1.5c-.2-.3-.5-.4-.8-.2L9 8.5z"/></svg>' },
  { label: "Telegram", href: "https://t.me/es_teams_bot",
    svg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 3.4 2.9 10.6c-1.3.5-1.3 1.3-.2 1.6l4.8 1.5 1.8 5.6c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.4-1.5zM9.3 13.4l8.7-5.5c.4-.3.8-.1.5.2l-7.2 6.5-.3 3-1.7-4.2z"/></svg>' },
  { label: "YouTube", href: "https://youtube.com/@esteams",
    svg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3L10 15z"/></svg>' },
  { label: "GitHub", href: "https://github.com/paskito002",
    svg: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>' },
];

// Only pages that exist on the site.
const EXPLORE = [
  ["Live TV", "/live"], ["Football", "/football"], ["Chess", "/chess"],
  ["Free Tools", "/tools"], ["Giveaway", "/giveaway"], ["Deploy a Bot", "/deploy-bot"],
];
const COMPANY = [
  ["Privacy Policy", "/privacy"], ["DMCA", "/dmca"], ["API Documentation", "/developers"],
  ["Channel Reacts", "/channel-react"], ["Promote", "/promote"],
  ["Contact Us", "https://t.me/es_teams_bot", true],
];

function linkList(items) {
  return items.map(([text, href, external]) =>
    '<a href="' + href + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + text + "</a>"
  ).join("");
}

export function renderSiteFooter() {
  const year = new Date().getFullYear();
  const social = SOCIAL.map((s) =>
    '<a class="sf-social" href="' + s.href + '" target="_blank" rel="noopener noreferrer" aria-label="' + s.label + '" title="' + s.label + '">' + s.svg + "</a>"
  ).join("");
  return `
<style>
.site-footer{position:relative;z-index:1;margin-top:40px;padding:28px 20px 110px;border-top:1px solid var(--border);color:var(--text);font-family:var(--font-body)}
.sf-inner{max-width:960px;margin:0 auto}
.sf-brand{display:flex;align-items:center;gap:12px}
.sf-logo{width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--border-strong);background:var(--card)}
.sf-name{font-size:20px;font-weight:800;letter-spacing:.2px}
.sf-desc{margin:12px 0 0;max-width:520px;font-size:14px;line-height:1.6;color:var(--muted)}
.sf-socials{display:flex;gap:10px;margin-top:16px}
.sf-social{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--card);border:1px solid var(--border);color:var(--text);transition:transform .15s,border-color .15s,color .15s}
.sf-social svg{width:19px;height:19px}
.sf-social:hover{transform:translateY(-2px);border-color:var(--accent);color:var(--accent)}
.sf-cols{display:grid;grid-template-columns:1fr 1fr;gap:26px 24px;margin-top:26px;max-width:520px}
.sf-col h4{margin:0 0 14px;font-size:13px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--muted)}
.sf-col h4::after{content:"";display:block;width:32px;height:3px;margin-top:8px;border-radius:3px;background:linear-gradient(90deg,var(--accent2),#ff8a3d)}
.sf-col a{display:block;padding:6px 0;font-size:15px;color:var(--text);text-decoration:none;opacity:.92}
.sf-col a:hover{color:var(--accent);opacity:1}
.sf-copy{margin-top:26px;padding-top:18px;border-top:1px solid var(--border);font-size:13px;line-height:1.6;color:var(--muted);text-align:center}
.sf-copy b{color:var(--text)}
</style>
<footer class="site-footer" id="siteFooter">
  <div class="sf-inner">
    <div class="sf-brand"><img class="sf-logo" src="/icon-192.png" alt="" width="44" height="44" loading="lazy"><span class="sf-name">ES TEAMS TV</span></div>
    <p class="sf-desc">Live TV, games, free tools and a growing community, all on one account. Built by ES Teams.</p>
    <div class="sf-socials">${social}</div>
    <div class="sf-cols">
      <div class="sf-col"><h4>Explore</h4>${linkList(EXPLORE)}</div>
      <div class="sf-col"><h4>Company</h4>${linkList(COMPANY)}</div>
    </div>
    <div class="sf-copy">&copy; ${year} <b>ES TEAMS TV</b> &middot; Built by ES Teams &middot; All rights reserved</div>
  </div>
</footer>
`;
}
