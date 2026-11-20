import { SOLAR_SPEC } from '../world/hazards'
import {
  isTodayData,
  kpAurora,
  kpLevel,
  parseKp,
  parseUsgs,
  summarizeToday,
} from './today'
import type { TodayData } from './today'

const feature = (
  id: string,
  mag: number | null,
  time: number,
  coordinates: number[] | null,
  extra: Record<string, unknown> = {},
) => ({
  type: 'Feature',
  id,
  properties: { mag, place: `place ${id}`, time, tsunami: 0, ...extra },
  geometry: coordinates ? { type: 'Point', coordinates } : null,
})

describe('USGS 지진 자료', () => {
  it('최근 순으로 정리하고 좌표는 0.01°, 깊이는 1km 단위로 줄인다', () => {
    const quakes = parseUsgs({
      type: 'FeatureCollection',
      features: [
        feature('old', 4.7, 1_000, [171.19061, -24.66064, 10.3]),
        feature('new', 6.6, 9_000, [131.45934, -6.02081, 68.06], {
          tsunami: 1,
        }),
      ],
    })
    expect(quakes).toEqual([
      {
        id: 'new',
        time: 9_000,
        mag: 6.6,
        depthKm: 68,
        lat: -6.02,
        lon: 131.46,
        place: 'place new',
        tsunami: true,
      },
      {
        id: 'old',
        time: 1_000,
        mag: 4.7,
        depthKm: 10,
        lat: -24.66,
        lon: 171.19,
        place: 'place old',
        tsunami: false,
      },
    ])
  })

  it('규모나 위치가 없는 항목과 모양이 다른 자료는 버린다', () => {
    expect(
      parseUsgs({
        features: [
          feature('no-mag', null, 1, [1, 2, 3]),
          feature('no-geometry', 5, 1, null),
          feature('ok', 5, 1, [1, 2, 3]),
        ],
      }).map((q) => q.id),
    ).toEqual(['ok'])
    expect(parseUsgs(null)).toEqual([])
    expect(parseUsgs({ features: 'x' })).toEqual([])
  })
})

describe('NOAA 지자기 Kp 자료', () => {
  it('객체 배열(지금 형식)을 오래된 순 UTC 시각으로 정리한다', () => {
    expect(
      parseKp([
        { time_tag: '2026-11-13T03:00:00', Kp: 0.33 },
        { time_tag: '2026-11-13T00:00:00', Kp: 1.33 },
      ]),
    ).toEqual([
      { time: '2026-11-13T00:00:00Z', kp: 1.33 },
      { time: '2026-11-13T03:00:00Z', kp: 0.33 },
    ])
  })

  it('머리줄이 있는 배열(옛 형식)도 읽고, 숫자가 아닌 값은 버린다', () => {
    expect(
      parseKp([
        ['time_tag', 'Kp', 'a_running', 'station_count'],
        ['2024-05-10 21:00:00.000', '8.67', '207', '8'],
        ['2024-05-11 00:00:00.000', 'x', '0', '8'],
      ]),
    ).toEqual([{ time: '2024-05-10T21:00:00Z', kp: 8.67 }])
    expect(parseKp({})).toEqual([])
  })

  it('Kp를 NOAA 지자기 폭풍 등급으로 (5− = 4.67부터 G1)', () => {
    expect(kpLevel(1.33)).toBe('quiet')
    expect(kpLevel(4)).toBe('active')
    expect(kpLevel(4.67)).toBe('g1')
    expect(kpLevel(6)).toBe('g2')
    expect(kpLevel(7.33)).toBe('g3')
    expect(kpLevel(8)).toBe('g4')
    expect(kpLevel(9)).toBe('g5')
  })

  it('Kp가 클수록 오로라가 낮은 위도까지 내려오고 밝아지며, G3~G5는 태양 폭풍 기능과 같다', () => {
    for (const [kp, level] of [
      [7, 'g3'],
      [8, 'g4'],
      [9, 'g5'],
    ] as const)
      expect(kpAurora(kp)).toEqual({
        lat: SOLAR_SPEC[level].auroraLat,
        strength: SOLAR_SPEC[level].glow,
      })
    let previous = kpAurora(0)
    for (let kp = 0.5; kp <= 9; kp += 0.5) {
      const now = kpAurora(kp)
      expect(now.lat).toBeLessThan(previous.lat)
      expect(now.strength).toBeGreaterThanOrEqual(previous.strength)
      previous = now
    }
    expect(kpAurora(0).lat).toBeGreaterThan(60)
  })
})

describe('오늘의 지구 자료', () => {
  const data: TodayData = {
    fetchedAt: '2026-11-20T21:00:00Z',
    quakes: [
      {
        id: 'a',
        time: Date.parse('2026-11-20T10:00:00Z'),
        mag: 5.1,
        depthKm: 10,
        lat: 1,
        lon: 2,
        place: 'A',
        tsunami: false,
      },
      {
        id: 'b',
        time: Date.parse('2026-11-18T10:00:00Z'),
        mag: 6.6,
        depthKm: 68,
        lat: -6,
        lon: 131,
        place: 'B',
        tsunami: false,
      },
    ],
    kp: [
      { time: '2026-11-19T21:00:00Z', kp: 5.33 },
      { time: '2026-11-20T18:00:00Z', kp: 2 },
    ],
  }

  it('요약: 지진 수·가장 큰 지진·최근 Kp와 24시간 최대', () => {
    expect(summarizeToday(data)).toEqual({
      fetchedAt: '2026-11-20T21:00:00Z',
      quakeCount: 2,
      largest: data.quakes[1],
      kpNow: { time: '2026-11-20T18:00:00Z', kp: 2 },
      kpMax24h: 5.33,
    })
  })

  it('받은 자료의 모양을 검사한다', () => {
    expect(isTodayData(data)).toBe(true)
    expect(isTodayData({ ...data, quakes: 'x' })).toBe(false)
    expect(isTodayData({ fetchedAt: 1 })).toBe(false)
    expect(isTodayData(null)).toBe(false)
  })
})
