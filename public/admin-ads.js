(function () {
  var card = document.getElementById("adsCard");
  if (!card) return;

  var NAIRA = "\u20a6";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var PAGE = 15;
  var REFRESH_MS = 30000;

  var header = document.getElementById("adsHeader");
  var countEl = document.getElementById("adsCount");
  var statsEl = document.getElementById("adsStats");
  var filterEl = document.getElementById("adsFilter");
  var searchEl = document.getElementById("adsSearch");
  var listEl = document.getElementById("adsList");
  var moreEl = document.getElementById("adsMore");
  var overlay = document.getElementById("adsOverlay");
  var modal = document.getElementById("adsModal");

  var state = { data: null, filter: "active", query: "", shown: PAGE, loaded: false, failed: false, fetchedAt: 0 };
  var detailToken = 0;

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

  function s(tag, attrs, kids) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    (kids || []).forEach(function (child) {
      node.appendChild(child);
    });
    return node;
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString("en-US");
  }

  function compact(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + "M";
    if (n >= 1000) return (n / 1000).toFixed(n % 1000 ? 1 : 0) + "k";
    return String(n);
  }

  function money(n) {
    return NAIRA + fmt(n);
  }

  function pct(n) {
    return Number(n || 0).toFixed(2) + "%";
  }

  function when(ts) {
    if (!ts) return "None";
    var d = new Date(ts);
    var hours = d.getHours();
    var mins = String(d.getMinutes()).padStart(2, "0");
    var suffix = hours >= 12 ? "pm" : "am";
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear() + ", " + (hours % 12 || 12) + ":" + mins + suffix;
  }

  function dayLabel(day) {
    var parts = String(day).split("-");
    return Number(parts[2]) + " " + MONTHS[Number(parts[1]) - 1];
  }

  function left(ms) {
    if (ms <= 0) return "ending";
    var totalMin = Math.ceil(ms / 60000);
    var d = Math.floor(totalMin / 1440);
    var hrs = Math.floor((totalMin % 1440) / 60);
    var min = totalMin % 60;
    if (d > 0) return d + "d " + hrs + "h left";
    if (hrs > 0) return hrs + "h " + min + "m left";
    return min + "m left";
  }

  function who(ad) {
    var o = ad.owner || {};
    if (o.username) return "@" + o.username;
    return o.email || "Unknown user";
  }

  function statusText(ad) {
    if (ad.status === "live") return "Live";
    if (ad.status === "ended") return "Ended";
    if (ad.status === "draft") return "Unpaid";
    return "Removed";
  }

  function pill(ad) {
    return h("span", { class: "aa-pill " + ad.status }, [h("i"), statusText(ad)]);
  }

  function getJSON(url, body) {
    var opts = { credentials: "same-origin", headers: { "Content-Type": "application/json" } };
    if (body !== undefined) {
      opts.method = "POST";
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok) throw new Error(json.error || "Request failed");
        return json;
      });
    });
  }

  function isActive(ad) {
    return ad.status === "live";
  }

  function visible(ad) {
    if (state.filter === "active" && !isActive(ad)) return false;
    if (state.filter === "inactive" && isActive(ad)) return false;
    if (!state.query) return true;
    var o = ad.owner || {};
    var hay = [ad.title, ad.url, o.username, o.email].join(" ").toLowerCase();
    return hay.indexOf(state.query) !== -1;
  }

  function stat(label, value) {
    return h("div", { class: "aa-stat" }, [h("div", { class: "aa-stat-label", text: label }), h("div", { class: "aa-stat-value", text: value })]);
  }

  function renderStats() {
    statsEl.textContent = "";
    if (!state.data) return;
    var sm = state.data.summary;
    statsEl.appendChild(stat("Live now", fmt(sm.live)));
    statsEl.appendChild(stat("Revenue", money(sm.revenueNgn)));
    statsEl.appendChild(stat("Impressions", fmt(sm.impressions)));
    statsEl.appendChild(stat("Clicks", fmt(sm.clicks) + "  \u00b7  " + pct(sm.ctr)));
  }

  function renderFilter() {
    filterEl.textContent = "";
    var sm = state.data ? state.data.summary : null;
    var counts = {
      active: sm ? sm.live : 0,
      inactive: sm ? sm.ended + sm.draft + sm.removed : 0,
      all: sm ? sm.live + sm.ended + sm.draft + sm.removed : 0
    };
    [["active", "Active"], ["inactive", "Inactive"], ["all", "All"]].forEach(function (pair) {
      filterEl.appendChild(
        h("button", {
          type: "button",
          class: state.filter === pair[0] ? "on" : "",
          onclick: function () {
            state.filter = pair[0];
            state.shown = PAGE;
            renderFilter();
            renderList();
          }
        }, [pair[1], h("span", { text: String(counts[pair[0]]) })])
      );
    });
  }

  function row(ad) {
    var thumb = h("div", { class: "aa-thumb" });
    if (ad.img) thumb.style.backgroundImage = 'url("' + ad.img + '")';
    var sub = who(ad) + (ad.status === "live" ? "  \u00b7  " + left(ad.remainingMs - (Date.now() - state.fetchedAt)) : "");
    return h("button", { type: "button", class: "ad-row aa-row", onclick: function () { openDetail(ad); } }, [
      thumb,
      h("div", { class: "ad-row-info" }, [
        h("div", { class: "ad-row-name", text: ad.title }),
        h("div", { class: "ad-row-email", text: sub }),
        h("div", { class: "aa-nums", text: compact(ad.impressions) + " views  \u00b7  " + compact(ad.clicks) + " clicks" })
      ]),
      h("div", { class: "aa-side" }, [pill(ad)])
    ]);
  }

  function renderList() {
    listEl.textContent = "";
    moreEl.style.display = "none";
    if (!state.loaded) {
      if (state.failed) {
        listEl.appendChild(h("div", { class: "ad-empty", text: "Could not load ads." }));
      } else {
        listEl.appendChild(h("div", { class: "aa-skel" }));
        listEl.appendChild(h("div", { class: "aa-skel" }));
      }
      return;
    }
    var items = state.data.ads.filter(visible);
    if (!items.length) {
      var text = state.query ? "No ads match that search." : state.filter === "active" ? "No ads are live right now." : state.filter === "inactive" ? "No inactive ads." : "No ads yet.";
      listEl.appendChild(h("div", { class: "ad-empty", text: text }));
      return;
    }
    items.slice(0, state.shown).forEach(function (ad) {
      listEl.appendChild(row(ad));
    });
    if (items.length > state.shown) {
      moreEl.style.display = "";
      moreEl.textContent = "Show more (" + (items.length - state.shown) + ")";
    }
  }

  function render() {
    var live = state.data ? state.data.summary.live : 0;
    countEl.textContent = String(live);
    countEl.style.display = state.loaded ? "" : "none";
    renderStats();
    renderFilter();
    renderList();
  }

  function load() {
    return getJSON("/api/promote/admin/list")
      .then(function (data) {
        state.data = data;
        state.fetchedAt = Date.now();
        state.loaded = true;
        state.failed = false;
        render();
      })
      .catch(function () {
        if (!state.loaded) {
          state.failed = true;
          render();
        }
      });
  }

  function chart(daily, metric, width) {
    var height = 170;
    var padLeft = 38;
    var padBottom = 22;
    var padTop = 8;
    var plotW = width - padLeft;
    var plotH = height - padBottom - padTop;
    var values = daily.map(function (d) { return d[metric]; });
    var peak = Math.max.apply(null, values.concat([0]));
    var top = peak < 4 ? 4 : Math.ceil(peak / 4) * 4;
    var svg = s("svg", { class: "aa-chart", viewBox: "0 0 " + width + " " + height, width: width, height: height, role: "img", "aria-label": "Daily " + metric });
    svg.appendChild(
      s("defs", null, [
        s("linearGradient", { id: "aaBar", x1: "0", y1: "0", x2: "0", y2: "1" }, [
          s("stop", { offset: "0", "stop-color": "#00E0FF" }),
          s("stop", { offset: "1", "stop-color": "#7c5cff" })
        ])
      ])
    );
    [0, 0.5, 1].forEach(function (frac) {
      var y = padTop + plotH - plotH * frac;
      svg.appendChild(s("line", { class: "grid", x1: padLeft, x2: width, y1: y, y2: y }));
      var label = s("text", { x: padLeft - 8, y: y + 3, "text-anchor": "end" });
      label.textContent = compact(Math.round(top * frac));
      svg.appendChild(label);
    });
    var slot = plotW / daily.length;
    var barW = Math.max(3, slot * 0.6);
    daily.forEach(function (d, i) {
      var barH = values[i] > 0 ? Math.max(2, (values[i] / top) * plotH) : 0;
      var x = padLeft + i * slot + (slot - barW) / 2;
      var rect = s("rect", { class: "bar", x: x, y: padTop + plotH - barH, width: barW, height: barH, rx: 2 });
      var tip = s("title");
      tip.textContent = dayLabel(d.day) + ": " + fmt(values[i]) + " " + metric;
      rect.appendChild(tip);
      svg.appendChild(rect);
    });
    [0, Math.floor((daily.length - 1) / 2), daily.length - 1].forEach(function (i, n) {
      var x = n === 0 ? padLeft : n === 2 ? width : padLeft + i * slot + slot / 2;
      var label = s("text", { x: x, y: height - 6, "text-anchor": n === 0 ? "start" : n === 2 ? "end" : "middle" });
      label.textContent = dayLabel(daily[i].day);
      svg.appendChild(label);
    });
    return svg;
  }

  function closeOverlay() {
    detailToken += 1;
    overlay.classList.remove("show");
  }

  function closeButton() {
    return h("button", { class: "aa-x", type: "button", "aria-label": "Close", text: "\u00d7", onclick: closeOverlay });
  }

  function openDetail(ad) {
    var token = ++detailToken;
    modal.textContent = "";
    modal.appendChild(
      h("div", { class: "aa-head" }, [h("div", { class: "ad-modal-title", text: ad.title }), closeButton()])
    );
    modal.appendChild(h("div", { class: "aa-skel", style: "margin-top:14px" }));
    modal.appendChild(h("div", { class: "aa-skel", style: "margin-top:10px;height:150px" }));
    overlay.classList.add("show");

    getJSON("/api/promote/admin/ad/" + encodeURIComponent(ad.id))
      .then(function (detail) {
        if (token !== detailToken) return;
        paintDetail(detail);
      })
      .catch(function (err) {
        if (token !== detailToken) return;
        modal.textContent = "";
        modal.appendChild(h("div", { class: "aa-head" }, [h("div", { class: "ad-modal-title", text: ad.title }), closeButton()]));
        modal.appendChild(h("div", { class: "ad-empty", text: err.message || "Could not load that ad." }));
      });
  }

  function paintDetail(detail) {
    var ad = detail.ad;
    var metric = "impressions";
    modal.textContent = "";

    modal.appendChild(h("div", { class: "aa-head" }, [h("div", { class: "ad-modal-title", text: ad.title }), closeButton()]));
    modal.appendChild(h("div", { class: "aa-owner" }, [pill(ad), "  " + who(ad)]));

    if (ad.img) {
      var img = h("div", { class: "aa-hero-img" });
      img.style.backgroundImage = 'url("' + ad.img + '")';
      modal.appendChild(img);
    }
    modal.appendChild(h("div", { class: "aa-copy", text: ad.body }));
    modal.appendChild(h("a", { class: "aa-link", href: ad.url, target: "_blank", rel: "noopener noreferrer nofollow", text: ad.cta + "  \u2192  " + ad.url }));

    modal.appendChild(
      h("div", { class: "aa-metrics" }, [
        stat("Impressions", fmt(ad.impressions)),
        stat("Clicks", fmt(ad.clicks)),
        stat("Click rate", pct(ad.ctr)),
        stat("Paid", money(ad.spentNgn))
      ])
    );

    var chartBox = h("div");
    var seg = h("div", { class: "aa-seg" });
    function paintChart() {
      seg.textContent = "";
      ["impressions", "clicks"].forEach(function (m) {
        seg.appendChild(
          h("button", {
            type: "button",
            class: metric === m ? "on" : "",
            text: m === "impressions" ? "Impressions" : "Clicks",
            onclick: function () {
              metric = m;
              paintChart();
            }
          })
        );
      });
      chartBox.textContent = "";
      var width = Math.max(260, modal.clientWidth - 44);
      chartBox.appendChild(chart(detail.daily, metric, width));
    }
    modal.appendChild(h("div", { class: "aa-chart-top" }, [h("div", { class: "aa-stat-label", text: "Last 30 days" }), seg]));
    modal.appendChild(chartBox);
    paintChart();

    var perDay = detail.activeDays ? Math.round(ad.impressions / detail.activeDays) : 0;
    var facts = [
      ["Advertiser", who(ad)],
      ["Started", when(ad.startsAt)],
      [ad.status === "live" ? "Ends" : "Ended", ad.endsAt ? when(ad.endsAt) + (ad.status === "live" ? "  (" + left(ad.remainingMs) + ")" : "") : "None"],
      ["Days purchased", String(ad.totalDays)],
      ["Created", when(ad.createdAt)],
      ["Avg views per active day", fmt(perDay)]
    ];
    modal.appendChild(
      h("div", { class: "aa-facts", style: "margin-top:14px" }, facts.map(function (f) {
        return h("div", { class: "aa-fact" }, [h("span", { text: f[0] }), h("span", { text: f[1] })]);
      }))
    );

    var msg = h("div", { class: "ad-modal-msg", role: "alert" });
    modal.appendChild(msg);
    var actions = h("div", { class: "ad-modal-actions" }, [h("button", { class: "ad-modal-btn ghost", type: "button", text: "Close", onclick: closeOverlay })]);
    if (ad.status !== "removed") {
      var armed = false;
      var timer = null;
      var takedown = h("button", { class: "ad-modal-btn danger", type: "button", text: "Take down" });
      takedown.addEventListener("click", function () {
        if (!armed) {
          armed = true;
          takedown.textContent = "Tap again to confirm";
          timer = setTimeout(function () {
            armed = false;
            takedown.textContent = "Take down";
          }, 4000);
          return;
        }
        clearTimeout(timer);
        takedown.disabled = true;
        takedown.textContent = "Removing";
        getJSON("/api/promote/admin/" + encodeURIComponent(ad.id) + "/remove", {})
          .then(function () {
            closeOverlay();
            return load();
          })
          .catch(function (err) {
            takedown.disabled = false;
            armed = false;
            takedown.textContent = "Take down";
            msg.className = "ad-modal-msg err";
            msg.textContent = err.message || "Could not remove that ad.";
          });
      });
      actions.appendChild(takedown);
    }
    modal.appendChild(actions);
  }

  header.addEventListener("click", function () {
    card.classList.toggle("open");
    if (card.classList.contains("open")) load();
  });

  render();
  load();

  searchEl.addEventListener("input", function () {
    state.query = searchEl.value.trim().toLowerCase();
    state.shown = PAGE;
    renderList();
  });
  moreEl.addEventListener("click", function () {
    state.shown += PAGE;
    renderList();
  });
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeOverlay();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("show")) closeOverlay();
  });

  setInterval(function () {
    if (!card.classList.contains("open")) return;
    if (document.visibilityState !== "visible" || overlay.classList.contains("show")) return;
    load();
  }, REFRESH_MS);
})();
