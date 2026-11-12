import { describe, expect, it } from 'vitest'
import {
  dateToDecimalYear,
  decimalYearToDate,
  northernSeason,
  seasonLabel,
  subsolarPoint,
} from './astro'

describe('astro', () => {
  it('소수 연도와 날짜를 서로 바꾼다', () => {
    const date = new Date(Date.UTC(2026, 10, 12, 3, 0))
    const year = dateToDecimalYear(date)
    expect(decimalYearToDate(year).getTime()).toBeCloseTo(date.getTime(), -3)
  })

  it('하지에는 태양 직하점이 북회귀선 근처다', () => {
    const p = subsolarPoint(
      dateToDecimalYear(new Date(Date.UTC(2026, 5, 21, 12))),
    )
    expect(p.lat).toBeGreaterThan(23)
    expect(Math.abs(p.lon)).toBeLessThan(1)
  })

  it('동지에는 남회귀선, UTC 3시에는 동경 135도 근처다', () => {
    const p = subsolarPoint(
      dateToDecimalYear(new Date(Date.UTC(2026, 11, 21, 3))),
    )
    expect(p.lat).toBeLessThan(-23)
    expect(p.lon).toBeCloseTo(135, 0)
  })

  it('계절 값과 이름', () => {
    const july = dateToDecimalYear(new Date(Date.UTC(2026, 6, 1)))
    const jan = dateToDecimalYear(new Date(Date.UTC(2026, 0, 15)))
    expect(northernSeason(july)).toBeGreaterThan(0.8)
    expect(northernSeason(jan)).toBeLessThan(-0.8)
    expect(seasonLabel(july)).toBe('여름')
    expect(seasonLabel(jan)).toBe('겨울')
  })
})
