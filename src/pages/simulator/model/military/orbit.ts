import type { LatLon, Vec3 } from '@/shared/lib'

/**
 * 인공위성 궤도 계산 (실제 단위: km, 초). 케플러 궤도 요소로 위치를 구하고,
 * 지구 자전을 빼서 지구 고정 좌표(위도·경도)와 3D 장면 좌표로 바꿉니다.
 * 섭동(J2 세차, 대기 저항)은 넣지 않습니다. 태양동기궤도 경사각을 정할 때만 J2를 씁니다.
 */

/** 지구 중력 상수 μ (km³/s², WGS 84) */
export const MU_EARTH = 398_600.4418
/** 지구 적도 반지름 (km, WGS 84). 고도는 이 반지름 위로 잼 */
export const EARTH_RADIUS_KM = 6378.137
/** 지구 자전 각속도 (rad/s, 항성일 기준) */
export const EARTH_ROTATION = 7.292_115_9e-5
/** 지구 편평도 계수 J2 */
export const J2 = 1.082_626_68e-3
/** 태양동기궤도가 따라가야 할 궤도면 세차 (rad/s, 1년에 한 바퀴) */
const SUN_SYNC_RATE = (2 * Math.PI) / (365.2422 * 86_400)

const DEG = Math.PI / 180

export interface OrbitElements {
  /** 긴반지름 (km) */
  aKm: number
  /** 이심률 (0이면 원) */
  e: number
  /** 궤도 경사각 (도) */
  iDeg: number
  /** 승교점 적경 (도) */
  raanDeg: number
  /** 근지점 인수 (도) */
  argPerigeeDeg: number
  /** 시각 0의 평균 근점 이각 (도) */
  meanAnomalyDeg: number
}

/** 궤도 주기 (초): T = 2π√(a³/μ) */
export function orbitalPeriod(aKm: number): number {
  return 2 * Math.PI * Math.sqrt(aKm ** 3 / MU_EARTH)
}

/** 근지점·원지점 고도(km)로 긴반지름과 이심률 */
export function ellipseFromAltitudes(
  perigeeKm: number,
  apogeeKm: number,
): { aKm: number; e: number } {
  const rp = EARTH_RADIUS_KM + perigeeKm
  const ra = EARTH_RADIUS_KM + apogeeKm
  return { aKm: (rp + ra) / 2, e: (ra - rp) / (ra + rp) }
}

/** 원궤도 속도 (km/s): v = √(μ/r) */
export function circularSpeed(radiusKm: number): number {
  return Math.sqrt(MU_EARTH / radiusKm)
}

/** 정지궤도 긴반지름 (km): 주기가 항성일과 같은 원궤도 (약 42,164km, 고도 35,786km) */
export function geostationaryRadius(): number {
  return Math.cbrt(MU_EARTH / EARTH_ROTATION ** 2)
}

/**
 * 태양동기궤도 경사각 (도). 원궤도의 J2 세차 dΩ/dt = −1.5·n·J2·(R/a)²·cos i가
 * 1년에 한 바퀴(동쪽)가 되는 경사각
 */
export function sunSynchronousInclination(altitudeKm: number): number {
  const a = EARTH_RADIUS_KM + altitudeKm
  const n = Math.sqrt(MU_EARTH / a ** 3)
  const cos = -SUN_SYNC_RATE / (1.5 * n * J2 * (EARTH_RADIUS_KM / a) ** 2)
  return Math.acos(Math.max(-1, Math.min(1, cos))) / DEG
}

/** 케플러 방정식 M = E − e·sin E를 뉴턴법으로 풂 (라디안) */
export function solveKepler(meanAnomaly: number, e: number): number {
  const M = ((meanAnomaly % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  let E = e < 0.8 ? M : Math.PI
  for (let k = 0; k < 30; k++) {
    const f = E - e * Math.sin(E) - M
    const step = f / (1 - e * Math.cos(E))
    E -= step
    if (Math.abs(step) < 1e-12) break
  }
  return E
}

export interface OrbitState {
  /** 관성 좌표 위치 (km): x 춘분점, z 북극 */
  position: Vec3
  /** 관성 좌표 속도 (km/s) */
  velocity: Vec3
}

/** t초 뒤 관성 좌표 위치·속도 */
export function orbitState(
  el: OrbitElements,
  tSec: number,
  out: OrbitState = { position: [0, 0, 0], velocity: [0, 0, 0] },
): OrbitState {
  const { aKm: a, e } = el
  const n = Math.sqrt(MU_EARTH / a ** 3)
  const E = solveKepler(el.meanAnomalyDeg * DEG + n * tSec, e)
  const cosE = Math.cos(E)
  const sinE = Math.sin(E)
  const b = a * Math.sqrt(1 - e * e)
  const r = a * (1 - e * cosE)
  // 근지점 좌표계 (p: 근지점 방향, q: 진행 방향)
  const xp = a * (cosE - e)
  const yp = b * sinE
  const k = Math.sqrt(MU_EARTH * a) / r
  const vxp = -k * sinE
  const vyp = k * Math.sqrt(1 - e * e) * cosE

  const O = el.raanDeg * DEG
  const i = el.iDeg * DEG
  const w = el.argPerigeeDeg * DEG
  const cO = Math.cos(O)
  const sO = Math.sin(O)
  const ci = Math.cos(i)
  const si = Math.sin(i)
  const cw = Math.cos(w)
  const sw = Math.sin(w)
  // 근지점 좌표계 → 관성 좌표계 회전 행렬의 첫 두 열
  const px = cO * cw - sO * sw * ci
  const py = sO * cw + cO * sw * ci
  const pz = sw * si
  const qx = -cO * sw - sO * cw * ci
  const qy = -sO * sw + cO * cw * ci
  const qz = cw * si

  out.position[0] = px * xp + qx * yp
  out.position[1] = py * xp + qy * yp
  out.position[2] = pz * xp + qz * yp
  out.velocity[0] = px * vxp + qx * vyp
  out.velocity[1] = py * vxp + qy * vyp
  out.velocity[2] = pz * vxp + qz * vyp
  return out
}

/** 지구 중심에서 거리 (km) */
export const radiusOf = (v: Vec3) => Math.hypot(v[0], v[1], v[2])

/** 시각 t의 지구 자전각 (라디안). 시각 0에 관성 x축이 경도 0°를 지남 */
export const earthAngle = (tSec: number) => EARTH_ROTATION * tSec

/** 관성 좌표 → 위도·경도 (지구가 t초 동안 돈 만큼 뺌) */
export function subPoint(position: Vec3, tSec: number): LatLon {
  const [x, y, z] = position
  const r = radiusOf(position) || 1
  const lat = Math.asin(z / r) / DEG
  let lon = (Math.atan2(y, x) - earthAngle(tSec)) / DEG
  lon = ((((lon + 180) % 360) + 360) % 360) - 180
  return { lat, lon }
}

/**
 * 관성 좌표(km) → 3D 장면 좌표. 방향은 실제 그대로, 지구 중심까지 거리는 radius로 둡니다.
 * 장면 좌표는 latLonToVector3와 같음: 경도 0° → +x, 북극 → +y, 동경 90° → −z
 */
export function toScene(
  v: Vec3,
  tSec: number,
  radius: number,
  out: Vec3,
): Vec3 {
  const th = earthAngle(tSec)
  const c = Math.cos(th)
  const s = Math.sin(th)
  const X = v[0] * c + v[1] * s
  const Y = -v[0] * s + v[1] * c
  const Z = v[2]
  const l = Math.hypot(X, Y, Z) || 1
  out[0] = (X / l) * radius
  out[1] = (Z / l) * radius
  out[2] = (-Y / l) * radius
  return out
}

/**
 * 고도(km) → 화면 반지름 (지구 반지름 1). 저궤도부터 정지궤도까지 한 화면에 들어오도록 로그 눈금으로 줄임:
 * 400km → 약 1.10, 20,200km(항법) → 약 1.44, 35,786km(정지궤도) → 약 1.50
 */
export function displayRadius(altitudeKm: number): number {
  return 1 + 0.1 * Math.log1p(Math.max(0, altitudeKm) / 250)
}
