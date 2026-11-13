import { CITIES, REGIONS, getSite } from '../site/data'
import type { Region } from '../site/types'
import { STRUCTURES } from '../structure/catalog'
import { isActive } from '../structure/types'
import type { BuiltStructure } from '../structure/types'
import { distanceKm } from '@/shared/lib'
import type { Drought, Impact, QuakeImpact, Wildfire } from './types'

function activeAt(structures: BuiltStructure[], year: number) {
  return structures.filter((s) => isActive(s, year))
}

// ── 소행성 충돌 ────────────────────────────────────────

const DENSITY = 3000 // kg/m³ (암석질)
const VELOCITY = 20_000 // m/s
const JOULES_PER_MEGATON = 4.184e15

/** 소행성 충돌 에너지 (메가톤 TNT) */
export function impactEnergyMt(diameterM: number): number {
  const r = diameterM / 2
  const mass = DENSITY * (4 / 3) * Math.PI * r ** 3
  return (0.5 * mass * VELOCITY ** 2) / JOULES_PER_MEGATON
}

/** 건물이 무너지는 폭풍 반경 (km, 약 5psi 과압) */
export function blastRadiusKm(energyMt: number): number {
  return 4.4 * Math.cbrt(energyMt)
}

/** 3도 화상을 입히는 열복사 반경 (km) */
export function thermalRadiusKm(energyMt: number): number {
  return blastRadiusKm(energyMt) * 2.2
}

/** 충돌 겨울로 낮아지는 최대 기온 (°C) */
export function impactPeakCooling(diameterM: number): number {
  if (diameterM < 300) return 0
  return Math.min(8, 1.5 * (diameterM / 1000) ** 0.73)
}

export function impactCooling(impacts: Impact[], year: number): number {
  return impacts.reduce((sum, i) => {
    const age = year - i.year
    if (age < 0 || i.effectiveDiameterM <= 0) return sum
    return sum + impactPeakCooling(i.effectiveDiameterM) * Math.exp(-age / 3)
  }, 0)
}

/** 행성 방위 요격망을 거친 뒤 실제로 떨어지는 지름 (빗나가면 0) */
export function deflectedDiameter(
  diameterM: number,
  structures: BuiltStructure[],
  year: number,
): number {
  const defense = activeAt(structures, year)
    .map((s) => STRUCTURES[s.kind].deflectDiameter ?? 0)
    .reduce((a, b) => Math.max(a, b), 0)
  if (defense === 0) return diameterM
  if (diameterM <= defense) return 0
  return diameterM / 2
}

/** 바다 충돌이 만드는 쓰나미를 지진 규모로 환산 */
export function impactTsunamiMagnitude(energyMt: number): number {
  return Math.min(11.5, 7.5 + 0.5 * Math.log10(Math.max(1, energyMt)))
}

// ── 산불 ──────────────────────────────────────────────

function regionReduction(
  regionId: string,
  key: 'fireReduction' | 'droughtReduction',
  structures: BuiltStructure[],
  year: number,
): number {
  return activeAt(structures, year)
    .filter((s) => s.siteId === regionId)
    .reduce((best, s) => Math.max(best, STRUCTURES[s.kind][key] ?? 0), 0)
}

export function isInDrought(
  regionId: string,
  droughts: Drought[],
  year: number,
): boolean {
  return droughts.some(
    (d) =>
      d.regionId === regionId &&
      year >= d.year &&
      year < d.year + d.durationYears,
  )
}

/** 산불이 태우는 면적 (km²) */
export function wildfireArea(
  region: Region,
  warmingC: number,
  structures: BuiltStructure[],
  year: number,
  drought: boolean,
): number {
  const base = region.radiusKm ** 2 * 0.05 * region.fireProne
  const heat = 1 + Math.max(0, warmingC - 1.2) * 0.5
  const dry = drought ? 1.8 : 1
  const reduction = regionReduction(
    region.id,
    'fireReduction',
    structures,
    year,
  )
  return base * heat * dry * (1 - reduction)
}

/** 화면에 그리는 산불 범위 반경 (km) */
export function wildfireRadiusKm(region: Region, burnedKm2: number): number {
  return Math.min(region.radiusKm, Math.sqrt(burnedKm2) * 3)
}

export const WILDFIRE_YEARS = 0.25
const MAX_FIRES = 6

/** 기온이 높고 가뭄이 들수록 저절로 산불이 납니다 */
export function stepWildfires(
  wildfires: Wildfire[],
  droughts: Drought[],
  structures: BuiltStructure[],
  year: number,
  dtYears: number,
  warmingC: number,
  now: number,
  random: () => number = Math.random,
): Wildfire[] {
  // 직접 일으킨 산불은 탄 자리를 보여 주도록 끝난 뒤 2년 더 남김
  const kept = wildfires.filter(
    (f) => year < f.year + f.durationYears + (f.natural ? 0 : 2),
  )
  if (dtYears <= 0) return kept
  let count = kept.filter((f) => year < f.year + f.durationYears).length
  for (const region of REGIONS) {
    if (count >= MAX_FIRES) break
    const drought = isInDrought(region.id, droughts, year)
    const rate =
      region.fireProne *
      0.35 *
      (1 + Math.max(0, warmingC - 1.2) * 0.4) *
      (drought ? 2 : 1)
    if (random() < rate * dtYears) {
      kept.push({
        id: `fire-${region.id}-${year.toFixed(4)}`,
        regionId: region.id,
        year,
        startedAt: now,
        burnedKm2:
          wildfireArea(region, warmingC, structures, year, drought) *
          (0.3 + random() * 0.5),
        durationYears: WILDFIRE_YEARS,
        natural: true,
      })
      count++
    }
  }
  return kept
}

// ── 가뭄 ──────────────────────────────────────────────

const DROUGHT_SHARE = { 1: 0.2, 2: 0.45, 3: 0.7 } as const
const DROUGHT_CROP_LOSS = { 1: 15, 2: 35, 3: 60 } as const

export const SEVERITY_LABEL = { 1: '보통', 2: '심함', 3: '극심' } as const
export const SEVERITY_LABEL_EN = {
  1: 'Moderate',
  2: 'Severe',
  3: 'Extreme',
} as const

export function droughtEffects(
  region: Region,
  severity: 1 | 2 | 3,
  structures: BuiltStructure[],
  year: number,
  warmingC: number,
): Pick<Drought, 'durationYears' | 'affectedMillions' | 'cropLoss'> {
  const reduction = regionReduction(
    region.id,
    'droughtReduction',
    structures,
    year,
  )
  const heat = 1 + Math.max(0, warmingC - 1.2) * 0.15
  return {
    durationYears: 1 + severity,
    affectedMillions:
      region.population * DROUGHT_SHARE[severity] * (1 - reduction),
    cropLoss: Math.min(
      95,
      DROUGHT_CROP_LOSS[severity] * heat * (1 - reduction * 0.6),
    ),
  }
}

export function regionOf(id: string): Region | undefined {
  const site = getSite(id)
  return site?.kind === 'region' ? site : undefined
}

// ── 지진 ──────────────────────────────────────────────

/** 건물이 크게 무너지는 반경 (km): 규모 6 약 10km, 7 약 32km, 8 약 100km */
export function quakeSevereRadiusKm(magnitude: number): number {
  return 10 ** (0.5 * magnitude - 2)
}

/** 강한 흔들림 반경 (km) */
export function quakeStrongRadiusKm(magnitude: number): number {
  return quakeSevereRadiusKm(magnitude) * 2.5
}

function quakeReduction(
  cityId: string,
  structures: BuiltStructure[],
  year: number,
): number {
  return activeAt(structures, year)
    .filter((s) => s.siteId === cityId)
    .reduce(
      (best, s) => Math.max(best, STRUCTURES[s.kind].quakeReduction ?? 0),
      0,
    )
}

/** 단층 지진이 도시에 주는 피해 (가까운 순) */
export function quakeImpacts(
  center: { lat: number; lon: number },
  magnitude: number,
  structures: BuiltStructure[],
  year: number,
): QuakeImpact[] {
  const severe = quakeSevereRadiusKm(magnitude)
  const strong = quakeStrongRadiusKm(magnitude)
  return CITIES.flatMap((city) => {
    const d = distanceKm(center, city)
    if (d > strong) return []
    const reduced = quakeReduction(city.id, structures, year) > 0
    const raw: QuakeImpact['outcome'] = d <= severe ? 'severe' : 'moderate'
    // 내진 보강이 피해를 한 단계 낮춤 (심각 → 경미, 경미 → 보강으로 버팀)
    const outcome: QuakeImpact['outcome'] = reduced
      ? raw === 'severe'
        ? 'moderate'
        : 'reduced'
      : raw
    return [{ cityId: city.id, distanceKm: d, outcome }]
  }).sort((a, b) => a.distanceKm - b.distanceKm)
}
