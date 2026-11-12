import { describe, expect, it } from 'vitest'
import { formatBillions, formatPopulation, formatSigned } from './format'

describe('format', () => {
  it('부호를 붙인다', () => {
    expect(formatSigned(1.234)).toBe('+1.2')
    expect(formatSigned(-0.5)).toBe('−0.5')
    expect(formatSigned(0)).toBe('0.0')
  })

  it('금액을 B·T 단위로 줄인다', () => {
    expect(formatBillions(450)).toBe('$450B')
    expect(formatBillions(5200)).toBe('$5.20T')
  })

  it('인구를 백만·천 명 단위로 쓴다', () => {
    expect(formatPopulation(12.34)).toBe('12.3백만 명')
    expect(formatPopulation(0.25)).toBe('250천 명')
  })
})
