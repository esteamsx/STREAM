(function(){
  function openSignInModal(nextPath){
    if (document.getElementById('estvGuestGateModal')) return;

    var style = document.createElement('style');
    style.id = 'estvGuestGateStyle';
    style.textContent =
      '#estvGuestGateModal{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(5,5,10,.72);backdrop-filter:blur(6px)}' +
      '#estvGuestGateModal .ggCard{position:relative;width:100%;max-width:400px;height:min(640px,92vh);margin:16px;border-radius:20px;overflow:hidden;background:#0A0A0F;box-shadow:0 30px 80px rgba(0,0,0,.6)}' +
      '#estvGuestGateModal .ggClose{position:absolute;top:10px;right:10px;z-index:2;width:32px;height:32px;border-radius:50%;border:none;background:rgba(255,255,255,.12);color:#fff;font-size:18px;line-height:1;cursor:pointer}' +
      '#estvGuestGateModal iframe{width:100%;height:100%;border:none;display:block}' +
      'body.estv-gate-open{overflow:hidden}';
    document.head.appendChild(style);

    var backdrop = document.createElement('div');
    backdrop.id = 'estvGuestGateModal';
    var card = document.createElement('div');
    card.className = 'ggCard';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'ggClose';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = String.fromCharCode(215);
    var frame = document.createElement('iframe');
    frame.src = '/login?embed=1&next=' + encodeURIComponent(nextPath || window.location.pathname);
    card.appendChild(closeBtn);
    card.appendChild(frame);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    document.body.classList.add('estv-gate-open');

    function close(){
      backdrop.remove();
      style.remove();
      document.body.classList.remove('estv-gate-open');
      window.removeEventListener('message', onMessage);
      document.removeEventListener('keydown', onKey);
    }
    function onMessage(e){
      if (e.origin !== window.location.origin) return;
      if (e.data && e.data.type === 'estv-auth-success') {
        window.location.reload();
      }
    }
    function onKey(e){
      if (e.key === 'Escape') close();
    }

    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', function(e){ if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onKey);
    window.addEventListener('message', onMessage);
  }

  window.openSignInModal = openSignInModal;
})();
