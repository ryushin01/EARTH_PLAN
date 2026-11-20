// TerraNova 서비스 워커: 한 번 방문하면 오프라인에서도 그대로 열립니다.
// - 페이지(HTML): 네트워크 먼저, 끊기면 캐시
// - 해시가 붙은 코드(assets/), 텍스처(textures/), 자료(data/)·매니페스트·아이콘: 캐시 먼저
// - 설치할 때 코드·CSS·화면 글꼴·첫 화면 이미지와 자료·매니페스트·아이콘을 미리 받음(PRECACHE).
//   텍스처는 기기마다 쓰는 크기가 달라, 페이지가 지구를 보인 뒤 쓴 것을 다시 요청해 캐시에 넣음
// 캐시 이름의 버전과 PRECACHE는 빌드할 때 scripts/vite-sw-version.ts가 채웁니다
// (코드는 파일 이름, 텍스처·자료는 내용 기준). 새 버전이 켜지면 이름이 다른 옛 캐시를 지웁니다.
const PAGE_CACHE = 'terranova-pages'
const ASSET_CACHE = 'terranova-assets-__ASSETS_VERSION__'
const TEXTURE_CACHE = 'terranova-textures-__TEXTURES_VERSION__'
const STATIC_CACHE = 'terranova-static-__STATIC_VERSION__'
const CURRENT = [PAGE_CACHE, ASSET_CACHE, TEXTURE_CACHE, STATIC_CACHE]
const PRECACHE = __PRECACHE__
// 이름을 바꾸기 전(EARTH_PLAN) 캐시. 출처(ryushin01.github.io)가 같아 남아 있으므로 함께 지움
const LEGACY_PREFIX = 'earth-plan-'
const SCOPE = new URL(self.registration.scope).pathname

/** 캐시에 아직 없는 것만 받아 넣음 (이름이 같은 캐시를 이어 쓰는 업데이트에서 다시 받지 않게) */
async function addMissing(cacheName, paths) {
  const cache = await caches.open(cacheName)
  const missing = []
  for (const path of paths) {
    const url = SCOPE + path
    if (!(await cache.match(url, { ignoreVary: true }))) missing.push(url)
  }
  await cache.addAll(missing)
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(PAGE_CACHE).then((cache) => cache.add(SCOPE)),
      addMissing(ASSET_CACHE, PRECACHE.assets),
      addMissing(STATIC_CACHE, PRECACHE.static),
    ]),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(LEGACY_PREFIX) ||
                (key.startsWith('terranova-') && !CURRENT.includes(key)),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

/**
 * 캐시에 있으면 그것을, 없으면 받아서 캐시에 넣고 돌려줌.
 * Vary(Origin·Accept-Encoding)는 무시: 미리 받을 때의 요청에는 Origin이 없지만 모듈 스크립트·글꼴 요청에는 있어,
 * Vary를 따지면 오프라인에서 캐시를 찾지 못함. 여기 파일은 이름(해시)이나 캐시 버전으로 내용이 정해짐
 */
function cacheFirst(cacheName, request) {
  return caches.open(cacheName).then(async (cache) => {
    const cached = await cache.match(request, { ignoreVary: true })
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
  else if (path.startsWith('data/') || PRECACHE.static.includes(path))
    event.respondWith(cacheFirst(STATIC_CACHE, request))
})
