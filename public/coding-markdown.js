(function (root) {
  "use strict";
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }
  function safeHref(value) {
    var href = String(value || "").trim().replace(/&amp;/g, "&");
    if (href.indexOf("\\") >= 0 || /[\u0000-\u0020]/.test(href)) return "";
    if (/^https?:\/\//i.test(href)) {
      try { var parsed = new URL(href); if (parsed.protocol === "https:" || parsed.protocol === "http:") return escapeHtml(parsed.href); } catch {}
      return "";
    }
    if (/^mailto:[^\s<>]+$/i.test(href)) return escapeHtml(href);
    if (/^(?:\/|#)(?!\/)/.test(href)) return escapeHtml(href);
    return "";
  }
  function inline(value) {
    var text = String(value), pattern = /(`[^`\n]+`|\[[^\]\n]+\]\([^\s)]+(?:\s+"[^"]*")?\)|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|(?<!\*)\*[^*\n]+\*(?!\*)|(?<!_)_[^_\n]+_(?!_))/g;
    var out = "", last = 0, match;
    while ((match = pattern.exec(text))) {
      out += escapeHtml(text.slice(last, match.index));
      var token = match[0], hrefMatch;
      if (token[0] === "`") out += "<code class=\"inline-code\">" + escapeHtml(token.slice(1, -1)) + "</code>";
      else if ((hrefMatch = /^\[([^\]]+)\]\(([^\s)]+)(?:\s+"[^"]*")?\)$/.exec(token))) {
        var href = safeHref(hrefMatch[2]);
        out += href ? "<a href=\"" + href + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + inline(hrefMatch[1]) + "</a>" : escapeHtml(hrefMatch[1]);
      } else if (token.slice(0, 2) === "**" || token.slice(0, 2) === "__") out += "<strong>" + inline(token.slice(2, -2)) + "</strong>";
      else if (token.slice(0, 2) === "~~") out += "<del>" + inline(token.slice(2, -2)) + "</del>";
      else out += "<em>" + inline(token.slice(1, -1)) + "</em>";
      last = pattern.lastIndex;
    }
    return out + escapeHtml(text.slice(last));
  }
  function fenceBlock(info, source) {
    var label = String(info || "").trim(), fileMatch = /(?:^|\s)filename=(?:"([^"]+)"|'([^']+)'|([^\s]+))/i.exec(label);
    var filename = fileMatch ? (fileMatch[1] || fileMatch[2] || fileMatch[3]).trim() : "";
    var language = label.replace(/(?:^|\s)filename=(?:"[^"]+"|'[^']+'|[^\s]+)/ig, "").trim().split(/\s+/)[0] || "code";
    language = /^[a-z0-9_+#.-]{1,32}$/i.test(language) ? language : "code";
    var shownName = filename || language;
    return "<div class=\"code-block\" data-language=\"" + escapeHtml(language) + "\" data-filename=\"" + escapeHtml(filename) + "\"><div class=\"code-head\"><span class=\"code-name\">" + escapeHtml(shownName) + "</span><div class=\"code-actions\"><button class=\"code-action\" type=\"button\" data-code-action=\"copy\" aria-label=\"Copy code\" title=\"Copy code\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><rect x=\"8\" y=\"8\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3\"/></svg></button><button class=\"code-action\" type=\"button\" data-code-action=\"download\" aria-label=\"Download code file\" title=\"Download code file\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3v12m-5-5 5 5 5-5M5 18v3h14v-3\"/></svg></button></div></div><pre><code class=\"language-" + escapeHtml(language) + "\">" + escapeHtml(source) + "</code></pre></div>";
  }
  function filename(raw, language) {
    var extensions = { js: "js", javascript: "js", mjs: "mjs", cjs: "cjs", ts: "ts", typescript: "ts", tsx: "tsx", jsx: "jsx", py: "py", python: "py", html: "html", css: "css", json: "json", xml: "xml", svg: "svg", sql: "sql", sh: "sh", bash: "sh", java: "java", go: "go", rust: "rs", rs: "rs", php: "php", ruby: "rb", rb: "rb", c: "c", cpp: "cpp", csharp: "cs", cs: "cs", yaml: "yml", yml: "yml", toml: "toml", text: "txt", markdown: "md", md: "md" };
    var ext = extensions[String(language || "").toLowerCase()] || "txt";
    var name = String(raw || "").split(/[\\/]/).pop().replace(/[<>:"|?*]/g, "-").replace(/[. ]+$/, "").split("").filter(function (ch) { return ch.charCodeAt(0) >= 32; }).join("").slice(0, 120);
    var allowed = /\.(?:txt|md|js|mjs|cjs|ts|tsx|jsx|json|css|scss|sass|less|html|htm|xml|svg|py|java|kt|go|rs|php|sql|yml|yaml|toml|sh|bash|c|h|cc|cpp|hpp|cs|swift|rb|lua|dart|ex|exs|clj|scala|groovy|gradle|tf|hcl|proto|graphql|gql|prisma)$/i;
    if (!name) return "generated-code." + ext;
    if (!allowed.test(name)) name = name.replace(/\.[^.]*$/, "") + "." + ext;
    return name;
  }
  function highlight(source) {
    var text = String(source), pattern = /\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`|\b(?:const|let|var|function|return|class|import|from|export|async|await|if|else|for|while|try|catch|new|def|public|private|static)\b/g;
    var out = "", last = 0, match;
    while ((match = pattern.exec(text))) {
      out += escapeHtml(text.slice(last, match.index));
      var token = match[0], kind = /^(?:\/\/|#)/.test(token) ? "tok-com" : /^["'`]/.test(token) ? "tok-str" : "tok-key";
      out += "<span class=\"" + kind + "\">" + escapeHtml(token) + "</span>";
      last = pattern.lastIndex;
    }
    return out + escapeHtml(text.slice(last));
  }
  function render(markdown) {
    var text = String(markdown || "").replace(/\r\n?/g, "\n"), lines = text.split("\n"), out = [], paragraph = [], i = 0;
    function flushParagraph() { if (paragraph.length) { out.push("<p>" + paragraph.map(inline).join("<br>") + "</p>"); paragraph = []; } }
    while (i < lines.length) {
      var line = lines[i], fence = /^\s*(```+|~~~+)\s*([^`]*)$/.exec(line);
      if (fence) {
        flushParagraph(); var marker = fence[1][0], size = fence[1].length, codeLines = [], info = (fence[2] || "").trim(); i++;
        while (i < lines.length && !new RegExp("^\\s*" + marker + "{" + size + ",}\\s*$").test(lines[i])) codeLines.push(lines[i++]);
        if (i < lines.length) i++;
        out.push(fenceBlock(info, codeLines.join("\n"))); continue;
      }
      var heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      if (heading) { flushParagraph(); var level = heading[1].length; out.push("<h" + level + ">" + inline(heading[2]) + "</h" + level + ">"); i++; continue; }
      var list = /^\s*(?:([-+*])|(\d+)[.)])\s+(.+)$/.exec(line);
      if (list) {
        flushParagraph(); var ordered = !!list[2], tag = ordered ? "ol" : "ul", items = [];
        while (i < lines.length) { var item = /^\s*(?:([-+*])|(\d+)[.)])\s+(.+)$/.exec(lines[i]); if (!item || !!item[2] !== ordered) break; items.push("<li>" + inline(item[3]) + "</li>"); i++; }
        out.push("<" + tag + ">" + items.join("") + "</" + tag + ">"); continue;
      }
      var quote = /^\s*&gt;\s?(.*)$/.exec(line) || /^\s*>\s?(.*)$/.exec(line);
      if (quote) { flushParagraph(); var quotes = []; while (i < lines.length) { var q = /^\s*>\s?(.*)$/.exec(lines[i]); if (!q) break; quotes.push(inline(q[1])); i++; } out.push("<blockquote><p>" + quotes.join("<br>") + "</p></blockquote>"); continue; }
      if (!line.trim()) { flushParagraph(); i++; continue; }
      paragraph.push(line); i++;
    }
    flushParagraph();
    return out.join("");
  }
  var api = { render: render, filename: filename, highlight: highlight };
  root.CodingMarkdown = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
