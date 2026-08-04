import { renderToolPage } from "./page-shell.js";

export function renderSpeechTools(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsSpeechTools",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="2" width="6" height="12" rx="3"/><path stroke-linecap="round" d="M5 10a7 7 0 0014 0M12 17v5M8 22h8"/></svg>`,
    heading: "Speech-to-Text / Text-to-Speech",
    subtitle: "Dictate text using your microphone, or have any text read aloud — powered by your browser's built-in speech engine.",
    bodyHtml: `
      <div class="field">
        <label for="modeSelect">Mode</label>
        <select id="modeSelect">
          <option value="stt">Speech → Text</option>
          <option value="tts">Text → Speech</option>
        </select>
      </div>
      <div id="sttFields">
        <p class="usage-note" style="margin:0 0 12px">Press the button below, then start talking. Works best in Chrome.</p>
        <textarea id="sttOutput" rows="6" readonly placeholder="Transcript will appear here…"></textarea>
      </div>
      <div id="ttsFields" style="display:none">
        <div class="field">
          <label for="ttsInput">Text</label>
          <textarea id="ttsInput" rows="6" placeholder="Type something to hear it spoken aloud…"></textarea>
        </div>
        <div class="field-row">
          <div class="field"><label for="voiceSelect">Voice</label><select id="voiceSelect"></select></div>
          <div class="field"><label for="rateInput">Speed</label><input type="range" id="rateInput" min="0.5" max="2" step="0.1" value="1" style="margin-top:10px"></div>
        </div>
      </div>`,
    script: `
      var modeSelect = document.getElementById('modeSelect');
      var sttFields = document.getElementById('sttFields');
      var ttsFields = document.getElementById('ttsFields');
      var sttOutput = document.getElementById('sttOutput');
      var ttsInput = document.getElementById('ttsInput');
      var voiceSelect = document.getElementById('voiceSelect');
      var rateInput = document.getElementById('rateInput');
      var recognition = null;
      var listening = false;
      setExtraValid(true);
      submitBtn.textContent = 'Start Listening';

      var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

      modeSelect.addEventListener('change', function(){
        var stt = modeSelect.value === 'stt';
        sttFields.style.display = stt ? 'block' : 'none';
        ttsFields.style.display = stt ? 'none' : 'block';
        submitBtn.textContent = stt ? (listening ? 'Stop Listening' : 'Start Listening') : 'Speak';
        hideMsg(); hideResult();
      });

      function populateVoices(){
        var voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
        voiceSelect.innerHTML = voices.map(function(v, i){ return '<option value="' + i + '">' + esc(v.name) + ' (' + esc(v.lang) + ')</option>'; }).join('');
      }
      if (window.speechSynthesis) {
        populateVoices();
        window.speechSynthesis.onvoiceschanged = populateVoices;
      }

      async function handleStt(){
        if (!SpeechRec) { showMsg('Your browser does not support speech recognition — try Chrome.', false); return; }
        if (listening) { recognition.stop(); return; }
        hideMsg(); hideResult();
        try {
          await postTool('/api/tools/speech-gate', {});
        } catch (err) { showMsg(err.message, false); resetAltcha(); return; }
        recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = navigator.language || 'en-US';
        sttOutput.value = '';
        recognition.onresult = function(ev){
          var text = '';
          for (var i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
          sttOutput.value = text;
        };
        recognition.onerror = function(ev){ showMsg('Speech recognition error: ' + ev.error, false); };
        recognition.onend = function(){
          listening = false;
          submitBtn.textContent = 'Start Listening';
          resetAltcha();
        };
        recognition.start();
        listening = true;
        submitBtn.textContent = 'Stop Listening';
      }

      async function handleTts(){
        if (!window.speechSynthesis) { showMsg('Your browser does not support speech synthesis.', false); return; }
        if (!ttsInput.value.trim()) { showMsg('Type something first.', false); return; }
        hideMsg();
        try {
          await postTool('/api/tools/speech-gate', {});
        } catch (err) { showMsg(err.message, false); resetAltcha(); return; }
        var utter = new SpeechSynthesisUtterance(ttsInput.value);
        var voices = window.speechSynthesis.getVoices();
        var idx = parseInt(voiceSelect.value, 10);
        if (voices[idx]) utter.voice = voices[idx];
        utter.rate = parseFloat(rateInput.value) || 1;
        window.speechSynthesis.speak(utter);
        resetAltcha();
        showResult();
        resultEl.innerHTML = '<div class="result-head"><span>Speaking…</span></div>';
      }

      submitBtn.addEventListener('click', function(){
        if (modeSelect.value === 'stt') handleStt(); else handleTts();
      });`,
  });
}
