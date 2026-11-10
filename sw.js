// Micdom PWA shell cache. Large media and authenticated API traffic stay network-only.
const CACHE = "micdom-shell-v3";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./roster.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache =>
    Promise.all(SHELL.map(path => cache.add(path).catch(() => {})))
  ));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith("micdom-") && key !== CACHE)
        .map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (/^\/(api|admin|functions)(\/|$)/.test(url.pathname)) return;
  if (request.headers.has("authorization") || request.headers.has("range")) return;
  if (["video","audio"].includes(request.destination) ||
      /\.(mp4|mp3|webm|wav|m4a)$/i.test(url.pathname)) return;

  event.respondWith(
    fetch(request).then(response => {
      if (response.ok && request.destination !== "document") {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request).then(hit =>
      hit || (request.mode === "navigate" ? caches.match("./index.html") : undefined)
    ))
  );
});
