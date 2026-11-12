import { createTranslator, interpolate } from './translate'

describe('i18n', () => {
  it('자리 표시를 값으로 바꾸고, 없는 값은 그대로 둔다', () => {
    expect(interpolate('{city} 침수 (+{m}m)', { city: '도쿄', m: 2 })).toBe(
      '도쿄 침수 (+2m)',
    )
    expect(interpolate('{x} 남음')).toBe('{x} 남음')
  })

  it('언어별 사전을 고른다', () => {
    const t = createTranslator({
      ko: { hi: '안녕 {name}' },
      en: { hi: 'Hello {name}' },
    })
    expect(t('en', 'hi', { name: 'Earth' })).toBe('Hello Earth')
    expect(t('ko', 'hi', { name: '지구' })).toBe('안녕 지구')
  })
})
