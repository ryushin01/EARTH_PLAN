// EARTH PLAN 서비스 워커: 다시 방문하면 코드·텍스처를 캐시에서 바로 씁니다.
// - 페이지(HTML): 네트워크 먼저, 끊기면 캐시
// - 해시가 붙은 코드(assets/)와 텍스처(textures/): 캐시 먼저
// 캐시 이름의 버전은 빌드할 때 vite.config.ts가 채웁니다(코드는 파일 이름, 텍스처는 내용 기준).
// 새 버전이 켜지면 이름이 다른 옛 캐시를 지워, 배포할 때마다 옛 파일이 쌓이지 않게 합니다.
const PAGE_CACHE = 'earth-plan-pages'
const ASSET_CACHE = 'earth-plan-assets-__ASSETS_VERSION__'
const TEXTURE_CACHE = 'earth-plan-textures-__TEXTURES_VERSION__'
const CURRENT = [PAGE_CACHE, ASSET_CACHE, TEXTURE_CACHE]
const SCOPE = new URL(self.registration.scope).pathname

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGE_CACHE).then((cache) => cache.add(SCOPE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('earth-plan-') && !CURRENT.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

/** 캐시에 있으면 그것을, 없으면 받아서 캐시에 넣고 돌려줌 */
function cacheFirst(cacheName, request) {
  return caches.open(cacheName).then(async (cache) => {
    const cached = await cache.match(request)
    if (cached) return cached
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  })
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return
  // Storybook은 따로 둠
  if (url.pathname.startsWith(`${SCOPE}storybook/`)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 없는 주소(404)는 첫 화면 대신 저장하지 않음
          if (response.ok) {
            const copy = response.clone()
            caches.open(PAGE_CACHE).then((cache) => cache.put(SCOPE, copy))
          }
          return response
        })
        .catch(() => caches.match(SCOPE).then((cached) => cached ?? Response.error())),
    )
    return
  }

  const path = url.pathname.slice(SCOPE.length)
  if (path.startsWith('assets/')) event.respondWith(cacheFirst(ASSET_CACHE, request))
  else if (path.startsWith('textures/')) event.respondWith(cacheFirst(TEXTURE_CACHE, request))
})
