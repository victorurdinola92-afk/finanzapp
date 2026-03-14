var CACHE = "finanzapp-v1";

var archivos = [
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json"
];

// Instalar y guardar archivos en cache
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(archivos);
    })
  );
});

// Activar y limpiar caches viejos
self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    })
  );
});

// Responder desde cache si no hay internet
self.addEventListener("fetch", function(e) {
  e.respondWith(
    caches.match(e.request).then(function(respuesta) {
      return respuesta || fetch(e.request);
    })
  );
});