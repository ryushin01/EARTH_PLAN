/**
 * 이미 받은 파일을 서비스 워커를 거쳐 한 번 더 요청해, 오프라인에서도 쓸 수 있게 캐시에 넣습니다.
 * 첫 방문에서는 서비스 워커가 페이지를 맡기 전에 받은 텍스처가 캐시에 없으므로, 지구가 보인 뒤 부릅니다.
 * 브라우저 캐시를 먼저 쓰므로(force-cache) 다시 내려받지 않고, 이미 서비스 워커 캐시에 있으면 바로 끝납니다.
 */
export async function warmOfflineCache(
  urls: readonly string[],
  timeoutMs = 10_000,
): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator))
    return
  const container = navigator.serviceWorker
  if (!container.controller) {
    const claimed = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs)
      container.addEventListener(
        'controllerchange',
        () => {
          clearTimeout(timer)
          resolve(true)
        },
        { once: true },
      )
    })
    if (!claimed) return
  }
  await Promise.all(
    urls.map((url) =>
      fetch(url, { cache: 'force-cache' }).then(
        () => undefined,
        () => undefined,
      ),
    ),
  )
}
