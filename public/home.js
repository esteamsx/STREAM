(function () {
  var MAX_TEXT = 2000;
  var IMAGE_MAX_EDGE = 1280;
  var IMAGE_MAX_BYTES = 840 * 1024;
  var NOTIF_POLL_MS = 60000;
  var SVG_NS = "http://www.w3.org/2000/svg";

  var $ = function (id) { return document.getElementById(id); };
  var feedEl = $("hmFeed");
  var moreBtn = $("hmMore");
  var tabsEl = $("hmTabs");
  var textEl = $("hmText");
  var postBtn = $("hmPost");
  var countEl = $("hmCount");
  var errEl = $("hmComposerErr");
  var fileEl = $("hmFile");
  var previewEl = $("hmPreview");
  var previewImg = $("hmPreviewImg");
  var toastEl = $("hmToast");
  var drawer = $("hmDrawer");
  var overlay = $("hmOverlay");

  var state = { me: null, tab: "discover", before: null, loading: false, token: 0, image: null, posting: false };
  var toastTimer = null;

  function h(tag, props, kids) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        var value = props[key];
        if (value == null || value === false) return;
        if (key === "class") node.className = value;
        else if (key === "text") node.textContent = value;
        else if (key === "style") node.style.cssText = value;
        else if (key.slice(0, 2) === "on") node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value === true ? "" : value);
      });
    }
    (kids || []).forEach(function (child) {
      if (child == null) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function svg(inner, size, extra) {
    var node = document.createElementNS(SVG_NS, "svg");
    node.setAttribute("viewBox", "0 0 24 24");
    node.setAttribute("width", String(size || 19));
    node.setAttribute("height", String(size || 19));
    node.setAttribute("fill", "none");
    node.setAttribute("stroke", "currentColor");
    node.setAttribute("stroke-width", "1.8");
    node.setAttribute("aria-hidden", "true");
    if (extra) node.setAttribute("class", extra);
    node.innerHTML = inner;
    return node;
  }

  var ICON_HEART = '<path stroke-linecap="round" stroke-linejoin="round" d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z"/>';
  var ICON_COMMENT = '<path stroke-linecap="round" stroke-linejoin="round" d="M21 11.5a8.4 8.4 0 01-9 8.4 8.6 8.6 0 01-3.6-.8L3 21l1.9-5.1A8.4 8.4 0 1121 11.5z"/>';
  var ICON_SHARE = '<path stroke-linecap="round" stroke-linejoin="round" d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13"/>';
  var ICON_CHECK = '<path d="M12 2.5l2.4 1.7 2.9-.2 1.2 2.7 2.5 1.5-.7 2.8 1.1 2.7-2 2.1-.4 2.9-2.9.7L12 21.5l-2.1-1.3-2.9-.7-.4-2.9-2-2.1 1.1-2.7-.7-2.8 2.5-1.5 1.2-2.7 2.9.2z" fill="currentColor" stroke="none"/><path d="M8.6 12.2l2.4 2.4 4.4-4.6" stroke="#04141a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 3000);
  }

  function api(path, body) {
    var opts = { credentials: "same-origin", headers: { "Content-Type": "application/json" } };
    if (body !== undefined) {
      opts.method = "POST";
      opts.body = JSON.stringify(body);
    }
    return fetch(path, opts).then(function (res) {
      if (res.status === 401) {
        window.location.href = "/login";
        throw new Error("Please sign in.");
      }
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
        return json;
      });
    });
  }

  function nameOf(user) {
    var full = ((user.firstName || "") + " " + (user.lastName || "")).trim();
    return full || (user.username ? "@" + user.username : "Member");
  }

  function initialsOf(user) {
    var a = (user.firstName || "").charAt(0);
    var b = (user.lastName || "").charAt(0);
    var text = (a + b) || (user.username || "?").charAt(0);
    return text.toUpperCase();
  }

  function fillAvatar(node, user) {
    node.textContent = "";
    if (user && user.photoURL) {
      var img = h("img", { alt: "", loading: "lazy", decoding: "async" });
      img.src = user.photoURL;
      img.addEventListener("error", function () {
        node.textContent = initialsOf(user);
      });
      node.appendChild(img);
    } else {
      node.textContent = user ? initialsOf(user) : "";
    }
  }

  function avatar(user, size) {
    var node = h("a", { class: "hm-avatar" + (size ? " " + size : ""), href: user.username ? "/u/" + encodeURIComponent(user.username) : "#", tabindex: "-1", "aria-hidden": "true" });
    fillAvatar(node, user);
    return node;
  }

  function timeAgo(ts) {
    var sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (sec < 45) return "now";
    var min = Math.floor(sec / 60);
    if (min < 60) return min + "m";
    var hrs = Math.floor(min / 60);
    if (hrs < 24) return hrs + "h";
    var days = Math.floor(hrs / 24);
    if (days < 7) return days + "d";
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function compact(n) {
    n = Number(n || 0);
    if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + "M";
    if (n >= 1000) return (n / 1000).toFixed(n % 1000 ? 1 : 0) + "k";
    return String(n);
  }

  var TOKEN_RE = /\[([^\[\]]+)\]\((https?:\/\/[^\s()]+)\)|\*([^\s*][^*]*?)\*|_([^\s_][^_]*?)_|@(\w+)/g;

  function renderText(text) {
    var frag = document.createDocumentFragment();
    var last = 0;
    var m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      if (m[1] !== undefined) {
        var a = h("a", { href: m[2], target: "_blank", rel: "noopener noreferrer nofollow", text: m[1] });
        frag.appendChild(a);
      } else if (m[3] !== undefined) {
        frag.appendChild(h("b", { text: m[3] }));
      } else if (m[4] !== undefined) {
        frag.appendChild(h("i", { text: m[4] }));
      } else {
        frag.appendChild(h("a", { href: "/u/" + encodeURIComponent(m[5]), text: "@" + m[5] }));
      }
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    return frag;
  }

  function extractTags(text) {
    var found = String(text || "").match(/@(\w+)/g) || [];
    var seen = {};
    return found.map(function (t) { return t.slice(1).toLowerCase(); }).filter(function (t) {
      if (seen[t]) return false;
      seen[t] = true;
      return true;
    });
  }

  function stripReply(text) {
    return String(text || "").replace(/^\[\[reply:[\w-]+\]\]\s*/, "");
  }

  function badge(user) {
    return user.verified || user.isAdmin ? svg(ICON_CHECK, 14, "hm-check") : null;
  }

  function act(iconPath, label) {
    var count = h("span", { text: label || "" });
    var btn = h("button", { type: "button", class: "hm-act" }, [svg(iconPath), count]);
    return { btn: btn, count: count };
  }

  function buildComments(post, countNode) {
    var wrap = h("div", { class: "hm-comments" });
    var list = h("div");
    var input = h("input", { type: "text", maxlength: "500", placeholder: "Write a comment", "aria-label": "Write a comment", autocomplete: "off" });
    var send = h("button", { type: "button", class: "hm-btn small", text: "Send", disabled: true });
    var form = h("div", { class: "hm-comment-form" }, [input, send]);
    wrap.appendChild(list);
    wrap.appendChild(form);
    var loaded = false;
    var total = Number(post.commentsCount || 0);

    function paintCount() {
      countNode.textContent = total > 0 ? compact(total) : "";
    }

    function commentNode(c) {
      var author = c.author || { username: "", firstName: "", lastName: "" };
      var nameLink = h("a", { class: "hm-comment-name", href: author.username ? "/u/" + encodeURIComponent(author.username) : "#", text: nameOf(author) });
      var textNode = h("div", { class: "hm-comment-text" });
      textNode.appendChild(renderText(stripReply(c.text)));
      return h("div", { class: "hm-comment" }, [
        avatar(author, "xs"),
        h("div", { class: "hm-comment-body" }, [nameLink, textNode])
      ]);
    }

    function load() {
      list.textContent = "";
      list.appendChild(h("div", { class: "hm-note", text: "Loading" }));
      api("/api/posts/" + encodeURIComponent(post.id) + "/comments")
        .then(function (data) {
          list.textContent = "";
          var rows = data.results || [];
          total = rows.length;
          paintCount();
          if (!rows.length) list.appendChild(h("div", { class: "hm-note", text: "No comments yet. Start the conversation." }));
          rows.forEach(function (c) { list.appendChild(commentNode(c)); });
          loaded = true;
        })
        .catch(function () {
          list.textContent = "";
          list.appendChild(h("div", { class: "hm-note", text: "Could not load comments." }));
        });
    }

    input.addEventListener("input", function () { send.disabled = !input.value.trim(); });
    function submit() {
      var text = input.value.trim();
      if (!text || send.disabled) return;
      send.disabled = true;
      api("/api/posts/" + encodeURIComponent(post.id) + "/comments", { text: text, taggedUsernames: extractTags(text) })
        .then(function (data) {
          input.value = "";
          if (list.firstChild && list.firstChild.className === "hm-note") list.textContent = "";
          var c = data.comment;
          if (c) list.insertBefore(commentNode(c), list.firstChild);
          total += 1;
          paintCount();
        })
        .catch(function (e) {
          toast(e.message);
          send.disabled = false;
        });
    }
    send.addEventListener("click", submit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    });

    return {
      node: wrap,
      toggle: function () {
        var open = wrap.classList.toggle("show");
        if (open && !loaded) load();
        if (open) input.focus();
      }
    };
  }

  function postCard(post) {
    var author = post.author || { username: "", firstName: "", lastName: "" };
    var profileHref = author.username ? "/u/" + encodeURIComponent(author.username) : "#";
    var postHref = author.username ? profileHref + "#post-" + encodeURIComponent(post.id) : "#";

    var name = h("a", { class: "hm-post-name", href: profileHref }, [h("span", { text: nameOf(author) }), badge(author)]);
    var meta = h("div", { class: "hm-post-meta" }, [
      author.username ? "@" + author.username + "  \u00b7  " : "",
      h("a", { href: postHref, text: timeAgo(post.createdAt) })
    ]);
    var head = h("div", { class: "hm-post-head" }, [avatar(author), h("div", { class: "hm-post-who" }, [name, meta])]);
    var card = h("article", { class: "hm-post glass", id: "post-" + post.id }, [head]);

    if (post.text) {
      var body = h("div", { class: "hm-text" });
      body.appendChild(renderText(post.text));
      card.appendChild(body);
    }
    var src = post.imageUrl || post.imageDataUrl;
    if (src) {
      var img = h("img", { class: "hm-image", alt: "Post photo", loading: "lazy", decoding: "async" });
      img.src = src;
      card.appendChild(img);
    }

    var liked = !!post.likedByViewer;
    var likes = Number(post.likesCount || 0);
    var like = act(ICON_HEART, likes > 0 ? compact(likes) : "");
    function paintLike() {
      like.btn.classList.toggle("liked", liked);
      like.count.textContent = likes > 0 ? compact(likes) : "";
      like.btn.setAttribute("aria-pressed", liked ? "true" : "false");
      like.btn.setAttribute("aria-label", liked ? "Unlike" : "Like");
    }
    paintLike();
    like.btn.addEventListener("click", function () {
      var prevLiked = liked;
      var prevLikes = likes;
      liked = !liked;
      likes = Math.max(0, likes + (liked ? 1 : -1));
      paintLike();
      like.btn.classList.remove("pop");
      void like.btn.offsetWidth;
      if (liked) like.btn.classList.add("pop");
      api("/api/posts/" + encodeURIComponent(post.id) + "/like", {})
        .then(function (res) {
          if (typeof res.likesCount === "number") likes = res.likesCount;
          if (typeof res.likedByViewer === "boolean") liked = res.likedByViewer;
          paintLike();
        })
        .catch(function (e) {
          liked = prevLiked;
          likes = prevLikes;
          paintLike();
          toast(e.message);
        });
    });

    var commentsOn = post.commentsEnabled !== false;
    var comment = act(ICON_COMMENT, Number(post.commentsCount) > 0 ? compact(post.commentsCount) : "");
    comment.btn.setAttribute("aria-label", "Comments");
    var comments = buildComments(post, comment.count);
    if (!commentsOn) comment.btn.classList.add("off");
    comment.btn.addEventListener("click", function () {
      if (!commentsOn) {
        toast("Comments are turned off for this post.");
        return;
      }
      comments.toggle();
    });

    var share = act(ICON_SHARE, "");
    share.btn.setAttribute("aria-label", "Share");
    share.btn.addEventListener("click", function () {
      var url = location.origin + postHref;
      if (navigator.share) {
        navigator.share({ url: url }).catch(function () {});
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { toast("Link copied"); }, function () { toast("Could not copy the link."); });
      }
    });

    card.appendChild(h("div", { class: "hm-actions" }, [like.btn, comment.btn, share.btn]));
    card.appendChild(comments.node);
    return card;
  }

  function skeletons() {
    feedEl.textContent = "";
    for (var i = 0; i < 3; i++) feedEl.appendChild(h("div", { class: "hm-skel" }));
  }

  function emptyState(title, text, buttonLabel, onClick) {
    var box = h("div", { class: "hm-empty glass" }, [h("h3", { text: title }), h("p", { text: text })]);
    if (buttonLabel) box.appendChild(h("button", { class: "hm-btn", type: "button", text: buttonLabel, onclick: onClick }));
    return box;
  }

  function loadFeed(reset) {
    if (state.loading) return;
    state.loading = true;
    var token = state.token;
    if (reset) {
      state.before = null;
      moreBtn.hidden = true;
      skeletons();
    } else {
      moreBtn.disabled = true;
      moreBtn.textContent = "Loading";
    }
    var url = state.tab === "following" ? "/api/feed/following" : "/api/feed/discover" + (state.before ? "?before=" + encodeURIComponent(state.before) : "");
    api(url)
      .then(function (data) {
        if (token !== state.token) return;
        if (reset) feedEl.textContent = "";
        var posts = data.posts || [];
        posts.forEach(function (p) { feedEl.appendChild(postCard(p)); });
        if (reset && !posts.length) {
          if (state.tab === "following") {
            feedEl.appendChild(emptyState("Your feed is quiet", "Follow people to see what they post here.", "Browse all posts", function () { setTab("discover"); }));
          } else {
            feedEl.appendChild(emptyState("No posts yet", "Be the first to share something with the community.", "Write a post", focusComposer));
          }
        }
        state.before = state.tab === "discover" ? data.nextBefore || null : null;
        moreBtn.hidden = !state.before;
      })
      .catch(function () {
        if (token !== state.token) return;
        if (reset) {
          feedEl.textContent = "";
          feedEl.appendChild(emptyState("Could not load posts", "Check your connection and try again.", "Retry", function () { loadFeed(true); }));
        } else {
          toast("Could not load more posts.");
        }
      })
      .then(function () {
        if (token === state.token) state.loading = false;
        moreBtn.disabled = false;
        moreBtn.textContent = "Load more";
      });
  }

  function setTab(tab) {
    if (tab === state.tab && feedEl.children.length) return;
    state.tab = tab;
    state.token += 1;
    state.loading = false;
    Array.prototype.forEach.call(tabsEl.querySelectorAll("button"), function (b) {
      var on = b.getAttribute("data-tab") === tab;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    loadFeed(true);
  }

  function focusComposer() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    textEl.focus({ preventScroll: true });
  }

  function readImage(file, done) {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return done(null, "Use a PNG, JPG or WebP image.");
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(img.width, img.height));
      var canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      var quality = 0.85;
      var data = canvas.toDataURL("image/jpeg", quality);
      while (data.length * 0.75 > IMAGE_MAX_BYTES && quality > 0.4) {
        quality -= 0.1;
        data = canvas.toDataURL("image/jpeg", quality);
      }
      if (data.length * 0.75 > IMAGE_MAX_BYTES) return done(null, "That photo is too large.");
      done(data);
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      done(null, "That image could not be read.");
    };
    img.src = url;
  }

  function syncComposer() {
    var len = textEl.value.length;
    countEl.textContent = len + "/" + MAX_TEXT;
    countEl.classList.toggle("warn", len > MAX_TEXT - 100);
    postBtn.disabled = state.posting || (!textEl.value.trim() && !state.image);
    textEl.style.height = "auto";
    textEl.style.height = Math.min(220, Math.max(52, textEl.scrollHeight)) + "px";
  }

  function clearImage() {
    state.image = null;
    fileEl.value = "";
    previewEl.classList.remove("show");
    previewImg.removeAttribute("src");
    syncComposer();
  }

  textEl.addEventListener("input", syncComposer);
  fileEl.addEventListener("change", function () {
    var file = fileEl.files && fileEl.files[0];
    if (!file) return;
    errEl.textContent = "";
    readImage(file, function (data, problem) {
      if (problem) {
        errEl.textContent = problem;
        fileEl.value = "";
        return;
      }
      state.image = data;
      previewImg.src = data;
      previewEl.classList.add("show");
      syncComposer();
    });
  });
  $("hmPreviewClear").addEventListener("click", clearImage);

  postBtn.addEventListener("click", function () {
    var text = textEl.value.trim();
    if (!text && !state.image) return;
    errEl.textContent = "";
    state.posting = true;
    postBtn.textContent = "Posting";
    syncComposer();
    api("/api/posts", { text: text, imageDataUrl: state.image, taggedUsernames: extractTags(text) })
      .then(function (res) {
        var post = res.post;
        post.author = state.me || { username: "", firstName: "", lastName: "" };
        if (feedEl.firstChild && feedEl.firstChild.className && feedEl.firstChild.className.indexOf("hm-empty") !== -1) feedEl.textContent = "";
        feedEl.insertBefore(postCard(post), feedEl.firstChild);
        textEl.value = "";
        clearImage();
        toast("Posted");
      })
      .catch(function (e) {
        errEl.textContent = e.message;
      })
      .then(function () {
        state.posting = false;
        postBtn.textContent = "Post";
        syncComposer();
      });
  });

  Array.prototype.forEach.call(tabsEl.querySelectorAll("button"), function (b) {
    b.addEventListener("click", function () { setTab(b.getAttribute("data-tab")); });
  });
  moreBtn.addEventListener("click", function () { loadFeed(false); });

  function openDrawer() {
    drawer.classList.add("show");
    overlay.classList.add("show");
    document.body.classList.add("hm-locked");
  }

  function closeDrawer() {
    drawer.classList.remove("show");
    overlay.classList.remove("show");
    document.body.classList.remove("hm-locked");
  }

  function buildDrawer() {
    var side = $("hmSide");
    var clone = side.cloneNode(true);
    clone.removeAttribute("id");
    Array.prototype.forEach.call(clone.querySelectorAll("[id]"), function (n) { n.removeAttribute("id"); });
    clone.className = "";
    clone.style.cssText = "display:flex;flex-direction:column;gap:14px;flex:1";
    drawer.textContent = "";
    drawer.appendChild(clone);
    Array.prototype.forEach.call(drawer.querySelectorAll("a.hm-link"), function (a) {
      a.addEventListener("click", closeDrawer);
    });
    bindThemeButtons();
  }

  $("hmMenuBtn").addEventListener("click", openDrawer);
  $("hmBnavMenu").addEventListener("click", openDrawer);
  overlay.addEventListener("click", closeDrawer);
  $("hmFab").addEventListener("click", focusComposer);

  function applyTheme(next) {
    try { localStorage.setItem("theme", next); } catch (e) {}
    document.documentElement.setAttribute("data-theme", next);
    var meta = document.getElementById("themeColorMeta");
    if (meta) meta.setAttribute("content", next === "light" ? "#F5F6FA" : "#0A0A0F");
  }

  function bindThemeButtons() {
    Array.prototype.forEach.call(document.querySelectorAll(".hm-side-foot button"), function (b) {
      if (b.getAttribute("data-bound")) return;
      b.setAttribute("data-bound", "1");
      b.addEventListener("click", function () {
        applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
      });
    });
  }

  function fillMe() {
    var me = state.me;
    if (!me) return;
    fillAvatar($("hmNavAvatar"), me);
    fillAvatar($("hmComposerAvatar"), me);
    Array.prototype.forEach.call(document.querySelectorAll(".hm-me"), function (card) {
      card.hidden = false;
      card.setAttribute("href", me.username ? "/u/" + encodeURIComponent(me.username) : "/profile");
      card.textContent = "";
      var av = h("span", { class: "hm-avatar" });
      fillAvatar(av, me);
      card.appendChild(av);
      card.appendChild(
        h("div", { class: "hm-me-info" }, [
          h("div", { class: "hm-me-name", text: nameOf(me) }),
          h("div", { class: "hm-me-user", text: me.username ? "@" + me.username : "" })
        ])
      );
    });
    if (me.isAdmin) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-nav="admin"]'), function (a) { a.hidden = false; });
    }
  }

  function loadMe() {
    api("/api/profile")
      .then(function (p) {
        state.me = {
          uid: p.uid,
          username: p.username || "",
          firstName: p.firstName || "",
          lastName: p.lastName || "",
          photoURL: p.showProfilePhoto === false ? null : (p.photoURL || null),
          isAdmin: !!p.isAdmin,
          verified: !!p.verified
        };
        fillMe();
      })
      .catch(function () {});
  }

  function personRow(u, compactRow) {
    var follow = h("button", { class: "hm-btn small", type: "button", text: "Follow" });
    follow.addEventListener("click", function () {
      follow.disabled = true;
      follow.textContent = "Following";
      api("/api/follow/" + encodeURIComponent(u.uid), {})
        .then(function () { follow.classList.add("ghost"); })
        .catch(function (e) {
          follow.disabled = false;
          follow.textContent = "Follow";
          toast(e.message);
        });
    });
    var nameLink = h("a", { class: "hm-person-name", href: "/u/" + encodeURIComponent(u.username) }, [h("span", { text: nameOf(u) }), badge(u)]);
    return h("div", { class: "hm-person" }, [
      avatar(u, compactRow ? "sm" : ""),
      h("div", { class: "hm-person-info" }, [nameLink, h("div", { class: "hm-person-user", text: "@" + u.username })]),
      follow
    ]);
  }

  function loadPeople() {
    api("/api/users/suggested")
      .then(function (data) {
        var rows = data.results || [];
        var box = $("hmPeople");
        var mobileBox = $("hmPeopleMobile");
        box.textContent = "";
        if (mobileBox) mobileBox.textContent = "";
        if (!rows.length) {
          box.appendChild(h("div", { class: "hm-note", text: "No suggestions right now." }));
          return;
        }
        rows.forEach(function (u) {
          box.appendChild(personRow(u, false));
          if (mobileBox) mobileBox.appendChild(personRow(u, true));
        });
        var card = $("hmPeopleMobileCard");
        if (card) card.hidden = false;
      })
      .catch(function () {
        var box = $("hmPeople");
        box.textContent = "";
        box.appendChild(h("div", { class: "hm-note", text: "Could not load suggestions." }));
      });
  }

  var searchWrap = $("hmSearch");
  var searchInput = $("hmSearchInput");
  var resultsEl = $("hmResults");
  var searchTimer = null;
  var searchSeq = 0;

  function closeSearch() {
    resultsEl.classList.remove("show");
  }

  function runSearch(q) {
    var seq = ++searchSeq;
    api("/api/users/search?q=" + encodeURIComponent(q))
      .then(function (data) {
        if (seq !== searchSeq) return;
        resultsEl.textContent = "";
        var rows = data.results || [];
        if (!rows.length) {
          resultsEl.appendChild(h("div", { class: "hm-note", text: "No people found." }));
        }
        rows.forEach(function (u) {
          var row = h("a", { class: "hm-result", href: "/u/" + encodeURIComponent(u.username) }, [
            avatar(u, "sm"),
            h("div", { class: "hm-result-info" }, [
              h("div", { class: "hm-person-name" }, [h("span", { text: nameOf(u) }), badge(u)]),
              h("div", { class: "hm-person-user", text: "@" + u.username })
            ])
          ]);
          resultsEl.appendChild(row);
        });
        resultsEl.classList.add("show");
      })
      .catch(function () {
        if (seq !== searchSeq) return;
        resultsEl.textContent = "";
        resultsEl.appendChild(h("div", { class: "hm-note", text: "Search is unavailable right now." }));
        resultsEl.classList.add("show");
      });
  }

  searchInput.addEventListener("input", function () {
    clearTimeout(searchTimer);
    var q = searchInput.value.trim().replace(/^@/, "");
    if (!q) {
      searchSeq += 1;
      closeSearch();
      return;
    }
    searchTimer = setTimeout(function () { runSearch(q); }, 250);
  });
  searchInput.addEventListener("focus", function () {
    if (resultsEl.children.length && searchInput.value.trim()) resultsEl.classList.add("show");
  });
  document.addEventListener("click", function (e) {
    if (!searchWrap.contains(e.target) && !e.target.closest("#hmSearchToggle")) {
      closeSearch();
      searchWrap.classList.remove("open");
    }
  });
  $("hmSearchToggle").addEventListener("click", function () {
    searchWrap.classList.toggle("open");
    if (searchWrap.classList.contains("open")) searchInput.focus();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    closeSearch();
    closeDrawer();
    searchWrap.classList.remove("open");
  });

  function refreshDots() {
    if (document.visibilityState !== "visible") return;
    fetch("/api/notifications/unread", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : { hasUnread: false }; })
      .then(function (d) {
        Array.prototype.forEach.call(document.querySelectorAll(".js-dot"), function (el) {
          el.classList.toggle("show", !!d.hasUnread);
        });
      })
      .catch(function () {});
  }

  buildDrawer();
  bindThemeButtons();
  syncComposer();
  loadMe();
  loadPeople();
  loadFeed(true);
  refreshDots();
  setInterval(refreshDots, NOTIF_POLL_MS);
  document.addEventListener("visibilitychange", refreshDots);
})();
