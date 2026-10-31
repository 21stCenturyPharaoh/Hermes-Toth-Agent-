// One service worker for the whole Micdom site (label home + Metatron + stage).
// Same-origin GET only. Never touches /api, /admin, /functions or authenticated requests.
// Media is not cached except the 8 stage clips listed below (about 3 MB).
const PREFIX = 'micdom-', CACHE = PREFIX + 'v1';
const CLIPS = ['idle','welcome','shocked','neutral','thinking','breaking','signoff','nodding'].map(n => '/dj/' + n + '.mp4');
const SHELL = ['/', '/stage.html', '/metatron.html', '/manifest.json', '/icon-192.png', '/icon-512.png',
               '/producers/ep1.jpg', '/producers/ep2.jpg', '/producers/ep3.jpg'].concat(CLIPS);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks
    .filter(k => (k.startsWith(PREFIX) || k.startsWith('metatron-')) && k !== CACHE)
    .map(k => caches.delete(k)))));
  self.clients.claim();
});

// Clips need byte-range answers, so serve cached clips as 206 slices
async function clipFromCache(req) {
  const hit = await caches.match(req.url);
  if (!hit) return fetch(req);
  const range = req.headers.get('range');
  if (!range) return hit;
  const buf = await hit.arrayBuffer();
  const m = /bytes=(\d+)-(\d*)/.exec(range);
  const s = +m[1], e = m[2] ? +m[2] : buf.byteLength - 1;
  return new Response(buf.slice(s, e + 1), { status: 206, headers: {
    'Content-Type': 'video/mp4', 'Content-Length': e - s + 1,
    'Content-Range': 'bytes ' + s + '-' + e + '/' + buf.byteLength } });
}

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (CLIPS.includes(u.pathname)) { e.respondWith(clipFromCache(r)); return; }
  if (/^\/(api|admin|functions)/.test(u.pathname) || r.headers.has('authorization') || r.headers.has('range')) return;
  if (['video', 'audio'].includes(r.destination) || /\.(mp4|mp3|webm|wav)$/.test(u.pathname)) return;
  e.respondWith(fetch(r).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
    return res;
  }).catch(() => caches.match(r).then(hit => hit || (r.mode === 'navigate' ? caches.match('/') : undefined))));
});
