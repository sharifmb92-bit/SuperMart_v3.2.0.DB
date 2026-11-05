// Service Worker oficial para SuperMart_v 3.2.0
// Sello oficial: medbasha [mb]

const CACHE_NAME = 'supermart-v3-2-0';

// Rutas relativas puras para evitar avisos y redirecciones sospechosas
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instalación: Cachear recursos críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      // Fuerza al SW a activarse inmediatamente sin esperar a cerrar pestañas
      return self.skipWaiting();
    })
  );
});

// Activación: Limpieza de cachés antiguas (v3.1.0 o anteriores)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Eliminando caché obsoleta:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Toma el control de todas las pestañas abiertas inmediatamente
      return self.clients.claim();
    })
  );
});

// Estrategia de red/caché: Network First con fallback a Caché para recursos locales,
// y bypass transparente para CDN externas (Tesseract.js / Firebase)
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Ignorar peticiones externas (CDNs, Firebase Firestore, Tesseract OCR) para no interferir
  if (requestUrl.origin !== location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Respuesta válida: clonar y actualizar la caché en segundo plano
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si no hay red (Offline), servir desde la caché guardada
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si busca la navegación principal estando offline
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
