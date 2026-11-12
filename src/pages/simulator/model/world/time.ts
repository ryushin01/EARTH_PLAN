import {
  DAYS_PER_YEAR,
  dateToDecimalYear,
  decimalYearToDate,
} from '@/shared/lib'

export type SpeedId = 'hour' | 'day' | 'month' | 'year' | 'decade'

export interface Speed {
  id: SpeedId
  label: string
  yearsPerSecond: number
}

export const SPEEDS: Speed[] = [
  { id: 'hour', label: '1시간', yearsPerSecond: 1 / (DAYS_PER_YEAR * 24) },
  { id: 'day', label: '1일', yearsPerSecond: 1 / DAYS_PER_YEAR },
  { id: 'month', label: '1개월', yearsPerSecond: 1 / 12 },
  { id: 'year', label: '1년', yearsPerSecond: 1 },
  { id: 'decade', label: '10년', yearsPerSecond: 10 },
]

export const SPEED_BY_ID = Object.fromEntries(
  SPEEDS.map((s) => [s.id, s]),
) as Record<SpeedId, Speed>

/** 시작 시각: 2026-11-12 03:00 UTC (한국 정오) */
export const START_YEAR = dateToDecimalYear(
  new Date(Date.UTC(2026, 10, 12, 3, 0)),
)

/** 하루가 1초보다 빨리 지나가면 낮·밤이 깜빡이므로 시각을 고정합니다 */
export function isHourFrozen(speed: SpeedId): boolean {
  return SPEED_BY_ID[speed].yearsPerSecond > 1 / DAYS_PER_YEAR
}

/** 같은 날짜의 UTC 시각(시)만 바꾼 소수 연도 */
export function withUtcHour(year: number, hour: number): number {
  const date = decimalYearToDate(year)
  const midnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  return dateToDecimalYear(new Date(midnight + hour * 3_600_000))
}

export function utcHourOf(year: number): number {
  const date = decimalYearToDate(year)
  const midnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  return (date.getTime() - midnight) / 3_600_000
}
