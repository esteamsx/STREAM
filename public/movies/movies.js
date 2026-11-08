/* Movies page. Talks only to this site's /api/movies/* (never to the movie API directly).
   Everything the API sends is added to the page as plain text, never as HTML. */
(function () {
  "use strict";
  var API = "/api/movies";
  var SORTS = [["RECOMMEND", "Recommended"], ["NEWEST", "Newest"], ["RATING", "Top rated"]];
  var TITLES = { movies: "Movies", "tv-series": "TV Series", animation: "Animation", "my-list": "My List" };

  var $ = function (id) { return document.getElementById(id); };
  var els = { home: $("mvHome"), grid: $("mvGrid"), detail: $("mvDetail"), state: $("mvState"), tabs: $("mvTabs"), nav: $("mvNav"), form: $("mvSearchForm"), input: $("mvSearchInput"), clear: $("mvSearchClear"), suggest: $("mvSuggest"), toggle: $("mvSearchToggle") };

  var homeData = null;       // kept so going back to For You is instant
  var token = 0;             // each screen load gets a number so a slow answer can never paint over a newer screen
  var heroTimer = null;
  var inApp = false;         // true once we have moved around inside the page (so Back can use history)

  /* ---------------------------------------------------------------- small helpers */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    (kids || []).forEach(function (c) { if (c != null && c !== false) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function svg(markup, size) {
    var s = el("span", { "aria-hidden": "true" });
    s.innerHTML = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + markup + "</svg>"; // fixed icon markup only
    return s.firstChild;
  }
  var ICON = {
    left: '<path d="M15 18l-6-6 6-6"/>', right: '<path d="M9 18l6-6-6-6"/>',
    download: '<path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.6l6.8-4.2M8.6 13.4l6.8 4.2"/>',
    bookmark: '<path d="M6 4.75A1.75 1.75 0 017.75 3h8.5A1.75 1.75 0 0118 4.75V21l-6-4-6 4V4.75z"/>',
    film: '<rect x="3" y="3" width="18" height="18" rx="2.2"/><path d="M7 3v18M17 3v18M3 12h18M3 7h4M3 17h4M17 17h4M17 7h4"/>',
    warn: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>',
  };
  function api(path, options) {
    options = options || {};
    options.credentials = "same-origin";
    options.headers = Object.assign({ Accept: "application/json" }, options.headers || {});
    return fetch(API + path, options).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) { var e = new Error(data.error || "Something went wrong."); e.code = data.code || "server"; e.status = res.status; throw e; }
        return data;
      });
    });
  }
  function detailUrl(slug) { return "/movies/title/" + encodeURIComponent(slug); }
  function setTitle(t) { document.title = (t ? t + " | " : "") + "Movies | ES TEAMS TV"; }
  function toast(message, type) {
    if (window.EsUI && typeof window.EsUI.toast === "function") window.EsUI.toast(message, type || "success", 5000);
  }
  function watchLaterButton(item, initialSaved, onRemove) {
    var saved = initialSaved === true;
    var known = typeof initialSaved === "boolean";
    var button = el("button", { type: "button", class: "mv-bookmark-button" + (saved ? " is-saved" : ""), "aria-label": saved ? "Remove from My List" : "Save to My List", title: saved ? "Remove from My List" : "Save to My List", "aria-pressed": saved ? "true" : "false" }, [svg(ICON.bookmark, 18)]);
    function render() {
      button.classList.toggle("is-saved", saved);
      button.setAttribute("aria-pressed", saved ? "true" : "false");
      button.setAttribute("aria-label", saved ? "Remove from My List" : "Save to My List");
      button.title = saved ? "Remove from My List" : "Save to My List";
    }
    function loadState() {
      if (known) return Promise.resolve(saved);
      button.disabled = true;
      return api("/watch-later/" + encodeURIComponent(item.slug)).then(function (result) {
        known = true; saved = !!result.saved; render(); button.disabled = false; return saved;
      }, function (error) { button.disabled = false; throw error; });
    }
    button.loadState = loadState;
    button.addEventListener("click", function (event) {
      event.preventDefault(); event.stopPropagation();
      if (button.disabled) return;
      button.disabled = true;
      loadState().then(function (currentlySaved) {
        return currentlySaved
          ? api("/watch-later/" + encodeURIComponent(item.slug), { method: "DELETE" }).then(function () { return false; })
          : api("/watch-later", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ movie: { slug: item.slug, title: item.title, poster: item.poster, year: item.year, rating: item.rating, kind: item.kind } }) }).then(function () { return true; });
      }).then(function (nextSaved) {
        saved = nextSaved; known = true; render();
        toast(saved ? "Saved to List" : "Removed from List");
        if (!saved && onRemove) onRemove();
      }).catch(function (error) {
        toast(error.message || "Could not update your list.", "error");
      }).finally(function () { if (button.isConnected) button.disabled = false; });
    });
    return button;
  }

  /* ---------------------------------------------------------------- what is on screen */
  function show(which) {
    ["home", "grid", "detail"].forEach(function (k) { els[k].hidden = k !== which; });
    els.state.hidden = which !== "state";
    if (which !== "home") stopHero();
  }
  function setTab(tab) {
    Array.prototype.forEach.call(els.tabs.querySelectorAll(".mv-tab"), function (b) {
      var selected = b.getAttribute("data-tab") === tab;
      b.classList.toggle("on", selected);
      if (selected) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    els.tabs.hidden = tab === "detail";
  }
  function showState(kind, retry) {
    show("state");
    els.state.textContent = "";
    var title, text, icon = ICON.warn;
    if (kind === "not_configured") { title = "Movies are not connected yet"; text = "The movie service has not been set up on this server yet. Once the site owner connects it, movies and series will show up here."; icon = ICON.film; }
    else if (kind === "not_found") { title = "Title not found"; text = "We could not find that movie or series. It may have been removed."; }
    else { title = "Could not load movies"; text = "The movie service did not answer. Check your connection and try again."; }
    els.state.appendChild(svg(icon, 44));
    els.state.appendChild(el("h2", { text: title }));
    els.state.appendChild(el("p", { text: text }));
    if (kind === "not_found") els.state.appendChild(el("button", { type: "button", class: "mv-btn", id: "mvStateBack", onclick: function () { go("/movies"); } }, ["Back to movies"]));
    else if (kind !== "not_configured") els.state.appendChild(el("button", { type: "button", class: "mv-btn", id: "mvRetry", onclick: retry }, ["Try again"]));
  }
  function failed(e, retry) { showState(e && e.code === "not_configured" ? "not_configured" : e && e.code === "not_found" ? "not_found" : "upstream", retry); }

  /* ---------------------------------------------------------------- cards */
  function card(item, savedState, onRemove) {
    var poster = el("div", { class: "mv-poster" });
    var fallback = el("div", { class: "mv-noimg", text: item.title });
    if (item.poster) {
      var img = el("img", { alt: item.title, loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" });
      img.addEventListener("load", function () { poster.classList.add("loaded"); });
      img.addEventListener("error", function () { poster.classList.add("broken"); });
      img.src = item.poster;
      poster.appendChild(img);
    } else poster.classList.add("broken");
    poster.appendChild(fallback);
    if (item.badge) poster.appendChild(el("span", { class: "mv-badge", text: item.badge }));
    if (item.rating) poster.appendChild(el("span", { class: "mv-rate", text: "\u2605 " + item.rating.toFixed(1) }));
    var kids = [poster, el("div", { class: "mv-name", text: item.title })];
    if (item.year) kids.push(el("div", { class: "mv-year", text: item.year }));
    var wrap = el("div", { class: "mv-card-wrap" });
    if (!item.slug) { wrap.appendChild(el("div", { class: "mv-card", "aria-label": item.title }, kids)); return wrap; }
    var a = el("a", { class: "mv-card", href: detailUrl(item.slug), "aria-label": item.title }, kids);
    a.addEventListener("click", function (e) {
      if (suppressNavigation) { e.preventDefault(); suppressNavigation = false; return; }
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      go(detailUrl(item.slug));
    });
    var bookmark = watchLaterButton(item, savedState, onRemove);
    bookmark.classList.add("mv-card-bookmark");
    wrap.append(a, bookmark);
    wrap.addEventListener("mouseenter", function () {
      if (window.matchMedia && window.matchMedia("(pointer:fine)").matches) wrap.classList.add("bookmark-hover");
    });
    wrap.addEventListener("mouseleave", function () { wrap.classList.remove("bookmark-hover"); });
    var pressTimer = null, startX = 0, startY = 0, suppressNavigation = false, resetSuppressTimer = null;
    function clearPress() { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }
    wrap.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button") || e.button && e.pointerType === "mouse") return;
      clearPress(); startX = e.clientX; startY = e.clientY;
      pressTimer = setTimeout(function () {
        pressTimer = null; suppressNavigation = true; wrap.classList.add("bookmark-revealed");
        bookmark.loadState().catch(function () { toast("Could not check your list. Try again.", "error"); });
      }, 520);
    });
    wrap.addEventListener("pointermove", function (e) {
      if (pressTimer && Math.hypot(e.clientX - startX, e.clientY - startY) > 10) clearPress();
    }, { passive: true });
    wrap.addEventListener("pointerup", function () {
      clearPress();
      if (suppressNavigation) {
        if (resetSuppressTimer) clearTimeout(resetSuppressTimer);
        resetSuppressTimer = setTimeout(function () { suppressNavigation = false; }, 700);
      }
    });
    wrap.addEventListener("pointercancel", clearPress);
    wrap.addEventListener("contextmenu", function (e) { if (e.pointerType !== "mouse") e.preventDefault(); });
    return wrap;
  }

  /* ---------------------------------------------------------------- the featured banner */
  function stopHero() { if (heroTimer) { clearInterval(heroTimer); heroTimer = null; } }
  function hero(items) {
    var box = el("div", { class: "mv-hero", id: "mvHero", role: "region", "aria-roledescription": "carousel", "aria-label": "Featured" });
    var slides = [], dots = [], at = 0;
    items.forEach(function (item, i) {
      var bg = el("div", { class: "mv-slide-bg" });
      if (item.poster) bg.style.backgroundImage = 'url("' + item.poster.replace(/"/g, "%22") + '")';
      var meta = el("div", { class: "mv-slide-meta" });
      if (item.rating) meta.appendChild(el("span", { class: "mv-star", text: "\u2605 " + item.rating.toFixed(1) }));
      if (item.year) meta.appendChild(el("span", { text: item.year }));
      var info = el("div", { class: "mv-slide-info" }, [
        el("span", { class: "mv-slide-kicker", text: item.badge || "Featured" }),
        el("h2", { class: "mv-slide-title", text: item.title }),
        meta,
        item.slug ? el("a", { class: "mv-btn", href: detailUrl(item.slug), onclick: function (e) { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); go(detailUrl(item.slug)); } }, ["View details"]) : null,
      ]);
      var s = el("div", { class: "mv-slide" + (i === 0 ? " on" : ""), "aria-hidden": i === 0 ? "false" : "true" }, [bg, el("div", { class: "mv-slide-body" }, [info])]);
      slides.push(s); box.appendChild(s);
    });
    function goTo(n) {
      at = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle("on", i === at); s.setAttribute("aria-hidden", i === at ? "false" : "true"); });
      dots.forEach(function (d, i) { d.classList.toggle("on", i === at); });
    }
    if (slides.length > 1) {
      var dotBox = el("div", { class: "mv-dots" });
      slides.forEach(function (_, i) { var d = el("button", { type: "button", class: "mv-dot" + (i === 0 ? " on" : ""), "aria-label": "Show featured title " + (i + 1), onclick: function () { goTo(i); restart(); } }); dots.push(d); dotBox.appendChild(d); });
      box.appendChild(dotBox);
      box.appendChild(el("button", { type: "button", class: "mv-arrow prev", "aria-label": "Previous", onclick: function () { goTo(at - 1); restart(); } }, [svg(ICON.left, 20)]));
      box.appendChild(el("button", { type: "button", class: "mv-arrow next", "aria-label": "Next", onclick: function () { goTo(at + 1); restart(); } }, [svg(ICON.right, 20)]));
      var paused = false;
      var restart = function () { stopHero(); if (!paused && !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) heroTimer = setInterval(function () { if (!document.hidden) goTo(at + 1); }, 6500); };
      box.addEventListener("mouseenter", function () { paused = true; stopHero(); });
      box.addEventListener("mouseleave", function () { paused = false; restart(); });
      var x0 = null;
      box.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      box.addEventListener("touchend", function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 45) { goTo(at + (dx < 0 ? 1 : -1)); restart(); } }, { passive: true });
      restart();
    }
    return box;
  }

  /* ---------------------------------------------------------------- rows */
  function row(r) {
    var scroller = el("div", { class: "mv-scroll" }, r.items.map(function (item) { return card(item); }));
    var head = el("div", { class: "mv-row-head" }, [el("h2", { class: "mv-row-title", text: r.title })]);
    if (r.kind) head.appendChild(el("button", { type: "button", class: "mv-all", "data-kind": r.kind, onclick: function () { go("/movies?cat=" + encodeURIComponent(r.kind)); } }, ["See all"]));
    function scrollBy(dir) { scroller.scrollBy({ left: dir * Math.max(240, scroller.clientWidth * 0.8), behavior: "smooth" }); }
    var wrap = el("div", { class: "mv-scroll-wrap" }, [
      scroller,
      el("button", { type: "button", class: "mv-rowbtn prev", "aria-label": "Scroll " + r.title + " back", onclick: function () { scrollBy(-1); } }, [svg(ICON.left, 18)]),
      el("button", { type: "button", class: "mv-rowbtn next", "aria-label": "Scroll " + r.title + " forward", onclick: function () { scrollBy(1); } }, [svg(ICON.right, 18)]),
    ]);
    return el("section", { class: "mv-row", "data-row": r.title }, [head, wrap]);
  }
  function skeletonHome() {
    els.home.textContent = "";
    els.home.appendChild(el("div", { class: "mv-sk mv-sk-hero" }));
    for (var i = 0; i < 2; i++) {
      var cards = []; for (var j = 0; j < 8; j++) cards.push(el("div", { class: "mv-sk mv-sk-card" }));
      els.home.appendChild(el("div", {}, [el("div", { class: "mv-sk mv-sk-title" }), el("div", { class: "mv-sk-row" }, cards)]));
    }
  }

  /* ---------------------------------------------------------------- screens */
  function loadHome() {
    var t = ++token;
    setTab("home"); setTitle("");
    show("home");
    if (homeData) return paintHome(homeData);
    skeletonHome();
    api("/home").then(function (d) { if (t !== token) return; homeData = d; paintHome(d); }, function (e) { if (t !== token) return; failed(e, loadHome); });
  }
  function paintHome(d) {
    show("home");
    els.home.textContent = "";
    if (d.banner && d.banner.length) els.home.appendChild(hero(d.banner));
    (d.rows || []).forEach(function (r) { els.home.appendChild(row(r)); });
  }

  /* a category ("Movies") or a search, shown as a grid that grows with Load more */
  function loadGrid(opts) {
    var t = ++token;
    var g = { kind: opts.kind || null, q: opts.q || null, sort: opts.sort || "RECOMMEND", page: 1, items: [], hasMore: false, total: 0 };
    setTab(g.kind || "none"); setTitle(g.q ? 'Search "' + g.q + '"' : TITLES[g.kind]);
    show("grid");
    els.grid.textContent = "";
    var title = el("div", { class: "mv-gridtitle", text: g.q ? 'Results for "' + g.q + '"' : TITLES[g.kind] });
    var head = el("div", { class: "mv-gridhead" }, [title]);
    if (g.kind && g.kind !== "my-list") {
      var sorts = el("div", { class: "mv-sorts", role: "group", "aria-label": "Sort" });
      SORTS.forEach(function (s) { sorts.appendChild(el("button", { type: "button", class: "mv-sort" + (g.sort === s[0] ? " on" : ""), "data-sort": s[0], onclick: function () { go("/movies?cat=" + g.kind + (s[0] === "RECOMMEND" ? "" : "&sort=" + s[0]), true); } }, [s[1]])); });
      head.appendChild(sorts);
    }
    var grid = el("div", { class: "mv-grid", id: "mvGridItems" });
    var more = el("div", { class: "mv-more" });
    els.grid.appendChild(head); els.grid.appendChild(grid); els.grid.appendChild(more);
    for (var i = 0; i < 12; i++) grid.appendChild(el("div", { class: "mv-sk", style: "aspect-ratio:2/3" }));

    function fetchPage(first) {
      var path = g.q ? "/search?q=" + encodeURIComponent(g.q) + "&page=" + g.page : g.kind === "my-list" ? "/watch-later" : "/catalog/" + g.kind + "?page=" + g.page + "&sort=" + g.sort;
      api(path).then(function (d) {
        if (t !== token) return;
        if (first) grid.textContent = "";
        g.items = g.items.concat(d.items || []); g.hasMore = !!d.hasMore; g.total = d.total || 0;
        (d.items || []).forEach(function (it) {
          var savedTitle = g.kind === "my-list" ? true : null;
          var titleCard;
          var onRemoveFromList = savedTitle ? function () {
            if (titleCard) titleCard.remove();
            if (!grid.querySelector(".mv-card-wrap")) grid.appendChild(el("div", { class: "mv-empty", text: "Your Watch Later list is empty. Save a movie or series to find it here." }));
          } : null;
          titleCard = card(it, savedTitle, onRemoveFromList);
          grid.appendChild(titleCard);
        });
        if (g.total) title.appendChild(el("small", { text: g.total.toLocaleString() + " titles" }));
        if (first && !g.items.length) { grid.appendChild(el("div", { class: "mv-empty", text: g.q ? 'No results for "' + g.q + '". Try a different title.' : g.kind === "my-list" ? "Your Watch Later list is empty. Save a movie or series to find it here." : "Nothing to show here yet." })); }
        paintMore();
      }, function (e) {
        if (t !== token) return;
        if (first) failed(e, function () { loadGrid(opts); });
        else { more.textContent = ""; more.appendChild(el("button", { type: "button", class: "mv-btn ghost", onclick: function () { paintMore(); fetchPage(false); } }, ["Could not load. Try again"])); }
      });
    }
    function paintMore() {
      more.textContent = "";
      if (!g.hasMore) return;
      more.appendChild(el("button", { type: "button", class: "mv-btn ghost", id: "mvMore", onclick: function (e) { e.currentTarget.disabled = true; e.currentTarget.textContent = "Loading..."; g.page += 1; fetchPage(false); } }, ["Load more"]));
    }
    fetchPage(true);
  }

  function loadDetail(slug) {
    var t = ++token;
    setTab("detail"); setTitle("");
    show("detail");
    els.detail.textContent = "";
    els.detail.appendChild(el("div", { class: "mv-sk", style: "min-height:420px;border-radius:22px" }));
    api("/detail/" + encodeURIComponent(slug)).then(function (d) {
      if (t !== token) return;
      api("/watch-later/" + encodeURIComponent(slug)).then(function (saved) { if (t === token) paintDetail(d, !!saved.saved); }, function () { if (t === token) paintDetail(d, false); });
    }, function (e) { if (t !== token) return; failed(e, function () { loadDetail(slug); }); });
  }
  function formatBytes(n) {
    if (!n || !Number.isFinite(Number(n))) return "";
    var units = ["B", "KB", "MB", "GB", "TB"]; var i = 0; var v = Number(n);
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return (i === 0 ? Math.round(v) : v.toFixed(v >= 10 ? 0 : 1)) + " " + units[i];
  }
  function downloadFilename(d, season, episode, quality) {
    var title = String(d.title || "movie").replace(/[\\/:*?"<>|\x00-\x1F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "movie";
    if (d.kind === "tv" && season && episode) title += " - S" + String(season).padStart(2, "0") + "E" + String(episode).padStart(2, "0");
    var q = String(quality || "").replace(/\s+/g, "").replace(/p$/i, "");
    if (/^\d+$/.test(q)) title += " " + q + "p";
    return title + ".mp4";
  }
  function accountForPremium() { window.location.href = "/account#verify"; }
  function shareMovie(d, button) {
    var url = new URL(detailUrl(d.slug), window.location.origin).toString();
    function copied() { button.setAttribute("aria-label", "Link copied"); button.setAttribute("title", "Link copied"); setTimeout(function () { if (button.isConnected) { button.setAttribute("aria-label", "Share movie or series"); button.setAttribute("title", "Share"); } }, 1800); }
    function manualCopy() {
      var field = el("textarea", { readonly: true, "aria-hidden": "true" });
      field.value = url; field.style.position = "fixed"; field.style.opacity = "0"; document.body.appendChild(field); field.select();
      var ok = document.execCommand("copy"); field.remove();
      if (ok) copied(); else { button.setAttribute("aria-label", "Copy failed"); button.setAttribute("title", "Copy failed"); }
      setTimeout(function () { if (button.isConnected) { button.setAttribute("aria-label", "Share movie or series"); button.setAttribute("title", "Share"); } }, 1800);
      return Promise.resolve();
    }
    function copyFallback() {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(url).then(copied).catch(manualCopy);
      return manualCopy();
    }
    if (navigator.share) {
      navigator.share({ title: d.title, text: "Watch " + d.title + " on ES TEAMS TV", url: url }).catch(function (e) { if (!e || e.name !== "AbortError") copyFallback(); });
    } else copyFallback();
  }
  function verifyMediaReady(url, action) {
    var stopped = action === "playback" ? "Playback was not started." : "No file was started.";
    return fetch(url, { credentials: "same-origin", headers: { Accept: "video/mp4, application/octet-stream", Range: "bytes=0-0" } }).then(async function (response) {
      var contentType = String(response.headers.get("content-type") || "");
      var contentRange = String(response.headers.get("content-range") || "");
      var media = /^(video\/mp4|application\/octet-stream)(?:;|$)/i.test(contentType);
      var oneByteRange = /^bytes 0-0\/(?:\d+|\*)$/i.test(contentRange);
      if (response.status === 206 && media && oneByteRange) {
        if (response.body) await response.body.cancel().catch(function () {});
        return true;
      }
      if (media && response.body) await response.body.cancel().catch(function () {});
      var message = "The server did not confirm that the " + action + " source is ready (HTTP " + response.status + "). " + stopped;
      if (response.status === 200 && !media) {
        if (response.body) await response.body.cancel().catch(function () {});
        message = response.redirected || /text\/html/i.test(contentType)
          ? "The site returned a page instead of a video. Your session may have expired; refresh, sign in, and try again. " + stopped
          : "The server did not return a video range. " + stopped;
      }
      if (!media && response.status !== 200 && response.status !== 206) {
        var body = await response.text().catch(function () { return ""; });
        try {
          var payload = JSON.parse(body);
          message = payload.error || payload.detail || message;
          if (!/no file was started|playback was not started|no media was started/i.test(message)) message += " " + stopped;
        } catch (e) {
          if (response.status === 403) message = "Request forbidden (403). The site-origin check rejected this request. " + stopped;
        }
        if (response.status === 403 && !body) message = "Request forbidden (403). " + stopped;
      } else if (response.status === 200 && media) {
        message = "The server ignored the one-byte safety check. " + stopped + " Try another quality or contact the site owner.";
      } else if (response.status === 206 && (!oneByteRange || !media)) {
        if (response.body) await response.body.cancel().catch(function () {});
        message = "The server returned an invalid video range check. " + stopped;
      }
      throw new Error(message);
    });
  }
  function verifyDownloadReady(url) { return verifyMediaReady(url, "download"); }
  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "calculating…";
    var total = Math.max(0, Math.round(seconds)), mins = Math.floor(total / 60), secs = total % 60;
    if (mins >= 60) return String(Math.floor(mins / 60)) + "h " + String(mins % 60).padStart(2, "0") + "m";
    return String(mins) + ":" + String(secs).padStart(2, "0");
  }
  function startSiteDownload(url, filename, sourceButton) {
    var taskId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "download-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    var controller = new AbortController();
    var overlayId = "mvDownloadProgress-" + taskId, dockId = "mvDownloadDock-" + taskId, titleId = "mvDownloadProgressTitle-" + taskId;
    var overlay = el("div", { class: "mv-download-progress", id: overlayId, role: "dialog", "aria-modal": "true", "aria-labelledby": titleId });
    var card = el("div", { class: "mv-download-progress-card" });
    var title = el("h2", { class: "mv-download-progress-title", id: titleId, text: "Preparing…" });
    var file = el("p", { class: "mv-download-progress-file", text: filename });
    var track = el("div", { class: "mv-download-progress-track", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0", "aria-label": "Download progress" });
    var fill = el("div", { class: "mv-download-progress-fill" }); track.appendChild(fill);
    var status = el("p", { class: "mv-download-progress-status", role: "status", text: "Connecting to the movie server…" });
    var meta = el("p", { class: "mv-download-progress-meta", text: "Downloaded 0 B" });
    var minimize = el("button", { type: "button", class: "mv-btn ghost mv-download-progress-minimize", text: "Minimize" });
    var cancel = el("button", { type: "button", class: "mv-btn ghost mv-download-progress-cancel", text: "Cancel" });
    var dock = el("div", { class: "mv-download-dock", id: dockId, role: "status", "aria-live": "polite" });
    var dockCircle = el("button", { type: "button", class: "mv-download-dock-circle", "aria-label": "View download progress for " + filename, title: "View download progress", text: "0%" });
    var dockCopy = el("div", { class: "mv-download-dock-copy" }, [el("strong", { class: "mv-download-dock-title", text: "Downloading" }), el("span", { class: "mv-download-dock-file", text: filename })]);
    var dockTrack = el("div", { class: "mv-download-progress-track mv-download-dock-track", "aria-hidden": "true" });
    var dockFill = el("div", { class: "mv-download-progress-fill" }); dockTrack.appendChild(dockFill);
    var dockMeta = el("span", { class: "mv-download-dock-meta", text: "Preparing…" });
    var restore = el("button", { type: "button", class: "mv-download-dock-restore", text: "View" });
    var dockCancel = el("button", { type: "button", class: "mv-download-dock-cancel", "aria-label": "Cancel download", title: "Cancel download", text: "×" });
    dock.append(dockCircle, dockCopy, dockTrack, dockMeta, restore, dockCancel);
    var closed = false;
    function finishOverlay() { if (closed) return; closed = true; window.setTimeout(function () { if (overlay.isConnected) overlay.remove(); }, 1400); }
    function cancelDownload() { controller.abort(); title.textContent = "Download canceled"; status.textContent = "No file was saved."; dockMeta.textContent = "Canceled"; cancel.disabled = true; dockCancel.disabled = true; window.setTimeout(function () { if (overlay.isConnected) overlay.remove(); if (dock.isConnected) dock.remove(); }, 700); }
    cancel.addEventListener("click", cancelDownload); dockCancel.addEventListener("click", cancelDownload);
    function minimizeDownload() { overlay.classList.add("is-minimized"); if (!dock.isConnected) document.body.appendChild(dock); }
    function restoreDownload() { overlay.classList.remove("is-minimized"); }
    minimize.addEventListener("click", minimizeDownload); restore.addEventListener("click", restoreDownload);
    dockCircle.addEventListener("click", restoreDownload);
    overlay.addEventListener("click", function (event) { if (event.target === overlay) cancel.click(); });
    var dockIndex = document.querySelectorAll(".mv-download-dock").length; dock.style.setProperty("--dock-index", String(dockIndex));
    card.append(title, file, track, status, meta, el("div", { class: "mv-download-progress-actions" }, [minimize, cancel])); overlay.appendChild(card); document.body.appendChild(overlay); document.body.appendChild(dock);
    if (sourceButton) { sourceButton.disabled = true; sourceButton.setAttribute("aria-busy", "true"); sourceButton.textContent = "Preparing…"; }
    var started = performance.now(), received = 0, total = 0, lastPaint = 0;
    function paint(force) {
      var now = performance.now(); if (!force && now - lastPaint < 80) return; lastPaint = now;
      var percent = total > 0 ? Math.min(100, received / total * 100) : 0;
      var elapsed = Math.max(.001, (now - started) / 1000), speed = received / elapsed, remaining = total > 0 && speed > 0 ? (total - received) / speed : NaN;
      fill.style.width = percent.toFixed(2) + "%"; track.setAttribute("aria-valuenow", String(Math.round(percent)));
      dockFill.style.width = percent.toFixed(2) + "%";
      dockCircle.style.setProperty("--download-progress", percent.toFixed(2) + "%"); dockCircle.textContent = total > 0 ? Math.round(percent) + "%" : "…";
      meta.textContent = total > 0 ? formatBytes(received) + " of " + formatBytes(total) + " · " + formatBytes(Math.max(0, total - received)) + " left · " + formatDuration(remaining) + " remaining" : formatBytes(received) + " downloaded · calculating size…";
      dockMeta.textContent = total > 0 ? Math.round(percent) + "% · " + formatBytes(Math.max(0, total - received)) + " left · " + formatDuration(remaining) + " remaining" : formatBytes(received) + " downloaded · preparing…";
      status.textContent = total > 0 ? Math.round(percent) + "% downloaded" : "Downloading…";
    }
    fetch(url, { credentials: "same-origin", headers: { Accept: "video/mp4, application/octet-stream" }, signal: controller.signal }).then(async function (response) {
      if (!response.ok) {
        var body = await response.text().catch(function () { return ""; }), message = "Download failed (HTTP " + response.status + ").";
        try { var payload = JSON.parse(body); message = payload.error || payload.detail || message; } catch (e) {}
        throw new Error(message);
      }
      if (!response.body || !response.body.getReader) throw new Error("This browser cannot show download progress. Try again in a newer browser.");
      total = Number(response.headers.get("content-length")) || 0;
      var range = String(response.headers.get("content-range") || "").match(/\/([0-9]+)$/); if (!total && range) total = Number(range[1]) || 0;
      var reader = response.body.getReader(), chunks = [];
      while (true) { var part = await reader.read(); if (part.done) break; if (part.value && part.value.byteLength) { chunks.push(part.value); received += part.value.byteLength; paint(false); } }
      paint(true); title.textContent = "Download ready"; status.textContent = "Saving to your device…";
      var blob = new Blob(chunks, { type: response.headers.get("content-type") || "video/mp4" }), objectUrl = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = objectUrl; link.download = filename; link.rel = "noopener"; link.style.display = "none"; document.body.appendChild(link); link.click();
      window.setTimeout(function () { link.remove(); URL.revokeObjectURL(objectUrl); }, 1000);
      window.EsUI && typeof window.EsUI.toast === "function" && window.EsUI.toast("Download started: " + filename, "success", 5000);
      cancel.textContent = "Done"; cancel.disabled = true; dockCancel.disabled = true; dockCircle.textContent = "✓"; dockCircle.classList.add("is-complete"); dockMeta.textContent = "Saved"; dockCopy.querySelector(".mv-download-dock-title").textContent = "Download complete"; finishOverlay();
    }).catch(function (error) {
      if (error && error.name === "AbortError") return;
      title.textContent = "Download unavailable"; status.textContent = error.message || "No file was saved."; cancel.textContent = "Close";
      dockMeta.textContent = "Unavailable"; dockCircle.textContent = "!"; dockCircle.classList.add("is-error");
      if (window.EsUI && typeof window.EsUI.toast === "function") window.EsUI.toast(status.textContent, "error", 8000);
    }).finally(function () {
      if (!sourceButton) return; sourceButton.disabled = false; sourceButton.removeAttribute("aria-busy"); sourceButton.textContent = "Download";
    });
  }
  function showPlayerPopup(d, source, season, episode) {
    var previous = document.getElementById("mvPlayerPopup"); if (previous) previous.remove();
    var overlay = el("div", { class: "mv-player-overlay", id: "mvPlayerPopup", role: "dialog", "aria-modal": "true", "aria-label": "Movie player" });
    var card = el("div", { class: "mv-player-card" });
    var title = d.title + (d.kind === "tv" && season && episode ? " · S" + String(season).padStart(2, "0") + "E" + String(episode).padStart(2, "0") : "");
    var video = el("video", { class: "mv-player-video", playsinline: true, preload: "metadata", poster: d.backdrop || d.poster || null, "aria-label": "Play " + title });
    var status = el("p", { class: "mv-player-status", role: "status", text: "Checking stream…" });
    var stage = el("div", { class: "mv-player-stage controls-visible" });
    var playButton = el("button", { type: "button", class: "mc-btn mc-play", "aria-label": "Play" });
    var muteButton = el("button", { type: "button", class: "mc-btn mc-vol", "aria-label": "Mute" });
    var volumeSlider = el("input", { class: "mc-vol-slider", type: "range", min: "0", max: "1", step: "0.02", value: "0.8", "aria-label": "Volume" });
    var seekSlider = el("input", { class: "mv-seek-slider", type: "range", min: "0", max: "1000", step: "1", value: "0", disabled: true, "aria-label": "Seek video" });
    var currentTime = el("span", { class: "mv-player-time", text: "0:00" });
    var durationTime = el("span", { class: "mv-player-time", text: "0:00" });
    var pipButton = el("button", { type: "button", class: "mc-btn mc-pip", "aria-label": "Picture in picture", title: "Picture in picture", style: "display:none" }, [svg('<rect x="2" y="4" width="20" height="16" rx="2"/><rect x="12" y="12" width="8" height="6" rx="1" fill="currentColor"/>', 16)]);
    var lockButton = el("button", { type: "button", class: "mc-btn mc-lock", "aria-label": "Lock controls", title: "Lock controls" });
    lockButton.appendChild(svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>', 16));
    var fullButton = el("button", { type: "button", class: "mc-btn mc-full", "aria-label": "Fullscreen", title: "Fullscreen" });
    var controls = el("div", { class: "media-controls mv-media-controls" });
    var timeline = el("div", { class: "mv-player-timeline" }, [seekSlider, currentTime, el("span", { class: "mv-player-time-separator", text: "/" }), durationTime]);
    var controlsRow = el("div", { class: "mv-player-control-row" }, [playButton, muteButton, volumeSlider, el("span", { class: "mc-live-tag mv-vod-tag" }, [el("span", { class: "mc-live-dot" }), "VOD"]), el("span", { class: "mc-spacer" }), pipButton, lockButton, fullButton]);
    controls.appendChild(timeline); controls.appendChild(controlsRow);
    var volume = function (muted) {
      muteButton.textContent = "";
      muteButton.appendChild(svg(muted
        ? '<polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none"/><path d="M16 9l5 6m0-6l-5 6"/>'
        : '<polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none"/><path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"/>', 16));
      muteButton.setAttribute("aria-label", muted ? "Unmute" : "Mute");
      volumeSlider.style.setProperty("--vol", Math.round((muted ? 0 : video.volume) * 100) + "%");
    };
    var syncPlay = function () {
      playButton.textContent = "";
      playButton.appendChild(svg(video.paused
        ? '<polygon points="5,3 19,12 5,21" fill="currentColor" stroke="none"/>'
        : '<rect x="5" y="3" width="4" height="18" rx="1" fill="currentColor" stroke="none"/><rect x="15" y="3" width="4" height="18" rx="1" fill="currentColor" stroke="none"/>', 16));
      playButton.setAttribute("aria-label", video.paused ? "Play" : "Pause");
      playButton.title = video.paused ? "Play" : "Pause";
    };
    var timeText = function (seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
      var total = Math.floor(seconds), s = String(total % 60).padStart(2, "0"), m = Math.floor(total / 60);
      return m >= 60 ? String(Math.floor(m / 60)) + ":" + String(m % 60).padStart(2, "0") + ":" + s : String(m) + ":" + s;
    };
    var syncTime = function () {
      var duration = Number.isFinite(video.duration) ? video.duration : 0;
      var progress = duration > 0 ? Math.min(1000, Math.max(0, Math.round(video.currentTime / duration * 1000))) : 0;
      seekSlider.value = String(progress); seekSlider.disabled = duration <= 0;
      seekSlider.style.setProperty("--seek", (progress / 10) + "%");
      currentTime.textContent = timeText(video.currentTime); durationTime.textContent = timeText(duration);
    };
    var close = function () {
      document.removeEventListener("keydown", onKeydown);
      document.removeEventListener("fullscreenchange", fullscreenHandler);
      if (document.fullscreenElement === stage && document.exitFullscreen) { try { var exitResult = document.exitFullscreen(); if (exitResult && exitResult.catch) exitResult.catch(function () {}); } catch (e) {} }
      video.pause(); video.removeAttribute("src"); video.load(); overlay.remove();
    };
    var onKeydown = function (event) { if (event.key === "Escape") close(); };
    var hideTimer;
    var revealControls = function () {
      stage.classList.add("controls-visible"); window.clearTimeout(hideTimer);
      if (!video.paused) hideTimer = window.setTimeout(function () { stage.classList.remove("controls-visible"); }, 3000);
    };
    playButton.addEventListener("click", function () {
      if (video.paused) video.play().catch(function () { status.textContent = "Playback could not start. Check the stream connection and press Play again."; });
      else video.pause();
    });
    muteButton.addEventListener("click", function () { video.muted = !video.muted; volume(video.muted || video.volume === 0); });
    volumeSlider.addEventListener("input", function () { video.volume = Number(volumeSlider.value); video.muted = video.volume === 0; volume(video.muted); });
    seekSlider.addEventListener("input", function () { if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = Number(seekSlider.value) / 1000 * video.duration; });
    playButton.disabled = true; muteButton.disabled = true; volumeSlider.disabled = true; lockButton.disabled = true; fullButton.disabled = true;
    video.volume = 0.8;
    syncPlay(); volume(false); syncTime();
    video.addEventListener("loadedmetadata", function () { syncTime(); status.textContent = "Ready — press Play to start."; });
    video.addEventListener("timeupdate", syncTime); video.addEventListener("durationchange", syncTime); video.addEventListener("play", function () { syncPlay(); status.textContent = ""; revealControls(); });
    video.addEventListener("pause", function () { syncPlay(); revealControls(); });
    video.addEventListener("waiting", function () { status.textContent = "Buffering video…"; });
    video.addEventListener("playing", function () { status.textContent = ""; });
    video.addEventListener("error", function () {
      var code = video.error && video.error.code;
      status.textContent = code === 2 ? "Network error while loading this video. Try again or choose another quality." : code === 3 ? "This video format could not be decoded by your browser." : "The video could not be played. Try another quality or download it.";
    });
    stage.appendChild(video);
    var watermark = el("div", { class: "mv-player-watermark", "aria-hidden": "true" }, [
      el("svg", { class: "mv-player-watermark-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
        el("path", { d: "M12 2L3 6v5c0 5.25 3.75 10.15 9 11.25C17.25 21.15 21 16.25 21 11V6z" }),
        el("path", { d: "M9 12l2 2 4-4", "stroke-width": "2" }),
      ]),
      el("span", { text: "ES TEAMS TV" }),
    ]);
    stage.appendChild(watermark); stage.appendChild(controls);
    stage.addEventListener("mousemove", revealControls); stage.addEventListener("touchstart", revealControls, { passive: true });
    stage.addEventListener("click", function (event) { if (event.target === stage || event.target === video) { if (video.paused) video.play().catch(function () { status.textContent = "Playback could not start. Use the Play control or choose another quality."; }); else video.pause(); } });
    lockButton.addEventListener("click", function () {
      var locked = controls.classList.toggle("mc-locked");
      [playButton, muteButton, volumeSlider, seekSlider, pipButton, fullButton].forEach(function (control) { control.disabled = locked; });
      lockButton.setAttribute("aria-label", locked ? "Unlock controls" : "Lock controls"); lockButton.title = locked ? "Unlock controls" : "Lock controls";
      lockButton.textContent = ""; lockButton.appendChild(svg(locked ? '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>' : '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 017.8-1.2"/>', 16));
    });
    var canPip = !!(document.pictureInPictureEnabled && video.requestPictureInPicture) || typeof video.webkitSetPresentationMode === "function";
    if (canPip) {
      pipButton.style.display = "";
      pipButton.addEventListener("click", function () {
        if (video.requestPictureInPicture) {
          if (document.pictureInPictureElement) document.exitPictureInPicture().catch(function () {});
          else video.requestPictureInPicture().catch(function () {});
        } else video.webkitSetPresentationMode(video.webkitPresentationMode === "picture-in-picture" ? "inline" : "picture-in-picture");
      });
      video.addEventListener("enterpictureinpicture", function () { pipButton.classList.add("active"); });
      video.addEventListener("leavepictureinpicture", function () { pipButton.classList.remove("active"); });
    }
    fullButton.textContent = ""; fullButton.appendChild(svg('<path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M16 21h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>', 16));
    fullButton.addEventListener("click", function () {
      try {
        var result;
        if (document.fullscreenElement === stage && document.exitFullscreen) result = document.exitFullscreen();
        else if (stage.requestFullscreen) result = stage.requestFullscreen();
        else { status.textContent = "Fullscreen is not supported by this browser."; return; }
        if (result && result.catch) result.catch(function () { status.textContent = "Fullscreen could not be opened."; });
      } catch (e) { status.textContent = "Fullscreen could not be opened."; }
    });
    var fullscreenHandler = function () {
      var expanded = document.fullscreenElement === stage;
      fullButton.setAttribute("aria-label", expanded ? "Exit fullscreen" : "Fullscreen");
      fullButton.title = expanded ? "Exit fullscreen" : "Fullscreen";
      fullButton.textContent = "";
      fullButton.appendChild(svg(expanded
        ? '<path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3"/>'
        : '<path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M16 21h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>', 16));
    };
    document.addEventListener("fullscreenchange", fullscreenHandler);
    card.appendChild(el("div", { class: "mv-download-head" }, [el("div", { class: "mv-download-title", text: title }), el("button", { type: "button", class: "mv-download-close", "aria-label": "Close player", onclick: close }, ["\u00d7"])]));
    card.appendChild(el("p", { class: "mv-download-sub", text: [source.resolution, source.format].filter(Boolean).join(" · ") + " · ES TEAMS TV" }));
    card.appendChild(stage); card.appendChild(status);
    overlay.appendChild(card); document.body.appendChild(overlay);
    overlay.addEventListener("click", function (event) { if (event.target === overlay) close(); });
    document.addEventListener("keydown", onKeydown);
    verifyMediaReady(source.playUrl, "playback").then(function () {
      if (!overlay.isConnected) return;
      video.src = source.playUrl; video.load();
      playButton.disabled = false; muteButton.disabled = false; volumeSlider.disabled = false; lockButton.disabled = false; fullButton.disabled = false;
      status.textContent = "Stream ready — press Play.";
    }).catch(function (error) { if (overlay.isConnected) status.textContent = error.message || "Playback check failed. No video was started."; });
  }
  function showDownloadPopup(d, sources, season, episode) {
    var old = document.getElementById("mvDownloadPopup"); if (old) old.remove();
    var overlay = el("div", { class: "mv-download-popup", id: "mvDownloadPopup", role: "dialog", "aria-modal": "true", "aria-label": "Watch or download options" });
    var card = el("div", { class: "mv-download-card" });
    var close = function () { overlay.remove(); };
    card.appendChild(el("div", { class: "mv-download-head" }, [el("div", { class: "mv-download-title", text: "Watch or download " + d.title }), el("button", { type: "button", class: "mv-download-close", "aria-label": "Close", onclick: close }, ["\u00d7"]) ]));
    card.appendChild(el("p", { class: "mv-download-sub", text: d.kind === "tv" ? "Season " + season + ", Episode " + episode + " · choose a quality to play or download." : "Choose a quality to play here or download as MP4." }));
    var list = el("div", { class: "mv-download-list" });
    (sources || []).forEach(function (source) {
      var locked = source.premium && !source.available;
      var label = [source.resolution, source.format, formatBytes(source.size)].filter(Boolean).join(" \u00b7 ") || "Video";
      var row = el("div", { class: "mv-download-option mv-source-row" + (locked ? " locked" : "") });
      row.appendChild(el("span", { class: "mv-download-option-main" }, [el("b", { text: label }), el("small", { text: locked ? "Premium only" : "Stream or save this quality" })]));
      var actions = el("span", { class: "mv-source-actions" });
      var playButton = el("button", { type: "button", class: "mv-source-action mv-source-play", disabled: !locked && !source.playUrl, onclick: locked ? accountForPremium : function () {
        if (!source.playUrl) return;
        close(); showPlayerPopup(d, source, season, episode);
      } }, [locked ? "Premium" : (source.playUrl ? "Play" : "Unavailable")]);
      actions.appendChild(playButton);
      var readyUrl = null, checkingDownload = false;
      var downloadButton = el("button", { type: "button", class: "mv-source-action mv-source-download", disabled: !locked && !source.downloadUrl, onclick: locked ? accountForPremium : function () {
        if (!source.downloadUrl) return;
        var filename = downloadFilename(d, season, episode, source.resolution), url = source.downloadUrl;
        url += (url.indexOf("?") >= 0 ? "&" : "?") + "filename=" + encodeURIComponent(filename);
        if (readyUrl === url) {
          readyUrl = null; startSiteDownload(url, filename, downloadButton);
          return;
        }
        if (checkingDownload) return;
        checkingDownload = true;
        downloadButton.disabled = true; downloadButton.setAttribute("aria-busy", "true"); downloadButton.textContent = "Checking…";
        verifyDownloadReady(url).then(function () {
          readyUrl = url;
          downloadButton.disabled = false; downloadButton.removeAttribute("aria-busy"); downloadButton.textContent = "Start download";
          if (window.EsUI && typeof window.EsUI.toast === "function") window.EsUI.toast("Download is ready. Tap Start download to save the file.", "success", 5000);
        }).catch(function (error) {
          downloadButton.textContent = "Unavailable";
          if (window.EsUI && typeof window.EsUI.toast === "function") window.EsUI.toast(error.message || "Download check failed. No file was started.", "error", 8000);
        }).finally(function () {
          checkingDownload = false;
          if (readyUrl === url) return;
          window.setTimeout(function () { if (downloadButton.isConnected) { downloadButton.disabled = false; downloadButton.removeAttribute("aria-busy"); downloadButton.textContent = "Download"; } }, 2200);
        });
      } }, [locked ? "Premium" : "Download"]);
      actions.appendChild(downloadButton);
      row.appendChild(actions);
      list.appendChild(row);
    });
    if (!list.children.length) list.appendChild(el("p", { class: "mv-download-empty", text: "No supported playback or download source is available for this selection." }));
    card.appendChild(list);
    card.appendChild(el("button", { type: "button", class: "mv-btn ghost mv-download-cancel", onclick: close }, ["Cancel"]));
    overlay.appendChild(card); document.body.appendChild(overlay);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  }
  function paintDownloadSection(d, section, detailSavedState) {
    section.textContent = "";
    var controls = el("div", { class: "mv-download-controls" });
    var seasonSelect, episodeSelect, button;
    function addOptions(select, values) { values.forEach(function (v) { select.appendChild(el("option", { value: v, text: String(v) })); }); }
    if (d.kind === "tv" && d.seasons && d.seasons.length) {
      seasonSelect = el("select", { class: "mv-download-select", "aria-label": "Season" });
      seasonSelect.appendChild(el("option", { value: "", text: "Choose season" }));
      addOptions(seasonSelect, d.seasons.map(function (s) { return s.season; }));
      episodeSelect = el("select", { class: "mv-download-select", "aria-label": "Episode" });
      var fillEpisodes = function () { var season = d.seasons.find(function (x) { return String(x.season) === seasonSelect.value; }); episodeSelect.textContent = ""; episodeSelect.appendChild(el("option", { value: "", text: "Choose episode" })); if (!season) return; for (var i = 1; i <= season.episodes; i++) episodeSelect.appendChild(el("option", { value: i, text: "Episode " + i })); };
      fillEpisodes();
      controls.appendChild(el("label", { class: "mv-download-field" }, [el("span", { text: "Season" }), seasonSelect]));
      controls.appendChild(el("label", { class: "mv-download-field" }, [el("span", { text: "Episode" }), episodeSelect]));
    }
    var sourceState = { sources: [], loading: false, error: false };
    button = el("button", { type: "button", class: "mv-btn mv-download-open", disabled: d.kind === "tv" });
    function setButton(label) { button.textContent = ""; button.appendChild(svg(ICON.film, 16)); button.appendChild(document.createTextNode(label)); }
    setButton(d.kind === "tv" ? "Select season and episode" : "Watch or download");
    controls.appendChild(button); section.appendChild(el("h3", { text: "Watch or download" })); section.appendChild(controls);
    var shareButton = el("button", { type: "button", class: "mv-btn ghost mv-icon-action mv-share-button", "aria-label": "Share movie or series", title: "Share", onclick: function () { shareMovie(d, shareButton); } }, [svg(ICON.share, 18)]);
    controls.appendChild(shareButton);
    var bookmarkButton = watchLaterButton(d, detailSavedState, null);
    bookmarkButton.classList.add("mv-icon-action", "mv-detail-bookmark");
    controls.appendChild(bookmarkButton);
    button.addEventListener("click", function () {
      if (sourceState.loading) return;
      if (sourceState.sources.length) showDownloadPopup(d, sourceState.sources, seasonSelect ? seasonSelect.value : 1, episodeSelect ? episodeSelect.value : 1);
      else loadSources();
    });
    function loadSources() {
      var se = seasonSelect ? seasonSelect.value : 1, ep = episodeSelect ? episodeSelect.value : 1;
      if (seasonSelect && (!se || !ep)) { button.disabled = true; setButton("Select season and episode"); return; }
      sourceState.loading = true; sourceState.error = false; sourceState.sources = [];
      button.disabled = true; setButton("Checking sources...");
      api("/streams/" + encodeURIComponent(d.id) + "?slug=" + encodeURIComponent(d.slug) + "&se=" + se + "&ep=" + ep).then(function (stream) {
        sourceState.loading = false; sourceState.sources = Array.isArray(stream.sources) ? stream.sources : [];
        button.disabled = false; setButton(sourceState.sources.length ? "Choose quality" : "No video source available");
      }).catch(function (e) {
        sourceState.loading = false; sourceState.error = true; button.disabled = false;
        setButton(e && e.code === "rate_limited" ? "Try again shortly" : "Try again");
      });
    }
    if (seasonSelect) { seasonSelect.addEventListener("change", function () { fillEpisodes(); loadSources(); }); episodeSelect.addEventListener("change", loadSources); }
    else loadSources();
  }
  function paintDetail(d, saved) {
    show("detail");
    setTitle(d.title);
    els.detail.textContent = "";
    var back = el("button", { type: "button", class: "mv-back", id: "mvBack", onclick: function () { if (inApp) history.back(); else go("/movies"); } }, [svg(ICON.left, 16), "Back"]);
    var posterBox = el("div", { class: "mv-detail-poster" });
    if (d.poster) posterBox.appendChild(el("img", { src: d.poster, alt: d.title, referrerpolicy: "no-referrer", decoding: "async" }));
    var chips = el("div", { class: "mv-chips" });
    chips.appendChild(el("span", { class: "mv-chip kind", text: d.kind === "tv" ? "TV Series" : "Movie" }));
    if (d.rating) chips.appendChild(el("span", { class: "mv-chip star", text: "\u2605 " + d.rating.toFixed(1) }));
    if (d.year) chips.appendChild(el("span", { class: "mv-chip", text: d.year }));
    if (d.minutes) chips.appendChild(el("span", { class: "mv-chip", text: d.minutes + " min" }));
    if (d.country) chips.appendChild(el("span", { class: "mv-chip", text: d.country }));
    var genres = el("div", { class: "mv-chips" }, (d.genres || []).map(function (g) { return el("span", { class: "mv-chip", text: g }); }));
    var top = el("div", { class: "mv-detail-top" }, [posterBox, el("div", { class: "mv-detail-head" }, [el("h1", { class: "mv-detail-title", text: d.title }), chips, genres])]);
    var downloads = el("div", { class: "mv-section mv-download-section" });
    var inner = el("div", { class: "mv-detail-inner" }, [back, top, downloads]);
    if (d.description) inner.appendChild(el("div", { class: "mv-section" }, [el("h3", { text: "Overview" }), el("p", { class: "mv-about", text: d.description })]));
    if (d.seasons && d.seasons.length) inner.appendChild(el("div", { class: "mv-section" }, [el("h3", { text: "Seasons" }), el("div", { class: "mv-seasons" }, d.seasons.map(function (s) { return el("div", { class: "mv-season" }, [el("b", { text: "Season " + s.season }), el("span", { text: s.episodes + (s.episodes === 1 ? " episode" : " episodes") })]); }))]));
    if (d.cast && d.cast.length) inner.appendChild(el("div", { class: "mv-section" }, [el("h3", { text: "Cast" }), el("div", { class: "mv-cast" }, d.cast.map(function (p) {
      var photo = el("div", { class: "mv-person-photo" });
      if (p.photo) { var im = el("img", { alt: "", referrerpolicy: "no-referrer", loading: "lazy" }); im.addEventListener("error", function () { im.remove(); photo.textContent = p.name.charAt(0); }); im.src = p.photo; photo.appendChild(im); } else photo.textContent = p.name.charAt(0);
      return el("div", { class: "mv-person" }, [photo, el("b", { text: p.name }), p.role ? el("span", { text: p.role }) : null]);
    }))]));
    var wrap = el("div", { class: "mv-detail" }, []);
    var bg = el("div", { class: "mv-detail-bg" });
    var bgUrl = d.backdrop || d.poster;
    if (bgUrl) bg.style.backgroundImage = 'url("' + bgUrl.replace(/"/g, "%22") + '")';
    wrap.appendChild(bg); wrap.appendChild(inner);
    els.detail.appendChild(wrap);
    paintDownloadSection(d, downloads, saved);
  }

  /* ---------------------------------------------------------------- moving around (real URLs, so Back and refresh work) */
  function route() {
    closeSuggest();
    var path = location.pathname.replace(/\/+$/, "");
    var params = new URLSearchParams(location.search);
    var m = /^\/movies\/title\/([^/]+)$/.exec(path);
    if (m) {
      var slug; try { slug = decodeURIComponent(m[1]); } catch (e) { slug = ""; }
      return slug ? loadDetail(slug) : showState("not_found");
    }
    var q = (params.get("q") || "").trim();
    if (q) { els.input.value = q; els.clear.hidden = false; return loadGrid({ q: q.slice(0, 60) }); }
    var cat = params.get("cat");
    if (cat && Object.prototype.hasOwnProperty.call(TITLES, cat)) { var sort = params.get("sort"); return loadGrid({ kind: cat, sort: SORTS.some(function (s) { return s[0] === sort; }) ? sort : "RECOMMEND" }); }
    els.input.value = ""; els.clear.hidden = true;
    loadHome();
  }
  function go(url, replace) {
    try { history.replaceState(Object.assign({}, history.state, { y: window.scrollY }), ""); } catch (e) { /* ignore */ }
    if (replace) history.replaceState({ y: 0 }, "", url); else { history.pushState({ y: 0 }, "", url); inApp = true; }
    route();
    window.scrollTo(0, 0);
  }
  window.addEventListener("popstate", function () {
    route();
    var y = history.state && history.state.y;
    if (y) requestAnimationFrame(function () { window.scrollTo(0, y); });
  });

  /* ---------------------------------------------------------------- tabs and search */
  els.tabs.addEventListener("click", function (e) {
    var b = e.target.closest(".mv-tab");
    if (!b) return;
    var tab = b.getAttribute("data-tab");
    go(tab === "home" ? "/movies" : "/movies?cat=" + tab);
  });

  function closeSuggest() { els.suggest.classList.remove("open"); els.suggest.textContent = ""; sugCur = -1; }
  function showSearchLoading() {
    els.suggest.textContent = "";
    els.suggest.appendChild(el("div", { class: "cx-loading" }, [el("span", { class: "cx-dots" }, [el("span"), el("span"), el("span")]), "Searching"]));
    els.suggest.classList.add("open");
  }
  function showSearchFallback(q) {
    els.suggest.textContent = "";
    els.suggest.appendChild(el("button", { type: "button", role: "option", text: 'Search all titles for "' + q + '"', onclick: runSearch }));
    els.suggest.classList.add("open");
  }
  var sugTimer = null, sugToken = 0, sugCur = -1;
  function runSearch() {
    var q = els.input.value.trim();
    if (!q) return;
    closeSuggest();
    els.input.blur();
    els.nav.classList.remove("searching");
    go("/movies?q=" + encodeURIComponent(q));
  }
  els.form.addEventListener("submit", function (e) {
    e.preventDefault();
    var cur = els.suggest.querySelectorAll("button")[sugCur];
    if (cur && els.suggest.classList.contains("open")) { cur.click(); return; }
    runSearch();
  });
  els.input.addEventListener("input", function () {
    var q = els.input.value.trim();
    els.clear.hidden = !els.input.value;
    clearTimeout(sugTimer);
    if (q.length < 2) { closeSuggest(); return; }
    var n = ++sugToken;
    showSearchLoading();
    sugTimer = setTimeout(function () {
      api("/suggest?q=" + encodeURIComponent(q.slice(0, 60))).then(function (d) {
        if (n !== sugToken || els.input.value.trim() !== q) return;
        els.suggest.textContent = "";
        sugCur = -1;
        var suggestions = d.suggestions || [];
        if (!suggestions.length) { showSearchFallback(q); return; }
        suggestions.forEach(function (s) {
          els.suggest.appendChild(el("button", { type: "button", role: "option", text: s.title, onclick: function () { closeSuggest(); els.input.blur(); els.nav.classList.remove("searching"); go(detailUrl(s.slug)); } }));
        });
        els.suggest.classList.add("open");
      }, function () {
        if (n !== sugToken || els.input.value.trim() !== q) return;
        showSearchFallback(q);
      });
    }, 220);
  });
  els.input.addEventListener("keydown", function (e) {
    var items = els.suggest.querySelectorAll("button");
    if (e.key === "Escape") { closeSuggest(); return; }
    if (!items.length || !els.suggest.classList.contains("open")) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      sugCur = (sugCur + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach(function (b, i) { b.classList.toggle("cur", i === sugCur); });
    }
  });
  els.clear.addEventListener("click", function () { els.input.value = ""; els.clear.hidden = true; closeSuggest(); els.input.focus(); });
  document.addEventListener("click", function (e) { if (!els.form.contains(e.target) && e.target !== els.toggle && !els.toggle.contains(e.target)) closeSuggest(); });
  els.toggle.addEventListener("click", function () {
    var on = els.nav.classList.toggle("searching");
    if (on) els.input.focus(); else closeSuggest();
  });

  try { history.replaceState({ y: 0 }, ""); } catch (e) { /* ignore */ }
  route();
})();
