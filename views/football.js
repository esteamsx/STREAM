<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ES TEAMS TV</title>
    <script nonce="__CSP_NONCE__">(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <script nonce="__CSP_NONCE__" src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js" integrity="sha384-w6Gb3fXHb5e1LUYa/hYA5Q41bEDglN5ZPCG7Jvnoo8/X90oGnlPqBlBJCe38mEMm" crossorigin="anonymous"></script>
    <style>
        :root{
          --red:#FF3B5C;--red-dim:#8f1530;--accent:#00E0FF;--accent2:#7c5cff;
          --dark:#0A0A0F;--dark2:#0F0F16;--dark3:#13131C;
          --card:#15151F;--card2:#1B1B27;
          --border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);
          --text:#F3F3FA;--muted:rgba(255,255,255,.42);--muted2:rgba(255,255,255,.22);
          --nav-bg:rgba(10,10,15,.98);
          --amber:#f59e0b;--nav-h:58px;
          --font-display:'Space Grotesk',Inter,-apple-system,sans-serif;
          --font-body:'Inter',-apple-system,sans-serif;
          --font-mono:'JetBrains Mono',ui-monospace,monospace;
          --ease:cubic-bezier(.22,1,.36,1);
        }
        :root[data-theme="light"]{
          --dark:#F5F6FA;--dark2:#FFFFFF;--dark3:#ECEEF3;
          --card:#FFFFFF;--card2:#F0F1F5;
          --border:rgba(0,0,0,.08);--border-strong:rgba(0,0,0,.14);
          --text:#14141C;--muted:rgba(20,20,28,.55);--muted2:rgba(20,20,28,.3);
          --nav-bg:rgba(255,255,255,.92);
        }
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:3px}::-webkit-scrollbar-thumb:hover{background:rgba(0,224,255,.4)}
        :focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
            font-family: var(--font-body);
            background: var(--dark);
            color: var(--text);
            padding: 0;
            min-height: 100vh;
            overflow-x: clip;
            background-image:
                radial-gradient(900px 500px at 15% -10%,rgba(0,224,255,.06),transparent 60%),
                radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.04),transparent 55%);
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: calc(var(--nav-h) + 12px) 14px 24px;
        }

        .cx-nav {
            position: fixed;
            top:0; left:0; right:0;
            z-index:100;
            display:flex;
            align-items:center;
            gap:14px;
            padding:0 18px;
            height:58px;
            background:var(--nav-bg);
            border-bottom:1px solid var(--border);
            backdrop-filter:blur(20px);
        }
        .fb-back{
            display:flex;align-items:center;gap:6px;color:var(--muted);text-decoration:none;
            font-size:.85rem;font-weight:600;background:transparent;border:none;cursor:pointer;
            font-family:inherit;padding:0;flex-shrink:0;transition:color .2s var(--ease);
        }
        .fb-back:hover{color:var(--accent)}
        .fb-back:active{opacity:.7}
        .fb-back svg{width:18px;height:18px}
        .fb-title{font-family:var(--font-display);font-weight:700;font-size:.95rem}

        .category-tabs {
            display:flex;
            gap:8px;
            margin:8px 0 16px;
            overflow-x:auto;
            padding:2px 0 4px;
            scrollbar-width:none;
        }
        .category-tabs::-webkit-scrollbar { display:none; }
        .cat-tab {
            flex-shrink:0;
            background:var(--card);
            border:1px solid var(--border);
            color:var(--muted);
            padding:8px 18px;
            border-radius:20px;
            font-size:0.8rem;
            font-weight:700;
            cursor:pointer;
            transition:all 0.2s;
        }
        .cat-tab.active {
            background:var(--accent);
            border-color:var(--accent);
            color:#fff;
        }
        .cat-tab:hover { border-color:var(--accent); }

        .player-sticky {
            position:sticky;
            top:var(--nav-h);
            z-index:10;
            background:var(--dark);
            padding:8px 0 6px;
            border-bottom:1px solid var(--border);
            margin-bottom:12px;
            display:none;
        }
        .player-head {
            display:flex;
            align-items:center;
            gap:12px;
            margin-bottom:6px;
        }
        .player-head .back {
            width:38px; height:38px;
            border-radius:50%;
            background:var(--card);
            border:1px solid var(--border);
            color:#fff;
            display:flex;
            align-items:center;
            justify-content:center;
            cursor:pointer;
            flex-shrink:0;
        }
        .player-head .title {
            font-weight:800;
            font-size:1rem;
            line-height:1.2;
        }
        .player-head .sub {
            color:var(--accent);
            font-size:0.7rem;
            font-weight:600;
        }
        .player-head .live-badge {
            margin-left:auto;
            background:var(--red);
            color:#fff;
            font-size:0.6rem;
            font-weight:800;
            letter-spacing:0.08em;
            padding:4px 10px;
            border-radius:20px;
            display:flex;
            align-items:center;
            gap:5px;
        }
        .player-head .live-badge::before {
            content:"";
            width:7px; height:7px;
            border-radius:50%;
            background:#fff;
            animation:pulse-dot 1.3s infinite;
        }
        @keyframes pulse-dot { 50%{opacity:.3} }

        .stage {
            position:relative;
            width:100%;
            aspect-ratio:16/9;
            background:#000;
            border-radius:16px;
            overflow:hidden;
            border:1px solid var(--border);
        }
        #videoPlayer {
            width:100%; height:100%;
            object-fit:contain;
            background:#000;
        }

        .wa-btn{
            position:absolute;bottom:58px;right:14px;z-index:10;
            display:inline-flex;align-items:center;gap:8px;
            background:linear-gradient(135deg,#2bdb74,#1fa855);color:#fff;text-decoration:none;
            font-size:.74rem;font-weight:700;padding:9px 14px;border-radius:40px;
            box-shadow:0 4px 20px rgba(37,211,102,.35);transition:transform .22s var(--ease),box-shadow .22s var(--ease);
        }
        .wa-btn:hover{transform:scale(1.06) translateY(-1px);box-shadow:0 8px 28px rgba(37,211,102,.5)}
        .wa-btn:active{transform:scale(.96)}
        .wa-drag-hint{font-size:.82rem;opacity:.55;margin-left:2px;line-height:1;transition:opacity .2s}
        .wa-btn:hover .wa-drag-hint{opacity:.9}
        .wa-btn.dragging{opacity:.85;cursor:grabbing!important;transform:scale(1.04)!important;transition:none!important;box-shadow:0 12px 36px rgba(37,211,102,.55)!important}

        .countdown-overlay {
            position:absolute;
            inset:0;
            display:none;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            gap:12px;
            z-index:7;
            background:rgba(0,0,0,0.85);
            color:#fff;
            text-align:center;
            padding:20px;
        }
        .countdown-overlay.active { display:flex; }
        .countdown-overlay .cd-label {
            font-size:0.8rem;
            color:var(--muted);
            text-transform:uppercase;
            letter-spacing:0.1em;
        }
        .countdown-overlay .cd-time {
            font-size:3.2rem;
            font-weight:800;
            color:var(--amber);
            font-variant-numeric:tabular-nums;
            letter-spacing:0.05em;
        }
        .countdown-overlay .cd-match {
            font-size:1rem;
            font-weight:700;
            margin-top:4px;
        }
        .countdown-overlay .cd-kickoff {
            font-size:0.75rem;
            color:var(--muted2);
        }

        .idle-overlay {
            position:absolute;
            inset:0;
            display:none;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            gap:12px;
            z-index:5;
            background:rgba(0,0,0,0.7);
            cursor:pointer;
        }
        .idle-overlay.active { display:flex; }
        .idle-overlay .big-play {
            width:66px; height:66px;
            border-radius:50%;
            background:rgba(29,108,245,0.92);
            display:flex;
            align-items:center;
            justify-content:center;
            box-shadow:0 8px 24px rgba(0,0,0,0.5);
        }
        .idle-overlay .tap-text {
            color:var(--accent);
            font-weight:700;
            font-size:0.9rem;
        }

        .load-overlay, .err-overlay {
            position:absolute;
            inset:0;
            display:none;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            gap:10px;
            z-index:6;
            background:rgba(0,0,0,0.6);
            color:#fff;
            text-align:center;
            padding:20px;
        }
        .load-overlay.active, .err-overlay.active { display:flex; }
        .spinner {
            width:40px; height:40px;
            border-radius:50%;
            border:3px solid rgba(255,255,255,0.15);
            border-top-color:var(--accent);
            animation:spin 0.8s linear infinite;
        }
        @keyframes spin { to{transform:rotate(360deg)} }
        .err-retry {
            background:var(--accent);
            border:none;
            color:#fff;
            font-weight:700;
            padding:9px 22px;
            border-radius:24px;
            cursor:pointer;
        }

        .controls {
            position:absolute;
            bottom:0; left:0; right:0;
            z-index:4;
            display:flex;
            align-items:center;
            gap:12px;
            padding:14px 12px 8px;
            background:linear-gradient(to top, rgba(0,0,0,0.8), transparent);
        }
        .controls button {
            background:none;
            border:none;
            color:#fff;
            cursor:pointer;
            display:flex;
            align-items:center;
            padding:3px;
        }
        .controls .mini-info {
            font-size:0.7rem;
            color:rgba(255,255,255,0.85);
            font-weight:600;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
            max-width:30vw;
        }
        .controls .spacer { flex:1; }

        .stream-options {
            display:flex;
            gap:8px;
            flex-wrap:wrap;
            margin:10px 0 4px;
        }
        .stream-options .chip {
            background:var(--card);
            border:1px solid var(--border);
            color:#fff;
            font-size:0.75rem;
            font-weight:700;
            padding:6px 14px;
            border-radius:20px;
            cursor:pointer;
        }
        .stream-options .chip.active {
            background:var(--accent);
            border-color:var(--accent);
        }
        .stream-options .chip:disabled {
            opacity:0.4;
            cursor:not-allowed;
        }

        .match-details {
            display:flex;
            justify-content:space-between;
            align-items:center;
            padding:10px 0;
            border-bottom:1px solid var(--border);
            margin-bottom:8px;
        }
        .match-details .teams {
            display:flex;
            align-items:center;
            gap:10px;
        }
        .match-details .teams img {
            width:32px; height:32px;
            object-fit:contain;
            border-radius:50%;
            background:var(--border);
            padding:3px;
        }
        .match-details .teams .vs {
            font-weight:800;
            color:var(--muted2);
            font-size:0.8rem;
        }
        .match-details .time {
            font-size:0.75rem;
            color:var(--muted);
        }

        .match-detail {
            background:var(--card);
            border-radius:16px;
            border:1px solid var(--border);
            padding:20px;
            margin:12px 0 20px;
            display:none;
        }
        .match-detail .header {
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:12px;
        }
        .match-detail .header .league {
            font-size:0.7rem;
            color:var(--muted);
        }
        .match-detail .header .close {
            background:none;
            border:none;
            color:var(--muted2);
            font-size:1.2rem;
            cursor:pointer;
        }
        .match-detail .scoreboard {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
        }
        .match-detail .scoreboard .team {
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:4px;
            flex:1;
        }
        .match-detail .scoreboard .team img {
            width:48px; height:48px;
            object-fit:contain;
            border-radius:50%;
            background:var(--border);
            padding:4px;
        }
        .match-detail .scoreboard .team .name {
            font-weight:700;
            font-size:1rem;
            text-align:center;
        }
        .match-detail .scoreboard .score {
            font-size:2rem;
            font-weight:800;
            color:var(--text);
            text-align:center;
        }
        .match-detail .scoreboard .status {
            font-size:0.7rem;
            color:var(--muted);
            margin-top:4px;
            text-align:center;
        }
        .match-detail .info-row {
            display:flex;
            justify-content:center;
            gap:16px;
            margin-top:12px;
            padding-top:12px;
            border-top:1px solid var(--border);
        }
        .match-detail .info-row span {
            font-size:0.75rem;
            color:var(--muted2);
        }
        .match-detail .lineups {
            margin-top:12px;
            padding:12px;
            background:var(--dark);
            border-radius:10px;
            border:1px solid var(--border);
        }
        .match-detail .lineups .label {
            font-size:0.7rem;
            color:var(--muted2);
            text-transform:uppercase;
            letter-spacing:0.05em;
            margin-bottom:6px;
        }
        .match-detail .lineups .teams {
            display:flex;
            gap:20px;
            flex-wrap:wrap;
        }
        .match-detail .lineups .teams div {
            flex:1;
            min-width:100px;
        }
        .match-detail .lineups .teams .team-name {
            font-weight:600;
            font-size:0.8rem;
        }
        .match-detail .lineups .teams .players {
            font-size:0.7rem;
            color:var(--muted);
        }
        .match-detail .watch-btn {
            width:100%;
            margin-top:12px;
            padding:10px;
            background:var(--accent);
            border:none;
            border-radius:10px;
            color:#fff;
            font-weight:700;
            font-size:0.9rem;
            cursor:pointer;
        }
        .match-detail .watch-btn:hover { background:var(--accent2); }

        .featured-card {
            background:var(--card);
            border-radius:16px;
            padding:20px;
            border:1px solid var(--border);
            cursor:pointer;
            margin-bottom:20px;
            transition:all 0.15s;
            border-left:4px solid var(--red);
        }
        .featured-card:active { transform:scale(0.98); }
        .featured-card .top {
            display:flex;
            justify-content:space-between;
            font-size:0.7rem;
            color:var(--muted);
            margin-bottom:10px;
        }
        .featured-card .top .status {
            font-weight:700;
            text-transform:uppercase;
            color:var(--red);
        }
        .featured-card .teams {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
        }
        .featured-card .teams .team {
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:6px;
            flex:1;
        }
        .featured-card .teams .team img {
            width:56px; height:56px;
            object-fit:contain;
            border-radius:50%;
            background:var(--border);
            padding:4px;
        }
        .featured-card .teams .team .name {
            font-size:1rem;
            font-weight:700;
            text-align:center;
        }
        .featured-card .score {
            font-size:2rem;
            font-weight:800;
            min-width:50px;
            text-align:center;
            color:var(--text);
        }
        .featured-card .footer {
            display:flex;
            justify-content:space-between;
            font-size:0.7rem;
            color:var(--muted2);
            margin-top:12px;
            border-top:1px solid var(--border);
            padding-top:10px;
        }
        .featured-card .footer .round { color:var(--muted); }
        .featured-card .footer .has-stream { color:var(--accent); }

        .match-grid {
            display:grid;
            grid-template-columns:repeat(auto-fill, minmax(180px,1fr));
            gap:14px;
            margin-top:14px;
        }
        .match-card {
            background:var(--card);
            border-radius:14px;
            padding:14px;
            border:1px solid var(--border);
            cursor:pointer;
            transition:all 0.15s;
        }
        .match-card:active { transform:scale(0.97); }
        .match-card.live { border-left:4px solid var(--red); }
        .match-card.upcoming { border-left:4px solid var(--amber); }
        .match-card.finished { opacity:0.6; border-left:4px solid var(--muted2); }
        .match-card .top {
            display:flex;
            justify-content:space-between;
            font-size:0.6rem;
            color:var(--muted);
            margin-bottom:6px;
        }
        .match-card .top .status {
            font-weight:700;
            text-transform:uppercase;
        }
        .match-card .teams {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:4px;
            margin:6px 0;
        }
        .match-card .teams .team {
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:3px;
            flex:1;
        }
        .match-card .teams .team img {
            width:32px; height:32px;
            object-fit:contain;
            border-radius:50%;
            background:var(--border);
            padding:3px;
        }
        .match-card .teams .team .name {
            font-size:0.7rem;
            font-weight:600;
            text-align:center;
            line-height:1.2;
        }
        .match-card .score {
            font-size:1.2rem;
            font-weight:800;
            min-width:30px;
            text-align:center;
            color:var(--text);
        }
        .match-card .footer {
            display:flex;
            justify-content:space-between;
            font-size:0.6rem;
            color:var(--muted2);
            margin-top:6px;
            border-top:1px solid var(--border);
            padding-top:6px;
        }
        .match-card .footer .round { color:var(--muted); }
        .match-card .footer .has-stream { color:var(--accent); }

        .highlights-container {
            display:none;
            margin-top:16px;
        }
        .highlights-list {
            display:grid;
            grid-template-columns:1fr;
            gap:14px;
        }
        .highlight-card {
            background:var(--card);
            border-radius:12px;
            padding:16px;
            border:1px solid var(--border);
            cursor:pointer;
            transition:0.15s;
            display:flex;
            gap:14px;
            align-items:center;
        }
        .highlight-card:hover { border-color:var(--accent); }
        .highlight-card .thumb {
            width:120px;
            height:68px;
            background:var(--dark);
            border-radius:8px;
            flex-shrink:0;
            display:flex;
            align-items:center;
            justify-content:center;
            overflow:hidden;
        }
        .highlight-card .thumb video {
            width:100%; height:100%;
            object-fit:cover;
        }
        .highlight-card .info { flex:1; }
        .highlight-card .info .title {
            font-weight:600;
            font-size:0.85rem;
            line-height:1.3;
        }
        .highlight-card .info .match {
            font-size:0.7rem;
            color:var(--muted);
            margin-top:4px;
        }
        .highlight-card .info .date {
            font-size:0.6rem;
            color:var(--muted2);
            margin-top:4px;
        }
        @media (max-width:480px) {
            .match-grid { grid-template-columns:repeat(auto-fill, minmax(150px,1fr)); }
            .match-card .teams .team img { width:28px; height:28px; }
            .match-card .score { font-size:1rem; }
            .featured-card .teams .team img { width:44px; height:44px; }
            .featured-card .score { font-size:1.6rem; }
            .countdown-overlay .cd-time { font-size:2.4rem; }
            .highlight-card .thumb { width:80px; height:48px; }
            .match-detail .scoreboard .score { font-size:1.6rem; }
            .match-detail .scoreboard .team img { width:36px; height:36px; }
        }

        .section-label {
            font-size:0.7rem;
            font-weight:800;
            letter-spacing:0.1em;
            text-transform:uppercase;
            color:var(--muted2);
            margin:18px 2px 10px;
        }
    </style>
</head>
<body>

<!-- TOP NAV -->
<nav class="cx-nav">
    <button class="fb-back" id="fbBackBtn" aria-label="Back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
        Back
    </button>
    <div class="fb-title">⚽ Football Live</div>
</nav>

<div class="container">
    <!-- CATEGORY TABS -->
    <div class="category-tabs" id="categoryTabs">
        <button class="cat-tab active" data-category="all">All</button>
        <button class="cat-tab" data-category="live"><svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>Live</button>
        <button class="cat-tab" data-category="upcoming"><svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3" stroke-linecap="round"/></svg>Upcoming</button>
        <button class="cat-tab" data-category="finished"><svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>Finished</button>
        <button class="cat-tab" data-category="highlights"><svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 4v16M16 4v16M2 9h20M2 15h20" stroke-linecap="round"/></svg>Highlights</button>
    </div>

    <!-- STICKY PLAYER -->
    <div class="player-sticky" id="playerSticky">
        <div class="player-head">
            <button class="back" id="playerBackBtn">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div>
                <div class="title" id="matchTitle">Match</div>
                <div class="sub" id="matchSub">Select a match</div>
            </div>
            <span class="live-badge" id="liveBadge">LIVE</span>
        </div>

        <div class="stage" id="stage">
            <video id="videoPlayer" playsinline webkit-playsinline x5-playsinline></video>

            <!-- COUNTDOWN OVERLAY -->
            <div class="countdown-overlay" id="countdownOverlay">
                <div class="cd-label">Kicks off in</div>
                <div class="cd-time" id="cdTime">--:--:--</div>
                <div class="cd-match" id="cdMatch">Match</div>
                <div class="cd-kickoff" id="cdKickoff">Kick-off · Today 10:00 PM</div>
            </div>

            <!-- IDLE OVERLAY -->
            <div class="idle-overlay" id="idleOverlay">
                <div class="big-play"><svg width="28" height="28" fill="#fff" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
                <div class="tap-text">Tap to play</div>
            </div>

            <!-- LOADING -->
            <div class="load-overlay" id="loadOverlay">
                <div class="spinner"></div>
                <p>Connecting…</p>
            </div>

            <!-- ERROR -->
            <div class="err-overlay" id="errOverlay">
                <p style="font-weight:700;">Stream unavailable</p>
                <p id="errMsg" style="font-size:0.8rem;color:rgba(255,255,255,0.55);">The stream isn't responding.</p>
                <button class="err-retry" id="errRetryBtn">Retry</button>
            </div>

            <!-- WHATSAPP -->
            <a class="wa-btn" id="waBtn" href="https://whatsapp.com/channel/0029VatAyCwFy72JdZXFPm29" target="_blank" rel="noopener" title="Hold &amp; drag to reposition">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                </svg>
                WhatsApp
                <span class="wa-drag-hint">⠿</span>
            </a>

            <!-- CONTROLS -->
            <div class="controls" id="controls">
                <button id="btnTogglePlay">
                    <svg id="icPlay" width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <svg id="icPause" width="22" height="22" fill="currentColor" viewBox="0 0 24 24" style="display:none;"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>
                </button>
                <button id="btnToggleMute">
                    <svg id="icVol" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                    <svg id="icMute" width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style="display:none;"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73z"/></svg>
                </button>
                <span class="mini-info" id="miniInfo"></span>
                <span class="spacer"></span>
                <button id="btnFullscreen" title="Fullscreen">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
                </button>
            </div>
        </div>

        <!-- Stream selector -->
        <div class="stream-options" id="streamOptions"></div>

        <!-- Match details below player -->
        <div class="match-details" id="matchDetails">
            <div class="teams" id="teamsDisplay">
                <img id="homeLogo" src="" alt="">
                <span class="vs">VS</span>
                <img id="awayLogo" src="" alt="">
            </div>
            <div class="time" id="matchTime"></div>
        </div>
    </div>

    <!-- MATCH DETAIL VIEW -->
    <div class="match-detail" id="matchDetail">
        <div class="header">
            <span class="league" id="detailLeague">League</span>
            <button class="close" id="detailCloseBtn">✕</button>
        </div>
        <div class="scoreboard">
            <div class="team">
                <img id="detailHomeLogo" src="">
                <span class="name" id="detailHomeName">Home</span>
            </div>
            <div>
                <div class="score" id="detailScore">0 - 0</div>
                <div class="status" id="detailStatus">status</div>
            </div>
            <div class="team">
                <img id="detailAwayLogo" src="">
                <span class="name" id="detailAwayName">Away</span>
            </div>
        </div>
        <div class="info-row">
            <span id="detailRound">Round</span>
            <span id="detailTime">Time</span>
        </div>
        <div class="lineups">
            <div class="label">Lineups</div>
            <div class="teams">
                <div>
                    <div class="team-name" id="detailHomeLineup">Home lineup</div>
                    <div class="players">Coming soon</div>
                </div>
                <div>
                    <div class="team-name" id="detailAwayLineup">Away lineup</div>
                    <div class="players">Coming soon</div>
                </div>
            </div>
        </div>
        <button class="watch-btn" id="watchStreamBtn">▶ Watch Stream</button>
    </div>

    <!-- FEATURED CARD -->
    <div id="featuredContainer"></div>

    <!-- MATCH GRID -->
    <div class="section-label" id="gridLabel">All Matches</div>
    <div class="match-grid" id="matchGrid">
        <div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--muted2);">Loading matches...</div>
    </div>

    <!-- HIGHLIGHTS -->
    <div class="highlights-container" id="highlightsContainer">
        <div class="section-label">Highlights</div>
        <div class="highlights-list" id="highlightsList"></div>
    </div>
</div>

<script nonce="__CSP_NONCE__">
    const API_URL = 'https://sportstreamer.live/api/matches';
    const HIGHLIGHTS_URL = 'https://sportstreamer.live/api/highlights';
    let allMatches = [];
    let currentMatch = null;
    let hlsInstance = null;
    let countdownInterval = null;
    let currentStreams = [];
    let currentStreamIndex = 0;
    let currentCategory = 'all';

    const grid = document.getElementById('matchGrid');
    const featuredContainer = document.getElementById('featuredContainer');
    const playerSticky = document.getElementById('playerSticky');
    const video = document.getElementById('videoPlayer');
    const idleOverlay = document.getElementById('idleOverlay');
    const countdownOverlay = document.getElementById('countdownOverlay');
    const cdTime = document.getElementById('cdTime');
    const cdMatch = document.getElementById('cdMatch');
    const cdKickoff = document.getElementById('cdKickoff');
    const loadOverlay = document.getElementById('loadOverlay');
    const errOverlay = document.getElementById('errOverlay');
    const errMsg = document.getElementById('errMsg');
    const matchTitle = document.getElementById('matchTitle');
    const matchSub = document.getElementById('matchSub');
    const liveBadge = document.getElementById('liveBadge');
    const homeLogo = document.getElementById('homeLogo');
    const awayLogo = document.getElementById('awayLogo');
    const matchTime = document.getElementById('matchTime');
    const streamOptions = document.getElementById('streamOptions');
    const miniInfo = document.getElementById('miniInfo');
    const highlightsContainer = document.getElementById('highlightsContainer');
    const highlightsList = document.getElementById('highlightsList');
    const gridLabel = document.getElementById('gridLabel');

    async function fetchMatches() {
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            return data;
        } catch (e) {
            console.error('Fetch error:', e);
            return null;
        }
    }

    async function fetchHighlights() {
        try {
            const res = await fetch(HIGHLIGHTS_URL);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            return data.highlights || [];
        } catch (e) {
            console.error('Highlights error:', e);
            return [];
        }
    }

    function renderHighlights(highlights) {
        if (!highlights.length) {
            highlightsList.innerHTML = `<div style="color:var(--muted2); text-align:center; padding:20px;">No highlights available.</div>`;
            highlightsContainer.style.display = 'block';
            return;
        }
        let html = '';
        highlights.forEach(h => {
            html += `
                <div class="highlight-card" data-url="${h.url}">
                    <div class="thumb">
                        <video src="${h.url}" muted preload="metadata"></video>
                    </div>
                    <div class="info">
                        <div class="title">${h.title || 'Highlight'}</div>
                        <div class="match">${h.matchTitle || ''}</div>
                        <div class="date">${new Date(h.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
            `;
        });
        highlightsList.innerHTML = html;
        highlightsContainer.style.display = 'block';
    }

    function playHighlight(url) {
        document.getElementById('playerSticky').style.display = 'block';
        idleOverlay.classList.remove('active');
        countdownOverlay.classList.remove('active');
        video.src = url;
        video.play().catch(() => {});
        matchTitle.textContent = 'Highlight';
        matchSub.textContent = 'Replay';
        liveBadge.textContent = 'HIGHLIGHT';
        liveBadge.style.background = 'var(--accent2)';
        streamOptions.innerHTML = '';
        miniInfo.textContent = 'Highlight';
        document.getElementById('playerSticky').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function switchCategory(category) {
        currentCategory = category;
        document.querySelectorAll('.cat-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        highlightsContainer.style.display = 'none';
        document.getElementById('matchDetail').style.display = 'none';
        gridLabel.style.display = 'block';

        if (category === 'highlights') {
            grid.style.display = 'none';
            featuredContainer.style.display = 'none';
            gridLabel.style.display = 'none';
            fetchHighlights().then(renderHighlights);
            return;
        }

        grid.style.display = 'grid';
        featuredContainer.style.display = 'block';
        gridLabel.textContent = category === 'all' ? 'All Matches' : 
                                category === 'live' ? 'Live Matches' :
                                category === 'upcoming' ? 'Upcoming Matches' :
                                'Finished Matches';

        const filtered = allMatches.filter(m => {
            if (category === 'all') return true;
            return m.status === category;
        });
        renderFilteredMatches(filtered);
    }

    function renderFilteredMatches(matches) {
        if (!matches.length) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--muted2);">No matches in this category.</div>`;
            return;
        }
        let html = '';
        matches.forEach(m => {
            const status = m.status || 'upcoming';
            const hasStream = !!(m.proxyStreamUrl || m.streamUrl || (m.alternateStreams && m.alternateStreams.length));
            const homeLogo = m.homeTeamLogo || '';
            const awayLogo = m.awayTeamLogo || '';
            const homeScore = m.homeScore ?? '-';
            const awayScore = m.awayScore ?? '-';
            const time = m.startTime ? new Date(m.startTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
            html += `
                <div class="match-card ${status}" data-match-id="${m.id}">
                    <div class="top">
                        <span>${m.league || ''}</span>
                        <span class="status">${status}</span>
                    </div>
                    <div class="teams">
                        <div class="team">
                            ${homeLogo ? `<img src="${homeLogo}" alt="${m.homeTeam}" loading="lazy">` : ''}
                            <span class="name">${m.homeTeam || '?'}</span>
                        </div>
                        <div class="score">${homeScore} - ${awayScore}</div>
                        <div class="team">
                            ${awayLogo ? `<img src="${awayLogo}" alt="${m.awayTeam}" loading="lazy">` : ''}
                            <span class="name">${m.awayTeam || '?'}</span>
                        </div>
                    </div>
                    <div class="footer">
                        <span class="round">${m.matchRound || ''}</span>
                        <span>${time}</span>
                        ${hasStream ? '<span class="has-stream">▶</span>' : ''}
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    }

    function renderMatches(data) {
        if (!data || !data.matches || data.matches.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted2);">No matches found.</div>`;
            featuredContainer.innerHTML = '';
            return;
        }
        allMatches = data.matches;

        const liveMatches = allMatches.filter(m => m.status === 'live');
        const upcomingMatches = allMatches.filter(m => m.status === 'upcoming');
        const featuredMatch = liveMatches.length > 0 ? liveMatches[0] : (upcomingMatches.length > 0 ? upcomingMatches[0] : null);

        if (featuredMatch) {
            const m = featuredMatch;
            const status = m.status || 'upcoming';
            const hasStream = !!(m.proxyStreamUrl || m.streamUrl || (m.alternateStreams && m.alternateStreams.length));
            const homeLogo = m.homeTeamLogo || '';
            const awayLogo = m.awayTeamLogo || '';
            const homeScore = m.homeScore ?? '-';
            const awayScore = m.awayScore ?? '-';
            const time = m.startTime ? new Date(m.startTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
            const statusLabel = status === 'live' ? 'LIVE' : status === 'upcoming' ? 'UPCOMING' : 'FINISHED';
            const statusColor = status === 'live' ? 'var(--red)' : status === 'upcoming' ? 'var(--amber)' : 'var(--muted2)';

            featuredContainer.innerHTML = `
                <div class="featured-card" data-match-id="${m.id}">
                    <div class="top">
                        <span>${m.league || ''}</span>
                        <span class="status" style="color:${statusColor}">${statusLabel}</span>
                    </div>
                    <div class="teams">
                        <div class="team">
                            ${homeLogo ? `<img src="${homeLogo}" alt="${m.homeTeam}">` : ''}
                            <span class="name">${m.homeTeam || '?'}</span>
                        </div>
                        <div class="score">${homeScore} - ${awayScore}</div>
                        <div class="team">
                            ${awayLogo ? `<img src="${awayLogo}" alt="${m.awayTeam}">` : ''}
                            <span class="name">${m.awayTeam || '?'}</span>
                        </div>
                    </div>
                    <div class="footer">
                        <span class="round">${m.matchRound || ''}</span>
                        <span>${time}</span>
                        ${hasStream ? '<span class="has-stream">▶ Stream available</span>' : ''}
                    </div>
                </div>
            `;
        } else {
            featuredContainer.innerHTML = '';
        }

        if (currentCategory === 'highlights') {
            switchCategory('highlights');
        } else {
            const filtered = allMatches.filter(m => {
                if (currentCategory === 'all') return true;
                return m.status === currentCategory;
            });
            renderFilteredMatches(filtered);
        }
    }

    function openMatchDetail(matchId) {
        const match = allMatches.find(m => m.id === matchId);
        if (!match) return;
        const detail = document.getElementById('matchDetail');
        detail.style.display = 'block';
        document.getElementById('detailLeague').textContent = match.league || 'Unknown';
        document.getElementById('detailHomeLogo').src = match.homeTeamLogo || '';
        document.getElementById('detailHomeName').textContent = match.homeTeam || '?';
        document.getElementById('detailAwayLogo').src = match.awayTeamLogo || '';
        document.getElementById('detailAwayName').textContent = match.awayTeam || '?';
        document.getElementById('detailScore').textContent = `${match.homeScore ?? '-'} - ${match.awayScore ?? '-'}`;
        document.getElementById('detailStatus').textContent = match.status || 'Unknown';
        document.getElementById('detailRound').textContent = match.matchRound || '';
        document.getElementById('detailTime').textContent = match.startTime ? new Date(match.startTime).toLocaleString() : '';
        document.getElementById('detailHomeLineup').textContent = match.homeTeam + ' lineup';
        document.getElementById('detailAwayLineup').textContent = match.awayTeam + ' lineup';
        detail.dataset.matchId = matchId;
        detail.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function playMatchFromDetail() {
        const detail = document.getElementById('matchDetail');
        const matchId = detail.dataset.matchId;
        if (matchId) {
            openMatch(matchId);
        }
    }

    function closeDetail() {
        document.getElementById('matchDetail').style.display = 'none';
    }

    function openMatch(matchId) {
        const match = allMatches.find(m => m.id === matchId);
        if (!match) return;
        currentMatch = match;

        const streams = [];
        if (match.proxyStreamUrl) streams.push({ label: 'Main (HD)', url: match.proxyStreamUrl });
        if (match.streamUrl) streams.push({ label: 'Stream 2', url: match.streamUrl });
        if (match.alternateStreams && match.alternateStreams.length) {
            match.alternateStreams.forEach((s, i) => {
                streams.push({ label: s.title || `Stream ${i+3}`, url: s.url });
            });
        }
        currentStreams = streams;
        currentStreamIndex = 0;

        playerSticky.style.display = 'block';
        matchTitle.textContent = `${match.homeTeam} vs ${match.awayTeam}`;
        matchSub.textContent = match.league || '';
        liveBadge.textContent = match.status === 'live' ? 'LIVE' : match.status === 'upcoming' ? 'UPCOMING' : 'FINISHED';
        liveBadge.style.background = match.status === 'live' ? 'var(--red)' : match.status === 'upcoming' ? 'var(--amber)' : 'var(--muted2)';

        homeLogo.src = match.homeTeamLogo || '';
        homeLogo.alt = match.homeTeam;
        awayLogo.src = match.awayTeamLogo || '';
        awayLogo.alt = match.awayTeam;
        matchTime.textContent = match.startTime ? new Date(match.startTime).toLocaleString() : '';

        streamOptions.innerHTML = '';
        streams.forEach((s, i) => {
            const chip = document.createElement('span');
            chip.className = `chip ${i===0?'active':''}`;
            chip.textContent = s.label;
            chip.onclick = () => selectStream(i);
            streamOptions.appendChild(chip);
        });

        const now = new Date();
        const startTime = match.startTime ? new Date(match.startTime) : null;

        if (startTime && startTime > now) {
            countdownOverlay.classList.add('active');
            idleOverlay.classList.remove('active');
            loadOverlay.classList.remove('active');
            errOverlay.classList.remove('active');
            cdMatch.textContent = `${match.homeTeam} vs ${match.awayTeam}`;
            cdKickoff.textContent = `Kick-off · ${startTime.toLocaleString()}`;
            startCountdown(startTime);
            document.querySelectorAll('.stream-options .chip').forEach(c => c.disabled = true);
        } else {
            countdownOverlay.classList.remove('active');
            if (countdownInterval) clearInterval(countdownInterval);
            idleOverlay.classList.add('active');
            document.querySelectorAll('.stream-options .chip').forEach(c => c.disabled = false);
            if (match.status === 'live' && streams.length) {
                setTimeout(() => playStream(streams[0].url), 500);
            }
        }

        miniInfo.textContent = match.homeTeam + ' vs ' + match.awayTeam;
        document.getElementById('playerSticky').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function playStream(url) {
        if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
        video.pause();
        video.src = '';
        loadOverlay.classList.remove('active');
        errOverlay.classList.remove('active');
        idleOverlay.classList.remove('active');
        countdownOverlay.classList.remove('active');

        if (!url) {
            errOverlay.classList.add('active');
            errMsg.textContent = 'No stream URL available.';
            return;
        }

        if (url.includes('.m3u8') || url.includes('m3u8')) {
            if (Hls.isSupported()) {
                loadOverlay.classList.add('active');
                hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: true });
                hlsInstance.loadSource(url);
                hlsInstance.attachMedia(video);
                hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                    loadOverlay.classList.remove('active');
                    video.play().catch(() => {});
                });
                hlsInstance.on(Hls.Events.ERROR, (e, data) => {
                    if (data.fatal) {
                        loadOverlay.classList.remove('active');
                        errOverlay.classList.add('active');
                        errMsg.textContent = 'Unable to load stream.';
                        hlsInstance.destroy();
                        hlsInstance = null;
                    }
                });
            } else {
                video.src = url;
                video.play().catch(() => {
                    errOverlay.classList.add('active');
                    errMsg.textContent = 'Your browser does not support HLS.';
                });
            }
        } else {
            video.src = url;
            video.play().catch(() => {
                errOverlay.classList.add('active');
                errMsg.textContent = 'Cannot play this stream.';
            });
        }
    }

    function selectStream(index) {
        if (index < 0 || index >= currentStreams.length) return;
        const chips = streamOptions.querySelectorAll('.chip');
        if (chips[0] && chips[0].disabled) return;
        currentStreamIndex = index;
        chips.forEach((c, i) => c.classList.toggle('active', i === index));
        playStream(currentStreams[index].url);
    }

    function startCountdown(startTime) {
        if (countdownInterval) clearInterval(countdownInterval);
        const target = new Date(startTime).getTime();
        countdownInterval = setInterval(() => {
            const now = Date.now();
            const diff = target - now;
            if (diff <= 0) {
                clearInterval(countdownInterval);
                countdownOverlay.classList.remove('active');
                idleOverlay.classList.add('active');
                document.querySelectorAll('.stream-options .chip').forEach(c => c.disabled = false);
                if (currentMatch && currentMatch.status === 'live' && currentStreams.length) {
                    playStream(currentStreams[0].url);
                }
                return;
            }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            cdTime.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }, 1000);
    }

    function togglePlay() {
        if (video.paused) { video.play(); } else { video.pause(); }
        updatePlayIcons();
    }
    function updatePlayIcons() {
        document.getElementById('icPlay').style.display = video.paused ? 'block' : 'none';
        document.getElementById('icPause').style.display = video.paused ? 'none' : 'block';
    }
    video.addEventListener('play', updatePlayIcons);
    video.addEventListener('pause', updatePlayIcons);

    function toggleMute() {
        video.muted = !video.muted;
        document.getElementById('icVol').style.display = video.muted ? 'none' : 'block';
        document.getElementById('icMute').style.display = video.muted ? 'block' : 'none';
    }

    function goFullscreen() {
        if (video.requestFullscreen) video.requestFullscreen();
        else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
    }

    function playVideo() {
        idleOverlay.classList.remove('active');
        if (currentMatch && currentStreams.length) {
            playStream(currentStreams[currentStreamIndex].url);
        }
    }

    function refreshStream() {
        if (currentStreams.length) {
            playStream(currentStreams[currentStreamIndex].url);
        }
    }

    function closePlayer() {
        playerSticky.style.display = 'none';
        if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
        video.pause();
        video.src = '';
        if (countdownInterval) clearInterval(countdownInterval);
        countdownOverlay.classList.remove('active');
        idleOverlay.classList.remove('active');
        loadOverlay.classList.remove('active');
        errOverlay.classList.remove('active');
    }

    document.querySelectorAll('.cat-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchCategory(this.dataset.category);
        });
    });

    document.getElementById('fbBackBtn').addEventListener('click', () => { location.href = '/'; });
    document.getElementById('playerBackBtn').addEventListener('click', closePlayer);
    idleOverlay.addEventListener('click', playVideo);
    document.getElementById('errRetryBtn').addEventListener('click', refreshStream);
    document.getElementById('btnTogglePlay').addEventListener('click', togglePlay);
    document.getElementById('btnToggleMute').addEventListener('click', toggleMute);
    document.getElementById('btnFullscreen').addEventListener('click', goFullscreen);
    document.getElementById('detailCloseBtn').addEventListener('click', closeDetail);
    document.getElementById('watchStreamBtn').addEventListener('click', playMatchFromDetail);

    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.match-card');
        if (card) openMatchDetail(card.dataset.matchId);
    });
    featuredContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.featured-card');
        if (card) openMatchDetail(card.dataset.matchId);
    });
    highlightsList.addEventListener('click', (e) => {
        const card = e.target.closest('.highlight-card');
        if (card) playHighlight(card.dataset.url);
    });

    async function refreshData() {
        const data = await fetchMatches();
        if (data) renderMatches(data);
    }

    (function(){
        var btn    = document.getElementById('waBtn');
        if (!btn) return;
        var parent = btn.parentElement; 
        var holdTimer = null;
        var dragging  = false;
        var startX, startY, btnStartX, btnStartY;

        function getPos(e){ return e.touches ? e.touches[0] : e; }

        function onDown(e){
            var p = getPos(e);
            startX = p.clientX; startY = p.clientY;
            var r = btn.getBoundingClientRect();
            btnStartX = r.left; btnStartY = r.top;
            holdTimer = setTimeout(function(){
                dragging = true;
                btn.classList.add('dragging');
                var pr = parent.getBoundingClientRect();
                btn.style.position = 'absolute';
                btn.style.right    = 'auto';
                btn.style.bottom   = 'auto';
                btn.style.left     = (btnStartX - pr.left) + 'px';
                btn.style.top      = (btnStartY - pr.top)  + 'px';
            }, 400);
        }

        function onMove(e){
            if(!dragging) return;
            e.preventDefault();
            var p  = getPos(e);
            var pr = parent.getBoundingClientRect();
            var nx = (btnStartX - pr.left) + (p.clientX - startX);
            var ny = (btnStartY - pr.top)  + (p.clientY - startY);
            nx = Math.max(4, Math.min(nx, pr.width  - btn.offsetWidth  - 4));
            ny = Math.max(4, Math.min(ny, pr.height - btn.offsetHeight - 4));
            btn.style.left = nx + 'px';
            btn.style.top  = ny + 'px';
        }

        function onUp(e){
            clearTimeout(holdTimer);
            if(dragging){
                dragging = false;
                btn.classList.remove('dragging');
                e.preventDefault();
            }
        }

        btn.addEventListener('mousedown',  onDown);
        btn.addEventListener('touchstart', onDown, {passive:true});
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, {passive:false});
        document.addEventListener('mouseup',   onUp);
        document.addEventListener('touchend',  onUp);
    })();

    refreshData();
    setInterval(refreshData, 30000);
</script>
</body>
</html>
    