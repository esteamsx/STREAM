const TRACKS = ["/music/track-1.mp3", "/music/track-2.mp3", "/music/track-3.mp3"];

export function musicPlayerStyle() {
  return `
.music-player{
  position:fixed;right:20px;bottom:20px;z-index:60;
  display:flex;align-items:center;gap:6px;
  background:var(--card);border:1px solid var(--border-strong);border-radius:30px;
  padding:6px;box-shadow:0 10px 30px rgba(0,0,0,.4);
}
.mp-btn{
  width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;color:var(--text);
  background:var(--card2);transition:background .18s var(--ease),transform .1s var(--ease);
}
.mp-btn:hover{background:var(--dark3)}
.mp-btn:active{transform:scale(.9)}
.mp-btn svg{width:15px;height:15px}
.mp-playpause{
  width:46px;height:46px;background:linear-gradient(90deg,var(--accent),var(--accent2));color:#04121a;
}
.mp-playpause:hover{opacity:.92}
.mp-playpause svg{width:18px;height:18px}
@keyframes mpSpin{to{transform:rotate(360deg)}}
.mp-playpause.playing svg{animation:mpSpin 2.4s linear infinite}
`;
}

export function musicPlayerHtml() {
  return `
<div class="music-player" id="musicPlayer">
  <audio id="mpAudio" preload="none"></audio>
  <button class="mp-btn" id="mpRewind" type="button" aria-label="Previous track">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
  </button>
  <button class="mp-btn mp-playpause" id="mpPlayPause" type="button" aria-label="Play">
    <svg id="mpPlayIcon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
    <svg id="mpPauseIcon" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>
  </button>
  <button class="mp-btn" id="mpForward" type="button" aria-label="Next track">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 6v12l8.5-6z"/></svg>
  </button>
</div>`;
}

export function musicPlayerScript() {
  return `
(function(){
  var TRACKS = ${JSON.stringify(TRACKS)};
  var audio = document.getElementById('mpAudio');
  var btn = document.getElementById('mpPlayPause');
  var playIcon = document.getElementById('mpPlayIcon');
  var pauseIcon = document.getElementById('mpPauseIcon');
  if (!audio || !btn) return;
  var STORE_KEY = 'mp_state';
  var idx = 0;
  var wantsPlaying = true;

  function writeState(){
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ idx: idx, time: audio.currentTime || 0, wantsPlaying: wantsPlaying }));
    } catch(e){}
  }

  function attemptPlay(){
    wantsPlaying = true;
    var p = audio.play();
    if (p && p.catch) p.catch(function(){
      var resume = function(){
        audio.play().catch(function(){});
      };
      document.addEventListener('click', resume, { once: true });
      document.addEventListener('keydown', resume, { once: true });
      document.addEventListener('touchstart', resume, { once: true });
    });
  }

  function pausePlayback(){
    wantsPlaying = false;
    audio.pause();
  }

  function load(i, autoplay, seekTime){
    idx = (i + TRACKS.length) % TRACKS.length;
    audio.src = TRACKS[idx];
    if (seekTime) {
      audio.addEventListener('loadedmetadata', function onMeta(){
        audio.currentTime = seekTime;
        audio.removeEventListener('loadedmetadata', onMeta);
      });
    }
    if (autoplay) attemptPlay();
  }

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'ES TEAMS TV',
      artist: 'esteamstv.devs.surf',
      artwork: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });
    navigator.mediaSession.setActionHandler('play', function(){ attemptPlay(); });
    navigator.mediaSession.setActionHandler('pause', function(){ pausePlayback(); });
    navigator.mediaSession.setActionHandler('previoustrack', function(){ load(idx - 1, true); writeState(); });
    navigator.mediaSession.setActionHandler('nexttrack', function(){ load(idx + 1, true); writeState(); });
  }

  var saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null'); } catch(e){}
  if (saved && typeof saved.idx === 'number') {
    wantsPlaying = saved.wantsPlaying !== false;
    load(saved.idx, wantsPlaying, saved.time);
  } else {
    load(0, true);
  }

  function setPlayingUI(playing){
    playIcon.style.display = playing ? 'none' : 'block';
    pauseIcon.style.display = playing ? 'block' : 'none';
    btn.classList.toggle('playing', playing);
    btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  btn.addEventListener('click', function(){
    if (audio.paused) attemptPlay();
    else pausePlayback();
  });
  document.getElementById('mpRewind').addEventListener('click', function(){ load(idx - 1, true); writeState(); });
  document.getElementById('mpForward').addEventListener('click', function(){ load(idx + 1, true); writeState(); });
  audio.addEventListener('play', function(){ setPlayingUI(true); writeState(); });
  audio.addEventListener('pause', function(){ setPlayingUI(false); writeState(); });
  audio.addEventListener('timeupdate', function(){ writeState(); });
  audio.addEventListener('ended', function(){ load(idx + 1, true); writeState(); });
  window.addEventListener('pagehide', function(){ writeState(); });
})();
`;
}
