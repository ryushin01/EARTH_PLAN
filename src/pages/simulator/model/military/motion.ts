import { kmToRadians } from '@/shared/lib'
import type { LatLon, Vec3 } from '@/shared/lib'
import { headingAt, makePath, pointAt } from '../traffic/sphere'
import type { Path } from '../traffic/sphere'
import type { Pose } from '../traffic/motion'
import {
  FLIGHT_FORMATIONS,
  blendOffsets,
  drillPhase,
  fleetSlots,
} from './formation'
import type {
  DrillPhase,
  FleetFormation,
  FlightFormation,
  Offset,
} from './formation'
import {
  EARTH_RADIUS_KM,
  displayRadius,
  orbitState,
  radiusOf,
  toScene,
} from './orbit'
import type { OrbitState } from './orbit'
import type { Satellite } from './satellites'
import type { Fleet, Flight, Racetrack } from './units'

/**
 * 위성·편대·함대의 움직임. 위치·속도는 실제 단위(km, 초)로 계산하고, 화면 1초를 실제 몇 초로 칠지(시간 압축)와
 * 대형 간격·고도를 보이게 키운 배율은 아래 DISPLAY에 모아 둡니다(화면과 문서에 그대로 밝힘).
 */
export const DISPLAY = {
  /** 화면 1초 = 실제 몇 초 */
  timeScale: { satellite: 120, air: 120, sea: 1800 },
  /** 대형·진형 간격을 실제보다 몇 배 벌려 그리는지 */
  formationSpread: 150,
  /** 진형 유지 시간과 바꾸는 시간 (화면 초) */
  drill: {
    air: { hold: 14, change: 4 },
    sea: { hold: 20, change: 5 },
  },
  /** 모형 길이 (지구 반지름 1 기준, 실제 길이 1m당) */
  modelPerMeter: { air: 0.002, sea: 0.0002 },
} as const

/** 국제 표준 대기 (11km 이하) 음속 (m/s) */
export function speedOfSound(altitudeKm: number): number {
  const T = 288.15 - 6.5 * Math.min(11, Math.max(0, altitudeKm))
  return Math.sqrt(1.4 * 287.05 * T)
}

/** 마하수와 고도 → 속도 (m/s) */
export const machToMs = (mach: number, altitudeKm: number) =>
  mach * speedOfSound(altitudeKm)

export const KNOT_MS = 1852 / 3600

/** 항공기 화면 고도 (기존 운항 전투기와 같은 배율: 10km → 지구 반지름의 1.022배) */
export const airRadius = (altitudeKm: number) => 1 + 0.0022 * altitudeKm
export const SEA_RADIUS = 1.002

const DEG = Math.PI / 180

/** 중심에서 bearing(도) 방향으로 distanceKm 떨어진 지점 (구면) */
export function destination(
  from: LatLon,
  bearingDeg: number,
  distanceKm: number,
): LatLon {
  // 지구본(평균 반지름 6,371km 구)과 같은 반지름
  const d = kmToRadians(distanceKm)
  const b = bearingDeg * DEG
  const lat1 = from.lat * DEG
  const lon1 = from.lon * DEG
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b),
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(b) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    )
  return {
    lat: lat2 / DEG,
    lon: ((((lon2 / DEG + 180) % 360) + 360) % 360) - 180,
  }
}

/** 경주로 꼭짓점 (시계 방향 고리, 반원마다 segments칸) */
export function racetrackPoints(track: Racetrack, segments = 12): LatLon[] {
  const local: [number, number][] = []
  const half = track.straightKm / 2
  const r = track.turnKm
  // 지역 평면: y는 직선 방향(앞), x는 오른쪽
  for (let k = 0; k <= segments; k++) {
    const a = Math.PI - (k / segments) * Math.PI
    local.push([r * Math.cos(a), half + r * Math.sin(a)])
  }
  for (let k = 0; k <= segments; k++) {
    const a = -(k / segments) * Math.PI
    local.push([r * Math.cos(a), -half + r * Math.sin(a)])
  }
  return local.map(([x, y]) => {
    const dist = Math.hypot(x, y)
    const bearing = track.headingDeg + Math.atan2(x, y) / DEG
    return destination(track.center, bearing, dist)
  })
}

/** 경주로 한 바퀴 길이 (km, 반원은 다각형 근사) */
export const trackPath = (track: Racetrack): Path =>
  makePath(racetrackPoints(track), true)
export const pathKm = (path: Path) => path.length / kmToRadians(1)

// ── 벡터 ──
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  v[0] /= l
  v[1] /= l
  v[2] /= l
  return v
}
function cross(a: Vec3, b: Vec3, out: Vec3): Vec3 {
  const x = a[1] * b[2] - a[2] * b[1]
  const y = a[2] * b[0] - a[0] * b[2]
  const z = a[0] * b[1] - a[1] * b[0]
  out[0] = x
  out[1] = y
  out[2] = z
  return out
}

const sA: Vec3 = [0, 0, 0]
const sB: Vec3 = [0, 0, 0]
const sRight: Vec3 = [0, 0, 0]

// ── 위성 ──

const orbitScratch: OrbitState = { position: [0, 0, 0], velocity: [0, 0, 0] }

/** 실제 시각 tSec의 위성 고도(km)와 속도(km/s) */
export function satelliteNow(sat: Satellite, tSec: number) {
  const s = orbitState(sat.elements, tSec, orbitScratch)
  return {
    altitudeKm: radiusOf(s.position) - EARTH_RADIUS_KM,
    speedKms: radiusOf(s.velocity),
  }
}

export function satellitePose(sat: Satellite, tSec: number, out: Pose): Pose {
  const s = orbitState(sat.elements, tSec, orbitScratch)
  const alt = radiusOf(s.position) - EARTH_RADIUS_KM
  toScene(s.position, tSec, displayRadius(alt), out.position)
  normalize(Object.assign(out.up, out.position))
  // 진행 방향: 조금 뒤 위치를 향하는 방향
  const ahead = orbitState(sat.elements, tSec + 10, {
    position: sA,
    velocity: sB,
  })
  toScene(
    ahead.position,
    tSec + 10,
    displayRadius(radiusOf(ahead.position) - EARTH_RADIUS_KM),
    out.forward,
  )
  for (let i = 0; i < 3; i++) out.forward[i] -= out.position[i]
  const d = dot(out.forward, out.up)
  for (let i = 0; i < 3; i++) out.forward[i] -= out.up[i] * d
  normalize(out.forward)
  out.scale = 1
  return out
}

/** 지금 궤도 한 바퀴 (화면 좌표, 지구 자전은 지금 시각에 고정) */
export function orbitLine(sat: Satellite, tSec: number, out: Vec3[]): number {
  const n = Math.sqrt(398_600.4418 / sat.elements.aKm ** 3)
  const period = (2 * Math.PI) / n
  for (let k = 0; k < out.length; k++) {
    const t = tSec + (k / (out.length - 1)) * period
    const s = orbitState(sat.elements, t, orbitScratch)
    toScene(
      s.position,
      tSec,
      displayRadius(radiusOf(s.position) - EARTH_RADIUS_KM),
      out[k],
    )
  }
  return out.length
}

// ── 편대·함대 ──

export interface Group {
  id: string
  path: Path
  /** 경로 한 바퀴 (km) */
  lapKm: number
  /** 속도 (m/s) */
  speedMs: number
  radius: number
  timeScale: number
  hold: number
  change: number
  /** 진형 이름 → 자리 */
  slotsOf: (formation: string) => Offset[]
  sequence: string[]
  /** 시각 0의 진행률 */
  start: number
}

export function flightGroup(flight: Flight, index = 0): Group {
  const path = trackPath(flight.track)
  return {
    id: flight.id,
    path,
    lapKm: pathKm(path),
    speedMs: machToMs(flight.mach, flight.altitudeKm),
    radius: airRadius(flight.altitudeKm),
    timeScale: DISPLAY.timeScale.air,
    hold: DISPLAY.drill.air.hold,
    change: DISPLAY.drill.air.change,
    slotsOf: (f) => FLIGHT_FORMATIONS[f as FlightFormation],
    sequence: flight.drill,
    start: (index * 0.37) % 1,
  }
}

export function fleetGroup(fleet: Fleet, index = 0): Group {
  const path = trackPath(fleet.track)
  const roles = fleet.ships.map((s) => s.role)
  const cache = new Map<string, Offset[]>()
  return {
    id: fleet.id,
    path,
    lapKm: pathKm(path),
    speedMs: fleet.knots * KNOT_MS,
    radius: SEA_RADIUS,
    timeScale: DISPLAY.timeScale.sea,
    hold: DISPLAY.drill.sea.hold,
    change: DISPLAY.drill.sea.change,
    slotsOf: (f) => {
      let slots = cache.get(f)
      if (!slots) {
        slots = fleetSlots(f as FleetFormation, roles)
        cache.set(f, slots)
      }
      return slots
    },
    sequence: fleet.drill,
    start: (index * 0.41) % 1,
  }
}

/** 화면 시각 → 경로 위 진행률 (실제 속도 × 시간 압축) */
export function groupProgress(group: Group, screenSec: number): number {
  const km = (group.speedMs * screenSec * group.timeScale) / 1000
  return (((group.start + km / group.lapKm) % 1) + 1) % 1
}

export const groupDrill = (
  group: Group,
  screenSec: number,
): DrillPhase<string> =>
  drillPhase(group.sequence, group.hold, group.change, screenSec)

const offsets: Offset[] = []
const gCenter: Vec3 = [0, 0, 0]
const gForward: Vec3 = [0, 0, 0]
/** 경로 모서리에서 방향이 튀지 않도록 앞뒤 이만큼(라디안)을 보고 방향을 정함 */
const SMOOTH_RAD = kmToRadians(120)

/** 편대·함대의 기준점과 방향 (단위 구) */
function guide(group: Group, screenSec: number, center: Vec3, forward: Vec3) {
  const s = groupProgress(group, screenSec)
  pointAt(group.path, s, center)
  const ds = SMOOTH_RAD / group.path.length
  const a = pointAt(group.path, (s + ds) % 1, sA)
  const b = pointAt(group.path, (s - ds + 1) % 1, sB)
  for (let i = 0; i < 3; i++) forward[i] = a[i] - b[i]
  if (Math.hypot(...forward) < 1e-9) headingAt(group.path, s, forward)
  const d = dot(forward, center)
  for (let i = 0; i < 3; i++) forward[i] -= center[i] * d
  normalize(forward)
}

/** 대형 자리마다 자세를 out에 채움 (자리 수만큼) */
export function groupPoses(
  group: Group,
  screenSec: number,
  out: Pose[],
): number {
  const center = gCenter
  const forward = gForward
  guide(group, screenSec, center, forward)
  const phase = groupDrill(group, screenSec)
  blendOffsets(
    group.slotsOf(phase.from),
    group.slotsOf(phase.to),
    phase.u,
    offsets,
  )
  cross(forward, center, sRight)
  const k = kmToRadians(DISPLAY.formationSpread / 1000)
  for (let n = 0; n < offsets.length && n < out.length; n++) {
    const [x, y] = offsets[n]
    const pose = out[n]
    for (let i = 0; i < 3; i++)
      pose.up[i] = center[i] + (sRight[i] * x + forward[i] * y) * k
    normalize(pose.up)
    for (let i = 0; i < 3; i++) pose.position[i] = pose.up[i] * group.radius
    const d = dot(forward, pose.up)
    for (let i = 0; i < 3; i++) pose.forward[i] = forward[i] - pose.up[i] * d
    normalize(pose.forward)
    pose.scale = 1
  }
  return Math.min(offsets.length, out.length)
}

/** 기준점의 위도·경도 (카메라 이동·정보 표시용) */
export function groupCenter(group: Group, screenSec: number): Vec3 {
  return pointAt(group.path, groupProgress(group, screenSec), [0, 0, 0])
}

/** 경로 선 (화면 좌표) */
export function groupLine(group: Group, out: Vec3[]): number {
  for (let k = 0; k < out.length; k++) {
    pointAt(group.path, k / (out.length - 1), out[k])
    for (let i = 0; i < 3; i++) out[k][i] *= group.radius
  }
  return out.length
}
