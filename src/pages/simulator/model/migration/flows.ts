import { distanceKm } from '@/shared/lib'
import { TRANSIENT_MS } from '../render'
import { CITIES } from '../site/data'
import type { City } from '../site/types'
import { cityStates } from '../world/selectors'
import type { WorldState } from '../world/types'

/** sea: 해수면으로 잠긴 도시를 떠나는 이주(오래감), disaster: 재해 직후 임시 피난 */
export type FlowKind = 'sea' | 'disaster'

export interface MigrationFlow {
  from: string
  to: string
  /** 백만 명 (단순 추정) */
  millions: number
  kind: FlowKind
}

/** 재해로 큰 피해를 입은 도시에서 임시로 피난하는 인구 비율 (단순 가정) */
export const EVACUATION_SHARE = 0.05

/** 해수면으로 잠긴 도시를 떠나는 인구 (백만 명). HUD의 이주 추정과 같은 식 */
export function displacedFromFlooding(city: City, seaLevel: number): number {
  return (
    city.population * Math.min(1, 0.15 + (seaLevel - city.elevation) * 0.08)
  )
}

type MigrationWorld = Pick<
  WorldState,
  | 'seaLevel'
  | 'structures'
  | 'year'
  | 'tsunamis'
  | 'quakes'
  | 'impacts'
  | 'eruptions'
>

/** 재해 효과가 이어지는 동안(시작 뒤 TRANSIENT_MS) 큰 피해를 입은 도시 */
function disasterHitCities(world: MigrationWorld, nowMs: number): Set<string> {
  const recent = (startedAt: number) => nowMs - startedAt < TRANSIENT_MS
  const hit = new Set<string>()
  for (const t of world.tsunamis)
    if (recent(t.startedAt))
      for (const i of t.impacts) if (i.outcome === 'hit') hit.add(i.cityId)
  for (const q of world.quakes)
    if (recent(q.startedAt))
      for (const i of q.impacts) if (i.outcome === 'severe') hit.add(i.cityId)
  for (const i of world.impacts)
    if (recent(i.startedAt)) for (const id of i.affectedCityIds) hit.add(id)
  for (const e of world.eruptions)
    if (recent(e.startedAt)) for (const id of e.affectedCityIds) hit.add(id)
  return hit
}

/** 가장 가까운 안전한 도시 두 곳 (같은 지역 먼저, 없으면 어디든) */
function nearestSafe(from: City, safe: readonly City[]): City[] {
  const others = safe.filter((c) => c.id !== from.id)
  const sameRegion = others.filter((c) => c.region === from.region)
  return [...(sameRegion.length ? sameRegion : others)]
    .sort((a, b) => distanceKm(from, a) - distanceKm(from, b))
    .slice(0, 2)
}

/** 나눌 몫: 두 곳이면 가까운 쪽 6, 먼 쪽 4 */
function split(to: City[]): number[] {
  return to.length === 2 ? [0.6, 0.4] : [1]
}

/**
 * 인구 이동 흐름 (단순 추정): 해수면으로 잠긴 도시의 이주와 재해로 큰 피해를 입은 도시의 임시 피난을
 * 가까운 안전한 도시로 보냄. 안전한 도시 = 잠기지 않고 위험하지 않으며 지금 재해 피해가 없는 곳
 */
export function migrationFlows(
  world: MigrationWorld,
  nowMs: number,
): MigrationFlow[] {
  const states = cityStates(world)
  const hit = disasterHitCities(world, nowMs)
  const safe = CITIES.filter((c) => states[c.id] === 'safe' && !hit.has(c.id))
  if (safe.length === 0) return []
  const flows: MigrationFlow[] = []
  const send = (from: City, millions: number, kind: FlowKind) => {
    const to = nearestSafe(from, safe)
    split(to).forEach((share, i) =>
      flows.push({
        from: from.id,
        to: to[i].id,
        millions: millions * share,
        kind,
      }),
    )
  }
  for (const city of CITIES) {
    if (states[city.id] === 'flooded')
      send(city, displacedFromFlooding(city, world.seaLevel), 'sea')
    else if (hit.has(city.id))
      send(city, city.population * EVACUATION_SHARE, 'disaster')
  }
  return flows
}
