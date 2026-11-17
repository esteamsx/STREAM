import { Browser } from '@capacitor/browser';
import { InAppBrowser } from '@capawesome/capacitor-in-app-browser';
import { Capacitor } from '@capacitor/core';

const isNativeApp = Capacitor.isNativePlatform();
if (isNativeApp) {
  window.__ES_NATIVE_APP__ = true;
  document.addEventListener('click', async (event) => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || link.hasAttribute('download')) return;

    const url = new URL(link.href, window.location.href);

    if (!['http:', 'https:'].includes(url.protocol)) return;
    const isAuthStart = url.origin === window.location.origin && /^\/api\/(?:telegram|github)-auth\/start$/.test(url.pathname);
    const opensNewView = link.target.toLowerCase() === '_blank';
    if (url.hostname === window.location.hostname && !isAuthStart && !opensNewView) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      if (isAuthStart || !Capacitor.isPluginAvailable('InAppBrowser')) {
        await Browser.open({ url: url.href, toolbarColor: '#080B18' });
      } else {
        await InAppBrowser.openInWebView({
          url: url.href,
          toolbar: {
            backgroundColor: '#080B18',
            color: '#FFFFFF',
            showUrl: true,
            showNavigationButtons: true,
            closeButtonText: 'Close'
          },
          android: { hardwareBackButton: true }
        });
      }
    } catch (error) {
      console.error('Could not open in-app browser:', error);
    }
  }, true);
}
