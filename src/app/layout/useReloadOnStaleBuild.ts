import { useEffect } from 'react'

const STORAGE_KEY = 'earth-plan:stale-reload'
/** 이 시간 안에 이미 한 번 다시 불러왔으면 또 하지 않음 (파일이 정말 없을 때 무한 새로고침 방지) */
export const RELOAD_GUARD_MS = 60_000

/**
 * 새 버전이 배포되면 옛 화면이 나중에 받으려던 코드 조각(3D 묶음 등)이 서버에서 사라집니다.
 * 그 조각을 받지 못하면(vite:preloadError) 페이지를 한 번 다시 불러와 새 버전으로 엽니다.
 */
export function useReloadOnStaleBuild(
  reload: () => void = () => {
    window.location.reload()
  },
) {
  useEffect(() => {
    const onPreloadError = () => {
      try {
        const last = Number(window.sessionStorage.getItem(STORAGE_KEY) ?? 0)
        if (Date.now() - last < RELOAD_GUARD_MS) return
        window.sessionStorage.setItem(STORAGE_KEY, String(Date.now()))
      } catch {
        // 저장소가 막혀 있으면 횟수를 셀 수 없으므로 다시 불러오지 않음
        return
      }
      reload()
    }
    window.addEventListener('vite:preloadError', onPreloadError)
    return () => window.removeEventListener('vite:preloadError', onPreloadError)
  }, [reload])
}
