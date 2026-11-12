import { useCallback } from 'react'
import { interpolate, useLocale } from '@/shared/i18n'
import type { Locale, Params } from '@/shared/i18n'
import type { Text } from '../model/text'
import { MESSAGES } from './messages'

export type MessageKey = keyof typeof MESSAGES

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Params,
): string {
  const [ko, en] = MESSAGES[key]
  return interpolate(locale === 'en' ? en : ko, params)
}

/** 화면 문구 번역 훅: t(키, 값), pick({ko, en}) */
export function useT() {
  const locale = useLocale((s) => s.locale)
  const t = useCallback(
    (key: MessageKey, params?: Params) => translate(locale, key, params),
    [locale],
  )
  const pick = useCallback((text: Text) => text[locale], [locale])
  return { t, pick, locale }
}
