import { decimalYearToDate } from '@/shared/lib'
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
    expect(first.events[0].text.ko).toContain('마닐라에 상륙')
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
    expect(s.events.some((e) => e.text.ko.startsWith('미션 실패'))).toBe(true)
    // 늦추기를 표시하지 않은 사건은 재생 속도를 바꾸지 않음
    expect(s.speed).toBe('decade')
  })

  it('행성 방위 요격망을 바로 지으면 소행성 미션에 성공한다', () => {
    useWorld.getState().startMission('asteroid-2032')
    expect(useWorld.getState().build('planetary-defense', 'orbit').ok).toBe(
      true,
    )
    runUntil(2040)
    expect(useWorld.getState().mission?.status).toBe('success')
    expect(
      MISSION_BY_ID['asteroid-2032'].evaluate(useWorld.getState()).detail.ko,
    ).toContain('빗나가게')
  })
})

describe('태양 폭풍 미션', () => {
  beforeEach(() => useWorld.getState().reset())

  const solar = MISSION_BY_ID['solar-2031']

  /** 폭풍 때 1일 속도로 늦춰지면 다시 10년 속도로 올리는 사용자처럼 진행 */
  const runFast = (until: number, { stopWhenSlowed = false } = {}) => {
    const slowedAt: number[] = []
    useWorld.getState().setRunning(true)
    let guard = 0
    while (
      useWorld.getState().running &&
      useWorld.getState().year < until &&
      guard++ < 10000
    ) {
      useWorld.getState().setSpeed('decade')
      useWorld.getState().tick(0.1)
      if (useWorld.getState().speed === 'day') {
        slowedAt.push(useWorld.getState().year)
        if (stopWhenSlowed) break
      }
    }
    return slowedAt
  }

  it('경보망 없이 진행하면 변압기가 타고 위성을 잃어 실패한다', () => {
    useWorld.getState().startMission('solar-2031')
    expect(useWorld.getState().budget).toBe(200)
    runFast(2040)
    const s = useWorld.getState()
    expect(s.solarStorms.map((x) => x.level)).toEqual([
      'g4',
      'g5',
      'carrington',
    ])
    expect(s.mission?.status).toBe('failed')
    expect(s.gridDamagedCityIds).toContain('reykjavik')
    expect(s.satellitesLost).toBe(5 + 40 + 600)
  })

  it('예정된 폭풍마다 1일 속도로 늦추고 미션 사건 기록에 알린다', () => {
    useWorld.getState().startMission('solar-2031')
    expect(runFast(2040)).toHaveLength(3)
    const notices = useWorld
      .getState()
      .events.filter((e) => e.text.ko.startsWith('미션 사건'))
    expect(notices).toHaveLength(3)
    for (const e of notices) {
      expect(e.text.ko).toContain('1일 속도로 늦춥니다')
      expect(e.text.en).toContain('1 day per second')
    }
  })

  it('시간이 빨리 흘러도 미션 사건은 정해진 날에 일어난다', () => {
    useWorld.getState().startMission('solar-2031')
    runFast(2040)
    // 1일 속도로 늦출 때 시각은 고정해 둔 시각으로 맞춰지므로(낮·밤 깜빡임 방지) 날짜만 비교
    const day = (y: number) => decimalYearToDate(y).toISOString().slice(0, 10)
    expect(useWorld.getState().solarStorms.map((x) => day(x.year))).toEqual([
      '2027-05-10',
      '2030-07-23',
      '2031-09-01',
    ])
  })

  it('이미 1일보다 느리면 미션 사건이 와도 속도를 바꾸지 않는다', () => {
    useWorld.getState().startMission('solar-2031')
    useWorld.setState({ year: solar.schedule[0].year - 1e-7 })
    useWorld.getState().setSpeed('hour')
    useWorld.getState().setRunning(true)
    useWorld.getState().tick(0.1)
    expect(useWorld.getState().solarStorms).toHaveLength(1)
    expect(useWorld.getState().speed).toBe('hour')
  })

  it('우주 기상 경보망을 바로 지으면 성공한다', () => {
    useWorld.getState().startMission('solar-2031')
    expect(useWorld.getState().build('space-weather-shield', 'orbit').ok).toBe(
      true,
    )
    runFast(2040)
    const s = useWorld.getState()
    expect(s.mission?.status).toBe('success')
    expect(s.gridDamagedCityIds).toEqual([])
    expect(s.satellitesLost).toBe(5 + 20 + 300)
    expect(solar.evaluate(s).detail.ko).toContain('고장 위성 325기')
  })

  it('첫 폭풍(G4)을 겪고 나서 경보망을 지어도 G5 전에 완공돼 성공한다', () => {
    useWorld.getState().startMission('solar-2031')
    runFast(2040, { stopWhenSlowed: true })
    expect(useWorld.getState().solarStorms.map((x) => x.level)).toEqual(['g4'])
    expect(useWorld.getState().build('space-weather-shield', 'orbit').ok).toBe(
      true,
    )
    runFast(2040)
    expect(useWorld.getState().mission?.status).toBe('success')
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
