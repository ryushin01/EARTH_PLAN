import { ALL_SITES } from './data'
import { REGION_EN, SITE_EN } from './en'

describe('지점 영어 데이터', () => {
  it('모든 지점과 지역에 영어 이름이 있다', () => {
    for (const site of ALL_SITES) {
      expect(SITE_EN[site.id]?.[0], site.id).toBeTruthy()
      if ('note' in site && site.note)
        expect(SITE_EN[site.id]?.[1], site.id).toBeTruthy()
      expect(REGION_EN[site.region], site.region).toBeTruthy()
    }
  })
})
