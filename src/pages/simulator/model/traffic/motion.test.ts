import { distanceKm, vector3ToLatLon } from '@/shared/lib'
import type { Vec3 } from '@/shared/lib'
import { ashRadiusKm } from '../world/engine'
import { useWorld } from '../world/store'
import type { Quake, Storm, WorldState } from '../world/types'
import {
  CRUISE_ALTITUDE,
  createTraffic,
  fighterPose,
  newPose,
  planePose,
  planeTrail,
  shipPose,
  shuttlePose,
  stepTraffic,
} from './motion'
import type { Traffic } from './motion'
import { pointAt } from './sphere'

function world(patch: Partial<WorldState> = {}): WorldState {
  useWorld.getState().reset()
  return { ...useWorld.getState(), ...patch }
}

/** seconds초 동안 0.1초씩 움직이고 마지막 시각(ms)을 돌려줌 */
function run(traffic: Traffic, w: WorldState, seconds: number, fromMs = 0) {
  let now = fromMs
  for (let i = 0; i < Math.round(seconds * 10); i++) {
    now += 100
    stepTraffic(traffic, w, now, 0.1)
  }
  return now
}

const gap = (a: Vec3, b: Vec3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const km = (a: Vec3, b: Vec3) =>
  distanceKm(vector3ToLatLon(a), vector3ToLatLon(b))

describe('운항 움직임', () => {
  beforeEach(() => useWorld.getState().reset())

  it('여객기 30대·배 11척·전투기 4대를 만든다', () => {
    const traffic = createTraffic()
    expect(traffic.planes).toHaveLength(30)
    expect(traffic.ships).toHaveLength(11)
    expect(traffic.fighters).toHaveLength(4)
  })

  it('여객기는 노선을 따라 움직이고, 순항 중에는 구름층(1.012) 위를 난다', () => {
    const traffic = createTraffic()
    const w = world()
    const now = run(traffic, w, 0.5)
    const flying = traffic.planes.find(
      (p) => planePose(p, newPose()).scale === 1,
    )!
    const before = [...planePose(flying, newPose()).position] as Vec3
    run(traffic, w, 1, now)
    const after = planePose(flying, newPose())
    expect(gap(before, after.position)).toBeGreaterThan(0.005)
    const cruising = traffic.planes
      .map((p) => planePose(p, newPose()))
      .filter((pose) => pose.scale === 1)
      .map((pose) => Math.hypot(...pose.position))
    expect(Math.max(...cruising)).toBeCloseTo(1 + CRUISE_ALTITUDE, 3)
    expect(Math.min(...cruising)).toBeGreaterThan(1.012)
  })

  it('dt가 0이면(동작 줄이기) 아무것도 움직이지 않는다', () => {
    const traffic = createTraffic()
    const w = world()
    run(traffic, w, 0.5)
    const snapshot = () => [
      ...traffic.planes.map((p) => planePose(p, newPose()).position.join()),
      ...traffic.ships.map((s) => shipPose(s, newPose()).position.join()),
    ]
    const before = snapshot()
    for (let i = 0; i < 20; i++) stepTraffic(traffic, w, 1_000 + i * 100, 0)
    expect(snapshot()).toEqual(before)
  })

  it('동작 줄이기(dt 0)에서도 결항은 바로 숨기고, 풀리면 바로 다시 보인다', () => {
    const traffic = createTraffic()
    const toNewYork = traffic.planes.filter(
      (p) => p.route.from === 'new-york' || p.route.to === 'new-york',
    )
    stepTraffic(traffic, world({ seaLevel: 10 }), 100, 0)
    expect(toNewYork.every((p) => p.visible === 0)).toBe(true)
    stepTraffic(traffic, world(), 400, 0)
    expect(toNewYork.every((p) => p.visible === 1)).toBe(true)
  })

  it('공항이 닫히면 그 노선 여객기는 1초 남짓 만에 모두 사라진다', () => {
    const traffic = createTraffic()
    run(traffic, world({ seaLevel: 10 }), 1.5)
    const toNewYork = traffic.planes.filter(
      (p) => p.route.from === 'new-york' || p.route.to === 'new-york',
    )
    expect(toNewYork.length).toBeGreaterThan(0)
    for (const p of toNewYork) {
      expect(planePose(p, newPose()).scale).toBe(0)
      expect(planeTrail(p, [[0, 0, 0]])).toBe(0)
    }
  })

  it('화산재 우회가 정해지면 1.5초에 걸쳐 새 경로로 옮겨 간다', () => {
    const traffic = createTraffic()
    const base = world()
    const w = {
      ...base,
      eruptions: [
        {
          id: 'e1',
          volcanoId: 'eyjafjallajokull',
          requestedVei: 5,
          vei: 5,
          year: base.year,
          startedAt: 0,
          ashRadiusKm: ashRadiusKm(5),
          affectedCityIds: [],
        },
      ],
    }
    run(traffic, w, 0.5)
    const plane = traffic.planes.find((p) => p.route.id === 'ams-yvr')!
    expect(plane.path.points).toHaveLength(3)
    expect(plane.blend).toBeLessThan(1)
    run(traffic, w, 1.5, 500)
    expect(plane.blend).toBe(1)
  })

  it('태풍이 바닷길 앞에 있으면 배는 태풍 반경 안으로 들어가지 않는다', () => {
    const traffic = createTraffic()
    const base = world()
    const index = traffic.ships.findIndex(
      (s) => s.lane.id === 'carrier-west-pacific',
    )
    const carrier = traffic.ships[index]
    // 지금 자리에서 바닷길을 따라 약 1,000km 앞에 태풍(3등급, 반경 540km)
    const ahead = vector3ToLatLon(
      pointAt(carrier.path, (carrier.s + 0.157 / carrier.path.length) % 1),
    )
    const storm: Storm = {
      id: 'st1',
      lat: ahead.lat,
      lon: ahead.lon,
      category: 3,
      bornYear: base.year,
      lifeDays: 365,
      hemisphere: 1,
    }
    const w = { ...base, storms: [storm] }
    const stormAt = (pose: ReturnType<typeof shipPose>) =>
      distanceKm(vector3ToLatLon(pose.position), storm)
    expect(stormAt(shipPose(traffic.ships[index], newPose()))).toBeGreaterThan(
      540,
    )
    let nearest = Infinity
    let now = 0
    for (let i = 0; i < 120; i++) {
      now = run(traffic, w, 1, now)
      nearest = Math.min(
        nearest,
        stormAt(shipPose(traffic.ships[index], newPose())),
      )
    }
    expect(nearest).toBeGreaterThan(540 * 0.97)
    expect(traffic.ships[index].holding).toBe(true)
  })

  it('태풍을 빠져나갈 때 바로 옆의 다른 태풍으로 들어가지 않는다', () => {
    const traffic = createTraffic()
    const base = world()
    const index = traffic.ships.findIndex(
      (s) => s.lane.id === 'carrier-west-pacific',
    )
    const ship = traffic.ships[index]
    const here = vector3ToLatLon(pointAt(ship.path, ship.s))
    const bCenter = vector3ToLatLon(pointAt(ship.path, (ship.s + 0.2) % 1))
    // B 가장자리가 배에서 5km 앞 (반지름 300 + 80 × 등급)
    const radiusB = distanceKm(here, bCenter) - 5
    const storm = (
      id: string,
      lat: number,
      lon: number,
      category: number,
    ): Storm => ({
      id,
      lat,
      lon,
      category,
      bornYear: base.year,
      lifeDays: 365,
      hemisphere: 1,
    })
    const w = {
      ...base,
      storms: [
        storm('a', here.lat, here.lon, 3),
        storm('b', bCenter.lat, bCenter.lon, (radiusB - 300) / 80),
      ],
    }
    let nearestB = Infinity
    let now = 0
    for (let i = 0; i < 30; i++) {
      now = run(traffic, w, 0.1, now)
      nearestB = Math.min(
        nearestB,
        distanceKm(
          vector3ToLatLon(shipPose(ship, newPose()).position),
          bCenter,
        ),
      )
    }
    expect(nearestB).toBeGreaterThan(radiusB)
  })

  it('태풍을 피하다가 닫힌 항구를 지나치지 않는다', () => {
    const traffic = createTraffic()
    const base = world()
    const ship = traffic.ships.find(
      (s) => s.lane.id === 'cruise-northeast-asia',
    )!
    const jeju = ship.portS.find((p) => p.cityId === 'jeju')!.s
    // 제주 약 30km 앞에서 제주 쪽으로 가는 중, 뒤쪽에 태풍(배가 반경 안)
    ship.s = jeju - 30 / 6371 / ship.path.length
    ship.dir = 1
    const behind = vector3ToLatLon(pointAt(ship.path, ship.s - 0.15))
    const w = {
      ...base,
      storms: [
        {
          id: 'st',
          lat: behind.lat,
          lon: behind.lon,
          category: 1,
          bornYear: base.year,
          lifeDays: 365,
          hemisphere: 1 as const,
        },
      ],
      quakes: [
        {
          id: 'q1',
          faultId: 'jeju',
          magnitude: 7,
          year: base.year,
          startedAt: 0,
          severeRadiusKm: 50,
          strongRadiusKm: 150,
          impacts: [
            { cityId: 'jeju', distanceKm: 10, outcome: 'severe' as const },
          ],
        },
      ],
    }
    run(traffic, w, 3)
    expect(ship.s).toBeLessThanOrEqual(jeju)
  })

  it('기항지가 닫히면 그 항구에 닿기 전에 기다리고, 열려 있으면 지나간다', () => {
    const jejuS = (traffic: Traffic) => {
      const ship = traffic.ships.find(
        (s) => s.lane.id === 'cruise-northeast-asia',
      )!
      return { ship, port: ship.portS.find((p) => p.cityId === 'jeju')!.s }
    }
    const base = world()
    const quake = (startedAt: number): Quake => ({
      id: 'q1',
      faultId: 'jeju',
      magnitude: 7,
      year: base.year,
      startedAt,
      severeRadiusKm: 50,
      strongRadiusKm: 150,
      impacts: [{ cityId: 'jeju', distanceKm: 10, outcome: 'severe' }],
    })
    const closed = createTraffic()
    run(closed, { ...base, quakes: [quake(0)] }, 30)
    const held = jejuS(closed)
    expect(held.ship.s).toBeLessThan(held.port)
    const open = createTraffic()
    run(open, base, 30)
    const passed = jejuS(open)
    expect(passed.ship.s).toBeGreaterThan(passed.port)
  })

  it('태양 폭풍 중에는 우주왕복선이 발사대에서 기다린다', () => {
    const base = world()
    const storm = {
      id: 's1',
      level: 'g3' as const,
      year: base.year,
      startedAt: 0,
      auroraLat: 50,
      satellitesLost: 0,
      impacts: [],
    }
    const held = createTraffic()
    held.shuttle = { phase: 'pad', t: 0 }
    run(held, { ...base, solarStorms: [storm] }, 20)
    expect(held.shuttle.phase).toBe('pad')
    expect(shuttlePose(held.shuttle, newPose()).stacked).toBe(true)
    const calm = createTraffic()
    calm.shuttle = { phase: 'pad', t: 0 }
    run(calm, base, 20)
    expect(calm.shuttle.phase).not.toBe('pad')
  })

  it('우주왕복선은 궤도를 돌고 발사대(케네디)로 돌아온다', () => {
    const traffic = createTraffic()
    traffic.shuttle = { phase: 'pad', t: 0 }
    const pad = [
      ...shuttlePose(traffic.shuttle, newPose()).pose.position,
    ] as Vec3
    const w = world()
    let now = 0
    const phases = new Set<string>()
    let highest = 0
    for (let i = 0; i < 90; i++) {
      now = run(traffic, w, 1, now)
      phases.add(traffic.shuttle.phase)
      const { pose } = shuttlePose(traffic.shuttle, newPose())
      highest = Math.max(highest, Math.hypot(...pose.position))
    }
    expect([...phases]).toEqual(
      expect.arrayContaining(['launch', 'orbit', 'landing', 'runway', 'pad']),
    )
    expect(highest).toBeGreaterThan(1.05)
    expect(
      km(pad, shuttlePose({ phase: 'runway', t: 0 }, newPose()).pose.position),
    ).toBeLessThan(50)
  })

  it('전투기는 항공모함 둘레 300km 안을 돈다', () => {
    const traffic = createTraffic()
    run(traffic, world(), 5)
    traffic.fighters.forEach((fighter, i) => {
      const jet = fighterPose(traffic, i, newPose())
      const carrier = shipPose(traffic.ships[fighter.carrier], newPose())
      expect(km(jet.position, carrier.position)).toBeLessThan(300)
      expect(Math.hypot(...jet.position)).toBeGreaterThan(1.012)
    })
  })
})
