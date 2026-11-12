import { CITIES, getSite } from '../site/data'
import type { City, Strait } from '../site/types'
import { STRUCTURES, STRUCTURE_EN } from '../structure/catalog'
import { effectFactor, isActive } from '../structure/types'
import type { BuiltStructure } from '../structure/types'
import type { StructureKind } from '../structure/catalog'
import {
  DAYS_PER_YEAR,
  EARTH_LAND_AREA_KM2,
  distanceKm,
  northernSeason,
} from '@/shared/lib'
import { impactCooling, stepWildfires } from './hazards'
import { compose, names, siteName } from '../text'
import type { Text } from '../text'
import { SCENARIOS, baselineRiseRate, baselineWarming } from './scenario'
import type {
  CityState,
  Eruption,
  HistoryPoint,
  EventTone,
  Storm,
  Tsunami,
  TsunamiImpact,
  WorldState,
} from './types'

export const INCOME_PER_YEAR = 150
export const START_BUDGET = 1500
const MAX_EVENTS = 60
const MAX_STORMS = 8

// ── 구조물 ─────────────────────────────────────────────

function activeOf(
  structures: BuiltStructure[],
  year: number,
  kind?: StructureKind,
) {
  return structures.filter(
    (s) => isActive(s, year) && (!kind || s.kind === kind),
  )
}

/** 해수면 상승 속도 감소율 합계 (최대 80%) */
export function riseReduction(
  structures: BuiltStructure[],
  year: number,
): number {
  const total = activeOf(structures, year).reduce(
    (sum, s) =>
      sum +
      (STRUCTURES[s.kind].riseReduction ?? 0) *
        effectFactor(s, year, STRUCTURES[s.kind].rampYears),
    0,
  )
  return Math.min(0.8, total)
}

export function riseRate(
  state: Pick<WorldState, 'year' | 'scenario' | 'structures'>,
): number {
  return (
    baselineRiseRate(state.year, SCENARIOS[state.scenario]) *
    (1 - riseReduction(state.structures, state.year))
  )
}

/** 도시가 받는 해수면 방어 높이 (m) */
export function seaProtection(
  cityId: string,
  structures: BuiltStructure[],
  year: number,
): number {
  let best = 0
  for (const s of activeOf(structures, year)) {
    const spec = STRUCTURES[s.kind]
    if (!spec.seaProtection) continue
    if (s.siteId === cityId) best = Math.max(best, spec.seaProtection)
    if (s.kind === 'strait-dam') {
      const strait = getSite(s.siteId) as Strait | undefined
      if (strait?.protects.includes(cityId))
        best = Math.max(best, spec.seaProtection)
    }
  }
  return best
}

export function waveProtection(
  cityId: string,
  structures: BuiltStructure[],
  year: number,
): number {
  return activeOf(structures, year)
    .filter((s) => s.siteId === cityId)
    .reduce(
      (best, s) => Math.max(best, STRUCTURES[s.kind].waveProtection ?? 0),
      0,
    )
}

export function cityState(
  city: City,
  state: Pick<WorldState, 'seaLevel' | 'structures' | 'year'>,
): CityState {
  if (!city.coastal) return 'safe'
  const over = state.seaLevel - city.elevation
  if (over <= -1) return 'safe'
  if (over <= 0) return 'at-risk'
  const protection = Math.max(
    city.defense,
    seaProtection(city.id, state.structures, state.year),
  )
  return protection >= state.seaLevel ? 'protected' : 'flooded'
}

// ── 기온 ──────────────────────────────────────────────

const VOLCANIC_COOLING: Record<number, number> = {
  4: 0.02,
  5: 0.1,
  6: 0.4,
  7: 1.0,
  8: 3.0,
}

export function volcanicCooling(eruptions: Eruption[], year: number): number {
  return eruptions.reduce((sum, e) => {
    const age = year - e.year
    if (age < 0) return sum
    return sum + (VOLCANIC_COOLING[e.vei] ?? 0) * Math.exp(-age / 1.5)
  }, 0)
}

/** 산업화 이전 대비 지구 평균기온 상승 (°C) */
export function warming(
  state: Pick<WorldState, 'year' | 'scenario' | 'structures' | 'eruptions'> &
    Partial<Pick<WorldState, 'impacts'>>,
): number {
  const shade = activeOf(state.structures, state.year).reduce(
    (sum, s) =>
      sum +
      (STRUCTURES[s.kind].cooling ?? 0) *
        effectFactor(s, state.year, STRUCTURES[s.kind].rampYears),
    0,
  )
  return (
    baselineWarming(state.year, SCENARIOS[state.scenario]) -
    shade -
    volcanicCooling(state.eruptions, state.year) -
    impactCooling(state.impacts ?? [], state.year)
  )
}

// ── 침수 면적 ──────────────────────────────────────────

/**
 * 512×256 육지 고도 격자로 고도별 누적 면적 비율을 만듭니다.
 * 격자 값: 0 바다, 1~254 고도 (값 − 51)m, 255 204m 이상
 * curve[i] = 고도가 (i − 50)m 미만인 육지 비율
 */
export function buildFloodCurve(
  grid: Uint8Array,
  width: number,
  height: number,
): Float64Array {
  const bins = new Float64Array(257)
  let total = 0
  for (let y = 0; y < height; y++) {
    const lat = 90 - ((y + 0.5) / height) * 180
    const weight = Math.cos((lat * Math.PI) / 180)
    for (let x = 0; x < width; x++) {
      const v = grid[y * width + x]
      if (v === 0) continue
      total += weight
      if (v < 255) bins[v - 1 + 1] += weight
    }
  }
  for (let i = 1; i < bins.length; i++) bins[i] += bins[i - 1]
  if (total > 0) for (let i = 0; i < bins.length; i++) bins[i] /= total
  return bins
}

/** 해수면 seaLevel(m)에 잠기는 육지 면적 (km²) */
export function floodedArea(curve: Float64Array, seaLevel: number): number {
  // 현재 해안선(0m 미만)은 이미 물로 보고, 0m~seaLevel 구간만 셉니다
  const at = (level: number) => {
    const pos = Math.max(0, Math.min(256, level + 50))
    const i = Math.floor(pos)
    const t = pos - i
    return i >= 256 ? curve[256] : curve[i] * (1 - t) + curve[i + 1] * t
  }
  return Math.max(0, at(seaLevel) - at(0)) * EARTH_LAND_AREA_KM2
}

// ── 화산 ──────────────────────────────────────────────

const ASH_RADIUS_KM: Record<number, number> = {
  1: 20,
  2: 40,
  3: 80,
  4: 150,
  5: 350,
  6: 700,
  7: 1500,
  8: 3000,
}

export function ashRadiusKm(vei: number): number {
  return ASH_RADIUS_KM[Math.max(1, Math.min(8, Math.round(vei)))]
}

export function effectiveVei(
  volcanoId: string,
  requested: number,
  structures: BuiltStructure[],
  year: number,
): number {
  const reduction = activeOf(structures, year, 'magma-relief')
    .filter((s) => s.siteId === volcanoId)
    .reduce((sum, s) => sum + (STRUCTURES[s.kind].veiReduction ?? 0), 0)
  return Math.max(1, requested - reduction)
}

export function citiesWithin(
  center: { lat: number; lon: number },
  radiusKm: number,
): City[] {
  return CITIES.filter((city) => distanceKm(center, city) <= radiusKm)
}

// ── 쓰나미 ────────────────────────────────────────────

/** 진원 근처 쓰나미 높이 (m) */
export function sourceWaveHeight(magnitude: number): number {
  return 6 * 10 ** (0.5 * (magnitude - 8))
}

export const TSUNAMI_SPEED_KMH = 700

export function tsunamiImpacts(
  sourceId: string,
  magnitude: number,
  structures: BuiltStructure[],
  year: number,
): TsunamiImpact[] {
  const trench = getSite(sourceId)
  // 해구 지진이나 바다에 떨어진 소행성
  if (trench?.kind !== 'trench' && trench?.kind !== 'ocean') return []
  const h0 = sourceWaveHeight(magnitude)
  return CITIES.filter((city) => city.basins.includes(trench.basin))
    .map((city) => {
      const d = distanceKm(trench, city)
      const waveHeight = h0 * Math.sqrt(150 / Math.max(d, 150))
      const protection = waveProtection(city.id, structures, year)
      const outcome: TsunamiImpact['outcome'] =
        waveHeight <= protection ? 'blocked' : waveHeight >= 3 ? 'hit' : 'minor'
      return {
        cityId: city.id,
        distanceKm: d,
        waveHeight,
        arrivalHours: d / TSUNAMI_SPEED_KMH,
        outcome,
      }
    })
    .filter((impact) => impact.waveHeight >= 0.5)
    .sort((a, b) => a.arrivalHours - b.arrivalHours)
}

// ── 기후·날씨 표현 값 ──────────────────────────────────

export interface ClimateVisuals {
  warming: number
  season: number
  /** 북극 해빙 가장자리 위도 */
  seaIceLatN: number
  /** 남극 해빙 가장자리 위도 (음수) */
  seaIceLatS: number
  /** 북반구 적설선 위도 */
  snowLatN: number
  /** 남반구 적설선 위도 (음수) */
  snowLatS: number
  /** 만년설 고도 (m) */
  snowAltitude: number
  /** 건조화 정도 0~1 */
  aridity: number
  /** 구름 양 0~1 */
  cloudCover: number
}

export function climateVisuals(
  state: Pick<WorldState, 'year' | 'scenario' | 'structures' | 'eruptions'> &
    Partial<Pick<WorldState, 'impacts'>>,
): ClimateVisuals {
  const w = warming(state)
  const season = northernSeason(state.year)
  const extra = Math.max(-1.5, w - 1.2)
  return {
    warming: w,
    season,
    seaIceLatN: Math.min(91, 72 + 6 * season + extra * 4),
    seaIceLatS: Math.max(-91, -(64 - 6 * season) - extra * 3),
    snowLatN: Math.min(91, 57 + 13 * season + extra * 3),
    snowLatS: Math.max(-91, -(52 - 6 * season) - extra * 3),
    snowAltitude: 5300 + extra * 200,
    aridity: Math.max(0, Math.min(1, extra / 3.5)),
    cloudCover: Math.max(0.4, Math.min(0.9, 0.62 + extra * 0.04)),
  }
}

// ── 열대 저기압 ────────────────────────────────────────

interface Basin {
  lat: [number, number]
  lon: [number, number]
  hemisphere: 1 | -1
  weight: number
}

const STORM_BASINS: Basin[] = [
  { lat: [8, 20], lon: [130, 165], hemisphere: 1, weight: 0.33 },
  { lat: [9, 17], lon: [-125, -100], hemisphere: 1, weight: 0.18 },
  { lat: [10, 20], lon: [-60, -30], hemisphere: 1, weight: 0.15 },
  { lat: [9, 17], lon: [84, 92], hemisphere: 1, weight: 0.06 },
  { lat: [-17, -8], lon: [55, 100], hemisphere: -1, weight: 0.17 },
  { lat: [-18, -10], lon: [150, 180], hemisphere: -1, weight: 0.11 },
]

/** 전 세계 연간 열대 저기압 발생 수 (기온이 오르면 조금 늘어남) */
export function stormsPerYear(warmingC: number): number {
  return 85 * (1 + Math.max(0, warmingC - 1.2) * 0.06)
}

export function stepStorms(
  storms: Storm[],
  year: number,
  dtYears: number,
  warmingC: number,
  random: () => number = Math.random,
): Storm[] {
  const dtDays = dtYears * DAYS_PER_YEAR
  const moved = storms
    .filter((s) => (year - s.bornYear) * DAYS_PER_YEAR < s.lifeDays)
    .map((s) => {
      const recurved = Math.abs(s.lat) > 25
      const lonSpeed = recurved ? 4 : -4.5
      let lon = s.lon + lonSpeed * dtDays
      if (lon > 180) lon -= 360
      if (lon < -180) lon += 360
      const lat =
        s.lat + s.hemisphere * (recurved ? 1.6 : (s.poleward ?? 0.8)) * dtDays
      return { ...s, lat, lon }
    })
    .filter((s) => Math.abs(s.lat) < 55)

  const season = northernSeason(year)
  let expected = stormsPerYear(warmingC) * dtYears
  let counter = 0
  while (expected > 0 && moved.length < MAX_STORMS) {
    if (random() >= Math.min(1, expected)) break
    expected -= 1
    let pick = random()
    const basin =
      STORM_BASINS.find((b) => {
        // 북반구는 여름·가을, 남반구는 그 반대 계절에 주로 생깁니다
        const active = b.hemisphere === 1 ? season > -0.2 : season < 0.2
        const w = active ? b.weight : b.weight * 0.15
        pick -= w
        return pick <= 0
      }) ?? STORM_BASINS[0]
    const intense = random() < 0.15 + Math.max(0, warmingC - 1.2) * 0.05
    moved.push({
      id: `storm-${year.toFixed(5)}-${counter++}`,
      lat: basin.lat[0] + random() * (basin.lat[1] - basin.lat[0]),
      lon: basin.lon[0] + random() * (basin.lon[1] - basin.lon[0]),
      category: intense
        ? 4 + Math.round(random())
        : 1 + Math.floor(random() * 3),
      bornYear: year,
      lifeDays: 6 + random() * 6,
      hemisphere: basin.hemisphere,
      // 일찍 북상해 꺾이는 폭풍(일본·한반도·미국 동부 쪽)과 서쪽으로 곧장 가는 폭풍이 섞이도록
      poleward: 0.5 + random() * 1.8,
    })
  }
  return moved
}

// ── 열대 저기압 상륙 ──────────────────────────────────

/** 폭풍 해일 높이 (m) */
export function stormSurge(category: number): number {
  return 0.5 + category * 0.9
}

/** 폭풍이 해안 도시를 덮치는 반경 (km) */
export function stormReachKm(category: number): number {
  return 120 + category * 40
}

export function stormLandfalls(
  storms: Storm[],
  state: Pick<WorldState, 'seaLevel' | 'structures' | 'year'>,
): { storms: Storm[]; events: NewEvent[]; damaged: number } {
  const events: NewEvent[] = []
  let damaged = 0
  const next = storms.map((storm) => {
    const hit = new Set(storm.hitCityIds ?? [])
    for (const city of CITIES) {
      if (
        !city.coastal ||
        hit.has(city.id) ||
        city.basins.includes('mediterranean')
      )
        continue
      if (distanceKm(storm, city) > stormReachKm(storm.category)) continue
      hit.add(city.id)
      if (storm.category < 3) continue
      const surge = stormSurge(storm.category)
      // 기록은 4등급 이상만 남기고, 피해 횟수는 3등급부터 셉니다
      const loud = storm.category >= 4
      const protection = Math.max(
        city.defense - state.seaLevel,
        seaProtection(city.id, state.structures, state.year) - state.seaLevel,
        waveProtection(city.id, state.structures, state.year),
      )
      if (surge <= protection) {
        if (loud)
          events.push({
            tone: 'good',
            text: compose((l) =>
              l === 'ko'
                ? `${storm.category}등급 열대 저기압의 해일 ${surge.toFixed(1)}m를 ${siteName(city, l)} 방어 시설이 막았습니다.`
                : `${siteName(city, l)} defenses held back a ${surge.toFixed(1)} m surge from a category ${storm.category} storm.`,
            ),
          })
      } else {
        damaged++
        if (loud)
          events.push({
            tone: 'danger',
            text: compose((l) =>
              l === 'ko'
                ? `${storm.category}등급 열대 저기압이 ${siteName(city, l)}에 상륙, 해일 ${surge.toFixed(1)}m 피해.`
                : `A category ${storm.category} storm made landfall at ${siteName(city, l)}: ${surge.toFixed(1)} m surge damage.`,
            ),
          })
      }
    }
    return hit.size === (storm.hitCityIds?.length ?? 0)
      ? storm
      : { ...storm, hitCityIds: [...hit] }
  })
  return { storms: next, events, damaged }
}

// ── 추이 기록 ─────────────────────────────────────────

export const HISTORY_INTERVAL = 0.1
const MAX_HISTORY = 400

/** 0.1년마다 한 점씩 기록하고, 너무 많아지면 하나씩 건너 솎아 냅니다 */
export function recordHistory(
  history: HistoryPoint[],
  point: HistoryPoint,
): HistoryPoint[] {
  const last = history.at(-1)
  if (last && point.year - last.year < HISTORY_INTERVAL) return history
  const next = [...history, point]
  if (next.length <= MAX_HISTORY) return next
  return next.filter((_, i) => i % 2 === 0 || i === next.length - 1)
}

/** 시간이 멈춘 채 값이 바뀌면 마지막 기록점을 고칩니다 */
export function touchHistory(
  history: HistoryPoint[],
  state: Pick<
    WorldState,
    | 'year'
    | 'seaLevel'
    | 'scenario'
    | 'structures'
    | 'eruptions'
    | 'impacts'
    | 'floodedCityIds'
  >,
): HistoryPoint[] {
  const point = {
    year: state.year,
    seaLevel: state.seaLevel,
    warming: warming(state),
    floodedCities: state.floodedCityIds.length,
  }
  const last = history.at(-1)
  if (last && state.year - last.year < HISTORY_INTERVAL)
    return [...history.slice(0, -1), point]
  return [...history, point]
}

// ── 시간 진행 ──────────────────────────────────────────

export interface NewEvent {
  tone: EventTone
  text: Text
}

export interface StepResult {
  patch: Partial<WorldState>
  events: NewEvent[]
}

/** dtYears만큼 시간을 진행한 결과 (상태를 직접 바꾸지 않음) */
export function step(
  state: WorldState,
  dtYears: number,
  random: () => number = Math.random,
  now = 0,
): StepResult {
  const events: NewEvent[] = []
  const year = state.year + dtYears
  const seaLevel = state.seaLevel + riseRate(state) * dtYears
  const budget = state.budget + INCOME_PER_YEAR * dtYears

  for (const s of state.structures) {
    if (s.completeYear > state.year && s.completeYear <= year) {
      const site = getSite(s.siteId)
      events.push({
        tone: 'good',
        text: compose((l) =>
          l === 'ko'
            ? `${STRUCTURES[s.kind].name}${site ? ` (${siteName(site, l)})` : ''} 완공`
            : `${STRUCTURE_EN[s.kind].name}${site ? ` (${siteName(site, l)})` : ''} completed`,
        ),
      })
    }
  }

  const next = { ...state, year, seaLevel }
  const flooding = detectFlooding(state.floodedCityIds, next)
  events.push(...flooding.events)

  // 빠른 속도에서도 폭풍이 도시를 건너뛰지 않도록 반나절 단위로 나눠 진행
  const substeps = Math.min(
    400,
    Math.max(1, Math.ceil((dtYears * DAYS_PER_YEAR) / 0.5)),
  )
  const subDt = dtYears / substeps
  const warmingNow = warming(next)
  let storms = state.storms
  let stormDamage = state.stormDamage
  for (let k = 1; k <= substeps; k++) {
    const subYear = state.year + subDt * k
    storms = stepStorms(storms, subYear, subDt, warmingNow, random)
    const landfall = stormLandfalls(storms, { ...next, year: subYear })
    storms = landfall.storms
    stormDamage += landfall.damaged
    events.push(...landfall.events)
  }

  const droughts = state.droughts.filter((d) => year < d.year + d.durationYears)
  for (const d of state.droughts) {
    if (!droughts.includes(d)) {
      events.push({
        tone: 'info',
        text: compose((l) =>
          l === 'ko'
            ? `${siteName(d.regionId, l)} 가뭄이 끝났습니다.`
            : `The drought in ${siteName(d.regionId, l)} has ended.`,
        ),
      })
    }
  }
  const wildfires = stepWildfires(
    state.wildfires,
    droughts,
    state.structures,
    year,
    dtYears,
    warming(next),
    now,
    random,
  )

  return {
    patch: {
      year,
      seaLevel,
      budget,
      storms,
      stormDamage,
      history: recordHistory(state.history, {
        year,
        seaLevel,
        warming: warming(next),
        floodedCities: flooding.floodedCityIds.length,
      }),
      wildfires,
      droughts,
      floodedCityIds: flooding.floodedCityIds,
    },
    events,
  }
}

/** 지금 침수된 도시 목록과, 새로 잠긴 도시 알림 */
export function detectFlooding(
  previous: string[],
  state: Pick<WorldState, 'seaLevel' | 'structures' | 'year'>,
): { floodedCityIds: string[]; events: NewEvent[] } {
  const before = new Set(previous)
  const floodedCityIds = CITIES.filter(
    (city) => cityState(city, state) === 'flooded',
  ).map((c) => c.id)
  const events = floodedCityIds
    .filter((id) => !before.has(id))
    .map((id) => ({
      tone: 'danger' as const,
      text: compose((l) =>
        l === 'ko'
          ? `${names(id).ko} 저지대 침수 (해수면 +${state.seaLevel.toFixed(2)}m)`
          : `Low-lying ${names(id).en} flooded (sea level +${state.seaLevel.toFixed(2)} m)`,
      ),
    }))
  return { floodedCityIds, events }
}

export function appendEvents(
  state: WorldState,
  events: NewEvent[],
): Pick<WorldState, 'events' | 'nextEventId'> {
  if (events.length === 0)
    return { events: state.events, nextEventId: state.nextEventId }
  let id = state.nextEventId
  const added = events.map((e) => ({ ...e, id: id++, year: state.year }))
  return {
    events: [...added.reverse(), ...state.events].slice(0, MAX_EVENTS),
    nextEventId: id,
  }
}

export function totalPopulation(cityIds: string[]): number {
  return cityIds.reduce((sum, id) => {
    const site = getSite(id)
    return site?.kind === 'city' ? sum + site.population : sum
  }, 0)
}

export type { Tsunami }
