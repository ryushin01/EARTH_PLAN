import { useShallow } from 'zustand/react/shallow'
import { MISSIONS, MISSION_BY_ID } from '../../model/world/missions'
import type { Mission } from '../../model/world/missions'
import { useWorld } from '../../model/world/store'
import { MissionResultDialog } from './MissionResultDialog'
import { formatSimDate } from './TimeControls'
import { Button } from '@/shared/ui'
import { useT } from '../i18n'
import { cn, decimalYearToDate, formatBillions } from '@/shared/lib'

function ActiveMission({ mission }: { mission: Mission }) {
  const { t, pick, locale } = useT()
  const status = useWorld((s) => s.mission?.status ?? 'active')
  const firedIds = useWorld(useShallow((s) => s.mission?.firedIds ?? []))
  const year = useWorld((s) => s.year)
  const detail = useWorld((s) => mission.evaluate(s).detail[locale])
  const quitMission = useWorld((s) => s.quitMission)
  const startYear = useWorld((s) => s.history[0]?.year ?? s.year)
  const progress = Math.min(
    1,
    Math.max(0, (year - startYear) / (mission.endYear - startYear)),
  )

  return (
    <div className="grid gap-3">
      <p className="flex items-baseline justify-between gap-2">
        <strong className="font-display text-base">
          {pick(mission.title)}
        </strong>
        <span
          className={cn(
            'text-xs font-semibold',
            status === 'success'
              ? 'text-safe'
              : status === 'failed'
                ? 'text-danger'
                : 'text-accent',
          )}
        >
          {t(`mission.status.${status}`)}
        </span>
      </p>
      <p className="text-sm leading-relaxed text-muted">
        {t('mission.goal', { goal: pick(mission.goal) })}
      </p>
      <div className="grid gap-1">
        <label htmlFor="mission-progress" className="label-caps">
          {t('mission.progress', {
            now: formatSimDate(year),
            end: decimalYearToDate(mission.endYear).getUTCFullYear(),
          })}
        </label>
        <progress
          id="mission-progress"
          value={progress}
          max={1}
          className="h-2 w-full appearance-none overflow-hidden rounded-full bg-steel [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-steel [&::-webkit-progress-value]:bg-accent"
        >
          {Math.round(progress * 100)}%
        </progress>
      </div>
      <p className="rounded-xs border border-line p-2 text-sm">{detail}</p>
      {mission.schedule.length ? (
        <ul className="grid gap-1 text-sm" aria-label={t('mission.schedule')}>
          {mission.schedule.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span>{pick(item.warning)}</span>
              <span
                className={
                  firedIds.includes(item.id) ? 'text-muted' : 'text-warn'
                }
              >
                {firedIds.includes(item.id)
                  ? t('mission.happened')
                  : formatSimDate(item.year)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <MissionResultDialog mission={mission} />
      <Button size="sm" onClick={quitMission}>
        {status === 'active' ? t('mission.quit') : t('mission.close')}
      </Button>
    </div>
  )
}

/** 목표가 있는 미션 */
export function MissionPanel() {
  const { t, pick } = useT()
  const missionId = useWorld((s) => s.mission?.id ?? null)
  const startMission = useWorld((s) => s.startMission)
  const mission = missionId ? MISSION_BY_ID[missionId] : undefined

  return (
    <section
      id="mission"
      aria-labelledby="mission-title"
      className="grid scroll-mt-[calc(45svh+0.5rem)] gap-3 lg:scroll-mt-0"
    >
      <h3 id="mission-title" className="label-caps">
        {t('page.mission')}
      </h3>
      {mission ? (
        <ActiveMission mission={mission} />
      ) : (
        <>
          <p className="text-sm text-muted">{t('mission.resetWarning')}</p>
          <ul className="grid gap-2">
            {MISSIONS.map((m) => (
              <li
                key={m.id}
                className="grid gap-1.5 rounded-xs border border-line p-3"
              >
                <strong className="font-display text-sm">
                  {pick(m.title)}
                </strong>
                <span className="text-sm leading-relaxed text-muted">
                  {pick(m.brief)}
                </span>
                <span className="text-xs text-ice">
                  {t('mission.card', {
                    goal: pick(m.goal),
                    budget: formatBillions(m.budget),
                  })}
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => startMission(m.id)}
                  aria-label={t('mission.startNamed', { title: pick(m.title) })}
                >
                  {t('mission.start')}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
