self.addEventListener('install', e=>{ e.waitUntil(caches.open('metatron-v2').then(c=>c.addAll(['./index.html','./manifest.json','./icon-192.png','./icon-512.png']))); self.skipWaiting(); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.map(k=>k!=='metatron-v2'?caches.delete(k):null)))); });
self.addEventListener('fetch', e=>{ e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))); });
