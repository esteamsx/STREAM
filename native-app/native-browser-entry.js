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

async function checkForAppUpdate() {
  try {
    const response = await fetch('/api/app-version', { cache: 'no-store' });
    if (!response.ok) return;
    const release = await response.json();
    const version = String(release.version || '').trim();
    if (!version) return;
    const previous = localStorage.getItem('es-teams-tv-app-version');
    localStorage.setItem('es-teams-tv-app-version', version);
    if (!previous || previous === version || document.getElementById('esNativeUpdatePopup')) return;

    const style = document.createElement('style');
    style.textContent = '#esNativeUpdatePopup{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px;background:rgba(3,6,18,.52);backdrop-filter:blur(12px)}#esNativeUpdatePopup .es-native-update-card{width:min(100%,360px);padding:24px;border:1px solid rgba(255,255,255,.16);border-radius:24px;background:linear-gradient(145deg,rgba(30,36,66,.96),rgba(10,14,30,.96));box-shadow:0 20px 70px rgba(0,0,0,.45);color:#fff;font:500 15px/1.5 system-ui,sans-serif}#esNativeUpdatePopup h2{margin:0 0 8px;font-size:20px}#esNativeUpdatePopup p{margin:0 0 18px;color:rgba(255,255,255,.74)}#esNativeUpdatePopup button{width:100%;border:0;border-radius:14px;padding:12px 16px;background:#fff;color:#11172b;font-weight:700}';
    document.head.appendChild(style);
    const popup = document.createElement('div');
    popup.id = 'esNativeUpdatePopup';
    popup.innerHTML = '<div class="es-native-update-card" role="dialog" aria-modal="true" aria-labelledby="esNativeUpdateTitle"><h2 id="esNativeUpdateTitle">App version updated</h2><p></p><button type="button">Continue</button></div>';
    popup.querySelector('p').textContent = `ES TEAMS TV ${version} is now available.${release.notes ? ` ${release.notes}` : ''}`;
    popup.querySelector('button').addEventListener('click', () => popup.remove(), { once: true });
    document.body.appendChild(popup);
  } catch (error) {
    console.warn('[native-browser] App version check failed:', error);
  }
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
  void checkForAppUpdate();

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
