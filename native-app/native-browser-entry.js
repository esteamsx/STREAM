import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const isNativeApp = Capacitor.isNativePlatform();
const APP_ORIGIN = window.location.origin;
const APP_HOSTNAME = window.location.hostname;
const CALLBACK_PATH = '/login';
let browserOpen = false;
let callbackUrl = null;

function isHttpUrl(url) {
  return url && (url.protocol === 'http:' || url.protocol === 'https:');
}

function isAuthCallback(url) {
  return url.origin === APP_ORIGIN && url.pathname === CALLBACK_PATH &&
    (url.searchParams.has('tg_token') || url.searchParams.has('gh_token') ||
      url.searchParams.has('tg_error') || url.searchParams.has('gh_error') ||
      url.searchParams.has('google_ticket') || url.searchParams.has('google_error'));
}

function isInternalUrl(url) {
  return url.hostname === APP_HOSTNAME && url.protocol === window.location.protocol;
}

async function openInCustomTab(url) {
  if (!isHttpUrl(url) || browserOpen) return;
  browserOpen = true;
  try {
    await Browser.open({
      url: url.href,
      toolbarColor: '#080B18',
      presentationStyle: 'fullscreen',
    });
  } catch (error) {
    browserOpen = false;
    console.error('[native-browser] Could not open Chrome Custom Tab:', error);
  }
}

function handleAppUrl(rawUrl) {
  if (!rawUrl || callbackUrl === rawUrl) return;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return;
  }
  if (!isAuthCallback(url)) return;
  callbackUrl = rawUrl;
  browserOpen = false;
  // Re-enter the existing login page so its established Firebase/session relay
  // consumes the one-time callback token and preserves the current app state.
  window.location.replace(url.href);
}

if (isNativeApp) {
  window.__ES_NATIVE_APP__ = true;
  window.__ES_OPEN_EXTERNAL__ = (rawUrl) => {
    try {
      const url = new URL(rawUrl, window.location.href);
      void openInCustomTab(url);
    } catch (error) {
      console.error('[native-browser] Invalid external URL:', error);
    }
  };

  Browser.addListener('browserFinished', () => {
    browserOpen = false;
  });

  App.addListener('appUrlOpen', ({ url }) => handleAppUrl(url));
  App.getLaunchUrl().then(({ url }) => handleAppUrl(url)).catch(() => {});

  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link || event.defaultPrevented || link.hasAttribute('download')) return;

    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch {
      return;
    }
    if (!isHttpUrl(url) || isInternalUrl(url)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    void openInCustomTab(url);
  }, true);

  const nativeWindowOpen = window.open.bind(window);
  window.open = (rawUrl, target, features) => {
    let url;
    try {
      url = new URL(rawUrl, window.location.href);
    } catch {
      return nativeWindowOpen(rawUrl, target, features);
    }
    if (!isHttpUrl(url) || isInternalUrl(url)) return nativeWindowOpen(rawUrl, target, features);
    void openInCustomTab(url);
    return null;
  };
}
