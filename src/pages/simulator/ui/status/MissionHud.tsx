import { useT } from '../i18n'
import type { MessageKey } from '../i18n'
import { useShallow } from 'zustand/react/shallow'
import { summarize } from '../../model/world/selectors'
import { useWorld } from '../../model/world/store'
import type { EventTone } from '../../model/world/types'
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

/** 지구 상태 수치와 사건 기록 */
export function MissionHud() {
  const { t, pick } = useT()
  const seaLevel = useWorld((s) => s.seaLevel)
  const budget = useWorld((s) => s.budget)
  const storms = useWorld((s) => s.storms.length)
  const fires = useWorld(
    (s) => s.wildfires.filter((f) => s.year < f.year + f.durationYears).length,
  )
  const droughts = useWorld(
    (s) => s.droughts.filter((d) => s.year < d.year + d.durationYears).length,
  )
  const events = useWorld((s) => s.events)
  const summary = useWorld(useShallow(summarize))
  const latest = events.at(0)

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
        {/* 새 사건을 화면 낭독기에 알림 (내용만 바뀜) */}
        <p role="status" className="sr-only">
          {latest ? `${t(TONE_KEY[latest.tone])}: ${pick(latest.text)}` : ''}
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
