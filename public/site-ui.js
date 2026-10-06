(function(){
'use strict';
if (window.EsUI) return;
const SITE_UI_MARKUP = "<div class=\"page-overlay\" id=\"esLogoutOverlay\">\n  <div class=\"overlay-card\">\n    <div class=\"overlay-title\">Log out?</div>\n    <div class=\"overlay-sub\">Are you sure you want to logout?</div>\n    <button class=\"overlay-btn-danger\" id=\"esConfirmLogoutBtn\">\n      <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" style=\"width:16px;height:16px\"><path d=\"M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4\"/><path d=\"M16 17l5-5-5-5\"/><path d=\"M21 12H9\"/></svg>\n      Logout\n    </button>\n    <button class=\"overlay-cancel\" id=\"esCancelLogoutBtn\">Cancel</button>\n  </div>\n</div>\n<div class=\"page-overlay\" id=\"esFriendSearchOverlay\">\n  <div class=\"overlay-card friend-search-card\">\n    <div class=\"overlay-title\">Find Friends</div>\n    <div class=\"fs-input-wrap\">\n      <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z\"/></svg>\n      <input type=\"text\" id=\"esFsInput\" placeholder=\"Search by username\u2026\" autocomplete=\"off\" spellcheck=\"false\">\n    </div>\n    <div class=\"fs-results\" id=\"esFsResults\"></div>\n    <button class=\"overlay-cancel\" id=\"esFsCloseBtn\">Close</button>\n  </div>\n</div>\n<div class=\"page-overlay\" id=\"esMpvOverlay\">\n  <div class=\"mpv-card\">\n    <div class=\"mpv-avatar\" id=\"esMpvAvatar\">-</div>\n    <div class=\"mpv-name\" id=\"esMpvName\">-</div>\n    <div class=\"mpv-username\" id=\"esMpvUsername\">-</div>\n    <div class=\"mpv-stats\">\n      <div class=\"mpv-stat\"><div class=\"mpv-stat-num\" id=\"esMpvFollowers\">0</div><div class=\"mpv-stat-label\">Followers</div></div>\n      <div class=\"mpv-stat\"><div class=\"mpv-stat-num\" id=\"esMpvFollowing\">0</div><div class=\"mpv-stat-label\">Following</div></div>\n      <div class=\"mpv-stat\"><div class=\"mpv-stat-num\" id=\"esMpvLikes\">0</div><div class=\"mpv-stat-label\">Likes</div></div>\n    </div>\n    <button type=\"button\" class=\"mpv-view-btn\" id=\"esMpvViewBtn\">View Profile</button>\n    <button type=\"button\" class=\"mpv-close-text\" id=\"esMpvCloseBtn\">Close</button>\n  </div>\n</div>\n<div class=\"page-overlay\" id=\"esNotifOverlay\">\n  <div class=\"flist-card\">\n    <div class=\"flist-header\">\n      <div class=\"flist-title\" id=\"esNotifTitle\">Notifications</div>\n      <button type=\"button\" class=\"flist-close\" id=\"esNotifCloseBtn\" aria-label=\"Close\">\n        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><path stroke-linecap=\"round\" d=\"M18 6L6 18M6 6l12 12\"/></svg>\n      </button>\n    </div>\n    <div class=\"flist-search-wrap\" style=\"padding-top:0;display:flex;justify-content:flex-end;align-items:center;gap:8px\">\n      <button type=\"button\" class=\"notif-mark-read\" id=\"esNotifEnablePushBtn\" style=\"display:none;margin-right:auto\">Enable notifications</button>\n      <button type=\"button\" class=\"notif-mark-read\" id=\"esNotifMarkReadBtn\">Mark all as read</button>\n    </div>\n    <div class=\"flist-list\" id=\"esNotifList\"></div>\n  </div>\n</div><button id=\"esNotifBellBtn\" type=\"button\" hidden></button><span id=\"esNotifDot\" hidden></span>";
const SITE_UI_CSS = "@keyframes skWave{0%{background-position:100% 0}100%{background-position:0 0}}\n@keyframes spin{to{transform:rotate(360deg)}}\n#esSiteUiOverlays .sk-line,#esSiteUiOverlays .sk-avatar{background-image:linear-gradient(90deg,var(--sk-base) 25%,var(--sk-hi) 50%,var(--sk-base) 75%);\n  background-size:200% 100%;background-repeat:no-repeat;\n  animation:skWave 1.6s linear infinite;border-radius:8px;flex-shrink:0;}\n#esSiteUiOverlays .sk-line{height:11px;width:100%;border-radius:6px}\n#esSiteUiOverlays .sk-line.w80{width:80%}\n#esSiteUiOverlays .sk-line.w60{width:60%}\n#esSiteUiOverlays .sk-line.w45{width:45%}\n#esSiteUiOverlays .sk-line.w30{width:30%}\n#esSiteUiOverlays .sk-avatar{width:42px;height:42px;border-radius:50%}\n#esSiteUiOverlays .sk-row{display:flex;align-items:center;gap:12px;padding:12px 0}\n#esSiteUiOverlays .sk-row-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}\n#esSiteUiOverlays .sk-stack{display:flex;flex-direction:column;gap:10px}\n@media(prefers-reduced-motion:reduce){#esSiteUiOverlays .sk-line,#esSiteUiOverlays .sk-avatar{animation:none;background-position:0 0}}\n#esSiteUiOverlays .fab-badge.show{display:flex}\n#esSiteUiOverlays .sc-brand-info .flist-title{color:#04141a;display:flex;align-items:center;gap:4px}\n#esSiteUiOverlays .sc-brand-header .flist-close{background:rgba(4,20,26,.14);color:#04141a}\n#esSiteUiOverlays .sc-brand-header .flist-close:hover{background:rgba(4,20,26,.24);color:#04141a}\n#esSiteUiOverlays .flist-close:active{transform:scale(.88)}\n#esSiteUiOverlays .sc-reply-icon.show{opacity:1;transform:translateY(-50%) scale(1)}\n#esSiteUiOverlays .notif-dot.show{display:block}\n#esSiteUiOverlays .overlay-card.rw-tall{max-height:86vh;overflow-y:auto;scrollbar-width:thin}\n#esSiteUiOverlays .overlay-card.rw-tall > .field{margin-bottom:0}\n#esSiteUiOverlays .overlay-card.rw-tall > .rw-send-limits{margin-top:0}\n#esSiteUiOverlays .overlay-card.rw-tall::-webkit-scrollbar{width:5px}\n#esSiteUiOverlays .overlay-card.rw-tall::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:3px}\n:root[data-theme=\"light\"] #esSiteUiOverlays .overlay-card.rw-tall::-webkit-scrollbar-thumb{background:rgba(20,20,28,.22)}\n#esSiteUiOverlays .acc-msg.show{display:block}\n#esSiteUiOverlays .btn-spinner{width:15px;height:15px;border:2px solid rgba(4,20,26,.35);border-top-color:#04141a;\n  border-radius:50%;display:inline-block;vertical-align:-3px;margin-right:8px;\n  animation:spin .6s linear infinite;}\n#esSiteUiOverlays .page-overlay{position:fixed;inset:0;background:rgba(10,10,15,.75);backdrop-filter:blur(8px);\n  display:none;align-items:center;justify-content:center;z-index:100;padding:24px;}\n#esSiteUiOverlays .page-overlay.show{display:flex}\n#esSiteUiOverlays body:has(.page-overlay.show){overflow:hidden}\n#esSiteUiOverlays .overlay-card{width:100%;max-width:360px;\n  background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(255,255,255,.06);\n  border:1px solid rgba(255,255,255,.22);border-radius:16px;\n  padding:26px 22px;display:flex;flex-direction:column;gap:14px;\n  box-shadow:0 20px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.3);}\n:root[data-theme=\"light\"] #esSiteUiOverlays .overlay-card{background:linear-gradient(155deg,rgba(255,255,255,.6),rgba(255,255,255,.2) 40%,rgba(255,255,255,.3) 100%);\n  border:1px solid rgba(255,255,255,.65);\n  box-shadow:0 20px 60px rgba(20,20,28,.16),inset 0 1px 0 rgba(255,255,255,.7);}\n#esSiteUiOverlays .overlay-title{font-family:var(--font-display);font-weight:700;font-size:1.05rem}\n#esSiteUiOverlays .overlay-sub{font-size:.82rem;color:var(--muted);line-height:1.5}\n#esSiteUiOverlays .overlay-sub b{color:var(--text)}\n#esSiteUiOverlays .overlay-cancel{background:transparent;border:none;color:var(--muted);font-size:.78rem;align-self:center;text-decoration:underline}\n#esSiteUiOverlays .flist-card{width:100%;max-width:400px;max-height:78vh;\n  background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(255,255,255,.06);\n  border:1px solid rgba(255,255,255,.22);\n  border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.3);display:flex;flex-direction:column;overflow:hidden;}\n:root[data-theme=\"light\"] #esSiteUiOverlays .flist-card{background:linear-gradient(155deg,rgba(255,255,255,.6),rgba(255,255,255,.2) 40%,rgba(255,255,255,.3) 100%);\n  border:1px solid rgba(255,255,255,.65);\n  box-shadow:0 20px 60px rgba(20,20,28,.16),inset 0 1px 0 rgba(255,255,255,.7);}\n#esSiteUiOverlays .flist-header{display:flex;align-items:center;justify-content:space-between;padding:18px 18px 0}\n#esSiteUiOverlays .flist-title{font-family:var(--font-display);font-weight:700;font-size:1.02rem}\n#esSiteUiOverlays .flist-close{background:transparent;border:none;color:var(--muted);width:32px;height:32px;border-radius:8px;\n  display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s var(--ease);}\n#esSiteUiOverlays .flist-close:hover{color:var(--accent);background:rgba(0,224,255,.1)}\n#esSiteUiOverlays .flist-close svg{width:18px;height:18px}\n#esSiteUiOverlays .flist-search-wrap{padding:14px 18px}\n#esSiteUiOverlays .flist-list{overflow-y:auto;padding:0 10px 14px;flex:1;min-height:0}\n#esSiteUiOverlays #esNotifList{max-height:340px;flex:none}\n#esSiteUiOverlays .flist-empty{padding:30px 10px;text-align:center;color:var(--muted);font-size:.84rem}\n#esSiteUiOverlays .notif-mark-read{background:transparent;border:none;color:var(--accent);font-size:.76rem;font-weight:600;\n  text-decoration:underline;cursor:pointer;flex-shrink:0;}\n#esSiteUiOverlays .notif-row{position:relative;overflow:hidden;touch-action:pan-y;border-radius:10px;margin-bottom:2px}\n#esSiteUiOverlays .notif-row-inner{display:flex;flex-direction:column;gap:3px;padding:12px 10px;border-radius:10px;\n  background:var(--card);position:relative;z-index:1;transition:transform .2s var(--ease);}\n#esSiteUiOverlays .notif-row-inner.unread{background:rgba(0,224,255,.06)}\n#esSiteUiOverlays .notif-row.dragging .notif-row-inner{transition:none}\n#esSiteUiOverlays .notif-top{display:flex;align-items:center;gap:10px}\n#esSiteUiOverlays .notif-msg{font-size:.85rem;color:var(--text);line-height:1.4;flex:1}\n#esSiteUiOverlays .notif-time{font-size:.7rem;color:var(--muted)}\n#esSiteUiOverlays .notif-follow-btn{flex-shrink:0;display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:20px;\n  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;border:none;\n  font-size:.72rem;font-weight:700;}\n#esSiteUiOverlays .notif-follow-btn.following{background:transparent;border:1px solid var(--border-strong);color:var(--muted)}\n#esSiteUiOverlays .notif-follow-btn:disabled{opacity:.6;cursor:default}\n#esSiteUiOverlays .notif-view-post-btn{flex-shrink:0;padding:6px 12px;border-radius:20px;background:var(--dark3);border:1px solid var(--border-strong);\n  color:var(--text);font-size:.72rem;font-weight:700;}\n#esSiteUiOverlays .notif-view-post-btn:hover{border-color:var(--accent);color:var(--accent)}\n#esSiteUiOverlays .acc-toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,12px);opacity:0;z-index:400;\n  background:var(--card2);border:1px solid var(--border-strong);border-radius:12px;padding:11px 16px;\n  font-size:.82rem;color:var(--text);box-shadow:0 12px 32px rgba(0,0,0,.5);transition:all .3s var(--ease);\n  max-width:88vw;text-align:center;}\n#esSiteUiOverlays .acc-toast.show{transform:translate(-50%,0);opacity:1}\n#esSiteUiOverlays .notif-swipe-bg{position:absolute;inset:0;display:flex;align-items:center;gap:8px;font-size:.78rem;font-weight:700;\n  border-radius:10px;padding:0 16px;}\n#esSiteUiOverlays .notif-swipe-bg.mode-read{background:linear-gradient(90deg,rgba(0,224,255,.2),rgba(0,224,255,.04));color:var(--accent);justify-content:flex-start}\n#esSiteUiOverlays .notif-swipe-bg.mode-delete{background:linear-gradient(270deg,rgba(255,59,92,.2),rgba(255,59,92,.04));color:var(--red);justify-content:flex-end}\n#esSiteUiOverlays .notif-swipe-icon svg{width:16px;height:16px;display:block}\n#esSiteUiOverlays .acc-msg.show{display:block}\n@keyframes fsDotBounce{\n  0%,60%,100%{transform:translateY(0);opacity:.4}\n  30%{transform:translateY(-4px);opacity:1}\n}\n#esSiteUiOverlays .ch-down-overlay.show{opacity:1;pointer-events:all}\n#esSiteUiOverlays .more-ch-reopen.show{display:flex}\n#esSiteUiOverlays .connecting-overlay.show{opacity:1}\n#esSiteUiOverlays .wa-btn.dragging{opacity:.85;cursor:grabbing!important;transform:scale(1.04)!important;transition:none!important;box-shadow:0 12px 36px rgba(37,211,102,.55)!important}\n#esSiteUiOverlays .brightness-readout.show{opacity:1;transform:translate(-50%,-50%) scale(1);}\n#esSiteUiOverlays .volume-readout.show{opacity:1;transform:translate(50%,-50%) scale(1);}\n#esSiteUiOverlays .notif-nav-dot.show{display:block}\n#esSiteUiOverlays .notif-menu-dot.show{display:block}\n#esSiteUiOverlays .lg-toast{position:fixed;top:16px;left:50%;transform:translate(-50%,-160%) scale(.92);\n  display:flex;align-items:center;gap:12px;padding:10px 22px 10px 12px;border-radius:999px;\n  background:rgba(28,28,36,.55);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);\n  border:1px solid rgba(255,255,255,.16);\n  box-shadow:0 10px 40px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.16);\n  color:#fff;font-size:.86rem;font-weight:600;letter-spacing:.01em;white-space:nowrap;\n  z-index:1000;pointer-events:none;opacity:0;\n  transition:transform .6s cubic-bezier(.34,1.56,.64,1),opacity .35s ease;}\n#esSiteUiOverlays .lg-toast.show{transform:translate(-50%,0) scale(1);opacity:1}\n#esSiteUiOverlays .lg-toast .lg-icon{width:28px;height:28px;border-radius:30%;flex-shrink:0;position:relative;\n  background:rgba(255,255,255,.14);transform:scale(.4);opacity:0;\n  transition:transform .35s cubic-bezier(.34,1.56,.64,1) .04s,opacity .2s ease .04s;}\n#esSiteUiOverlays .lg-toast.show .lg-icon{transform:scale(1);opacity:1}\n#esSiteUiOverlays .lg-toast .lg-icon svg{width:16px;height:16px;overflow:visible;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);}\n#esSiteUiOverlays .lg-toast .lg-icon.success svg{color:var(--accent)}\n#esSiteUiOverlays .lg-toast .lg-icon.error svg{color:var(--red)}\n#esSiteUiOverlays .lg-toast .lg-face{transition:opacity .2s ease .42s,transform .2s ease .42s}\n#esSiteUiOverlays .lg-toast.show .lg-face{opacity:0;transform:translate(-50%,-50%) scale(.6)}\n#esSiteUiOverlays .lg-toast .lg-check-wrap{opacity:0;transform:translate(-50%,-50%) scale(.5);\n  transition:opacity .22s ease .48s,transform .22s cubic-bezier(.34,1.56,.64,1) .48s;}\n#esSiteUiOverlays .lg-toast.show .lg-check-wrap{opacity:1;transform:translate(-50%,-50%) scale(1)}\n#esSiteUiOverlays .lg-toast .lg-icon.error .lg-check-wrap{transition-delay:.04s}\n#esSiteUiOverlays .lg-toast .lg-icon-path{transition:stroke-dashoffset .28s ease .56s}\n#esSiteUiOverlays .lg-toast .lg-icon.error .lg-icon-path{transition-delay:.1s}\n#esSiteUiOverlays .lg-toast .lg-icon-path.check{stroke-dasharray:24;stroke-dashoffset:24}\n#esSiteUiOverlays .lg-toast .lg-icon-path.cross{stroke-dasharray:36;stroke-dashoffset:36}\n#esSiteUiOverlays .lg-toast.show .lg-icon-path{stroke-dashoffset:0}\n#esSiteUiOverlays .page-overlay{position:fixed;inset:0;background:rgba(10,10,15,.75);backdrop-filter:blur(8px);\n  display:none;align-items:center;justify-content:center;z-index:400;}\n#esSiteUiOverlays .page-overlay.show{display:flex}\n#esSiteUiOverlays .overlay-card{background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(255,255,255,.06);\n  border:1px solid rgba(255,255,255,.22);border-radius:16px;padding:28px 26px;\n  display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.3);max-width:320px;width:90%;}\n:root[data-theme=\"light\"] #esSiteUiOverlays .overlay-card{background:linear-gradient(155deg,rgba(255,255,255,.6),rgba(255,255,255,.2) 40%,rgba(255,255,255,.3) 100%);\n  border:1px solid rgba(255,255,255,.65);\n  box-shadow:0 20px 60px rgba(20,20,28,.16),inset 0 1px 0 rgba(255,255,255,.7);}\n#esSiteUiOverlays .overlay-title{font-family:var(--font-display);font-weight:700;font-size:1.05rem}\n#esSiteUiOverlays .overlay-sub{font-size:.85rem;color:var(--muted);line-height:1.5}\n#esSiteUiOverlays .overlay-btn-danger{background:transparent;color:var(--red);border:1px solid rgba(255,59,92,.35);\n  font-weight:700;font-size:.85rem;padding:11px 16px;border-radius:10px;width:100%;\n  display:flex;align-items:center;justify-content:center;gap:8px;transition:background .15s var(--ease);}\n#esSiteUiOverlays .overlay-btn-danger:hover{background:rgba(255,59,92,.1)}\n#esSiteUiOverlays .overlay-cancel{background:transparent;border:none;color:var(--muted);font-size:.78rem;align-self:center;text-decoration:underline;cursor:pointer}\n#esSiteUiOverlays .friend-search-card{max-width:380px;text-align:left}\n#esSiteUiOverlays .fs-input-wrap{position:relative}\n#esSiteUiOverlays .fs-input-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:15px;height:15px;opacity:.4;pointer-events:none}\n#esSiteUiOverlays .fs-input-wrap input{width:100%;background:var(--card2);border:1px solid var(--border-strong);border-radius:10px;\n  padding:11px 12px 11px 36px;color:var(--text);font-size:.88rem;outline:none;font-family:var(--font-body);\n  transition:border-color .2s var(--ease);}\n#esSiteUiOverlays .fs-input-wrap input:focus{border-color:var(--accent)}\n#esSiteUiOverlays .fs-results{max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;margin-top:2px;min-height:40px}\n#esSiteUiOverlays .fs-user{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;transition:background .15s var(--ease);cursor:pointer}\n#esSiteUiOverlays .fs-user:hover{background:var(--card2)}\n#esSiteUiOverlays .fs-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));\n  display:flex;align-items:center;justify-content:center;font-size:.78rem;font-weight:700;color:#04141a;\n  flex-shrink:0;background-size:cover;background-position:center;}\n#esSiteUiOverlays .fs-user-info{flex:1;min-width:0}\n#esSiteUiOverlays .fs-user-name{font-size:.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n#esSiteUiOverlays .fs-user-username{font-size:.74rem;color:var(--muted)}\n#esSiteUiOverlays .fs-verified-badge{display:inline-flex;vertical-align:middle;margin-left:3px;position:relative;top:-1px}\n#esSiteUiOverlays .fs-follow-btn{width:34px;height:34px;border-radius:50%;border:1px solid var(--border-strong);background:var(--card2);\n  color:var(--accent);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;\n  transition:all .18s var(--ease);}\n#esSiteUiOverlays .fs-follow-btn svg{width:16px;height:16px}\n#esSiteUiOverlays .fs-follow-btn:disabled{opacity:.5;cursor:default}\n#esSiteUiOverlays .mpv-card{width:100%;max-width:340px;\n  background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(255,255,255,.06);\n  border:1px solid rgba(255,255,255,.22);\n  border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.3);padding:26px 22px;text-align:center;}\n:root[data-theme=\"light\"] #esSiteUiOverlays .mpv-card{background:linear-gradient(155deg,rgba(255,255,255,.6),rgba(255,255,255,.2) 40%,rgba(255,255,255,.3) 100%);\n  border:1px solid rgba(255,255,255,.65);\n  box-shadow:0 20px 60px rgba(20,20,28,.16),inset 0 1px 0 rgba(255,255,255,.7);}\n#esSiteUiOverlays .mpv-avatar{width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));\n  display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;\n  font-size:1.7rem;color:#04141a;margin:0 auto 12px;background-size:cover;background-position:center;}\n#esSiteUiOverlays .mpv-name{font-family:var(--font-display);font-weight:700;font-size:1.05rem}\n#esSiteUiOverlays .mpv-username{font-size:.82rem;color:var(--muted);margin-top:2px;margin-bottom:16px}\n#esSiteUiOverlays .mpv-stats{display:flex;justify-content:center;gap:22px;margin-bottom:20px}\n#esSiteUiOverlays .mpv-stat{display:flex;flex-direction:column;align-items:center;gap:2px}\n#esSiteUiOverlays .mpv-stat-num{font-family:var(--font-display);font-weight:700;font-size:1rem}\n#esSiteUiOverlays .mpv-stat-label{font-size:.66rem;color:var(--muted);text-transform:uppercase;letter-spacing:.02em}\n#esSiteUiOverlays .mpv-view-btn{width:100%;padding:11px;border-radius:10px;border:none;font-weight:700;font-size:.85rem;\n  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;margin-bottom:8px;}\n#esSiteUiOverlays .mpv-close-text{background:transparent;border:none;color:var(--muted);font-size:.8rem;text-decoration:underline}\n#esSiteUiOverlays .fs-follow-btn.following{color:#04141a;background:linear-gradient(135deg,var(--accent),var(--accent2));border-color:transparent}\n#esSiteUiOverlays .fs-empty,#esSiteUiOverlays .fs-hint{font-size:.8rem;color:var(--muted);text-align:center;padding:20px 8px}\n#esSiteUiOverlays .fs-loading{display:flex;align-items:center;justify-content:center;gap:8px;font-size:.8rem;color:var(--muted);padding:20px 8px}\n#esSiteUiOverlays .fs-loading-dots{display:inline-flex;gap:4px}\n#esSiteUiOverlays .fs-loading-dots span{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:fsDotBounce 1.1s ease-in-out infinite}\n#esSiteUiOverlays .fs-loading-dots span:nth-child(2){animation-delay:.15s}\n#esSiteUiOverlays .fs-loading-dots span:nth-child(3){animation-delay:.3s}\n\n#esBottomNav{position:fixed;left:0;right:0;bottom:0;z-index:300;height:var(--bnav-h);display:flex;align-items:stretch;background:var(--nav-bg);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);border-top:1px solid var(--border);padding-bottom:env(safe-area-inset-bottom,0)}\n#esBottomNav .bnav-item{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:8px 4px 6px;background:transparent;border:none;color:var(--muted);font-size:.65rem;font-weight:600;letter-spacing:.01em;cursor:pointer;transition:color .2s var(--ease);font-family:var(--font-body);text-decoration:none}\n#esBottomNav .bnav-item.active{color:var(--accent)}\n#esBottomNav .bnav-icon-wrap{position:relative;display:inline-flex}\n.notif-nav-dot{position:absolute;top:2px;right:2px;width:8px;height:8px;border-radius:50%;background:var(--red);border:2px solid var(--card2);display:none;pointer-events:none}\n.notif-nav-dot.show{display:block}\n#esBottomNav .bnav-icon-wrap .notif-nav-dot{top:-3px;right:-5px;border-color:var(--nav-bg,var(--card2))}\n\n.acc-toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,12px);opacity:0;z-index:400;\n  background:var(--card2);border:1px solid var(--border-strong);border-radius:12px;padding:11px 16px;\n  font-size:.82rem;color:var(--text);box-shadow:0 12px 32px rgba(0,0,0,.5);transition:all .3s var(--ease);\n  max-width:88vw;text-align:center;}\n.acc-toast.show{transform:translate(-50%,0);opacity:1}\n.lg-toast{position:fixed;top:16px;left:50%;transform:translate(-50%,-160%) scale(.92);\n  display:flex;align-items:center;gap:12px;padding:10px 22px 10px 12px;border-radius:999px;\n  background:rgba(28,28,36,.55);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);\n  border:1px solid rgba(255,255,255,.16);\n  box-shadow:0 10px 40px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.16);\n  color:#fff;font-size:.86rem;font-weight:600;letter-spacing:.01em;white-space:nowrap;\n  z-index:1000;pointer-events:none;opacity:0;\n  transition:transform .6s cubic-bezier(.34,1.56,.64,1),opacity .35s ease;}\n.lg-toast.show{transform:translate(-50%,0) scale(1);opacity:1}\n.lg-toast .lg-icon{width:28px;height:28px;border-radius:30%;flex-shrink:0;position:relative;\n  background:rgba(255,255,255,.14);transform:scale(.4);opacity:0;\n  transition:transform .35s cubic-bezier(.34,1.56,.64,1) .04s,opacity .2s ease .04s;}\n.lg-toast.show .lg-icon{transform:scale(1);opacity:1}\n.lg-toast .lg-icon svg{width:16px;height:16px;overflow:visible;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);}\n.lg-toast .lg-icon.success svg{color:var(--accent)}\n.lg-toast .lg-icon.error svg{color:var(--red)}\n.lg-toast .lg-face{transition:opacity .2s ease .42s,transform .2s ease .42s}\n.lg-toast.show .lg-face{opacity:0;transform:translate(-50%,-50%) scale(.6)}\n.lg-toast .lg-check-wrap{opacity:0;transform:translate(-50%,-50%) scale(.5);\n  transition:opacity .22s ease .48s,transform .22s cubic-bezier(.34,1.56,.64,1) .48s;}\n.lg-toast.show .lg-check-wrap{opacity:1;transform:translate(-50%,-50%) scale(1)}\n.lg-toast .lg-icon.error .lg-check-wrap{transition-delay:.04s}\n.lg-toast .lg-icon-path{transition:stroke-dashoffset .28s ease .56s}\n.lg-toast .lg-icon.error .lg-icon-path{transition-delay:.1s}\n.lg-toast .lg-icon-path.check{stroke-dasharray:24;stroke-dashoffset:24}\n.lg-toast .lg-icon-path.cross{stroke-dasharray:36;stroke-dashoffset:36}\n.lg-toast.show .lg-icon-path{stroke-dashoffset:0}\n@keyframes skWave{0%{background-position:100% 0}100%{background-position:0 0}}\n@keyframes spin{to{transform:rotate(360deg)}}\n@keyframes fsDotBounce{\n  0%,60%,100%{transform:translateY(0);opacity:.4}\n  30%{transform:translateY(-4px);opacity:1}\n}";

const ES_EXTRA_CSS = `
.es-nav-hidden{display:none!important}
#esBottomNav{transition:transform .22s var(--ease)}
.es-menu-fab{transition:opacity .2s var(--ease),transform .15s var(--ease)}
body:has(.page-overlay.show,.pm-overlay.show,.tr-overlay.show) #esBottomNav{transform:translateY(110%);pointer-events:none}
body:has(.page-overlay.show,.pm-overlay.show,.tr-overlay.show) .es-menu-fab{opacity:0;pointer-events:none}
body.es-has-nav{padding-bottom:calc(var(--bnav-h) + env(safe-area-inset-bottom,0px))}
body.es-replaced-nav.es-has-nav{padding-bottom:0}
.es-bottom-nav{z-index:300}
.es-post-fab{flex:0 0 auto;width:48px;height:48px;margin:-14px 6px 0;border-radius:50%;padding:0;border:none;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(0,224,255,.35);align-self:flex-start;cursor:pointer;transition:transform .15s var(--ease)}
.es-post-fab:active{transform:scale(.94)}
.es-menu-fab{position:fixed;left:18px;bottom:18px;z-index:290;width:46px;height:46px;border-radius:50%;border:1px solid var(--border-strong);background:var(--nav-bg);color:var(--text);backdrop-filter:blur(20px);display:none;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.35);transition:color .15s,border-color .15s}
.es-menu-fab:hover{color:var(--accent);border-color:var(--accent)}
.es-menu-fab .notif-nav-dot{top:4px;right:4px}
.es-menu-list{display:flex;flex-direction:column;gap:1px;padding:4px 10px 12px;overflow-y:auto;flex:1;min-height:0;scrollbar-width:thin;box-sizing:border-box}
.es-menu-list .user-menu-item{width:100%;box-sizing:border-box;display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:12px;background:none;border:0;color:var(--text);font-size:.88rem;font-weight:600;text-align:left;text-decoration:none;font-family:var(--font-body);cursor:pointer;position:relative}
.es-menu-list .user-menu-item:hover{background:rgba(0,224,255,.09);color:var(--accent)}
.es-menu-list .user-menu-item.active{background:linear-gradient(90deg,rgba(0,224,255,.14),rgba(124,92,255,.14));box-shadow:inset 0 0 0 1px rgba(0,224,255,.25)}
.es-menu-list .user-menu-item svg{width:20px;height:20px;flex-shrink:0}
.es-menu-list .user-menu-item[hidden]{display:none}
.es-menu-list .user-menu-item .notif-menu-dot{position:static;margin-left:auto;display:none;width:8px;height:8px;border-radius:50%;background:var(--red)}
.es-menu-list .user-menu-item .notif-menu-dot.show{display:block}
.es-menu-sep{height:1px;background:var(--border);margin:6px 4px}
.es-menu-me{display:flex;align-items:center;gap:12px;padding:6px 18px 8px;text-decoration:none;color:inherit}
.es-menu-avatar{width:42px;height:42px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--accent),var(--accent2)) center/cover no-repeat;color:#04141a;font-family:var(--font-display);font-weight:700;display:flex;align-items:center;justify-content:center;overflow:hidden}
.es-menu-name{font-weight:700;font-size:.9rem;line-height:1.2;display:flex;align-items:center}
.es-menu-name .pf-verified{display:inline-flex;margin-left:5px;position:relative;top:0;flex-shrink:0}
.es-menu-user{font-size:.76rem;color:var(--muted)}
.es-menu-card{max-width:380px;max-height:88vh}
.es-busy{position:relative!important;pointer-events:none!important;color:transparent!important;text-shadow:none!important;transition:none!important}
.es-busy>*{opacity:0!important}
.es-busy::after{content:"";position:absolute;left:50%;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:2px solid var(--es-ring-soft,rgba(255,255,255,.3));border-top-color:var(--es-ring,#fff);animation:esRoll .6s linear infinite;box-sizing:border-box}
.es-busy.es-busy-icon>*{opacity:.18!important}
@keyframes esRoll{to{transform:rotate(360deg)}}
@media (min-width:900px){
  .es-bottom-nav{display:none!important}
  body.es-has-nav{padding-bottom:0}
  .es-menu-fab{display:flex}
  body.es-home .es-menu-fab{display:none}
}
@media (max-width:899px){
  body.es-has-nav .acc-deploy-fab,body.es-has-nav .acc-promote-fab,body.es-has-nav .acc-cert-fab,body.es-has-nav .acc-support-fab,body.es-has-nav .pf-feed-fab,body.es-has-nav .cr-support-fab,body.es-has-nav .tr-settings-fab,body.es-has-nav .tr-fab-stack,body.es-has-nav .acc-toast,body.es-has-nav .pf-toast,body.es-has-nav .music-player,body.es-has-nav .db-toast,body.es-has-nav .pm-toast,body.es-has-nav .tr-toast,body.es-has-nav .pn-card{transform:translateY(calc(-1 * (var(--bnav-h) + env(safe-area-inset-bottom,0px))))}
}
`;
(function () {
  const st = document.createElement("style");
  st.id = "esSiteUiStyle";
  st.textContent = SITE_UI_CSS + ES_EXTRA_CSS;
  document.head.appendChild(st);
  const holder = document.createElement("div");
  holder.id = "esSiteUiOverlays";
  holder.innerHTML = SITE_UI_MARKUP;
  document.body.appendChild(holder);
})();


async function postJSON(url, body, timeoutMs){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 12000);
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: controller.signal });
  } catch (err) {
    throw new Error(err.name === 'AbortError' ? 'This is taking longer than expected.' : 'Request failed');
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
async function getJSON(url){
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function notifFormatTime(ts){
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
function showToast(message){
  const toast = document.createElement('div');
  toast.className = 'acc-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2800);
}

function updateNotifTitle(list){
  const unreadCount = list.filter(n => !n.read).length;
  document.getElementById('esNotifTitle').textContent = 'Notifications' + (unreadCount > 0 ? ' (' + unreadCount + ')' : '');
}

const NOTIF_CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>';
const NOTIF_TRASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>';

function refreshNotifTitleFromDOM(){
  const unreadCount = document.querySelectorAll('#esNotifList .notif-row-inner.unread').length;
  document.getElementById('esNotifTitle').textContent = 'Notifications' + (unreadCount > 0 ? ' (' + unreadCount + ')' : '');
}

function wireNotifSwipe(row, notifId){
  const inner = row.querySelector('.notif-row-inner');
  const bg = row.querySelector('.notif-swipe-bg');
  const bgIcon = bg.querySelector('.notif-swipe-icon');
  const bgLabel = bg.querySelector('.notif-swipe-label');
  let startX = null;
  let currentX = 0;
  let dismissed = false;

  function onStart(x, target){
    if (target && target.closest('button')) { startX = null; return; }
    startX = x; currentX = 0; row.classList.add('dragging');
  }
  function onMove(x){
    if (startX === null) return;
    currentX = x - startX;
    inner.style.transform = 'translateX(' + currentX + 'px)';
    if (currentX > 0) {
      bg.classList.remove('mode-delete');
      bg.classList.add('mode-read');
      bgIcon.innerHTML = NOTIF_CHECK_ICON;
      bgLabel.textContent = inner.classList.contains('unread') ? 'Mark as read' : 'Mark as unread';
    } else if (currentX < 0) {
      bg.classList.remove('mode-read');
      bg.classList.add('mode-delete');
      bgIcon.innerHTML = NOTIF_TRASH_ICON;
      bgLabel.textContent = 'Delete';
    }
  }
  async function onEnd(){
    if (startX === null) return;
    row.classList.remove('dragging');
    startX = null;
    if (dismissed) return;

    if (currentX > 90) {
      dismissed = true;
      const wasUnread = inner.classList.contains('unread');
      inner.style.transform = 'translateX(100%)';
      inner.style.opacity = '0';
      try {
        const result = await postJSON('/api/notifications/' + notifId + '/toggle-read', {});
        inner.classList.toggle('unread', !result.read);
        if (result.read) {
          showToast('Marked as Read');
        } else {
          showToast('Marked as Unread');
          document.getElementById('esNotifDot').classList.add('show');
        }
      } catch (err) {}
      setTimeout(() => {
        inner.style.transform = '';
        inner.style.opacity = '1';
        refreshNotifTitleFromDOM();
        dismissed = false;
      }, 250);
    } else if (currentX < -90) {
      dismissed = true;
      inner.style.transform = 'translateX(-100%)';
      inner.style.opacity = '0';
      try {
        await postJSON('/api/notifications/' + notifId + '/delete', {});
        showToast('Notification deleted');
        setTimeout(() => {
          row.remove();
          refreshNotifTitleFromDOM();
          if (!document.getElementById('esNotifList').children.length) {
            document.getElementById('esNotifList').innerHTML = '<div class="flist-empty">No notifications yet.</div>';
          }
        }, 220);
      } catch (err) {
        dismissed = false;
        inner.style.transform = '';
        inner.style.opacity = '1';
      }
    } else {
      inner.style.transform = '';
    }
  }

  row.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX, e.target), { passive: true });
  row.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
  row.addEventListener('touchend', onEnd);
  row.addEventListener('mousedown', (e) => onStart(e.clientX, e.target));
  row.addEventListener('mousemove', (e) => { if (startX !== null) onMove(e.clientX); });
  row.addEventListener('mouseup', onEnd);
  row.addEventListener('mouseleave', () => { if (startX !== null) onEnd(); });
}

function notifRender(list){
  const listEl = document.getElementById('esNotifList');
  listEl.innerHTML = '';
  updateNotifTitle(list);
  if (!list.length) {
    listEl.innerHTML = '<div class="flist-empty">No notifications yet.</div>';
    return;
  }
  list.forEach(n => {
    const row = document.createElement('div');
    row.className = 'notif-row';
    row.dataset.id = n.id;

    const swipeBg = document.createElement('div');
    swipeBg.className = 'notif-swipe-bg';
    swipeBg.innerHTML = '<span class="notif-swipe-icon"></span><span class="notif-swipe-label"></span>';
    row.appendChild(swipeBg);

    const inner = document.createElement('div');
    inner.className = 'notif-row-inner' + (n.read ? '' : ' unread');

    const top = document.createElement('div');
    top.className = 'notif-top';
    const msg = document.createElement('div');
    msg.className = 'notif-msg';
    msg.textContent = n.message;
    top.appendChild(msg);
    if (n.type === 'follow' && n.meta && n.meta.followerUid) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'notif-follow-btn' + (n.followingBack ? ' following' : '');
      btn.textContent = n.followingBack ? 'Following' : 'Follow back';
      btn.dataset.uid = n.meta.followerUid;
      top.appendChild(btn);
    }
    if ((n.type === 'like' || n.type === 'tag' || n.type === 'reshare' || n.type === 'comment') && n.meta && n.meta.postUrl) {
      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'notif-view-post-btn';
      viewBtn.textContent = 'View Post';
      viewBtn.addEventListener('click', () => { window.location.href = n.meta.postUrl; });
      top.appendChild(viewBtn);
    }
    if (n.type === 'verified') {
      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'notif-view-post-btn';
      viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', () => {
        document.getElementById('esNotifOverlay').classList.remove('show');
        openCertOverlay();
      });
      top.appendChild(viewBtn);
    }
    if (n.type === 'withdrawal_paid') {
      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'notif-view-post-btn';
      viewBtn.textContent = 'View Certificate';
      viewBtn.addEventListener('click', () => {
        document.getElementById('esNotifOverlay').classList.remove('show');
        showRewards();
        loadRewardsSummary().then(() => {
          if (n.meta && n.meta.withdrawalId) openWithdrawalCertificate(n.meta.withdrawalId);
        });
      });
      top.appendChild(viewBtn);
    }
    if (n.type === 'channel_react_confirmed' || n.type === 'channel_react_declined') {
      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'notif-view-post-btn';
      viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', () => { window.location.href = '/channel-react'; });
      top.appendChild(viewBtn);
    }
    if (n.type === 'referral_signup' || n.type === 'referral_commission' || n.type === 'coin_redeem' || n.type === 'coin_purchase') {
      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'notif-view-post-btn';
      viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', () => {
        document.getElementById('esNotifOverlay').classList.remove('show');
        showRewards();
      });
      top.appendChild(viewBtn);
    }
    const time = document.createElement('div');
    time.className = 'notif-time';
    time.textContent = notifFormatTime(n.createdAt);
    inner.appendChild(top);
    inner.appendChild(time);
    row.appendChild(inner);
    listEl.appendChild(row);
    if (n.id) wireNotifSwipe(row, n.id);
  });
}
document.getElementById('esNotifList').addEventListener('click', async (e) => {
  const btn = e.target.closest('.notif-follow-btn');
  if (!btn || btn.disabled) return;
  const isFollowingNow = btn.classList.contains('following');
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.innerHTML = '<span class="btn-spinner" style="margin-right:0"></span>';
  try {
    const res = await fetch('/api/' + (isFollowingNow ? 'unfollow' : 'follow') + '/' + btn.dataset.uid, { method: 'POST' });
    if (!res.ok) throw new Error();
    btn.classList.toggle('following', !isFollowingNow);
    btn.textContent = !isFollowingNow ? 'Following' : 'Follow back';
  } catch (err) {
    btn.textContent = originalText;
  } finally {
    btn.disabled = false;
  }
});
async function openNotifOverlay(){
  const overlay = document.getElementById('esNotifOverlay');
  document.getElementById('esNotifList').innerHTML = '<div class="sk-stack"><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div></div>';
  overlay.classList.add('show');
  refreshPushButton();
  try {
    const data = await getJSON('/api/notifications');
    notifRender(data.results || []);
  } catch (err) {
    document.getElementById('esNotifList').innerHTML = '<div class="flist-empty">Could not load notifications. Try again.</div>';
  }
}
async function refreshPushButton(){
  const btn = document.getElementById('esNotifEnablePushBtn');
  if (!window.ESPush) { btn.style.display = 'none'; return; }
  const status = await ESPush.getStatus();
  if (status === 'unsupported') {
    btn.style.display = 'none';
    return;
  }
  if (status === 'granted') {
    const active = await ESPush.hasActiveSubscription();
    if (active) {
      btn.style.display = 'none';
      return;
    }
    btn.style.display = '';
    btn.textContent = 'Re-enable notifications';
    btn.disabled = false;
    return;
  }
  btn.style.display = '';
  btn.textContent = 'Enable notifications';
  btn.disabled = false;
}
document.getElementById('esNotifEnablePushBtn').addEventListener('click', async () => {
  const btn = document.getElementById('esNotifEnablePushBtn');
  btn.disabled = true;
  btn.textContent = 'Enabling...';
  try {
    await ESPush.enable();
    btn.style.display = 'none';
    showToast('Notifications enabled');
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Enable notifications';
    showToast(err.message || 'Could not enable notifications');
  }
});
document.getElementById('esNotifBellBtn').addEventListener('click', openNotifOverlay);
document.getElementById('esNotifCloseBtn').addEventListener('click', () => {
  document.getElementById('esNotifOverlay').classList.remove('show');
});
document.getElementById('esNotifOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'esNotifOverlay') document.getElementById('esNotifOverlay').classList.remove('show');
});
document.getElementById('esNotifMarkReadBtn').addEventListener('click', async () => {
  const btn = document.getElementById('esNotifMarkReadBtn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner" style="margin-right:4px"></span>Marking…';
  try {
    await postJSON('/api/notifications/mark-all-read', {});
    document.getElementById('esNotifDot').classList.remove('show');
    document.querySelectorAll('#esNotifList .notif-row-inner.unread').forEach(el => el.classList.remove('unread'));
    document.getElementById('esNotifTitle').textContent = 'Notifications';
  } catch (err) {}
  btn.textContent = originalText;
  btn.disabled = false;
});

var LG_ICONS = {
  success: '<svg class="lg-face" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 8V6a2 2 0 012-2h2"/><path d="M16 4h2a2 2 0 012 2v2"/><path d="M20 16v2a2 2 0 01-2 2h-2"/><path d="M8 20H6a2 2 0 01-2-2v-2"/><circle cx="9" cy="10" r=".65" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r=".65" fill="currentColor" stroke="none"/><path d="M9 15c1 1 5 1 6 0"/></svg><svg class="lg-check-wrap" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path class="lg-icon-path check" stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>',
  error: '<svg class="lg-check-wrap" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path class="lg-icon-path cross" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>'
};
function showLiquidToast(message, type){
  var kind = type === 'error' ? 'error' : 'success';
  var toast = document.createElement('div');
  toast.className = 'lg-toast';
  toast.innerHTML = '<span class="lg-icon ' + kind + '">' + LG_ICONS[kind] + '</span><span></span>';
  toast.querySelector('span:last-child').textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ toast.classList.add('show'); }); });
  setTimeout(function(){
    toast.classList.remove('show');
    setTimeout(function(){ toast.remove(); }, 500);
  }, 2600);
}

var FS_ADD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path stroke-linecap="round" d="M19 8v6M22 11h-6"/></svg>';
var FS_FOLLOWING_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 11l2 2 4-4"/></svg>';
var FS_VERIFIED_BADGE = '<svg class="fs-verified-badge" viewBox="0 0 24 24" width="14" height="14" aria-label="Verified"><path fill="#00E0FF" d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/><path fill="none" stroke="#04141a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M8.3 12.2l2.4 2.3 4.7-5.1"/></svg>';
function fsEsc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
var fsDebounceTimer = null;

function openFriendSearch(){
  var overlay = document.getElementById('esFriendSearchOverlay');
  if (!overlay) return;
  overlay.classList.add('show');
  var input = document.getElementById('esFsInput');
  var results = document.getElementById('esFsResults');
  input.value = '';
  results.innerHTML = '<div class="fs-hint">Type a username to find friends</div>';
  setTimeout(function(){ input.focus(); }, 150);
}

function closeFriendSearch(){
  var overlay = document.getElementById('esFriendSearchOverlay');
  if (overlay) overlay.classList.remove('show');
}

function fsRenderUser(u){
  var row = document.createElement('div');
  row.className = 'fs-user';
  row.dataset.uid = u.uid;

  var avatar = document.createElement('div');
  avatar.className = 'fs-avatar';
  if (u.photoURL) {
    avatar.style.backgroundImage = 'url(' + u.photoURL + ')';
  } else {
    avatar.textContent = ((u.firstName || '')[0] || u.username[0] || '?').toUpperCase();
  }

  var info = document.createElement('div');
  info.className = 'fs-user-info';
  var name = document.createElement('div');
  name.className = 'fs-user-name';
  name.innerHTML = fsEsc((u.firstName || u.lastName) ? ((u.firstName || '') + ' ' + (u.lastName || '')).trim() : ('@' + u.username)) + ((u.isAdmin || u.verified) ? FS_VERIFIED_BADGE : '');
  var uname = document.createElement('div');
  uname.className = 'fs-user-username';
  uname.textContent = '@' + (u.matchedAltUsername || u.username);
  info.appendChild(name);
  info.appendChild(uname);

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fs-follow-btn' + (u.isFollowing ? ' following' : '');
  btn.innerHTML = u.isFollowing ? FS_FOLLOWING_ICON : FS_ADD_ICON;
  btn.setAttribute('aria-label', u.isFollowing ? 'Unfollow' : 'Add friend');
  btn.addEventListener('click', function(e){ e.stopPropagation(); fsToggleFollow(u.uid, btn); });

  row.appendChild(avatar);
  row.appendChild(info);
  row.appendChild(btn);
  row.addEventListener('click', function(){ openMiniPreview(u.username); });
  return row;
}

function formatCount(n){
  n = Number(n) || 0;
  var units = [{ v: 1e9, s: 'B' }, { v: 1e6, s: 'm' }, { v: 1e3, s: 'k' }];
  for (var i = 0; i < units.length; i++) {
    var u = units[i];
    if (n >= u.v) {
      var val = Math.floor((n / u.v) * 10) / 10;
      return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + u.s;
    }
  }
  return String(n);
}

async function openMiniPreview(username){
  var overlay = document.getElementById('esMpvOverlay');
  document.getElementById('esMpvName').textContent = 'Loading…';
  document.getElementById('esMpvUsername').textContent = '';
  document.getElementById('esMpvAvatar').style.backgroundImage = '';
  document.getElementById('esMpvAvatar').textContent = '-';
  document.getElementById('esMpvFollowers').textContent = '0';
  document.getElementById('esMpvFollowing').textContent = '0';
  document.getElementById('esMpvLikes').textContent = '0';
  overlay.classList.add('show');
  try {
    var res = await fetch('/api/users/' + encodeURIComponent(username) + '/public');
    if (!res.ok) throw new Error();
    var u = await res.json();
    var avatar = document.getElementById('esMpvAvatar');
    if (u.photoURL) {
      avatar.style.backgroundImage = 'url(' + u.photoURL + ')';
      avatar.textContent = '';
    } else {
      avatar.textContent = ((u.firstName || '')[0] || (u.username || '?')[0] || '?').toUpperCase();
    }
    document.getElementById('esMpvName').innerHTML = fsEsc((u.firstName || u.lastName) ? ((u.firstName || '') + ' ' + (u.lastName || '')).trim() : ('@' + u.username)) + ((u.isAdmin || u.verified) ? FS_VERIFIED_BADGE : '');
    document.getElementById('esMpvUsername').textContent = '@' + u.username;
    document.getElementById('esMpvFollowers').textContent = formatCount(u.followers != null ? u.followers : 0);
    document.getElementById('esMpvFollowing').textContent = formatCount(u.following != null ? u.following : 0);
    document.getElementById('esMpvLikes').textContent = formatCount(u.likes != null ? u.likes : 0);
    document.getElementById('esMpvViewBtn').onclick = function(){ window.location.href = '/u/' + encodeURIComponent(u.username); };
  } catch (err) {
    document.getElementById('esMpvName').textContent = 'Could not load this profile.';
  }
}
document.getElementById('esMpvCloseBtn').addEventListener('click', function(){
  document.getElementById('esMpvOverlay').classList.remove('show');
});
document.getElementById('esMpvOverlay').addEventListener('click', function(e){
  if (e.target.id === 'esMpvOverlay') document.getElementById('esMpvOverlay').classList.remove('show');
});

async function fsToggleFollow(uid, btn){
  var isFollowingNow = btn.classList.contains('following');
  btn.disabled = true;
  try {
    var res = await fetch('/api/' + (isFollowingNow ? 'unfollow' : 'follow') + '/' + uid, { method: 'POST' });
    if (!res.ok) throw new Error();
    btn.classList.toggle('following', !isFollowingNow);
    btn.innerHTML = !isFollowingNow ? FS_FOLLOWING_ICON : FS_ADD_ICON;
    btn.setAttribute('aria-label', !isFollowingNow ? 'Unfollow' : 'Add friend');
  } catch (err) {
    showLiquidToast('Something went wrong. Try again.', 'error');
  } finally {
    btn.disabled = false;
  }
}

var fsSearchToken = 0;
function fsRunSearch(q){
  var results = document.getElementById('esFsResults');
  var myToken = ++fsSearchToken;
  if (!q) {
    results.innerHTML = '<div class="fs-hint">Type a username to find friends</div>';
    return;
  }
  results.innerHTML = '<div class="fs-loading"><span class="fs-loading-dots"><span></span><span></span><span></span></span>Searching</div>';
  fetch('/api/users/search?q=' + encodeURIComponent(q))
    .then(function(r){ return r.ok ? r.json() : Promise.reject(); })
    .then(function(data){
      if (myToken !== fsSearchToken) return; 
      var list = data.results || [];
      results.innerHTML = '';
      if (!list.length) {
        results.innerHTML = '<div class="fs-empty">No users found for "' + q.replace(/</g, '&lt;') + '"</div>';
        return;
      }
      list.forEach(function(u){ results.appendChild(fsRenderUser(u)); });
    })
    .catch(function(){
      if (myToken !== fsSearchToken) return;
      results.innerHTML = '<div class="fs-empty">Search failed. Try again.</div>';
    });
}



(function(){
  var esFsInput = document.getElementById('esFsInput');
  var esFsCloseBtn = document.getElementById('esFsCloseBtn');
  var fsOverlay = document.getElementById('esFriendSearchOverlay');
  if (esFsInput) {
    esFsInput.addEventListener('input', function(){
      var q = esFsInput.value.trim();
      clearTimeout(fsDebounceTimer);
      fsDebounceTimer = setTimeout(function(){ fsRunSearch(q); }, 300);
    });
  }
  if (esFsCloseBtn) esFsCloseBtn.addEventListener('click', closeFriendSearch);
  if (fsOverlay) {
    fsOverlay.addEventListener('click', function(e){
      if (e.target === fsOverlay) closeFriendSearch();
    });
  }
})();

const ES_VERIFIED_BADGE = '<svg class="pf-verified" viewBox="0 0 24 24" width="18" height="18" aria-label="Verified"><path fill="#00E0FF" d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/><path fill="none" stroke="#04141a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M8.3 12.2l2.4 2.3 4.7-5.1"/></svg>';
const ES_LINKS = [
  { href: "/", label: "Home", icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>' },
  { href: "/live", label: "Live TV", icon: '<rect x="2" y="4" width="20" height="14" rx="2.5"/><path stroke-linecap="round" d="M8 21h8"/><path d="M10.5 8.5l4 2.5-4 2.5z" fill="currentColor" stroke="none"/>' },
  { href: "/profile", label: "Profile", icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
  { href: "/football", label: "Football", icon: '<circle cx="12" cy="12" r="9"/><path stroke-linejoin="round" d="M12 8l3.5 2.5-1.3 4h-4.4l-1.3-4z"/><path stroke-linecap="round" d="M12 3v5M20.5 9.5L15.5 10.5M17.5 19l-3.3-4.5M6.5 19l3.3-4.5M3.5 9.5l5 1"/>' },
  { href: "/tools", label: "Tools", icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>' },
  { href: "/tools/trading", label: "Trading", icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 17l6-6 4 4 8-8"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 7h6v6"/>' },
  { href: "/promote", label: "Promote", icon: '<path d="m3 11 18-5v12L3 14v-3z" stroke-linejoin="round"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" stroke-linecap="round"/>' },
  { href: "/channel-react", label: "Channel Reaction", icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z"/>' },
  { href: "/deploy-bot", label: "Deploy Bot", icon: '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="8.5" cy="16" r="1" fill="currentColor"/><circle cx="15.5" cy="16" r="1" fill="currentColor"/><path stroke-linecap="round" d="M12 11V7M9 3h6"/>' },
  { href: "/developers", label: "Developers", icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>' },
  { href: "/account", label: "Account", icon: '<circle cx="12" cy="12" r="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>', dot: true },
];
const ES_ICON_SEARCH = '<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>';
const ES_ICON_BELL = '<path stroke-linecap="round" stroke-linejoin="round" d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/>';
const ES_ICON_MOON = '<path stroke-linecap="round" stroke-linejoin="round" d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>';
const ES_ICON_SHIELD = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-4z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4"/>';
const ES_ICON_LOGOUT = '<path stroke-linecap="round" stroke-linejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>';
const ES_ICON_MENU = '<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>';
const ES_ICON_PLUS = '<path stroke-linecap="round" d="M12 5v14M5 12h14"/>';
const ES_ICON_HOME = ES_LINKS[0].icon;
const ES_ICON_LIVE = ES_LINKS[1].icon;
const ES_ICON_USER = ES_LINKS[2].icon;

function esSvg(inner, size, cls) {
  const ns = "http://www.w3.org/2000/svg";
  const s = document.createElementNS(ns, "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("fill", "none");
  s.setAttribute("stroke", "currentColor");
  s.setAttribute("stroke-width", "1.8");
  s.setAttribute("aria-hidden", "true");
  if (size) { s.setAttribute("width", String(size)); s.setAttribute("height", String(size)); }
  if (cls) s.setAttribute("class", cls);
  s.innerHTML = inner;
  return s;
}

function esEl(tag, props, kids) {
  const n = document.createElement(tag);
  Object.keys(props || {}).forEach((k) => {
    const v = props[k];
    if (v == null || v === false) return;
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  });
  (kids || []).forEach((c) => { if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
  return n;
}

const ES_DEFAULTS = { "--bnav-h": "58px", "--nav-bg": "rgba(10,10,15,.98)", "--ease": "cubic-bezier(.22,1,.36,1)", "--red": "#FF3B5C", "--accent": "#00E0FF", "--accent2": "#7c5cff", "--card2": "#1B1B27", "--border": "rgba(255,255,255,.07)", "--border-strong": "rgba(255,255,255,.13)", "--text": "#F3F3FA", "--muted": "rgba(255,255,255,.42)", "--muted2": "rgba(255,255,255,.22)", "--font-body": "Inter,-apple-system,sans-serif", "--font-display": "'Space Grotesk',Inter,sans-serif", "--font-mono": "ui-monospace,monospace" };
(function () {
  const cs = getComputedStyle(document.documentElement);
  Object.keys(ES_DEFAULTS).forEach((k) => {
    if (!cs.getPropertyValue(k).trim()) document.documentElement.style.setProperty(k, ES_DEFAULTS[k]);
  });
})();



const esState = { me: null, nav: false, ready: false };

function esActivePath() {
  const p = location.pathname.replace(/\/+$/, "") || "/";
  return p;
}

function esIsActive(href) {
  const p = esActivePath();
  if (href === "/") return p === "/";
  if (href === "/tools" && (p === "/tools/trading" || p.indexOf("/tools/trading/") === 0)) return false;
  return p === href || p.indexOf(href + "/") === 0 || (href === "/profile" && p.indexOf("/u/") === 0 && esState.me && p === "/u/" + esState.me.username);
}

function esSetDots(on) {
  document.querySelectorAll(".js-dot").forEach((el) => el.classList.toggle("show", !!on));
}

function esRefreshDots() {
  if (document.visibilityState !== "visible") return;
  fetch("/api/notifications/unread", { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : { hasUnread: false }))
    .then((d) => esSetDots(!!d.hasUnread))
    .catch(() => {});
}

function esThemeToggle() {
  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  try { localStorage.setItem("theme", next); } catch (e) {}
  document.documentElement.setAttribute("data-theme", next);
  const meta = document.getElementById("themeColorMeta");
  if (meta) meta.setAttribute("content", next === "light" ? "#F5F6FA" : "#0A0A0F");
}

function esOpenOverlay(id) {
  const o = document.getElementById(id);
  if (o) o.classList.add("show");
}

function esCloseOverlay(id) {
  const o = document.getElementById(id);
  if (o) o.classList.remove("show");
}

function esOpenLogout() {
  esCloseOverlay("esMenuOverlay");
  esOpenOverlay("esLogoutOverlay");
}

function esOpenSearch() {
  esCloseOverlay("esMenuOverlay");
  openFriendSearch();
}

function esOpenNotifications() {
  esCloseOverlay("esMenuOverlay");
  openNotifOverlay();
}

function esBuildMenu() {
  const overlay = esEl("div", { class: "page-overlay", id: "esMenuOverlay", role: "dialog", "aria-modal": "true", "aria-label": "Menu" });
  const card = esEl("div", { class: "flist-card es-menu-card" });
  const header = esEl("div", { class: "flist-header" }, [
    esEl("div", { class: "flist-title", text: "Menu" }),
    esEl("button", { type: "button", class: "flist-close", "aria-label": "Close", onclick: () => esCloseOverlay("esMenuOverlay") }, [esSvg('<path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/>', 20)])
  ]);
  const me = esEl("a", { class: "es-menu-me", id: "esMenuMe", href: "/profile", hidden: true });
  const list = esEl("div", { class: "es-menu-list", id: "esMenuList" });

  function item(link) {
    const a = esEl("a", { class: "user-menu-item", href: link.href, "data-es-href": link.href }, [esSvg(link.icon, 20), link.label]);
    if (link.dot) a.appendChild(esEl("span", { class: "notif-menu-dot js-dot" }));
    return a;
  }
  function action(label, icon, fn, extra) {
    const b = esEl("button", { type: "button", class: "user-menu-item" + (extra ? " " + extra : ""), onclick: fn }, [esSvg(icon, 20), label]);
    return b;
  }
  ES_LINKS.slice(0, 2).forEach((l) => list.appendChild(item(l)));
  const notif = action("Notifications", ES_ICON_BELL, esOpenNotifications);
  notif.appendChild(esEl("span", { class: "notif-menu-dot js-dot" }));
  list.appendChild(notif);
  list.appendChild(action("Find people", ES_ICON_SEARCH, esOpenSearch));
  ES_LINKS.slice(2).forEach((l) => list.appendChild(item(l)));
  const admin = item({ href: "/admin", label: "Admin", icon: ES_ICON_SHIELD });
  admin.hidden = true;
  admin.id = "esMenuAdmin";
  list.appendChild(admin);
  list.appendChild(esEl("div", { class: "es-menu-sep" }));
  list.appendChild(action("Switch theme", ES_ICON_MOON, esThemeToggle));
  list.appendChild(action("Logout", ES_ICON_LOGOUT, esOpenLogout, "user-menu-logout"));

  card.appendChild(header);
  card.appendChild(me);
  card.appendChild(list);
  overlay.appendChild(card);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) esCloseOverlay("esMenuOverlay"); });
  list.addEventListener("click", (e) => { if (e.target.closest("a")) esCloseOverlay("esMenuOverlay"); });
  document.getElementById("esSiteUiOverlays").appendChild(overlay);
  esMarkActive();
}

function esMarkActive() {
  document.querySelectorAll("#esMenuList [data-es-href]").forEach((a) => a.classList.toggle("active", esIsActive(a.getAttribute("data-es-href"))));
  document.querySelectorAll("#esBottomNav [data-es-href]").forEach((a) => a.classList.toggle("active", esIsActive(a.getAttribute("data-es-href"))));
}

function esOpenMenu() {
  esOpenOverlay("esMenuOverlay");
}

function esGoCompose() {
  if (esActivePath() === "/") {
    const t = document.getElementById("hmText");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (t) t.focus({ preventScroll: true });
    return;
  }
  window.location.href = "/?compose=1";
}

function esBuildBottomNav() {
  const nav = esEl("nav", { class: "bottom-nav es-bottom-nav", id: "esBottomNav", "aria-label": "Main" });
  function tab(href, label, icon, extra) {
    const wrap = esEl("span", { class: "bnav-icon-wrap" }, [esSvg(icon, 22)]);
    if (extra) wrap.appendChild(esEl("span", { class: "notif-nav-dot js-dot" }));
    return esEl("a", { class: "bnav-item", href: href, "data-es-href": href }, [wrap, label]);
  }
  nav.appendChild(tab("/", "Home", ES_ICON_HOME));
  nav.appendChild(tab("/live", "Live TV", ES_ICON_LIVE));
  nav.appendChild(esEl("button", { type: "button", class: "es-post-fab", "aria-label": "New post", onclick: esGoCompose }, [esSvg(ES_ICON_PLUS, 24)]));
  nav.appendChild(tab("/profile", "Profile", ES_ICON_USER));
  const more = esEl("button", { type: "button", class: "bnav-item", "aria-label": "Menu", onclick: esOpenMenu }, [
    esEl("span", { class: "bnav-icon-wrap" }, [esSvg(ES_ICON_MENU, 22), esEl("span", { class: "notif-nav-dot js-dot" })]),
    "More"
  ]);
  nav.appendChild(more);
  document.body.appendChild(nav);
  const fab = esEl("button", { type: "button", class: "es-menu-fab", "aria-label": "Menu", onclick: esOpenMenu }, [esSvg(ES_ICON_MENU, 22), esEl("span", { class: "notif-nav-dot js-dot" })]);
  document.body.appendChild(fab);
  document.body.classList.add("es-has-nav");
  const oldNav = document.getElementById("bottomNav");
  if (oldNav) {
    oldNav.style.setProperty("display", "none", "important");
    document.body.classList.add("es-replaced-nav");
  }
  esState.nav = true;
}

function esApplyMe() {
  const me = esState.me;
  if (!me) return;
  const card = document.getElementById("esMenuMe");
  if (card) {
    card.hidden = false;
    card.setAttribute("href", me.username ? "/u/" + encodeURIComponent(me.username) : "/profile");
    card.textContent = "";
    const av = esEl("span", { class: "es-menu-avatar" });
    if (me.photoURL) av.style.backgroundImage = 'url("' + me.photoURL + '")';
    else av.textContent = (((me.firstName || "")[0] || (me.username || "?")[0] || "?")).toUpperCase();
    card.appendChild(av);
    const nameEl = esEl("div", { class: "es-menu-name", text: ((me.firstName || "") + " " + (me.lastName || "")).trim() || ("@" + (me.username || "")) });
    if (me.verified || me.isAdmin) {
      const badge = esEl("span", { style: "display:inline-flex" });
      badge.innerHTML = ES_VERIFIED_BADGE;
      nameEl.appendChild(badge);
    }
    card.appendChild(esEl("div", null, [
      nameEl,
      esEl("div", { class: "es-menu-user", text: me.username ? "@" + me.username : "" })
    ]));
  }
  const admin = document.getElementById("esMenuAdmin");
  if (admin) admin.hidden = !me.isAdmin;
  esMarkActive();
}

function esLoadMe() {
  return fetch("/api/profile", { credentials: "same-origin" }).then((r) => {
    if (!r.ok) throw new Error("guest");
    return r.json();
  }).then((p) => {
    esState.me = { uid: p.uid, username: p.username || "", firstName: p.firstName || "", lastName: p.lastName || "", photoURL: p.showProfilePhoto === false ? null : (p.photoURL || null), isAdmin: !!p.isAdmin, verified: !!p.verified };
    try { sessionStorage.setItem("es_me", JSON.stringify(esState.me)); } catch (e) {}
    return esState.me;
  });
}

const esBusy = { last: null, lastAt: 0 };

function esBusyOn(btn) {
  if (!btn || btn.classList.contains("es-busy") || btn.hasAttribute("data-nospin")) return null;
  if (btn.matches && btn.matches(".pf-post-heart,.comment-like-btn,.flist-close,.es-post-fab,.pf-post-more-btn,.post-opt-btn,.pf-composer-send-btn,.pf-post-reshare-btn,.pf-post-comment-btn")) return null;
  const cs = getComputedStyle(btn);
  const color = cs.color;
  btn.style.setProperty("--es-ring", color);
  btn.style.setProperty("--es-ring-soft", color.replace(/rgb\(([^)]+)\)/, "rgba($1,.28)"));
  const iconOnly = !btn.textContent.trim();
  btn.classList.add("es-busy");
  if (iconOnly) btn.classList.add("es-busy-icon");
  const w = btn.getBoundingClientRect().width;
  btn.style.minWidth = w + "px";
  return function done() {
    btn.classList.remove("es-busy", "es-busy-icon");
    btn.style.minWidth = "";
    btn.style.removeProperty("--es-ring");
    btn.style.removeProperty("--es-ring-soft");
  };
}

(function () {
  document.addEventListener("click", function (e) {
    const btn = e.target.closest && e.target.closest("button, .btn, [role=button]");
    if (btn && !btn.disabled) { esBusy.last = btn; esBusy.lastAt = Date.now(); }
  }, true);
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    const method = ((init && init.method) || (input && input.method) || "GET").toUpperCase();
    let done = null;
    const btn = esBusy.last;
    if (btn && method !== "GET" && Date.now() - esBusy.lastAt < 700 && document.contains(btn) && url.indexOf("/api/sp/") === -1) {
      done = esBusyOn(btn);
      esBusy.last = null;
    }
    const p = nativeFetch(input, init);
    if (done) {
      const finish = function () { setTimeout(done, 180); };
      p.then(finish, finish);
    }
    return p;
  };
})();

window.EsUI = {
  openNotifications: esOpenNotifications,
  openSearch: esOpenSearch,
  openMenu: esOpenMenu,
  openLogout: esOpenLogout,
  openProfile: function (username) { openMiniPreview(username); },
  refreshDots: esRefreshDots,
  setBusy: esBusyOn,
  me: function () { return esState.me; },
  onReady: function (fn) { if (esState.ready) fn(esState.me); else (esState.waiters = esState.waiters || []).push(fn); }
};

(function () {
  const isHome = !!document.getElementById("hmSide");
  if (isHome) document.body.classList.add("es-home");
  function start(me) {
    esBuildMenu();
    if (!document.body.hasAttribute("data-es-no-nav")) esBuildBottomNav();
    if (me) { esState.me = me; esApplyMe(); }
    esState.ready = true;
    (esState.waiters || []).forEach((fn) => fn(esState.me));
    esRefreshDots();
    setInterval(esRefreshDots, 60000);
    document.addEventListener("visibilitychange", esRefreshDots);
  }
  let cached = null;
  try { cached = JSON.parse(sessionStorage.getItem("es_me") || "null"); } catch (e) {}
  esLoadMe().then((me) => { if (!esState.ready) start(me); else { esState.me = me; esApplyMe(); } }).catch(() => {
    try { sessionStorage.removeItem("es_me"); } catch (e) {}
  });
  if (cached) start(cached);
  document.getElementById("esConfirmLogoutBtn").addEventListener("click", async function () {
    const btn = this;
    const done = esBusyOn(btn);
    try { await nativeLogout(); } catch (e) { if (done) done(); }
  });
  document.getElementById("esCancelLogoutBtn").addEventListener("click", function () { esCloseOverlay("esLogoutOverlay"); });
  document.getElementById("esLogoutOverlay").addEventListener("click", function (e) { if (e.target.id === "esLogoutOverlay") esCloseOverlay("esLogoutOverlay"); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    ["esMenuOverlay", "esLogoutOverlay", "esNotifOverlay", "esFriendSearchOverlay", "esMpvOverlay"].forEach(esCloseOverlay);
  });
  function nativeLogout() {
    return fetch("/api/logout", { method: "POST" }).then(function () {
      try { sessionStorage.removeItem("es_me"); } catch (e) {}
      window.location.href = "/login?logged_out=1";
    });
  }
})();

})();
