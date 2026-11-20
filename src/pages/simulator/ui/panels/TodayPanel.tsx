import { useEffect, useId, useRef } from 'react'
import { loadToday } from '../../api/loadToday'
import { useToday } from '../../model/today/store'
import { kpLevel, summarizeToday } from '../../model/today/today'
import { useT } from '../i18n'
import { formatKp, formatUtc } from '../todayFormat'
import { Button } from '@/shared/ui'

/** 목록에 보일 지진 수 (규모 큰 순) */
const SHOWN = 10

const SOURCES = [
  { name: 'USGS', href: 'https://earthquake.usgs.gov/earthquakes/map/' },
  {
    name: 'NOAA SWPC',
    href: 'https://www.swpc.noaa.gov/products/planetary-k-index',
  },
] as const

const load = () => useToday.getState().ensureLoaded(() => loadToday())

/**
 * 탭 패널은 처음부터 모두 그려지고 감춰져 있으므로, 이 패널이 화면에 보일 때 자료를 불러옴.
 * IntersectionObserver가 없는 환경에서는 바로 불러옴
 */
function useLoadWhenVisible() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      void load()
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect()
        void load()
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return ref
}

/** 오늘의 지구: 배포할 때 받은 실제 지진·지자기 기록 */
export function TodayPanel() {
  const { t, locale } = useT()
  const id = useId()
  const ref = useLoadWhenVisible()
  const enabled = useToday((s) => s.enabled)
  const status = useToday((s) => s.status)
  const data = useToday((s) => s.data)
  const setEnabled = useToday((s) => s.setEnabled)
  const focus = useToday((s) => s.focus)
  const summary = data ? summarizeToday(data) : null
  const kp = summary?.kpNow?.kp ?? 0
  const largest = data
    ? [...data.quakes].sort((a, b) => b.mag - a.mag).slice(0, SHOWN)
    : []

  return (
    <div ref={ref} className="grid gap-5">
      <section aria-labelledby={`${id}-heading`} className="grid gap-2">
        <h2
          id={`${id}-heading`}
          className="font-display text-lg font-semibold text-ice"
        >
          {t('today.heading')}
        </h2>
        <p className="text-sm text-muted">{t('today.intro')}</p>
        <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm text-ice">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="size-5 accent-accent"
          />
          {t('today.show')}
        </label>
      </section>

      {status === 'error' ? (
        <div className="grid gap-2">
          <p role="alert" className="text-sm text-danger">
            {t('today.error')}
          </p>
          <Button onClick={() => void load()}>{t('today.retry')}</Button>
        </div>
      ) : null}
      {!data && status !== 'error' ? (
        <p role="status" className="text-sm text-muted">
          {t('today.loading')}
        </p>
      ) : null}

      {data && summary ? (
        <>
          <p className="text-sm text-ice">
            {t('today.asOf', {
              time: formatUtc(Date.parse(data.fetchedAt), locale),
            })}
          </p>

          <section aria-labelledby={`${id}-kp`} className="grid gap-1">
            <h3 id={`${id}-kp`} className="label-caps">
              {t('today.kpHeading')}
            </h3>
            <p className="font-semibold text-ice">
              {t('today.kpNow', {
                kp: formatKp(kp),
                level: t(`today.level.${kpLevel(kp)}`),
              })}
            </p>
            <p className="text-sm text-muted">
              {t('today.kpMax', { kp: formatKp(summary.kpMax24h) })}
            </p>
            <p className="text-xs text-muted">{t('today.auroraHint')}</p>
          </section>

          <section aria-labelledby={`${id}-quakes`} className="grid gap-2">
            <h3 id={`${id}-quakes`} className="label-caps">
              {t('today.quakesHeading')}
            </h3>
            <p className="text-sm text-muted">
              {t('today.quakeCount', {
                n: summary.quakeCount,
                shown: largest.length,
              })}
            </p>
            <ul className="grid gap-1">
              {largest.map((quake) => {
                const label = t('today.quake', {
                  mag: quake.mag.toFixed(1),
                  place: quake.place,
                })
                return (
                  <li key={quake.id}>
                    <button
                      type="button"
                      aria-label={t('today.focus', { label })}
                      onClick={() => focus(quake.id)}
                      className="grid min-h-11 w-full gap-0.5 rounded-xs border border-line px-3 py-2 text-left text-sm text-ice hover:border-ice"
                    >
                      <span className="font-semibold">{label}</span>
                      <span className="text-xs text-muted">
                        {t('today.quakeMeta', {
                          time: formatUtc(quake.time, locale),
                          depth: quake.depthKm,
                        })}
                        {quake.tsunami ? ` · ${t('today.tsunami')}` : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <p className="text-xs text-muted">
            {t('today.sources')}:{' '}
            {SOURCES.map((source, i) => (
              <span key={source.name}>
                {i > 0 ? ' · ' : ''}
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ice underline underline-offset-2"
                >
                  {source.name}
                  <span className="sr-only"> ({t('today.newWindow')})</span>
                </a>
              </span>
            ))}
          </p>
        </>
      ) : null}
    </div>
  )
}
