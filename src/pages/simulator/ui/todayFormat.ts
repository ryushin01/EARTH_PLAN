import type { Locale } from '@/shared/i18n'

/** 오늘의 지구 시각: UTC로 "11월 20일 21:00" / "Nov 20, 21:00" */
export function formatUtc(ms: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(ms)
}

/** Kp는 소수 한 자리 (NOAA는 1/3 단위로 냄) */
export const formatKp = (kp: number) => kp.toFixed(1)
