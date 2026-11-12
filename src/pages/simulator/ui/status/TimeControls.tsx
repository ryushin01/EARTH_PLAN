import { SPEEDS, isHourFrozen, utcHourOf } from '../../model/world/time'
import { useWorld } from '../../model/world/store'
import type { SpeedId } from '../../model/world/time'
import { Button, ChoiceGroup, RangeField } from '@/shared/ui'
import { useT } from '../i18n'
import { decimalYearToDate, seasonKey } from '@/shared/lib'

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
  const { t } = useT()
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
          <span className="label-caps">{t('time.date')}</span>
          <span className="display-num text-3xl text-ice">
            {formatSimDate(year)}{' '}
            <span className="text-lg text-muted">{formatHour(hour)}</span>
          </span>
          <span className="text-xs text-muted">
            {t('time.season', {
              season: t(`season.${seasonKey(year)}`),
              kst: formatHour(kstHour),
            })}
          </span>
        </p>
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => setRunning(!running)}
            className="min-w-28"
          >
            {running ? t('time.pause') : t('time.play')}
          </Button>
          <Button onClick={reset}>{t('time.reset')}</Button>
        </div>
      </div>
      <ChoiceGroup<SpeedId>
        legend={t('time.speed')}
        value={speed}
        onChange={setSpeed}
        columns={5}
        choices={SPEEDS.map((s) => ({
          value: s.id,
          label: t(`speed.${s.id}`),
        }))}
      />
      <RangeField
        label={t('time.hour')}
        min={0}
        max={23.75}
        step={0.25}
        value={Math.round(hour * 4) / 4}
        onChange={setHour}
        valueText={formatHour(hour)}
        description={frozen ? t('time.frozen') : t('time.moving')}
      />
    </div>
  )
}
