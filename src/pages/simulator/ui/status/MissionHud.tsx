import { useShallow } from 'zustand/react/shallow'
import { summarize } from '../../model/world/selectors'
import { useWorld } from '../../model/world/store'
import type { EventTone } from '../../model/world/types'
import { formatSimDate } from './TimeControls'
import { formatBillions, formatNumber, formatSigned, cn } from '@/shared/lib'

const TONE_LABEL: Record<EventTone, string> = {
  info: '알림',
  good: '완료',
  warn: '주의',
  danger: '경보',
}
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
  const seaLevel = useWorld((s) => s.seaLevel)
  const budget = useWorld((s) => s.budget)
  const storms = useWorld((s) => s.storms.length)
  const events = useWorld((s) => s.events)
  const summary = useWorld(useShallow(summarize))
  const latest = events.at(0)

  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xs border border-line bg-line">
        <Stat
          label="해수면"
          value={`${formatSigned(seaLevel, 2)}m`}
          note="2020년 대비"
        />
        <Stat
          label="평균 기온"
          value={`${formatSigned(summary.warming, 2)}°C`}
          note="산업화 이전 대비"
        />
        <Stat
          label="침수 도시"
          value={`${summary.floodedCities}곳`}
          note={`보호 ${summary.protectedCities} · 위험 ${summary.atRiskCities}`}
        />
        <Stat
          label="이주 추정"
          value={`${formatNumber(summary.displacedMillions, 1)}M`}
          note="백만 명, 단순 추정"
        />
        <Stat label="열대 저기압" value={`${storms}개`} note="지금 활동 중" />
        <Stat
          label="예산"
          value={formatBillions(budget)}
          note="매년 $150B 증가"
        />
      </dl>

      <section aria-labelledby="event-log-title" className="grid gap-2">
        <h3 id="event-log-title" className="label-caps">
          사건 기록
        </h3>
        {/* 새 사건을 화면 낭독기에 알림 (내용만 바뀜) */}
        <p role="status" className="sr-only">
          {latest ? `${TONE_LABEL[latest.tone]}: ${latest.text}` : ''}
        </p>
        {events.length === 0 ? (
          <p className="text-sm text-muted">
            아직 기록이 없습니다. 재생하거나 재해를 일으켜 보세요.
          </p>
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
                  {TONE_LABEL[event.tone]}
                </span>
                <span className="mr-2 display-num text-xs text-muted">
                  {formatSimDate(event.year)}
                </span>
                {event.text}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
