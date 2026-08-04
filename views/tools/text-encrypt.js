import { renderToolPage } from "./page-shell.js";

export function renderTextEncrypt(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsTextEncrypt",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>`,
    heading: "Text Encryption",
    subtitle: "Encrypt or decrypt text with a passphrase, using AES-GCM. Runs entirely in your browser — your text and passphrase are never sent anywhere.",
    bodyHtml: `
      <div class="field">
        <label for="modeSelect">Mode</label>
        <select id="modeSelect">
          <option value="encrypt">Encrypt</option>
          <option value="decrypt">Decrypt</option>
        </select>
      </div>
      <div class="field">
        <label for="passInput">Passphrase</label>
        <input type="password" id="passInput" placeholder="A strong passphrase…" autocomplete="off">
      </div>
      <div class="field">
        <label for="textInput" id="textLabel">Text to Encrypt</label>
        <textarea id="textInput" rows="7" placeholder="Type or paste text here…" spellcheck="false"></textarea>
      </div>`,
    script: `
      var modeSelect = document.getElementById('modeSelect');
      var passInput = document.getElementById('passInput');
      var textInput = document.getElementById('textInput');
      var textLabel = document.getElementById('textLabel');
      setExtraValid(false);
      function checkValid(){ setExtraValid(passInput.value.length > 0 && textInput.value.trim().length > 0); }
      passInput.addEventListener('input', checkValid);
      textInput.addEventListener('input', checkValid);
      modeSelect.addEventListener('change', function(){
        var encrypting = modeSelect.value === 'encrypt';
        textLabel.textContent = encrypting ? 'Text to Encrypt' : 'Text to Decrypt';
        textInput.placeholder = encrypting ? 'Type or paste text here…' : 'Paste the encrypted text here…';
      });

      var subtle = window.crypto && window.crypto.subtle;

      function toBase64(bytes){
        var bin = '';
        for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
      }
      function fromBase64(str){
        var bin = atob(str);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
      }

      async function deriveKey(passphrase, salt){
        var enc = new TextEncoder();
        var keyMaterial = await subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
        return subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: 150000, hash: 'SHA-256' },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
      }

      async function encryptText(plaintext, passphrase){
        var salt = window.crypto.getRandomValues(new Uint8Array(16));
        var iv = window.crypto.getRandomValues(new Uint8Array(12));
        var key = await deriveKey(passphrase, salt);
        var enc = new TextEncoder();
        var ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(plaintext));
        var combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
        return toBase64(combined);
      }

      async function decryptText(payload, passphrase){
        var combined = fromBase64(payload);
        var salt = combined.slice(0, 16);
        var iv = combined.slice(16, 28);
        var ciphertext = combined.slice(28);
        var key = await deriveKey(passphrase, salt);
        var plainBuf = await subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ciphertext);
        return new TextDecoder().decode(plainBuf);
      }

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        if (!subtle) { showMsg('Your browser does not support the Web Crypto API.', false); return; }
        submitBtn.disabled = true;
        var encrypting = modeSelect.value === 'encrypt';
        submitBtn.innerHTML = '<span class="btn-spinner"></span>' + (encrypting ? 'Encrypting…' : 'Decrypting…');
        try {
          await postTool('/api/tools/text-encrypt-gate', {});
          var output = encrypting
            ? await encryptText(textInput.value, passInput.value)
            : await decryptText(textInput.value.trim(), passInput.value);
          resultEl.innerHTML = '<div class="result-head"><span>' + (encrypting ? 'Encrypted' : 'Decrypted') + '</span><button class="copy-btn" id="copyResultBtn" type="button">Copy</button></div>' +
            '<pre class="result-pre">' + esc(output) + '</pre>';
          showResult();
          document.getElementById('copyResultBtn').addEventListener('click', function(){
            navigator.clipboard.writeText(output).catch(function(){});
          });
        } catch (err) {
          showMsg(encrypting ? (err.message || 'Could not encrypt that text.') : 'Could not decrypt — wrong passphrase, or the text was not encrypted with this tool.', false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = encrypting ? 'Encrypt' : 'Decrypt';
        resetAltcha();
      });`,
  });
}
