(function () {
  var NAIRA = "\u20a6";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var POLL_MS = 20000;
  var DAY_CHIPS = [1, 3, 7, 14, 30];

  var state = { data: null, fetchedAt: 0, metric: "impressions", loaded: false, failed: false };

  var summaryEl = document.getElementById("pmSummary");
  var listEl = document.getElementById("pmList");
  var overlay = document.getElementById("pmOverlay");
  var modal = document.getElementById("pmModal");
  var toastEl = document.getElementById("pmToast");
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

  function dayLabel(day) {
    var parts = String(day).split("-");
    return Number(parts[2]) + " " + MONTHS[Number(parts[1]) - 1];
  }

  function leftLabel(ms) {
    if (ms < 60000) return "under a minute left";
    var totalMin = Math.ceil(ms / 60000);
    var d = Math.floor(totalMin / 1440);
    var hrs = Math.floor((totalMin % 1440) / 60);
    var min = totalMin % 60;
    if (d > 0) return d + "d " + hrs + "h left";
    if (hrs > 0) return hrs + "h " + min + "m left";
    return min + "m left";
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 3200);
  }

  function api(path, body) {
    var opts = { credentials: "same-origin", headers: { "Content-Type": "application/json" } };
    if (body !== undefined) {
      opts.method = "POST";
      opts.body = JSON.stringify(body);
    }
    return fetch(path, opts).then(function (res) {
      if (res.status === 401) {
        window.location.href = "/login?next=" + encodeURIComponent("/promote");
        throw new Error("Please sign in.");
      }
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
        return json;
      });
    });
  }

  function load() {
    return api("/api/promote/mine")
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

  function sum(list, key) {
    return list.reduce(function (total, item) {
      return total + (item[key] || 0);
    }, 0);
  }

  function chart(daily, metric) {
    var width = Math.max(280, summaryEl.clientWidth - 38);
    var height = 190;
    var padLeft = 40;
    var padBottom = 24;
    var padTop = 8;
    var plotW = width - padLeft;
    var plotH = height - padBottom - padTop;
    var values = daily.map(function (d) { return d[metric]; });
    var peak = Math.max.apply(null, values.concat([0]));
    var top = peak < 4 ? 4 : Math.ceil(peak / 4) * 4;
    var svg = s("svg", { class: "pm-chart", viewBox: "0 0 " + width + " " + height, width: width, height: height, role: "img", "aria-label": "Daily " + metric });
    svg.style.height = height + "px";
    svg.appendChild(
      s("defs", null, [
        s("linearGradient", { id: "pmBar", x1: "0", y1: "0", x2: "0", y2: "1" }, [
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
    var barW = Math.max(4, slot * 0.58);
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
      var anchor = n === 0 ? "start" : n === 2 ? "end" : "middle";
      var x = n === 0 ? padLeft : n === 2 ? width : padLeft + i * slot + slot / 2;
      var label = s("text", { x: x, y: height - 6, "text-anchor": anchor });
      label.textContent = dayLabel(daily[i].day);
      svg.appendChild(label);
    });
    return svg;
  }

  function sparkline(daily) {
    var values = daily.map(function (d) { return d.impressions; });
    var peak = Math.max.apply(null, values.concat([1]));
    var points = values
      .map(function (v, i) {
        var x = (i / (values.length - 1)) * 100;
        var y = 31 - (v / peak) * 28;
        return x.toFixed(2) + "," + y.toFixed(2);
      })
      .join(" ");
    var line = s("polyline", { points: points });
    line.setAttribute("vector-effect", "non-scaling-stroke");
    return s("svg", { class: "pm-spark", viewBox: "0 0 100 34", preserveAspectRatio: "none" }, [line]);
  }

  function tile(label, value, sub) {
    return h("div", { class: "pm-stat" }, [
      h("div", { class: "pm-label", text: label }),
      h("div", { class: "pm-value", text: value }),
      h("div", { class: "pm-sub", text: sub })
    ]);
  }

  function renderSummary() {
    summaryEl.textContent = "";
    var data = state.data;
    if (!state.loaded || !data || !data.ads.length) return;
    var sm = data.summary;
    var recentViews = sum(sm.daily, "impressions");
    var recentClicks = sum(sm.daily, "clicks");

    summaryEl.appendChild(
      h("div", { class: "pm-stats" }, [
        tile("Impressions", fmt(sm.impressions), fmt(recentViews) + " in 14 days"),
        tile("Clicks", fmt(sm.clicks), fmt(recentClicks) + " in 14 days"),
        tile("Click rate", pct(sm.ctr), "clicks per view"),
        tile("Spent", money(sm.spentNgn), sm.liveCount + (sm.liveCount === 1 ? " ad live" : " ads live"))
      ])
    );

    var seg = h("div", { class: "pm-seg" }, ["impressions", "clicks"].map(function (metric) {
      return h("button", {
        type: "button",
        class: state.metric === metric ? "on" : "",
        text: metric === "impressions" ? "Impressions" : "Clicks",
        onclick: function () {
          state.metric = metric;
          renderSummary();
        }
      });
    }));
    var panel = h("div", { class: "pm-panel" }, [
      h("div", { class: "pm-panel-top" }, [h("div", { class: "pm-label", text: "Last 14 days" }), seg])
    ]);
    summaryEl.appendChild(panel);
    panel.appendChild(chart(sm.daily, state.metric));
  }

  function statusPill(ad) {
    var text = ad.status === "live" ? "Live, " + leftLabel(ad.remainingMs - (Date.now() - state.fetchedAt)) : ad.status === "draft" ? "Not paid" : "Ended";
    return h("span", { class: "pm-pill" + (ad.status === "live" ? " live" : "") }, [h("i"), text]);
  }

  function metric(label, value) {
    return h("div", { class: "pm-metric" }, [h("div", { class: "pm-label", text: label }), h("div", { class: "pm-num", text: value })]);
  }

  function adCard(ad) {
    var thumb = null;
    if (ad.img) {
      thumb = h("div", { class: "pm-thumb" });
      thumb.style.backgroundImage = 'url("' + ad.img + '")';
    }

    var card = h("article", { class: "pm-ad" }, [
      h("div", { class: "pm-ad-top" }, [
        thumb,
        h("div", { class: "pm-ad-info" }, [
          h("div", { class: "pm-ad-title", text: ad.title }),
          h("div", { class: "pm-ad-body", text: ad.body }),
          h("div", { class: "pm-ad-url", text: ad.url })
        ]),
        statusPill(ad)
      ])
    ]);

    if (ad.status !== "draft") {
      card.appendChild(
        h("div", { class: "pm-metrics" }, [
          metric("Impressions", fmt(ad.impressions)),
          metric("Clicks", fmt(ad.clicks)),
          metric("Click rate", pct(ad.ctr)),
          metric("Spent", money(ad.spentNgn)),
          h("div", { class: "pm-spark-cell" }, [h("div", { class: "pm-label", text: "14 days", style: "margin-bottom:4px" }), sparkline(ad.daily)])
        ])
      );
    }

    var actions = h("div", { class: "pm-actions" });
    if (ad.status === "draft") {
      actions.appendChild(h("button", { class: "pm-btn small", type: "button", text: "Pay and go live", onclick: function () { openCheckout(ad); } }));
      actions.appendChild(h("button", { class: "pm-btn small danger", type: "button", text: "Delete", onclick: function () { removeDraft(ad); } }));
    } else if (ad.status === "live") {
      actions.appendChild(h("button", { class: "pm-btn small ghost", type: "button", text: "Add time", onclick: function () { openCheckout(ad); } }));
    } else {
      actions.appendChild(h("button", { class: "pm-btn small", type: "button", text: "Run again", onclick: function () { openCheckout(ad); } }));
    }
    card.appendChild(actions);
    return card;
  }

  function renderList() {
    listEl.textContent = "";
    if (!state.loaded) {
      if (state.failed) {
        listEl.appendChild(
          h("div", { class: "pm-empty" }, [
            h("h3", { text: "Could not load your ads" }),
            h("p", { text: "Check your connection and try again." }),
            h("button", { class: "pm-btn", type: "button", text: "Retry", onclick: function () { state.failed = false; render(); load(); } })
          ])
        );
      } else {
        listEl.appendChild(h("div", { class: "pm-skel" }));
      }
      return;
    }
    var ads = state.data.ads;
    if (!ads.length) {
      listEl.appendChild(
        h("div", { class: "pm-empty" }, [
          h("h3", { text: "No ads yet" }),
          h("p", { text: "Write a headline, add a link and pick how many days it runs. Your numbers show up here as people see and click it." }),
          h("button", { class: "pm-btn", type: "button", text: "Create your first ad", onclick: openCreate })
        ])
      );
      return;
    }
    ads.forEach(function (ad) {
      listEl.appendChild(adCard(ad));
    });
  }

  function render() {
    renderSummary();
    renderList();
  }

  function openModal(content, narrow) {
    modal.className = "pm-modal" + (narrow ? " narrow" : "");
    modal.textContent = "";
    modal.appendChild(content);
    overlay.classList.add("show");
  }

  function closeModal() {
    overlay.classList.remove("show");
    modal.textContent = "";
  }

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

  function modalHead(title, subtitle) {
    return h("div", { class: "pm-modal-head" }, [
      h("div", null, [h("h3", { text: title }), subtitle ? h("p", { text: subtitle }) : null]),
      h("button", { class: "pm-x", type: "button", "aria-label": "Close", text: "\u00d7", onclick: closeModal })
    ]);
  }

  function field(label, input, counter) {
    var top = h("label", null, [label, counter || null]);
    return h("div", { class: "pm-field" }, [top, input]);
  }

  function readImage(file, done) {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return done(null, "Use a PNG, JPG or WebP image.");
    if (file.size > 8 * 1024 * 1024) return done(null, "That image is too large.");
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      var ctx = canvas.getContext("2d");
      var scale = Math.max(640 / img.width, 360 / img.height);
      var w = img.width * scale;
      var hgt = img.height * scale;
      ctx.drawImage(img, (640 - w) / 2, (360 - hgt) / 2, w, hgt);
      URL.revokeObjectURL(url);
      done(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      done(null, "That image could not be read.");
    };
    img.src = url;
  }

  function openCreate() {
    var draft = { image: null };
    var ctas = (state.data && state.data.ctaOptions) || ["Learn more"];

    var title = h("input", { class: "pm-in", type: "text", maxlength: "60", placeholder: "Watch every match free", autocomplete: "off" });
    var body = h("textarea", { class: "pm-in", maxlength: "140", placeholder: "One or two sentences about what you are offering." });
    var cta = h("select", { class: "pm-in" }, ctas.map(function (c) { return h("option", { value: c, text: c }); }));
    var url = h("input", { class: "pm-in", type: "url", placeholder: "https://example.com", autocomplete: "off", inputmode: "url" });
    var titleCount = h("span", { text: "0/60" });
    var bodyCount = h("span", { text: "0/140" });
    var err = h("p", { class: "pm-err", role: "alert" });

    var prevMedia = h("div", { class: "pm-prev-media" });
    var prevTitle = h("div", { class: "pm-prev-title", text: "Your headline" });
    var prevText = h("div", { class: "pm-prev-text", text: "Your description appears here." });
    var prevCta = h("div", { class: "pm-prev-cta", text: ctas[0] });
    var preview = h("div", { class: "pm-prev" }, [
      prevMedia,
      h("div", { class: "pm-prev-body" }, [h("div", { class: "pm-prev-meta", text: "Sponsored" }), prevTitle, prevText, prevCta])
    ]);

    var fileInput = h("input", { type: "file", accept: "image/png,image/jpeg,image/webp" });
    var fileName = h("span", { class: "pm-hint", text: "Optional. Wide images work best." });
    var pick = h("button", { class: "pm-btn ghost small", type: "button", text: "Add image", onclick: function () { fileInput.click(); } });
    var clear = h("button", { class: "pm-btn ghost small", type: "button", text: "Remove", style: "display:none" });

    function sync() {
      titleCount.textContent = title.value.length + "/60";
      bodyCount.textContent = body.value.length + "/140";
      prevTitle.textContent = title.value.trim() || "Your headline";
      prevText.textContent = body.value.trim() || "Your description appears here.";
      prevCta.textContent = cta.value;
    }
    [title, body, cta].forEach(function (node) {
      node.addEventListener("input", sync);
      node.addEventListener("change", sync);
    });

    function setImage(dataUrl, label) {
      draft.image = dataUrl;
      prevMedia.classList.toggle("on", !!dataUrl);
      prevMedia.style.backgroundImage = dataUrl ? 'url("' + dataUrl + '")' : "";
      fileName.textContent = label;
      clear.style.display = dataUrl ? "" : "none";
      pick.textContent = dataUrl ? "Replace image" : "Add image";
    }
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      readImage(file, function (dataUrl, problem) {
        if (problem) {
          err.textContent = problem;
          return;
        }
        err.textContent = "";
        setImage(dataUrl, file.name);
      });
    });
    clear.addEventListener("click", function () {
      fileInput.value = "";
      setImage(null, "Optional. Wide images work best.");
    });

    var submit = h("button", { class: "pm-btn", type: "button", text: "Continue to payment", style: "width:100%" });
    submit.addEventListener("click", function () {
      err.textContent = "";
      var payload = { title: title.value, body: body.value, cta: cta.value, url: url.value.trim(), image: draft.image };
      if (payload.title.trim().length < 3) return void (err.textContent = "Add a headline of at least 3 characters.");
      if (payload.body.trim().length < 10) return void (err.textContent = "Add a description of at least 10 characters.");
      if (!/^https:\/\//i.test(payload.url)) return void (err.textContent = "The link must start with https://");
      submit.disabled = true;
      submit.textContent = "Saving";
      api("/api/promote/create", payload)
        .then(function (res) {
          return load().then(function () {
            openCheckout({ id: res.id, title: payload.title.trim(), status: "draft" });
          });
        })
        .catch(function (e) {
          submit.disabled = false;
          submit.textContent = "Continue to payment";
          err.textContent = e.message;
        });
    });

    var left = h("div", null, [
      field("Headline", title, titleCount),
      field("Description", body, bodyCount),
      field("Button label", cta),
      field("Destination link", url),
      h("div", { class: "pm-field" }, [
        h("label", { text: "Image" }),
        h("div", { class: "pm-file" }, [fileInput, pick, clear]),
        fileName
      ])
    ]);
    var right = h("div", null, [
      h("div", { class: "pm-label pm-preview-label", text: "Preview" }),
      preview,
      h("p", { class: "pm-note", text: "This is how your ad looks to viewers. It rotates with other ads and links to your page in a new tab." })
    ]);

    openModal(
      h("div", null, [
        modalHead("Create ad", "Write it now, choose how long it runs on the next step."),
        h("div", { class: "pm-cols" }, [left, right]),
        err,
        submit
      ])
    );
    title.focus();
  }

  function removeDraft(ad) {
    var err = h("p", { class: "pm-err", role: "alert" });
    var cancel = h("button", { class: "pm-btn ghost", type: "button", text: "Cancel", style: "flex:1", onclick: closeModal });
    var confirmBtn = h("button", { class: "pm-btn danger-solid", type: "button", text: "Delete", style: "flex:1" });
    confirmBtn.addEventListener("click", function () {
      err.textContent = "";
      confirmBtn.disabled = true;
      cancel.disabled = true;
      confirmBtn.textContent = "Deleting";
      api("/api/promote/" + encodeURIComponent(ad.id) + "/delete", {})
        .then(function () {
          closeModal();
          toast("Draft deleted");
          return load();
        })
        .catch(function (e) {
          confirmBtn.disabled = false;
          cancel.disabled = false;
          confirmBtn.textContent = "Delete";
          err.textContent = e.message;
        });
    });
    openModal(
      h("div", null, [
        modalHead("Delete this draft?", ad.title),
        h("p", { class: "pm-note", text: "This unpaid ad will be removed for good. You can always create a new one." }),
        err,
        h("div", { style: "display:flex;gap:10px;margin-top:14px" }, [cancel, confirmBtn])
      ]),
      true
    );
    cancel.focus();
  }

  function openCheckout(ad) {
    var price = (state.data && state.data.pricePerDayNgn) || 2500;
    var minDays = (state.data && state.data.minDays) || 1;
    var maxDays = (state.data && state.data.maxDays) || 30;
    var days = 7;

    var chipNodes = [];
    var daysInput = h("input", { class: "pm-in", type: "number", min: String(minDays), max: String(maxDays), value: String(days), inputmode: "numeric", style: "max-width:120px" });
    var rowDays = h("span");
    var rowHours = h("span");
    var rowTotal = h("span");
    var err = h("p", { class: "pm-err", role: "alert" });
    var payBtn = h("button", { class: "pm-btn", type: "button", style: "width:100%" });

    function clampDays(value) {
      var n = Math.floor(Number(value));
      if (!isFinite(n) || n < minDays) return minDays;
      return n > maxDays ? maxDays : n;
    }

    function paint() {
      rowDays.textContent = days + (days === 1 ? " day" : " days") + " \u00d7 " + money(price);
      rowHours.textContent = days * 24 + " hours";
      rowTotal.textContent = money(days * price);
      payBtn.textContent = "Pay " + money(days * price);
      chipNodes.forEach(function (node) {
        node.classList.toggle("on", Number(node.dataset.days) === days);
      });
    }

    DAY_CHIPS.filter(function (d) { return d >= minDays && d <= maxDays; }).forEach(function (d) {
      chipNodes.push(
        h("button", {
          class: "pm-chip",
          type: "button",
          "data-days": String(d),
          text: d + (d === 1 ? " day" : " days"),
          onclick: function () {
            days = d;
            daysInput.value = String(d);
            paint();
          }
        })
      );
    });
    daysInput.addEventListener("input", function () {
      if (daysInput.value === "") return;
      days = clampDays(daysInput.value);
      paint();
    });
    daysInput.addEventListener("blur", function () {
      days = clampDays(daysInput.value);
      daysInput.value = String(days);
      paint();
    });

    payBtn.addEventListener("click", function () {
      err.textContent = "";
      startPayment(ad, days, payBtn, err, paint);
    });

    var extending = ad.status === "live";
    openModal(
      h("div", null, [
        modalHead(extending ? "Add time" : "Choose duration", ad.title),
        h("div", { class: "pm-chips" }, chipNodes),
        h("div", { class: "pm-field" }, [h("label", { text: "Or enter days (" + minDays + " to " + maxDays + ")" }), daysInput]),
        h("div", { class: "pm-sum" }, [
          h("div", { class: "pm-sum-row" }, [h("span", { text: "Duration" }), rowDays]),
          h("div", { class: "pm-sum-row" }, [h("span", { text: extending ? "Added to your current end time" : "Runs for" }), rowHours]),
          h("div", { class: "pm-sum-row total" }, [h("span", { text: "Total" }), rowTotal])
        ]),
        err,
        payBtn,
        h("p", { class: "pm-note", text: "Your ad starts as soon as payment is confirmed. Ads that mislead, promote scams or contain adult content are removed without a refund." })
      ]),
      true
    );
    paint();
  }

  function startPayment(ad, days, btn, err, paint) {
    if (!window.PM_PAYSTACK_KEY || typeof PaystackPop === "undefined") {
      err.textContent = "Payments are temporarily unavailable. Please try again later.";
      return;
    }
    btn.disabled = true;
    btn.textContent = "Starting";
    api("/api/promote/pay/init", { adId: ad.id, days: days })
      .then(function (data) {
        btn.disabled = false;
        paint();
        var handler = PaystackPop.setup({
          key: data.publicKey,
          email: data.email,
          amount: data.amountKobo,
          ref: data.reference,
          currency: "NGN",
          onClose: function () {},
          callback: function (response) {
            confirmPayment(response.reference);
          }
        });
        handler.openIframe();
      })
      .catch(function (e) {
        btn.disabled = false;
        paint();
        err.textContent = e.message;
      });
  }

  function confirmPayment(reference) {
    openModal(
      h("div", { style: "padding:28px 4px;text-align:center" }, [
        h("h3", { text: "Confirming your payment", style: "font-family:var(--font-display);font-size:1.1rem" }),
        h("p", { class: "pm-note", text: "This takes a few seconds." })
      ]),
      true
    );
    api("/api/promote/pay/confirm", { reference: reference })
      .then(function () {
        closeModal();
        toast("Payment received, your ad is live");
        return load();
      })
      .catch(function (e) {
        closeModal();
        toast(e.message || "We could not confirm that payment yet.");
        setTimeout(load, 4000);
      });
  }

  document.getElementById("pmNew").addEventListener("click", openCreate);
  document.getElementById("pmBack").addEventListener("click", function (e) {
    if (document.referrer && window.history.length > 1) {
      e.preventDefault();
      window.history.back();
    }
  });

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderSummary, 150);
  });

  setInterval(function () {
    if (document.visibilityState === "visible" && !overlay.classList.contains("show")) load();
  }, POLL_MS);

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && !overlay.classList.contains("show")) load();
  });

  render();
  load();
})();
