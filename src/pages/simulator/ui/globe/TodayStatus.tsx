import { useToday } from '../../model/today/store'
import { kpLevel, summarizeToday } from '../../model/today/today'
import { useT } from '../i18n'
import { formatKp, formatUtc } from '../todayFormat'

/** 오늘의 지구 요약: 기준 시각, 지난 7일 지진 수와 가장 큰 규모, 지금 Kp */
export function TodayStatus() {
  const { t, locale } = useT()
  const data = useToday((s) => s.data)
  const fromSnapshot = useToday((s) => s.fromSnapshot)
  if (!data) return null
  const summary = summarizeToday(data)
  const kp = summary.kpNow?.kp ?? 0
  return (
    <p className="rounded-xs border border-line bg-panel px-3 py-2 text-xs text-ice">
      {t('today.summary', {
        asOf: t('today.asOf', {
          time: formatUtc(Date.parse(data.fetchedAt), locale),
        }),
        n: summary.quakeCount,
        mag: summary.largest ? summary.largest.mag.toFixed(1) : '-',
        kp: formatKp(kp),
        level: t(`today.level.${kpLevel(kp)}`),
      })}
      {fromSnapshot ? ` · ${t('today.snapshotShort')}` : ''}
    </p>
  )
}
