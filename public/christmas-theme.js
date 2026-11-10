(() => {
  "use strict";

  // Flip this single flag to false after the seasonal period.
  const ENABLED = true;
  if (!ENABLED || window.__esChristmasThemeLoaded) return;
  window.__esChristmasThemeLoaded = true;

  const BRAND_SELECTORS = [
    ".hm-logo", ".mv-logo", ".auth-logo", ".page-logo", ".v-logo",
    ".tr-share-footer-brand", ".sc-brand-info .flist-title", "[aria-label*='ES TEAMS TV']"
  ];

  const f = (n) => Math.round(n * 10) / 10;
  const rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* ---------- shared gradients (referenced by every decoration) ---------- */
  const DEFS = '<svg class="xm-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>' +
    '<radialGradient id="xm-red" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ff9aa2"/><stop offset=".45" stop-color="#d42a3d"/><stop offset="1" stop-color="#6e0d1d"/></radialGradient>' +
    '<radialGradient id="xm-gold" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff3bd"/><stop offset=".45" stop-color="#e8b94a"/><stop offset="1" stop-color="#85580f"/></radialGradient>' +
    '<radialGradient id="xm-ice" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#b9d6e8"/><stop offset="1" stop-color="#587a92"/></radialGradient>' +
    '<radialGradient id="xm-emerald" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#9af2c9"/><stop offset=".5" stop-color="#1fa974"/><stop offset="1" stop-color="#094a36"/></radialGradient>' +
    '<radialGradient id="xm-berry" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ff9a9a"/><stop offset=".5" stop-color="#d11f35"/><stop offset="1" stop-color="#6a0918"/></radialGradient>' +
    '<linearGradient id="xm-holly" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f9a6c"/><stop offset="1" stop-color="#0d4a36"/></linearGradient>' +
    '<linearGradient id="xm-cone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9a6234"/><stop offset=".5" stop-color="#6f4220"/><stop offset="1" stop-color="#3f2411"/></linearGradient>' +
    '<linearGradient id="xm-tree" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#34a373"/><stop offset=".45" stop-color="#17785a"/><stop offset="1" stop-color="#083a2e"/></linearGradient>' +
    '<linearGradient id="xm-trunk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a3693a"/><stop offset="1" stop-color="#4a2a14"/></linearGradient>' +
    '<linearGradient id="xm-skirt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e0354b"/><stop offset=".6" stop-color="#a81a2e"/><stop offset="1" stop-color="#6b0f1e"/></linearGradient>' +
    '<linearGradient id="xm-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f1d58a"/><stop offset=".5" stop-color="#b98a2c"/><stop offset="1" stop-color="#6e4d10"/></linearGradient>' +
    '<linearGradient id="xm-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".34"/><stop offset="1" stop-color="#ff9d4a" stop-opacity=".08"/></linearGradient>' +
    '<linearGradient id="xm-wax" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#d9c9a6"/></linearGradient>' +
    '<radialGradient id="xm-flame" cx=".5" cy=".75" r=".7"><stop offset="0" stop-color="#fff5c4"/><stop offset=".5" stop-color="#ffbf4d"/><stop offset="1" stop-color="#ff6a1f"/></radialGradient>' +
    '<radialGradient id="xm-lglow"><stop offset="0" stop-color="#ffc468" stop-opacity=".55"/><stop offset="1" stop-color="#ffc468" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="xm-sglow"><stop offset="0" stop-color="#ffe29a" stop-opacity=".6"/><stop offset="1" stop-color="#ffe29a" stop-opacity="0"/></radialGradient>' +
    '</defs></svg>';

  /* ---------- small reusable pieces ---------- */
  const BULB_COLORS = ["#ffe7ae", "#ff7d7d", "#ffc65c", "#ffe7ae", "#9be6c1", "#ffb27a"];

  function bulb(x, y, wireY, c) {
    return '<line x1="' + f(x) + '" y1="' + f(wireY) + '" x2="' + f(x) + '" y2="' + f(y - 2) + '" stroke="#1d2b26" stroke-width="1.1"/>' +
      '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="8" fill="' + c + '" opacity=".10"/>' +
      '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="5" fill="' + c + '" opacity=".22"/>' +
      '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="2.3" ry="3" fill="' + c + '"/>' +
      '<circle cx="' + f(x - 0.7) + '" cy="' + f(y - 1) + '" r=".8" fill="#fff" opacity=".85"/>';
  }

  function bow(x, y, s) {
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + s + ')">' +
      '<path d="M-2 3L-13 25L-6.5 22L-3 28Z" fill="#8f1424" stroke="#e8b94a" stroke-width=".5"/>' +
      '<path d="M2 3L13 25L6.5 22L3 28Z" fill="#8f1424" stroke="#e8b94a" stroke-width=".5"/>' +
      '<path d="M0 0C-8-13-26-15-27-5C-28 4-12 6 0 0Z" fill="url(#xm-red)" stroke="#e8b94a" stroke-width=".7"/>' +
      '<path d="M0 0C8-13 26-15 27-5C28 4 12 6 0 0Z" fill="url(#xm-red)" stroke="#e8b94a" stroke-width=".7"/>' +
      '<path d="M-19-6C-13-6-8-3-3 0M19-6C13-6 8-3 3 0" stroke="#ffb3b9" stroke-width=".8" fill="none" opacity=".6"/>' +
      '<ellipse cx="0" cy="1" rx="4.2" ry="3.6" fill="url(#xm-red)" stroke="#e8b94a" stroke-width=".7"/></g>';
  }

  const LEAF = "M0 0Q4-6 9-4Q10-9 16-8Q18-12 24-9Q28-5 32 0Q28 5 24 9Q18 12 16 8Q10 9 9 4Q4 6 0 0Z";
  function leaf(x, y, rot, s) {
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + rot + ') scale(' + s + ')">' +
      '<path d="' + LEAF + '" fill="url(#xm-holly)" stroke="#0a3a29" stroke-width="1"/>' +
      '<path d="M1 0H29" stroke="#8fe0b2" stroke-width=".9" opacity=".55" fill="none"/></g>';
  }
  function berry(x, y, r) {
    return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + r + '" fill="url(#xm-berry)"/>' +
      '<circle cx="' + f(x - r * 0.3) + '" cy="' + f(y - r * 0.35) + '" r="' + f(r * 0.28) + '" fill="#fff" opacity=".75"/>';
  }
  function holly(x, y, s, flip) {
    const m = flip ? -1 : 1;
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + (s * m) + ' ' + s + ')">' +
      leaf(0, 0, -38, 0.62) + leaf(0, 0, 28, 0.62) + leaf(0, 0, 92, 0.5) +
      berry(3, 2, 3.2) + berry(-1.5, 5, 3) + berry(5.5, 6, 2.8) + '</g>';
  }
  function cone(x, y, rot, s) {
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + rot + ') scale(' + s + ')">' +
      '<line x1="0" y1="-9" x2="0" y2="-4" stroke="#3f2411" stroke-width="1.2"/>' +
      '<path d="M0-5C6-5 8 2 6 8C4 13 1 15 0 16C-1 15-4 13-6 8C-8 2-6-5 0-5Z" fill="url(#xm-cone)" stroke="#2b190b" stroke-width=".7"/>' +
      '<path d="M-6 0Q0 4 6 0M-6.5 4.5Q0 8.5 6.5 4.5M-5 9Q0 12.5 5 9M-2.6 13Q0 14.5 2.6 13" fill="none" stroke="#2b190b" stroke-width=".8" opacity=".85"/>' +
      '<path d="M-4-4C-1-6 3-6 5-3C2-3-1-2-4-4Z" fill="#fff" opacity=".85"/></g>';
  }
  function ornament(x, y, len, r, type, t, d) {
    const grads = ["xm-red", "xm-gold", "xm-ice", "xm-emerald"];
    const cy = y + len + 3 + r;
    return '<g class="xm-orn" style="--t:' + t + 's;--d:' + d + 's">' +
      '<line x1="' + f(x) + '" y1="' + f(y) + '" x2="' + f(x) + '" y2="' + f(y + len) + '" stroke="#ecdca6" stroke-width=".8" opacity=".85"/>' +
      '<rect x="' + f(x - 2.2) + '" y="' + f(y + len - 0.5) + '" width="4.4" height="3.6" rx=".9" fill="url(#xm-gold)"/>' +
      '<circle cx="' + f(x) + '" cy="' + f(cy) + '" r="' + r + '" fill="url(#' + grads[type % 4] + ')"/>' +
      '<ellipse cx="' + f(x) + '" cy="' + f(cy + r * 0.1) + '" rx="' + r + '" ry="' + f(r * 0.26) + '" fill="none" stroke="rgba(255,236,170,.7)" stroke-width=".9"/>' +
      '<ellipse cx="' + f(x - r * 0.36) + '" cy="' + f(cy - r * 0.42) + '" rx="' + f(r * 0.3) + '" ry="' + f(r * 0.17) + '" fill="#fff" opacity=".7" transform="rotate(-35 ' + f(x - r * 0.36) + ' ' + f(cy - r * 0.42) + ')"/></g>';
  }

  // Pine branch along a quadratic curve; returns {d, needles:[dark, mid, light]}
  function pineBranch(x0, y0, cx, cy, x1, y1, count, rnd, minL, maxL) {
    const P = (t) => { const u = 1 - t; return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]; };
    const T = (t) => {
      const u = 1 - t, dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy), l = Math.hypot(dx, dy) || 1;
      return [dx / l, dy / l];
    };
    const nd = ["", "", ""];
    for (let j = 0; j < count; j++) {
      const t = (j + rnd()) / count, p = P(t), tg = T(t), nx = -tg[1], ny = tg[0];
      const side = rnd() < 0.72 ? 1 : -1, a = (rnd() - 0.5) * 1.5, ca = Math.cos(a), sa = Math.sin(a);
      let dx = (nx * ca - ny * sa) * side, dy = (nx * sa + ny * ca) * side;
      dx += tg[0] * (rnd() - 0.5) * 0.9; dy += tg[1] * (rnd() - 0.5) * 0.9;
      const len = minL + rnd() * (maxL - minL), c = rnd() < 0.34 ? 0 : (rnd() < 0.62 ? 1 : 2);
      nd[c] += "M" + f(p[0]) + " " + f(p[1]) + "l" + f(dx * len) + " " + f(dy * len);
    }
    return { P, T, d: "M" + x0 + " " + y0 + "Q" + cx + " " + cy + " " + x1 + " " + y1, needles: nd };
  }
  function needlePaths(nd, w) {
    return '<path d="' + nd[0] + '" stroke="#0f4a38" stroke-width="' + w + '" stroke-linecap="round" fill="none"/>' +
      '<path d="' + nd[1] + '" stroke="#1b7a58" stroke-width="' + w + '" stroke-linecap="round" fill="none"/>' +
      '<path d="' + nd[2] + '" stroke="#52bd8c" stroke-width="' + w + '" stroke-linecap="round" fill="none" opacity=".85"/>';
  }

  /* ---------- top garland (rebuilt to the screen width so nothing is stretched) ---------- */
  function garlandSvg(W, k) {
    const S = 340, H = 120, vbW = W / k, y0 = 7, cy = 77, off = S * 0.12, rnd = rng(11);
    let branch = "", needles = ["", "", ""], snow = "", cones = "", lights = ["", "", ""], orns = "", anchors = "";
    let li = 0, seg = 0;
    for (let x0 = -S + off; x0 < vbW + S * 0.2; x0 += S, seg++) {
      const x1 = x0 + S, cx = x0 + S / 2;
      const br = pineBranch(x0, y0, cx, cy, x1, y0, 260, rnd, 6, 13);
      branch += br.d;
      for (let c = 0; c < 3; c++) needles[c] += br.needles[c];
      for (let j = 0; j < 12; j++) {
        const p = br.P(0.04 + rnd() * 0.92);
        snow += '<ellipse cx="' + f(p[0]) + '" cy="' + f(p[1] - 2.8) + '" rx="' + f(2.5 + rnd() * 4) + '" ry="' + f(1.2 + rnd()) + '" fill="#f6fbff" opacity=".92"/>';
      }
      [0.2, 0.8].forEach((t, i) => { const p = br.P(t); cones += cone(p[0], p[1] + 3, i ? 14 : -12, 0.92); });
      for (let j = 0; j < 10; j++) {
        const p = br.P((j + 0.5) / 10);
        lights[li % 3] += bulb(p[0], p[1] + 8 + rnd() * 2.5, p[1], BULB_COLORS[li % BULB_COLORS.length]);
        li++;
      }
      const m = br.P(0.5), big = seg % 3 === 1;
      orns += ornament(m[0], m[1], 22 + rnd() * 12, big ? 10.5 : 8 + rnd() * 1.5, seg, (4.4 + rnd() * 2).toFixed(1), (-rnd() * 5).toFixed(1));
      anchors += '<circle cx="' + f(x0) + '" cy="' + (y0 - 2) + '" r="2.2" fill="url(#xm-gold)"/>' + holly(x0 + 2, y0 + 12, 1, seg % 2) + bow(x0, y0 + 4, 0.9);
    }
    return '<svg viewBox="0 0 ' + f(vbW) + ' ' + H + '" width="100%" height="' + f(H * k) + '" aria-hidden="true" focusable="false">' +
      '<path d="' + branch + '" stroke="#0a3328" stroke-width="7" stroke-linecap="round" fill="none"/>' +
      '<path d="' + branch + '" stroke="#17614a" stroke-width="3.4" stroke-linecap="round" fill="none"/>' +
      needlePaths(needles, 1.2) + snow + cones +
      '<g class="xm-tw xm-tw0">' + lights[0] + '</g><g class="xm-tw xm-tw1">' + lights[1] + '</g><g class="xm-tw xm-tw2">' + lights[2] + '</g>' +
      orns + anchors + '</svg>';
  }

  /* ---------- Christmas tree with gifts ---------- */
  function giftBox(x, y, w, h, body, lid, band) {
    const mx = x + w / 2;
    return '<ellipse cx="' + f(mx) + '" cy="' + f(y + h + 1) + '" rx="' + f(w * 0.72) + '" ry="2.2" fill="rgba(0,0,0,.3)"/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="1.6" fill="' + body + '"/>' +
      '<rect x="' + (x - 1.5) + '" y="' + (y - 4.5) + '" width="' + (w + 3) + '" height="6" rx="1.4" fill="' + lid + '"/>' +
      '<rect x="' + f(mx - 2.2) + '" y="' + (y - 4.5) + '" width="4.4" height="' + (h + 4.5) + '" fill="' + band + '"/>' +
      '<rect x="' + (x - 1.5) + '" y="' + f(y + h * 0.5) + '" width="' + (w + 3) + '" height="0" fill="none"/>' +
      '<ellipse cx="' + f(mx - 4) + '" cy="' + (y - 7) + '" rx="4.6" ry="2.4" fill="none" stroke="' + band + '" stroke-width="1.6" transform="rotate(-28 ' + f(mx - 4) + ' ' + (y - 7) + ')"/>' +
      '<ellipse cx="' + f(mx + 4) + '" cy="' + (y - 7) + '" rx="4.6" ry="2.4" fill="none" stroke="' + band + '" stroke-width="1.6" transform="rotate(28 ' + f(mx + 4) + ' ' + (y - 7) + ')"/>' +
      '<circle cx="' + f(mx) + '" cy="' + (y - 5.5) + '" r="1.9" fill="' + band + '"/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + f(w * 0.22) + '" height="' + h + '" rx="1.2" fill="#fff" opacity=".1"/>';
  }

  function treeSvg() {
    const cx = 85, rnd = rng(5);
    const tiers = [[138, 200, 68], [104, 164, 56], [72, 128, 44], [44, 94, 32], [24, 62, 21]];
    let out = "", tw = ["", "", ""], balls = "", ti = 0, bi = 0;
    tiers.forEach((t, idx) => {
      const top = t[0], bot = t[1], w = t[2], h = bot - top, n = Math.max(3, Math.round(w / 11));
      let d = "M" + cx + " " + top + "C" + f(cx + w * 0.18) + " " + f(top + h * 0.3) + " " + f(cx + w * 0.7) + " " + f(bot - h * 0.22) + " " + (cx + w) + " " + (bot - 3);
      for (let i = 0; i < n; i++) {
        const xa = cx + w - 2 * w * (i / n), xb = cx + w - 2 * w * ((i + 1) / n);
        d += "Q" + f((xa + xb) / 2) + " " + (bot + 9) + " " + f(xb) + " " + (bot - 3);
      }
      d += "C" + f(cx - w * 0.7) + " " + f(bot - h * 0.22) + " " + f(cx - w * 0.18) + " " + f(top + h * 0.3) + " " + cx + " " + top + "Z";
      let tex = "";
      for (let i = 0; i < 34; i++) {
        const y = top + h * (0.2 + rnd() * 0.75), hw = w * 0.9 * ((y - top) / h), x = cx + (rnd() * 2 - 1) * hw * 0.92, sg = x < cx ? -1 : 1;
        tex += "M" + f(x) + " " + f(y) + "l" + (sg * (3 + rnd() * 3)) + " " + f(3 + rnd() * 3);
      }
      out += '<path d="' + d + '" transform="translate(0 3)" fill="#052a20"/>' +
        '<path d="' + d + '" fill="url(#xm-tree)" stroke="rgba(160,255,205,.3)" stroke-width=".8"/>' +
        '<path d="' + tex + '" stroke="rgba(185,255,215,.24)" stroke-width="1" stroke-linecap="round" fill="none"/>';
      if (idx < tiers.length - 1) {
        const y1 = top + h * 0.6, hw = w * 0.56, sg = "M" + f(cx - hw) + " " + f(y1) + "Q" + cx + " " + f(y1 + 15) + " " + f(cx + hw) + " " + f(y1);
        out += '<path d="' + sg + '" stroke="#b88a2b" stroke-width=".8" fill="none" opacity=".7"/>' +
          '<path d="' + sg + '" stroke="#f3c95f" stroke-width="3" stroke-dasharray="0.1 5.2" stroke-linecap="round" fill="none"/>';
        for (let j = 0; j < 5; j++) {
          const tt = (j + 0.5) / 5, u = 1 - tt, lx = u * u * (cx - hw) + 2 * u * tt * cx + tt * tt * (cx + hw), ly = u * u * y1 + 2 * u * tt * (y1 + 15) + tt * tt * y1;
          const c = BULB_COLORS[ti % BULB_COLORS.length];
          tw[ti % 3] += '<circle cx="' + f(lx) + '" cy="' + f(ly + 1) + '" r="5" fill="' + c + '" opacity=".25"/><circle cx="' + f(lx) + '" cy="' + f(ly + 1) + '" r="2" fill="' + c + '"/>';
          ti++;
        }
      }
      const grads = ["xm-red", "xm-gold", "xm-ice", "xm-emerald"], br = idx > 2 ? 3.4 : 4.4;
      [-0.62, -0.02, 0.6].forEach((fx) => {
        const bx = cx + w * fx, by = bot + 4 + (fx === -0.02 ? 1 : 0);
        balls += '<circle cx="' + f(bx) + '" cy="' + by + '" r="' + br + '" fill="url(#' + grads[bi % 4] + ')"/><circle cx="' + f(bx - br * 0.35) + '" cy="' + f(by - br * 0.4) + '" r="' + f(br * 0.26) + '" fill="#fff" opacity=".75"/>';
        bi++;
      });
    });
    const star = "M" + cx + " 6l3.9 8.2 9 1.2-6.6 6.2 1.7 8.9-8-4.4-8 4.4 1.7-8.9-6.6-6.2 9-1.2z";
    return '<svg viewBox="0 0 170 244" aria-hidden="true" focusable="false">' +
      '<ellipse cx="' + cx + '" cy="226" rx="74" ry="9" fill="rgba(0,0,0,.28)"/>' +
      '<rect x="' + (cx - 8) + '" y="196" width="16" height="16" fill="url(#xm-trunk)"/>' + out +
      '<path d="M35 214Q35 203 ' + cx + ' 202Q135 203 135 214Q' + cx + ' 226 35 214Z" fill="url(#xm-skirt)" stroke="#e8b94a" stroke-width=".9"/>' +
      '<path d="M44 214Q' + cx + ' 222 126 214" fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="1 4" stroke-linecap="round" opacity=".55"/>' +
      balls + '<g class="xm-tw xm-tw0">' + tw[0] + '</g><g class="xm-tw xm-tw1">' + tw[1] + '</g><g class="xm-tw xm-tw2">' + tw[2] + '</g>' +
      giftBox(14, 214, 30, 24, "#c8283c", "#e0405a", "#f0c75a") +
      giftBox(118, 208, 26, 30, "#17835f", "#27a577", "#f6efe0") +
      giftBox(92, 222, 20, 16, "#f4efe4", "#fffaf0", "#d42a3d") +
      '<circle class="xm-starglow" cx="' + cx + '" cy="19" r="26" fill="url(#xm-sglow)"/>' +
      '<path class="xm-star" d="' + star + '" fill="url(#xm-gold)" stroke="#fff3bd" stroke-width="1"/></svg>';
  }

  /* ---------- lantern ---------- */
  function lanternSvg() {
    const rnd = rng(23);
    const a = pineBranch(40, 124, 22, 112, 6, 128, 46, rnd, 5, 10);
    const b = pineBranch(40, 124, 58, 111, 74, 127, 46, rnd, 5, 10);
    return '<svg viewBox="0 0 80 136" aria-hidden="true" focusable="false">' +
      '<circle class="xm-lglowc" cx="40" cy="82" r="46" fill="url(#xm-lglow)"/>' +
      '<path d="M27 22C27 4 53 4 53 22" stroke="#c9a24a" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M18 30L62 30L54 18L26 18Z" fill="url(#xm-metal)" stroke="#7a5714" stroke-width=".8"/><circle cx="40" cy="15" r="3" fill="url(#xm-gold)"/>' +
      '<rect x="20" y="30" width="40" height="78" rx="3" fill="url(#xm-glass)" stroke="#d6b25a" stroke-width="1.6"/>' +
      '<path d="M33 30V108M47 30V108" stroke="#d6b25a" stroke-width="1" opacity=".5"/>' +
      '<rect x="34" y="74" width="12" height="34" rx="2" fill="url(#xm-wax)"/>' +
      '<g class="xm-flame"><path d="M40 52C45.500 60 46.500 66 40 72C33.500 66 34.500 60 40 52Z" fill="url(#xm-flame)"/><path d="M40 60C42.200 63 42.200 67 40 70C37.800 67 37.800 63 40 60Z" fill="#fff6d0"/></g>' +
      '<path d="M40 72V75" stroke="#2b2118" stroke-width="1.2"/>' +
      '<path d="M22 28C26 21 31 24 35 19C40 16 45 20 49 18C54 19 57 24 58 28Z" fill="#f6fbff" opacity=".96"/>' +
      '<rect x="16" y="108" width="48" height="7" rx="2" fill="url(#xm-metal)"/><rect x="22" y="115" width="36" height="4" rx="1.5" fill="url(#xm-metal)"/>' +
      '<path d="' + a.d + '" stroke="#0a3328" stroke-width="3.4" stroke-linecap="round" fill="none"/>' +
      '<path d="' + b.d + '" stroke="#0a3328" stroke-width="3.4" stroke-linecap="round" fill="none"/>' +
      needlePaths(a.needles, 1.2) + needlePaths(b.needles, 1.2) +
      holly(37, 118, 0.9, false) +
      '<ellipse cx="40" cy="133" rx="36" ry="3.5" fill="#fff" opacity=".18"/></svg>';
  }

  /* ---------- logo decoration (HTML bulbs + vector wire, never stretched) ---------- */
  function brandArt() {
    const Q = (p0, c, p1, t) => { const u = 1 - t; return u * u * p0 + 2 * u * t * c + t * t * p1; };
    let bulbs = "", i = 0;
    [[0, 25, 50], [50, 75, 100]].forEach((s) => {
      [0.2, 0.5, 0.8].forEach((t) => {
        const x = Q(s[0], s[1], s[2], t), y = Q(8, 34, 8, t);
        bulbs += '<i class="xm-b xm-b' + (i % 3) + '" style="left:' + f(x) + '%;top:' + f((y + 4) / 40 * 100) + '%;color:' + BULB_COLORS[i % BULB_COLORS.length] + '"></i>';
        i++;
      });
    });
    const hollySvg = (cls, flip) => '<svg class="xm-holly ' + cls + '" viewBox="0 0 40 28" aria-hidden="true" focusable="false">' + holly(14, 12, 1.05, flip) + '</svg>';
    return '<svg class="xm-wire" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 8Q25 34 50 8Q75 34 100 8"/></svg>' +
      bulbs + hollySvg("xm-hl", false) + hollySvg("xm-hr", true);
  }

  /* ---------- natural snowfall (canvas, soft depth-of-field) ---------- */
  function startSnow(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 48;
    const sc = sprite.getContext("2d"), g = sc.createRadialGradient(24, 24, 0, 24, 24, 24);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,.7)"); g.addColorStop(1, "rgba(255,255,255,0)");
    sc.fillStyle = g; sc.fillRect(0, 0, 48, 48);
    let W = 0, H = 0, flakes = [], raf = 0, last = 0, clock = 0;
    function seed() {
      const n = Math.round(Math.min(95, Math.max(34, W * H / 21000)) * (W < 700 ? 0.7 : 1));
      flakes = Array.from({ length: n }, () => {
        const z = Math.random();
        return { x: Math.random() * W, y: Math.random() * H, s: 3 + z * z * 11, vy: 16 + z * 40, amp: 6 + z * 18, sp: 0.35 + Math.random() * 0.7, ph: Math.random() * 6.28, a: 0.3 + z * 0.55 };
      });
    }
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed(); draw(0);
    }
    function draw(dt) {
      clock += dt;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < flakes.length; i++) {
        const p = flakes[i];
        p.y += p.vy * dt;
        if (p.y > H + 12) { p.y = -12; p.x = Math.random() * W; }
        const x = p.x + Math.sin(clock * p.sp + p.ph) * p.amp + clock * 4;
        ctx.globalAlpha = p.a;
        ctx.drawImage(sprite, ((x % (W + 40)) + (W + 40)) % (W + 40) - 20 - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
      ctx.globalAlpha = 1;
    }
    function frame(ts) {
      raf = window.requestAnimationFrame(frame);
      const dt = Math.min(0.05, (ts - last) / 1000);
      if (dt < 0.02) return;
      last = ts; draw(dt);
    }
    function play() { if (!raf && !reduce && !document.hidden) { last = performance.now(); raf = window.requestAnimationFrame(frame); } }
    function stop() { if (raf) { window.cancelAnimationFrame(raf); raf = 0; } }
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : play()));
    resize(); play();
    return resize;
  }

  /* ---------- layer ---------- */
  function buildLayer() {
    const layer = document.createElement("div");
    layer.id = "esChristmasLayer";
    layer.className = "esxmas-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = DEFS + '<div class="esxmas-glow"></div><canvas class="esxmas-snowcv"></canvas>' +
      '<div class="esxmas-garland"></div><div class="esxmas-lantern">' + lanternSvg() + '</div><div class="esxmas-tree">' + treeSvg() + '</div>';
    document.body.appendChild(layer);

    const garland = layer.querySelector(".esxmas-garland");
    let lastW = 0;
    const renderGarland = () => {
      const w = window.innerWidth;
      if (w === lastW) return;
      lastW = w;
      garland.innerHTML = garlandSvg(w, w < 700 ? 0.72 : 1);
    };
    renderGarland();
    const snowResize = startSnow(layer.querySelector(".esxmas-snowcv"));
    let timer = 0;
    window.addEventListener("resize", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { renderGarland(); if (snowResize) snowResize(); }, 200);
    }, { passive: true });
  }

  function decorateBrands() {
    const found = new Set();
    BRAND_SELECTORS.forEach((selector) => document.querySelectorAll(selector).forEach((el) => found.add(el)));
    document.querySelectorAll("a,div,span").forEach((el) => {
      if (el.children.length === 0 && /^ES TEAMS TV$/i.test(el.textContent.trim())) found.add(el);
    });
    found.forEach((el) => {
      if (el.dataset.esChristmasBrand) return;
      el.dataset.esChristmasBrand = "true";
      el.classList.add("esxmas-brand");
      const art = document.createElement("span");
      art.className = "esxmas-brand-art";
      art.innerHTML = brandArt();
      el.appendChild(art);
    });
  }

  function playDailyGreeting() {
    if (window.location.pathname !== "/" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    const key = "esxmas-santa-greeting-date";
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem(key) === today) return;
      localStorage.setItem(key, today);
    } catch (_) {
      return;
    }
    window.setTimeout(() => {
      try {
        window.speechSynthesis.cancel();
        const greeting = new SpeechSynthesisUtterance("Ho ho ho!");
        greeting.lang = "en-US";
        greeting.pitch = 0.55;
        greeting.rate = 0.78;
        greeting.volume = 0.7;
        window.speechSynthesis.speak(greeting);
      } catch (_) {
        // Browser autoplay policy may reject speech; never interrupt the page.
      }
    }, 900);
  }

  function start() {
    if (!document.body) return;
    document.body.classList.add("esxmas-active");
    buildLayer();
    const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 180));
    schedule(decorateBrands, { timeout: 1200 });
    playDailyGreeting();
  }

  const style = document.createElement("style");
  style.textContent = `
    .esxmas-layer{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;isolation:isolate}
    .xm-defs{position:absolute;width:0;height:0;overflow:hidden}
    .esxmas-glow{position:absolute;inset:0;background:radial-gradient(520px 230px at 0% 0%,rgba(255,190,90,.11),transparent 72%),radial-gradient(520px 230px at 100% 0%,rgba(255,96,110,.09),transparent 72%),radial-gradient(420px 260px at 100% 100%,rgba(255,200,110,.10),transparent 72%)}
    .esxmas-snowcv{position:absolute;inset:0;width:100%;height:100%;display:block}
    .esxmas-garland{position:absolute;top:calc(var(--nav-h,0px) + env(safe-area-inset-top,0px));left:0;width:100%;pointer-events:none}
    .esxmas-garland svg{display:block;width:100%;overflow:visible}
    .xm-tw0{animation:xm-twinkle 3.1s ease-in-out infinite}
    .xm-tw1{animation:xm-twinkle 2.6s ease-in-out -.9s infinite}
    .xm-tw2{animation:xm-twinkle 3.6s ease-in-out -1.8s infinite}
    @keyframes xm-twinkle{0%,100%{opacity:.6}50%{opacity:1}}
    .xm-orn{transform-box:fill-box;transform-origin:50% 0;animation:xm-sway var(--t,5s) ease-in-out var(--d,0s) infinite}
    @keyframes xm-sway{0%,100%{transform:rotate(-2.6deg)}50%{transform:rotate(2.6deg)}}
    .esxmas-tree{position:absolute;right:3.5vw;bottom:-2px;width:170px;filter:drop-shadow(0 0 18px rgba(255,200,110,.16))}
    .esxmas-tree svg,.esxmas-lantern svg{width:100%;display:block;overflow:visible}
    .xm-star{transform-box:fill-box;transform-origin:50% 55%;animation:xm-shimmer 3.4s ease-in-out infinite}
    .xm-starglow{animation:xm-twinkle 3.4s ease-in-out infinite}
    @keyframes xm-shimmer{0%,100%{transform:scale(1) rotate(-2deg)}50%{transform:scale(1.07) rotate(2deg)}}
    .esxmas-lantern{position:absolute;left:2vw;bottom:0;width:78px}
    .xm-lglowc{animation:xm-breathe 3.8s ease-in-out infinite}
    @keyframes xm-breathe{0%,100%{opacity:.72}50%{opacity:1}}
    .xm-flame{transform-box:fill-box;transform-origin:50% 100%;animation:xm-flicker 1.7s ease-in-out infinite}
    @keyframes xm-flicker{0%,100%{transform:scale(1,1) skewX(0)}25%{transform:scale(.94,1.06) skewX(2deg)}50%{transform:scale(1.04,.95) skewX(-1.5deg)}75%{transform:scale(.97,1.04) skewX(1deg)}}
    .esxmas-brand{position:relative;z-index:4;isolation:isolate;filter:drop-shadow(0 0 7px rgba(255,200,120,.28))}
    .esxmas-brand-art{position:absolute;z-index:0;left:-10px;right:-10px;top:-14px;height:22px;pointer-events:none;overflow:visible;display:block}
    .esxmas-brand> :not(.esxmas-brand-art){position:relative;z-index:1}
    .xm-wire{position:absolute;inset:0;width:100%;height:100%;overflow:visible;fill:none}
    .xm-wire path{stroke:#2f9a6c;stroke-width:1.7;stroke-linecap:round;vector-effect:non-scaling-stroke}
    .xm-b{position:absolute;width:5px;height:6.5px;margin:-2px 0 0 -2.5px;border-radius:50% 50% 50% 50%/40% 40% 60% 60%;background:currentColor;box-shadow:0 0 6px 1px currentColor;animation:xm-twinkle 2.6s ease-in-out infinite}
    .xm-b1{animation-delay:-.9s}.xm-b2{animation-delay:-1.8s}
    .xm-holly{position:absolute;top:-9px;width:34px;height:24px;overflow:visible}
    .xm-hl{left:-17px}.xm-hr{right:-17px}
    @media(max-width:700px){.esxmas-tree{right:-12px;width:112px;bottom:0}.esxmas-lantern{display:none}.esxmas-brand-art{left:-7px;right:-7px;top:-11px;height:18px}.xm-holly{width:26px;height:18px;top:-7px}.xm-hl{left:-13px}.xm-hr{right:-13px}.esxmas-glow{opacity:.7}}
    @media(prefers-reduced-motion:reduce){.xm-tw,.xm-orn,.xm-star,.xm-starglow,.xm-lglowc,.xm-flame,.xm-b{animation:none}}
  `;
  document.head.appendChild(style);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
