// v2: las versiones anteriores guardaban respuestas de Supabase; al activarse
// esta versión se eliminan todas las cachés previas.
const CACHE_NAME = 'soma-shell-v2'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/logo-light.png', '/logotype-light.png', '/logo-dark.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url)

  // Solo recursos estáticos del propio sitio: nunca datos de Supabase ni de terceros.
  if (
    event.request.method !== 'GET' ||
    requestUrl.origin !== self.location.origin
  ) return

  // Solo se guardan el shell de la app y los archivos con hash de /assets/:
  // así la caché no crece sin límite con cualquier GET del sitio.
  const cacheable = APP_SHELL.includes(requestUrl.pathname) || requestUrl.pathname.startsWith('/assets/')
  const isNavigation = event.request.mode === 'navigate'

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && cacheable) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        // index.html solo reemplaza navegaciones: devolverlo como si fuera un
        // script o una imagen causaba errores confusos sin conexión.
        if (isNavigation) {
          const shell = await caches.match('/index.html')
          if (shell) return shell
        }
        return Response.error()
      }),
  )
})
