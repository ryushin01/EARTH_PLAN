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
})
