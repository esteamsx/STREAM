(function(){
const POST_UI_MARKUP = "<div class=\"page-overlay comments-overlay\" id=\"commentsOverlay\">\n  <div class=\"comments-card\">\n    <div class=\"comments-header\">\n      <div class=\"comments-title\">Comments</div>\n      <button type=\"button\" class=\"flist-close\" id=\"commentsCloseBtn\" aria-label=\"Close\">\n        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><path stroke-linecap=\"round\" d=\"M18 6L6 18M6 6l12 12\"/></svg>\n      </button>\n    </div>\n    <div class=\"comments-list\" id=\"commentsList\"></div>\n    <div class=\"comment-reply-preview\" id=\"commentReplyPreview\" style=\"display:none\">\n      <div class=\"comment-reply-preview-bar\"></div>\n      <div class=\"comment-reply-preview-body\">\n        <div class=\"comment-reply-preview-name\" id=\"commentReplyPreviewName\"></div>\n        <div class=\"comment-reply-preview-text\" id=\"commentReplyPreviewText\"></div>\n      </div>\n      <button type=\"button\" class=\"comment-reply-preview-close\" id=\"commentReplyPreviewClose\" aria-label=\"Cancel reply\">\n        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\"><path stroke-linecap=\"round\" d=\"M18 6L6 18M6 6l12 12\"/></svg>\n      </button>\n    </div>\n    <div class=\"comments-composer\">\n      <input type=\"text\" id=\"commentInput\" class=\"pf-composer-input\" maxlength=\"500\" placeholder=\"Add a comment...\">\n      <button type=\"button\" class=\"pf-composer-send-btn\" id=\"commentSendBtn\" aria-label=\"Send\" disabled></button>\n    </div>\n  </div>\n</div>\n<div class=\"page-overlay img-lightbox-overlay\" id=\"imgLightboxOverlay\">\n  <button type=\"button\" class=\"lightbox-close\" id=\"lightboxCloseBtn\" aria-label=\"Close\">\n    <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><path stroke-linecap=\"round\" d=\"M18 6L6 18M6 6l12 12\"/></svg>\n  </button>\n  <img id=\"lightboxImg\" alt=\"\">\n  <a class=\"lightbox-download\" id=\"lightboxDownloadBtn\" download=\"photo.jpg\">\n    <span class=\"lb-dl-icon\">\n      <svg class=\"lb-dl-arrow\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3v12m0 0l-4-4m4 4l4-4M4 19h16\"/></svg>\n      <span class=\"lb-dl-spinner\"></span>\n      <svg class=\"lb-dl-check\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 6L9 17l-5-5\"/></svg>\n    </span>\n    <span class=\"lb-dl-label\">Download</span>\n  </a>\n</div>\n<div class=\"page-overlay\" id=\"linkInsertOverlay\">\n  <div class=\"flist-card\" style=\"max-height:none\">\n    <div class=\"flist-header\">\n      <div class=\"flist-title\">Insert Link</div>\n      <button type=\"button\" class=\"flist-close\" id=\"linkInsertCloseBtn\" aria-label=\"Close\">\n        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><path stroke-linecap=\"round\" d=\"M18 6L6 18M6 6l12 12\"/></svg>\n      </button>\n    </div>\n    <div class=\"flist-search-wrap\" style=\"padding-bottom:4px\">\n      <div class=\"pf-status\" id=\"linkInsertSelectedWord\" style=\"margin-bottom:10px;font-size:.8rem;color:var(--muted)\"></div>\n      <input type=\"text\" class=\"flist-search\" id=\"linkInsertUrlInput\" placeholder=\"https://example.com\" inputmode=\"url\">\n    </div>\n    <div style=\"padding:6px 18px 18px\">\n      <button type=\"button\" class=\"mpv-view-btn\" id=\"linkInsertSaveBtn\">Save</button>\n      <button type=\"button\" class=\"mpv-close-text\" id=\"linkInsertCancelBtn\" style=\"display:block;margin:0 auto\">Cancel</button>\n    </div>\n  </div>\n</div>\n<div class=\"page-overlay\" id=\"postDeleteOverlay\">\n  <div class=\"flist-card\" style=\"max-width:300px;padding:26px 22px;text-align:center\">\n    <div style=\"font-weight:700;font-family:var(--font-display);margin-bottom:8px\">Delete Post?</div>\n    <div style=\"color:var(--muted);font-size:.85rem;margin-bottom:20px\">Are you sure you want to delete this post?</div>\n    <button type=\"button\" class=\"pf-follow-btn\" id=\"postDeleteConfirmBtn\" style=\"background:var(--red);margin-bottom:10px\">Delete</button>\n    <button type=\"button\" class=\"mpv-close-text\" id=\"postDeleteCancelBtn\">Cancel</button>\n  </div>\n</div>\n<div class=\"page-overlay\" id=\"postOptionsOverlay\">\n  <div class=\"flist-card\" style=\"max-width:320px\">\n    <div class=\"flist-header\">\n      <div class=\"flist-title\">Post Options</div>\n      <button type=\"button\" class=\"flist-close\" id=\"postOptionsCloseBtn\" aria-label=\"Close\">\n        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><path stroke-linecap=\"round\" d=\"M18 6L6 18M6 6l12 12\"/></svg>\n      </button>\n    </div>\n    <div style=\"padding:4px 10px 16px\" id=\"postOptionsBody\"></div>\n  </div>\n</div>\n<div class=\"page-overlay\" id=\"postSettingsOverlay\">\n  <div class=\"flist-card\" style=\"max-width:340px\">\n    <div class=\"flist-header\">\n      <div class=\"flist-title\">Post Settings</div>\n      <button type=\"button\" class=\"flist-close\" id=\"postSettingsCloseBtn\" aria-label=\"Close\">\n        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><path stroke-linecap=\"round\" d=\"M18 6L6 18M6 6l12 12\"/></svg>\n      </button>\n    </div>\n    <div style=\"padding:4px 18px 18px\" id=\"postSettingsBody\"></div>\n    <div class=\"acc-msg\" id=\"postSettingsMsg\" style=\"margin:0 18px 16px\"></div>\n  </div>\n</div>\n<div class=\"page-overlay\" id=\"postVisibilityOverlay\">\n  <div class=\"flist-card\" style=\"max-width:300px\">\n    <div class=\"flist-header\">\n      <div class=\"flist-title\">Who Can View</div>\n      <button type=\"button\" class=\"flist-close\" id=\"postVisCloseBtn\" aria-label=\"Close\">\n        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><path stroke-linecap=\"round\" d=\"M18 6L6 18M6 6l12 12\"/></svg>\n      </button>\n    </div>\n    <div style=\"padding:4px 10px 16px\" id=\"postVisBody\"></div>\n  </div>\n</div>\n<div class=\"page-overlay\" id=\"tagSearchOverlay\">\n  <div class=\"flist-card\">\n    <div class=\"flist-header\">\n      <div class=\"flist-title\">Tag Someone</div>\n      <button type=\"button\" class=\"flist-close\" id=\"tagSearchCloseBtn\" aria-label=\"Close\">\n        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><path stroke-linecap=\"round\" d=\"M18 6L6 18M6 6l12 12\"/></svg>\n      </button>\n    </div>\n    <div class=\"flist-search-wrap\" id=\"tagSearchBox\">\n      <input type=\"text\" class=\"flist-search\" id=\"tagSearchInput\" placeholder=\"Search by username\">\n    </div>\n    <div class=\"flist-list\" id=\"tagSearchResults\"></div>\n  </div>\n</div>";
const POST_UI_CSS = "@keyframes skWave{0%{background-position:100% 0}100%{background-position:0 0}}\n@keyframes pfSpin{to{transform:rotate(360deg)}}\n@keyframes lbDlSpin{to{transform:rotate(360deg)}}\n@keyframes spin{to{transform:rotate(360deg)}}\n.sk-line,.sk-avatar,.sk-thumb,.sk-chip{background-image:linear-gradient(90deg,var(--sk-base) 25%,var(--sk-hi) 50%,var(--sk-base) 75%);\n  background-size:200% 100%;background-repeat:no-repeat;\n  animation:skWave 1.6s linear infinite;border-radius:8px;flex-shrink:0;}\n.sk-line{height:11px;width:100%;border-radius:6px}\n.sk-line.w80{width:80%}\n.sk-line.w60{width:60%}\n.sk-line.w45{width:45%}\n.sk-line.w30{width:30%}\n.sk-avatar{width:42px;height:42px;border-radius:50%}\n.sk-thumb{width:100%;aspect-ratio:16/9;border-radius:12px}\n.sk-chip{height:26px;width:74px;border-radius:20px}\n.sk-row{display:flex;align-items:center;gap:12px;padding:12px 0}\n.sk-row-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}\n.sk-stack{display:flex;flex-direction:column;gap:10px}\n.sk-inline{display:flex;align-items:center;gap:10px}\n@media(prefers-reduced-motion:reduce){.sk-line,.sk-avatar,.sk-thumb,.sk-chip{animation:none;background-position:0 0}}\n.pf-bio-textarea{width:100%;max-width:320px;resize:vertical;background:var(--dark3);border:1px solid var(--border-strong);\n  border-radius:10px;padding:9px 10px;color:var(--text);font-family:inherit;font-size:.85rem;min-height:70px;}\n.pf-status{font-size:.76rem;color:var(--muted);margin-top:6px;display:flex;align-items:center;gap:6px}\n.pf-status.active{color:var(--accent)}\n.pf-verified{display:inline-flex;vertical-align:middle;margin-left:5px;position:relative;top:-1px}\n.pf-edit-link{color:var(--accent);font-weight:700;text-decoration:underline;cursor:pointer}\n.pf-follow-btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:12px;\n  border-radius:12px;border:none;font-weight:700;font-size:.88rem;margin-bottom:18px;\n  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;}\n.pf-follow-btn.following{background:transparent;border:1px solid var(--border-strong);color:var(--text)}\n.pf-follow-btn:disabled{opacity:.6}\n.page-overlay{position:fixed;inset:0;background:rgba(10,10,15,.75);backdrop-filter:blur(8px);\n  display:none;align-items:center;justify-content:center;z-index:100;padding:24px;}\n.page-overlay.show{display:flex}\nbody:has(.page-overlay.show){overflow:hidden}\n#postOptionsOverlay,#postVisibilityOverlay,#postDeleteOverlay,#postSettingsOverlay{z-index:150;}\n#commentsOverlay{z-index:120;}\n.flist-card{width:100%;max-width:400px;max-height:78vh;\n  background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(255,255,255,.06);\n  border:1px solid rgba(255,255,255,.22);\n  border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.3);display:flex;flex-direction:column;overflow:hidden;}\n:root[data-theme=\"light\"] .flist-card{background:linear-gradient(155deg,rgba(255,255,255,.6),rgba(255,255,255,.2) 40%,rgba(255,255,255,.3) 100%);\n  border:1px solid rgba(255,255,255,.65);\n  box-shadow:0 20px 60px rgba(20,20,28,.16),inset 0 1px 0 rgba(255,255,255,.7);}\n.flist-header{display:flex;align-items:center;justify-content:space-between;padding:18px 18px 0}\n.flist-title{font-family:var(--font-display);font-weight:700;font-size:1.02rem}\n.flist-close{background:transparent;border:none;color:var(--muted);width:32px;height:32px;border-radius:8px;\n  display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s var(--ease);}\n.flist-close:hover{color:var(--accent);background:rgba(0,224,255,.1)}\n.flist-close svg{width:18px;height:18px}\n.flist-search-wrap{padding:14px 18px}\n.flist-search{width:100%;background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;\n  padding:10px 12px;color:var(--text);font-size:.86rem;}\n.flist-search:focus{border-color:var(--accent)}\n.flist-list{overflow-y:auto;padding:0 10px 14px;flex:1}\n.flist-row{display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:10px;cursor:pointer}\n.flist-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));\n  display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;\n  font-size:.9rem;color:#04141a;flex-shrink:0;background-size:cover;background-position:center;}\n.flist-info{flex:1;min-width:0}\n.flist-name{font-size:.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.flist-username{font-size:.74rem;color:var(--muted)}\n.flist-empty{padding:30px 10px;text-align:center;color:var(--muted);font-size:.84rem}\n.mpv-view-btn{width:100%;padding:11px;border-radius:10px;border:none;font-weight:700;font-size:.85rem;\n  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;margin-bottom:8px;}\n.mpv-close-text{background:transparent;border:none;color:var(--muted);font-size:.8rem;text-decoration:underline}\n.pf-toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,12px);opacity:0;z-index:400;\n  background:var(--card2);border:1px solid var(--border-strong);border-radius:12px;padding:11px 16px;\n  font-size:.82rem;color:var(--text);box-shadow:0 12px 32px rgba(0,0,0,.5);transition:all .3s var(--ease);\n  max-width:88vw;text-align:center;}\n.pf-toast.show{transform:translate(-50%,0);opacity:1}\n.tag-highlight-wrap{position:relative;flex:1;min-width:0}\n.tag-highlight-backdrop{position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;overflow:hidden;\n  box-sizing:border-box;word-wrap:break-word;}\n.tag-highlight-backdrop mark{background:transparent;color:var(--accent)}\n.tag-highlight-backdrop .md-bold{color:var(--text)}\n.tag-highlight-backdrop .md-italic{color:var(--text);opacity:.92}\n.pf-composer-input{flex:1;background:var(--dark3);border:1px solid var(--border-strong);border-radius:22px;\n  padding:11px 16px;color:var(--text);font-size:.88rem;}\n.pf-composer-input-wrap .pf-composer-input{padding-right:34px}\n.pf-composer-icon-btn{flex-shrink:0;width:38px;height:38px;border-radius:50%;background:var(--dark3);border:1px solid var(--border-strong);\n  color:var(--muted);display:flex;align-items:center;justify-content:center;transition:all .2s var(--ease);}\n.pf-composer-icon-btn:hover{color:var(--accent);border-color:var(--accent)}\n.pf-composer-icon-btn svg{width:17px;height:17px}\n.pf-composer-send-btn{flex-shrink:0;width:38px;height:38px;border-radius:50%;border:none;\n  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;\n  display:flex;align-items:center;justify-content:center;transition:opacity .2s var(--ease);}\n.pf-composer-send-btn svg{width:16px;height:16px;transform:translateX(-1px)}\n.pf-composer-send-btn:disabled{opacity:.4;cursor:default}\n.opt-tick{position:relative;display:inline-block;width:11px;height:6px;margin-left:7px;vertical-align:2px;\n  border-left:1.8px solid currentColor;border-bottom:1.8px solid currentColor;transform:rotate(-45deg)}\n.pf-post{padding:16px 0;border-top:1px solid var(--border)}\n.pf-post:first-child{border-top:none;padding-top:0}\n.pf-post-image{width:100%;max-height:340px;object-fit:cover;border-radius:12px;margin-top:8px;display:block;cursor:zoom-in}\n.img-lightbox-overlay{background:rgba(0,0,0,.92);flex-direction:column;gap:16px;z-index:400}\n.img-lightbox-overlay img{max-width:92vw;max-height:74vh;border-radius:10px;object-fit:contain}\n.lightbox-close{position:absolute;top:18px;right:18px;width:38px;height:38px;border-radius:50%;\n  background:rgba(255,255,255,.12);border:none;color:#fff;display:flex;align-items:center;justify-content:center;\n  transition:transform .15s var(--ease);}\n.lightbox-close:active{transform:scale(.9)}\n.lightbox-close svg{width:18px;height:18px}\n.lightbox-download{display:flex;align-items:center;gap:7px;padding:10px 20px;border-radius:24px;\n  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;font-size:.85rem;font-weight:700;\n  text-decoration:none;transition:transform .15s var(--ease),opacity .2s var(--ease);}\n.lightbox-download:active{transform:scale(.95)}\n.lightbox-download.downloading{opacity:.85}\n.lb-dl-icon{position:relative;width:16px;height:16px;flex-shrink:0}\n.lb-dl-icon svg{position:absolute;inset:0;width:16px;height:16px}\n.lb-dl-spinner{display:none;position:absolute;inset:0;width:16px;height:16px;box-sizing:border-box;border-radius:50%;\n  border:2px solid rgba(4,20,26,.3);border-top-color:#04141a;animation:lbDlSpin .7s linear infinite;}\n.lb-dl-check{display:none}\n.lightbox-download.downloading .lb-dl-arrow{display:none}\n.lightbox-download.downloading .lb-dl-spinner{display:block}\n.lightbox-download.done .lb-dl-arrow{display:none}\n.lightbox-download.done .lb-dl-check{display:block}\n.pf-post-heart{background:transparent;border:none;color:var(--muted);display:flex;align-items:center;padding:2px}\n.pf-post-heart svg{width:21px;height:21px;transition:transform .15s var(--ease)}\n.pf-post-heart:active svg{transform:scale(1.2)}\n.pf-post-heart.liked{color:#FF3B5C}\n.pf-post-heart.liked svg{fill:#FF3B5C}\n.pf-post-like-count{font-size:.78rem;color:var(--muted);font-weight:600;margin-right:14px}\n.pf-post-comment-btn{background:transparent;border:none;color:var(--muted);display:flex;align-items:center;padding:2px}\n.pf-post-comment-btn svg{width:20px;height:20px}\n.pf-post-comment-count{font-size:.78rem;color:var(--muted);font-weight:600;margin-right:14px}\n.pf-post-reshare-btn{background:transparent;border:none;color:var(--muted);display:flex;align-items:center;padding:2px}\n.pf-post-reshare-btn svg{width:19px;height:19px}\n.pf-post-reshare-btn.reshared{color:var(--accent)}\n.pf-post-reshare-count{font-size:.78rem;color:var(--muted);font-weight:600}\n.pf-post-comment-btn.disabled,.pf-post-reshare-btn.disabled{opacity:.32;cursor:not-allowed}\n.pf-post-empty{color:var(--muted);font-size:.83rem;text-align:center;padding:14px 0}\n.comments-overlay{align-items:flex-end}\n.comments-card{width:100%;max-width:480px;height:82vh;\n  background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(255,255,255,.06);\n  border:1px solid rgba(255,255,255,.22);\n  border-radius:20px 20px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.3);display:flex;flex-direction:column;overflow:hidden;}\n:root[data-theme=\"light\"] .comments-card{background:linear-gradient(155deg,rgba(255,255,255,.6),rgba(255,255,255,.2) 40%,rgba(255,255,255,.3) 100%);\n  border:1px solid rgba(255,255,255,.65);\n  box-shadow:0 -10px 40px rgba(20,20,28,.16),inset 0 1px 0 rgba(255,255,255,.7);}\n.comments-header{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border);flex-shrink:0}\n.comments-title{font-family:var(--font-display);font-weight:700;font-size:.95rem}\n.comments-list{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:6px 16px;-webkit-overflow-scrolling:touch}\n.comment-reply-preview{display:flex;align-items:center;gap:8px;padding:8px 16px;background:var(--dark3);\n  border-top:1px solid var(--border);}\n.comment-reply-preview-bar{width:3px;align-self:stretch;border-radius:2px;background:var(--accent);flex-shrink:0}\n.comment-reply-preview-body{flex:1;min-width:0}\n.comment-reply-preview-name{font-size:.76rem;font-weight:700;color:var(--accent)}\n.comment-reply-preview-text{font-size:.78rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.comment-reply-preview-close{background:transparent;border:none;color:var(--muted);width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}\n.comment-reply-preview-close svg{width:15px;height:15px}\n.comment-quote{display:flex;flex-direction:column;gap:1px;border-left:3px solid var(--accent);\n  padding:4px 8px;margin-bottom:4px;background:rgba(0,224,255,.06);border-radius:4px;max-width:100%;}\n.comment-quote-name{font-size:.7rem;font-weight:700;color:var(--accent)}\n.comment-quote-text{font-size:.72rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px}\n.comment-row{display:flex;gap:10px;padding:12px 0;border-bottom:1px solid var(--border);position:relative;touch-action:pan-y;transition:transform .18s var(--ease)}\n.comment-row:last-child{border-bottom:none}\n.comment-row.own{flex-direction:row-reverse;text-align:right}\n.comment-row.own .comment-name-row{justify-content:flex-end}\n.comment-row.own .comment-meta{justify-content:flex-end}\n.comment-row.own .comment-text{background:linear-gradient(135deg,rgba(0,224,255,.14),rgba(124,92,255,.14));\n  border-radius:14px 14px 2px 14px;padding:7px 12px;display:inline-block;text-align:left;}\n.comment-row:not(.own) .comment-text{background:var(--dark3);border-radius:14px 14px 14px 2px;padding:7px 12px;display:inline-block;}\n.comment-row .comment-body{display:flex;flex-direction:column}\n.comment-row.own .comment-body{align-items:flex-end}\n.comment-reply-hint{position:absolute;left:0;top:0;bottom:0;display:flex;align-items:center;gap:6px;\n  color:var(--accent);font-size:.72rem;font-weight:700;opacity:0;transition:opacity .15s var(--ease);\n  pointer-events:none;}\n.comment-reply-hint svg{width:16px;height:16px}\n.comment-row.own .comment-reply-hint{left:auto;right:0}\n.comment-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));\n  display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;color:#04141a;\n  flex-shrink:0;background-size:cover;background-position:center;}\n.comment-body{flex:1;min-width:0}\n.comment-name-row{display:flex;align-items:center;gap:6px}\n.comment-name{font-size:.82rem;font-weight:700}\n.comment-pin-badge{display:inline-flex;align-items:center;gap:3px;font-size:.66rem;color:var(--accent);font-weight:700}\n.comment-pin-badge svg{width:11px;height:11px}\n.comment-text{font-size:.85rem;color:var(--text);line-height:1.45;margin-top:2px;white-space:pre-wrap}\n.comment-meta{display:flex;align-items:center;gap:14px;margin-top:6px}\n.comment-time{font-size:.68rem;color:var(--muted)}\n.comment-like-btn{background:transparent;border:none;color:var(--muted);display:flex;align-items:center;gap:5px;font-size:.7rem;font-weight:600}\n.comment-like-btn svg{width:15px;height:15px}\n.comment-like-btn.liked{color:#FF3B5C}\n.comment-like-btn.liked svg{fill:#FF3B5C}\n.comment-row.is-hidden .comment-text{opacity:.35}\n.comment-row.is-hidden .comment-avatar{opacity:.4}\n.comment-hidden-warning{color:var(--red);font-size:.76rem;font-weight:600;margin-top:2px;opacity:.75}\n.comments-empty{color:var(--muted);font-size:.83rem;text-align:center;padding:30px 0}\n.comments-composer{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--border);flex-shrink:0;\n  background:var(--card);}\n.pf-mini-spinner{display:inline-block;width:13px;height:13px;border:2px solid rgba(4,20,26,.3);border-top-color:#04141a;\n  border-radius:50%;animation:pfSpin .6s linear infinite;vertical-align:middle;}\n.btn-spinner{width:14px;height:14px;border:2px solid rgba(4,20,26,.35);border-top-color:#04141a;border-radius:50%;display:inline-block;vertical-align:-2px;margin-right:7px;animation:spin .6s linear infinite}\n.btn-spinner-light{width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;display:inline-block;vertical-align:-2px;margin-right:7px;animation:spin .6s linear infinite}\n.pf-feed-fab-badge.show{display:flex}\n.feed-post{display:flex;gap:10px;padding:14px 0;border-top:1px solid var(--border)}\n.feed-post:first-child{border-top:none;padding-top:0}\n.feed-post-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));\n  display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;\n  font-size:.82rem;color:#04141a;flex-shrink:0;background-size:cover;background-position:center;cursor:pointer;}\n.feed-post-body{flex:1;min-width:0}\n.feed-post-name{font-size:.83rem;font-weight:600;cursor:pointer;display:inline}\n.feed-post-time{font-size:.7rem;color:var(--muted);margin-top:1px}\n.feed-post-text{font-size:.85rem;color:var(--text);line-height:1.45;white-space:pre-wrap;margin-top:4px}\n.feed-post-image{width:100%;max-height:260px;object-fit:cover;border-radius:10px;margin-top:8px;display:block}\n.feed-post-footer{display:flex;align-items:center;gap:6px;margin-top:8px}\n.feed-empty{color:var(--muted);font-size:.83rem;text-align:center;padding:30px 0}\n.post-link{color:var(--accent);text-decoration:underline;text-underline-offset:2px}\n.tag-highlight-backdrop .link-span{color:var(--accent);text-decoration:underline;text-underline-offset:2px}\n.insert-link-btn{position:absolute;bottom:-40px;right:0;z-index:5;padding:6px 12px;border-radius:8px;\n  background:var(--accent);color:#04141a;font-size:.74rem;font-weight:700;border:none;\n  box-shadow:0 6px 16px rgba(0,0,0,.35);display:none;align-items:center;gap:5px;}\n.insert-link-btn.show{display:flex}\n.insert-link-btn svg{width:13px;height:13px}\n.pf-post-more-btn{position:absolute;top:0;right:0;background:transparent;border:none;color:var(--muted);width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center}\n.pf-post-more-btn:hover{color:var(--accent);background:rgba(0,224,255,.1)}\n.pf-post-more-btn svg{width:18px;height:18px}\n.pf-post-reshare-label{display:flex;align-items:center;gap:6px;font-size:.76rem;color:var(--accent);font-weight:700;margin-bottom:8px;cursor:pointer}\n.pf-post-reshare-label svg{width:14px;height:14px}\n.pf-post-pinned-label{display:flex;align-items:center;gap:6px;font-size:.76rem;color:#F5B700;font-weight:700;margin-bottom:8px}\n.pf-post-pinned-label svg{width:14px;height:14px}\n.pf-post.is-pinned{border:1px solid rgba(245,183,0,.35);background:linear-gradient(180deg,rgba(245,183,0,.06),transparent 60%)}\n.pf-post-edited{font-size:.68rem;color:var(--muted)}\n.post-opt-btn{display:flex;align-items:center;gap:12px;width:100%;padding:12px 10px;background:transparent;border:none;\n  color:var(--text);font-size:.86rem;font-weight:600;border-radius:10px;text-align:left;}\n.post-opt-btn:hover{background:var(--card2)}\n.post-opt-btn.disabled{opacity:.4;cursor:default;pointer-events:none}\n.post-opt-btn.danger{color:var(--red)}\n.post-opt-btn svg{width:18px;height:18px;flex-shrink:0}\n.post-opt-sub{font-size:.7rem;color:var(--muted);margin-left:auto;font-weight:600}\n.tfa-toggle-row{display:flex;align-items:center;justify-content:space-between}\n.tfa-toggle-label{font-size:.85rem;color:var(--text);font-weight:600}\n.tfa-toggle-sub{font-size:.72rem;color:var(--muted);margin-top:2px}\n.tfa-switch{position:relative;width:46px;height:26px;border-radius:20px;background:var(--dark3);\n  border:1px solid var(--border-strong);cursor:pointer;flex-shrink:0;transition:background .2s var(--ease);}\n.tfa-switch.on{background:linear-gradient(90deg,var(--accent),var(--accent2));border-color:transparent}\n.tfa-switch-dot{position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:#fff;\n  transition:transform .2s var(--ease);box-shadow:0 1px 3px rgba(0,0,0,.3);}\n.tfa-switch.on .tfa-switch-dot{transform:translateX(20px)}\n.acc-msg{font-size:.78rem;padding:9px 12px;border-radius:8px;margin-top:12px;display:none}\n.acc-msg.show{display:block}\n.acc-msg.ok{background:rgba(0,224,255,.1);border:1px solid rgba(0,224,255,.3);color:var(--accent)}\n.acc-msg.err{background:rgba(255,59,92,.1);border:1px solid rgba(255,59,92,.3);color:var(--red)}\n.feed-post-body,.comment-body{min-width:0}\n.feed-post-text,.pf-post-text,.comment-text,.comment-quote-text,.feed-post-name{overflow-wrap:anywhere;word-break:break-word}\n.feed-post{overflow:hidden}\n#esPostUiOverlays .page-overlay{z-index:450}\n#esPostUiOverlays #commentsOverlay{z-index:460}\n#esPostUiOverlays #postOptionsOverlay,#esPostUiOverlays #postVisibilityOverlay,#esPostUiOverlays #postDeleteOverlay,#esPostUiOverlays #postSettingsOverlay,#esPostUiOverlays #linkInsertOverlay,#esPostUiOverlays #tagSearchOverlay{z-index:480}\n.img-lightbox-overlay,#imgLightboxOverlay{z-index:520}\n.pf-toast{z-index:640}\n";

(function(){
  if (document.getElementById('esPostUiStyle')) return;
  const st = document.createElement('style');
  st.id = 'esPostUiStyle';
  st.textContent = POST_UI_CSS;
  document.head.appendChild(st);
  const holder = document.createElement('div');
  holder.id = 'esPostUiOverlays';
  holder.innerHTML = POST_UI_MARKUP;
  document.body.appendChild(holder);
})();
})();
(function(){
'use strict';
if (window.EsPosts) return;

let ownProfile = null;
function loadPosts(){ if (typeof window.__esRefreshFeed === 'function') window.__esRefreshFeed(); }

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
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }

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

const PLANE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>';
const CAMERA_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8a2 2 0 012-2h1.5l1-1.5h7l1 1.5H18a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const EXPAND_COMPOSER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3"/></svg>';
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
  html = html.replace(/\[([^\[\]]+)\]\((https?:\/\/[^\s()]+)\)/g, function(m, label, url){
    return '<a href="' + url.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener noreferrer" class="post-link">' + label + '</a>';
  });
  html = html.replace(/\*([^\s*][^*]*?)\*/g, '<b>$1</b>');
  html = html.replace(/_([^\s_][^_]*?)_/g, '<i>$1</i>');
  html = html.replace(/@(\w+)/g, '<a href="/u/$1">@$1</a>');
  return html;
}
function extractTags(text){
  const matches = (text || '').match(/@(\w+)/g) || [];
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
      html = html.replace(/\[([^\[\]]+)\]\((https?:\/\/[^\s()]+)\)/g, '<span class="link-span">[$1]($2)</span>');
      html = html.replace(/\*([^\s*][^*]*?)\*/g, '<span class="md-bold">*$1*</span>');
      html = html.replace(/_([^\s_][^_]*?)_/g, '<span class="md-italic">_$1_</span>');
    }
    html = html.replace(/@(\w+)/g, '<mark>@$1</mark>');
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
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
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
    activeTagInput.value = activeTagInput.value.replace(/\s+$/, '') + (activeTagInput.value.trim() ? ' ' : '') + '@' + username + ' ';
    activeTagInput.dispatchEvent(new Event('input'));
    activeTagInput.focus();
  }
  document.getElementById('tagSearchOverlay').classList.remove('show');
}

async function runTagSearch(q){
  const resultsEl = document.getElementById('tagSearchResults');
  if (!q) { resultsEl.innerHTML = ''; return; }
  resultsEl.innerHTML = '<div class="sk-stack" style="padding:10px 0"><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w45"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div></div>';
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
      name.innerHTML = esc((u.firstName || u.lastName) ? ((u.firstName || '') + ' ' + (u.lastName || '')).trim() : ('@' + u.username)) + ((u.isAdmin || u.verified) ? VERIFIED_BADGE : '');
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

    const pinBtn = document.createElement('button');
    pinBtn.type = 'button';
    pinBtn.className = 'post-opt-btn';
    pinBtn.innerHTML = PIN_ICON + '<span>' + (post.pinnedAt ? 'Unpin' : 'Pin to Profile') + '</span>';
    pinBtn.addEventListener('click', async () => {
      document.getElementById('postOptionsOverlay').classList.remove('show');
      try {
        const result = await postJSON('/api/posts/' + post.id + '/pin', {});
        showToast(result.pinned ? 'Post pinned.' : 'Post unpinned.');
        if (ownProfile && ownProfile.username) loadPosts(ownProfile.username, true);
      } catch (err) {
        showToast(err.message || 'Could not update that post.');
      }
    });
    body.appendChild(pinBtn);

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
    btn.textContent = label;
    if ((post.visibility || 'everyone') === value) {
      const tick = document.createElement('span');
      tick.className = 'opt-tick';
      btn.appendChild(tick);
    }
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
      const listEl = document.getElementById('postsList') || document.getElementById('hmFeed');
      if (listEl && !listEl.querySelector('.feed-post, .pf-post') && !listEl.querySelector('.feed-empty, .pf-post-empty')) {
        const empty = document.createElement('div');
        empty.className = listEl.id === 'postsList' ? 'pf-post-empty' : 'feed-empty';
        empty.textContent = 'No posts yet.';
        listEl.appendChild(empty);
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

function openImageLightbox(src, name){
  document.getElementById('lightboxImg').src = src;
  const dl = document.getElementById('lightboxDownloadBtn');
  dl.href = src;
  dl.download = name || 'photo.jpg';
  document.getElementById('imgLightboxOverlay').classList.add('show');
}
function playDownloadAnimation(btn){
  btn.classList.remove('done');
  btn.classList.add('downloading');
  setTimeout(() => {
    btn.classList.remove('downloading');
    btn.classList.add('done');
    setTimeout(() => btn.classList.remove('done'), 1200);
  }, 600);
}
document.getElementById('lightboxCloseBtn').addEventListener('click', () => {
  document.getElementById('imgLightboxOverlay').classList.remove('show');
});
document.getElementById('imgLightboxOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'imgLightboxOverlay') document.getElementById('imgLightboxOverlay').classList.remove('show');
});
document.getElementById('lightboxDownloadBtn').addEventListener('click', function(){ playDownloadAnimation(this); });
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
let lastLongPressAt = 0;
let replyContext = null;
let loadedCommentsById = {};

function commentAuthorLabel(author){
  if (!author) return 'Someone';
  const name = ((author.firstName || '') + ' ' + (author.lastName || '')).trim();
  return esc(name || ('@' + author.username)) + ((author.isAdmin || author.verified) ? VERIFIED_BADGE : '');
}

function renderCommentRow(c, postId){
  const row = document.createElement('div');
  row.className = 'comment-row' + (c.hidden ? ' is-hidden' : '') + (c.isOwnComment ? ' own' : '');
  row.dataset.id = c.id;

  const replyMatch = (c.text || '').match(/^\[\[reply:([\w-]+)\]\]([\s\S]*)$/);
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

  if (c.author && c.author.username) {
    avatar.style.cursor = 'pointer';
    avatar.setAttribute('role', 'link');
    avatar.setAttribute('aria-label', 'Open ' + c.author.username + ' profile');
    avatar.addEventListener('click', (e) => {
      e.stopPropagation();
      if (Date.now() - lastLongPressAt < 800) return;
      goToProfile(c.author.username);
    });
  }

  const body = document.createElement('div');
  body.className = 'comment-body';

  const nameRow = document.createElement('div');
  nameRow.className = 'comment-name-row';
  const nameEl = document.createElement('div');
  nameEl.className = 'comment-name';
  nameEl.innerHTML = commentAuthorLabel(c.author);
  if (c.author && c.author.username) {
    nameEl.style.cursor = 'pointer';
    nameEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (Date.now() - lastLongPressAt < 800) return;
      goToProfile(c.author.username);
    });
  }
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
    quoteText.textContent = (repliedComment.text || '').replace(/^\[\[reply:[\w-]+\]\]/, '');
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
      longPressTimer = setTimeout(() => { lastLongPressAt = Date.now(); openCommentOptions(c, postId, row); }, 500);
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
  const cleanText = (c.text || '').replace(/^\[\[reply:[\w-]+\]\]/, '');
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
  listEl.innerHTML = '<div class="pf-post"><div class="sk-line w80"></div><div class="sk-line w45" style="margin-top:8px"></div><div class="sk-thumb" style="margin-top:10px"></div><div class="sk-inline" style="margin-top:10px"><div class="sk-chip" style="width:52px;height:22px"></div><div class="sk-chip" style="width:52px;height:22px"></div></div></div>';
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


function createHomePostCard(post){
  const author = post.author || {};
  const isOwner = !!post.isOwn;
  const card = document.createElement('div');
  card.className = 'feed-post' + (post.pinnedAt ? ' is-pinned' : '');
  card.id = 'post-' + post.id;
  card.style.position = 'relative';
  card.addEventListener('click', () => goToProfile(author.username, post.id));

  const avatar = document.createElement('div');
  avatar.className = 'feed-post-avatar';
  if (author.uid) avatar.setAttribute('data-st-uid', author.uid);
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
  nameEl.innerHTML = esc((author.firstName || author.lastName) ? ((author.firstName || '') + ' ' + (author.lastName || '')).trim() : ('@' + (author.username || ''))) +
    ((author.isAdmin || author.verified) ? VERIFIED_BADGE : '');
  nameEl.addEventListener('click', (e) => { e.stopPropagation(); goToProfile(author.username); });
  nameRow.appendChild(nameEl);
  body.appendChild(nameRow);

  const timeEl = document.createElement('div');
  timeEl.className = 'feed-post-time';
  timeEl.textContent = formatRelativeTime(post.createdAt) + (post.editedAt ? ' · ' : '');
  if (post.editedAt) {
    const editedSpan = document.createElement('span');
    editedSpan.className = 'pf-post-edited';
    editedSpan.textContent = 'Edited';
    timeEl.appendChild(editedSpan);
  }
  body.appendChild(timeEl);

  if (post.pinnedAt) {
    const pinnedLabel = document.createElement('div');
    pinnedLabel.className = 'pf-post-pinned-label';
    pinnedLabel.innerHTML = PIN_ICON + '<span>Pinned</span>';
    body.appendChild(pinnedLabel);
  }

  if (post.resharedFrom) {
    const reshareLabel = document.createElement('div');
    reshareLabel.className = 'pf-post-reshare-label';
    reshareLabel.innerHTML = RESHARE_ICON + '<span>Reshared from @' + esc(post.resharedFrom.username) + '</span>';
    reshareLabel.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = '/u/' + post.resharedFrom.username + '#post-' + post.resharedFrom.postId;
    });
    body.appendChild(reshareLabel);
  }

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
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', (e) => { e.stopPropagation(); openImageLightbox(post.imageDataUrl); });
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
  commentCountEl.id = 'commentCount-' + post.id;
  commentCountEl.dataset.raw = post.commentsCount || 0;
  commentCountEl.textContent = post.commentsCount > 0 ? formatCount(post.commentsCount) : '';
  commentBtn.addEventListener('click', (e) => {
    e.stopPropagation();
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
    reshareBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (isOwner) { showToast("You can't reshare your own post."); return; }
      if (reshareOff) { showToast('Reshare is turned off for this post.'); return; }
      reshareBtn.disabled = true;
      reshareBtn.classList.add('is-busy');
      try {
        await postJSON('/api/posts/' + post.id + '/reshare', {});
        post.reshareCount = (post.reshareCount || 0) + 1;
        reshareCountEl.textContent = formatCount(post.reshareCount);
        reshareBtn.classList.add('reshared');
        showToast('Reshared to your profile.');
      } catch (err) {
        showToast(err.message || 'Could not reshare that post.');
      }
      reshareBtn.classList.remove('is-busy');
      reshareBtn.disabled = false;
    });
    footer.appendChild(reshareBtn);
    footer.appendChild(reshareCountEl);
  }

  if (isOwner) {
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'pf-post-more-btn';
    moreBtn.setAttribute('aria-label', 'More');
    moreBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>';
    moreBtn.addEventListener('click', (e) => { e.stopPropagation(); openPostOptions(post, isOwner, card); });
    card.appendChild(moreBtn);
  }

  body.appendChild(footer);
  card.appendChild(body);
  return card;
}

function createHomeSkeleton(){
  const el = document.createElement('div');
  el.className = 'pf-post';
  el.innerHTML = '<div class="sk-line w80"></div><div class="sk-line w45" style="margin-top:8px"></div><div class="sk-thumb" style="margin-top:10px"></div><div class="sk-inline" style="margin-top:10px"><div class="sk-chip"></div><div class="sk-chip"></div></div>';
  return el;
}


window.EsPosts = {
  createCard: createHomePostCard,
  skeleton: createHomeSkeleton,
  toast: showToast,
  getJSON: getJSON,
  postJSON: postJSON,
  esc: esc,
  setViewer: function(p){ ownProfile = p; },
  extractTags: extractTags,
  formatCount: formatCount,
  verifiedBadge: VERIFIED_BADGE
};
})();
