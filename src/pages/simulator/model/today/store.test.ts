import { useToday } from './store'
import type { TodayData } from './today'

const data: TodayData = {
  fetchedAt: '2026-11-20T21:00:00Z',
  quakes: [
    {
      id: 'q1',
      time: 1,
      mag: 6.6,
      depthKm: 68,
      lat: -6.02,
      lon: 131.46,
      place: 'Tual',
      tsunami: false,
    },
  ],
  kp: [{ time: '2026-11-20T18:00:00Z', kp: 2 }],
}

describe('오늘의 지구 상태', () => {
  beforeEach(() => useToday.setState(useToday.getInitialState()))

  it('처음 켜거나 패널을 열면 한 번만 자료를 불러온다', async () => {
    const loader = vi.fn().mockResolvedValue(data)
    const first = useToday.getState().ensureLoaded(loader)
    expect(useToday.getState().status).toBe('loading')
    await first
    await useToday.getState().ensureLoaded(loader)
    expect(loader).toHaveBeenCalledOnce()
    expect(useToday.getState()).toMatchObject({ status: 'ready', data })
  })

  it('불러오지 못하면 오류 상태가 되고, 다시 시도할 수 있다', async () => {
    await useToday.getState().ensureLoaded(vi.fn().mockResolvedValue(null))
    expect(useToday.getState().status).toBe('error')
    await useToday.getState().ensureLoaded(vi.fn().mockResolvedValue(data))
    expect(useToday.getState().status).toBe('ready')
  })

  it('받지 못하면 스냅숏으로 대신 보여 주고, 다시 부르면 사이트 자료를 다시 시도한다', async () => {
    const snapshot = { ...data, fetchedAt: '2026-11-01T00:00:00Z' }
    await useToday
      .getState()
      .ensureLoaded(vi.fn().mockResolvedValue(null), async () => snapshot)
    expect(useToday.getState()).toMatchObject({
      status: 'ready',
      data: snapshot,
      fromSnapshot: true,
    })
    const loader = vi.fn().mockResolvedValue(data)
    await useToday.getState().ensureLoaded(loader, async () => snapshot)
    expect(loader).toHaveBeenCalledOnce()
    expect(useToday.getState()).toMatchObject({ data, fromSnapshot: false })
  })

  it('지진을 고르면 지구에 표시를 켜고 카메라가 갈 곳을 정한다', () => {
    useToday.getState().focus('q1')
    expect(useToday.getState()).toMatchObject({
      enabled: true,
      focusId: 'q1',
      focusTick: 1,
    })
    // 같은 지진을 다시 골라도 카메라가 다시 감
    useToday.getState().focus('q1')
    expect(useToday.getState().focusTick).toBe(2)
    useToday.getState().setEnabled(false)
    expect(useToday.getState().enabled).toBe(false)
  })
})
