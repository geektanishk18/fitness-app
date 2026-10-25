const CACHE = 'v-taper-shell-v3'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon.svg']
self.addEventListener('install', (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())) })
self.addEventListener('activate', (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())) })
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'PRECACHE_ASSETS' || !Array.isArray(event.data.urls)) return
  const urls = event.data.urls.filter((value) => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//'))
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(urls)).catch(() => undefined))
})
self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  if (request.mode === 'navigate') { event.respondWith(fetch(request).then((response) => { const copy = response.clone(); void caches.open(CACHE).then((cache) => cache.put('/index.html', copy)); return response }).catch(async () => (await caches.match('/index.html', { ignoreVary: true })) ?? Response.error())); return }
  event.respondWith(caches.match(request, { ignoreVary: true }).then((cached) => cached ?? fetch(request).then((response) => { if (response.ok) { const copy = response.clone(); void caches.open(CACHE).then((cache) => cache.put(request, copy)) } return response })))
})
