(function () {
  "use strict";

  if (window.EsSlideLogout) return;

  const REDIRECT = "/login?logged_out=1";
  const COMPLETE_FADE_MS = 280;
  const SPRING_MS = 520;
  const COMPLETE_GAP_PX = 72;

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function logoutUrl(root) {
    return root.getAttribute("data-logout-endpoint") || "/api/logout";
  }

  function redirectUrl(root) {
    return root.getAttribute("data-logout-redirect") || REDIRECT;
  }

  function init(root) {
    if (!root || root.dataset.slideLogoutReady === "1") return;
    const track = root.querySelector("[data-slide-track]");
    const thumb = root.querySelector("[data-slide-thumb]");
    const label = root.querySelector("[data-slide-label]");
    const overlay = root.closest(".page-overlay");
    if (!track || !thumb) return;

    root.dataset.slideLogoutReady = "1";
    let position = 0;
    let startX = 0;
    let startPosition = 0;
    let pointerId = null;
    let dragging = false;
    let completing = false;
    let armed = false;

    function haptic(pattern) {
      try {
        if (navigator.vibrate) navigator.vibrate(pattern);
      } catch (error) {}
    }

    function maxPosition() {
      return Math.max(0, track.clientWidth - thumb.offsetWidth - 8);
    }

    function setPosition(next, animate) {
      const max = maxPosition();
      position = Math.max(0, Math.min(max, next));
      thumb.style.setProperty("--slide-x", position + "px");
      const ratio = max ? position / max : 0;
      root.style.setProperty("--slide-progress-pct", (ratio * 100) + "%");
      root.style.setProperty("--slide-fill-opacity", String(.22 + ratio * .78));
      thumb.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
      thumb.setAttribute("aria-valuetext", ratio >= .8 ? "Release to log out" : "Slide to logout");
      if (animate) root.classList.add("is-springing");
      else root.classList.remove("is-springing");
      if (label) label.style.opacity = String(Math.max(0.16, 1 - (max ? position / max : 0) * 1.2));
    }

    function reset() {
      root.classList.remove("is-dragging", "is-armed", "is-completing", "is-error");
      armed = false;
      setPosition(0, !reducedMotion());
      window.setTimeout(function () { root.classList.remove("is-springing"); }, reducedMotion() ? 0 : SPRING_MS);
    }

    function fail(message) {
      root.classList.remove("is-completing");
      root.classList.add("is-error");
      root.setAttribute("aria-busy", "false");
      if (label) label.textContent = message || "Could not log out. Try again.";
      window.setTimeout(function () {
        root.classList.remove("is-error");
        if (label) label.textContent = "Slide to Logout";
        reset();
      }, 2200);
    }

    async function complete() {
      if (completing) return;
      completing = true;
      const max = maxPosition();
      root.classList.remove("is-dragging", "is-armed");
      root.classList.add("is-completing");
      armed = false;
      root.setAttribute("aria-busy", "true");
      setPosition(max, !reducedMotion());
      haptic([10, 24, 18]);
      if (label) label.textContent = "Logging out…";
      if (overlay) overlay.classList.add("slide-logout-fade");

      try {
        const response = await fetch(logoutUrl(root), { method: "POST", credentials: "same-origin" });
        if (!response.ok) throw new Error("logout request failed");
        await new Promise(function (resolve) { window.setTimeout(resolve, reducedMotion() ? 0 : COMPLETE_FADE_MS); });
        window.location.href = redirectUrl(root);
      } catch (error) {
        if (overlay) overlay.classList.remove("slide-logout-fade");
        completing = false;
        fail("Could not log out. Try again.");
      }
    }

    function release() {
      if (!dragging) return;
      dragging = false;
      root.classList.remove("is-dragging");
      const max = maxPosition();
      const remaining = max - position;
      if (remaining <= Math.min(COMPLETE_GAP_PX, max * 0.2)) complete();
      else {
        haptic(7);
        reset();
      }
      if (pointerId !== null && thumb.hasPointerCapture && thumb.hasPointerCapture(pointerId)) {
        thumb.releasePointerCapture(pointerId);
      }
      pointerId = null;
    }

    thumb.addEventListener("pointerdown", function (event) {
      if (completing) return;
      event.preventDefault();
      dragging = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startPosition = position;
      root.classList.add("is-dragging");
      root.classList.remove("is-springing", "is-error");
      haptic(5);
      if (thumb.setPointerCapture) thumb.setPointerCapture(event.pointerId);
    });

    thumb.addEventListener("pointermove", function (event) {
      if (!dragging || completing || (pointerId !== null && event.pointerId !== pointerId)) return;
      const max = maxPosition();
      setPosition(startPosition + event.clientX - startX, false);
      const nextArmed = max - position <= Math.min(COMPLETE_GAP_PX, max * 0.2);
      root.classList.toggle("is-armed", nextArmed);
      if (nextArmed && !armed) haptic(10);
      armed = nextArmed;
    });

    thumb.addEventListener("pointerup", release);
    thumb.addEventListener("pointercancel", release);
    thumb.addEventListener("lostpointercapture", function () { if (dragging) release(); });

    thumb.addEventListener("keydown", function (event) {
      if (completing) return;
      const max = maxPosition();
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        setPosition(position + (event.key === "ArrowRight" ? Math.max(12, max * 0.08) : -Math.max(12, max * 0.08)), false);
        const nextArmed = max - position <= Math.min(COMPLETE_GAP_PX, max * 0.2);
        root.classList.toggle("is-armed", nextArmed);
        if (nextArmed && !armed) haptic(10);
        armed = nextArmed;
      } else if (event.key === "End") {
        event.preventDefault();
        setPosition(max, false);
        complete();
      } else if (event.key === "Home") {
        event.preventDefault();
        reset();
      }
    });

    setPosition(0, false);

    root.querySelectorAll("[data-slide-cancel]").forEach(function (button) {
      button.addEventListener("click", reset);
    });
    if (overlay) overlay.addEventListener("click", function (event) {
      if (event.target === overlay && !completing) reset();
    });
  }

  function initAll() {
    document.querySelectorAll("[data-slide-logout]").forEach(init);
  }

  window.EsSlideLogout = { init: initAll };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll, { once: true });
  else initAll();
})();
