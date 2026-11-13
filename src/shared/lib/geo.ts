export interface LatLon {
  lat: number
  lon: number
}

export type Vec3 = [number, number, number]

const EARTH_RADIUS_KM = 6371
/** 지구 육지 면적 (km²) */
export const EARTH_LAND_AREA_KM2 = 148_940_000

const DEG = Math.PI / 180

/**
 * 위도·경도를 three.js SphereGeometry의 UV 배치와 같은 좌표로 바꿉니다.
 * (u = 0 이 경도 -180°, v = 0 이 북극)
 */
export function latLonToVector3({ lat, lon }: LatLon, radius = 1): Vec3 {
  const phi = (lon + 180) * DEG
  const theta = (90 - lat) * DEG
  return [
    -radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
  ]
}

export function vector3ToLatLon([x, y, z]: Vec3): LatLon {
  const r = Math.hypot(x, y, z)
  const lat = 90 - Math.acos(Math.min(1, Math.max(-1, y / r))) / DEG
  let lon = Math.atan2(z, -x) / DEG - 180
  if (lon < -180) lon += 360
  return { lat, lon }
}

/** 두 지점 사이의 대권 거리 (km) */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = (b.lat - a.lat) * DEG
  const dLon = (b.lon - a.lon) * DEG
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** 거리(km)를 지구 중심각(라디안)으로 */
export function kmToRadians(km: number): number {
  return km / EARTH_RADIUS_KM
}
