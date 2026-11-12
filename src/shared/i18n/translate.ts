import type { Locale } from './locale'

export type Params = Record<string, string | number>

/** "{name}" 자리에 값을 넣습니다 */
export function interpolate(template: string, params: Params = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  )
}

/** 언어별 사전에서 문구를 찾아 보간합니다 */
export function createTranslator<TKey extends string>(
  dictionaries: Record<Locale, Record<TKey, string>>,
) {
  return (locale: Locale, key: TKey, params?: Params) =>
    interpolate(dictionaries[locale][key], params)
}

/** 언어에 맞는 숫자 서식 */
export function numberLocale(locale: Locale): string {
  return locale === 'ko' ? 'ko-KR' : 'en-US'
}
