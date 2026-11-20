import { kmToRadians, latLonToVector3 } from '@/shared/lib'
import type { Vec3 } from '@/shared/lib'
import {
  flightPlan,
  lanePath,
  routeEnds,
  routePath,
  trafficConditions,
} from './disruption'
import type { FlightPlan, TrafficConditions, TrafficWorld } from './disruption'
import {
  FIGHTERS_PER_CARRIER,
  FLIGHT_ROUTES,
  LAUNCH_SITE,
  SEA_LANES,
} from './routes'
import type { FlightRoute, SeaLane } from './routes'
import { headingAt, makePath, pointAt } from './sphere'
import type { Path } from './sphere'

/**
 * 항공·선박의 움직임. 시뮬레이션 속도와 상관없이 화면 시간(초)으로 움직이고,
 * 운항 조건(재해)은 0.25초마다 다시 봅니다. 3D 화면은 자세(Pose)와 꼬리 점만 읽습니다.
 */

/** 고도 (지구 반지름 1 기준, 실제보다 크게). 구름층은 1.012 */
export const CRUISE_ALTITUDE = 0.018
export const FIGHTER_ALTITUDE = 0.022
export const SHIP_ALTITUDE = 0.002
export const ORBIT_ALTITUDE = 0.06

/** 여객기 속도 (라디안/초): 인천→로스앤젤레스 약 50초 */
const PLANE_SPEED = 0.03
/** 아주 짧은 노선(김포→제주)도 이 시간(초)은 걸려 날게 함 */
const MIN_FLIGHT_S = 12
/** 도착해서 다시 뜨기까지 (초) */
const GROUND_S = 4
/** 이륙·착륙 때 고도와 크기가 바뀌는 구간 (라디안, 노선의 최대 25%) */
const CLIMB_RAD = 0.04
/** 결항으로 사라지거나 다시 나타나는 시간 (초) */
const FADE_S = 1
/** 우회 경로로 옮겨 가는 시간 (초) */
const BLEND_S = 1.5
const SHIP_SPEED = 0.005
const CARRIER_SPEED = 0.004
/** 바닷길 끝 항구에서 머무는 시간 (초) */
const PORT_WAIT_S = 5
/** 닫힌 항구까지 이만큼(라디안, 약 320km) 남으면 앞바다에서 기다림 */
const PORT_HOLD_RAD = 0.05
/** 전투기가 항공모함 둘레를 도는 반지름 (라디안, 약 190km)과 각속도 */
const FIGHTER_ORBIT_RAD = 0.03
const FIGHTER_RATE = 1.1
/** 편대에서 뒤따르는 전투기 간격 (라디안) */
const FORMATION_GAP = 0.3
/** 꼬리 길이 (라디안) */
const PLANE_TRAIL_RAD = 0.035
const SHIP_TRAIL_RAD = 0.012
const CHECK_MS = 250

/** 우주왕복선 단계별 시간(초)과 궤도 */
const SHUTTLE = {
  pad: 8,
  launch: 7,
  landing: 7,
  runway: 3,
  /** 궤도 각속도 (라디안/초) */
  orbitRate: 0.3,
  laps: 2,
  /** 발사·착륙하며 지나는 궤도 각도 (라디안) */
  launchArc: 0.35,
  landingArc: 0.5,
  /** 이때까지 외부 탱크·부스터를 단 채로 (발사 진행률) */
  separation: 0.85,
}

export interface Pose {
  position: Vec3
  /** 진행 방향 (단위 벡터) */
  forward: Vec3
  /** 위쪽 (단위 벡터) */
  up: Vec3
  /** 0이면 숨김, 1이면 다 보임 */
  scale: number
}

export const newPose = (): Pose => ({
  position: [0, 0, 0],
  forward: [0, 0, 1],
  up: [0, 1, 0],
  scale: 0,
})

export interface PlaneState {
  route: FlightRoute
  /** 왕복 주기 안 위치 (초) */
  phase: number
  /** 한쪽 비행 시간 (초) */
  flight: number
  /** 지금 경로 (출발 → 도착 방향) */
  path: Path
  /** 우회로 바뀌기 전 경로 (옮겨 가는 동안) */
  prev: Path | null
  blend: number
  viaKey: string
  cancelled: boolean
  /** 결항이 풀려도 다음 이륙 전까지 숨김 */
  waitTakeoff: boolean
  visible: number
}

export interface ShipState {
  lane: SeaLane
  path: Path
  /** 바닷길 위 위치 (길이 비율) */
  s: number
  dir: 1 | -1
  /** 항구에서 남은 대기 시간 (초) */
  wait: number
  /** 태풍·닫힌 항구 때문에 서 있거나 비키는 중 */
  holding: boolean
  portS: { cityId: string; s: number }[]
}

export interface FighterState {
  /** 위를 도는 항공모함 (ships 번호) */
  carrier: number
  /** 편대 안 순서 */
  slot: number
}

export type ShuttlePhase = 'pad' | 'launch' | 'orbit' | 'landing' | 'runway'

export interface ShuttleState {
  phase: ShuttlePhase
  /** 단계 안 경과 시간 (초) */
  t: number
}

export interface Traffic {
  planes: PlaneState[]
  ships: ShipState[]
  fighters: FighterState[]
  shuttle: ShuttleState
  fighterAngle: number
  conditions: TrafficConditions
  /** 태풍 중심(단위 벡터)과 반지름(라디안) */
  stormZones: { v: Vec3; r: number }[]
  /** 다음에 운항 조건을 다시 볼 시각 (ms) */
  checkAt: number
}

// ── 벡터 ──────────────────────────────────────────────

function cross(a: Vec3, b: Vec3, out: Vec3): Vec3 {
  const x = a[1] * b[2] - a[2] * b[1]
  const y = a[2] * b[0] - a[0] * b[2]
  const z = a[0] * b[1] - a[1] * b[0]
  out[0] = x
  out[1] = y
  out[2] = z
  return out
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  v[0] /= l
  v[1] /= l
  v[2] /= l
  return v
}

function setScaled(out: Vec3, v: Vec3, k: number): Vec3 {
  out[0] = v[0] * k
  out[1] = v[1] * k
  out[2] = v[2] * k
  return out
}

/** 두 단위 벡터 사이 중심각 */
function arc(a: Vec3, b: Vec3): number {
  return Math.acos(Math.min(1, Math.max(-1, dot(a, b))))
}

/** forward에서 up 성분을 빼고 단위 벡터로 */
function tangent(forward: Vec3, up: Vec3): Vec3 {
  const d = dot(forward, up)
  forward[0] -= up[0] * d
  forward[1] -= up[1] * d
  forward[2] -= up[2] * d
  return normalize(forward)
}

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

const scratchA: Vec3 = [0, 0, 0]
const scratchB: Vec3 = [0, 0, 0]
const scratchC: Vec3 = [0, 0, 0]

// ── 만들기 ─────────────────────────────────────────────

const CALM: TrafficConditions = {
  closedAirports: new Set(),
  closedPorts: new Set(),
  ash: [],
  storms: [],
  polarReroute: false,
  launchHold: false,
}

export function createTraffic(): Traffic {
  const planes: PlaneState[] = []
  FLIGHT_ROUTES.forEach((route, r) => {
    const path = routePath(route)
    const flight = Math.max(MIN_FLIGHT_S, path.length / PLANE_SPEED)
    const cycle = 2 * (flight + GROUND_S)
    for (let k = 0; k < route.planes; k++) {
      const offset = (r * 0.618 + k / route.planes) % 1
      planes.push({
        route,
        phase: cycle * offset,
        flight,
        path,
        prev: null,
        blend: 1,
        viaKey: '',
        cancelled: false,
        waitTakeoff: false,
        visible: 1,
      })
    }
  })

  const ships: ShipState[] = []
  for (const lane of SEA_LANES) {
    const path = lanePath(lane)
    const portS = lane.ports.map((p) => ({
      cityId: p.cityId,
      s: path.cumulative[p.at] / path.length,
    }))
    for (let k = 0; k < lane.ships; k++)
      ships.push({
        lane,
        path,
        s: k / lane.ships,
        dir: k % 2 === 0 ? 1 : -1,
        wait: 0,
        holding: false,
        portS,
      })
  }

  const fighters: FighterState[] = []
  ships.forEach((ship, index) => {
    if (ship.lane.kind !== 'carrier') return
    for (let slot = 0; slot < FIGHTERS_PER_CARRIER; slot++)
      fighters.push({ carrier: index, slot })
  })

  return {
    planes,
    ships,
    fighters,
    // 처음 화면에서 궤도를 도는 모습이 보이게
    shuttle: { phase: 'orbit', t: 8 },
    fighterAngle: 0,
    conditions: CALM,
    stormZones: [],
    checkAt: 0,
  }
}

// ── 움직이기 ───────────────────────────────────────────

function applyConditions(traffic: Traffic, c: TrafficConditions) {
  traffic.conditions = c
  traffic.stormZones = c.storms.map((zone) => ({
    v: latLonToVector3(zone.center),
    r: kmToRadians(zone.radiusKm),
  }))
  const plans = new Map<string, FlightPlan>()
  for (const plane of traffic.planes) {
    let plan = plans.get(plane.route.id)
    if (!plan) {
      plan = flightPlan(plane.route, c)
      plans.set(plane.route.id, plan)
    }
    plane.cancelled = plan.status === 'cancelled'
    if (plane.cancelled) plane.waitTakeoff = true
    const key = plan.via
      ? `${plan.via.lat.toFixed(3)},${plan.via.lon.toFixed(3)}`
      : ''
    if (key === plane.viaKey) continue
    const [a, b] = routeEnds(plane.route)
    plane.prev = plane.path
    plane.path = plan.via ? makePath([a, plan.via, b]) : routePath(plane.route)
    plane.blend = 0
    plane.viaKey = key
  }
}

/** 비행 중이면 어느 쪽(0: 출발→도착, 1: 돌아옴)인지와 출발→도착 경로 위 비율 */
function legAt(plane: PlaneState): { flying: boolean; leg: 0 | 1; s: number } {
  const { phase, flight } = plane
  if (phase < flight) return { flying: true, leg: 0, s: phase / flight }
  if (phase < flight + GROUND_S) return { flying: false, leg: 0, s: 1 }
  if (phase < 2 * flight + GROUND_S)
    return { flying: true, leg: 1, s: 1 - (phase - flight - GROUND_S) / flight }
  return { flying: false, leg: 1, s: 0 }
}

function stepPlane(plane: PlaneState, dt: number) {
  if (dt <= 0) {
    // 동작 줄이기: 움직이지 않는 대신 결항·우회는 바로 반영 (다음 이륙을 기다릴 수 없으므로)
    plane.waitTakeoff = plane.cancelled
    plane.visible = plane.cancelled ? 0 : 1
    plane.blend = 1
    return
  }
  const before = legAt(plane)
  plane.phase = (plane.phase + dt) % (2 * (plane.flight + GROUND_S))
  const after = legAt(plane)
  const tookOff = after.flying && (!before.flying || after.leg !== before.leg)
  if (tookOff && !plane.cancelled) plane.waitTakeoff = false
  const target = plane.cancelled || plane.waitTakeoff ? 0 : 1
  const step = dt / FADE_S
  plane.visible =
    plane.visible < target
      ? Math.min(target, plane.visible + step)
      : Math.max(target, plane.visible - step)
  if (plane.blend < 1) plane.blend = Math.min(1, plane.blend + dt / BLEND_S)
}

/** 바닷길 위 비율을 delta만큼 옮긴 값 (고리는 감고, 아니면 0~1로) */
function shifted(ship: ShipState, delta: number): number {
  const s = ship.s + delta
  return ship.lane.loop ? ((s % 1) + 1) % 1 : Math.min(1, Math.max(0, s))
}

function move(ship: ShipState, delta: number) {
  if (ship.lane.loop) {
    ship.s = shifted(ship, delta)
    return
  }
  ship.s += delta
  if (ship.s >= 1) {
    ship.s = 1
    ship.dir = -1
    ship.wait = PORT_WAIT_S
  } else if (ship.s <= 0) {
    ship.s = 0
    ship.dir = 1
    ship.wait = PORT_WAIT_S
  }
}

/** 가는 방향으로 다음 기항지 */
function nextPort(ship: ShipState) {
  let best: { cityId: string; s: number } | null = null
  for (const port of ship.portS) {
    const ahead = ship.dir > 0 ? port.s > ship.s + 1e-6 : port.s < ship.s - 1e-6
    if (!ahead) continue
    if (!best || (ship.dir > 0 ? port.s < best.s : port.s > best.s)) best = port
  }
  return best
}

function stepShip(ship: ShipState, traffic: Traffic, dt: number) {
  if (dt <= 0) return
  ship.holding = false
  if (ship.wait > 0) {
    ship.wait = Math.max(0, ship.wait - dt)
    return
  }
  const speed = ship.lane.kind === 'carrier' ? CARRIER_SPEED : SHIP_SPEED
  const ds = (speed / ship.path.length) * dt
  const here = pointAt(ship.path, ship.s, scratchA)
  for (const zone of traffic.stormZones) {
    if (arc(here, zone.v) < zone.r) {
      // 태풍 반경 안이면 바닷길을 따라 멀어지는 쪽으로
      const forward = arc(
        pointAt(ship.path, shifted(ship, ds), scratchB),
        zone.v,
      )
      const back = arc(pointAt(ship.path, shifted(ship, -ds), scratchB), zone.v)
      move(ship, forward >= back ? ds : -ds)
      ship.holding = true
      return
    }
    const next = pointAt(ship.path, shifted(ship, ship.dir * ds), scratchB)
    if (arc(next, zone.v) < zone.r) {
      ship.holding = true
      return
    }
  }
  const port = nextPort(ship)
  if (
    port &&
    traffic.conditions.closedPorts.has(port.cityId) &&
    Math.abs(port.s - ship.s) * ship.path.length < PORT_HOLD_RAD
  ) {
    ship.holding = true
    return
  }
  move(ship, ship.dir * ds)
}

/** 우주왕복선 궤도: 케네디에서 정동쪽으로 떠나는 대권 */
const PAD_UP = latLonToVector3(LAUNCH_SITE)
const PAD_EAST = normalize(cross([0, 1, 0], PAD_UP, [0, 0, 0]))
/** 궤도를 다 돌고 착륙을 시작하는 각도 */
const DEORBIT_ANGLE = 2 * Math.PI * SHUTTLE.laps - SHUTTLE.landingArc

function stepShuttle(shuttle: ShuttleState, hold: boolean, dt: number) {
  if (dt <= 0) return
  if (shuttle.phase === 'pad' && hold) return
  shuttle.t += dt
  const next = (phase: ShuttlePhase) => {
    shuttle.phase = phase
    shuttle.t = 0
  }
  switch (shuttle.phase) {
    case 'pad':
      if (shuttle.t >= SHUTTLE.pad) next('launch')
      break
    case 'launch':
      if (shuttle.t >= SHUTTLE.launch) next('orbit')
      break
    case 'orbit':
      if (SHUTTLE.launchArc + SHUTTLE.orbitRate * shuttle.t >= DEORBIT_ANGLE)
        next('landing')
      break
    case 'landing':
      if (shuttle.t >= SHUTTLE.landing) next('runway')
      break
    case 'runway':
      if (shuttle.t >= SHUTTLE.runway) next('pad')
      break
  }
}

/** dt초만큼 움직임 (dt가 0이면 멈춰 있음). 운항 조건은 0.25초마다 다시 계산 */
export function stepTraffic(
  traffic: Traffic,
  world: TrafficWorld,
  nowMs: number,
  dt: number,
) {
  if (nowMs >= traffic.checkAt) {
    applyConditions(traffic, trafficConditions(world, nowMs))
    traffic.checkAt = nowMs + CHECK_MS
  }
  for (const plane of traffic.planes) stepPlane(plane, dt)
  for (const ship of traffic.ships) stepShip(ship, traffic, dt)
  if (dt > 0) traffic.fighterAngle += FIGHTER_RATE * dt
  stepShuttle(traffic.shuttle, traffic.conditions.launchHold, dt)
}

// ── 자세와 꼬리 ────────────────────────────────────────

/** 이륙·착륙 구간에서 0 → 1 (고도와 크기에 함께 씀) */
function climb(plane: PlaneState, s: number): number {
  const span = Math.min(0.25, CLIMB_RAD / plane.path.length)
  return smooth(Math.min(s, 1 - s) / span)
}

/** 여객기 경로 위 비율 s 지점 (우회로로 옮겨 가는 중이면 두 경로 사이) */
function planePoint(plane: PlaneState, s: number, out: Vec3): Vec3 {
  const target = pointAt(plane.path, s, scratchB)
  if (plane.prev && plane.blend < 1) {
    const from = pointAt(plane.prev, s, scratchC)
    const e = smooth(plane.blend)
    out[0] = from[0] + (target[0] - from[0]) * e
    out[1] = from[1] + (target[1] - from[1]) * e
    out[2] = from[2] + (target[2] - from[2]) * e
    normalize(out)
  } else {
    out[0] = target[0]
    out[1] = target[1]
    out[2] = target[2]
  }
  return setScaled(out, out, 1 + CRUISE_ALTITUDE * climb(plane, s))
}

export function planePose(plane: PlaneState, out: Pose): Pose {
  const { flying, leg, s } = legAt(plane)
  planePoint(plane, s, out.position)
  normalize(setScaled(out.up, out.position, 1))
  const heading = headingAt(plane.path, s, out.forward)
  if (plane.prev && plane.blend < 1) {
    const from = headingAt(plane.prev, s, scratchA)
    const e = smooth(plane.blend)
    heading[0] = from[0] + (heading[0] - from[0]) * e
    heading[1] = from[1] + (heading[1] - from[1]) * e
    heading[2] = from[2] + (heading[2] - from[2]) * e
  }
  if (leg === 1) setScaled(heading, heading, -1)
  tangent(heading, out.up)
  out.scale = flying ? plane.visible * climb(plane, s) : 0
  return out
}

/** 꼬리 점을 머리부터 out에 채우고 개수를 돌려줌 (숨겨져 있으면 0) */
export function planeTrail(plane: PlaneState, out: Vec3[]): number {
  const { flying, leg, s } = legAt(plane)
  if (!flying || plane.visible <= 0 || out.length === 0) return 0
  const step = PLANE_TRAIL_RAD / plane.path.length / Math.max(1, out.length - 1)
  const behind = leg === 0 ? -1 : 1
  let count = 0
  for (let k = 0; k < out.length; k++) {
    const at = s + behind * k * step
    if (at < 0 || at > 1) break
    planePoint(plane, at, out[k])
    count++
  }
  return count
}

export function shipPose(ship: ShipState, out: Pose): Pose {
  pointAt(ship.path, ship.s, out.up)
  setScaled(out.position, out.up, 1 + SHIP_ALTITUDE)
  headingAt(ship.path, ship.s, out.forward)
  if (ship.dir < 0) setScaled(out.forward, out.forward, -1)
  tangent(out.forward, out.up)
  out.scale = 1
  return out
}

/** 배 뒤 물결 점 (서 있거나 항구에 있으면 0) */
export function shipTrail(ship: ShipState, out: Vec3[]): number {
  if (ship.wait > 0 || ship.holding || out.length === 0) return 0
  const step = SHIP_TRAIL_RAD / ship.path.length / Math.max(1, out.length - 1)
  let count = 0
  for (let k = 0; k < out.length; k++) {
    const at = ship.s - ship.dir * k * step
    if (!ship.lane.loop && (at < 0 || at > 1)) break
    pointAt(ship.path, ship.lane.loop ? ((at % 1) + 1) % 1 : at, out[k])
    setScaled(out[k], out[k], 1 + SHIP_ALTITUDE)
    count++
  }
  return count
}

/** 전투기 자리: 항공모함 둘레를 편대로 돔. angleBack만큼 지난 자리도 구함(꼬리) */
function fighterPoint(
  traffic: Traffic,
  index: number,
  angleBack: number,
  out: Vec3,
  forward?: Vec3,
): Vec3 {
  const fighter = traffic.fighters[index]
  const ship = traffic.ships[fighter.carrier]
  const center = pointAt(ship.path, ship.s, scratchA)
  const e1 = headingAt(ship.path, ship.s, scratchB)
  const e2 = normalize(cross(center, e1, scratchC))
  const theta = traffic.fighterAngle - fighter.slot * FORMATION_GAP - angleBack
  const r = FIGHTER_ORBIT_RAD + fighter.slot * 0.003
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  const cr = Math.cos(r)
  const sr = Math.sin(r)
  for (let i = 0; i < 3; i++)
    out[i] = center[i] * cr + (e1[i] * cos + e2[i] * sin) * sr
  normalize(out)
  if (forward)
    for (let i = 0; i < 3; i++) forward[i] = -e1[i] * sin + e2[i] * cos
  return setScaled(out, out, 1 + FIGHTER_ALTITUDE)
}

export function fighterPose(traffic: Traffic, index: number, out: Pose): Pose {
  fighterPoint(traffic, index, 0, out.position, out.forward)
  normalize(setScaled(out.up, out.position, 1))
  tangent(out.forward, out.up)
  out.scale = 1
  return out
}

export function fighterTrail(
  traffic: Traffic,
  index: number,
  out: Vec3[],
): number {
  for (let k = 0; k < out.length; k++)
    fighterPoint(traffic, index, k * 0.06, out[k])
  return out.length
}

/** 궤도 각도 a, 반지름 r 지점과 (dr, da) 방향의 진행 벡터 */
function orbitPoint(a: number, r: number, dr: number, da: number, pose: Pose) {
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  for (let i = 0; i < 3; i++) {
    const radial = PAD_UP[i] * cos + PAD_EAST[i] * sin
    const along = -PAD_UP[i] * sin + PAD_EAST[i] * cos
    pose.position[i] = radial * r
    pose.up[i] = radial
    pose.forward[i] = radial * dr + along * r * da
  }
  normalize(pose.forward)
  // 위쪽은 지구 바깥 방향에서 진행 방향 성분을 뺀 것 (수직으로 오를 때는 서쪽)
  const d = dot(pose.up, pose.forward)
  for (let i = 0; i < 3; i++) pose.up[i] -= pose.forward[i] * d
  if (Math.hypot(...pose.up) < 1e-6) setScaled(pose.up, PAD_EAST, -1)
  normalize(pose.up)
}

/**
 * 우주왕복선 자세. stacked면 외부 탱크·부스터를 단 모습(위치는 맨 아래),
 * 아니면 궤도선만(위치는 가운데). flame은 분사 불꽃 세기.
 */
export function shuttlePose(
  shuttle: ShuttleState,
  out: Pose,
): { pose: Pose; stacked: boolean; flame: number } {
  out.scale = 1
  switch (shuttle.phase) {
    case 'pad':
      setScaled(out.position, PAD_UP, 1.0005)
      setScaled(out.forward, PAD_UP, 1)
      setScaled(out.up, PAD_EAST, -1)
      return { pose: out, stacked: true, flame: 0 }
    case 'launch': {
      const u = Math.min(1, shuttle.t / SHUTTLE.launch)
      const a = SHUTTLE.launchArc * u * u
      const r = 1 + ORBIT_ALTITUDE * (1 - (1 - u) ** 2)
      orbitPoint(
        a,
        r,
        2 * ORBIT_ALTITUDE * (1 - u),
        2 * SHUTTLE.launchArc * u,
        out,
      )
      const stacked = u < SHUTTLE.separation
      return { pose: out, stacked, flame: stacked ? 1 - 0.3 * u : 0 }
    }
    case 'orbit': {
      const a = SHUTTLE.launchArc + SHUTTLE.orbitRate * shuttle.t
      orbitPoint(a, 1 + ORBIT_ALTITUDE, 0, 1, out)
      return { pose: out, stacked: false, flame: 0 }
    }
    case 'landing': {
      const u = Math.min(1, shuttle.t / SHUTTLE.landing)
      const a = DEORBIT_ANGLE + SHUTTLE.landingArc * u
      const r = 1 + ORBIT_ALTITUDE * (1 - u) ** 2
      orbitPoint(a, r, -2 * ORBIT_ALTITUDE * (1 - u), SHUTTLE.landingArc, out)
      return { pose: out, stacked: false, flame: 0 }
    }
    case 'runway':
      setScaled(out.position, PAD_UP, 1.0008)
      setScaled(out.forward, PAD_EAST, 1)
      setScaled(out.up, PAD_UP, 1)
      return { pose: out, stacked: false, flame: 0 }
  }
}

/** 발사할 때 남는 분사 연기 꼬리 (발사 중이 아니면 0) */
const trailPose = newPose()

export function shuttleTrail(shuttle: ShuttleState, out: Vec3[]): number {
  if (shuttle.phase !== 'launch') return 0
  const pose = trailPose
  const u = Math.min(1, shuttle.t / SHUTTLE.launch)
  let count = 0
  for (let k = 0; k < out.length; k++) {
    const at = u - k * 0.05
    if (at < 0) break
    const a = SHUTTLE.launchArc * at * at
    const r = 1 + ORBIT_ALTITUDE * (1 - (1 - at) ** 2)
    orbitPoint(a, r, 1, 1, pose)
    out[k][0] = pose.position[0]
    out[k][1] = pose.position[1]
    out[k][2] = pose.position[2]
    count++
  }
  return count
}
