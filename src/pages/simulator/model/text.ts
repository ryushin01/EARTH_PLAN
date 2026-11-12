import { getSite } from './site/data'
import { REGION_EN, SITE_EN } from './site/en'
import type { Site } from './site/types'
import { numberLocale } from '@/shared/i18n'
import type { Locale } from '@/shared/i18n'

/** 한국어·영어 문장 한 쌍 (사건 기록·결과 메시지) */
export type Text = Record<Locale, string>

export const both = (ko: string, en: string): Text => ({ ko, en })

export function siteName(
  site: Site | string | undefined,
  locale: Locale,
): string {
  const s = typeof site === 'string' ? getSite(site) : site
  if (!s) return typeof site === 'string' ? site : ''
  return locale === 'en' ? (SITE_EN[s.id]?.[0] ?? s.name) : s.name
}

export function siteNote(site: Site, locale: Locale): string {
  const note = 'note' in site ? site.note : ''
  return locale === 'en' ? (SITE_EN[site.id]?.[1] ?? note) : note
}

export function regionName(region: string, locale: Locale): string {
  return locale === 'en' ? (REGION_EN[region] ?? region) : region
}

/** 두 언어의 지점 이름 */
export const names = (id: string): Text => ({
  ko: siteName(id, 'ko'),
  en: siteName(id, 'en'),
})

export const nameList = (ids: string[], locale: Locale) =>
  ids.map((id) => siteName(id, locale)).join(', ')

export function num(value: number, locale: Locale, digits = 0): string {
  return value.toLocaleString(numberLocale(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** 두 언어로 같은 틀의 문장을 만듭니다 */
export function compose(build: (locale: Locale) => string): Text {
  return { ko: build('ko'), en: build('en') }
}

/** 아직 메시지가 없을 때 */
export const EMPTY_TEXT: Text = { ko: '', en: '' }
