import { renderHook } from '@testing-library/react'
import { RELOAD_GUARD_MS, useReloadOnStaleBuild } from './useReloadOnStaleBuild'

const fail = () => window.dispatchEvent(new Event('vite:preloadError'))

describe('useReloadOnStaleBuild', () => {
  beforeEach(() => window.sessionStorage.clear())

  it('코드 조각을 받지 못하면 한 번만 다시 불러온다', () => {
    vi.useFakeTimers()
    try {
      const reload = vi.fn()
      const { unmount } = renderHook(() => useReloadOnStaleBuild(reload))
      fail()
      expect(reload).toHaveBeenCalledOnce()
      // 다시 불러온 뒤에도 실패하면 반복하지 않음
      fail()
      expect(reload).toHaveBeenCalledOnce()
      vi.advanceTimersByTime(RELOAD_GUARD_MS + 1)
      fail()
      expect(reload).toHaveBeenCalledTimes(2)
      unmount()
      fail()
      expect(reload).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
