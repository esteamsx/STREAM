import { siteHeadFor } from "../config/site.js";

export function renderProfile(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script>document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("profile")}
<script>(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<title>Profile — ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
${cfg.protectionCSS || ""}
:root{
  --red:#FF3B5C;--accent:#00E0FF;--accent2:#7c5cff;
  --dark:#0A0A0F;--dark3:#13131C;--card:#15151F;--card2:#1B1B27;
  --border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);
  --text:#F3F3FA;--muted:rgba(255,255,255,.42);--muted2:rgba(255,255,255,.22);
  --nav-bg:rgba(10,10,15,.98);
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
  --nav-bg:rgba(255,255,255,.92);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%}
body{
  background:var(--dark);color:var(--text);font-family:var(--font-body);min-height:100%;
  background-image:
    radial-gradient(900px 500px at 15% -10%,rgba(0,224,255,.06),transparent 60%),
    radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.04),transparent 55%);
}
button{font-family:inherit;cursor:pointer}
input{font-family:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}

.pf-nav{
  position:sticky;top:0;z-index:10;height:58px;display:flex;align-items:center;gap:14px;padding:0 18px;
  background:var(--nav-bg);border-bottom:1px solid var(--border);backdrop-filter:blur(20px);
}
.pf-back{display:flex;align-items:center;gap:6px;color:var(--muted);text-decoration:none;font-size:.85rem;font-weight:600;background:transparent;border:none;cursor:pointer;font-family:inherit;padding:0}
.pf-back:hover{color:var(--accent)}
.pf-back svg{width:18px;height:18px}
.pf-nav-title{font-family:var(--font-display);font-weight:700;font-size:.95rem}
.pf-view-as-btn{
  margin-left:auto;background:transparent;border:none;color:var(--muted);width:36px;height:36px;
  border-radius:8px;display:flex;align-items:center;justify-content:center;transition:all .2s var(--ease);
}
.pf-view-as-btn:hover{color:var(--accent);background:rgba(0,224,255,.1)}
.pf-view-as-btn svg{width:19px;height:19px}
.viewas-badge{
  position:absolute;top:14px;left:14px;font-size:.62rem;font-weight:700;letter-spacing:.05em;
  color:var(--accent);background:rgba(0,224,255,.12);padding:3px 9px;border-radius:20px;
}

.pf-wrap{max-width:520px;margin:0 auto;padding:28px 18px 60px}
.pf-hero{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;margin-bottom:22px}

.pf-avatar-wrap{position:relative;width:88px;height:88px}
.pf-avatar-wrap.editable{cursor:pointer}
.pf-avatar-wrap::after{
  content:'';position:absolute;inset:-4px;border-radius:50%;border:3px solid transparent;
  border-top-color:var(--accent);opacity:0;animation:pfSpin .8s linear infinite;
}
.pf-avatar-wrap.uploading::after{opacity:1}
.pf-avatar-wrap.uploading .pf-avatar{opacity:.5}
@keyframes pfSpin{to{transform:rotate(360deg)}}
.pf-avatar{
  width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));
  display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;
  font-size:1.9rem;color:#04141a;background-size:cover;background-position:center;transition:opacity .2s var(--ease);
}
.pf-avatar-check{
  position:absolute;inset:0;border-radius:50%;background:rgba(10,10,15,.6);
  display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(.7);
  transition:opacity .25s var(--ease),transform .25s var(--ease);pointer-events:none;
}
.pf-avatar-wrap.uploaded .pf-avatar-check{opacity:1;transform:scale(1)}
.pf-avatar-check svg{width:34px;height:34px;color:#3DDC84}
.pf-avatar-edit-badge{
  position:absolute;bottom:-1px;right:-1px;width:26px;height:26px;border-radius:50%;
  background:var(--accent);display:flex;align-items:center;justify-content:center;
  border:2px solid var(--dark);color:#04141a;
}
.pf-avatar-edit-badge svg{width:13px;height:13px}

.pf-loader{
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
  min-height:70vh;
}
.pf-loader-ring{
  width:34px;height:34px;border:3px solid var(--border-strong);border-top-color:var(--accent);
  border-radius:50%;animation:pfSpin .7s linear infinite;
}
.pf-loader-text{color:var(--muted);font-size:.82rem}
@keyframes pfSpin{to{transform:rotate(360deg)}}

.pf-name{font-family:var(--font-display);font-weight:700;font-size:1.2rem}
.pf-username-row{display:flex;align-items:center;justify-content:center;gap:2px}
.pf-username{font-size:.85rem;color:var(--muted)}
.pf-alt-toggle{width:20px;height:20px;border:none;background:transparent;color:var(--muted);display:none;align-items:center;justify-content:center;padding:0;flex-shrink:0}
.pf-alt-toggle svg{width:14px;height:14px;transition:transform .25s var(--ease)}
.pf-alt-toggle.open svg{transform:rotate(180deg)}
.pf-alt-list{display:none;flex-wrap:wrap;gap:6px;justify-content:center;margin:8px auto 0;max-width:280px}
.pf-alt-list.open{display:flex}
.pf-alt-pill{background:var(--dark3);border:1px solid var(--border-strong);color:var(--muted);font-size:.78rem;font-weight:600;padding:5px 12px;border-radius:20px}
.pf-bio{font-size:.85rem;color:var(--text);margin-top:8px;line-height:1.5;max-width:320px;white-space:pre-wrap}
.pf-bio-textarea{
  width:100%;max-width:320px;resize:vertical;background:var(--dark3);border:1px solid var(--border-strong);
  border-radius:10px;padding:9px 10px;color:var(--text);font-family:inherit;font-size:.85rem;min-height:70px;
}
.pf-bio-row{display:flex;align-items:center;justify-content:space-between;max-width:320px;margin-top:6px;gap:10px}
.pf-bio-count{font-size:.68rem;color:var(--muted)}
.pf-bio-save{
  background:var(--accent);color:#00161c;font-weight:700;font-size:.76rem;
  padding:7px 14px;border-radius:8px;border:none;flex-shrink:0;
}
.pf-bio-save:disabled{opacity:.4;cursor:not-allowed}
.pf-status{font-size:.76rem;color:var(--muted);margin-top:6px;display:flex;align-items:center;gap:6px}
.pf-status.active{color:var(--accent)}
.pf-status-dot{width:7px;height:7px;border-radius:50%;background:var(--accent)}

.tfa-card{
  background:var(--card);border:1px solid var(--border);border-radius:16px;margin-bottom:18px;overflow:hidden;
}
.tfa-header{
  display:flex;align-items:center;gap:10px;padding:16px 18px;cursor:pointer;user-select:none;
}
.tfa-header svg.tfa-icon{width:18px;height:18px;color:var(--accent);flex-shrink:0}
.tfa-header-title{font-family:var(--font-display);font-weight:700;font-size:.9rem;flex:1}
.tfa-chevron{width:16px;height:16px;color:var(--muted);transition:transform .25s var(--ease);flex-shrink:0}
.tfa-card.open .tfa-chevron{transform:rotate(180deg)}
.tfa-body{max-height:0;overflow:hidden;transition:max-height .3s var(--ease)}
.tfa-card.open .tfa-body{max-height:500px}
.tfa-body-inner{padding:0 18px 18px}

.pf-locked-card{
  background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px 20px;
  text-align:center;color:var(--muted);font-size:.85rem;margin-top:14px;
}
.pf-locked-card svg{width:26px;height:26px;color:var(--muted);margin-bottom:10px}
.pf-locked-card b{color:var(--text)}

.pf-stats{
  display:flex;background:var(--card);border:1px solid var(--border);border-radius:16px;
  margin-bottom:18px;overflow:hidden;
}
.pf-stat{
  flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:16px 8px;
  background:transparent;border:none;color:inherit;font-family:inherit;
}
.pf-stat.tappable{cursor:pointer;transition:background .2s var(--ease)}
.pf-stat.tappable:hover{background:rgba(0,224,255,.06)}
.pf-stat + .pf-stat{border-left:1px solid var(--border)}
.pf-stat-num{font-family:var(--font-display);font-weight:700;font-size:1.15rem}
.pf-stat-label{font-size:.7rem;color:var(--muted);font-weight:600;letter-spacing:.02em;text-transform:uppercase}

.acc-card{
  background:var(--card);border:1px solid var(--border);border-radius:16px;padding:22px 20px;margin-bottom:18px;
}
.acc-card-title{font-family:var(--font-display);font-weight:700;font-size:.95rem;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.acc-card-title svg{width:17px;height:17px;color:var(--accent)}
.acc-card-title .pf-lock{margin-left:auto;width:14px;height:14px;color:var(--muted)}
.field{display:flex;flex-direction:column;gap:6px}
.field label{font-size:.72rem;font-weight:600;color:var(--muted);letter-spacing:.02em}
.field-row{display:flex;gap:10px}
.field + .field{margin-top:14px}
.field-row .field{flex:1;margin-top:0}
.field input{
  width:100%;background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;
  padding:11px 13px;color:var(--text);font-size:.9rem;
}
.pf-info-card input{background:rgba(0,0,0,.28);color:var(--muted);cursor:not-allowed}
:root[data-theme="light"] .pf-info-card input{background:rgba(0,0,0,.06)}
.acc-inline-link{
  display:inline-block;background:transparent;border:none;color:var(--muted);font-size:.72rem;font-weight:600;
  text-decoration:underline;margin-top:6px;cursor:pointer;padding:0;
}
.acc-inline-link:hover{color:var(--accent)}

.pf-card{
  background:var(--card);border:1px solid var(--border);border-radius:16px;padding:26px 20px;
  text-align:center;color:var(--muted);font-size:.85rem;line-height:1.6;
}
.pf-card svg{width:30px;height:30px;color:var(--accent);margin-bottom:10px}

.pf-verified{display:inline-flex;vertical-align:middle;margin-left:5px;position:relative;top:-1px}
.pf-edit-hint{font-size:.82rem;color:var(--muted);text-align:center;margin:-6px 0 18px}
.pf-edit-link{color:var(--accent);font-weight:700;text-decoration:underline;cursor:pointer}
.pf-follow-btn{
  display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:12px;
  border-radius:12px;border:none;font-weight:700;font-size:.88rem;margin-bottom:18px;
  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;
}
.pf-follow-btn.following{background:transparent;border:1px solid var(--border-strong);color:var(--text)}
.pf-follow-btn:disabled{opacity:.6}

/* ── People overlay: Followers / Following list with search (ported from Account Settings) ── */
.page-overlay{
  position:fixed;inset:0;background:rgba(10,10,15,.75);backdrop-filter:blur(8px);
  display:none;align-items:center;justify-content:center;z-index:100;padding:24px;
}
.page-overlay.show{display:flex}
body:has(.page-overlay.show){overflow:hidden}
/* postOptionsOverlay (comment long-press menu / post 3-dot menu) can be opened while
   commentsOverlay is already open — both share .page-overlay's z-index:100, and since
   commentsOverlay comes later in the DOM it was painting on top, hiding this menu until
   commentsOverlay closed. Force these above any other .page-overlay. */
#postOptionsOverlay, #postVisibilityOverlay, #postDeleteOverlay, #postSettingsOverlay{ z-index:150; }
/* followingFeedOverlay (the floating-button "POSTS" panel) is declared
   later in the DOM than commentsOverlay, so opening comments on a post
   from inside that feed was rendering the comments overlay BEHIND the
   still-open feed overlay — same shape of bug as above, tapping "comment"
   appeared to do nothing because it opened out of sight. */
#commentsOverlay{ z-index:120; }
.flist-card{
  width:100%;max-width:400px;max-height:78vh;background:var(--card);border:1px solid var(--border-strong);
  border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.5);display:flex;flex-direction:column;overflow:hidden;
}
.flist-header{display:flex;align-items:center;justify-content:space-between;padding:18px 18px 0}
.flist-title{font-family:var(--font-display);font-weight:700;font-size:1.02rem}
.flist-close{
  background:transparent;border:none;color:var(--muted);width:32px;height:32px;border-radius:8px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s var(--ease);
}
.flist-close:hover{color:var(--accent);background:rgba(0,224,255,.1)}
.flist-close svg{width:18px;height:18px}
.flist-search-wrap{padding:14px 18px}
.flist-search{
  width:100%;background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;
  padding:10px 12px;color:var(--text);font-size:.86rem;
}
.flist-search:focus{border-color:var(--accent)}
.flist-list{overflow-y:auto;padding:0 10px 14px;flex:1}
.flist-row{display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:10px;cursor:pointer}
.flist-avatar{
  width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));
  display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;
  font-size:.9rem;color:#04141a;flex-shrink:0;background-size:cover;background-position:center;
}
.flist-info{flex:1;min-width:0}
.flist-name{font-size:.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.flist-username{font-size:.74rem;color:var(--muted)}
.flist-empty{padding:30px 10px;text-align:center;color:var(--muted);font-size:.84rem}

.mpv-card{
  width:100%;max-width:340px;background:var(--card);border:1px solid var(--border-strong);
  border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.5);padding:26px 22px;text-align:center;
}
.mpv-avatar{
  width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));
  display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;
  font-size:1.7rem;color:#04141a;margin:0 auto 12px;background-size:cover;background-position:center;
}
.mpv-name{font-family:var(--font-display);font-weight:700;font-size:1.05rem}
.mpv-username{font-size:.82rem;color:var(--muted);margin-top:2px;margin-bottom:16px}
.mpv-stats{display:flex;justify-content:center;gap:22px;margin-bottom:20px}
.mpv-stat{display:flex;flex-direction:column;align-items:center;gap:2px}
.mpv-stat-num{font-family:var(--font-display);font-weight:700;font-size:1rem}
.mpv-stat-label{font-size:.66rem;color:var(--muted);text-transform:uppercase;letter-spacing:.02em}
.mpv-view-btn{
  width:100%;padding:11px;border-radius:10px;border:none;font-weight:700;font-size:.85rem;
  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;margin-bottom:8px;
}
.mpv-close-text{background:transparent;border:none;color:var(--muted);font-size:.8rem;text-decoration:underline}

.pf-toast{
  position:fixed;left:50%;bottom:28px;transform:translate(-50%,12px);opacity:0;z-index:400;
  background:var(--card2);border:1px solid var(--border-strong);border-radius:12px;padding:11px 16px;
  font-size:.82rem;color:var(--text);box-shadow:0 12px 32px rgba(0,0,0,.5);transition:all .3s var(--ease);
  max-width:88vw;text-align:center;
}
.pf-toast.show{transform:translate(-50%,0);opacity:1}

@keyframes flashHighlight{
  0%,100%{background:transparent;box-shadow:none}
  50%{background:rgba(0,224,255,.14);box-shadow:0 0 0 1px rgba(0,224,255,.4)}
}
.flash-highlight{border-radius:14px;animation:flashHighlight .55s ease-in-out 3}

.pf-composer{margin-bottom:16px}
.pf-composer-row{display:flex;align-items:center;gap:8px}
.tag-highlight-wrap{position:relative;flex:1;min-width:0}
.tag-highlight-backdrop{
  position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;overflow:hidden;
  box-sizing:border-box;word-wrap:break-word;
}
/* These highlight spans must never change a glyph's width — the backdrop is
   overlaid pixel-for-pixel on the real input text, so any font-weight or
   font-style change here shifts every following character out of alignment
   with the caret and selection underneath. Colour-only styling keeps the
   metrics identical while still making the markup visible as you type. */
.tag-highlight-backdrop mark{background:transparent;color:var(--accent)}
.tag-highlight-backdrop .md-bold{color:var(--text)}
.tag-highlight-backdrop .md-italic{color:var(--text);opacity:.92}
.pf-composer-input{
  flex:1;background:var(--dark3);border:1px solid var(--border-strong);border-radius:22px;
  padding:11px 16px;color:var(--text);font-size:.88rem;
}
.pf-composer-icon-btn{
  flex-shrink:0;width:38px;height:38px;border-radius:50%;background:var(--dark3);border:1px solid var(--border-strong);
  color:var(--muted);display:flex;align-items:center;justify-content:center;transition:all .2s var(--ease);
}
.pf-composer-icon-btn:hover{color:var(--accent);border-color:var(--accent)}
.pf-composer-icon-btn svg{width:17px;height:17px}
.pf-composer-send-btn{
  flex-shrink:0;width:38px;height:38px;border-radius:50%;border:none;
  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;
  display:flex;align-items:center;justify-content:center;transition:opacity .2s var(--ease);
}
.pf-composer-send-btn svg{width:16px;height:16px;transform:translateX(-1px)}
.pf-composer-send-btn:disabled{opacity:.4;cursor:default}


.pf-post{padding:16px 0;border-top:1px solid var(--border)}
.pf-post:first-child{border-top:none;padding-top:0}
.pf-post-text{font-size:.88rem;color:var(--text);line-height:1.5;white-space:pre-wrap}
.pf-post-text a{color:var(--accent);text-decoration:none;font-weight:600}
.pf-post-image{width:100%;max-height:340px;object-fit:cover;border-radius:12px;margin-top:8px;display:block}
.pf-post-footer{display:flex;align-items:center;gap:6px;margin-top:10px}
.pf-post-heart{background:transparent;border:none;color:var(--muted);display:flex;align-items:center;padding:2px}
.pf-post-heart svg{width:21px;height:21px;transition:transform .15s var(--ease)}
.pf-post-heart:active svg{transform:scale(1.2)}
.pf-post-heart.liked{color:#FF3B5C}
.pf-post-heart.liked svg{fill:#FF3B5C}
.pf-post-like-count{font-size:.78rem;color:var(--muted);font-weight:600;margin-right:14px}
.pf-post-comment-btn{background:transparent;border:none;color:var(--muted);display:flex;align-items:center;padding:2px}
.pf-post-comment-btn svg{width:20px;height:20px}
.pf-post-comment-count{font-size:.78rem;color:var(--muted);font-weight:600;margin-right:14px}
.pf-post-reshare-btn{background:transparent;border:none;color:var(--muted);display:flex;align-items:center;padding:2px}
.pf-post-reshare-btn svg{width:19px;height:19px}
.pf-post-reshare-btn.reshared{color:var(--accent)}
.pf-post-reshare-count{font-size:.78rem;color:var(--muted);font-weight:600}
.pf-post-comment-btn.disabled,
.pf-post-reshare-btn.disabled{opacity:.32;cursor:not-allowed}
.pf-post-time{font-size:.7rem;color:var(--muted);margin-top:6px}
.pf-post-empty{color:var(--muted);font-size:.83rem;text-align:center;padding:14px 0}

.comments-overlay{align-items:flex-end}
.comments-card{
  width:100%;max-width:480px;height:82vh;background:var(--card);border:1px solid var(--border-strong);
  border-radius:20px 20px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,.5);display:flex;flex-direction:column;overflow:hidden;
}
.comments-header{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border);flex-shrink:0}
.comments-title{font-family:var(--font-display);font-weight:700;font-size:.95rem}
.comments-list{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:6px 16px;-webkit-overflow-scrolling:touch}
.comment-reply-preview{
  display:flex;align-items:center;gap:8px;padding:8px 16px;background:var(--dark3);
  border-top:1px solid var(--border);
}
.comment-reply-preview-bar{width:3px;align-self:stretch;border-radius:2px;background:var(--accent);flex-shrink:0}
.comment-reply-preview-body{flex:1;min-width:0}
.comment-reply-preview-name{font-size:.76rem;font-weight:700;color:var(--accent)}
.comment-reply-preview-text{font-size:.78rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.comment-reply-preview-close{background:transparent;border:none;color:var(--muted);width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.comment-reply-preview-close svg{width:15px;height:15px}
.comment-quote{
  display:flex;flex-direction:column;gap:1px;border-left:3px solid var(--accent);
  padding:4px 8px;margin-bottom:4px;background:rgba(0,224,255,.06);border-radius:4px;max-width:100%;
}
.comment-quote-name{font-size:.7rem;font-weight:700;color:var(--accent)}
.comment-quote-text{font-size:.72rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px}
.comment-row{display:flex;gap:10px;padding:12px 0;border-bottom:1px solid var(--border);position:relative;touch-action:pan-y;transition:transform .18s var(--ease)}
.comment-row:last-child{border-bottom:none}
.comment-row.own{flex-direction:row-reverse;text-align:right}
.comment-row.own .comment-name-row{justify-content:flex-end}
.comment-row.own .comment-meta{justify-content:flex-end}
.comment-row.own .comment-text{
  background:linear-gradient(135deg,rgba(0,224,255,.14),rgba(124,92,255,.14));
  border-radius:14px 14px 2px 14px;padding:7px 12px;display:inline-block;text-align:left;
}
.comment-row:not(.own) .comment-text{
  background:var(--dark3);border-radius:14px 14px 14px 2px;padding:7px 12px;display:inline-block;
}
.comment-row .comment-body{display:flex;flex-direction:column}
.comment-row.own .comment-body{align-items:flex-end}
.comment-reply-hint{
  position:absolute;left:0;top:0;bottom:0;display:flex;align-items:center;gap:6px;
  color:var(--accent);font-size:.72rem;font-weight:700;opacity:0;transition:opacity .15s var(--ease);
  pointer-events:none;
}
.comment-reply-hint svg{width:16px;height:16px}
.comment-row.own .comment-reply-hint{left:auto;right:0}
.comment-avatar{
  width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));
  display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;color:#04141a;
  flex-shrink:0;background-size:cover;background-position:center;
}
.comment-body{flex:1;min-width:0}
.comment-name-row{display:flex;align-items:center;gap:6px}
.comment-name{font-size:.82rem;font-weight:700}
.comment-pin-badge{display:inline-flex;align-items:center;gap:3px;font-size:.66rem;color:var(--accent);font-weight:700}
.comment-pin-badge svg{width:11px;height:11px}
.comment-text{font-size:.85rem;color:var(--text);line-height:1.45;margin-top:2px;white-space:pre-wrap}
.comment-meta{display:flex;align-items:center;gap:14px;margin-top:6px}
.comment-time{font-size:.68rem;color:var(--muted)}
.comment-like-btn{background:transparent;border:none;color:var(--muted);display:flex;align-items:center;gap:5px;font-size:.7rem;font-weight:600}
.comment-like-btn svg{width:15px;height:15px}
.comment-like-btn.liked{color:#FF3B5C}
.comment-like-btn.liked svg{fill:#FF3B5C}
.comment-row.is-hidden .comment-text{opacity:.35}
.comment-row.is-hidden .comment-avatar{opacity:.4}
.comment-hidden-warning{color:var(--red);font-size:.76rem;font-weight:600;margin-top:2px;opacity:.75}
.comment-hidden-owner-tag{font-size:.66rem;color:var(--muted);font-style:italic;margin-top:2px}
.comments-empty{color:var(--muted);font-size:.83rem;text-align:center;padding:30px 0}
.comments-composer{
  display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--border);flex-shrink:0;
  background:var(--card);
}

.pf-mini-spinner{
  display:inline-block;width:13px;height:13px;border:2px solid rgba(4,20,26,.3);border-top-color:#04141a;
  border-radius:50%;animation:pfSpin .6s linear infinite;vertical-align:middle;
}
@keyframes spin{to{transform:rotate(360deg)}}
.btn-spinner{width:14px;height:14px;border:2px solid rgba(4,20,26,.35);border-top-color:#04141a;border-radius:50%;display:inline-block;vertical-align:-2px;margin-right:7px;animation:spin .6s linear infinite}
.btn-spinner-light{width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;display:inline-block;vertical-align:-2px;margin-right:7px;animation:spin .6s linear infinite}
.pf-posts-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:26px 0}
.pf-posts-loading .pf-loader-ring{width:26px;height:26px}

/* ── Following feed: floating icon + "POSTS" overlay ── */
.pf-feed-fab{
  position:fixed;right:20px;bottom:20px;z-index:90;width:52px;height:52px;border-radius:50%;
  background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;color:#04141a;
  display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,.4);
  cursor:pointer;transition:transform .15s var(--ease);
}
.pf-feed-fab:active{transform:scale(.94)}
.pf-feed-fab svg{width:23px;height:23px}
.pf-feed-fab-badge{
  position:absolute;top:-3px;right:-3px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;
  background:var(--red);color:#fff;font-size:.68rem;font-weight:700;display:none;align-items:center;justify-content:center;
  border:2px solid var(--dark);box-sizing:border-box;
}
.pf-feed-fab-badge.show{display:flex}

.feed-post{display:flex;gap:10px;padding:14px 0;border-top:1px solid var(--border)}
.feed-post:first-child{border-top:none;padding-top:0}
.feed-post-avatar{
  width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));
  display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;
  font-size:.82rem;color:#04141a;flex-shrink:0;background-size:cover;background-position:center;cursor:pointer;
}
.feed-post-body{flex:1;min-width:0}
.feed-post-name{font-size:.83rem;font-weight:600;cursor:pointer;display:inline}
.feed-post-time{font-size:.7rem;color:var(--muted);margin-top:1px}
.feed-post-text{font-size:.85rem;color:var(--text);line-height:1.45;white-space:pre-wrap;margin-top:4px}
.feed-post-image{width:100%;max-height:260px;object-fit:cover;border-radius:10px;margin-top:8px;display:block}
.feed-post-footer{display:flex;align-items:center;gap:6px;margin-top:8px}
.feed-empty{color:var(--muted);font-size:.83rem;text-align:center;padding:30px 0}

.post-link{color:var(--accent);text-decoration:underline;text-underline-offset:2px}
.tag-highlight-backdrop .link-span{color:var(--accent);text-decoration:underline;text-underline-offset:2px}
.insert-link-btn{
  /* Below the field, not above it: the browser's own Cut/Copy/Paste callout
     renders directly above a selection on mobile, which was covering this
     button completely. Sitting underneath keeps both usable at once. */
  position:absolute;bottom:-40px;right:0;z-index:5;padding:6px 12px;border-radius:8px;
  background:var(--accent);color:#04141a;font-size:.74rem;font-weight:700;border:none;
  box-shadow:0 6px 16px rgba(0,0,0,.35);display:none;align-items:center;gap:5px;
}
.insert-link-btn.show{display:flex}
.insert-link-btn svg{width:13px;height:13px}

.pf-post-more-btn{position:absolute;top:0;right:0;background:transparent;border:none;color:var(--muted);width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center}
.pf-post-more-btn:hover{color:var(--accent);background:rgba(0,224,255,.1)}
.pf-post-more-btn svg{width:18px;height:18px}
.pf-post-reshare-label{display:flex;align-items:center;gap:6px;font-size:.76rem;color:var(--accent);font-weight:700;margin-bottom:8px;cursor:pointer}
.pf-post-reshare-label svg{width:14px;height:14px}
.pf-post-edited{font-size:.68rem;color:var(--muted)}
.post-opt-btn{
  display:flex;align-items:center;gap:12px;width:100%;padding:12px 10px;background:transparent;border:none;
  color:var(--text);font-size:.86rem;font-weight:600;border-radius:10px;text-align:left;
}
.post-opt-btn:hover{background:var(--card2)}
.post-opt-btn.disabled{opacity:.4;cursor:default;pointer-events:none}
.post-opt-btn.danger{color:var(--red)}
.post-opt-btn svg{width:18px;height:18px;flex-shrink:0}
.post-opt-sub{font-size:.7rem;color:var(--muted);margin-left:auto;font-weight:600}

/* ── toggle switch, ported from Account Settings for the post Settings overlay ── */
.tfa-toggle-row{display:flex;align-items:center;justify-content:space-between}
.tfa-toggle-label{font-size:.85rem;color:var(--text);font-weight:600}
.tfa-toggle-sub{font-size:.72rem;color:var(--muted);margin-top:2px}
.tfa-switch{
  position:relative;width:46px;height:26px;border-radius:20px;background:var(--dark3);
  border:1px solid var(--border-strong);cursor:pointer;flex-shrink:0;transition:background .2s var(--ease);
}
.tfa-switch.on{background:linear-gradient(90deg,var(--accent),var(--accent2));border-color:transparent}
.tfa-switch-dot{
  position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:#fff;
  transition:transform .2s var(--ease);box-shadow:0 1px 3px rgba(0,0,0,.3);
}
.tfa-switch.on .tfa-switch-dot{transform:translateX(20px)}
.acc-msg{font-size:.78rem;padding:9px 12px;border-radius:8px;margin-top:12px;display:none}
.acc-msg.show{display:block}
.acc-msg.ok{background:rgba(0,224,255,.1);border:1px solid rgba(0,224,255,.3);color:var(--accent)}
.acc-msg.err{background:rgba(255,59,92,.1);border:1px solid rgba(255,59,92,.3);color:var(--red)}
</style>
</head>
<body>

<div class="pf-nav">
  <button type="button" class="pf-back" id="pfBackBtn">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
    Back
  </button>
  <div class="pf-nav-title">Profile</div>
  <button type="button" class="pf-view-as-btn" id="pfViewAsBtn" aria-label="View as others see your profile" style="display:none">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
  </button>
</div>

<div class="pf-loader" id="pfLoader">
  <div class="pf-loader-ring"></div>
  <div class="pf-loader-text">Loading profile…</div>
</div>

<div class="pf-wrap" id="pfWrap" style="display:none">
  <div class="pf-hero">
    <div class="pf-avatar-wrap" id="pfAvatarWrap">
      <div class="pf-avatar" id="pfAvatar">–</div>
      <div class="pf-avatar-check">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>
      </div>
    </div>
    <div class="pf-name" id="pfName">–</div>
    <div class="pf-username-row">
      <div class="pf-username" id="pfUsername">–</div>
      <button type="button" class="pf-alt-toggle" id="pfAltToggle" aria-label="Show other usernames">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
      </button>
    </div>
    <div class="pf-alt-list" id="pfAltList"></div>
    <div class="pf-bio" id="pfBio" style="display:none"></div>
    <div class="pf-status" id="pfStatus" style="display:none"></div>
  </div>

  <div id="pfActionSlot"></div>

  <div class="pf-stats">
    <button type="button" class="pf-stat" id="pfFollowingBtn">
      <div class="pf-stat-num" id="pfFollowing">0</div>
      <div class="pf-stat-label">Following</div>
    </button>
    <button type="button" class="pf-stat" id="pfFollowersBtn">
      <div class="pf-stat-num" id="pfFollowers">0</div>
      <div class="pf-stat-label">Followers</div>
    </button>
    <button type="button" class="pf-stat" id="pfLikesBtn">
      <div class="pf-stat-num" id="pfLikes">0</div>
      <div class="pf-stat-label">Likes</div>
    </button>
  </div>

  <div id="pfInfoSlot"></div>

  <div id="pfBioSlot"></div>

  <div class="acc-card" id="postsCard" style="display:none">
    <div class="acc-card-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15l5-5 4 4 5-6 4 4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Posts
    </div>
    <div id="postComposerSlot"></div>
    <div id="postsList"></div>
  </div>
</div>

<input type="file" id="pfAvatarInput" accept="image/*" style="display:none">
<input type="file" id="pfPostImageInput" accept="image/*" style="display:none">

<div class="page-overlay" id="postComposeOverlay">
  <div class="flist-card" style="max-width:380px">
    <div class="flist-header">
      <div class="flist-title">New Post</div>
      <button type="button" class="flist-close" id="postComposeCloseBtn" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div style="padding:0 18px 18px">
      <img id="postComposeImage" style="width:100%;max-height:280px;object-fit:cover;border-radius:12px;margin-bottom:12px">
      <textarea id="postComposeCaption" class="pf-bio-textarea" rows="3" maxlength="2000" placeholder="Write a caption... use @ to tag someone"></textarea>
      <button type="button" class="pf-follow-btn" id="postComposeSubmitBtn" style="margin-top:12px;margin-bottom:0">Post</button>
    </div>
  </div>
</div>

<div class="page-overlay" id="postOptionsOverlay">
  <div class="flist-card" style="max-width:320px">
    <div class="flist-header">
      <div class="flist-title">Post Options</div>
      <button type="button" class="flist-close" id="postOptionsCloseBtn" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div style="padding:4px 10px 16px" id="postOptionsBody"></div>
  </div>
</div>

<div class="page-overlay" id="postSettingsOverlay">
  <div class="flist-card" style="max-width:340px">
    <div class="flist-header">
      <div class="flist-title">Post Settings</div>
      <button type="button" class="flist-close" id="postSettingsCloseBtn" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div style="padding:4px 18px 18px" id="postSettingsBody"></div>
    <div class="acc-msg" id="postSettingsMsg" style="margin:0 18px 16px"></div>
  </div>
</div>

<div class="page-overlay" id="postVisibilityOverlay">
  <div class="flist-card" style="max-width:300px">
    <div class="flist-header">
      <div class="flist-title">Who Can View</div>
      <button type="button" class="flist-close" id="postVisCloseBtn" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div style="padding:4px 10px 16px" id="postVisBody"></div>
  </div>
</div>

<div class="page-overlay" id="postDeleteOverlay">
  <div class="flist-card" style="max-width:300px;padding:26px 22px;text-align:center">
    <div style="font-weight:700;font-family:var(--font-display);margin-bottom:8px">Delete Post?</div>
    <div style="color:var(--muted);font-size:.85rem;margin-bottom:20px">Are you sure you want to delete this post?</div>
    <button type="button" class="pf-follow-btn" id="postDeleteConfirmBtn" style="background:var(--red);margin-bottom:10px">Delete</button>
    <button type="button" class="mpv-close-text" id="postDeleteCancelBtn">Cancel</button>
  </div>
</div>

<div class="page-overlay comments-overlay" id="commentsOverlay">
  <div class="comments-card">
    <div class="comments-header">
      <div class="comments-title">Comments</div>
      <button type="button" class="flist-close" id="commentsCloseBtn" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="comments-list" id="commentsList"></div>
    <div class="comment-reply-preview" id="commentReplyPreview" style="display:none">
      <div class="comment-reply-preview-bar"></div>
      <div class="comment-reply-preview-body">
        <div class="comment-reply-preview-name" id="commentReplyPreviewName"></div>
        <div class="comment-reply-preview-text" id="commentReplyPreviewText"></div>
      </div>
      <button type="button" class="comment-reply-preview-close" id="commentReplyPreviewClose" aria-label="Cancel reply">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="comments-composer">
      <input type="text" id="commentInput" class="pf-composer-input" maxlength="500" placeholder="Add a comment...">
      <button type="button" class="pf-composer-send-btn" id="commentSendBtn" aria-label="Send" disabled></button>
    </div>
  </div>
</div>

<div class="page-overlay" id="tagSearchOverlay">
  <div class="flist-card">
    <div class="flist-header">
      <div class="flist-title">Tag Someone</div>
      <button type="button" class="flist-close" id="tagSearchCloseBtn" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="flist-search-wrap" id="tagSearchBox">
      <input type="text" class="flist-search" id="tagSearchInput" placeholder="Search by username">
    </div>
    <div class="flist-list" id="tagSearchResults"></div>
  </div>
</div>

<div class="page-overlay" id="flistOverlay">
  <div class="flist-card">
    <div class="flist-header">
      <div class="flist-title" id="flistTitle">Followers</div>
      <button type="button" class="flist-close" id="flistCloseBtn" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="flist-search-wrap">
      <input type="text" class="flist-search" id="flistSearch" placeholder="Search by username">
    </div>
    <div class="flist-list" id="flistList"></div>
  </div>
</div>

<div class="page-overlay" id="mpvOverlay">
  <div class="mpv-card">
    <div class="mpv-avatar" id="mpvAvatar">–</div>
    <div class="mpv-name" id="mpvName">–</div>
    <div class="mpv-username" id="mpvUsername">–</div>
    <div class="mpv-stats">
      <div class="mpv-stat"><div class="mpv-stat-num" id="mpvFollowers">0</div><div class="mpv-stat-label">Followers</div></div>
      <div class="mpv-stat"><div class="mpv-stat-num" id="mpvFollowing">0</div><div class="mpv-stat-label">Following</div></div>
      <div class="mpv-stat"><div class="mpv-stat-num" id="mpvLikes">0</div><div class="mpv-stat-label">Likes</div></div>
    </div>
    <button type="button" class="mpv-view-btn" id="mpvViewBtn">View Profile</button>
    <button type="button" class="mpv-close-text" id="mpvCloseBtn">Close</button>
  </div>
</div>

<div class="page-overlay" id="viewAsOverlay">
  <div class="mpv-card" style="position:relative">
    <div class="viewas-badge">VIEW AS</div>
    <div class="mpv-avatar" id="vaAvatar">–</div>
    <div class="mpv-name" id="vaName">–</div>
    <div class="mpv-username" id="vaUsername">–</div>
    <div class="pf-bio" id="vaBio" style="display:none;max-width:none;margin-bottom:10px"></div>
    <div class="pf-status" id="vaStatus" style="display:none;justify-content:center;margin-bottom:14px"></div>
    <div class="mpv-stats">
      <div class="mpv-stat"><div class="mpv-stat-num" id="vaFollowers">0</div><div class="mpv-stat-label">Followers</div></div>
      <div class="mpv-stat"><div class="mpv-stat-num" id="vaFollowing">0</div><div class="mpv-stat-label">Following</div></div>
      <div class="mpv-stat"><div class="mpv-stat-num" id="vaLikes">0</div><div class="mpv-stat-label">Likes</div></div>
    </div>
    <button type="button" class="mpv-view-btn" disabled style="opacity:.6;cursor:default">Follow</button>
    <button type="button" class="mpv-close-text" id="vaCloseBtn">Close</button>
  </div>
</div>

<button type="button" class="pf-feed-fab" id="feedFabBtn" style="display:none" aria-label="Posts from people you follow">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
  <span class="pf-feed-fab-badge" id="feedFabBadge"></span>
</button>

<div class="page-overlay comments-overlay" id="followingFeedOverlay">
  <div class="comments-card">
    <div class="comments-header">
      <div class="comments-title">POSTS</div>
      <button type="button" class="flist-close" id="followingFeedCloseBtn" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="comments-list" id="followingFeedList"></div>
  </div>
</div>

<div class="page-overlay" id="linkInsertOverlay">
  <div class="flist-card" style="max-height:none">
    <div class="flist-header">
      <div class="flist-title">Insert Link</div>
      <button type="button" class="flist-close" id="linkInsertCloseBtn" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="flist-search-wrap" style="padding-bottom:4px">
      <div class="pf-status" id="linkInsertSelectedWord" style="margin-bottom:10px;font-size:.8rem;color:var(--muted)"></div>
      <input type="text" class="flist-search" id="linkInsertUrlInput" placeholder="https://example.com" inputmode="url">
    </div>
    <div style="padding:6px 18px 18px">
      <button type="button" class="mpv-view-btn" id="linkInsertSaveBtn">Save</button>
      <button type="button" class="mpv-close-text" id="linkInsertCancelBtn" style="display:block;margin:0 auto">Cancel</button>
    </div>
  </div>
</div>

<script>
document.getElementById('pfBackBtn').addEventListener('click', () => {
  if (window.history.length > 1) window.history.back();
  else window.location.href = '/';
});
async function getJSON(url){
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
async function postJSON(url, body){
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
const VERIFIED_BADGE = '<svg class="pf-verified" viewBox="0 0 24 24" width="18" height="18" aria-label="Verified"><path fill="#00E0FF" d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/><path fill="none" stroke="#04141a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M8.3 12.2l2.4 2.3 4.7-5.1"/></svg>';

function setupAltUsernames(altUsernames){
  const toggle = document.getElementById('pfAltToggle');
  const list = document.getElementById('pfAltList');
  list.innerHTML = '';
  toggle.classList.remove('open');
  list.classList.remove('open');
  if (!altUsernames || !altUsernames.length) {
    toggle.style.display = 'none';
    return;
  }
  altUsernames.forEach((name) => {
    const pill = document.createElement('span');
    pill.className = 'pf-alt-pill';
    pill.textContent = '@' + name;
    list.appendChild(pill);
  });
  toggle.style.display = 'flex';
  toggle.onclick = () => {
    const isOpen = toggle.classList.toggle('open');
    list.classList.toggle('open', isOpen);
  };
}

function formatCount(n){
  n = Number(n) || 0;
  const units = [{ v: 1e9, s: 'B' }, { v: 1e6, s: 'm' }, { v: 1e3, s: 'k' }];
  for (const u of units) {
    if (n >= u.v) {
      const val = Math.floor((n / u.v) * 10) / 10;
      return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + u.s;
    }
  }
  return String(n);
}

function formatRelativeTime(ts){
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + (mins === 1 ? ' min ago' : ' mins ago');
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
  const days = Math.floor(hours / 24);
  if (days < 7) return days + (days === 1 ? ' day ago' : ' days ago');
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function flashMsg(el, msg, ok){
  if (!el) return;
  el.textContent = msg;
  el.className = 'acc-msg show ' + (ok ? 'ok' : 'err');
  setTimeout(() => el.classList.remove('show'), 3500);
}

function showToast(message){
  const toast = document.createElement('div');
  toast.className = 'pf-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2800);
}

function setAvatar(u){
  const initials = ((u.firstName || '')[0] || '') + ((u.lastName || '')[0] || '');
  const avatar = document.getElementById('pfAvatar');
  if (u.photoURL) {
    avatar.style.backgroundImage = 'url(' + u.photoURL + ')';
    avatar.textContent = '';
  } else {
    avatar.style.backgroundImage = '';
    avatar.textContent = initials || 'U';
  }
}

async function toggleFollow(uid, btn){
  const isFollowingNow = btn.classList.contains('following');
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.innerHTML = '<span class="pf-mini-spinner"></span>';
  try {
    const res = await fetch('/api/' + (isFollowingNow ? 'unfollow' : 'follow') + '/' + uid, { method: 'POST' });
    if (!res.ok) throw new Error();
    btn.classList.toggle('following', !isFollowingNow);
    btn.textContent = !isFollowingNow ? 'Following' : 'Follow';
  } catch (err) {
    btn.textContent = originalText;
  } finally {
    btn.disabled = false;
  }
}

const PLANE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>';
const CAMERA_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8a2 2 0 012-2h1.5l1-1.5h7l1 1.5H18a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const HEART_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7.2-4.5-9.8-9C.6 8.7 2 5 5.6 4.4 8 4 10.2 5.2 12 7.5 13.8 5.2 16 4 18.4 4.4 22 5 23.4 8.7 21.8 12c-2.6 4.5-9.8 9-9.8 9z"/></svg>';
const RESHARE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M17 2l4 4-4 4"/><path stroke-linecap="round" d="M3 11V9a4 4 0 014-4h14"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 22l-4-4 4-4"/><path stroke-linecap="round" d="M21 13v2a4 4 0 01-4 4H3"/></svg>';
const COMMENT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>';
const COMMENT_HEART_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7.2-4.5-9.8-9C.6 8.7 2 5 5.6 4.4 8 4 10.2 5.2 12 7.5 13.8 5.2 16 4 18.4 4.4 22 5 23.4 8.7 21.8 12c-2.6 4.5-9.8 9-9.8 9z"/></svg>';
const REPLY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17l-5-5 5-5M4 12h11a5 5 0 015 5v1"/></svg>';
const PIN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 17v5"/><path d="M8 3h8l-1 6 3 3v2H6v-2l3-3z"/></svg>';
const HIDE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a20.3 20.3 0 015.06-6.06M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 8 11 8a20.3 20.3 0 01-3.22 4.44"/><path d="M14.12 14.12a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>';
const UNHIDE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
const TRASH_ICON_SMALL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>';

function escapeHtml(s){
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function renderPostText(text){
  let html = escapeHtml(text);
  html = html.replace(/\\[([^\\[\\]]+)\\]\\((https?:\\/\\/[^\\s()]+)\\)/g, function(m, label, url){
    return '<a href="' + url.replace(/\"/g, '&quot;') + '" target="_blank" rel="noopener noreferrer" class="post-link">' + label + '</a>';
  });
  html = html.replace(/\\*([^\\s*][^*]*?)\\*/g, '<b>$1</b>');
  html = html.replace(/_([^\\s_][^_]*?)_/g, '<i>$1</i>');
  html = html.replace(/@(\\w+)/g, '<a href="/u/$1">@$1</a>');
  return html;
}
function extractTags(text){
  const matches = (text || '').match(/@(\\w+)/g) || [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
}

let activeTagInput = null;

function attachTagHighlight(inputEl, opts){
  opts = opts || {};
  if (inputEl.dataset.tagHighlightWired) return;
  inputEl.dataset.tagHighlightWired = '1';

  inputEl.style.webkitAppearance = 'none';
  inputEl.style.appearance = 'none';

  const cs = window.getComputedStyle(inputEl);
  const originalColor = cs.color;
  const isTextarea = inputEl.tagName === 'TEXTAREA';

  const wrap = document.createElement('div');
  wrap.className = 'tag-highlight-wrap';
  inputEl.parentNode.insertBefore(wrap, inputEl);

  const backdrop = document.createElement('div');
  backdrop.className = 'tag-highlight-backdrop';
  wrap.appendChild(backdrop);
  wrap.appendChild(inputEl);

  ['fontFamily','fontSize','fontWeight','fontStyle','fontVariant','letterSpacing','lineHeight',
   'wordSpacing','textIndent','textTransform',
   'paddingTop','paddingRight','paddingBottom','paddingLeft',
   'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','textAlign'
  ].forEach(prop => { backdrop.style[prop] = cs[prop]; });
  backdrop.style.borderStyle = 'solid';
  backdrop.style.borderColor = 'transparent';
  backdrop.style.color = originalColor;
  backdrop.style.whiteSpace = isTextarea ? 'pre-wrap' : 'pre';
  backdrop.style.boxSizing = cs.boxSizing;
  backdrop.style.webkitFontSmoothing = cs.webkitFontSmoothing || 'antialiased';
  backdrop.style.textRendering = 'geometricPrecision';

  inputEl.style.position = 'relative';
  inputEl.style.width = '100%';
  inputEl.style.background = 'transparent';
  inputEl.style.color = 'transparent';
  inputEl.style.webkitTextFillColor = 'transparent';
  inputEl.style.caretColor = originalColor;
  inputEl.style.zIndex = '1';
  backdrop.style.webkitAppearance = 'none';
  backdrop.style.appearance = 'none';
  inputEl.style.webkitTextSizeAdjust = '100%';
  inputEl.style.textSizeAdjust = '100%';
  backdrop.style.webkitTextSizeAdjust = '100%';
  backdrop.style.textSizeAdjust = '100%';

  function render(){
    const text = inputEl.value || '';
    let html = escapeHtml(text);
    if (opts.richFormatting) {
      html = html.replace(/\\[([^\\[\\]]+)\\]\\((https?:\\/\\/[^\\s()]+)\\)/g, '<span class="link-span">[$1]($2)</span>');
      html = html.replace(/\\*([^\\s*][^*]*?)\\*/g, '<span class="md-bold">*$1*</span>');
      html = html.replace(/_([^\\s_][^_]*?)_/g, '<span class="md-italic">_$1_</span>');
    }
    html = html.replace(/@(\\w+)/g, '<mark>@$1</mark>');
    backdrop.innerHTML = html + '&#8203;';
    backdrop.scrollLeft = inputEl.scrollLeft;
    backdrop.scrollTop = inputEl.scrollTop;
  }
  inputEl.addEventListener('input', render);
  inputEl.addEventListener('scroll', () => {
    backdrop.scrollLeft = inputEl.scrollLeft;
    backdrop.scrollTop = inputEl.scrollTop;
  });
  render();
}

function wireTagTrigger(inputEl, opts){
  attachTagHighlight(inputEl, opts);
  inputEl.addEventListener('input', () => {
    if (inputEl.value.endsWith('@')) {
      inputEl.value = inputEl.value.slice(0, -1);
      openTagSearch(inputEl);
    }
  });
}

let pendingLinkInput = null;
let pendingLinkRange = null;

const linkSelectionCheckers = new WeakMap();
document.addEventListener('selectionchange', () => {
  const el = document.activeElement;
  if (!el) return;
  const check = linkSelectionCheckers.get(el);
  if (check) check();
});

function setupLinkInsertion(inputEl){
  const container = inputEl.parentNode; 
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'insert-link-btn';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 00-7.07 0l-2.83 2.83a5 5 0 007.07 7.07l1.5-1.5"/></svg> Insert Link';
  container.appendChild(btn);

  let lastSelection = null;
  function checkSelection(){
    const start = inputEl.selectionStart, end = inputEl.selectionEnd;
    const hasSelection = start !== end;
    if (hasSelection) lastSelection = { start, end, text: inputEl.value.slice(start, end) };
    btn.classList.toggle('show', hasSelection);
  }
  linkSelectionCheckers.set(inputEl, checkSelection);
  inputEl.addEventListener('select', checkSelection);
  inputEl.addEventListener('mouseup', checkSelection);
  inputEl.addEventListener('keyup', checkSelection);
  inputEl.addEventListener('touchend', () => {
    checkSelection();
    setTimeout(checkSelection, 60);
    setTimeout(checkSelection, 300);
  });
  inputEl.addEventListener('blur', () => {
    setTimeout(() => { if (document.activeElement !== btn) btn.classList.remove('show'); }, 150);
  });
  inputEl.addEventListener('input', () => { lastSelection = null; });

  btn.addEventListener('mousedown', (e) => e.preventDefault()); 
  btn.addEventListener('click', () => {
    let range = null;
    if (inputEl.selectionStart !== inputEl.selectionEnd) {
      const start = inputEl.selectionStart, end = inputEl.selectionEnd;
      range = { start, end, text: inputEl.value.slice(start, end) };
    } else if (lastSelection) {
      range = lastSelection;
    }
    if (!range) return;
    pendingLinkInput = inputEl;
    pendingLinkRange = range;
    document.getElementById('linkInsertSelectedWord').textContent = 'Linking: "' + range.text + '"';
    document.getElementById('linkInsertUrlInput').value = '';
    document.getElementById('linkInsertOverlay').classList.add('show');
    document.getElementById('linkInsertUrlInput').focus();
  });
}

function closeLinkInsertOverlay(){
  document.getElementById('linkInsertOverlay').classList.remove('show');
  pendingLinkInput = null;
  pendingLinkRange = null;
}
document.getElementById('linkInsertCloseBtn').addEventListener('click', closeLinkInsertOverlay);
document.getElementById('linkInsertCancelBtn').addEventListener('click', closeLinkInsertOverlay);
document.getElementById('linkInsertSaveBtn').addEventListener('click', () => {
  if (!pendingLinkInput || !pendingLinkRange) { closeLinkInsertOverlay(); return; }
  let url = document.getElementById('linkInsertUrlInput').value.trim();
  if (!url) { showToast('Enter a link first.'); return; }
  if (!/^https?:\\/\\//i.test(url)) url = 'https://' + url;
  const inputEl = pendingLinkInput;
  const { start, end, text } = pendingLinkRange;
  const before = inputEl.value.slice(0, start);
  const after = inputEl.value.slice(end);
  const inserted = '[' + text + '](' + url + ')';
  inputEl.value = before + inserted + after;
  const newCursor = before.length + inserted.length;
  inputEl.focus();
  inputEl.setSelectionRange(newCursor, newCursor);
  inputEl.dispatchEvent(new Event('input'));
  closeLinkInsertOverlay();
});

function openTagSearch(inputEl){
  activeTagInput = inputEl;
  const overlay = document.getElementById('tagSearchOverlay');
  const searchInput = document.getElementById('tagSearchInput');
  const resultsEl = document.getElementById('tagSearchResults');
  searchInput.value = '';
  resultsEl.innerHTML = '';
  overlay.classList.add('show');

  if (ownProfile && ownProfile.lockProfile) {
    document.getElementById('tagSearchBox').style.display = 'none';
    resultsEl.innerHTML = '<div class="flist-empty">This feature is disabled. To enable, go to <a href="/account#lockProfile" class="pf-edit-link">Locked Profile</a>.</div>';
    return;
  }
  document.getElementById('tagSearchBox').style.display = 'block';
  searchInput.focus();
}

function selectTag(username){
  if (activeTagInput) {
    activeTagInput.value = activeTagInput.value.replace(/\\s+$/, '') + (activeTagInput.value.trim() ? ' ' : '') + '@' + username + ' ';
    activeTagInput.dispatchEvent(new Event('input'));
    activeTagInput.focus();
  }
  document.getElementById('tagSearchOverlay').classList.remove('show');
}

async function runTagSearch(q){
  const resultsEl = document.getElementById('tagSearchResults');
  if (!q) { resultsEl.innerHTML = ''; return; }
  resultsEl.innerHTML = '<div class="pf-posts-loading"><div class="pf-loader-ring" style="width:20px;height:20px"></div></div>';
  try {
    const data = await getJSON('/api/users/search?q=' + encodeURIComponent(q));
    const list = data.results || [];
    resultsEl.innerHTML = '';
    if (!list.length) { resultsEl.innerHTML = '<div class="flist-empty">No users found.</div>'; return; }
    list.forEach(u => {
      const row = document.createElement('div');
      row.className = 'flist-row';
      row.style.cursor = 'pointer';
      const avatar = document.createElement('div');
      avatar.className = 'flist-avatar';
      if (u.photoURL) {
        avatar.style.backgroundImage = 'url(' + u.photoURL + ')';
      } else {
        avatar.textContent = ((u.firstName || '')[0] || (u.username || '?')[0] || '?').toUpperCase();
      }
      const info = document.createElement('div');
      info.className = 'flist-info';
      const name = document.createElement('div');
      name.className = 'flist-name';
      name.innerHTML = ((u.firstName || u.lastName) ? ((u.firstName || '') + ' ' + (u.lastName || '')).trim() : ('@' + u.username)) + ((u.isAdmin || u.verified) ? VERIFIED_BADGE : '');
      const uname = document.createElement('div');
      uname.className = 'flist-username';
      uname.textContent = '@' + (u.matchedAltUsername || u.username);
      info.appendChild(name);
      info.appendChild(uname);
      row.appendChild(avatar);
      row.appendChild(info);
      row.addEventListener('click', () => selectTag(u.username));
      resultsEl.appendChild(row);
    });
  } catch (err) {
    resultsEl.innerHTML = '<div class="flist-empty">Search failed. Try again.</div>';
  }
}
document.getElementById('tagSearchInput').addEventListener('input', (e) => runTagSearch(e.target.value.trim()));
document.getElementById('tagSearchCloseBtn').addEventListener('click', () => {
  document.getElementById('tagSearchOverlay').classList.remove('show');
});
document.getElementById('tagSearchOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'tagSearchOverlay') document.getElementById('tagSearchOverlay').classList.remove('show');
});

async function toggleLikePost(postId, btn, countEl){
  if (btn.disabled) return;
  btn.disabled = true;
  const wasLiked = btn.classList.contains('liked');
  try {
    const data = await postJSON('/api/posts/' + postId + '/like', {});
    btn.classList.toggle('liked', data.likedByViewer);
    countEl.textContent = data.likesCount > 0 ? formatCount(data.likesCount) : '';
  } catch (err) {
    btn.classList.toggle('liked', wasLiked);
  } finally {
    btn.disabled = false;
  }
}

function goToProfile(username, postId){
  if (!username) return;
  window.location.href = '/u/' + encodeURIComponent(username) + (postId ? '#post-' + postId : '');
}

function createFeedPostCard(post){
  const author = post.author || {};
  const card = document.createElement('div');
  card.className = 'feed-post';
  card.addEventListener('click', () => goToProfile(author.username, post.id));

  const avatar = document.createElement('div');
  avatar.className = 'feed-post-avatar';
  if (author.photoURL) {
    avatar.style.backgroundImage = 'url(' + author.photoURL + ')';
  } else {
    avatar.textContent = ((author.firstName || '')[0] || (author.username || '?')[0] || '?').toUpperCase();
  }
  avatar.addEventListener('click', (e) => { e.stopPropagation(); goToProfile(author.username); });
  card.appendChild(avatar);

  const body = document.createElement('div');
  body.className = 'feed-post-body';

  const nameRow = document.createElement('div');
  const nameEl = document.createElement('span');
  nameEl.className = 'feed-post-name';
  nameEl.innerHTML = ((author.firstName || author.lastName) ? ((author.firstName || '') + ' ' + (author.lastName || '')).trim() : ('@' + (author.username || ''))) +
    ((author.isAdmin || author.verified) ? VERIFIED_BADGE : '');
  nameEl.addEventListener('click', (e) => { e.stopPropagation(); goToProfile(author.username); });
  nameRow.appendChild(nameEl);
  body.appendChild(nameRow);

  const timeEl = document.createElement('div');
  timeEl.className = 'feed-post-time';
  timeEl.textContent = formatRelativeTime(post.createdAt);
  body.appendChild(timeEl);

  if (post.text) {
    const textEl = document.createElement('div');
    textEl.className = 'feed-post-text';
    textEl.innerHTML = renderPostText(post.text);
    body.appendChild(textEl);
  }

  if (post.imageDataUrl) {
    const img = document.createElement('img');
    img.className = 'feed-post-image';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = post.imageDataUrl;
    body.appendChild(img);
  }

  const footer = document.createElement('div');
  footer.className = 'feed-post-footer';

  const heart = document.createElement('button');
  heart.type = 'button';
  heart.className = 'pf-post-heart' + (post.likedByViewer ? ' liked' : '');
  heart.innerHTML = HEART_ICON;
  const likeCountEl = document.createElement('div');
  likeCountEl.className = 'pf-post-like-count';
  likeCountEl.textContent = post.likesCount > 0 ? formatCount(post.likesCount) : '';
  heart.addEventListener('click', (e) => { e.stopPropagation(); toggleLikePost(post.id, heart, likeCountEl); });
  footer.appendChild(heart);
  footer.appendChild(likeCountEl);

  const commentBtn = document.createElement('button');
  commentBtn.type = 'button';
  commentBtn.className = 'pf-post-comment-btn' + (post.commentsEnabled === false ? ' disabled' : '');
  commentBtn.innerHTML = COMMENT_ICON;
  const commentCountEl = document.createElement('div');
  commentCountEl.className = 'pf-post-comment-count';
  commentCountEl.textContent = post.commentsCount > 0 ? formatCount(post.commentsCount) : '';
  commentBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (post.commentsEnabled === false) { showToast('Comments are turned off for this post.'); return; }
    openComments(post.id, post);
  });
  footer.appendChild(commentBtn);
  footer.appendChild(commentCountEl);

  body.appendChild(footer);
  card.appendChild(body);
  return card;
}

async function loadFollowingFeed(){
  const listEl = document.getElementById('followingFeedList');
  listEl.innerHTML = '<div class="pf-posts-loading"><div class="pf-loader-ring"></div><div class="pf-loader-text">Loading posts…</div></div>';
  try {
    const data = await getJSON('/api/feed/following');
    const posts = data.posts || [];
    listEl.innerHTML = '';
    if (!posts.length) {
      listEl.innerHTML = '<div class="feed-empty">No posts yet from people you follow.</div>';
    } else {
      posts.forEach(p => listEl.appendChild(createFeedPostCard(p)));
    }
  } catch (err) {
    listEl.innerHTML = '<div class="feed-empty">Could not load posts. Try again.</div>';
  }
  refreshFeedBadge(); 
}

async function refreshFeedBadge(){
  const badge = document.getElementById('feedFabBadge');
  if (!badge) return;
  try {
    const data = await getJSON('/api/feed/following/unseen-count');
    const count = data.count || 0;
    badge.textContent = count > 0 ? String(count) : '';
    badge.classList.toggle('show', count > 0);
  } catch (err) {
  }
}

function initFollowingFeedFab(){
  const fab = document.getElementById('feedFabBtn');
  if (!fab) return;
  fab.style.display = 'flex';
  fab.addEventListener('click', () => {
    document.getElementById('followingFeedOverlay').classList.add('show');
    document.getElementById('feedFabBadge').classList.remove('show'); 
    loadFollowingFeed();
  });
  document.getElementById('followingFeedCloseBtn').addEventListener('click', () => {
    document.getElementById('followingFeedOverlay').classList.remove('show');
  });
  document.getElementById('followingFeedOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'followingFeedOverlay') document.getElementById('followingFeedOverlay').classList.remove('show');
  });
  refreshFeedBadge();
  setInterval(refreshFeedBadge, 20000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshFeedBadge();
  });
}

function createPostCard(post, isOwner){
  const card = document.createElement('div');
  card.className = 'pf-post';
  card.id = 'post-' + post.id;
  card.style.position = 'relative';

  if (post.resharedFrom) {
    const reshareLabel = document.createElement('div');
    reshareLabel.className = 'pf-post-reshare-label';
    reshareLabel.innerHTML = RESHARE_ICON + '<span>Reshared from @' + post.resharedFrom.username + '</span>';
    reshareLabel.addEventListener('click', () => {
      window.location.href = '/u/' + post.resharedFrom.username + '#post-' + post.resharedFrom.postId;
    });
    card.appendChild(reshareLabel);
  }

  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.className = 'pf-post-more-btn';
  moreBtn.setAttribute('aria-label', 'More');
  moreBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>';
  moreBtn.addEventListener('click', () => openPostOptions(post, isOwner, card));
  card.appendChild(moreBtn);

  const textEl = document.createElement('div');
  textEl.className = 'pf-post-text';
  textEl.innerHTML = renderPostText(post.text);
  if (post.text) card.appendChild(textEl);

  if (post.imageDataUrl) {
    const img = document.createElement('img');
    img.className = 'pf-post-image';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = post.imageDataUrl;
    card.appendChild(img);
  }

  const footer = document.createElement('div');
  footer.className = 'pf-post-footer';
  const heart = document.createElement('button');
  heart.type = 'button';
  heart.className = 'pf-post-heart' + (post.likedByViewer ? ' liked' : '');
  heart.innerHTML = HEART_ICON;
  const countEl = document.createElement('div');
  countEl.className = 'pf-post-like-count';
  countEl.textContent = post.likesCount > 0 ? formatCount(post.likesCount) : '';
  heart.addEventListener('click', () => toggleLikePost(post.id, heart, countEl));
  footer.appendChild(heart);
  footer.appendChild(countEl);

  const commentBtn = document.createElement('button');
  commentBtn.type = 'button';
  commentBtn.className = 'pf-post-comment-btn' + (post.commentsEnabled === false ? ' disabled' : '');
  commentBtn.innerHTML = COMMENT_ICON;
  const commentCountEl = document.createElement('div');
  commentCountEl.className = 'pf-post-comment-count';
  commentCountEl.textContent = post.commentsCount > 0 ? formatCount(post.commentsCount) : '';
  commentCountEl.id = 'commentCount-' + post.id;
  commentCountEl.dataset.raw = post.commentsCount || 0;
  commentBtn.addEventListener('click', () => {
    if (post.commentsEnabled === false) { showToast('Comments are turned off for this post.'); return; }
    openComments(post.id, post);
  });
  footer.appendChild(commentBtn);
  footer.appendChild(commentCountEl);

  if (!post.resharedFrom) {
    const reshareBtn = document.createElement('button');
    reshareBtn.type = 'button';
    const reshareOff = post.reshareEnabled === false;
    reshareBtn.className = 'pf-post-reshare-btn' + (reshareOff ? ' disabled' : '');
    reshareBtn.innerHTML = RESHARE_ICON;
    const reshareCountEl = document.createElement('div');
    reshareCountEl.className = 'pf-post-reshare-count';
    reshareCountEl.textContent = post.reshareCount > 0 ? formatCount(post.reshareCount) : '';
    reshareBtn.addEventListener('click', async () => {
      if (isOwner) { showToast("You can't reshare your own post."); return; }
      if (reshareOff) { showToast('Reshare is turned off for this post.'); return; }
      reshareBtn.disabled = true;
      try {
        await postJSON('/api/posts/' + post.id + '/reshare', {});
        post.reshareCount = (post.reshareCount || 0) + 1;
        reshareCountEl.textContent = formatCount(post.reshareCount);
        reshareBtn.classList.add('reshared');
        showToast('Reshared to your profile.');
      } catch (err) {
        showToast(err.message || 'Could not reshare that post.');
      }
      reshareBtn.disabled = false;
    });
    footer.appendChild(reshareBtn);
    footer.appendChild(reshareCountEl);
  }
  card.appendChild(footer);

  const timeEl = document.createElement('div');
  timeEl.className = 'pf-post-time';
  timeEl.textContent = formatRelativeTime(post.createdAt) + (post.editedAt ? ' · ' : '');
  if (post.editedAt) {
    const editedSpan = document.createElement('span');
    editedSpan.className = 'pf-post-edited';
    editedSpan.textContent = 'Edited';
    timeEl.appendChild(editedSpan);
  }
  card.appendChild(timeEl);

  return card;
}

function visibilityLabel(v){
  return v === 'only_me' ? 'Only Me' : v === 'friends' ? 'Friends' : 'Everyone';
}

function openPostOptions(post, isOwner, cardEl){
  const body = document.getElementById('postOptionsBody');
  body.innerHTML = '';

  if (isOwner) {
    const settingsBtn = document.createElement('button');
    settingsBtn.type = 'button';
    settingsBtn.className = 'post-opt-btn';
    settingsBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg><span>Settings</span>';
    settingsBtn.addEventListener('click', () => openPostSettings(post, cardEl));
    body.appendChild(settingsBtn);

    const visBtn = document.createElement('button');
    visBtn.type = 'button';
    visBtn.className = 'post-opt-btn';
    visBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg><span>Who Can View</span><span class="post-opt-sub">' + visibilityLabel(post.visibility) + '</span>';
    visBtn.addEventListener('click', () => openPostVisibility(post));
    body.appendChild(visBtn);

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'post-opt-btn';
    editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg><span>Edit</span>';
    editBtn.addEventListener('click', () => {
      document.getElementById('postOptionsOverlay').classList.remove('show');
      enterEditMode(post, cardEl);
    });
    body.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'post-opt-btn danger';
    delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg><span>Delete</span>';
    delBtn.addEventListener('click', () => {
      document.getElementById('postOptionsOverlay').classList.remove('show');
      openDeleteConfirm(post.id, cardEl);
    });
    body.appendChild(delBtn);
  }

  document.getElementById('postOptionsOverlay').classList.add('show');
}

function openPostSettings(post, cardEl){
  document.getElementById('postOptionsOverlay').classList.remove('show');
  const body = document.getElementById('postSettingsBody');
  body.innerHTML = '';

  function makeToggleRow(label, sub, field, current, onChanged){
    const row = document.createElement('div');
    row.className = 'tfa-toggle-row';
    row.style.marginBottom = '16px';
    const textWrap = document.createElement('div');
    textWrap.innerHTML = '<div class="tfa-toggle-label">' + label + '</div><div class="tfa-toggle-sub">' + sub + '</div>';
    const sw = document.createElement('div');
    sw.className = 'tfa-switch' + (current ? ' on' : '');
    sw.innerHTML = '<div class="tfa-switch-dot"></div>';
    sw.addEventListener('click', async () => {
      const next = !sw.classList.contains('on');
      sw.classList.toggle('on', next);
      textWrap.querySelector('.tfa-toggle-sub').textContent = next ? 'On' : 'Off';
      try {
        await postJSON('/api/posts/' + post.id + '/settings', { [field]: next });
        post[field] = next;
        onChanged(next);
        flashMsg(document.getElementById('postSettingsMsg'), 'Saved.', true);
      } catch (err) {
        sw.classList.toggle('on', !next);
        textWrap.querySelector('.tfa-toggle-sub').textContent = !next ? 'On' : 'Off';
        flashMsg(document.getElementById('postSettingsMsg'), err.message || 'Could not update setting.', false);
      }
    });
    row.appendChild(textWrap);
    row.appendChild(sw);
    body.appendChild(row);
  }

  makeToggleRow(
    'Comments', post.commentsEnabled === false ? 'Off' : 'On', 'commentsEnabled', post.commentsEnabled !== false,
    (next) => {
      const btn = cardEl.querySelector('.pf-post-comment-btn');
      if (btn) btn.classList.toggle('disabled', !next);
    }
  );
  makeToggleRow(
    'Reshare', post.reshareEnabled === false ? 'Off' : 'On', 'reshareEnabled', post.reshareEnabled !== false,
    (next) => {
      const btn = cardEl.querySelector('.pf-post-reshare-btn');
      if (btn) btn.classList.toggle('disabled', !next);
    }
  );

  document.getElementById('postSettingsOverlay').classList.add('show');
}
document.getElementById('postSettingsCloseBtn').addEventListener('click', () => {
  document.getElementById('postSettingsOverlay').classList.remove('show');
});
document.getElementById('postSettingsOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'postSettingsOverlay') document.getElementById('postSettingsOverlay').classList.remove('show');
});

function openPostVisibility(post){
  document.getElementById('postOptionsOverlay').classList.remove('show');
  const body = document.getElementById('postVisBody');
  body.innerHTML = '';
  [['everyone', 'Everyone'], ['friends', 'Friends'], ['only_me', 'Only Me']].forEach(([value, label]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'post-opt-btn';
    btn.textContent = label + ((post.visibility || 'everyone') === value ? ' ✓' : '');
    btn.addEventListener('click', async () => {
      const original = btn.textContent;
      btn.innerHTML = '<span class="pf-mini-spinner"></span> Saving…';
      try {
        await postJSON('/api/posts/' + post.id + '/visibility', { visibility: value });
        post.visibility = value;
        document.getElementById('postVisibilityOverlay').classList.remove('show');
        showToast('Saved.');
      } catch (err) {
        showToast(err.message || 'Could not update.');
        btn.textContent = original;
      }
    });
    body.appendChild(btn);
  });
  document.getElementById('postVisibilityOverlay').classList.add('show');
}

function openDeleteConfirm(postId, cardEl){
  document.getElementById('postDeleteOverlay').classList.add('show');
  const confirmBtn = document.getElementById('postDeleteConfirmBtn');
  const originalText = confirmBtn.textContent;
  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="btn-spinner-light"></span>Deleting…';
    try {
      await postJSON('/api/posts/' + postId + '/delete', {});
      document.getElementById('postDeleteOverlay').classList.remove('show');
      cardEl.remove();
      if (!document.getElementById('postsList').children.length) {
        document.getElementById('postsList').innerHTML = '<div class="pf-post-empty">No posts yet.</div>';
      }
      showToast('Post deleted.');
    } catch (err) {
      showToast(err.message || 'Could not delete that post.');
    }
    confirmBtn.disabled = false;
    confirmBtn.textContent = originalText;
  };
}
document.getElementById('postOptionsCloseBtn').addEventListener('click', () => {
  document.getElementById('postOptionsOverlay').classList.remove('show');
});
document.getElementById('postOptionsOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'postOptionsOverlay') document.getElementById('postOptionsOverlay').classList.remove('show');
});
document.getElementById('postVisCloseBtn').addEventListener('click', () => {
  document.getElementById('postVisibilityOverlay').classList.remove('show');
});
document.getElementById('postVisibilityOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'postVisibilityOverlay') document.getElementById('postVisibilityOverlay').classList.remove('show');
});
document.getElementById('postDeleteCancelBtn').addEventListener('click', () => {
  document.getElementById('postDeleteOverlay').classList.remove('show');
});

function enterEditMode(post, cardEl){
  const originalText = post.text || '';
  const originalImage = post.imageDataUrl || null;
  let newImage = originalImage;

  cardEl.innerHTML = '';
  const textarea = document.createElement('textarea');
  textarea.className = 'pf-bio-textarea';
  textarea.rows = 3;
  textarea.maxLength = 2000;
  textarea.value = originalText;
  cardEl.appendChild(textarea);

  let imgPreview = null;
  if (newImage) {
    imgPreview = document.createElement('img');
    imgPreview.className = 'pf-post-image';
    imgPreview.src = newImage;
    cardEl.appendChild(imgPreview);
  }

  const actionsRow = document.createElement('div');
  actionsRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:10px';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';

  const photoBtn = document.createElement('button');
  photoBtn.type = 'button';
  photoBtn.className = 'pf-composer-icon-btn';
  photoBtn.innerHTML = CAMERA_ICON;
  photoBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      newImage = await resizeImageFile(file, 900);
      if (!imgPreview) {
        imgPreview = document.createElement('img');
        imgPreview.className = 'pf-post-image';
        cardEl.insertBefore(imgPreview, actionsRow);
      }
      imgPreview.src = newImage;
      checkChanged();
    } catch (err) {
      showToast(err.message || 'Could not read that image.');
    }
  });

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'pf-composer-send-btn';
  saveBtn.innerHTML = PLANE_ICON;
  saveBtn.disabled = true;

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'mpv-close-text';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.marginLeft = '4px';
  cancelBtn.addEventListener('click', () => {
    cardEl.replaceWith(createPostCard(post, true));
  });

  function checkChanged(){
    saveBtn.disabled = textarea.value === originalText && newImage === originalImage;
  }
  textarea.addEventListener('input', checkChanged);
  wireTagTrigger(textarea, { richFormatting: true });
  setupLinkInsertion(textarea);

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    const originalIcon = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="pf-mini-spinner"></span>';
    try {
      const payload = { text: textarea.value, taggedUsernames: extractTags(textarea.value) };
      if (newImage !== originalImage) payload.imageDataUrl = newImage;
      const data = await postJSON('/api/posts/' + post.id + '/edit', payload);
      cardEl.replaceWith(createPostCard(data.post, true));
      showToast('Post updated.');
    } catch (err) {
      showToast(err.message || 'Could not save changes.');
      saveBtn.innerHTML = originalIcon;
      saveBtn.disabled = false;
    }
  });

  actionsRow.appendChild(photoBtn);
  actionsRow.appendChild(fileInput);
  actionsRow.appendChild(saveBtn);
  actionsRow.appendChild(cancelBtn);
  cardEl.appendChild(actionsRow);
  textarea.focus();
}

let activeCommentsPostId = null;
let activeCommentsPost = null;
let longPressTimer = null;
let replyContext = null;
let loadedCommentsById = {};

function commentAuthorLabel(author){
  if (!author) return 'Someone';
  const name = ((author.firstName || '') + ' ' + (author.lastName || '')).trim();
  return (name || ('@' + author.username)) + ((author.isAdmin || author.verified) ? VERIFIED_BADGE : '');
}

function renderCommentRow(c, postId){
  const row = document.createElement('div');
  row.className = 'comment-row' + (c.hidden ? ' is-hidden' : '') + (c.isOwnComment ? ' own' : '');
  row.dataset.id = c.id;

  const replyMatch = (c.text || '').match(/^\\[\\[reply:([\\w-]+)\\]\\]([\\s\\S]*)$/);
  const replyToId = replyMatch ? replyMatch[1] : null;
  const displayText = replyMatch ? replyMatch[2] : c.text;
  const repliedComment = replyToId ? loadedCommentsById[replyToId] : null;

  const avatar = document.createElement('div');
  avatar.className = 'comment-avatar';
  if (c.author && c.author.photoURL) {
    avatar.style.backgroundImage = 'url(' + c.author.photoURL + ')';
  } else {
    avatar.textContent = ((c.author && c.author.firstName && c.author.firstName[0]) || (c.author && c.author.username && c.author.username[0]) || '?').toUpperCase();
  }

  const body = document.createElement('div');
  body.className = 'comment-body';

  const nameRow = document.createElement('div');
  nameRow.className = 'comment-name-row';
  const nameEl = document.createElement('div');
  nameEl.className = 'comment-name';
  nameEl.innerHTML = commentAuthorLabel(c.author);
  nameRow.appendChild(nameEl);
  if (c.pinned) {
    const pinBadge = document.createElement('span');
    pinBadge.className = 'comment-pin-badge';
    pinBadge.innerHTML = PIN_ICON + '<span>Pinned</span>';
    nameRow.appendChild(pinBadge);
  }
  body.appendChild(nameRow);

  if (repliedComment) {
    const quote = document.createElement('div');
    quote.className = 'comment-quote';
    const quoteName = document.createElement('div');
    quoteName.className = 'comment-quote-name';
    quoteName.textContent = '@' + ((repliedComment.author && repliedComment.author.username) || '');
    const quoteText = document.createElement('div');
    quoteText.className = 'comment-quote-text';
    quoteText.textContent = (repliedComment.text || '').replace(/^\\[\\[reply:[\\w-]+\\]\\]/, '');
    quote.appendChild(quoteName);
    quote.appendChild(quoteText);
    body.appendChild(quote);
  }

  if (c.hidden && (c.isOwnComment || c.canModerate)) {
    const warn = document.createElement('div');
    warn.className = 'comment-hidden-warning';
    warn.textContent = 'This Comment has been Hidden by Owner';
    body.appendChild(warn);
  } else {
    const textEl = document.createElement('div');
    textEl.className = 'comment-text';
    textEl.textContent = displayText;
    body.appendChild(textEl);
  }

  const meta = document.createElement('div');
  meta.className = 'comment-meta';
  const timeEl = document.createElement('div');
  timeEl.className = 'comment-time';
  timeEl.textContent = formatRelativeTime(c.createdAt);
  meta.appendChild(timeEl);

  const likeBtn = document.createElement('button');
  likeBtn.type = 'button';
  likeBtn.className = 'comment-like-btn' + (c.likedByViewer ? ' liked' : '');
  const likeCountSpan = document.createElement('span');
  likeCountSpan.textContent = c.likesCount > 0 ? formatCount(c.likesCount) : '';
  likeBtn.innerHTML = COMMENT_HEART_ICON;
  likeBtn.appendChild(likeCountSpan);
  likeBtn.addEventListener('click', async () => {
    if (likeBtn.disabled) return;
    likeBtn.disabled = true;
    try {
      const data = await postJSON('/api/comments/' + c.id + '/like', {});
      likeBtn.classList.toggle('liked', data.likedByViewer);
      likeCountSpan.textContent = data.likesCount > 0 ? formatCount(data.likesCount) : '';
    } catch (err) {}
    likeBtn.disabled = false;
  });
  meta.appendChild(likeBtn);
  body.appendChild(meta);

  row.appendChild(avatar);
  row.appendChild(body);

  const replyHint = document.createElement('div');
  replyHint.className = 'comment-reply-hint';
  replyHint.innerHTML = REPLY_ICON + '<span>Reply</span>';
  row.appendChild(replyHint);

  wireCommentSwipe(row, c);

  if (c.canModerate) {
    row.style.cursor = 'pointer';
    const startPress = () => {
      longPressTimer = setTimeout(() => openCommentOptions(c, postId, row), 500);
    };
    const cancelPress = () => { clearTimeout(longPressTimer); };
    row.addEventListener('touchstart', startPress, { passive: true });
    row.addEventListener('touchend', cancelPress);
    row.addEventListener('touchmove', cancelPress);
    row.addEventListener('mousedown', startPress);
    row.addEventListener('mouseup', cancelPress);
    row.addEventListener('mouseleave', cancelPress);
  }

  return row;
}

function startReplyToComment(c){
  if (!c.author || !c.author.username) return;
  const input = document.getElementById('commentInput');
  if (!input) return;
  const cleanText = (c.text || '').replace(/^\\[\\[reply:[\\w-]+\\]\\]/, '');
  replyContext = { id: c.id, username: c.author.username, text: cleanText };
  const nameEl = document.getElementById('commentReplyPreviewName');
  const textEl = document.getElementById('commentReplyPreviewText');
  const bar = document.getElementById('commentReplyPreview');
  if (nameEl) nameEl.textContent = 'Replying to @' + c.author.username;
  if (textEl) textEl.textContent = cleanText;
  if (bar) bar.style.display = 'flex';
  input.focus();
}

function cancelReplyToComment(){
  replyContext = null;
  const bar = document.getElementById('commentReplyPreview');
  if (bar) bar.style.display = 'none';
}
document.getElementById('commentReplyPreviewClose').addEventListener('click', cancelReplyToComment);

function wireCommentSwipe(row, c){
  const SWIPE_THRESHOLD = 56;
  const MAX_DRAG = 80;
  let startX = 0, startY = 0, dragX = 0, dragging = false, lockedAxis = null;

  function begin(x, y){
    startX = x; startY = y; dragX = 0; dragging = true; lockedAxis = null;
    row.style.transition = 'none';
  }
  function move(x, y, ev){
    if (!dragging) return;
    const dx = x - startX;
    const dy = y - startY;
    if (!lockedAxis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      lockedAxis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      if (lockedAxis === 'v') { dragging = false; return; }
    }
    if (lockedAxis !== 'h') return;
    if (ev && ev.cancelable) ev.preventDefault();
    dragX = Math.max(0, Math.min(MAX_DRAG, dx));
    row.style.transform = 'translateX(' + dragX + 'px)';
    const hint = row.querySelector('.comment-reply-hint');
    if (hint) hint.style.opacity = dragX > 20 ? '1' : '0';
  }
  function end(){
    if (!dragging) { lockedAxis = null; return; }
    dragging = false;
    row.style.transition = 'transform .18s var(--ease)';
    row.style.transform = 'translateX(0)';
    const hint = row.querySelector('.comment-reply-hint');
    if (hint) hint.style.opacity = '0';
    if (dragX >= SWIPE_THRESHOLD) startReplyToComment(c);
    dragX = 0;
    lockedAxis = null;
  }

  row.addEventListener('touchstart', (e) => { const t = e.touches[0]; begin(t.clientX, t.clientY); }, { passive: true });
  row.addEventListener('touchmove', (e) => { const t = e.touches[0]; move(t.clientX, t.clientY, e); }, { passive: false });
  row.addEventListener('touchend', end);
  row.addEventListener('mousedown', (e) => begin(e.clientX, e.clientY));
  row.addEventListener('mousemove', (e) => move(e.clientX, e.clientY, e));
  row.addEventListener('mouseup', end);
  row.addEventListener('mouseleave', () => { if (dragging) end(); });
}

function openCommentOptions(c, postId, rowEl){
  const body = document.getElementById('postOptionsBody');
  body.innerHTML = '';

  const pinBtn = document.createElement('button');
  pinBtn.type = 'button';
  pinBtn.className = 'post-opt-btn';
  pinBtn.innerHTML = PIN_ICON + '<span>' + (c.pinned ? 'Unpin' : 'Pin') + '</span>';
  pinBtn.addEventListener('click', async () => {
    document.getElementById('postOptionsOverlay').classList.remove('show');
    try {
      const result = await postJSON('/api/comments/' + c.id + '/pin', {});
      showToast(result.pinned ? 'Comment pinned.' : 'Comment unpinned.');
      loadComments(postId);
    } catch (err) {
      showToast(err.message || 'Could not update comment.');
    }
  });
  body.appendChild(pinBtn);

  const hideBtn = document.createElement('button');
  hideBtn.type = 'button';
  hideBtn.className = 'post-opt-btn';
  hideBtn.innerHTML = (c.hidden ? UNHIDE_ICON : HIDE_ICON) + '<span>' + (c.hidden ? 'Unhide' : 'Hide') + '</span>';
  hideBtn.addEventListener('click', async () => {
    document.getElementById('postOptionsOverlay').classList.remove('show');
    try {
      const result = await postJSON('/api/comments/' + c.id + '/hide', {});
      showToast(result.hidden ? 'Comment hidden.' : 'Comment unhidden.');
      loadComments(postId);
    } catch (err) {
      showToast(err.message || 'Could not update comment.');
    }
  });
  body.appendChild(hideBtn);

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'post-opt-btn danger';
  delBtn.innerHTML = TRASH_ICON_SMALL + '<span>Delete</span>';
  delBtn.addEventListener('click', async () => {
    document.getElementById('postOptionsOverlay').classList.remove('show');
    try {
      await postJSON('/api/comments/' + c.id + '/delete', {});
      rowEl.remove();
      const countEl = document.getElementById('commentCount-' + postId);
      if (countEl) {
        const current = Math.max(0, (parseInt(countEl.dataset.raw || '0', 10) || 0) - 1);
        countEl.dataset.raw = current;
        countEl.textContent = current > 0 ? formatCount(current) : '';
      }
      showToast('Comment deleted.');
    } catch (err) {
      showToast(err.message || 'Could not delete comment.');
    }
  });
  body.appendChild(delBtn);

  document.getElementById('postOptionsOverlay').classList.add('show');
}

async function loadComments(postId){
  const listEl = document.getElementById('commentsList');
  listEl.innerHTML = '<div class="pf-posts-loading"><div class="pf-loader-ring" style="width:24px;height:24px"></div></div>';
  try {
    const data = await getJSON('/api/posts/' + postId + '/comments');
    const comments = (data.results || []).slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    loadedCommentsById = {};
    comments.forEach(c => { loadedCommentsById[c.id] = c; });
    listEl.innerHTML = '';
    if (!comments.length) {
      listEl.innerHTML = '<div class="comments-empty">No comments yet. Be the first to say something.</div>';
      return;
    }
    comments.forEach(c => listEl.appendChild(renderCommentRow(c, postId)));
    listEl.scrollTop = listEl.scrollHeight;
  } catch (err) {
    listEl.innerHTML = '<div class="comments-empty">Could not load comments.</div>';
  }
}

function openComments(postId, post){
  activeCommentsPostId = postId;
  activeCommentsPost = post || null;
  document.getElementById('commentInput').value = '';
  document.getElementById('commentInput').placeholder = commentInputDefaultPlaceholder;
  document.getElementById('commentSendBtn').disabled = true;
  cancelReplyToComment();
  document.getElementById('commentsOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
  loadComments(postId);
}
document.getElementById('commentsCloseBtn').addEventListener('click', () => {
  document.getElementById('commentsOverlay').classList.remove('show');
  document.body.style.overflow = '';
  cancelReplyToComment();
});
document.getElementById('commentsOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'commentsOverlay') {
    document.getElementById('commentsOverlay').classList.remove('show');
    document.body.style.overflow = '';
  }
});
const commentInputEl = document.getElementById('commentInput');
const commentSendBtnEl = document.getElementById('commentSendBtn');
const commentInputDefaultPlaceholder = commentInputEl.placeholder;
wireTagTrigger(commentInputEl);
commentSendBtnEl.innerHTML = PLANE_ICON;
commentInputEl.addEventListener('input', () => {
  const text = commentInputEl.value.trim();
  commentSendBtnEl.disabled = !text;
});
commentSendBtnEl.addEventListener('click', async () => {
  const text = commentInputEl.value.trim();
  if (!text || !activeCommentsPostId) return;
  const payloadText = replyContext ? ('[[reply:' + replyContext.id + ']]' + text) : text;
  commentSendBtnEl.disabled = true;
  const originalIcon = commentSendBtnEl.innerHTML;
  commentSendBtnEl.innerHTML = '<span class="pf-mini-spinner"></span>';
  try {
    const data = await postJSON('/api/posts/' + activeCommentsPostId + '/comments', { text: payloadText, taggedUsernames: extractTags(text) });
    commentInputEl.value = '';
    commentInputEl.placeholder = commentInputDefaultPlaceholder;
    cancelReplyToComment();

    if (data.comment) {
      const c = data.comment;
      const normalized = {
        id: c.id, text: c.text, hidden: !!c.hidden, pinned: !!c.pinnedAt, createdAt: c.createdAt,
        isOwnComment: true, likesCount: c.likesCount || 0, likedByViewer: !!c.likedByViewer, author: c.author,
      };
      loadedCommentsById[normalized.id] = normalized;
      const listEl = document.getElementById('commentsList');
      const emptyState = listEl.querySelector('.comments-empty');
      if (emptyState) emptyState.remove();
      listEl.appendChild(renderCommentRow(normalized, activeCommentsPostId));
      listEl.scrollTop = listEl.scrollHeight;
    }

    const countEl = document.getElementById('commentCount-' + activeCommentsPostId);
    if (countEl) {
      const current = (parseInt(countEl.dataset.raw || '0', 10) || 0) + 1;
      countEl.dataset.raw = current;
      countEl.textContent = formatCount(current);
    }
  } catch (err) {
    showToast(err.message || 'Could not add your comment.');
  }
  commentSendBtnEl.innerHTML = originalIcon;
  commentSendBtnEl.disabled = !commentInputEl.value.trim();
});

async function loadPosts(username, isOwner){
  document.getElementById('postsCard').style.display = 'block';
  document.getElementById('postsList').innerHTML = '<div class="pf-posts-loading"><div class="pf-loader-ring"></div><div class="pf-loader-text">Loading posts…</div></div>';
  try {
    const data = await getJSON('/api/posts/user/' + encodeURIComponent(username));
    const posts = data.results || [];
    const listEl = document.getElementById('postsList');
    listEl.innerHTML = '';
    if (!posts.length) {
      listEl.innerHTML = '<div class="pf-post-empty">No posts yet.</div>';
    } else {
      posts.forEach(p => listEl.appendChild(createPostCard(p, isOwner)));
    }

    const hash = window.location.hash;
    if (hash && hash.startsWith('#post-')) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('flash-highlight');
          setTimeout(() => target.classList.remove('flash-highlight'), 1800);
        }, 350);
      }
    }
  } catch (err) {
    document.getElementById('postsList').innerHTML = '<div class="pf-post-empty">Could not load posts. Try again.</div>';
  }
}

function setupComposer(){
  const slot = document.getElementById('postComposerSlot');
  const wrap = document.createElement('div');
  wrap.className = 'pf-composer';
  wrap.innerHTML =
    '<div class="pf-composer-row">' +
      '<input type="text" id="pfComposerInput" class="pf-composer-input" maxlength="2000" placeholder="Share something...">' +
      '<button type="button" class="pf-composer-icon-btn" id="pfComposerPhotoBtn" aria-label="Add photo">' + CAMERA_ICON + '</button>' +
      '<button type="button" class="pf-composer-send-btn" id="pfComposerSendBtn" aria-label="Post" disabled>' + PLANE_ICON + '</button>' +
    '</div>';
  slot.appendChild(wrap);

  const input = document.getElementById('pfComposerInput');
  const sendBtn = document.getElementById('pfComposerSendBtn');
  wireTagTrigger(input, { richFormatting: true });
  setupLinkInsertion(input);
  input.addEventListener('input', () => { sendBtn.disabled = !input.value.trim(); });

  sendBtn.addEventListener('click', async () => {
    if (!input.value.trim()) return;
    sendBtn.disabled = true;
    const originalIcon = sendBtn.innerHTML;
    sendBtn.innerHTML = '<span class="pf-mini-spinner"></span>';
    try {
      const data = await postJSON('/api/posts', { text: input.value, taggedUsernames: extractTags(input.value) });
      input.value = '';
      input.dispatchEvent(new Event('input'));
      document.getElementById('postsList').querySelectorAll('.pf-post-empty').forEach(el => el.remove());
      document.getElementById('postsList').prepend(createPostCard(data.post, true));
    } catch (err) {
      showToast(err.message || 'Could not post that.');
    }
    sendBtn.innerHTML = originalIcon;
    sendBtn.disabled = !input.value.trim();
  });

  const fileInput = document.getElementById('pfPostImageInput');
  document.getElementById('pfComposerPhotoBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file, 900);
      document.getElementById('postComposeImage').src = dataUrl;
      document.getElementById('postComposeImage').dataset.url = dataUrl;
      document.getElementById('postComposeCaption').value = '';
      document.getElementById('postComposeCaption').dispatchEvent(new Event('input'));
      document.getElementById('postComposeOverlay').classList.add('show');
    } catch (err) {
      showToast(err.message || 'Could not read that image.');
    }
  });

  const captionInput = document.getElementById('postComposeCaption');
  wireTagTrigger(captionInput);
  document.getElementById('postComposeCloseBtn').addEventListener('click', () => {
    document.getElementById('postComposeOverlay').classList.remove('show');
  });
  document.getElementById('postComposeSubmitBtn').addEventListener('click', async () => {
    const btn = document.getElementById('postComposeSubmitBtn');
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.innerHTML = '<span class="pf-mini-spinner"></span> Posting…';
    try {
      const imageDataUrl = document.getElementById('postComposeImage').dataset.url;
      const caption = captionInput.value;
      const data = await postJSON('/api/posts', { text: caption, imageDataUrl, taggedUsernames: extractTags(caption) });
      document.getElementById('postComposeOverlay').classList.remove('show');
      document.getElementById('postsList').querySelectorAll('.pf-post-empty').forEach(el => el.remove());
      document.getElementById('postsList').prepend(createPostCard(data.post, true));
    } catch (err) {
      showToast(err.message || 'Could not post that.');
    }
    btn.textContent = originalText;
    btn.disabled = false;
  });
}

let flistData = [];
function flistRenderRow(u){
  const row = document.createElement('div');
  row.className = 'flist-row';
  const avatar = document.createElement('div');
  avatar.className = 'flist-avatar';
  if (u.photoURL) {
    avatar.style.backgroundImage = 'url(' + u.photoURL + ')';
  } else {
    avatar.textContent = ((u.firstName || '')[0] || (u.username || '?')[0] || '?').toUpperCase();
  }
  const info = document.createElement('div');
  info.className = 'flist-info';
  const name = document.createElement('div');
  name.className = 'flist-name';
  name.innerHTML = ((u.firstName || u.lastName) ? ((u.firstName || '') + ' ' + (u.lastName || '')).trim() : ('@' + u.username)) + ((u.isAdmin || u.verified) ? VERIFIED_BADGE : '');
  const uname = document.createElement('div');
  uname.className = 'flist-username';
  uname.textContent = '@' + u.username;
  info.appendChild(name);
  info.appendChild(uname);
  row.appendChild(avatar);
  row.appendChild(info);
  row.addEventListener('click', () => openMiniPreview(u.username));
  return row;
}
function flistRender(list){
  const listEl = document.getElementById('flistList');
  listEl.innerHTML = '';
  if (!list.length) {
    listEl.innerHTML = '<div class="flist-empty">Nobody to show here yet.</div>';
    return;
  }
  list.forEach(u => listEl.appendChild(flistRenderRow(u)));
}
async function openFlist(type, username){
  const overlay = document.getElementById('flistOverlay');
  document.getElementById('flistTitle').textContent = type === 'following' ? 'Following' : 'Followers';
  document.getElementById('flistSearch').value = '';
  document.getElementById('flistList').innerHTML = '<div class="flist-empty">Loading…</div>';
  overlay.classList.add('show');
  try {
    const url = '/api/follow/list?type=' + type + (username ? '&username=' + encodeURIComponent(username) : '');
    const data = await getJSON(url);
    flistData = data.results || [];
    flistRender(flistData);
  } catch (err) {
    if (err.message === 'User restricted view.') {
      overlay.classList.remove('show');
      showToast('User restricted view.');
      return;
    }
    document.getElementById('flistList').innerHTML = '<div class="flist-empty">Could not load the list. Try again.</div>';
  }
}
document.getElementById('flistCloseBtn').addEventListener('click', () => {
  document.getElementById('flistOverlay').classList.remove('show');
});
document.getElementById('flistOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'flistOverlay') document.getElementById('flistOverlay').classList.remove('show');
});
document.getElementById('flistSearch').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) { flistRender(flistData); return; }
  flistRender(flistData.filter(u => (u.username || '').toLowerCase().includes(q)));
});

async function openMiniPreview(username){
  const overlay = document.getElementById('mpvOverlay');
  document.getElementById('mpvName').innerHTML = 'Loading…';
  document.getElementById('mpvUsername').textContent = '';
  document.getElementById('mpvAvatar').style.backgroundImage = '';
  document.getElementById('mpvAvatar').textContent = '–';
  document.getElementById('mpvFollowers').textContent = '0';
  document.getElementById('mpvFollowing').textContent = '0';
  document.getElementById('mpvLikes').textContent = '0';
  overlay.classList.add('show');
  try {
    const u = await getJSON('/api/users/' + encodeURIComponent(username) + '/public');
    const avatar = document.getElementById('mpvAvatar');
    if (u.photoURL) {
      avatar.style.backgroundImage = 'url(' + u.photoURL + ')';
      avatar.textContent = '';
    } else {
      avatar.textContent = ((u.firstName || '')[0] || (u.username || '?')[0] || '?').toUpperCase();
    }
    document.getElementById('mpvName').innerHTML = ((u.firstName || u.lastName) ? ((u.firstName || '') + ' ' + (u.lastName || '')).trim() : ('@' + u.username)) + ((u.isAdmin || u.verified) ? VERIFIED_BADGE : '');
    document.getElementById('mpvUsername').textContent = '@' + u.username;
    document.getElementById('mpvFollowers').textContent = formatCount(u.followers ?? 0);
    document.getElementById('mpvFollowing').textContent = formatCount(u.following ?? 0);
    document.getElementById('mpvLikes').textContent = formatCount(u.likes ?? 0);
    document.getElementById('mpvViewBtn').onclick = () => { window.location.href = '/u/' + encodeURIComponent(u.username); };
  } catch (err) {
    document.getElementById('mpvName').textContent = 'Could not load this profile.';
  }
}
document.getElementById('mpvCloseBtn').addEventListener('click', () => {
  document.getElementById('mpvOverlay').classList.remove('show');
});
document.getElementById('mpvOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'mpvOverlay') document.getElementById('mpvOverlay').classList.remove('show');
});

const PHOTO_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
let ownProfile = null;

function resizeImageFile(file, maxDim){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height = Math.round(height * (maxDim / width)); width = maxDim; }
        else if (height > maxDim) { width = Math.round(width * (maxDim / height)); height = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Could not read that image.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

function photoCooldownDaysLeft(){
  if (!ownProfile || !ownProfile.lastPhotoChangeAt) return 0;
  const elapsed = Date.now() - ownProfile.lastPhotoChangeAt;
  return Math.max(0, Math.ceil((PHOTO_COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000)));
}

document.getElementById('pfAvatarWrap').addEventListener('click', () => {
  if (!ownProfile) return; 
  const daysLeft = photoCooldownDaysLeft();
  if (daysLeft > 0) {
    showToast('You can change your profile picture again in ' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's') + '.');
    return;
  }
  document.getElementById('pfAvatarInput').click();
});

document.getElementById('pfAvatarInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file || !ownProfile) return;
  const wrap = document.getElementById('pfAvatarWrap');
  wrap.classList.add('uploading');
  try {
    const dataUrl = await resizeImageFile(file, 320);
    const res = await fetch('/api/profile/photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoDataUrl: dataUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not update your profile picture.');
    ownProfile.photoURL = dataUrl;
    ownProfile.lastPhotoChangeAt = Date.now();
    setAvatar(ownProfile);
    wrap.classList.remove('uploading');
    wrap.classList.add('uploaded');
    setTimeout(() => wrap.classList.remove('uploaded'), 1500);
  } catch (err) {
    wrap.classList.remove('uploading');
    showToast(err.message || 'Could not update your profile picture.');
  }
});

(async function(){
  const path = window.location.pathname;
  const match = path.startsWith('/u/') ? [null, path.slice(3).split('/')[0]] : null;

  if (match) {
    let user;
    try {
      user = await getJSON('/api/users/' + encodeURIComponent(match[1]) + '/public');
    } catch (err) {
      window.location.href = '/';
      return;
    }
    document.getElementById('pfLoader').style.display = 'none';
    document.getElementById('pfWrap').style.display = 'block';
    setAvatar(user);
    document.getElementById('pfName').innerHTML =
      (((user.firstName || '') + ' ' + (user.lastName || '')).trim() || ('@' + user.username)) +
      ((user.isAdmin || user.verified) ? VERIFIED_BADGE : '');
    document.getElementById('pfUsername').textContent = '@' + user.username;
    setupAltUsernames(user.altUsernames);
    document.getElementById('pfFollowing').textContent = formatCount(user.following ?? 0);
    document.getElementById('pfFollowers').textContent = formatCount(user.followers ?? 0);
    document.getElementById('pfLikes').textContent = formatCount(user.likes ?? 0);

    if (user.bio) {
      const bioEl = document.getElementById('pfBio');
      bioEl.textContent = user.bio;
      bioEl.style.display = 'block';
    }

    const statusEl = document.getElementById('pfStatus');
    if (user.lastActiveAt) {
      const isActiveNow = Date.now() - user.lastActiveAt < 5 * 60 * 1000;
      if (isActiveNow) {
        statusEl.innerHTML = '<span class="pf-status-dot"></span>Active now';
        statusEl.classList.add('active');
      } else if (user.lastSeenMode === 'recently') {
        statusEl.textContent = 'Last seen recently';
      } else {
        statusEl.textContent = 'Last seen ' + formatRelativeTime(user.lastActiveAt);
      }
      statusEl.style.display = 'flex';
    }

    if (!user.isSelf) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pf-follow-btn' + (user.isFollowing ? ' following' : '');
      btn.textContent = user.isFollowing ? 'Following' : 'Follow';
      btn.addEventListener('click', async () => {
        const wasFollowing = btn.classList.contains('following');
        await toggleFollow(user.uid, btn);
        const nowFollowing = btn.classList.contains('following');
        if (!wasFollowing && nowFollowing && user.locked) {
          try {
            const refreshed = await getJSON('/api/users/' + encodeURIComponent(user.username) + '/public');
            if (!refreshed.locked) {
              user.locked = false;
              const lockedCard = document.getElementById('pfLockedCard');
              if (lockedCard) lockedCard.remove();
              loadPosts(user.username, false);
            }
          } catch (err) {}
        }
      });
      document.getElementById('pfActionSlot').appendChild(btn);
    }

    if (user.followersRestricted) {
      document.getElementById('pfFollowersBtn').addEventListener('click', () => showToast('User restricted view.'));
    } else {
      document.getElementById('pfFollowersBtn').classList.add('tappable');
      document.getElementById('pfFollowersBtn').addEventListener('click', () => openFlist('followers', user.username));
    }
    if (user.followingRestricted) {
      document.getElementById('pfFollowingBtn').addEventListener('click', () => showToast('User restricted view.'));
    } else {
      document.getElementById('pfFollowingBtn').classList.add('tappable');
      document.getElementById('pfFollowingBtn').addEventListener('click', () => openFlist('following', user.username));
    }

    if (user.locked) {
      const lockedCard = document.createElement('div');
      lockedCard.className = 'pf-locked-card';
      lockedCard.id = 'pfLockedCard';
      lockedCard.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>' +
        '<div><b>This profile is locked.</b><br>Only friends who follow each other can view posts.</div>';
      document.getElementById('pfInfoSlot').appendChild(lockedCard);
    } else {
      loadPosts(user.username, false);
    }
    return;
  }

  let profile;
  try {
    profile = await getJSON('/api/profile');
  } catch (err) {
    window.location.href = '/login';
    return;
  }
  ownProfile = profile;
  document.getElementById('pfLoader').style.display = 'none';
    document.getElementById('pfWrap').style.display = 'block';
  document.getElementById('pfAvatarWrap').classList.add('editable');
  const editBadge = document.createElement('div');
  editBadge.className = 'pf-avatar-edit-badge';
  editBadge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
  document.getElementById('pfAvatarWrap').appendChild(editBadge);
  setAvatar(profile);
  document.getElementById('pfName').innerHTML =
    (((profile.firstName || '') + ' ' + (profile.lastName || '')).trim() || 'Unnamed') +
    ((profile.isAdmin || profile.verified) ? VERIFIED_BADGE : '');
  document.getElementById('pfUsername').textContent = profile.username ? ('@' + profile.username) : profile.email;
  setupAltUsernames(profile.altUsernames);
  const bioEl = document.getElementById('pfBio');
  if (profile.bio) {
    bioEl.textContent = profile.bio;
    bioEl.style.display = 'block';
  }
  const bioCard = document.createElement('div');
  bioCard.className = 'tfa-card';
  bioCard.id = 'bioCard';
  bioCard.innerHTML =
    '<div class="tfa-header" id="bioHeader">' +
      '<svg class="tfa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>' +
      '<div class="tfa-header-title">Bio</div>' +
      '<svg class="tfa-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>' +
    '</div>' +
    '<div class="tfa-body"><div class="tfa-body-inner">' +
      '<textarea id="pfBioInput" class="pf-bio-textarea" maxlength="1000" rows="3" placeholder="Tell people a bit about yourself...">' +
        (profile.bio || '').replace(/</g, '&lt;') +
      '</textarea>' +
      '<div class="pf-bio-row">' +
        '<div class="pf-bio-count" id="pfBioCount">' + (profile.bio || '').length + ' / 1000</div>' +
        '<button type="button" class="pf-bio-save" id="pfBioSave" disabled>Save Changes</button>' +
      '</div>' +
    '</div></div>';
  document.getElementById('pfBioSlot').appendChild(bioCard);
  document.getElementById('bioHeader').addEventListener('click', () => {
    document.getElementById('bioCard').classList.toggle('open');
  });
  const bioInput = document.getElementById('pfBioInput');
  const bioSaveBtn = document.getElementById('pfBioSave');
  const bioCountEl = document.getElementById('pfBioCount');
  bioInput.addEventListener('input', () => {
    bioCountEl.textContent = bioInput.value.length + ' / 1000';
    bioSaveBtn.disabled = bioInput.value === (profile.bio || '');
  });
  bioSaveBtn.addEventListener('click', async () => {
    bioSaveBtn.disabled = true;
    bioSaveBtn.textContent = 'Saving…';
    try {
      await postJSON('/api/update-profile', { bio: bioInput.value });
      profile.bio = bioInput.value;
      if (profile.bio) {
        bioEl.textContent = profile.bio;
        bioEl.style.display = 'block';
      } else {
        bioEl.textContent = '';
        bioEl.style.display = 'none';
      }
      showToast('Bio updated.');
    } catch (err) {
      showToast(err.message || 'Could not save bio.');
      bioSaveBtn.disabled = false;
    }
    bioSaveBtn.textContent = 'Save Changes';
  });

  document.getElementById('pfViewAsBtn').style.display = 'flex';
  document.getElementById('pfViewAsBtn').addEventListener('click', () => {
    const vaAvatar = document.getElementById('vaAvatar');
    if (ownProfile.photoURL) {
      vaAvatar.style.backgroundImage = 'url(' + ownProfile.photoURL + ')';
      vaAvatar.textContent = '';
    } else {
      vaAvatar.style.backgroundImage = '';
      vaAvatar.textContent = (((ownProfile.firstName || '')[0] || '') + ((ownProfile.lastName || '')[0] || '')) || 'U';
    }
    document.getElementById('vaName').innerHTML =
      (((ownProfile.firstName || '') + ' ' + (ownProfile.lastName || '')).trim() || ('@' + ownProfile.username)) +
      ((ownProfile.isAdmin || ownProfile.verified) ? VERIFIED_BADGE : '');
    document.getElementById('vaUsername').textContent = ownProfile.username ? ('@' + ownProfile.username) : '';

    const vaBioEl = document.getElementById('vaBio');
    if (ownProfile.bio) {
      vaBioEl.textContent = ownProfile.bio;
      vaBioEl.style.display = 'block';
    } else {
      vaBioEl.style.display = 'none';
    }

    const vaStatusEl = document.getElementById('vaStatus');
    const showActive = ownProfile.showActiveStatus !== false;
    const showLast = ownProfile.showLastSeen !== false;
    if (!showActive && !showLast) {
      vaStatusEl.style.display = 'none';
    } else if (ownProfile.lastActiveAt) {
      const isActiveNow = showActive && Date.now() - ownProfile.lastActiveAt < 5 * 60 * 1000;
      if (isActiveNow) {
        vaStatusEl.innerHTML = '<span class="pf-status-dot"></span>Active now';
        vaStatusEl.classList.add('active');
      } else if (!showLast) {
        vaStatusEl.classList.remove('active');
        vaStatusEl.textContent = 'Last seen recently';
      } else {
        vaStatusEl.classList.remove('active');
        vaStatusEl.textContent = 'Last seen ' + formatRelativeTime(ownProfile.lastActiveAt);
      }
      vaStatusEl.style.display = 'flex';
    } else {
      vaStatusEl.style.display = 'none';
    }

    document.getElementById('vaFollowers').textContent = document.getElementById('pfFollowers').textContent;
    document.getElementById('vaFollowing').textContent = document.getElementById('pfFollowing').textContent;
    document.getElementById('vaLikes').textContent = document.getElementById('pfLikes').textContent;
    document.getElementById('viewAsOverlay').classList.add('show');
  });
  document.getElementById('vaCloseBtn').addEventListener('click', () => {
    document.getElementById('viewAsOverlay').classList.remove('show');
  });
  document.getElementById('viewAsOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'viewAsOverlay') document.getElementById('viewAsOverlay').classList.remove('show');
  });

  document.getElementById('pfFollowingBtn').classList.add('tappable');
  document.getElementById('pfFollowersBtn').classList.add('tappable');
  document.getElementById('pfFollowingBtn').addEventListener('click', () => openFlist('following'));
  document.getElementById('pfFollowersBtn').addEventListener('click', () => openFlist('followers'));

  const infoCard = document.createElement('div');
  infoCard.className = 'acc-card pf-info-card';
  const emailFieldHtml = profile.email
    ? '<div class="field"><label>Email</label><input type="email" value="' + profile.email.replace(/"/g, '&quot;') + '" disabled></div>'
    : profile.telegramId
      ? '<div class="field"><label>Telegram ID</label><input type="text" value="' + String(profile.telegramId).replace(/"/g, '&quot;') + '" disabled>' +
        '<a href="/account#addEmail" class="acc-inline-link">Add Email</a></div>'
      : profile.githubLogin
        ? '<div class="field"><label>GitHub</label><input type="text" value="@' + String(profile.githubLogin).replace(/"/g, '&quot;') + '" disabled>' +
          '<a href="/account#addEmail" class="acc-inline-link">Add Email</a></div>'
        : '<div class="field"><label>Email</label><input type="email" value="" disabled></div>';
  infoCard.innerHTML =
    '<div class="acc-card-title">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
      'Profile Information' +
      '<svg class="pf-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>' +
    '</div>' +
    '<div class="field-row">' +
      '<div class="field"><label>First Name</label><input type="text" value="' + (profile.firstName || '').replace(/"/g, '&quot;') + '" disabled></div>' +
      '<div class="field"><label>Last Name</label><input type="text" value="' + (profile.lastName || '').replace(/"/g, '&quot;') + '" disabled></div>' +
    '</div>' +
    emailFieldHtml;
  document.getElementById('pfInfoSlot').appendChild(infoCard);

  const hint = document.createElement('div');
  hint.className = 'pf-edit-hint';
  hint.innerHTML = 'To edit, go to <a href="/account" class="pf-edit-link">Account Settings</a>.';
  document.getElementById('pfInfoSlot').appendChild(hint);

  try {
    const stats = await getJSON('/api/follow/stats');
    document.getElementById('pfFollowing').textContent = formatCount(stats.following ?? 0);
    document.getElementById('pfFollowers').textContent = formatCount(stats.followers ?? 0);
    document.getElementById('pfLikes').textContent = formatCount(stats.likes ?? 0);
  } catch (err) {}

  setupComposer();
  if (profile.username) loadPosts(profile.username, true);
  initFollowingFeedFab();
})();
</script>
</body>
</html>`;
}
