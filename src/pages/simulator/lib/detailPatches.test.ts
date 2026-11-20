import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DETAIL_PATCHES } from '@/shared/config'
import { getSite } from '../model/site/data'
import { earthFragment } from './shaders'

/** 무손실 WebP(VP8L) 머리에서 가로·세로 */
function webpSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(resolve('public/textures', file))
  const at = bytes.indexOf('VP8L')
  const bits = bytes.readUInt32LE(at + 9)
  return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
}

/** 도(°)가 1분 격자점에서 벗어난 정도 (분 단위, 부동소수점 오차 무시) */
const offGrid = (deg: number) => Math.abs(deg * 60 - Math.round(deg * 60))

/** 패치마다 세밀하게 보여야 할 도시 (섞는 가장자리보다 안쪽에 있어야 함) */
const CITIES_IN_PATCH: Record<string, string[]> = {
  korea: ['seoul', 'busan', 'mokpo'],
  'tokyo-bay': ['tokyo'],
  netherlands: ['amsterdam'],
  'bengal-delta': ['dhaka', 'kolkata'],
  'mekong-delta': ['ho-chi-minh'],
  'chao-phraya': ['bangkok'],
  'yangtze-delta': ['shanghai'],
  'pearl-river-delta': ['guangzhou', 'hong-kong'],
  'nile-delta': ['alexandria'],
  jakarta: ['jakarta'],
  'south-florida': ['miami'],
}

describe('고해상도 고도 패치', () => {
  it('저지대 삼각주·해안 열한 곳을 이름이 겹치지 않게 둔다', () => {
    expect(DETAIL_PATCHES.map((patch) => patch.id)).toEqual(
      Object.keys(CITIES_IN_PATCH),
    )
    for (const patch of DETAIL_PATCHES)
      expect(patch.url).toMatch(
        new RegExp(`textures/${patch.id}-elevation\\.webp$`),
      )
  })

  it('이미지 크기가 범위와 맞는 1분 격자다 (격자점이 픽셀 가운데)', () => {
    for (const { id, bounds } of DETAIL_PATCHES) {
      const { width, height } = webpSize(`${id}-elevation.webp`)
      expect(width, id).toBe(Math.round((bounds.east - bounds.west) * 60))
      expect(height, id).toBe(Math.round((bounds.north - bounds.south) * 60))
      // 가장자리는 1분 격자점에서 반 칸 바깥
      expect(offGrid(bounds.west + 1 / 120), id).toBeCloseTo(0, 6)
      expect(offGrid(bounds.south + 1 / 120), id).toBeCloseTo(0, 6)
    }
  })

  it('패치끼리 겹치지 않는다', () => {
    for (const [i, a] of DETAIL_PATCHES.entries())
      for (const b of DETAIL_PATCHES.slice(i + 1)) {
        const apart =
          a.bounds.east <= b.bounds.west ||
          b.bounds.east <= a.bounds.west ||
          a.bounds.north <= b.bounds.south ||
          b.bounds.north <= a.bounds.south
        expect(apart, `${a.id} · ${b.id}`).toBe(true)
      }
  })

  it('대상 도시가 바깥 고도와 섞는 가장자리(4%)보다 안쪽에 있다', () => {
    for (const { id, bounds } of DETAIL_PATCHES)
      for (const cityId of CITIES_IN_PATCH[id]) {
        const city = getSite(cityId)
        expect(city, cityId).toBeDefined()
        const u = (city!.lon - bounds.west) / (bounds.east - bounds.west)
        const v = (city!.lat - bounds.south) / (bounds.north - bounds.south)
        expect(
          Math.min(u, 1 - u, v, 1 - v),
          `${id} · ${cityId}`,
        ).toBeGreaterThan(0.04)
      }
  })

  it('지구 셰이더의 텍스처는 WebGL2가 보장하는 16개를 넘지 않는다', () => {
    const samplers = earthFragment.match(/uniform sampler2D /g) ?? []
    expect(samplers.length).toBe(3 + DETAIL_PATCHES.length)
    expect(samplers.length).toBeLessThanOrEqual(16)
  })
})
