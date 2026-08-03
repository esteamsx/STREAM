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
  var idx = 0;

  function load(i, autoplay){
    idx = (i + TRACKS.length) % TRACKS.length;
    audio.src = TRACKS[idx];
    if (autoplay) audio.play().catch(function(){});
  }
  load(0, false);

  function setPlayingUI(playing){
    playIcon.style.display = playing ? 'none' : 'block';
    pauseIcon.style.display = playing ? 'block' : 'none';
    btn.classList.toggle('playing', playing);
    btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  btn.addEventListener('click', function(){
    if (audio.paused) audio.play().catch(function(){});
    else audio.pause();
  });
  document.getElementById('mpRewind').addEventListener('click', function(){ load(idx - 1, true); });
  document.getElementById('mpForward').addEventListener('click', function(){ load(idx + 1, true); });
  audio.addEventListener('play', function(){ setPlayingUI(true); });
  audio.addEventListener('pause', function(){ setPlayingUI(false); });
  audio.addEventListener('ended', function(){ load(idx + 1, true); });
})();
`;
}
