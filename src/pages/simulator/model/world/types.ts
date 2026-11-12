import type { BuiltStructure } from '../structure/types'
import type { ScenarioId } from './scenario'
import type { SpeedId } from './time'

export type EventTone = 'info' | 'good' | 'warn' | 'danger'

export interface WorldEvent {
  id: number
  year: number
  tone: EventTone
  text: string
}

export interface Eruption {
  id: string
  volcanoId: string
  requestedVei: number
  vei: number
  year: number
  /** 애니메이션 기준 시각 (performance.now, ms) */
  startedAt: number
  ashRadiusKm: number
  affectedCityIds: string[]
}

export type TsunamiOutcome = 'hit' | 'minor' | 'blocked'

export interface TsunamiImpact {
  cityId: string
  distanceKm: number
  waveHeight: number
  arrivalHours: number
  outcome: TsunamiOutcome
}

export interface Tsunami {
  id: string
  sourceId: string
  magnitude: number
  year: number
  startedAt: number
  impacts: TsunamiImpact[]
}

export interface Impact {
  id: string
  targetId: string
  diameterM: number
  /** 요격 후 실제로 떨어진 지름 (빗나가면 0) */
  effectiveDiameterM: number
  year: number
  startedAt: number
  energyMt: number
  blastRadiusKm: number
  thermalRadiusKm: number
  ocean: boolean
  affectedCityIds: string[]
}

export interface Wildfire {
  id: string
  regionId: string
  year: number
  startedAt: number
  /** 탄 면적 (km²) */
  burnedKm2: number
  /** 지속 기간 (년) */
  durationYears: number
  /** 저절로 난 산불인지 */
  natural: boolean
}

export interface Drought {
  id: string
  regionId: string
  /** 1 보통 · 2 심함 · 3 극심 */
  severity: 1 | 2 | 3
  year: number
  durationYears: number
  affectedMillions: number
  /** 농작물 감소율 (%) */
  cropLoss: number
}

export interface Storm {
  id: string
  lat: number
  lon: number
  /** 1~5 등급 */
  category: number
  bornYear: number
  lifeDays: number
  hemisphere: 1 | -1
}

export type CityState = 'safe' | 'at-risk' | 'protected' | 'flooded'

export interface WorldState {
  year: number
  running: boolean
  speed: SpeedId
  /** 시각 고정 속도에서 쓰는 UTC 시각 */
  heldHour: number
  scenario: ScenarioId
  seaLevel: number
  budget: number
  structures: BuiltStructure[]
  eruptions: Eruption[]
  tsunamis: Tsunami[]
  impacts: Impact[]
  wildfires: Wildfire[]
  droughts: Drought[]
  storms: Storm[]
  events: WorldEvent[]
  /** 해수면으로 잠긴 적이 있는 도시 (알림 중복 방지) */
  floodedCityIds: string[]
  selectedSiteId: string | null
  /** 육지 고도별 누적 면적 비율 (−50~205m, 1m 간격) */
  floodCurve: Float64Array | null
  nextEventId: number
}
