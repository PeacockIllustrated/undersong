/* global self, caches, fetch, location, URL, Response */
// M12-02 (ADR-038): a hand-written service worker so Undersong installs and plays offline. No build step and no
// dependency: Vite copies it as is. Pages come from the network first, so a new deploy is picked up at once;
// everything else (the hashed scripts, sprites, fonts) is served from the cache and refreshed behind the scenes.
// All paths are relative, so it works at the site root on Vercel and in a subfolder on itch.io.
const CACHE = 'hollowayco-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
const FONTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin && !FONTS.includes(url.host)) return;
  if (req.mode === 'navigate') {
    // network first: a fresh page when online, the last one when not
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || Response.error())),
    );
    return;
  }
  // cache first, refreshed in the background
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit || Response.error());
      return hit || net;
    }),
  );
});
