import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useToday } from '../../model/today/store'
import type { TodayData, TodayQuake } from '../../model/today/today'
import { TodayPanel } from './TodayPanel'

const quake = (
  id: string,
  mag: number,
  extra: Partial<TodayQuake> = {},
): TodayQuake => ({
  id,
  time: Date.parse('2026-11-18T15:31:00Z'),
  mag,
  depthKm: 68,
  lat: -6,
  lon: 131,
  place: `place ${id}`,
  tsunami: false,
  ...extra,
})

const data: TodayData = {
  fetchedAt: '2026-11-20T21:00:00Z',
  quakes: [
    ...Array.from({ length: 11 }, (_, i) => quake(`small${i}`, 4.5 + i * 0.01)),
    quake('big', 6.6, {
      place: '149 km WSW of Tual, Indonesia',
      tsunami: true,
    }),
  ],
  kp: [
    { time: '2026-11-20T03:00:00Z', kp: 5.33 },
    { time: '2026-11-20T18:00:00Z', kp: 7 },
  ],
}

describe('TodayPanel', () => {
  beforeEach(() => useToday.setState(useToday.getInitialState()))
  afterEach(() => vi.unstubAllGlobals())

  it('열면 자료를 불러와 기준 시각·출처·Kp와 큰 지진 10개를 보여 준다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(data)))
    render(<TodayPanel />)
    expect(
      screen.getByRole('heading', { name: '오늘의 지구' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('11월 20일 21:00 UTC 기준'),
    ).toBeInTheDocument()
    expect(screen.getByText('Kp 7.0 · G3 강한 지자기 폭풍')).toBeInTheDocument()
    expect(screen.getByText('24시간 최대 Kp 7.0')).toBeInTheDocument()
    expect(screen.getByText('모두 12회 · 큰 순서 10개')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(10)
    expect(items[0]).toHaveTextContent('M6.6 149 km WSW of Tual, Indonesia')
    expect(items[0]).toHaveTextContent('11월 18일 15:31 UTC · 깊이 68km')
    expect(items[0]).toHaveTextContent('쓰나미 정보')
    const usgs = screen.getByRole('link', { name: /USGS/ })
    expect(usgs).toHaveAttribute('target', '_blank')
    expect(usgs).toHaveAttribute('rel', 'noopener noreferrer')
    expect(usgs).toHaveAccessibleName(/새 창/)
  })

  it('지진을 고르면 지구에 표시를 켜고 그쪽으로 카메라를 보낸다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(data)))
    render(<TodayPanel />)
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'M6.6 149 km WSW of Tual, Indonesia, 지구에서 보기',
      }),
    )
    expect(useToday.getState()).toMatchObject({ enabled: true, focusId: 'big' })
  })

  it('지구에 표시 확인란으로 켜고 끈다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(data)))
    render(<TodayPanel />)
    const box = screen.getByRole('checkbox', { name: '지구에 표시' })
    await userEvent.click(box)
    expect(useToday.getState().enabled).toBe(true)
    await userEvent.click(box)
    expect(useToday.getState().enabled).toBe(false)
  })

  it('불러오지 못하면 알리고 다시 시도할 수 있다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 404 })),
    )
    render(<TodayPanel />)
    expect(
      await screen.findByText('자료를 불러오지 못했습니다.'),
    ).toBeInTheDocument()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(data)))
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(
      await screen.findByText('11월 20일 21:00 UTC 기준'),
    ).toBeInTheDocument()
  })
})
