import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import type { MessageKey } from '../i18n'
import { useShallow } from 'zustand/react/shallow'
import { summarize } from '../../model/world/selectors'
import { useWorldSampled } from '../../model/world/sampled'
import type { EventTone, WorldEvent } from '../../model/world/types'
import { formatSimDate } from './TimeControls'
import { formatBillions, formatNumber, formatSigned, cn } from '@/shared/lib'

const TONE_KEY = {
  info: 'tone.info',
  good: 'tone.good',
  warn: 'tone.warn',
  danger: 'tone.danger',
} as const satisfies Record<EventTone, MessageKey>
const TONE_STYLE: Record<EventTone, string> = {
  info: 'text-muted',
  good: 'text-accent',
  warn: 'text-warn',
  danger: 'text-danger',
}

function Stat({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note?: string
}) {
  return (
    <div className="bg-panel-solid p-3">
      <dt className="label-caps">{label}</dt>
      <dd className="display-num text-2xl leading-tight text-ice">
        {value}
        {note ? (
          <span className="block font-sans text-xs font-normal tracking-normal text-muted">
            {note}
          </span>
        ) : null}
      </dd>
    </div>
  )
}

/** 사건 알림을 다시 읽어 주기까지의 최소 간격 */
export const ANNOUNCE_MS = 3000

interface Announcement {
  /** 지난 알림 뒤 새로 생긴 사건 수 */
  count: number
  /** 그중 가장 최근 사건 */
  event: WorldEvent
}

/**
 * 새 사건을 화면 낭독기에 알릴 내용. 빠르게 재생하면 사건이 연달아 생기므로
 * ANNOUNCE_MS 안에 생긴 사건은 모아 "새 사건 N건"으로 한 번만 알립니다
 */
function useEventAnnouncement(events: WorldEvent[]): Announcement | null {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const latest = useRef(events)
  // 마지막으로 알린 사건 (처음 그릴 때 있던 사건은 알리지 않음)
  const announced = useRef<WorldEvent | undefined>(events.at(0))
  const lastAt = useRef(Number.NEGATIVE_INFINITY)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    latest.current = events
    const announce = () => {
      timer.current = undefined
      const list = latest.current
      const seen = announced.current ? list.indexOf(announced.current) : -1
      const count = seen === -1 ? list.length : seen
      const event = list.at(0)
      if (!event || count === 0) return
      announced.current = event
      lastAt.current = performance.now()
      setAnnouncement({ count, event })
    }
    if (events.at(0) === announced.current || timer.current) return
    const wait = ANNOUNCE_MS - (performance.now() - lastAt.current)
    if (wait <= 0) announce()
    else timer.current = setTimeout(announce, wait)
  }, [events])

  useEffect(() => () => clearTimeout(timer.current), [])
  return announcement
}

/** 지구 상태 수치와 사건 기록 */
export function MissionHud() {
  const { t, pick } = useT()
  const seaLevel = useWorldSampled((s) => s.seaLevel)
  const budget = useWorldSampled((s) => s.budget)
  const storms = useWorldSampled((s) => s.storms.length)
  const fires = useWorldSampled(
    (s) => s.wildfires.filter((f) => s.year < f.year + f.durationYears).length,
  )
  const droughts = useWorldSampled(
    (s) => s.droughts.filter((d) => s.year < d.year + d.durationYears).length,
  )
  const events = useWorldSampled((s) => s.events)
  const summary = useWorldSampled(useShallow(summarize))
  const announcement = useEventAnnouncement(events)

  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xs border border-line bg-line">
        <Stat
          label={t('hud.sea')}
          value={`${formatSigned(seaLevel, 2)}m`}
          note={t('hud.vs2020')}
        />
        <Stat
          label={t('hud.temp')}
          value={`${formatSigned(summary.warming, 2)}°C`}
          note={t('hud.vsPreindustrial')}
        />
        <Stat
          label={t('hud.flooded')}
          value={t('hud.count', { n: summary.floodedCities })}
          note={t('hud.floodedNote', {
            p: summary.protectedCities,
            r: summary.atRiskCities,
          })}
        />
        <Stat
          label={t('hud.displaced')}
          value={`${formatNumber(summary.displacedMillions, 1)}M`}
          note={t('hud.displacedNote')}
        />
        <Stat
          label={t('hud.storms')}
          value={t('hud.count', { n: storms })}
          note={t('hud.stormsNote')}
        />
        <Stat
          label={t('hud.fires')}
          value={t('hud.count', { n: fires })}
          note={t('hud.firesNote')}
        />
        <Stat
          label={t('hud.droughts')}
          value={t('hud.count', { n: droughts })}
          note={t('hud.droughtsNote')}
        />
        <Stat
          label={t('hud.budget')}
          value={formatBillions(budget)}
          note={t('hud.budgetNote')}
        />
      </dl>

      <section aria-labelledby="event-log-title" className="grid gap-2">
        <h3 id="event-log-title" className="label-caps">
          {t('hud.log')}
        </h3>
        {/* 새 사건을 화면 낭독기에 알림 (내용만 바뀜, 짧은 간격의 사건은 묶어서) */}
        <p role="status" className="sr-only">
          {announcement
            ? `${announcement.count > 1 ? `${t('hud.newEvents', { n: announcement.count })}. ` : ''}${t(TONE_KEY[announcement.event.tone])}: ${pick(announcement.event.text)}`
            : ''}
        </p>
        {events.length === 0 ? (
          <p className="text-sm text-muted">{t('hud.logEmpty')}</p>
        ) : (
          <ol
            className="grid max-h-64 gap-0 overflow-y-auto pr-1"
            tabIndex={0}
            aria-labelledby="event-log-title"
          >
            {events.map((event) => (
              <li
                key={event.id}
                className="border-t border-line py-2 text-sm leading-snug"
              >
                <span
                  className={cn(
                    'mr-2 font-display text-xs font-semibold uppercase',
                    TONE_STYLE[event.tone],
                  )}
                >
                  {t(TONE_KEY[event.tone])}
                </span>
                <span className="mr-2 display-num text-xs text-muted">
                  {formatSimDate(event.year)}
                </span>
                {pick(event.text)}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
