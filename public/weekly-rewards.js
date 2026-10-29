(function () {
  "use strict";
  if (window.__EsWeeklyRewards) return;
  window.__EsWeeklyRewards = true;

  var assetVersion = "";
  try {
    var currentScript = document.currentScript;
    if (currentScript && currentScript.src) assetVersion = new URL(currentScript.src, location.href).searchParams.get("v") || "";
  } catch (_) {}

  var SID_KEY = "es-weekly-activity-session-v1";
  var LEASE_KEY = "es-weekly-activity-leader-v1";
  var INPUT_KEY = "es-weekly-activity-input-v1";
  var CHALLENGE_KEY = "es-weekly-activity-challenge-v1";
  var IDLE_LIMIT_MS = 135000;
  var LEASE_MS = 25000;
  var tabId = randomId();
  var volatileInput = null;
  var authFailed = false;
  var activityData = null;
  var claimBusy = false;
  var pulseTimer = null;
  var countdownTimer = null;
  var volatileSessionId = null;
  var volatileChallenge = null;

  function randomId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    var bytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  function storageGet(key) {
    try { var local = localStorage.getItem(key); if (local !== null) return local; } catch (_) {}
    try { return sessionStorage.getItem(key); } catch (_) { return null; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (_) {}
    try { sessionStorage.setItem(key, value); return true; } catch (_) { return false; }
  }
  function sharedStorageGet(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function sharedStorageSet(key, value) { try { localStorage.setItem(key, value); return true; } catch (_) { return false; } }
  function sessionId() {
    var existing = storageGet(SID_KEY);
    if (existing && /^[A-Za-z0-9_-]{16,80}$/.test(existing)) return existing;
    if (volatileSessionId) return volatileSessionId;
    var value = volatileSessionId = randomId();
    storageSet(SID_KEY, value);
    return value;
  }
  function readJson(key) {
    try { return JSON.parse(storageGet(key) || "null"); } catch (_) { return null; }
  }
  function focusedVisible() {
    return document.visibilityState === "visible" && (typeof document.hasFocus !== "function" || document.hasFocus());
  }

  function noteInteraction(kind) {
    if (!focusedVisible()) return;
    var now = Date.now();
    var input = readJson(INPUT_KEY);
    var kinds = input && now - Number(input.at) <= IDLE_LIMIT_MS && Array.isArray(input.kinds) ? input.kinds : [];
    if (kinds.indexOf(kind) === -1) kinds.push(kind);
    kinds = kinds.filter(function (item) { return ["pointer", "keyboard", "touch", "scroll"].indexOf(item) !== -1; }).slice(-4);
    volatileInput = { at: now, kinds: kinds };
    storageSet(INPUT_KEY, JSON.stringify(volatileInput));
  }

  document.addEventListener("pointerdown", function () { noteInteraction("pointer"); }, { passive: true, capture: true });
  document.addEventListener("keydown", function () { noteInteraction("keyboard"); }, { passive: true, capture: true });
  document.addEventListener("touchstart", function () { noteInteraction("touch"); }, { passive: true, capture: true });
  document.addEventListener("wheel", function () { noteInteraction("scroll"); }, { passive: true, capture: true });
  document.addEventListener("scroll", function () { noteInteraction("scroll"); }, { passive: true, capture: true });

  function readInput() {
    var input = readJson(INPUT_KEY) || volatileInput;
    if (!input || Date.now() - Number(input.at) > IDLE_LIMIT_MS) return null;
    var kinds = Array.isArray(input.kinds) ? input.kinds.filter(function (kind) {
      return ["pointer", "keyboard", "touch", "scroll"].indexOf(kind) !== -1;
    }).slice(0, 4) : [];
    return kinds.length ? { at: Number(input.at), kinds: kinds } : null;
  }

  function readLease() {
    var lease = null;
    try { lease = JSON.parse(sharedStorageGet(LEASE_KEY) || "null"); } catch (_) {}
    return lease && typeof lease.owner === "string" && Number(lease.expiresAt) > Date.now() ? lease : null;
  }
  function acquireLease() {
    if (!focusedVisible()) return false;
    var lease = readLease();
    if (lease && lease.owner !== tabId) return false;
    var next = { owner: tabId, expiresAt: Date.now() + LEASE_MS };
    if (!sharedStorageSet(LEASE_KEY, JSON.stringify(next))) return true;
    var check = readLease();
    return !!check && check.owner === tabId;
  }
  function releaseLease() {
    var lease = null;
    try { lease = JSON.parse(sharedStorageGet(LEASE_KEY) || "null"); } catch (_) {}
    if (lease && lease.owner === tabId) {
      try { localStorage.removeItem(LEASE_KEY); } catch (_) {}
    }
  }

  function requestJson(url, options) {
    return fetch(url, Object.assign({ credentials: "same-origin", cache: "no-store" }, options || {})).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok) {
          var error = new Error(data.error || "The request could not be completed.");
          error.status = response.status;
          throw error;
        }
        return data;
      });
    });
  }

  function loadClaimFaceModule() {
    var suffix = assetVersion ? "?v=" + encodeURIComponent(assetVersion) : "";
    return import("/claim-face.js" + suffix);
  }

  function maybePulse() {
    if (authFailed || !focusedVisible()) return;
    var input = readInput();
    if (!input || Date.now() - input.at > IDLE_LIMIT_MS) return;
    function sendPulse() {
      if (!focusedVisible()) return Promise.resolve();
      var weeklyActivity = { sessionId: sessionId(), interacted: true, activityKinds: input.kinds };
      var challenge = storageGet(CHALLENGE_KEY) || volatileChallenge;
      if (challenge) weeklyActivity.challenge = challenge;
      return requestJson("/api/chess/hb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyActivity: weeklyActivity }),
      }).then(function (response) {
        var nextChallenge = response.weeklyActivity && response.weeklyActivity.challenge;
        if (typeof nextChallenge === "string" && /^[a-f0-9]{64}$/.test(nextChallenge)) {
          volatileChallenge = nextChallenge;
          storageSet(CHALLENGE_KEY, nextChallenge);
        }
      }).catch(function (error) {
        if (error.status === 401) authFailed = true;
      });
    }
    if (navigator.locks && typeof navigator.locks.request === "function") {
      navigator.locks.request(LEASE_KEY, { mode: "exclusive", ifAvailable: true }, function (lock) {
        return lock ? sendPulse() : undefined;
      }).catch(function () { if (acquireLease()) sendPulse(); });
      return;
    }
    if (!acquireLease()) return;
    sendPulse();
  }

  function schedulePulse() {
    clearTimeout(pulseTimer);
    pulseTimer = setTimeout(function () {
      maybePulse();
      schedulePulse();
    }, 100000 + Math.floor(Math.random() * 25001));
  }

  function ensureStyles() {
    if (document.querySelector('link[data-es-weekly-rewards-style],link[href*="weekly-rewards.css"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/weekly-rewards.css";
    link.setAttribute("data-es-weekly-rewards-style", "");
    document.head.appendChild(link);
  }

  function buildUi() {
    ensureStyles();
    var button = document.createElement("button");
    button.type = "button";
    button.className = "es-weekly-fab";
    button.setAttribute("aria-label", "Open weekly activity rewards");
    button.setAttribute("aria-haspopup", "dialog");
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 2.3-3.5L12 7ZM12 7h4.5a2.5 2.5 0 1 0-2.3-3.5L12 7Z"/></svg><span class="es-weekly-fab-dot" aria-hidden="true"></span>';

    var overlay = document.createElement("div");
    overlay.className = "es-weekly-overlay";
    overlay.id = "esWeeklyActivityOverlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = '<section class="es-weekly-panel" role="dialog" aria-modal="true" aria-labelledby="esWeeklyTitle" tabindex="-1">' +
      '<header class="es-weekly-head"><div><div class="es-weekly-eyebrow">ES TEAMS REWARDS</div><h2 id="esWeeklyTitle">Weekly activity</h2></div>' +
      '<button type="button" class="es-weekly-close" aria-label="Close weekly activity dashboard">×</button></header>' +
      '<div class="es-weekly-content"><div class="es-weekly-summary-card">' +
      '<div class="es-weekly-summary-top"><div><span class="es-weekly-label">Active time</span><strong id="esWeeklyHours">— / 50 hours</strong></div>' +
      '<div class="es-weekly-coins"><span>Coin balance</span><b id="esWeeklyCoins">—</b></div></div>' +
      '<div class="es-weekly-progress-track" role="progressbar" aria-label="Weekly active hour progress" aria-valuemin="0" aria-valuemax="50" aria-valuenow="0"><span id="esWeeklyProgress"></span></div>' +
      '<div class="es-weekly-progress-foot"><span id="esWeeklyHoursLeft">Loading progress</span><span id="esWeeklyPercent">0%</span></div></div>' +
      '<div class="es-weekly-stats"><div class="es-weekly-stat"><span>Qualifying days</span><b id="esWeeklyDays">— / 5</b></div>' +
      '<div class="es-weekly-stat"><span>Weekly reset</span><b id="esWeeklyReset">—</b></div></div>' +
      '<div class="es-weekly-day-section"><div class="es-weekly-section-title">Activity by day <span>1+ hour qualifies</span></div><div class="es-weekly-days" id="esWeeklyDayGrid"></div></div>' +
      '<div class="es-weekly-reward-card"><div class="es-weekly-reward-icon" aria-hidden="true">🎁</div><div class="es-weekly-reward-copy"><b>Weekly milestone</b><span>Earn 5 coins after 50 active hours across 5 qualifying days.</span></div></div>' +
      '<div class="es-weekly-status" id="esWeeklyStatus" role="status" aria-live="polite">Loading your account activity…</div>' +
      '<div class="es-weekly-face-setup" id="esWeeklyFaceSetup" hidden><p>Your Face Id is what proves the claim is really you. Set it up once in your account settings, then you can claim every week.</p>' +
      '<div class="es-weekly-face-actions"><a class="es-weekly-face-link" href="/account#faceScanCard">Go to Face Id</a>' +
      '<button type="button" class="es-weekly-face-check" id="esWeeklyFaceCheck">I\'ve set it up — check again</button></div></div>' +
      '<button type="button" class="es-weekly-claim" id="esWeeklyClaim" disabled>Complete the milestone to claim</button>' +
      '<p class="es-weekly-note">Only visible, recently used sessions count. Time pauses when this page is hidden or idle.</p>' +
      '</div></section>';
    document.body.appendChild(button);
    document.body.appendChild(overlay);

    var closeButton = overlay.querySelector(".es-weekly-close");
    var panel = overlay.querySelector(".es-weekly-panel");
    var claimButton = overlay.querySelector("#esWeeklyClaim");
    var status = overlay.querySelector("#esWeeklyStatus");
    var faceSetup = overlay.querySelector("#esWeeklyFaceSetup");
    var faceCheckButton = overlay.querySelector("#esWeeklyFaceCheck");
    var loading = false;
    var claimFailure = null;
    var faceSetupRequired = false;
    var faceSetupPrompt = "Your Face Id is what proves the claim is really you. Set it up once in your account settings, then you can claim every week.";
    var backgroundState = [];
    var buttonInertBefore = false;
    var buttonAriaHiddenBefore = null;

    function setBackgroundInert(enabled) {
      if (enabled) {
        if (!backgroundState.length) {
          Array.prototype.forEach.call(document.body.children, function (node) {
            if (node === button || node === overlay) return;
            backgroundState.push({ node: node, inert: !!node.inert, ariaHidden: node.getAttribute("aria-hidden") });
            node.inert = true;
            node.setAttribute("aria-hidden", "true");
          });
        }
        buttonInertBefore = !!button.inert;
        buttonAriaHiddenBefore = button.getAttribute("aria-hidden");
        button.inert = true;
        button.setAttribute("aria-hidden", "true");
        return;
      }
      backgroundState.forEach(function (entry) {
        entry.node.inert = entry.inert;
        if (entry.ariaHidden === null) entry.node.removeAttribute("aria-hidden");
        else entry.node.setAttribute("aria-hidden", entry.ariaHidden);
      });
      backgroundState = [];
      button.inert = buttonInertBefore;
      if (buttonAriaHiddenBefore === null) button.removeAttribute("aria-hidden");
      else button.setAttribute("aria-hidden", buttonAriaHiddenBefore);
    }

    function close() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("es-weekly-dashboard-open");
      setBackgroundInert(false);
      button.focus({ preventScroll: true });
    }

    function countdown() {
      if (!activityData || !activityData.resetAt) return;
      var remaining = Math.max(0, Number(activityData.resetAt) - Date.now());
      var totalMinutes = Math.ceil(remaining / 60000);
      var days = Math.floor(totalMinutes / 1440);
      var hours = Math.floor((totalMinutes % 1440) / 60);
      var minutes = totalMinutes % 60;
      overlay.querySelector("#esWeeklyReset").textContent = days ? days + "d " + hours + "h" : hours + "h " + String(minutes).padStart(2, "0") + "m";
    }

    function renderDayGrid(data) {
      var target = overlay.querySelector("#esWeeklyDayGrid");
      target.innerHTML = (data.days || []).map(function (day) {
        var date = new Date(String(day.date) + "T00:00:00Z");
        var label = date.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" });
        var hours = Number(day.seconds || 0) / 3600;
        return '<div class="es-weekly-day' + (day.qualifies ? " is-qualified" : "") + '"><span>' + label + '</span><b>' + (hours >= 1 ? Math.floor(hours) + "h" : (hours > 0 ? "<1h" : "0h")) + '</b><i aria-hidden="true"></i></div>';
      }).join("");
    }

    function setFaceSetupRequired(required) {
      faceSetupRequired = !!required;
      faceSetup.hidden = !faceSetupRequired;
      if (faceSetupRequired) {
        status.className = "es-weekly-status";
        status.textContent = "Face Id not Set. Go to Face Id and configure.";
        claimButton.disabled = true;
        claimButton.classList.remove("is-ready");
        claimButton.textContent = "Set up Face ID to claim";
        faceCheckButton.disabled = false;
        faceCheckButton.textContent = "I've set it up — check again";
      }
    }

    function render(data) {
      activityData = data;
      var hours = Number(data.hoursExact || 0);
      overlay.querySelector("#esWeeklyHours").textContent = hours + " / 50 hours";
      overlay.querySelector("#esWeeklyCoins").textContent = Number(data.coinBalance || 0).toLocaleString() + " coins";
      overlay.querySelector("#esWeeklyHoursLeft").textContent = data.hoursRemaining ? data.hoursRemaining + " hour" + (data.hoursRemaining === 1 ? "" : "s") + " remaining" : "50-hour target complete";
      overlay.querySelector("#esWeeklyDays").textContent = data.qualifyingDays + " / 5";
      overlay.querySelector("#esWeeklyPercent").textContent = Number(data.progressPercent || 0) + "%";
      overlay.querySelector("#esWeeklyProgress").style.width = Math.min(100, Number(data.progressPercent || 0)) + "%";
      overlay.querySelector(".es-weekly-progress-track").setAttribute("aria-valuenow", String(Math.min(50, Math.floor(Number(data.seconds || 0) / 3600))));
      renderDayGrid(data);
      countdown();

      claimButton.disabled = !data.eligible || data.claimed || claimBusy || faceSetupRequired;
      claimButton.classList.toggle("is-ready", !!data.eligible && !data.claimed && !faceSetupRequired);
      if (data.claimed) {
        setFaceSetupRequired(false);
        status.className = "es-weekly-status is-success";
        status.textContent = "Reward claimed for this week. Your next milestone starts at the weekly reset.";
        claimButton.textContent = "5 coins claimed";
      } else if (data.eligible) {
        status.className = "es-weekly-status is-success";
        status.textContent = "Milestone complete. Your 5-coin reward is ready.";
        claimButton.textContent = "🎁 Claim 5 Coins";
        if (faceSetupRequired) setFaceSetupRequired(true);
      } else {
        setFaceSetupRequired(false);
        status.className = "es-weekly-status";
        var missing = [];
        if (data.hoursRemaining) missing.push(data.hoursRemaining + " more active hour" + (data.hoursRemaining === 1 ? "" : "s"));
        if (data.daysRemaining) missing.push(data.daysRemaining + " more qualifying day" + (data.daysRemaining === 1 ? "" : "s"));
        status.textContent = missing.length ? "To qualify: " + missing.join(" and ") + "." : "Keep building genuine weekly activity.";
        claimButton.textContent = "Complete the milestone to claim";
      }
    }

    function loadSummary(silent) {
      if (loading) return;
      loading = true;
      if (!silent) {
        claimFailure = null;
        status.className = "es-weekly-status";
        status.textContent = "Loading your account activity…";
      }
      claimButton.disabled = true;
      requestJson("/api/rewards/weekly-activity/summary").then(function (data) {
        claimFailure = null;
        render(data);
      }).catch(function (error) {
        if (claimFailure) {
          status.className = "es-weekly-status is-error";
          status.textContent = claimFailure;
          claimButton.disabled = true;
          return;
        }
        if (error.status === 401) {
          status.className = "es-weekly-status";
          status.innerHTML = 'Sign in to view and earn weekly activity rewards. <a href="/login">Sign in</a>';
          overlay.querySelector("#esWeeklyHours").textContent = "— / 50 hours";
          overlay.querySelector("#esWeeklyDays").textContent = "— / 5";
          overlay.querySelector("#esWeeklyCoins").textContent = "Sign in required";
          overlay.querySelector("#esWeeklyHoursLeft").textContent = "Activity is saved to your account";
          overlay.querySelector("#esWeeklyProgress").style.width = "0%";
          overlay.querySelector("#esWeeklyDayGrid").innerHTML = "";
          claimButton.textContent = "Sign in to earn rewards";
          return;
        }
        status.className = "es-weekly-status is-error";
        status.textContent = error.message || "Could not load weekly activity. Please try again.";
        claimButton.textContent = "Retry by reopening the dashboard";
      }).finally(function () { loading = false; });
    }

    function open() {
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("es-weekly-dashboard-open");
      setBackgroundInert(true);
      panel.focus({ preventScroll: true });
      loadSummary();
    }

    button.addEventListener("click", open);
    closeButton.addEventListener("click", close);
    overlay.addEventListener("click", function (event) { if (event.target === overlay) close(); });
    document.addEventListener("keydown", function (event) {
      if (!overlay.classList.contains("is-open")) return;
      if (event.key === "Escape") { close(); return; }
      if (event.key === "Tab") {
        var focusable = Array.prototype.slice.call(overlay.querySelectorAll('a[href],button:not(:disabled),[tabindex]:not([tabindex="-1"])'));
        if (!focusable.length) { event.preventDefault(); panel.focus(); return; }
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (!overlay.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) { event.preventDefault(); first.focus(); }
      }
    });
    function claimWithFaceId() {
      if (!activityData || !activityData.eligible || activityData.claimed || claimBusy) return;
      claimBusy = true;
      claimFailure = null;
      claimButton.disabled = true;
      faceCheckButton.disabled = true;
      claimButton.textContent = "Checking Face ID…";
      status.className = "es-weekly-status";
      status.textContent = "Checking your Face ID setup…";

      requestJson("/api/facescan/status").catch(function (error) {
        if (error.status === 401) throw error;
        throw new Error("Could not check Face ID setup. Please try again.");
      }).then(function (faceStatus) {
        if (!faceStatus.enabled) {
          setFaceSetupRequired(true);
          return null;
        }
        setFaceSetupRequired(false);
        status.textContent = "Follow the camera prompt to verify your Face ID.";
        return loadClaimFaceModule();
      }).then(function (faceModule) {
        if (!faceModule) return null;
        return faceModule.captureClaimFace().then(function (capture) {
          var samples = capture && Array.isArray(capture.samples) ? capture.samples : [];
          var faceDescriptor = samples.length ? samples.map(function (sample) { return { v: sample }; }) : capture && capture.descriptor;
          if (!Array.isArray(faceDescriptor) || !faceDescriptor.length) {
            throw new Error("Face check failed. Please try again.");
          }
          status.textContent = "Face captured. Verifying your claim…";
          return requestJson("/api/rewards/weekly-activity/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ faceDescriptor: faceDescriptor }),
          });
        });
      }).then(function (result) {
        if (!result) return;
        claimFailure = null;
        if (result.summary) render(result.summary);
        else loadSummary();
        window.dispatchEvent(new CustomEvent("es:coin-balance-updated", { detail: { coinBalance: result.coinBalance, added: result.coinsAwarded } }));
        status.className = "es-weekly-status is-success";
        status.textContent = "5 coins added to your account balance.";
      }).catch(function (error) {
        var message = error && error.message ? error.message : "The reward could not be claimed.";
        if (/face id not set|no-faceid/i.test(message)) {
          setFaceSetupRequired(true);
          return;
        }
        claimFailure = message;
        status.className = error && error.status === 401 ? "es-weekly-status" : "es-weekly-status is-error";
        if (error && error.status === 401) status.innerHTML = 'Your sign-in expired. <a href="/login">Sign in again</a> to claim.';
        else status.textContent = message;
      }).finally(function () {
        claimBusy = false;
        faceCheckButton.disabled = false;
        if (faceSetupRequired) {
          claimButton.disabled = true;
          claimButton.classList.remove("is-ready");
          claimButton.textContent = "Set up Face ID to claim";
        } else if (activityData) {
          claimButton.disabled = !activityData.eligible || activityData.claimed;
          claimButton.classList.toggle("is-ready", !!activityData.eligible && !activityData.claimed);
          if (activityData.claimed) claimButton.textContent = "5 coins claimed";
          else if (activityData.eligible) claimButton.textContent = "🎁 Claim 5 Coins";
        }
      });
    }
    claimButton.addEventListener("click", claimWithFaceId);
    faceCheckButton.addEventListener("click", claimWithFaceId);
    button.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") noteInteraction("keyboard"); });
    return { countdown: countdown };
  }

  var ui = buildUi();
  setInterval(function () {
    if (focusedVisible()) acquireLease();
    else releaseLease();
  }, 10000);
  window.addEventListener("blur", releaseLease);
  window.addEventListener("pagehide", releaseLease);
  document.addEventListener("visibilitychange", function () {
    if (!focusedVisible()) releaseLease();
  });
  countdownTimer = setInterval(ui.countdown, 1000);
  schedulePulse();
})();
