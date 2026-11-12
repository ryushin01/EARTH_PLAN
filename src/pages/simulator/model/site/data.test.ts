import { ALL_SITES, CITIES, STRAITS, getSite } from './data'

describe('site data', () => {
  it('id가 겹치지 않는다', () => {
    const ids = ALL_SITES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('좌표가 범위 안에 있다', () => {
    for (const s of ALL_SITES) {
      expect(Math.abs(s.lat)).toBeLessThanOrEqual(90)
      expect(Math.abs(s.lon)).toBeLessThanOrEqual(180)
    }
  })

  it('해협 댐이 보호하는 도시는 모두 존재한다', () => {
    for (const strait of STRAITS) {
      for (const id of strait.protects) expect(getSite(id)?.kind).toBe('city')
    }
    expect(CITIES.length).toBeGreaterThan(30)
  })
})
