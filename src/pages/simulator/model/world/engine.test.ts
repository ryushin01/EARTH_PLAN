import { CITIES } from '../site/data'
import {
  buildFloodCurve,
  cityState,
  climateVisuals,
  effectiveVei,
  floodedArea,
  riseRate,
  sourceWaveHeight,
  stepStorms,
  tsunamiImpacts,
  warming,
} from './engine'
import { SCENARIOS, baselineSeaLevel } from './scenario'

const tokyo = CITIES.find((c) => c.id === 'tokyo')!
const amsterdam = CITIES.find((c) => c.id === 'amsterdam')!
const seeded =
  (seed = 1) =>
  () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }

describe('해수면 시나리오', () => {
  it('2100년 값이 IPCC 중앙값과 맞는다', () => {
    expect(baselineSeaLevel(2100, SCENARIOS.low)).toBeCloseTo(0.44)
    expect(baselineSeaLevel(2100, SCENARIOS.high)).toBeCloseTo(0.77)
  })

  it('빙하 커튼과 우주 차양은 상승 속도를 줄인다', () => {
    const base = { year: 2030, scenario: 'mid' as const, structures: [] }
    const curtain = {
      ...base,
      structures: [
        {
          id: 'a',
          kind: 'glacier-curtain' as const,
          siteId: 'thwaites',
          startYear: 2026,
          completeYear: 2029,
        },
      ],
    }
    expect(riseRate(curtain)).toBeCloseTo(riseRate(base) * 0.88)
    const notYet = { ...curtain, year: 2028 }
    expect(riseRate(notYet)).toBeCloseTo(riseRate({ ...base, year: 2028 }))
  })
})

describe('도시 침수', () => {
  it('고도보다 해수면이 높으면 잠기고, 방조제가 있으면 보호된다', () => {
    expect(
      cityState(tokyo, { seaLevel: 0.5, structures: [], year: 2030 }),
    ).toBe('safe')
    expect(
      cityState(tokyo, { seaLevel: 2.5, structures: [], year: 2030 }),
    ).toBe('at-risk')
    expect(cityState(tokyo, { seaLevel: 4, structures: [], year: 2030 })).toBe(
      'flooded',
    )
    const wall = [
      {
        id: 'w',
        kind: 'sea-wall' as const,
        siteId: 'tokyo',
        startYear: 2026,
        completeYear: 2029,
      },
    ]
    expect(
      cityState(tokyo, { seaLevel: 4, structures: wall, year: 2030 }),
    ).toBe('protected')
    expect(
      cityState(tokyo, { seaLevel: 9, structures: wall, year: 2030 }),
    ).toBe('flooded')
  })

  it('북해 댐은 암스테르담을 지킨다', () => {
    const dam = [
      {
        id: 'd',
        kind: 'strait-dam' as const,
        siteId: 'north-sea',
        startYear: 2026,
        completeYear: 2030,
      },
    ]
    expect(
      cityState(amsterdam, { seaLevel: 20, structures: dam, year: 2031 }),
    ).toBe('protected')
    expect(
      cityState(amsterdam, { seaLevel: 20, structures: dam, year: 2029 }),
    ).toBe('flooded')
  })
})

describe('침수 면적', () => {
  it('고도 격자에서 누적 면적을 계산한다', () => {
    // 적도 근처 한 줄: 육지 4칸(0, 10, 50, 300m), 바다 4칸
    const grid = new Int16Array([
      0, 10, 50, 1205, -32768, -32768, -32768, -32768,
    ])
    const curve = buildFloodCurve(grid, 8, 1)
    expect(floodedArea(curve, 0)).toBe(0)
    const at20 = floodedArea(curve, 20)
    expect(at20 / 148_940_000).toBeCloseTo(0.5)
    expect(floodedArea(curve, 100) / 148_940_000).toBeCloseTo(0.75)
  })
})

describe('화산', () => {
  it('감압 시추는 VEI를 2단계 낮춘다', () => {
    const relief = [
      {
        id: 'm',
        kind: 'magma-relief' as const,
        siteId: 'baekdu',
        startYear: 2026,
        completeYear: 2027,
      },
    ]
    expect(effectiveVei('baekdu', 7, relief, 2028)).toBe(5)
    expect(effectiveVei('fuji', 7, relief, 2028)).toBe(7)
  })

  it('큰 분화는 지구 기온을 낮췄다가 회복된다', () => {
    const base = { year: 2030, scenario: 'mid' as const, structures: [] }
    const eruption = {
      id: 'e',
      volcanoId: 'tambora',
      requestedVei: 7,
      vei: 7,
      year: 2030,
      startedAt: 0,
      ashRadiusKm: 1500,
      affectedCityIds: [],
    }
    expect(warming({ ...base, eruptions: [eruption] })).toBeLessThan(
      warming({ ...base, eruptions: [] }) - 0.9,
    )
    const later = { ...base, year: 2040 }
    expect(warming({ ...later, eruptions: [eruption] })).toBeCloseTo(
      warming({ ...later, eruptions: [] }),
      1,
    )
  })
})

describe('쓰나미', () => {
  it('규모가 클수록 파고가 높다', () => {
    expect(sourceWaveHeight(9)).toBeGreaterThan(sourceWaveHeight(8) * 3)
  })

  it('같은 바다의 도시에만 도달하고, 방벽이 막는다', () => {
    const impacts = tsunamiImpacts('sunda', 9.1, [], 2030)
    expect(impacts.map((i) => i.cityId)).toContain('banda-aceh')
    expect(impacts.map((i) => i.cityId)).not.toContain('tokyo')
    // 일본 열도에 가려진 동해·황해 연안은 일본 해구 쓰나미를 받지 않는다
    expect(
      tsunamiImpacts('japan-trench', 9, [], 2030).map((i) => i.cityId),
    ).not.toContain('busan')
    expect(impacts[0].cityId).toBe('banda-aceh')
    const barrier = [
      {
        id: 'b',
        kind: 'tsunami-barrier' as const,
        siteId: 'banda-aceh',
        startYear: 2026,
        completeYear: 2028,
      },
    ]
    // 규모 9.1은 15m 방벽을 넘고, 8.5는 막힌다
    expect(
      tsunamiImpacts('sunda', 9.1, barrier, 2030).find(
        (i) => i.cityId === 'banda-aceh',
      )?.outcome,
    ).toBe('hit')
    expect(
      tsunamiImpacts('sunda', 8.5, barrier, 2030).find(
        (i) => i.cityId === 'banda-aceh',
      )?.outcome,
    ).toBe('blocked')
  })
})

describe('기후·날씨 표현', () => {
  it('더워지면 해빙과 적설선이 극 쪽으로 물러난다', () => {
    const cool = climateVisuals({
      year: 2030,
      scenario: 'low',
      structures: [],
      eruptions: [],
    })
    const hot = climateVisuals({
      year: 2150,
      scenario: 'high',
      structures: [],
      eruptions: [],
    })
    expect(hot.seaIceLatN).toBeGreaterThan(cool.seaIceLatN)
    expect(hot.aridity).toBeGreaterThan(cool.aridity)
  })

  it('열대 저기압이 생기고 이동하며 최대 개수를 넘지 않는다', () => {
    const random = seeded(7)
    let storms = stepStorms([], 2026.6, 0.1, 1.3, random)
    expect(storms.length).toBeGreaterThan(0)
    expect(storms.length).toBeLessThanOrEqual(8)
    const first = storms[0]
    storms = stepStorms(storms, 2026.6 + 1 / 365, 1 / 365, 1.3, random)
    const moved = storms.find((s) => s.id === first.id)
    expect(moved?.lon).not.toBe(first.lon)
  })
})

describe('시각', () => {
  it('시작 시각은 UTC 03시이고, 시각만 바꿀 수 있다', async () => {
    const { START_YEAR, utcHourOf, withUtcHour } = await import('./time')
    expect(utcHourOf(START_YEAR)).toBeCloseTo(3, 3)
    expect(utcHourOf(withUtcHour(START_YEAR, 18.5))).toBeCloseTo(18.5, 3)
  })
})
