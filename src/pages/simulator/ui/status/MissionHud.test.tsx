import { act, render, screen } from '@testing-library/react'
import { useWorld } from '../../model/world/store'
import { ANNOUNCE_MS, MissionHud } from './MissionHud'

describe('MissionHud', () => {
  beforeEach(() => useWorld.getState().reset())

  it('수치와 새 사건을 보여 주고 알린다', () => {
    render(<MissionHud />)
    expect(screen.getByText('해수면')).toBeInTheDocument()
    act(() => {
      useWorld.getState().setSeaLevel(5)
    })
    expect(screen.getByRole('status').textContent).toMatch(/경보: .*침수/)
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(1)
  })

  it('짧은 간격에 생긴 사건은 모아서 한 번만 알린다', () => {
    vi.useFakeTimers()
    try {
      render(<MissionHud />)
      const status = screen.getByRole('status')
      act(() => {
        useWorld.getState().setScenario('high')
      })
      expect(status.textContent).toMatch(/^알림: 배출 시나리오/)
      act(() => {
        useWorld.getState().setScenario('low')
        useWorld.getState().setScenario('mid')
      })
      // 간격이 지나기 전에는 그대로
      expect(status.textContent).toMatch(/^알림: 배출 시나리오/)
      act(() => vi.advanceTimersByTime(ANNOUNCE_MS))
      expect(status.textContent).toMatch(
        /^새 사건 2건\. 알림: 배출 시나리오: 중간/,
      )
    } finally {
      vi.useRealTimers()
    }
  })
})
