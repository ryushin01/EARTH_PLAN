import { useEffect } from 'react'
import { create } from 'zustand'

export type Locale = 'ko' | 'en'

export const LOCALES: Locale[] = ['ko', 'en']
const STORAGE_KEY = 'earth-plan:locale'

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

/** 화면 언어. 사전 렌더링은 한국어, 브라우저에서 저장된 값으로 바꿈 */
export const useLocale = create<LocaleState>()((set) => ({
  locale: 'ko',
  setLocale: (locale) => {
    set({ locale })
    try {
      window.localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // 저장이 막혀도 이번 화면에서는 바뀐 언어를 씀
    }
  },
}))

/** 저장된 언어를 불러오고 <html lang>을 맞춥니다 (앱에서 한 번 호출) */
export function useLocaleSync() {
  const locale = useLocale((s) => s.locale)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved === 'en' || saved === 'ko')
        useLocale.setState({ locale: saved })
    } catch {
      // 무시
    }
  }, [])
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
}
