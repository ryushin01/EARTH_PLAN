import { CITIES, getSite } from '../site/data'
import { ashRadiusKm } from '../world/engine'
import { ashCloud, solarFade } from '../world/fade'
import { cityStates } from '../world/selectors'
import type { SolarLevel, WorldState } from '../world/types'
import { DAYS_PER_YEAR, distanceKm } from '@/shared/lib'
import type { LatLon } from '@/shared/lib'
import type { FlightRoute, SeaLane } from './routes'
import {
  detourAround,
  makePath,
  nearestOnPath,
  peakLatitude,
  peakPoint,
} from './sphere'
import type { Path } from './sphere'

/** 재해 → 운항 조건. 재해 화면 효과와 같은 시간 창을 씁니다(화면 초와 시뮬레이션 시간 중 먼저 끝나는 쪽). */

export interface Zone {
  center: LatLon
  radiusKm: number
}

export interface TrafficConditions {
  /** 닫힌 공항(도시 id) */
  closedAirports: ReadonlySet<string>
  /** 닫힌 항구(도시 id) */
  closedPorts: ReadonlySet<string>
  /** 비행기가 비켜 가는 화산재 구역 */
  ash: Zone[]
  /** 배가 피하는 열대 저기압 구역 */
  storms: Zone[]
  /** 강한 태양 폭풍(G4 이상): 극항로를 남쪽으로 돌림 */
  polarReroute: boolean
  /** 태양 폭풍 중: 우주왕복선 발사를 미룸 */
  launchHold: boolean
}

export type TrafficWorld = Pick<
  WorldState,
  | 'year'
  | 'seaLevel'
  | 'structures'
  | 'eruptions'
  | 'tsunamis'
  | 'impacts'
  | 'quakes'
  | 'solarStorms'
  | 'storms'
>

/** 지진으로 닫힌 공항·항구가 다시 열리기까지 (화면 초 / 시뮬레이션 년) */
const QUAKE_CLOSURE = { seconds: 40, years: 0.05 }
/** 소행성 피해 도시 */
const IMPACT_CLOSURE = { seconds: 60, years: 1 }
/** 쓰나미: 경보부터 마지막 도착 뒤 이만큼(화면 1초 = 쓰나미 1시간) */
const TSUNAMI_CLOSURE = { afterArrivalSeconds: 30, years: 0.05 }
/** 화산재가 이보다 옅으면 비행기가 그대로 지남 */
const ASH_MIN_AMOUNT = 0.05
const POLAR_LEVELS: readonly SolarLevel[] = ['g4', 'g5', 'carrington']
/** 이 위도(°)보다 높이 지나는 노선이 극항로 */
export const POLAR_LIMIT_LAT = 60
/** 극항로를 돌릴 때 지나는 위도(°) */
const POLAR_DETOUR_LAT = 50

/** 배가 피하는 열대 저기압 반지름 (km) */
export function stormRadiusKm(category: number): number {
  return 300 + 80 * category
}

function within(
  startedAt: number,
  year: number,
  nowMs: number,
  seconds: number,
  stateYear: number,
  years: number,
): boolean {
  const age = Math.max(0, (nowMs - startedAt) / 1000)
  return age < seconds && stateYear - year < years
}

export function trafficConditions(
  state: TrafficWorld,
  nowMs: number,
): TrafficConditions {
  const airports = new Set<string>()
  const ports = new Set<string>()
  const closeBoth = (id: string) => {
    airports.add(id)
    ports.add(id)
  }

  // 해수면으로 잠긴 도시
  for (const [id, cityState] of Object.entries(cityStates(state)))
    if (cityState === 'flooded') closeBoth(id)

  // 화산재: 구름 안 공항은 닫고, 구름은 비켜 감
  const ash: Zone[] = []
  for (const e of state.eruptions) {
    const volcano = getSite(e.volcanoId)
    const cloud = ashCloud(e, state.year, nowMs)
    if (!volcano || !cloud || cloud.amount < ASH_MIN_AMOUNT) continue
    // 화면의 구름은 몇 초에 걸쳐 퍼지지만, 비행기는 처음부터 다 퍼질 범위를 피함
    const zone = { center: volcano, radiusKm: ashRadiusKm(e.vei) }
    ash.push(zone)
    for (const city of CITIES)
      if (distanceKm(city, zone.center) < zone.radiusKm) airports.add(city.id)
  }

  for (const q of state.quakes)
    if (
      within(
        q.startedAt,
        q.year,
        nowMs,
        QUAKE_CLOSURE.seconds,
        state.year,
        QUAKE_CLOSURE.years,
      )
    )
      for (const impact of q.impacts)
        if (impact.outcome === 'severe') closeBoth(impact.cityId)

  for (const t of state.tsunamis) {
    const lastArrival = Math.max(0, ...t.impacts.map((i) => i.arrivalHours))
    const seconds = lastArrival + TSUNAMI_CLOSURE.afterArrivalSeconds
    if (
      !within(
        t.startedAt,
        t.year,
        nowMs,
        seconds,
        state.year,
        TSUNAMI_CLOSURE.years,
      )
    )
      continue
    for (const impact of t.impacts) {
      if (impact.outcome === 'hit') closeBoth(impact.cityId)
      else if (impact.outcome === 'minor') ports.add(impact.cityId)
    }
  }

  for (const i of state.impacts)
    if (
      within(
        i.startedAt,
        i.year,
        nowMs,
        IMPACT_CLOSURE.seconds,
        state.year,
        IMPACT_CLOSURE.years,
      )
    )
      for (const id of i.affectedCityIds) closeBoth(id)

  const storms = state.storms
    .filter((s) => (state.year - s.bornYear) * DAYS_PER_YEAR < s.lifeDays)
    .map((s) => ({
      center: { lat: s.lat, lon: s.lon },
      radiusKm: stormRadiusKm(s.category),
    }))

  const solar = state.solarStorms.at(-1)
  const solarActive = !!solar && solarFade(solar, state.year, nowMs) > 0

  return {
    closedAirports: airports,
    closedPorts: ports,
    ash,
    storms,
    polarReroute: solarActive && POLAR_LEVELS.includes(solar.level),
    launchHold: solarActive,
  }
}

export type FlightStatus = 'normal' | 'rerouted' | 'cancelled'
export type FlightCause = 'airport' | 'ash' | 'solar'

export interface FlightPlan {
  status: FlightStatus
  /** 우회할 때 지나는 점 */
  via?: LatLon
  cause?: FlightCause
}

const flightPaths = new Map<string, Path>()

/** 노선 양 끝 (도시 좌표) */
export function routeEnds(route: FlightRoute): [LatLon, LatLon] {
  const from = getSite(route.from)
  const to = getSite(route.to)
  if (!from || !to) throw new Error(`없는 도시: ${route.id}`)
  return [from, to]
}

/** 노선의 기본 대권 경로 (한 번 만들어 둠) */
export function routePath(route: FlightRoute): Path {
  let path = flightPaths.get(route.id)
  if (!path) {
    path = makePath(routeEnds(route))
    flightPaths.set(route.id, path)
  }
  return path
}

/** 경로가 어느 화산재 구역이든 지나는지 */
function crossesAsh(path: Path, ash: readonly Zone[]): boolean {
  return ash.some((zone) => nearestOnPath(path, zone.center).km < zone.radiusKm)
}

/** 우회로가 다른 화산재 구역도 피하면 우회, 아니면 결항(안전한 하늘길이 없음) */
function divert(
  a: LatLon,
  b: LatLon,
  via: LatLon,
  cause: FlightCause,
  ash: readonly Zone[],
): FlightPlan {
  return crossesAsh(makePath([a, via, b]), ash)
    ? { status: 'cancelled', cause: 'ash' }
    : { status: 'rerouted', via, cause }
}

export function flightPlan(
  route: FlightRoute,
  c: TrafficConditions,
): FlightPlan {
  if (c.closedAirports.has(route.from) || c.closedAirports.has(route.to))
    return { status: 'cancelled', cause: 'airport' }
  const [a, b] = routeEnds(route)
  const path = routePath(route)
  const zone = c.ash.find((z) => nearestOnPath(path, z.center).km < z.radiusKm)
  if (zone)
    return divert(
      a,
      b,
      detourAround(a, b, zone.center, zone.radiusKm),
      'ash',
      c.ash,
    )
  if (c.polarReroute && peakLatitude(path) > POLAR_LIMIT_LAT) {
    const peak = peakPoint(path)
    const via = { lat: Math.sign(peak.lat) * POLAR_DETOUR_LAT, lon: peak.lon }
    return divert(a, b, via, 'solar', c.ash)
  }
  return { status: 'normal' }
}

const lanePaths = new Map<string, Path>()

/** 바닷길 경로 (한 번 만들어 둠) */
export function lanePath(lane: SeaLane): Path {
  let path = lanePaths.get(lane.id)
  if (!path) {
    path = makePath(lane.waypoints, lane.loop)
    lanePaths.set(lane.id, path)
  }
  return path
}

export interface LaneStatus {
  /** 닫힌 기항지(도시 id) */
  closedPorts: string[]
  /** 열대 저기압이 바닷길 가까이 있음 */
  stormNear: boolean
}

export function laneStatus(lane: SeaLane, c: TrafficConditions): LaneStatus {
  const path = lanePath(lane)
  return {
    closedPorts: lane.ports
      .filter((p) => c.closedPorts.has(p.cityId))
      .map((p) => p.cityId),
    stormNear: c.storms.some(
      (zone) => nearestOnPath(path, zone.center).km < zone.radiusKm,
    ),
  }
}
