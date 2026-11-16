import { getSite } from '../site/data'
import type { LatLon } from '@/shared/lib'
import {
  SOLAR_LEVELS,
  SOLAR_SPEC,
  geomagneticLatitude,
  solarStormImpacts,
} from './hazards'

const shield = [
  {
    id: 'sw',
    kind: 'space-weather-shield' as const,
    siteId: 'orbit',
    startYear: 2026,
    completeYear: 2027,
  },
]
const mlat = (id: string) => geomagneticLatitude(getSite(id) as LatLon)

describe('지자기 위도', () => {
  it('알려진 값과 비슷하다 (런던 약 53°, 뉴욕 약 50°, 서울 약 29°)', () => {
    expect(mlat('london')).toBeCloseTo(53.4, 0)
    expect(mlat('new-york')).toBeCloseTo(49.9, 0)
    expect(mlat('seoul')).toBeCloseTo(28.9, 0)
    expect(mlat('sydney')).toBeLessThan(-35)
  })
})

describe('태양 폭풍', () => {
  it('세기가 클수록 오로라가 낮은 위도까지 내려오고 피해 도시가 늘어난다', () => {
    const counts = SOLAR_LEVELS.map(
      (level) => solarStormImpacts(level, [], 2030).impacts.length,
    )
    const aurora = SOLAR_LEVELS.map((level) => SOLAR_SPEC[level].auroraLat)
    for (let i = 1; i < SOLAR_LEVELS.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1])
      expect(aurora[i]).toBeLessThan(aurora[i - 1])
    }
  })

  it('G5는 고위도 도시가 정전되고 레이캬비크는 변압기가 손상된다', () => {
    const { impacts, satellitesLost } = solarStormImpacts('g5', [], 2030)
    const outcome = (id: string) =>
      impacts.find((i) => i.cityId === id)?.outcome
    expect(outcome('reykjavik')).toBe('damaged')
    expect(outcome('london')).toBe('outage')
    expect(outcome('seoul')).toBeUndefined()
    expect(satellitesLost).toBe(40)
    // 지자기 위도가 높은 순
    expect(impacts[0].cityId).toBe('reykjavik')
  })

  it('우주 기상 경보망이 있으면 변압기 손상이 없고, 정전 범위와 위성 피해가 줄어든다', () => {
    const before = solarStormImpacts('carrington', [], 2030)
    const after = solarStormImpacts('carrington', shield, 2030)
    expect(before.impacts.some((i) => i.outcome === 'damaged')).toBe(true)
    expect(after.impacts.some((i) => i.outcome === 'damaged')).toBe(false)
    expect(after.impacts.some((i) => i.outcome === 'protected')).toBe(true)
    expect(after.satellitesLost).toBe(before.satellitesLost / 2)
    // 완공 전에는 효과가 없음
    expect(solarStormImpacts('carrington', shield, 2026.5)).toEqual(before)
  })
})
