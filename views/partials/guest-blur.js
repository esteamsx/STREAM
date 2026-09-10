export function wrapWithGuestBlur(html, nextPath) {
  let out = html;

  if (out.indexOf("/guest-gate.js") === -1) {
    out = out.replace("</head>", '<script nonce="__CSP_NONCE__" src="/guest-gate.js" defer></script>\n</head>');
  }

  out = out.replace("<body>", '<body>\n<style>#estvGuestBlurWrap{filter:blur(8px);pointer-events:none;user-select:none}</style>\n<div id="estvGuestBlurWrap">');

  const closing =
    '</div>\n<script nonce="__CSP_NONCE__">document.addEventListener("DOMContentLoaded", function(){ if (window.openSignInModal) window.openSignInModal(' +
    JSON.stringify(nextPath) +
    '); });</script>\n</body>';
  out = out.replace("</body>", closing);

  return out;
}
