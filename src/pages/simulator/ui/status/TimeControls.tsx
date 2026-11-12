import { SPEEDS, isHourFrozen, utcHourOf } from '../../model/world/time'
import { useWorld } from '../../model/world/store'
import type { SpeedId } from '../../model/world/time'
import { Button, ChoiceGroup, RangeField } from '@/shared/ui'
import { decimalYearToDate, seasonLabel } from '@/shared/lib'

const pad = (n: number) => String(n).padStart(2, '0')

export function formatSimDate(year: number): string {
  const d = decimalYearToDate(year)
  return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`
}

function formatHour(hour: number): string {
  const h = Math.floor(hour) % 24
  const m = Math.floor((hour - Math.floor(hour)) * 60)
  return `${pad(h)}:${pad(m)}`
}

/** 재생·정지, 속도, 시각 조절 */
export function TimeControls() {
  const year = useWorld((s) => s.year)
  const running = useWorld((s) => s.running)
  const speed = useWorld((s) => s.speed)
  const heldHour = useWorld((s) => s.heldHour)
  const setRunning = useWorld((s) => s.setRunning)
  const setSpeed = useWorld((s) => s.setSpeed)
  const setHour = useWorld((s) => s.setHour)
  const reset = useWorld((s) => s.reset)

  const frozen = isHourFrozen(speed)
  const hour = frozen ? heldHour : utcHourOf(year)
  const kstHour = (hour + 9) % 24

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="grid">
          <span className="label-caps">시뮬레이션 날짜 (UTC)</span>
          <span className="display-num text-3xl text-ice">
            {formatSimDate(year)}{' '}
            <span className="text-lg text-muted">{formatHour(hour)}</span>
          </span>
          <span className="text-xs text-muted">
            북반구 {seasonLabel(year)} · 한국 시각 {formatHour(kstHour)}
          </span>
        </p>
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => setRunning(!running)}
            className="min-w-28"
          >
            {running ? '일시정지' : '재생'}
          </Button>
          <Button onClick={reset}>처음으로</Button>
        </div>
      </div>
      <ChoiceGroup<SpeedId>
        legend="시간 속도 (화면 1초마다)"
        value={speed}
        onChange={setSpeed}
        columns={5}
        choices={SPEEDS.map((s) => ({ value: s.id, label: s.label }))}
      />
      <RangeField
        label="시각 (UTC)"
        min={0}
        max={23.75}
        step={0.25}
        value={Math.round(hour * 4) / 4}
        onChange={setHour}
        valueText={formatHour(hour)}
        description={
          frozen
            ? '하루가 1초보다 빨리 지나가는 속도에서는 낮·밤이 깜빡이지 않도록 이 시각에 고정합니다.'
            : '태양 위치가 바뀌어 낮·밤 경계가 움직입니다.'
        }
      />
    </div>
  )
}
