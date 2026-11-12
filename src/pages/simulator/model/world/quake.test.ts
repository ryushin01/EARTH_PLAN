import { FAULTS } from '../site/data'
import {
  quakeImpacts,
  quakeSevereRadiusKm,
  quakeStrongRadiusKm,
} from './hazards'
import { useWorld } from './store'

const anatolian = FAULTS.find((f) => f.id === 'north-anatolian')!

describe('지진', () => {
  beforeEach(() => useWorld.getState().reset())

  it('규모가 1 오르면 피해 반경이 약 3.2배가 된다', () => {
    expect(quakeSevereRadiusKm(7)).toBeCloseTo(31.6, 0)
    expect(quakeSevereRadiusKm(8) / quakeSevereRadiusKm(7)).toBeCloseTo(3.16, 1)
    expect(quakeStrongRadiusKm(7)).toBeCloseTo(quakeSevereRadiusKm(7) * 2.5)
  })

  it('북아나톨리아 규모 7.6은 이스탄불에 큰 피해를 주고, 내진 보강은 한 단계 낮춘다', () => {
    const raw = quakeImpacts(anatolian, 7.6, [], 2030)
    expect(raw.find((i) => i.cityId === 'istanbul')?.outcome).toBe('severe')
    const retrofit = [
      {
        id: 'r',
        kind: 'seismic-retrofit' as const,
        siteId: 'istanbul',
        startYear: 2026,
        completeYear: 2027,
      },
    ]
    expect(
      quakeImpacts(anatolian, 7.6, retrofit, 2030).find(
        (i) => i.cityId === 'istanbul',
      )?.outcome,
    ).toBe('moderate')
  })

  it('지진을 일으키면 기록하고, 단층이 아니면 거부한다', () => {
    const r = useWorld.getState().triggerQuake('main-himalayan', 7.8, 0)
    expect(r.ok).toBe(true)
    expect(r.message).toContain('카트만두')
    expect(useWorld.getState().quakes[0].impacts[0].cityId).toBe('kathmandu')
    expect(useWorld.getState().triggerQuake('tokyo', 7, 0).ok).toBe(false)
  })

  it('구조물에 쓴 예산을 기록한다', () => {
    useWorld.getState().build('seismic-retrofit', 'istanbul')
    useWorld.getState().build('sea-wall', 'tokyo')
    expect(useWorld.getState().spent).toBe(70)
  })
})
