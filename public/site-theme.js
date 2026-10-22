/* Personal site themes. Only verified members can pick one, and it only changes how the site looks
   on their own device: the choice is kept in this browser, never sent to anyone else.
   This file runs in the page head so the colours are in place before anything paints. */
(function () {
  "use strict";
  if (window.EsTheme) return;
  var KEY = "es_theme";
  var STYLE_ID = "esThemeStyle";

  var THEMES = [
    { id: "default", name: "Default", a: "#00E0FF", b: "#7c5cff", c: "#ff5cb8" },
    { id: "ocean", name: "Ocean", a: "#38BDF8", b: "#2563EB", c: "#22D3EE", bg: ["#060B14", "#0A111E", "#0E1626", "#13203A", "#16233F"] },
    { id: "sunset", name: "Sunset", a: "#FF8A3D", b: "#FF3D6E", c: "#FFC857", bg: ["#0F0908", "#160D0B", "#1C1210", "#261815", "#2B1B17"] },
    { id: "forest", name: "Forest", a: "#34D399", b: "#84CC16", c: "#22C55E", bg: ["#050D0A", "#08130E", "#0D1B15", "#12261D", "#172C22"] },
    { id: "rose", name: "Rose", a: "#FB7185", b: "#E879F9", c: "#F472B6", bg: ["#0E0710", "#150B18", "#1B0F1E", "#261530", "#2C1936"] },
    { id: "gold", name: "Gold", a: "#FBBF24", b: "#F97316", c: "#FDE68A", bg: ["#0D0A05", "#130E08", "#1A140B", "#251C0F", "#2B2113"] },
    { id: "violet", name: "Violet", a: "#A78BFA", b: "#6366F1", c: "#C084FC", bg: ["#09060F", "#0F0A19", "#150E22", "#1E1433", "#241839"] },
    { id: "crimson", name: "Crimson", a: "#F43F5E", b: "#DC2626", c: "#FB7185", bg: ["#0E0607", "#150909", "#1C0D0F", "#2A1215", "#30161A"] },
    { id: "mint", name: "Mint", a: "#5EEAD4", b: "#38BDF8", c: "#A7F3D0", bg: ["#050E0E", "#091515", "#0C1D1D", "#122A2A", "#173030"] },
    { id: "graphite", name: "Graphite", a: "#E5E7EB", b: "#9CA3AF", c: "#6B7280", bg: ["#09090B", "#101013", "#161619", "#1F1F24", "#25252B"] },
    { id: "midnight", name: "Midnight", a: "#60A5FA", b: "#A78BFA", c: "#818CF8", bg: ["#05070F", "#090D19", "#0D1224", "#141B38", "#19213F"] },
  ];

  function find(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return null;
  }
  function rgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function css(t) {
    var out = ":root{--accent:" + t.a + ";--accent2:" + t.b + "}";
    out += ".blob-3{background:radial-gradient(circle," + t.c + ",transparent 70%)!important}";
    out += ":root[data-theme='light'] .blob-1{background:radial-gradient(circle,color-mix(in srgb," + t.a + " 50%,transparent),transparent 70%)!important}";
    out += ":root[data-theme='light'] .blob-2{background:radial-gradient(circle,color-mix(in srgb," + t.b + " 45%,transparent),transparent 70%)!important}";
    out += ":root[data-theme='light'] .blob-3{background:radial-gradient(circle,color-mix(in srgb," + t.c + " 35%,transparent),transparent 70%)!important}";
    if (t.bg) {
      var n = rgb(t.bg[0]);
      out += ":root:not([data-theme='light']){--dark:" + t.bg[0] + ";--dark2:" + t.bg[1] + ";--dark3:" + t.bg[2] + ";--card:" + t.bg[3] + ";--card2:" + t.bg[4] + ";--nav-bg:rgba(" + n.join(",") + ",.98)}";
    }
    return out;
  }
  function apply(id) {
    var old = document.getElementById(STYLE_ID);
    var t = id && id !== "default" ? find(id) : null;
    if (!t) { if (old) old.remove(); document.documentElement.removeAttribute("data-es-theme"); return; }
    var st = old || document.createElement("style");
    st.id = STYLE_ID;
    st.textContent = css(t);
    if (!old) (document.head || document.documentElement).appendChild(st);
    document.documentElement.setAttribute("data-es-theme", t.id);
  }
  function get() {
    try { var v = localStorage.getItem(KEY); return find(v) ? v : "default"; } catch (e) { return "default"; }
  }
  function set(id) {
    var t = find(id) ? id : "default";
    try { if (t === "default") localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch (e) {}
    apply(t);
    return t;
  }
  function sync(me) {
    if (!me) return;
    var ok = !!(me.verified || me.isAdmin);
    if (!ok && get() !== "default") set("default");
  }

  window.EsTheme = { themes: THEMES, apply: apply, get: get, set: set, sync: sync };
  apply(get());
})();
