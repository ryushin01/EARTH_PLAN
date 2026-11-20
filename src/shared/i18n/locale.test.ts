import { renderHook } from '@testing-library/react'
import { useLocale, useLocaleSync } from './locale'

describe('화면 언어 저장', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useLocale.setState({ locale: 'ko' })
  })

  it('옛 이름(earth-plan)으로 저장한 언어를 불러와 새 키로 옮긴다', () => {
    window.localStorage.setItem('earth-plan:locale', 'en')
    renderHook(() => useLocaleSync())
    expect(useLocale.getState().locale).toBe('en')
    expect(window.localStorage.getItem('terranova:locale')).toBe('en')
    expect(window.localStorage.getItem('earth-plan:locale')).toBeNull()
  })

  it('언어를 바꾸면 새 키에 저장한다', () => {
    useLocale.getState().setLocale('en')
    expect(window.localStorage.getItem('terranova:locale')).toBe('en')
  })

  it('새 키로 옮기지 못하면 언어를 옛 키에 계속 저장한다', () => {
    window.localStorage.setItem('earth-plan:locale', 'en')
    const original = Storage.prototype.setItem
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, key, value) {
        if (key === 'terranova:locale')
          throw new DOMException('저장 공간 부족', 'QuotaExceededError')
        original.call(this, key, value)
      })
    renderHook(() => useLocaleSync())
    expect(useLocale.getState().locale).toBe('en')
    useLocale.getState().setLocale('ko')
    expect(window.localStorage.getItem('earth-plan:locale')).toBe('ko')
    setItem.mockRestore()
  })
})
