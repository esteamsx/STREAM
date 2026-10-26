const BUILD = Date.now().toString(36);

/* The Movies page. It uses the same design tokens, glass look and fonts as the home page. The bottom navigation is not part of
   this file: like every other page that has it, it is added by /site-ui.js (see NAV_PATHS in middleware/promo-slot.js). */
export function renderMovies({ DOMAIN_LOCK_SCRIPT, siteHeadFor }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${DOMAIN_LOCK_SCRIPT || ""}
<script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${siteHeadFor("movies")}
<script nonce="__CSP_NONCE__" src="/interactive.js" defer></script>
<title>Movies | ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/movies/movies.css?v=${BUILD}">
</head>
<body>
<div class="aurora" aria-hidden="true"><div class="blob blob-1"></div><div class="blob blob-2"></div><div class="blob blob-3"></div></div>

<header class="mv-nav" id="mvNav">
  <a class="mv-logo" href="/" aria-label="ES TEAMS TV home"><img src="/icon-32.png" alt="" width="26" height="26"><span class="mv-logo-text">ES TEAMS TV</span><span class="mv-pill">MOVIES</span></a>
  <form class="mv-search" id="mvSearchForm" role="search" autocomplete="off">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
    <input class="mv-search-input" id="mvSearchInput" type="search" placeholder="Search movies and series" maxlength="60" spellcheck="false" aria-label="Search movies and series" enterkeyhint="search">
    <button class="mv-search-clear" id="mvSearchClear" type="button" aria-label="Clear search" hidden>&times;</button>
    <div class="mv-suggest" id="mvSuggest" role="listbox" aria-label="Suggestions"></div>
  </form>
  <button class="mv-icon-btn mv-search-toggle" id="mvSearchToggle" type="button" aria-label="Search"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></button>
</header>

<main class="mv-main" id="mvMain">
  <nav class="mv-tabs" id="mvTabs" aria-label="Browse">
    <button type="button" class="mv-tab on" data-tab="home">For You</button>
    <button type="button" class="mv-tab" data-tab="movies">Movies</button>
    <button type="button" class="mv-tab" data-tab="tv-series">TV Series</button>
    <button type="button" class="mv-tab" data-tab="animation">Animation</button>
  </nav>

  <section id="mvState" class="mv-state" hidden></section>
  <section id="mvHome" class="mv-view" aria-live="polite"></section>
  <section id="mvGrid" class="mv-view" hidden></section>
  <section id="mvDetail" class="mv-view" hidden></section>
</main>

<script nonce="__CSP_NONCE__" src="/movies/movies.js?v=${BUILD}" defer></script>
</body>
</html>`;
}
