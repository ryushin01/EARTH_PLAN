import type { BuiltStructure } from '../structure/types'
import type { ScenarioId } from './scenario'
import type { SpeedId } from './time'
import type { MissionState } from './missions'
import type { Text } from '../text'

export type EventTone = 'info' | 'good' | 'warn' | 'danger'

export interface WorldEvent {
  id: number
  year: number
  tone: EventTone
  text: Text
  /** 미션이 정해 둔 사건의 안내 (같은 순간의 재해 기록보다 먼저 쌓임) */
  mission?: boolean
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

export type QuakeOutcome = 'severe' | 'moderate' | 'reduced'

export interface QuakeImpact {
  cityId: string
  distanceKm: number
  outcome: QuakeOutcome
}

export interface Quake {
  id: string
  faultId: string
  magnitude: number
  year: number
  startedAt: number
  /** 건물이 크게 무너지는 반경 (km) */
  severeRadiusKm: number
  /** 강한 흔들림 반경 (km) */
  strongRadiusKm: number
  impacts: QuakeImpact[]
}

/** 태양 폭풍 세기: NOAA 지자기 폭풍 등급 G3~G5와 캐링턴급(1859년) */
export type SolarLevel = 'g3' | 'g4' | 'g5' | 'carrington'

/** 변압기 손상(수개월 정전) · 정전(몇 시간~며칠) · 경보로 막음 */
export type SolarOutcome = 'damaged' | 'outage' | 'protected'

export interface SolarImpact {
  cityId: string
  /** 도시의 지자기 위도 (°) */
  magLat: number
  outcome: SolarOutcome
}

export interface SolarStorm {
  id: string
  level: SolarLevel
  year: number
  startedAt: number
  /** 오로라가 내려오는 지자기 위도 (°) */
  auroraLat: number
  /** 고장 나는 위성 수 (대략값) */
  satellitesLost: number
  impacts: SolarImpact[]
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
  /** 전향 전 북상(남반구는 남하) 속도 (°/일) */
  poleward?: number
  /** 이미 해일 피해를 계산한 도시 */
  hitCityIds?: string[]
}

/** 추이 그래프용 기록 한 점 */
export interface HistoryPoint {
  year: number
  seaLevel: number
  warming: number
  floodedCities: number
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
  quakes: Quake[]
  solarStorms: SolarStorm[]
  wildfires: Wildfire[]
  droughts: Drought[]
  storms: Storm[]
  history: HistoryPoint[]
  /** 열대 저기압 해일로 큰 피해를 입은 횟수 */
  stormDamage: number
  /** 태양 폭풍으로 변압기가 타 수개월 정전된 적 있는 도시 (최근 폭풍 기록이 지워져도 남음) */
  gridDamagedCityIds: string[]
  /** 태양 폭풍으로 고장 난 위성 수 (누적) */
  satellitesLost: number
  /** 지금까지 구조물에 쓴 예산 (십억 달러) */
  spent: number
  /** 진행 중이거나 끝난 미션 */
  mission: MissionState | null
  events: WorldEvent[]
  /** 해수면으로 잠긴 적이 있는 도시 (알림 중복 방지) */
  floodedCityIds: string[]
  selectedSiteId: string | null
  /** 육지 고도별 누적 면적 비율 (−50~205m, 1m 간격) */
  floodCurve: Float64Array | null
  nextEventId: number
}
