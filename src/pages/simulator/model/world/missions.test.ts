import { CITIES } from '../site/data'
import { recordHistory, stormLandfalls, stormSurge } from './engine'
import { MISSION_BY_ID } from './missions'
import { useWorld } from './store'

const manila = CITIES.find((c) => c.id === 'manila')!

describe('열대 저기압 상륙', () => {
  const storm = (category: number) => ({
    id: 's',
    lat: manila.lat,
    lon: manila.lon,
    category,
    bornYear: 2030,
    lifeDays: 8,
    hemisphere: 1 as const,
  })

  it('3등급 이상이 해안 도시를 지나면 해일 피해, 같은 폭풍은 한 번만 센다', () => {
    const first = stormLandfalls([storm(4)], {
      seaLevel: 0,
      structures: [],
      year: 2030,
    })
    expect(first.damaged).toBe(1)
    expect(first.events[0].text).toContain('마닐라에 상륙')
    const again = stormLandfalls(first.storms, {
      seaLevel: 0,
      structures: [],
      year: 2030,
    })
    expect(again.damaged).toBe(0)
  })

  it('약한 폭풍은 피해가 없고, 방조제는 해일을 막는다', () => {
    expect(
      stormLandfalls([storm(2)], { seaLevel: 0, structures: [], year: 2030 })
        .damaged,
    ).toBe(0)
    const wall = [
      {
        id: 'w',
        kind: 'sea-wall' as const,
        siteId: 'manila',
        startYear: 2026,
        completeYear: 2027,
      },
    ]
    const blocked = stormLandfalls([storm(5)], {
      seaLevel: 0,
      structures: wall,
      year: 2030,
    })
    expect(stormSurge(5)).toBeLessThan(8)
    expect(blocked.damaged).toBe(0)
    expect(blocked.events[0].tone).toBe('good')
  })
})

describe('추이 기록', () => {
  it('0.1년 간격으로 기록하고 400개를 넘으면 솎아 낸다', () => {
    let h = recordHistory([], {
      year: 2030,
      seaLevel: 0,
      warming: 1,
      floodedCities: 0,
    })
    h = recordHistory(h, {
      year: 2030.05,
      seaLevel: 0,
      warming: 1,
      floodedCities: 0,
    })
    expect(h).toHaveLength(1)
    for (let i = 1; i <= 450; i++)
      h = recordHistory(h, {
        year: 2030 + i * 0.1,
        seaLevel: i,
        warming: 1,
        floodedCities: 0,
      })
    expect(h.length).toBeLessThanOrEqual(400)
    expect(h.at(-1)?.seaLevel).toBe(450)
  })
})

describe('미션', () => {
  beforeEach(() => useWorld.getState().reset())

  const runUntil = (year: number) => {
    useWorld.getState().setSpeed('decade')
    useWorld.getState().setRunning(true)
    let guard = 0
    while (
      useWorld.getState().running &&
      useWorld.getState().year < year &&
      guard++ < 10000
    ) {
      useWorld.getState().tick(0.1)
    }
  }

  it('미션을 시작하면 시나리오·예산이 바뀌고 기록이 처음부터 쌓인다', () => {
    useWorld.getState().setSeaLevel(30)
    useWorld.getState().startMission('coast-2100')
    const s = useWorld.getState()
    expect(s.scenario).toBe('extreme')
    expect(s.budget).toBe(400)
    expect(s.seaLevel).toBeLessThan(1)
    expect(s.mission).toMatchObject({ id: 'coast-2100', status: 'active' })
    expect(s.history).toHaveLength(1)
  })

  it('요격망 없이 소행성 미션을 진행하면 실패하고 시간이 멈춘다', () => {
    useWorld.getState().startMission('asteroid-2032')
    runUntil(2040)
    const s = useWorld.getState()
    expect(s.mission?.status).toBe('failed')
    expect(s.running).toBe(false)
    expect(s.impacts[0].targetId).toBe('tokyo')
    expect(s.events.some((e) => e.text.startsWith('미션 실패'))).toBe(true)
  })

  it('행성 방위 요격망을 바로 지으면 소행성 미션에 성공한다', () => {
    useWorld.getState().startMission('asteroid-2032')
    expect(useWorld.getState().build('planetary-defense', 'orbit').ok).toBe(
      true,
    )
    runUntil(2040)
    expect(useWorld.getState().mission?.status).toBe('success')
    expect(
      MISSION_BY_ID['asteroid-2032'].evaluate(useWorld.getState()).detail,
    ).toContain('빗나가게')
  })
})

describe('미션 규칙', () => {
  beforeEach(() => useWorld.getState().reset())

  it('미션 중에는 바로 완공이 적용되지 않는다', () => {
    useWorld.getState().startMission('coast-2100')
    useWorld.getState().build('sea-wall', 'manila', { instant: true })
    const wall = useWorld.getState().structures[0]
    expect(wall.completeYear).toBeCloseTo(wall.startYear + 3)
  })
})
