(function () {
  if (window.SiteSelect) return;

  var SVG_NS = "http://www.w3.org/2000/svg";
  var STYLE_ID = "siteSelectStyle";
  var MAX_LIST = 220;
  var seen = new WeakSet();
  var current = null;

  var CSS = [
    ".custom-select{position:relative;width:100%}",
    ".custom-select>select.cs-native{position:absolute!important;left:0!important;top:0!important;width:1px!important;height:1px!important;margin:0!important;padding:0!important;border:0!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important}",
    ".custom-select-btn{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;padding:11px 13px;color:var(--text);font-size:.9rem;font-family:inherit;text-align:left;cursor:pointer;transition:border-color .2s var(--ease)}",
    ".custom-select-btn span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".custom-select-btn:hover,.custom-select.open .custom-select-btn{border-color:var(--accent)}",
    ".custom-select-btn:disabled{opacity:.5;cursor:not-allowed;border-color:var(--border-strong)}",
    ".custom-select-chevron{width:16px;height:16px;color:var(--muted);flex-shrink:0;transition:transform .2s var(--ease)}",
    ".custom-select.open .custom-select-chevron{transform:rotate(180deg)}",
    ".custom-select-list{box-sizing:border-box;display:none;position:fixed;z-index:200;max-height:" + MAX_LIST + "px;overflow-y:auto;scrollbar-width:thin;background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(18,18,28,.72);backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%);border:1px solid rgba(255,255,255,.18);border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.12);padding:6px}",
    ":root[data-theme='light'] .custom-select-list{background:linear-gradient(155deg,rgba(255,255,255,.5),rgba(255,255,255,.16) 40%,rgba(255,255,255,.24) 100%),rgba(255,255,255,.72);border:1px solid rgba(255,255,255,.6);box-shadow:0 12px 30px rgba(20,20,28,.16),inset 0 1px 0 rgba(255,255,255,.7)}",
    ".custom-select.open .custom-select-list{display:block}",
    ".custom-select-group{font-family:var(--font-mono);font-size:.6rem;letter-spacing:.11em;text-transform:uppercase;color:var(--muted);padding:8px 10px 4px}",
    ".custom-select-option{display:block;width:100%;text-align:left;background:transparent;border:none;color:var(--text);font-family:inherit;font-size:.85rem;padding:9px 10px;border-radius:8px;cursor:pointer}",
    ".custom-select-option:hover,.custom-select-option.active,.custom-select-option.focus{background:var(--card2);color:var(--accent)}",
    ".custom-select-option:disabled{opacity:.4;cursor:not-allowed;background:transparent;color:var(--text)}"
  ].join("\n");

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function chevron() {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "custom-select-chevron");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("d", "M6 9l6 6 6-6");
    svg.appendChild(path);
    return svg;
  }

  function containingBlock(el) {
    var p = el.parentElement;
    while (p && p !== document.body) {
      var cs = getComputedStyle(p);
      if (
        cs.transform !== "none" ||
        cs.perspective !== "none" ||
        cs.filter !== "none" ||
        (cs.backdropFilter && cs.backdropFilter !== "none") ||
        /transform|perspective|filter/.test(cs.willChange || "")
      ) return p;
      p = p.parentElement;
    }
    return null;
  }

  function upgrade(select) {
    if (seen.has(select) || select.multiple || select.size > 1 || !select.parentNode) return;
    seen.add(select);

    var items = [];
    var focusIndex = -1;
    var typed = "";
    var typedTimer = null;

    var wrap = document.createElement("div");
    wrap.className = "custom-select";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "custom-select-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    if (select.getAttribute("aria-label")) btn.setAttribute("aria-label", select.getAttribute("aria-label"));

    var label = document.createElement("span");
    btn.appendChild(label);
    btn.appendChild(chevron());

    var list = document.createElement("div");
    list.className = "custom-select-list";
    list.setAttribute("role", "listbox");

    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(btn);
    wrap.appendChild(select);
    wrap.appendChild(list);
    select.classList.add("cs-native");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");

    var api = { wrap: wrap, list: list, btn: btn, close: close };

    function addOption(opt, groupDisabled) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "custom-select-option";
      el.setAttribute("role", "option");
      el.tabIndex = -1;
      el.disabled = opt.disabled || !!groupDisabled;
      el.textContent = opt.textContent;
      el.setAttribute("data-i", String(items.length));
      items.push({ el: el, opt: opt });
      list.appendChild(el);
    }

    function build() {
      list.textContent = "";
      items = [];
      focusIndex = -1;
      Array.prototype.forEach.call(select.children, function (node) {
        if (node.tagName === "OPTGROUP") {
          var group = document.createElement("div");
          group.className = "custom-select-group";
          group.textContent = node.label;
          list.appendChild(group);
          Array.prototype.forEach.call(node.children, function (opt) {
            if (opt.tagName === "OPTION") addOption(opt, node.disabled);
          });
        } else if (node.tagName === "OPTION") {
          addOption(node, false);
        }
      });
    }

    function sync() {
      var chosen = select.options[select.selectedIndex];
      label.textContent = chosen ? chosen.textContent : "";
      items.forEach(function (it) {
        var on = it.opt === chosen;
        it.el.classList.toggle("active", on);
        it.el.setAttribute("aria-selected", on ? "true" : "false");
      });
      btn.disabled = select.disabled;
    }

    function refresh() {
      if (!select.classList.contains("cs-native")) select.classList.add("cs-native");
      build();
      sync();
    }

    function setFocus(i) {
      if (focusIndex >= 0 && items[focusIndex]) items[focusIndex].el.classList.remove("focus");
      focusIndex = i;
      if (i < 0 || !items[i]) return;
      var el = items[i].el;
      el.classList.add("focus");
      if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop - 6;
      else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight + 6;
    }

    function place() {
      var r = btn.getBoundingClientRect();
      list.style.maxHeight = "";
      var want = Math.min(list.scrollHeight + 2, MAX_LIST);
      var below = window.innerHeight - r.bottom - 12;
      var above = r.top - 12;
      var flip = want > below && above > below;
      list.style.maxHeight = Math.max(100, Math.min(MAX_LIST, flip ? above : below)) + "px";
      var top = flip ? r.top - 6 - list.offsetHeight : r.bottom + 6;
      var left = r.left;
      var anchor = containingBlock(list);
      if (anchor) {
        var a = anchor.getBoundingClientRect();
        left -= a.left;
        top -= a.top;
      }
      list.style.left = left + "px";
      list.style.top = top + "px";
      list.style.width = r.width + "px";
    }

    function open() {
      if (select.disabled || wrap.classList.contains("open")) return;
      if (current) current.close();
      wrap.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      place();
      setFocus(select.selectedIndex);
      current = api;
    }

    function close() {
      wrap.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      if (current === api) current = null;
    }

    function choose(i) {
      var it = items[i];
      if (!it || it.el.disabled) return;
      var changed = select.selectedIndex !== it.opt.index;
      select.selectedIndex = it.opt.index;
      close();
      btn.focus();
      if (changed) {
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    function move(dir) {
      var i = focusIndex;
      do {
        i += dir;
      } while (i >= 0 && i < items.length && items[i].el.disabled);
      if (i >= 0 && i < items.length) setFocus(i);
    }

    function typeahead(ch) {
      clearTimeout(typedTimer);
      typed += ch.toLowerCase();
      typedTimer = setTimeout(function () {
        typed = "";
      }, 600);
      for (var i = 0; i < items.length; i++) {
        if (!items[i].el.disabled && items[i].el.textContent.toLowerCase().indexOf(typed) === 0) {
          if (wrap.classList.contains("open")) setFocus(i);
          else choose(i);
          return;
        }
      }
    }

    ["value", "selectedIndex"].forEach(function (prop) {
      var desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop);
      Object.defineProperty(select, prop, {
        configurable: true,
        get: function () {
          return desc.get.call(this);
        },
        set: function (v) {
          desc.set.call(this, v);
          sync();
        }
      });
    });

    btn.addEventListener("click", function () {
      if (wrap.classList.contains("open")) close();
      else open();
    });

    btn.addEventListener("keydown", function (e) {
      var isOpen = wrap.classList.contains("open");
      var key = e.key;
      if (key === "ArrowDown" || key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) open();
        else move(key === "ArrowDown" ? 1 : -1);
      } else if (key === "Home" || key === "End") {
        if (!isOpen) return;
        e.preventDefault();
        setFocus(key === "Home" ? -1 : items.length);
        move(key === "Home" ? 1 : -1);
      } else if (key === "Enter" || key === " ") {
        e.preventDefault();
        if (isOpen) choose(focusIndex);
        else open();
      } else if (key === "Tab") {
        close();
      } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        typeahead(key);
      }
    });

    list.addEventListener("click", function (e) {
      var el = e.target.closest(".custom-select-option");
      if (el) choose(Number(el.getAttribute("data-i")));
    });

    select.addEventListener("change", sync);
    select.addEventListener("focus", function () {
      btn.focus();
    });

    new MutationObserver(refresh).observe(select, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "disabled", "label"]
    });

    refresh();
  }

  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.tagName === "SELECT") upgrade(root);
    var found = root.querySelectorAll("select");
    for (var i = 0; i < found.length; i++) upgrade(found[i]);
  }

  document.addEventListener("click", function (e) {
    if (current && !current.wrap.contains(e.target)) current.close();
  });

  document.addEventListener(
    "scroll",
    function (e) {
      if (current && !current.list.contains(e.target)) current.close();
    },
    true
  );

  document.addEventListener(
    "keydown",
    function (e) {
      if (current && e.key === "Escape") {
        e.stopPropagation();
        var btn = current.btn;
        current.close();
        btn.focus();
      }
    },
    true
  );

  window.addEventListener("resize", function () {
    if (current) current.close();
  });

  function start() {
    injectStyle();
    scan(document.documentElement);
    new MutationObserver(function (records) {
      records.forEach(function (rec) {
        rec.addedNodes.forEach(scan);
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  window.SiteSelect = {
    scan: function (root) {
      scan(root || document.documentElement);
    },
    upgrade: upgrade
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
