/* Quik Clone — service worker: shell offline, rete per le immagini remote */
const CACHE = "quik-clone-v2";

self.addEventListener("install", (event) => {
  // pre-cache della shell (risolta rispetto allo scope: funziona anche sotto /nome-repo/)
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(["./"]).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // mai intercettare risorse esterne (immagini demo, font, ecc.)
  if (url.origin !== self.location.origin) return;

  // navigazione: prima la rete (aggiornamenti subito), poi la cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("./")))
    );
    return;
  }

  // asset statici (con hash nel nome): cache-first
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
    )
  );
});
