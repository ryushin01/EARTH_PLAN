import { kmToRadians, latLonToVector3, vector3ToLatLon } from '@/shared/lib'
import type { LatLon, Vec3 } from '@/shared/lib'

/** 지구 반지름 (km) */
const RADIUS_KM = 1 / kmToRadians(1)

/** 단위 구 위의 꺾은선 경로. 꼭짓점 사이는 대권을 따릅니다. */
export interface Path {
  /** 꼭짓점 (단위 벡터). 고리 경로는 처음 점을 끝에 한 번 더 둠 */
  points: Vec3[]
  /** 각 꼭짓점까지 누적 중심각 (라디안) */
  cumulative: number[]
  /** 전체 중심각 (라디안) */
  length: number
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

function cross(a: Vec3, b: Vec3, out: Vec3): Vec3 {
  const x = a[1] * b[2] - a[2] * b[1]
  const y = a[2] * b[0] - a[0] * b[2]
  const z = a[0] * b[1] - a[1] * b[0]
  out[0] = x
  out[1] = y
  out[2] = z
  return out
}

/** 길이가 0이면 false (out은 그대로) */
function normalize(v: Vec3): boolean {
  const l = Math.hypot(v[0], v[1], v[2])
  if (l < 1e-12) return false
  v[0] /= l
  v[1] /= l
  v[2] /= l
  return true
}

/** 두 단위 벡터 사이 중심각 (작은 각에서도 정확한 atan2 식) */
function angle(a: Vec3, b: Vec3): number {
  const cx = a[1] * b[2] - a[2] * b[1]
  const cy = a[2] * b[0] - a[0] * b[2]
  const cz = a[0] * b[1] - a[1] * b[0]
  return Math.atan2(Math.hypot(cx, cy, cz), dot(a, b))
}

/** 대권 a→b 위 비율 t 지점 */
function slerp(a: Vec3, b: Vec3, t: number, out: Vec3): Vec3 {
  const omega = angle(a, b)
  if (omega < 1e-9) {
    out[0] = a[0]
    out[1] = a[1]
    out[2] = a[2]
    return out
  }
  const sin = Math.sin(omega)
  const wa = Math.sin((1 - t) * omega) / sin
  const wb = Math.sin(t * omega) / sin
  out[0] = a[0] * wa + b[0] * wb
  out[1] = a[1] * wa + b[1] * wb
  out[2] = a[2] * wa + b[2] * wb
  return out
}

export function makePath(waypoints: readonly LatLon[], loop = false): Path {
  const points = waypoints.map((p) => latLonToVector3(p))
  if (loop && points.length > 1) points.push([...points[0]] as Vec3)
  const cumulative = [0]
  for (let i = 1; i < points.length; i++)
    cumulative.push(cumulative[i - 1] + angle(points[i - 1], points[i]))
  return { points, cumulative, length: cumulative[cumulative.length - 1] }
}

/** 비율 s(0~1)가 놓인 구간 번호와 구간 안 비율 */
function locate(path: Path, s: number): { i: number; t: number } {
  const last = path.points.length - 2
  const target = Math.min(1, Math.max(0, s)) * path.length
  let i = 0
  while (i < last && path.cumulative[i + 1] < target) i++
  const span = path.cumulative[i + 1] - path.cumulative[i]
  return { i, t: span > 0 ? (target - path.cumulative[i]) / span : 0 }
}

/** 경로 위 비율 s(0~1, 길이 기준) 지점의 단위 벡터 */
export function pointAt(path: Path, s: number, out: Vec3 = [0, 0, 0]): Vec3 {
  if (path.points.length < 2) {
    const p = path.points[0] ?? [0, 1, 0]
    out[0] = p[0]
    out[1] = p[1]
    out[2] = p[2]
    return out
  }
  const { i, t } = locate(path, s)
  return slerp(path.points[i], path.points[i + 1], t, out)
}

const scratchPoint: Vec3 = [0, 0, 0]
const scratchNormal: Vec3 = [0, 0, 0]

/** 경로 위 비율 s 지점에서 진행 방향 (단위 접선 벡터) */
export function headingAt(path: Path, s: number, out: Vec3 = [0, 0, 0]): Vec3 {
  const p = pointAt(path, s, scratchPoint)
  if (path.points.length >= 2) {
    const { i } = locate(path, s)
    // 대권 a→b의 법선 n에 대해 n × p가 b 쪽 진행 방향
    cross(path.points[i], path.points[i + 1], scratchNormal)
    if (normalize(scratchNormal) && normalize(cross(scratchNormal, p, out)))
      return out
  }
  // 구간 길이가 0이면 아무 접선이나 (북쪽 또는 x축과 수직)
  cross(p, Math.abs(p[1]) > 0.99 ? [1, 0, 0] : [0, 1, 0], out)
  normalize(out)
  return out
}

/**
 * 경로에서 위도(절댓값)가 가장 높은 지점.
 * 구간마다 양 끝과, 대권의 꼭짓점(북극을 대권 평면에 내린 점)이 구간 안에 있으면 그 점을 봅니다.
 */
export function peakPoint(path: Path): LatLon {
  let best: Vec3 = path.points[0] ?? [0, 1, 0]
  const consider = (p: Vec3) => {
    if (Math.abs(p[1]) > Math.abs(best[1])) best = p
  }
  const n: Vec3 = [0, 0, 0]
  for (let i = 0; i < path.points.length - 1; i++) {
    const a = path.points[i]
    const b = path.points[i + 1]
    consider(b)
    cross(a, b, n)
    if (!normalize(n)) continue
    const vertex: Vec3 = [-n[0] * n[1], 1 - n[1] * n[1], -n[2] * n[1]]
    if (!normalize(vertex)) continue
    const span = path.cumulative[i + 1] - path.cumulative[i]
    for (const v of [vertex, [-vertex[0], -vertex[1], -vertex[2]] as Vec3])
      if (Math.abs(angle(a, v) + angle(v, b) - span) < 1e-9) consider(v)
  }
  return vector3ToLatLon(best)
}

/** 경로의 최고 위도 (°, 절댓값) */
export function peakLatitude(path: Path): number {
  return Math.abs(peakPoint(path).lat)
}

/** 점 p에서 경로까지 가장 가까운 거리(km)와 그 지점의 비율 s */
export function nearestOnPath(
  path: Path,
  p: LatLon,
): { km: number; s: number } {
  const v = latLonToVector3(p)
  if (path.points.length < 2 || path.length === 0)
    return { km: angle(v, path.points[0] ?? v) * RADIUS_KM, s: 0 }
  let best = { angle: Infinity, s: 0 }
  const consider = (a: number, s: number) => {
    if (a < best.angle) best = { angle: a, s }
  }
  const n: Vec3 = [0, 0, 0]
  const q: Vec3 = [0, 0, 0]
  for (let i = 0; i < path.points.length - 1; i++) {
    const a = path.points[i]
    const b = path.points[i + 1]
    const start = path.cumulative[i]
    const span = path.cumulative[i + 1] - start
    consider(angle(v, a), start / path.length)
    consider(angle(v, b), (start + span) / path.length)
    // 대권 평면에 내린 발이 구간 안에 있으면 그 점까지
    cross(a, b, n)
    if (!normalize(n)) continue
    const d = dot(v, n)
    q[0] = v[0] - n[0] * d
    q[1] = v[1] - n[1] * d
    q[2] = v[2] - n[2] * d
    if (!normalize(q)) continue
    const fromA = angle(a, q)
    if (Math.abs(fromA + angle(q, b) - span) < 1e-9)
      consider(angle(v, q), (start + fromA) / path.length)
  }
  return { km: best.angle * RADIUS_KM, s: best.s }
}

/**
 * a→b 대권이 중심 center, 반지름 radiusKm인 원을 비켜 가도록 지날 점.
 * 경로에서 원 중심에 가장 가까운 쪽으로 원 밖에 두고, 두 구간이 원을 스치면 더 멀리 둡니다.
 */
export function detourAround(
  a: LatLon,
  b: LatLon,
  center: LatLon,
  radiusKm: number,
): LatLon {
  const base = makePath([a, b])
  const c = latLonToVector3(center)
  const q = pointAt(base, nearestOnPath(base, center).s)
  // 원 중심에서 경로 쪽으로 향하는 접선 방향 (경로가 중심을 지나면 경로의 법선 쪽)
  const d = dot(q, c)
  const dir: Vec3 = [q[0] - c[0] * d, q[1] - c[1] * d, q[2] - c[2] * d]
  if (!normalize(dir)) {
    cross(base.points[0], base.points[1], dir)
    if (!normalize(dir)) dir[1] = 1
  }
  const radius = kmToRadians(radiusKm)
  let offset = radius * 1.25
  let via = center
  for (let k = 0; k < 12; k++) {
    const cos = Math.cos(offset)
    const sin = Math.sin(offset)
    via = vector3ToLatLon([
      c[0] * cos + dir[0] * sin,
      c[1] * cos + dir[1] * sin,
      c[2] * cos + dir[2] * sin,
    ])
    if (nearestOnPath(makePath([a, via, b]), center).km > radiusKm * 1.02)
      return via
    offset *= 1.2
  }
  return via
}
