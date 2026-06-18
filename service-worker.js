/* ============================================
   service-worker.js — cache offline (PWA)
   ============================================
   Estratégia: cache-first para os arquivos estáticos
   do app (shell), permitindo uso completo offline.
   Os dados (IndexedDB) não passam por aqui — são
   gerenciados diretamente pelo app.
*/

const CACHE_NAME = 'vitale-carioca-rateio-v2';

const ARQUIVOS_PARA_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/header.css',
  './css/tabs.css',
  './css/floor-cards.css',
  './css/tables.css',
  './css/dashboard.css',
  './css/photos.css',
  './css/invoice.css',
  './js/db.js',
  './js/photo-utils.js',
  './js/rateio-logic.js',
  './js/formatters.js',
  './js/charts.js',
  './js/photos-ui.js',
  './js/invoice-ui.js',
  './js/tab-lancamento.js',
  './js/tab-conferencia.js',
  './js/tab-dashboard.js',
  './js/tab-historico.js',
  './js/export.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ARQUIVOS_PARA_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes.filter((nome) => nome !== CACHE_NAME)
             .map((nome) => caches.delete(nome))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // só intercepta requisições GET do mesmo domínio
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        // cacheia novos arquivos automaticamente (ex: futuras atualizações)
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        // sem rede e sem cache — fallback simples para navegação
        if (event.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
