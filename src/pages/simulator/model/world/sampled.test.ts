import { act, renderHook } from '@testing-library/react'
import { SAMPLE_MS, useWorldSampled } from './sampled'
import { useWorld } from './store'

describe('useWorldSampled', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useWorld.getState().reset()
    vi.runOnlyPendingTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('사용자 조작으로 바뀐 값은 바로 보인다', () => {
    const { result } = renderHook(() => useWorldSampled((s) => s.seaLevel))
    act(() => useWorld.getState().setSeaLevel(7))
    expect(result.current).toBe(7)
  })

  it('재생 중 시간 진행은 일정 간격으로만 화면에 옮긴다', () => {
    let renders = 0
    const { result } = renderHook(() => {
      renders++
      return useWorldSampled((s) => s.year)
    })
    act(() => {
      useWorld.getState().setSpeed('year')
      useWorld.getState().setRunning(true)
    })
    const start = result.current
    const before = renders
    // 한 간격 안에 프레임 여러 개
    act(() => {
      for (let i = 0; i < 5; i++) useWorld.getState().tick(1 / 60)
    })
    expect(result.current).toBe(start)
    act(() => vi.advanceTimersByTime(SAMPLE_MS))
    expect(result.current).toBeCloseTo(useWorld.getState().year)
    expect(renders - before).toBe(1)
  })
})
