import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const isNativeApp = Capacitor.isNativePlatform();
if (isNativeApp) {
  window.__ES_NATIVE_APP__ = true;
  document.addEventListener('click', async (event) => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented) return;

    const url = new URL(link.href, window.location.href);

    if (!['http:', 'https:'].includes(url.protocol)) return;
    const isAuthStart = url.origin === window.location.origin && /^\/api\/(?:telegram|github)-auth\/start$/.test(url.pathname);
    if (url.hostname === window.location.hostname && !isAuthStart) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      await Browser.open({
        url: url.href,
        toolbarColor: '#080B18'
      });
    } catch (error) {
      console.error('Could not open in-app browser:', error);
    }
  }, true);
}
