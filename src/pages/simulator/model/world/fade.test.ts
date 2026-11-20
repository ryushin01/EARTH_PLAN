import { ashCloud, solarFade } from './fade'
import { ashRadiusKm } from './engine'
import type { Eruption, SolarStorm } from './types'

const NOW = 100_000

function eruption(startedAt: number, year = 2030): Eruption {
  return {
    id: 'e1',
    volcanoId: 'eyjafjallajokull',
    requestedVei: 5,
    vei: 5,
    year,
    startedAt,
    ashRadiusKm: ashRadiusKm(5),
    affectedCityIds: [],
  }
}

function storm(startedAt: number, year = 2030): SolarStorm {
  return {
    id: 's1',
    level: 'g4',
    year,
    startedAt,
    auroraLat: 45,
    satellitesLost: 5,
    impacts: [],
  }
}

describe('화산재 구름', () => {
  it('처음엔 반지름의 20%에서 시작해 4.8초 뒤 다 퍼진다', () => {
    expect(ashCloud(eruption(NOW), 2030, NOW)?.radiusKm).toBeCloseTo(
      ashRadiusKm(5) * 0.2,
    )
    expect(ashCloud(eruption(NOW - 5_000), 2030, NOW)?.radiusKm).toBe(
      ashRadiusKm(5),
    )
  })

  it('화면 40초까지 짙고, 60초가 지나면 사라진다', () => {
    expect(ashCloud(eruption(NOW - 30_000), 2030, NOW)?.amount).toBeCloseTo(
      0.85,
    )
    expect(ashCloud(eruption(NOW - 61_000), 2030, NOW)).toBeNull()
  })

  it('시뮬레이션으로 3년이 지나면 사라진다', () => {
    expect(ashCloud(eruption(NOW - 1_000, 2030), 2033, NOW)).toBeNull()
  })
})

describe('태양 폭풍 세기', () => {
  it('2초에 걸쳐 밝아지고 30초 동안 유지된다', () => {
    expect(solarFade(storm(NOW - 1_000), 2030, NOW)).toBeCloseTo(0.5)
    expect(solarFade(storm(NOW - 20_000), 2030, NOW)).toBe(1)
  })

  it('화면 50초나 시뮬레이션 약 11일이 지나면 0', () => {
    expect(solarFade(storm(NOW - 51_000), 2030, NOW)).toBe(0)
    expect(solarFade(storm(NOW - 10_000, 2030), 2030.04, NOW)).toBe(0)
  })
})
