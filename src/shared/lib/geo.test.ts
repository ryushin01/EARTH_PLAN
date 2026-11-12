import { describe, expect, it } from 'vitest'
import { distanceKm, latLonToVector3, vector3ToLatLon } from './geo'

describe('geo', () => {
  it('북극은 +Y 방향이다', () => {
    const [x, y, z] = latLonToVector3({ lat: 90, lon: 0 })
    expect(y).toBeCloseTo(1)
    expect(Math.abs(x) + Math.abs(z)).toBeCloseTo(0)
  })

  it('위경도 ↔ 벡터 변환이 서로 되돌려진다', () => {
    for (const p of [
      { lat: 37.5, lon: 127 },
      { lat: -33.9, lon: 151.2 },
      { lat: 40.7, lon: -74 },
      { lat: 0, lon: 179.5 },
    ]) {
      const back = vector3ToLatLon(latLonToVector3(p, 2))
      expect(back.lat).toBeCloseTo(p.lat, 6)
      expect(back.lon).toBeCloseTo(p.lon, 6)
    }
  })

  it('서울–도쿄 거리가 약 1,150km다', () => {
    const d = distanceKm(
      { lat: 37.57, lon: 126.98 },
      { lat: 35.68, lon: 139.69 },
    )
    expect(d).toBeGreaterThan(1100)
    expect(d).toBeLessThan(1200)
  })
})
