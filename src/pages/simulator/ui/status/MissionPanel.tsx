import { useShallow } from 'zustand/react/shallow'
import { MISSIONS, MISSION_BY_ID } from '../../model/world/missions'
import type { Mission } from '../../model/world/missions'
import { useWorld } from '../../model/world/store'
import { formatSimDate } from './TimeControls'
import { Button } from '@/shared/ui'
import { cn, decimalYearToDate, formatBillions } from '@/shared/lib'

const STATUS_TEXT = {
  active: '진행 중',
  success: '성공',
  failed: '실패',
} as const

function ActiveMission({ mission }: { mission: Mission }) {
  const status = useWorld((s) => s.mission?.status ?? 'active')
  const firedIds = useWorld(useShallow((s) => s.mission?.firedIds ?? []))
  const year = useWorld((s) => s.year)
  const detail = useWorld((s) => mission.evaluate(s).detail)
  const quitMission = useWorld((s) => s.quitMission)
  const startYear = useWorld((s) => s.history[0]?.year ?? s.year)
  const progress = Math.min(
    1,
    Math.max(0, (year - startYear) / (mission.endYear - startYear)),
  )

  return (
    <div className="grid gap-3">
      <p className="flex items-baseline justify-between gap-2">
        <strong className="font-display text-base">{mission.title}</strong>
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
          {STATUS_TEXT[status]}
        </span>
      </p>
      <p className="text-sm leading-relaxed text-muted">목표: {mission.goal}</p>
      <div className="grid gap-1">
        <label htmlFor="mission-progress" className="label-caps">
          {formatSimDate(year)} /{' '}
          {decimalYearToDate(mission.endYear).getUTCFullYear()}년
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
        <ul className="grid gap-1 text-sm" aria-label="예정된 사건">
          {mission.schedule.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span>{item.warning}</span>
              <span
                className={
                  firedIds.includes(item.id) ? 'text-muted' : 'text-warn'
                }
              >
                {firedIds.includes(item.id)
                  ? '일어남'
                  : formatSimDate(item.year)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <Button size="sm" onClick={quitMission}>
        {status === 'active' ? '미션 그만두기' : '미션 닫기'}
      </Button>
    </div>
  )
}

/** 목표가 있는 미션 */
export function MissionPanel() {
  const missionId = useWorld((s) => s.mission?.id ?? null)
  const startMission = useWorld((s) => s.startMission)
  const mission = missionId ? MISSION_BY_ID[missionId] : undefined

  return (
    <section aria-labelledby="mission-title" className="grid gap-3">
      <h3 id="mission-title" className="label-caps">
        미션
      </h3>
      {mission ? (
        <ActiveMission mission={mission} />
      ) : (
        <>
          <p className="text-sm text-muted">
            미션을 시작하면 지금 시뮬레이션은 처음 상태로 돌아갑니다.
          </p>
          <ul className="grid gap-2">
            {MISSIONS.map((m) => (
              <li
                key={m.id}
                className="grid gap-1.5 rounded-xs border border-line p-3"
              >
                <strong className="font-display text-sm">{m.title}</strong>
                <span className="text-sm leading-relaxed text-muted">
                  {m.brief}
                </span>
                <span className="text-xs text-ice">
                  목표: {m.goal} · 예산 {formatBillions(m.budget)}
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => startMission(m.id)}
                  aria-label={`${m.title} 시작`}
                >
                  시작
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
