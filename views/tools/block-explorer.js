import { renderToolPage } from "./page-shell.js";

export function renderBlockExplorer(cfg) {
  return renderToolPage(cfg, {
    pageKey: "toolsBlockExplorer",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    heading: "Base Block Explorer",
    subtitle: "Paste a Base Mainnet address or contract to check its balance, contract status, token info, and activity.",
    bodyHtml: `
      <div class="field">
        <label for="addressInput">Address</label>
        <input type="text" id="addressInput" placeholder="0x..." autocomplete="off" spellcheck="false">
      </div>`,
    script: `
      var addressInput = document.getElementById('addressInput');
      var addressRe = /^0x[a-fA-F0-9]{40}$/;
      setExtraValid(false);
      addressInput.addEventListener('input', function(){ setExtraValid(addressRe.test(addressInput.value.trim())); });

      submitBtn.addEventListener('click', async function(){
        hideMsg(); hideResult();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span>Looking up…';
        try {
          var data = await postTool('/api/tools/block-explorer', { address: addressInput.value.trim() });
          var rows = [
            ['Address', data.address],
            ['Type', data.isContract ? 'Contract' : 'Wallet'],
            ['Verified', data.isContract ? (data.isVerified ? 'Yes' : 'No') : '-'],
            ['Name', data.name || '-'],
            ['Balance', data.balanceEth + ' ETH'],
            ['Transactions', data.txCount != null ? data.txCount : '-'],
            ['Token Transfers', data.tokenTransfersCount != null ? data.tokenTransfersCount : '-'],
            ['Creator', data.creatorAddress || '-'],
          ];
          if (data.token) {
            rows.push(['Token Name', data.token.name || '-']);
            rows.push(['Token Symbol', data.token.symbol || '-']);
            rows.push(['Token Decimals', data.token.decimals != null ? data.token.decimals : '-']);
            rows.push(['Total Supply', data.token.totalSupply || '-']);
            rows.push(['Holders', data.token.holders != null ? data.token.holders : '-']);
          }
          resultEl.innerHTML = '<div class="result-head"><span>Result</span></div>' +
            '<table class="result-table">' + rows.map(function(r){ return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>' +
            '<div class="explorer-links">' +
            '<a class="copy-btn" href="' + esc(data.basescanUrl) + '" target="_blank" rel="noopener">View on Basescan</a>' +
            '<a class="copy-btn" href="' + esc(data.blockscoutUrl) + '" target="_blank" rel="noopener">View on Blockscout</a>' +
            '</div>';
          showResult();
        } catch (err) {
          showMsg(err.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Look Up';
        resetAltcha();
      });`,
    extraStyle: `.explorer-links{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}`,
  });
}
