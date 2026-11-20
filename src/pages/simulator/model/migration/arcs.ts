import { latLonToVector3 } from '@/shared/lib'
import type { LatLon, Vec3 } from '@/shared/lib'

/** 지구(반지름 1) 표면 바로 위 */
const SURFACE = 1.004

/** 호 가운데가 떠오르는 높이: 가까우면 낮게, 지구 반대편이면 0.075 */
export function arcLift(angle: number): number {
  return 0.015 + 0.06 * (angle / Math.PI)
}

/** 두 도시를 잇는 대권 호 (segments + 1개 점). 가운데는 arcLift만큼 떠오름 */
export function flowArc(from: LatLon, to: LatLon, segments = 24): Vec3[] {
  const a = latLonToVector3(from)
  const b = latLonToVector3(to)
  const cos = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const angle = Math.acos(cos)
  const sin = Math.sin(angle)
  const lift = arcLift(angle)
  const points: Vec3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    // 구면 선형 보간 (같은 점이면 그대로)
    const wa = sin < 1e-9 ? 1 - t : Math.sin((1 - t) * angle) / sin
    const wb = sin < 1e-9 ? t : Math.sin(t * angle) / sin
    const r = SURFACE + lift * Math.sin(Math.PI * t)
    points.push([
      (wa * a[0] + wb * b[0]) * r,
      (wa * a[1] + wb * b[1]) * r,
      (wa * a[2] + wb * b[2]) * r,
    ])
  }
  return points
}
