import { getSite } from '../site/data'
import { ashRadiusKm } from '../world/engine'
import { cityStates } from '../world/selectors'
import { useWorld } from '../world/store'
import type {
  Eruption,
  Impact,
  Quake,
  SolarLevel,
  SolarStorm,
  Storm,
  Tsunami,
  WorldState,
} from '../world/types'
import { flightPlan, laneStatus, trafficConditions } from './disruption'
import { FLIGHT_ROUTES, SEA_LANES } from './routes'
import { makePath, nearestOnPath, peakLatitude } from './sphere'

const NOW = 500_000

function world(patch: Partial<WorldState> = {}): WorldState {
  useWorld.getState().reset()
  return { ...useWorld.getState(), ...patch }
}

const route = (id: string) => FLIGHT_ROUTES.find((r) => r.id === id)!
const lane = (id: string) => SEA_LANES.find((l) => l.id === id)!
const ends = (id: string) => [getSite(route(id).from)!, getSite(route(id).to)!]

function eruption(volcanoId: string, vei: number, year: number, ago = 10_000) {
  return {
    id: 'e1',
    volcanoId,
    requestedVei: vei,
    vei,
    year,
    startedAt: NOW - ago,
    ashRadiusKm: ashRadiusKm(vei),
    affectedCityIds: [],
  } satisfies Eruption
}

function solar(level: SolarLevel, year: number, ago = 5_000) {
  return {
    id: 's1',
    level,
    year,
    startedAt: NOW - ago,
    auroraLat: 45,
    satellitesLost: 0,
    impacts: [],
  } satisfies SolarStorm
}

describe('운항 조건', () => {
  beforeEach(() => useWorld.getState().reset())

  it('재해가 없으면 모든 노선이 정상이고 왕복선도 발사한다', () => {
    const c = trafficConditions(world(), NOW)
    for (const r of FLIGHT_ROUTES)
      expect(flightPlan(r, c).status, r.id).toBe('normal')
    for (const l of SEA_LANES)
      expect(laneStatus(l, c), l.id).toEqual({
        closedPorts: [],
        stormNear: false,
      })
    expect(c.launchHold).toBe(false)
  })

  it('아이슬란드 분화(VEI 5) 화산재를 암스테르담↔밴쿠버 편이 비켜 가고, 레이캬비크 공항이 닫힌다', () => {
    const base = world()
    const c = trafficConditions(
      { ...base, eruptions: [eruption('eyjafjallajokull', 5, base.year)] },
      NOW,
    )
    expect(c.closedAirports.has('reykjavik')).toBe(true)
    const plan = flightPlan(route('ams-yvr'), c)
    expect(plan).toMatchObject({ status: 'rerouted', cause: 'ash' })
    const [a, b] = ends('ams-yvr')
    const zone = c.ash[0]
    expect(
      nearestOnPath(makePath([a, plan.via!, b]), zone.center).km,
    ).toBeGreaterThan(zone.radiusKm)
  })

  it('화산재 구역은 분화 직후부터 다 퍼진 반지름으로 피한다 (경로가 자꾸 바뀌지 않게)', () => {
    const base = world()
    const c = trafficConditions(
      { ...base, eruptions: [eruption('eyjafjallajokull', 5, base.year, 0)] },
      NOW,
    )
    expect(c.ash[0].radiusKm).toBe(ashRadiusKm(5))
  })

  it('우회로가 다른 화산재 구역을 지나면 결항한다', () => {
    const base = world()
    const c = trafficConditions(
      { ...base, eruptions: [eruption('eyjafjallajokull', 5, base.year)] },
      NOW,
    )
    const via = flightPlan(route('ams-yvr'), c).via!
    const second = { ...c, ash: [...c.ash, { center: via, radiusKm: 10 }] }
    expect(flightPlan(route('ams-yvr'), second)).toMatchObject({
      status: 'cancelled',
      cause: 'ash',
    })
  })

  it('극항로 우회로가 화산재 구역을 지나면 결항한다', () => {
    const base = world()
    const c = trafficConditions(
      { ...base, solarStorms: [solar('carrington', base.year)] },
      NOW,
    )
    const via = flightPlan(route('icn-jfk'), c).via!
    const ashy = { ...c, ash: [{ center: via, radiusKm: 300 }] }
    expect(flightPlan(route('icn-jfk'), ashy)).toMatchObject({
      status: 'cancelled',
      cause: 'ash',
    })
  })

  it('화산재가 걷히면(화면 60초 또는 시뮬레이션 3년) 다시 정상 운항', () => {
    const base = world()
    const late = {
      ...base,
      eruptions: [eruption('eyjafjallajokull', 5, base.year, 61_000)],
    }
    expect(
      flightPlan(route('ams-yvr'), trafficConditions(late, NOW)).status,
    ).toBe('normal')
    const years = {
      ...base,
      year: base.year + 3,
      eruptions: [eruption('eyjafjallajokull', 5, base.year)],
    }
    expect(
      flightPlan(route('ams-yvr'), trafficConditions(years, NOW)).status,
    ).toBe('normal')
  })

  it('도시가 침수되면 그 도시를 오가는 편은 결항', () => {
    const state = world({ seaLevel: 10 })
    expect(cityStates(state)['new-york']).toBe('flooded')
    const c = trafficConditions(state, NOW)
    expect(flightPlan(route('lhr-jfk'), c)).toMatchObject({
      status: 'cancelled',
      cause: 'airport',
    })
    expect(c.closedPorts.has('new-york')).toBe(true)
  })

  it('캐링턴급 태양 폭풍이면 인천↔뉴욕 극항로를 남쪽으로 돌리고 왕복선 발사를 미룬다', () => {
    const base = world()
    const c = trafficConditions(
      { ...base, solarStorms: [solar('carrington', base.year)] },
      NOW,
    )
    expect(c.launchHold).toBe(true)
    const plan = flightPlan(route('icn-jfk'), c)
    expect(plan).toMatchObject({ status: 'rerouted', cause: 'solar' })
    const [a, b] = ends('icn-jfk')
    expect(peakLatitude(makePath([a, plan.via!, b]))).toBeLessThan(
      peakLatitude(makePath([a, b])) - 10,
    )
    // 극지방을 지나지 않는 노선은 그대로
    expect(flightPlan(route('sin-syd'), c).status).toBe('normal')
  })

  it('G3 태양 폭풍은 극항로를 돌리지 않고 왕복선 발사만 미루며, 폭풍이 지나면 풀린다', () => {
    const base = world()
    const c = trafficConditions(
      { ...base, solarStorms: [solar('g3', base.year)] },
      NOW,
    )
    expect(c.launchHold).toBe(true)
    expect(flightPlan(route('icn-jfk'), c).status).toBe('normal')
    const after = trafficConditions(
      { ...base, solarStorms: [solar('g3', base.year, 51_000)] },
      NOW,
    )
    expect(after.launchHold).toBe(false)
  })

  it('쓰나미가 덮친 항구는 닫히고, 마지막 도착 30초 뒤 다시 열린다', () => {
    const base = world()
    const tsunami = (ago: number): Tsunami => ({
      id: 't1',
      sourceId: 'japan-trench',
      magnitude: 9,
      year: base.year,
      startedAt: NOW - ago,
      impacts: [
        {
          cityId: 'busan',
          distanceKm: 900,
          waveHeight: 3,
          arrivalHours: 2,
          outcome: 'hit',
        },
        {
          cityId: 'shanghai',
          distanceKm: 1800,
          waveHeight: 0.5,
          arrivalHours: 4,
          outcome: 'minor',
        },
      ],
    })
    const c = trafficConditions({ ...base, tsunamis: [tsunami(1_000)] }, NOW)
    expect(c.closedPorts.has('busan')).toBe(true)
    expect(c.closedPorts.has('shanghai')).toBe(true)
    expect(c.closedAirports.has('busan')).toBe(true)
    expect(c.closedAirports.has('shanghai')).toBe(false)
    expect(laneStatus(lane('cruise-northeast-asia'), c).closedPorts).toEqual([
      'busan',
      'shanghai',
    ])
    const reopened = trafficConditions(
      { ...base, tsunamis: [tsunami(35_000)] },
      NOW,
    )
    expect(reopened.closedPorts.size).toBe(0)
  })

  it('지진으로 크게 무너진 도시만 공항이 닫힌다', () => {
    const base = world()
    const quake: Quake = {
      id: 'q1',
      faultId: 'nankai',
      magnitude: 8.5,
      year: base.year,
      startedAt: NOW - 1_000,
      severeRadiusKm: 100,
      strongRadiusKm: 300,
      impacts: [
        { cityId: 'tokyo', distanceKm: 50, outcome: 'severe' },
        { cityId: 'osaka', distanceKm: 250, outcome: 'moderate' },
      ],
    }
    const c = trafficConditions({ ...base, quakes: [quake] }, NOW)
    expect(flightPlan(route('hnd-sfo'), c).status).toBe('cancelled')
    expect(c.closedAirports.has('osaka')).toBe(false)
  })

  it('소행성 피해 도시는 공항·항구가 닫힌다', () => {
    const base = world()
    const impact: Impact = {
      id: 'i1',
      targetId: 'singapore',
      diameterM: 200,
      effectiveDiameterM: 200,
      year: base.year,
      startedAt: NOW - 1_000,
      energyMt: 500,
      blastRadiusKm: 30,
      thermalRadiusKm: 60,
      ocean: false,
      affectedCityIds: ['singapore'],
    }
    const c = trafficConditions({ ...base, impacts: [impact] }, NOW)
    expect(flightPlan(route('sin-syd'), c).status).toBe('cancelled')
    expect(laneStatus(lane('container-asia'), c).closedPorts).toEqual([
      'singapore',
    ])
  })

  it('태풍이 바닷길 가까이 있으면 그 바닷길에만 알린다', () => {
    const base = world()
    const storm: Storm = {
      id: 'st1',
      lat: 23.0,
      lon: 133.0,
      category: 4,
      bornYear: base.year,
      lifeDays: 10,
      hemisphere: 1,
    }
    const c = trafficConditions({ ...base, storms: [storm] }, NOW)
    expect(laneStatus(lane('carrier-west-pacific'), c).stormNear).toBe(true)
    expect(laneStatus(lane('cruise-mediterranean'), c).stormNear).toBe(false)
  })
})
