import { distanceKm } from '@/shared/lib'
import { CITIES, getSite } from '../site/data'
import type { City } from '../site/types'
import { TRANSIENT_MS } from '../render'
import { cityStates, summarize } from '../world/selectors'
import { useWorld } from '../world/store'
import { EVACUATION_SHARE, migrationFlows } from './flows'

const city = (id: string) => getSite(id) as City

describe('인구 이동 흐름', () => {
  beforeEach(() => useWorld.getState().reset())

  it('잠긴 도시도 재해도 없으면 흐름이 없다', () => {
    expect(migrationFlows(useWorld.getState(), 0)).toEqual([])
  })

  it('해수면으로 잠긴 도시의 이주는 같은 지역의 안전한 가까운 도시 두 곳으로 6:4로 나뉘고, 합은 HUD 이주 추정과 같다', () => {
    useWorld.getState().setSeaLevel(6)
    const state = useWorld.getState()
    const flows = migrationFlows(state, 0)
    const sea = flows.filter((f) => f.kind === 'sea')
    expect(sea.length).toBeGreaterThan(0)
    const total = sea.reduce((sum, f) => sum + f.millions, 0)
    expect(total).toBeCloseTo(summarize(state).displacedMillions, 6)
    const states = cityStates(state)
    for (const flow of sea) {
      expect(states[flow.from]).toBe('flooded')
      expect(states[flow.to]).toBe('safe')
    }
    let splits = 0
    for (const from of new Set(sea.map((f) => f.from))) {
      const group = sea.filter((f) => f.from === from)
      // 같은 지역에 안전한 도시가 있으면 그 지역 안에서만 옮겨 감
      const regionHasSafe = CITIES.some(
        (c) =>
          c.id !== from &&
          c.region === city(from).region &&
          states[c.id] === 'safe',
      )
      if (regionHasSafe)
        for (const flow of group)
          expect(city(flow.to).region).toBe(city(from).region)
      // 두 곳으로 나뉘면 가까운 쪽이 6할
      if (group.length === 2) {
        splits++
        const [near, far] = group
        expect(near.millions / (near.millions + far.millions)).toBeCloseTo(0.6)
        expect(distanceKm(city(from), city(near.to))).toBeLessThanOrEqual(
          distanceKm(city(from), city(far.to)),
        )
      }
    }
    expect(splits).toBeGreaterThan(0)
  })

  it('재해로 큰 피해를 입은 도시는 재해 효과가 이어지는 동안 인구 일부가 가까운 안전한 도시로 피난한다', () => {
    const t0 = 1_000
    useWorld.getState().triggerTsunami('japan-trench', 9.5, t0)
    const state = useWorld.getState()
    const hit = state.tsunamis[0].impacts
      .filter((i) => i.outcome === 'hit')
      .map((i) => i.cityId)
    expect(hit.length).toBeGreaterThan(0)
    const during = migrationFlows(state, t0 + 10_000).filter(
      (f) => f.kind === 'disaster',
    )
    expect(new Set(during.map((f) => f.from))).toEqual(new Set(hit))
    const fromFirst = during.filter((f) => f.from === hit[0])
    expect(fromFirst.reduce((sum, f) => sum + f.millions, 0)).toBeCloseTo(
      city(hit[0]).population * EVACUATION_SHARE,
    )
    for (const flow of during) expect(hit).not.toContain(flow.to)
    expect(
      migrationFlows(state, t0 + TRANSIENT_MS + 1).filter(
        (f) => f.kind === 'disaster',
      ),
    ).toEqual([])
  })
})
