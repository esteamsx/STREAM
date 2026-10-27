/* Movies page. Talks only to this site's /api/movies/* (never to the movie API directly).
   Everything the API sends is added to the page as plain text, never as HTML. */
(function () {
  "use strict";
  var API = "/api/movies";
  var SORTS = [["RECOMMEND", "Recommended"], ["NEWEST", "Newest"], ["RATING", "Top rated"]];
  var TITLES = { movies: "Movies", "tv-series": "TV Series", animation: "Animation" };

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
    film: '<rect x="3" y="3" width="18" height="18" rx="2.2"/><path d="M7 3v18M17 3v18M3 12h18M3 7h4M3 17h4M17 17h4M17 7h4"/>',
    warn: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>',
  };
  function api(path) {
    return fetch(API + path, { credentials: "same-origin", headers: { Accept: "application/json" } }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) { var e = new Error(data.error || "Something went wrong."); e.code = data.code || "server"; e.status = res.status; throw e; }
        return data;
      });
    });
  }
  function detailUrl(slug) { return "/movies/title/" + encodeURIComponent(slug); }
  function setTitle(t) { document.title = (t ? t + " | " : "") + "Movies | ES TEAMS TV"; }

  /* ---------------------------------------------------------------- what is on screen */
  function show(which) {
    ["home", "grid", "detail"].forEach(function (k) { els[k].hidden = k !== which; });
    els.state.hidden = which !== "state";
    if (which !== "home") stopHero();
  }
  function setTab(tab) {
    Array.prototype.forEach.call(els.tabs.querySelectorAll(".mv-tab"), function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === tab); });
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
  function card(item) {
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
    if (!item.slug) return el("div", { class: "mv-card", "aria-label": item.title }, kids);
    var a = el("a", { class: "mv-card", href: detailUrl(item.slug), "aria-label": item.title }, kids);
    a.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      go(detailUrl(item.slug));
    });
    return a;
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
    var scroller = el("div", { class: "mv-scroll" }, r.items.map(card));
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
    if (g.kind) {
      var sorts = el("div", { class: "mv-sorts", role: "group", "aria-label": "Sort" });
      SORTS.forEach(function (s) { sorts.appendChild(el("button", { type: "button", class: "mv-sort" + (g.sort === s[0] ? " on" : ""), "data-sort": s[0], onclick: function () { go("/movies?cat=" + g.kind + (s[0] === "RECOMMEND" ? "" : "&sort=" + s[0]), true); } }, [s[1]])); });
      head.appendChild(sorts);
    }
    var grid = el("div", { class: "mv-grid", id: "mvGridItems" });
    var more = el("div", { class: "mv-more" });
    els.grid.appendChild(head); els.grid.appendChild(grid); els.grid.appendChild(more);
    for (var i = 0; i < 12; i++) grid.appendChild(el("div", { class: "mv-sk", style: "aspect-ratio:2/3" }));

    function fetchPage(first) {
      var path = g.q ? "/search?q=" + encodeURIComponent(g.q) + "&page=" + g.page : "/catalog/" + g.kind + "?page=" + g.page + "&sort=" + g.sort;
      api(path).then(function (d) {
        if (t !== token) return;
        if (first) grid.textContent = "";
        g.items = g.items.concat(d.items || []); g.hasMore = !!d.hasMore; g.total = d.total || 0;
        (d.items || []).forEach(function (it) { grid.appendChild(card(it)); });
        if (g.total) title.appendChild(el("small", { text: g.total.toLocaleString() + " titles" }));
        if (first && !g.items.length) { grid.appendChild(el("div", { class: "mv-empty", text: g.q ? 'No results for "' + g.q + '". Try a different title.' : "Nothing to show here yet." })); }
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
    api("/detail/" + encodeURIComponent(slug)).then(function (d) { if (t !== token) return; paintDetail(d); }, function (e) { if (t !== token) return; failed(e, function () { loadDetail(slug); }); });
  }
  function formatBytes(n) {
    if (!n || !Number.isFinite(Number(n))) return "";
    var units = ["B", "KB", "MB", "GB", "TB"]; var i = 0; var v = Number(n);
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return (i === 0 ? Math.round(v) : v.toFixed(v >= 10 ? 0 : 1)) + " " + units[i];
  }
  function accountForPremium() { window.location.href = "/account#verify"; }
  function showDownloadPopup(d, sources, season, episode) {
    var old = document.getElementById("mvDownloadPopup"); if (old) old.remove();
    var overlay = el("div", { class: "mv-download-popup", id: "mvDownloadPopup", role: "dialog", "aria-modal": "true", "aria-label": "Download options" });
    var card = el("div", { class: "mv-download-card" });
    var close = function () { overlay.remove(); };
    card.appendChild(el("div", { class: "mv-download-head" }, [el("div", { class: "mv-download-title", text: "Download " + d.title }), el("button", { type: "button", class: "mv-download-close", "aria-label": "Close", onclick: close }, ["\u00d7"]) ]));
    card.appendChild(el("p", { class: "mv-download-sub", text: d.kind === "tv" ? "Season " + season + ", Episode " + episode : "Choose a resolution and format." }));
    var list = el("div", { class: "mv-download-list" });
    (sources || []).forEach(function (source) {
      var locked = source.premium && !source.available;
      var label = [source.resolution, source.format, formatBytes(source.size)].filter(Boolean).join(" \u00b7 ") || "Download";
      var row = el("button", { type: "button", class: "mv-download-option" + (locked ? " locked" : ""), disabled: false, onclick: locked ? accountForPremium : function () { window.location.href = source.downloadUrl; } }, [el("span", { class: "mv-download-option-main" }, [el("b", { text: label }), el("small", { text: locked ? "Premium only" : (source.resolution === "360p" ? "Free mobile quality" : "Ready to download") })]), el("span", { class: "mv-download-option-mark" }, [svg(ICON.download, 15), document.createTextNode(locked ? "Premium" : "Download")])]);
      list.appendChild(row);
    });
    if (!list.children.length) list.appendChild(el("p", { class: "mv-download-empty", text: "No supported download source is available for this selection." }));
    card.appendChild(list);
    card.appendChild(el("button", { type: "button", class: "mv-btn ghost mv-download-cancel", onclick: close }, ["Cancel"]));
    overlay.appendChild(card); document.body.appendChild(overlay);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  }
  function paintDownloadSection(d, section) {
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
    function setButton(label) { button.textContent = ""; button.appendChild(svg(ICON.download, 16)); button.appendChild(document.createTextNode(label)); }
    setButton(d.kind === "tv" ? "Select season and episode" : "Download");
    controls.appendChild(button); section.appendChild(el("h3", { text: "Download" })); section.appendChild(controls);
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
        button.disabled = false; setButton(sourceState.sources.length ? "Download" : "No downloads available");
      }).catch(function (e) {
        sourceState.loading = false; sourceState.error = true; button.disabled = false;
        setButton(e && e.code === "rate_limited" ? "Try again shortly" : "Try again");
      });
    }
    if (seasonSelect) { seasonSelect.addEventListener("change", function () { fillEpisodes(); loadSources(); }); episodeSelect.addEventListener("change", loadSources); }
    else loadSources();
  }
  function paintDetail(d) {
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
    paintDownloadSection(d, downloads);
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
        (d.suggestions || []).forEach(function (s) {
          els.suggest.appendChild(el("button", { type: "button", role: "option", text: s.title, onclick: function () { closeSuggest(); els.input.blur(); els.nav.classList.remove("searching"); go(detailUrl(s.slug)); } }));
        });
        els.suggest.classList.toggle("open", els.suggest.children.length > 0);
      }, closeSuggest);
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
