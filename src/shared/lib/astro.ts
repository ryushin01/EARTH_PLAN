import type { LatLon } from './geo'

/** 그레고리력 평균 1년 일수 */
export const DAYS_PER_YEAR = 365.2425

/** 소수 연도 (2026.5 = 2026년 중간) → 그 해의 날짜·시각 */
export function decimalYearToDate(year: number): Date {
  const y = Math.floor(year)
  const start = Date.UTC(y, 0, 1)
  const end = Date.UTC(y + 1, 0, 1)
  return new Date(start + (year - y) * (end - start))
}

export function dateToDecimalYear(date: Date): number {
  const y = date.getUTCFullYear()
  const start = Date.UTC(y, 0, 1)
  const end = Date.UTC(y + 1, 0, 1)
  return y + (date.getTime() - start) / (end - start)
}

/** 1월 1일을 0으로 하는 그 해의 날 수(소수) */
export function dayOfYear(year: number): number {
  const date = decimalYearToDate(year)
  return (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86_400_000
}

/**
 * 태양이 머리 위에 있는 지점(태양 직하점).
 * 위도는 태양 적위(근사), 경도는 UTC 시각으로 정합니다.
 */
export function subsolarPoint(year: number): LatLon {
  const date = decimalYearToDate(year)
  const doy = dayOfYear(year)
  const declination =
    -23.44 * Math.cos(((2 * Math.PI) / DAYS_PER_YEAR) * (doy + 10))
  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  let lon = (12 - utcHours) * 15
  if (lon > 180) lon -= 360
  if (lon < -180) lon += 360
  return { lat: declination, lon }
}

/**
 * 북반구 계절 값: 하지 +1, 동지 −1, 춘·추분 0 근처.
 */
export function northernSeason(year: number): number {
  const doy = dayOfYear(year)
  return -Math.cos(((2 * Math.PI) / DAYS_PER_YEAR) * (doy + 10))
}

export function seasonLabel(year: number): string {
  const month = decimalYearToDate(year).getUTCMonth()
  if (month >= 2 && month <= 4) return '봄'
  if (month >= 5 && month <= 7) return '여름'
  if (month >= 8 && month <= 10) return '가을'
  return '겨울'
}
