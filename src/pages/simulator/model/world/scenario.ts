export type ScenarioId = 'low' | 'mid' | 'high' | 'extreme'

export interface Scenario {
  id: ScenarioId
  label: string
  labelEn: string
  code: string
  /** 2100년 해수면 상승 (m, 2020년 대비) */
  rise2100: number
  /** 2100년 기온 상승 (°C, 산업화 이전 대비) */
  temp2100: number
}

/** IPCC AR6 중앙값을 바탕으로 한 단순화 시나리오 */
export const SCENARIOS: Record<ScenarioId, Scenario> = {
  low: {
    id: 'low',
    label: '저배출',
    labelEn: 'Low',
    code: 'SSP1-2.6',
    rise2100: 0.44,
    temp2100: 1.8,
  },
  mid: {
    id: 'mid',
    label: '중간',
    labelEn: 'Middle',
    code: 'SSP2-4.5',
    rise2100: 0.56,
    temp2100: 2.7,
  },
  high: {
    id: 'high',
    label: '고배출',
    labelEn: 'High',
    code: 'SSP5-8.5',
    rise2100: 0.77,
    temp2100: 4.4,
  },
  extreme: {
    id: 'extreme',
    label: '빙상 붕괴',
    labelEn: 'Ice-sheet collapse',
    code: 'SSP5-8.5+',
    rise2100: 1.6,
    temp2100: 4.4,
  },
}

export const REFERENCE_YEAR = 2020
/** 현재 해수면 상승 속도 (m/년) */
export const CURRENT_RISE_RATE = 0.0037
/** 2020년 기온 상승 (°C) */
export const CURRENT_WARMING = 1.2

function curvature(scenario: Scenario): number {
  const span = 2100 - REFERENCE_YEAR
  return (scenario.rise2100 - CURRENT_RISE_RATE * span) / span ** 2
}

/** 구조물 없이 시나리오만 따를 때의 해수면 (m) */
export function baselineSeaLevel(year: number, scenario: Scenario): number {
  const t = Math.max(0, year - REFERENCE_YEAR)
  return CURRENT_RISE_RATE * t + curvature(scenario) * t * t
}

/** 시나리오 해수면 상승 속도 (m/년) */
export function baselineRiseRate(year: number, scenario: Scenario): number {
  const t = Math.max(0, year - REFERENCE_YEAR)
  return CURRENT_RISE_RATE + 2 * curvature(scenario) * t
}

/** 시나리오 기온 상승 (°C) */
export function baselineWarming(year: number, scenario: Scenario): number {
  const t = Math.max(0, year - REFERENCE_YEAR) / (2100 - REFERENCE_YEAR)
  return (
    CURRENT_WARMING + (scenario.temp2100 - CURRENT_WARMING) * Math.min(t, 2.5)
  )
}
