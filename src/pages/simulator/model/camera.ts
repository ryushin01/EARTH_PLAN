import { Spherical, Vector3 } from 'three'
import type { Vec3 } from '@/shared/lib'

export interface CameraApi {
  rotate: (dTheta: number, dPhi: number) => void
  zoom: (factor: number) => void
  focus: (direction: Vec3) => void
}

export const MIN_DISTANCE = 1.35
export const MAX_DISTANCE = 7

/** 카메라 위치를 구면 좌표로 돌리거나 당긴 새 위치 */
export function orbitPosition(
  position: Vec3,
  dTheta: number,
  dPhi: number,
  zoom = 1,
): Vec3 {
  const s = new Spherical().setFromVector3(new Vector3(...position))
  s.theta += dTheta
  s.phi = Math.min(Math.PI - 0.15, Math.max(0.15, s.phi + dPhi))
  s.radius = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, s.radius * zoom))
  const v = new Vector3().setFromSpherical(s)
  return [v.x, v.y, v.z]
}
