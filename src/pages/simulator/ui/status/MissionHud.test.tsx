import { act, render, screen } from '@testing-library/react'
import { MISSION_BY_ID } from '../../model/world/missions'
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

  it('묶음 속 미션 사건 안내는 가장 최근 사건이 아니어도 먼저 함께 읽는다', () => {
    vi.useFakeTimers()
    try {
      render(<MissionHud />)
      const status = screen.getByRole('status')
      act(() => {
        useWorld.getState().startMission('solar-2031')
      })
      act(() => vi.advanceTimersByTime(ANNOUNCE_MS))
      // 1개월/초로 재생하다 G4 날짜를 지나면 미션 사건 안내와 폭풍 기록이 함께 생김
      act(() => {
        useWorld.setState({
          year: MISSION_BY_ID['solar-2031'].schedule[0].year - 1e-6,
        })
        useWorld.getState().setSpeed('month')
        useWorld.getState().setRunning(true)
        useWorld.getState().tick(0.1)
        useWorld.getState().setRunning(false)
      })
      act(() => vi.advanceTimersByTime(ANNOUNCE_MS))
      expect(status.textContent).toMatch(
        /^새 사건 2건\. 주의: 미션 사건: G4 .*1일 속도로 늦춥니다\. 주의: G4 심한 태양 폭풍\./,
      )
    } finally {
      vi.useRealTimers()
    }
  })
})
