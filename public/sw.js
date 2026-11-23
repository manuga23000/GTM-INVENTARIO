// Service worker de GTM Inventario.
//
// Criterio: los DATOS (stock, precios, ventas) siempre vienen de internet, nunca de
// caché, para no mostrar información vieja ni descuadrar el stock. Este archivo solo
// sirve para que la app sea instalable y muestre una pantalla propia sin conexión.
//
// Si se cambia algo de este archivo, subir la versión para que los celulares lo actualicen.
const VERSION = "gtm-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/logo-gtm.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Al abrir una página: red primero; sin conexión, la pantalla "Sin conexión"
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  // Recursos de la pantalla sin conexión (logo): red primero, caché como respaldo
  const url = new URL(request.url);
  if (url.origin === self.location.origin && PRECACHE.includes(url.pathname)) {
    event.respondWith(fetch(request).catch(() => caches.match(url.pathname)));
  }
  // Todo lo demás (datos, scripts) va directo a la red, sin pasar por acá.
});
