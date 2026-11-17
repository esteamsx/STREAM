import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  document.addEventListener('click', async (event) => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented) return;

    const url = new URL(link.href, window.location.href);

    if (!['http:', 'https:'].includes(url.protocol)) return;
    if (url.hostname === window.location.hostname) return;

    // Leave Google sign-in and authentication links untouched.
    if (
      url.hostname === 'accounts.google.com' ||
      url.hostname.endsWith('.google.com') ||
      link.closest('[data-google-signin]')
    ) return;

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
