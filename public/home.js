(function () {
  var MAX_TEXT = 2000;
  var IMAGE_MAX_EDGE = 1280;
  var IMAGE_MAX_BYTES = 840 * 1024;
  var INLINE_PEOPLE_AT = 4;

  var $ = function (id) { return document.getElementById(id); };
  var feedEl = $("hmFeed");
  var moreWrap = $("hmMoreWrap");
  var moreBtn = $("hmMore");
  var tabsEl = $("hmTabs");
  var textEl = $("hmText");
  var postBtn = $("hmPost");
  var countEl = $("hmCount");
  var errEl = $("hmComposerErr");
  var fileEl = $("hmFile");
  var previewEl = $("hmPreview");
  var previewImg = $("hmPreviewImg");

  var state = { me: null, profile: null, tab: "discover", before: null, loading: false, token: 0, image: null, posting: false, people: [] };

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

  function toast(message) {
    if (window.EsPosts) window.EsPosts.toast(message);
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

  function spin(btn) {
    return window.EsUI && window.EsUI.setBusy ? window.EsUI.setBusy(btn) : null;
  }

  function badgeFor(user) {
    if (!user || !(user.verified || user.isAdmin) || !window.EsPosts || !window.EsPosts.verifiedBadge) return null;
    var wrap = document.createElement("span");
    wrap.style.display = "inline-flex";
    wrap.innerHTML = window.EsPosts.verifiedBadge;
    return wrap;
  }

  function nameOf(user) {
    var full = ((user.firstName || "") + " " + (user.lastName || "")).trim();
    return full || (user.username ? "@" + user.username : "Member");
  }

  function initialsOf(user) {
    var text = ((user.firstName || "").charAt(0) + (user.lastName || "").charAt(0)) || (user.username || "?").charAt(0);
    return text.toUpperCase();
  }

  function paintAvatar(node, user) {
    node.textContent = "";
    node.style.backgroundImage = "";
    if (user && user.photoURL) node.style.backgroundImage = 'url("' + user.photoURL + '")';
    else node.textContent = user ? initialsOf(user) : "";
  }

  function applyTheme(next) {
    try { localStorage.setItem("theme", next); } catch (e) {}
    document.documentElement.setAttribute("data-theme", next);
    var meta = document.getElementById("themeColorMeta");
    if (meta) meta.setAttribute("content", next === "light" ? "#F5F6FA" : "#0A0A0F");
  }

  function fillMe() {
    var me = state.me;
    if (!me) return;
    paintAvatar($("hmNavAvatar"), me);
    paintAvatar($("hmComposerAvatar"), me);
    var menuName = $("hmMenuName");
    menuName.textContent = nameOf(me);
    var menuBadge = badgeFor(me);
    if (menuBadge) menuName.appendChild(menuBadge);
    $("hmMenuUser").textContent = me.username ? "@" + me.username : "";
    var card = $("hmMeCard");
    card.hidden = false;
    card.setAttribute("href", me.username ? "/u/" + encodeURIComponent(me.username) : "/profile");
    card.textContent = "";
    var av = h("span", { class: "hm-avatar big" });
    paintAvatar(av, me);
    card.appendChild(av);
    card.appendChild(h("div", { class: "hm-me-info" }, [h("div", { class: "hm-me-name" }, [nameOf(me), badgeFor(me)]), h("div", { class: "hm-me-user", text: me.username ? "@" + me.username : "" })]));
    $("hmAdminLink").hidden = !me.isAdmin;
    $("hmMenuAdmin").hidden = !me.isAdmin;
  }

  function loadMe() {
    return api("/api/profile").then(function (p) {
      state.profile = p;
      state.me = {
        uid: p.uid,
        username: p.username || "",
        firstName: p.firstName || "",
        lastName: p.lastName || "",
        photoURL: p.showProfilePhoto === false ? null : (p.photoURL || null),
        isAdmin: !!p.isAdmin,
        verified: !!p.verified
      };
      if (window.EsPosts && window.EsPosts.setViewer) window.EsPosts.setViewer(p);
      fillMe();
    }).catch(function () {});
  }

  var menuEl = $("hmUserMenu");
  $("hmNavAvatar").addEventListener("click", function (e) {
    e.stopPropagation();
    menuEl.classList.toggle("open");
  });
  document.addEventListener("click", function (e) {
    if (!menuEl.contains(e.target)) menuEl.classList.remove("open");
  });
  $("hmMenuTheme").addEventListener("click", function () {
    applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
    menuEl.classList.remove("open");
  });
  $("hmMenuLogout").addEventListener("click", function () {
    menuEl.classList.remove("open");
    window.EsUI.openLogout();
  });
  $("hmSideLogout").addEventListener("click", function () { window.EsUI.openLogout(); });
  $("hmBell").addEventListener("click", function () { window.EsUI.openNotifications(); });

  var searchWrap = $("hmSearchWrap");
  var searchInput = $("hmSearchInput");
  var searchDrop = $("hmSearchDrop");
  var searchTimer = null;
  var searchSeq = 0;

  function closeSearch() {
    searchDrop.classList.remove("open");
  }

  function loadingRow() {
    return h("div", { class: "fs-loading" }, [h("span", { class: "fs-loading-dots" }, [h("span"), h("span"), h("span")]), "Searching"]);
  }

  function runSearch(q) {
    var seq = ++searchSeq;
    searchDrop.textContent = "";
    searchDrop.appendChild(loadingRow());
    searchDrop.classList.add("open");
    api("/api/users/search?q=" + encodeURIComponent(q))
      .then(function (data) {
        if (seq !== searchSeq) return;
        searchDrop.textContent = "";
        var rows = data.results || [];
        if (!rows.length) {
          searchDrop.appendChild(h("div", { class: "sd-no-result", text: "No people found" }));
          return;
        }
        var list = h("div", { class: "sd-list" });
        rows.forEach(function (u) {
          var av = h("span", { class: "sd-avatar" });
          paintAvatar(av, u);
          var item = h("button", { class: "sd-item", type: "button", "data-nospin": "1" }, [
            av,
            h("span", { class: "sd-info" }, [h("div", { class: "sd-name" }, [nameOf(u), badgeFor(u)]), h("div", { class: "sd-user", text: "@" + u.username })])
          ]);
          item.addEventListener("click", function () {
            closeSearch();
            searchWrap.classList.remove("open");
            window.EsUI.openProfile(u.username);
          });
          list.appendChild(item);
        });
        searchDrop.appendChild(list);
      })
      .catch(function () {
        if (seq !== searchSeq) return;
        searchDrop.textContent = "";
        searchDrop.appendChild(h("div", { class: "sd-no-result", text: "Search is unavailable right now" }));
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
    searchDrop.textContent = "";
    searchDrop.appendChild(loadingRow());
    searchDrop.classList.add("open");
    searchTimer = setTimeout(function () { runSearch(q); }, 300);
  });
  searchInput.addEventListener("focus", function () {
    if (searchDrop.children.length && searchInput.value.trim()) searchDrop.classList.add("open");
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
    menuEl.classList.remove("open");
    searchWrap.classList.remove("open");
  });

  function normalise(p, ownFallback) {
    if (!p.imageDataUrl && p.imageUrl) p.imageDataUrl = p.imageUrl;
    if (ownFallback) p.isOwn = true;
    return p;
  }

  function peopleRow(u) {
    var av = h("span", { class: "hm-avatar big", style: "cursor:pointer" });
    paintAvatar(av, u);
    av.addEventListener("click", function () { window.EsUI.openProfile(u.username); });
    var follow = h("button", { class: "hm-btn small", type: "button", text: "Follow" });
    follow.addEventListener("click", function () {
      var done = spin(follow);
      api("/api/follow/" + encodeURIComponent(u.uid), {})
        .then(function () {
          follow.textContent = "Following";
          follow.classList.add("ghost");
          follow.disabled = true;
        })
        .catch(function (e) { toast(e.message); })
        .then(function () { if (done) done(); });
    });
    var nameLink = h("a", { class: "hm-person-name", href: "/u/" + encodeURIComponent(u.username) }, [h("span", { text: nameOf(u) }), badgeFor(u)]);
    return h("div", { class: "hm-person" }, [av, h("div", { class: "hm-person-info" }, [nameLink, h("div", { class: "hm-person-user", text: "@" + u.username })]), follow]);
  }

  function fillPeople() {
    var box = $("hmPeople");
    box.textContent = "";
    if (!state.people.length) {
      box.appendChild(h("div", { class: "sd-no-result", text: "No suggestions right now" }));
      return;
    }
    state.people.forEach(function (u) { box.appendChild(peopleRow(u)); });
  }

  function inlinePeopleBlock() {
    var rows = state.people.slice(0, 3);
    if (!rows.length) return null;
    var wrap = h("div", { class: "hm-people-inline", id: "hmPeopleInline" }, [h("div", { class: "hm-section-title", text: "People to follow" })]);
    rows.forEach(function (u) { wrap.appendChild(peopleRow(u)); });
    return wrap;
  }

  function placeInlinePeople() {
    var old = $("hmPeopleInline");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (state.tab !== "discover") return;
    var block = inlinePeopleBlock();
    if (!block) return;
    var posts = feedEl.querySelectorAll(".feed-post");
    if (!posts.length) return;
    var anchor = posts[Math.min(INLINE_PEOPLE_AT, posts.length) - 1];
    anchor.parentNode.insertBefore(block, anchor.nextSibling);
  }

  function loadPeople() {
    return api("/api/users/suggested")
      .then(function (data) {
        state.people = data.results || [];
        fillPeople();
        placeInlinePeople();
      })
      .catch(function () {
        $("hmPeople").textContent = "";
        $("hmPeople").appendChild(h("div", { class: "sd-no-result", text: "Could not load suggestions" }));
      });
  }

  function skeletons() {
    feedEl.textContent = "";
    for (var i = 0; i < 3; i++) feedEl.appendChild(window.EsPosts.skeleton());
  }

  function emptyBox(text, label, onClick) {
    var box = h("div", { class: "feed-empty" }, [h("div", { text: text })]);
    if (label) box.appendChild(h("button", { class: "hm-btn small", type: "button", text: label, style: "margin-top:12px", onclick: onClick }));
    return box;
  }

  var waitTries = 0;

  function loadFeed(reset) {
    if (!window.EsPosts) {
      waitTries += 1;
      if (waitTries < 40) {
        setTimeout(function () { loadFeed(reset); }, 150);
      } else {
        feedEl.textContent = "";
        feedEl.appendChild(emptyBox("The feed could not start. Reload the page and try again.", "Reload", function () { location.reload(); }));
      }
      return;
    }
    if (state.loading) return;
    state.loading = true;
    var token = state.token;
    var done = null;
    if (reset) {
      state.before = null;
      moreWrap.hidden = true;
      skeletons();
    } else {
      done = spin(moreBtn);
    }
    var url = state.tab === "following" ? "/api/feed/following" : "/api/feed/discover" + (state.before ? "?before=" + encodeURIComponent(state.before) : "");
    api(url)
      .then(function (data) {
        if (token !== state.token) return;
        if (reset) feedEl.textContent = "";
        var posts = data.posts || [];
        posts.forEach(function (p) {
          try { feedEl.appendChild(window.EsPosts.createCard(normalise(p))); } catch (e) {}
        });
        if (reset && !posts.length) {
          if (state.tab === "following") feedEl.appendChild(emptyBox("Your feed is quiet. Follow people to see what they post here.", "Browse all posts", function () { setTab("discover"); }));
          else feedEl.appendChild(emptyBox("No posts yet. Be the first to share something.", "Write a post", focusComposer));
        }
        state.before = state.tab === "discover" ? data.nextBefore || null : null;
        moreWrap.hidden = !state.before;
        if (reset) placeInlinePeople();
      })
      .catch(function () {
        if (token !== state.token) return;
        if (reset) {
          feedEl.textContent = "";
          feedEl.appendChild(emptyBox("Could not load posts. Check your connection and try again.", "Retry", function () { loadFeed(true); }));
        } else {
          toast("Could not load more posts.");
        }
      })
      .then(function () {
        if (token === state.token) state.loading = false;
        if (done) done();
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

  function extractTags(text) {
    var found = String(text || "").match(/@(\w+)/g) || [];
    var seen = {};
    return found.map(function (t) { return t.slice(1).toLowerCase(); }).filter(function (t) {
      if (seen[t]) return false;
      seen[t] = true;
      return true;
    });
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
    var done = spin(postBtn);
    api("/api/posts", { text: text, imageDataUrl: state.image, taggedUsernames: extractTags(text) })
      .then(function (res) {
        var post = normalise(res.post, true);
        post.author = state.me || { username: "", firstName: "", lastName: "" };
        if (feedEl.querySelector(".feed-empty")) feedEl.textContent = "";
        feedEl.insertBefore(window.EsPosts.createCard(post), feedEl.firstChild);
        textEl.value = "";
        clearImage();
        toast("Posted");
      })
      .catch(function (e) { errEl.textContent = e.message; })
      .then(function () {
        state.posting = false;
        if (done) done();
        syncComposer();
      });
  });

  Array.prototype.forEach.call(tabsEl.querySelectorAll("button"), function (b) {
    b.addEventListener("click", function () { setTab(b.getAttribute("data-tab")); });
  });
  moreBtn.addEventListener("click", function () { loadFeed(false); });

  window.__hmReady = true;
  syncComposer();
  loadMe();
  loadPeople();
  loadFeed(true);
  if (/[?&]compose=1/.test(location.search)) setTimeout(focusComposer, 400);
})();
