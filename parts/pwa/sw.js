/* Samvriddhi Fund Analyser: offline and speed helper */
var CORE = 'core-v1', DATA = 'data-v1';
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CORE && k !== DATA; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function trim(cache) {
  return cache.keys().then(function (ks) { if (ks.length > 500) return Promise.all(ks.slice(0, ks.length - 400).map(function (k) { return cache.delete(k); })); });
}
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  var path = url.pathname;
  if (/\/data\/version\.json$/.test(path)) {            // always ask the server first
    e.respondWith(fetch(req, { cache: 'no-store' }).then(function (res) {
      var copy = res.clone(); caches.open(CORE).then(function (c) { c.put(new Request('data/version.json'), copy); }); return res;
    }).catch(function () { return caches.match('data/version.json', { cacheName: CORE }); }));
    return;
  }
  if (/\/data\/(meta\.bin|f\/\d+\.bin)$/.test(path)) {   // data files carry ?v=version, so cache-first is safe
    e.respondWith(caches.open(DATA).then(function (c) {
      return c.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) { if (res.ok) { c.put(req, res.clone()); trim(c); } return res; });
      });
    }));
    return;
  }
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(function (res) {   // the page itself: newest if online, saved copy if not
    if (res.ok) { var copy = res.clone(); caches.open(CORE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () { return caches.match(req, { cacheName: CORE, ignoreSearch: true }).then(function (m) { return m || caches.match('./', { cacheName: CORE }); }); }));
});
