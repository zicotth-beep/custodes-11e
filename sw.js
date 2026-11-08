/* Adeptus Custodes 11e quick reference — service worker.
   Strategy: versioned cache, network-first for the shell and static assets,
   cached offline fallback for navigations. Only same-origin static assets are
   cached: requests with credentials/authorization, non-GET, cross-origin
   requests and API-style paths are never stored. */
'use strict';

var VERSION = 'custodes-11e-2026-11-09.1';
var CACHE = 'custodes-shell-' + VERSION;
var SHELL = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './data.js',
  './manifest.webmanifest',
  './icon.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './manus-routes.json',
  './listen.html',
  './listen.js',
  './original-zh-hant.txt'
];
var ALLOWED = SHELL.map(function (path) { return new URL(path, self.location.href).pathname; });
var MAX_ENTRIES = 60;

function isStaticAsset(url) {
  return ALLOWED.indexOf(url.pathname) >= 0;
}

function trimCache(cache) {
  return cache.keys().then(function (keys) {
    if (keys.length <= MAX_ENTRIES) return;
    return Promise.all(keys.slice(0, keys.length - MAX_ENTRIES).map(function (k) {
      return cache.delete(k);
    }));
  }).catch(function () { /* ignore */ });
}

function remember(request, response) {
  if (!response || !response.ok || response.type !== 'basic') return;
  var copy = response.clone();
  caches.open(CACHE).then(function (cache) {
    return cache.put(request, copy).then(function () { return trimCache(cache); });
  }).catch(function () { /* quota or opaque response: ignore */ });
}

function offlinePage() {
  var body = '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Offline — 帝皇禁軍 11e</title><style>' +
    'body{margin:0;background:#0b0a07;color:#f8f3e6;font:17px/1.6 system-ui,sans-serif;' +
    'display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;text-align:center}' +
    'h1{color:#e0bc6c;font-size:1.1rem;letter-spacing:.08em}' +
    'p{color:#aca28a;font-size:.9rem;max-width:28rem}a{color:#f7e2ad}' +
    '</style></head><body><main><h1>目前離線 · Offline</h1>' +
    '<p>尚未快取任何頁面。連線後重新開啟一次，即可離線查閱。<br>' +
    'No cached copy yet. Reopen once while online to enable offline reading.</p>' +
    '<p><a href="./">重新載入 · Reload</a></p></main></body></html>';
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function navigationStrategy(request) {
  return fetch(request).then(function (response) {
    if (response && response.ok && !response.redirected) {
      var copy = response.clone();
      caches.open(CACHE).then(function (cache) {
        return cache.put('./index.html', copy);
      }).catch(function () { /* ignore */ });
    }
    return response;
  }).catch(function () {
    return caches.match('./index.html', { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return caches.match(request, { ignoreSearch: true }).then(function (exact) {
        return exact || offlinePage();
      });
    });
  });
}

function assetStrategy(request) {
  return fetch(request).then(function (response) {
    remember(request, response);
    return response;
  }).catch(function () {
    return caches.match(request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return new Response('', { status: 504, statusText: 'Offline' });
    });
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL.map(function (url) { return new Request(url, { cache: 'reload' }); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key.indexOf('custodes-shell-') === 0 && key !== CACHE) return caches.delete(key);
        return null;
      }));
    }).then(function () { return self.clients.claim(); }).then(function () {
      return self.clients.matchAll({ type: 'window' }).then(function (clients) {
        clients.forEach(function (client) {
          if (client.postMessage) client.postMessage({ type: 'READY', version: VERSION, cache: CACHE });
        });
      });
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url;
  try { url = new URL(request.url); } catch (e) { return; }

  /* Never touch foreign origins, authenticated requests or API endpoints. */
  if (url.origin !== self.location.origin) return;
  if (request.headers.get('authorization')) return;
  if (!isStaticAsset(url)) return;
  var rootPath = new URL('./', self.location.href).pathname;
  if (request.mode === 'navigate' && (url.pathname === rootPath || url.pathname === rootPath + 'index.html')) {
    event.respondWith(navigationStrategy(request));
    return;
  }
  event.respondWith(assetStrategy(request));
});

self.addEventListener('message', function (event) {
  var data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'STATUS') {
    var reply = { type: 'STATUS', version: VERSION, cache: CACHE };
    if (event.source && event.source.postMessage) event.source.postMessage(reply);
    else if (event.ports && event.ports[0]) event.ports[0].postMessage(reply);
  }
});
