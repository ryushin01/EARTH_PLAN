import { REGIONS } from '../site/data'
import {
  blastRadiusKm,
  deflectedDiameter,
  droughtEffects,
  impactCooling,
  impactEnergyMt,
  impactPeakCooling,
  impactTsunamiMagnitude,
  stepWildfires,
  wildfireArea,
} from './hazards'

const california = REGIONS.find((r) => r.id === 'california')!
const defense = [
  {
    id: 'd',
    kind: 'planetary-defense' as const,
    siteId: 'orbit',
    startYear: 2026,
    completeYear: 2027,
  },
]

describe('소행성 충돌', () => {
  it('지름 50m는 퉁구스카급(약 10메가톤)이다', () => {
    const e = impactEnergyMt(50)
    expect(e).toBeGreaterThan(5)
    expect(e).toBeLessThan(20)
  })

  it('지름 10km는 약 7천만 메가톤이고 피해 반경이 수천 km다', () => {
    const e = impactEnergyMt(10_000)
    expect(e).toBeGreaterThan(5e7)
    expect(blastRadiusKm(e)).toBeGreaterThan(1500)
  })

  it('1km 이상이면 충돌 겨울이 오고 시간이 지나면 회복된다', () => {
    expect(impactPeakCooling(100)).toBe(0)
    expect(impactPeakCooling(10_000)).toBeGreaterThan(7)
    const impact = {
      id: 'i',
      targetId: 'chicxulub',
      diameterM: 10_000,
      effectiveDiameterM: 10_000,
      year: 2030,
      startedAt: 0,
      energyMt: 0,
      blastRadiusKm: 0,
      thermalRadiusKm: 0,
      ocean: true,
      affectedCityIds: [],
    }
    expect(impactCooling([impact], 2030)).toBeGreaterThan(7)
    expect(impactCooling([impact], 2050)).toBeLessThan(0.1)
  })

  it('행성 방위 요격망은 1km 이하를 빗나가게 하고 큰 것은 절반으로 줄인다', () => {
    expect(deflectedDiameter(1000, defense, 2030)).toBe(0)
    expect(deflectedDiameter(10_000, defense, 2030)).toBe(5000)
    expect(deflectedDiameter(1000, defense, 2026.5)).toBe(1000)
  })

  it('바다 충돌은 큰 쓰나미 규모로 환산된다', () => {
    expect(impactTsunamiMagnitude(impactEnergyMt(1000))).toBeGreaterThan(9.5)
    expect(impactTsunamiMagnitude(impactEnergyMt(50))).toBeLessThan(8.5)
  })
})

describe('산불·가뭄', () => {
  it('더울수록, 가뭄일수록 크게 타고 소방 거점이 줄인다', () => {
    const base = wildfireArea(california, 1.2, [], 2030, false)
    expect(wildfireArea(california, 3.2, [], 2030, false)).toBeCloseTo(base * 2)
    expect(wildfireArea(california, 1.2, [], 2030, true)).toBeCloseTo(
      base * 1.8,
    )
    const station = [
      {
        id: 'f',
        kind: 'firefighting-base' as const,
        siteId: 'california',
        startYear: 2026,
        completeYear: 2027,
      },
    ]
    expect(wildfireArea(california, 1.2, station, 2030, false)).toBeCloseTo(
      base * 0.4,
    )
  })

  it('가뭄 정도에 따라 기간과 피해가 커지고 담수화 시설이 줄인다', () => {
    const mild = droughtEffects(california, 1, [], 2030, 1.2)
    const severe = droughtEffects(california, 3, [], 2030, 1.2)
    expect(severe.durationYears).toBe(4)
    expect(severe.affectedMillions).toBeGreaterThan(mild.affectedMillions)
    const desal = [
      {
        id: 'w',
        kind: 'desalination' as const,
        siteId: 'california',
        startYear: 2026,
        completeYear: 2027,
      },
    ]
    expect(
      droughtEffects(california, 3, desal, 2030, 1.2).affectedMillions,
    ).toBeCloseTo(severe.affectedMillions / 2)
  })

  it('저절로 난 산불은 기간이 끝나면 사라지고 개수에 상한이 있다', () => {
    const always = () => 0
    const fires = stepWildfires([], [], [], 2030, 1, 3, 0, always)
    expect(fires.length).toBe(6)
    expect(stepWildfires(fires, [], [], 2031, 0, 3, 0, always)).toHaveLength(0)
  })
})
