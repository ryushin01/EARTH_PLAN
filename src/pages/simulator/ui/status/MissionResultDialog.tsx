import { useEffect, useId, useRef, useState } from 'react'
import type { Mission } from '../../model/world/missions'
import { toSnapshot } from '../../model/world/snapshot'
import { useWorld } from '../../model/world/store'
import { warming } from '../../model/world/engine'
import { shareUrl } from './ScenarioShare'
import { formatSimDate } from './TimeControls'
import { Button, StatusMessage } from '@/shared/ui'
import { useT } from '../i18n'
import type { MessageKey } from '../i18n'
import { cn, formatBillions, formatSigned } from '@/shared/lib'

/** 미션이 끝나면 결과를 모달 대화상자로 보여 줍니다 */
export function MissionResultDialog({ mission }: { mission: Mission }) {
  const { t, pick } = useT()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()
  const status = useWorld((s) => s.mission?.status ?? 'active')
  const previous = useRef(status)
  const [copy, setCopy] = useState<{ key: MessageKey | null; ok: boolean }>({
    key: null,
    ok: true,
  })

  useEffect(() => {
    // 진행 중 → 끝남으로 바뀐 순간에만 엶 (저장한 상태를 불러올 때는 열지 않음)
    if (previous.current === 'active' && status !== 'active') {
      const dialog = ref.current
      if (dialog && !dialog.open) dialog.showModal()
    }
    previous.current = status
  }, [status])

  const state = useWorld.getState()
  const result = mission.evaluate(state)
  const startYear = state.history[0]?.year ?? state.year
  const stats: Array<[string, string]> = [
    [
      t('result.period'),
      `${formatSimDate(startYear)} → ${formatSimDate(state.year)}`,
    ],
    [t('result.spent'), formatBillions(state.spent)],
    [t('result.structures'), t('hud.count', { n: state.structures.length })],
    [t('result.surges'), t('result.times', { n: state.stormDamage })],
    [t('hud.flooded'), t('hud.count', { n: state.floodedCityIds.length })],
    [
      t('result.seaTemp'),
      `${formatSigned(state.seaLevel, 2)}m · ${formatSigned(warming(state), 2)}°C`,
    ],
  ]
  const success = status === 'success'

  const copyResult = async () => {
    const lines = [
      `EARTH PLAN · ${t(success ? 'result.success' : 'result.failure')}: ${pick(mission.title)}`,
      pick(result.detail),
      ...stats.map(([k, v]) => `${k}: ${v}`),
      shareUrl(toSnapshot(useWorld.getState()), window.location.href),
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopy({ ok: true, key: 'result.copied' })
    } catch {
      setCopy({ ok: false, key: 'result.copyBlocked' })
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xs border border-line-strong bg-panel-solid p-5 text-ice backdrop:bg-black/70"
    >
      <h2 id={titleId} className="font-display text-xl font-semibold">
        {t(success ? 'result.success' : 'result.failure')}
        <span className="mt-1 block text-sm font-normal text-muted">
          {pick(mission.title)}
        </span>
      </h2>
      <p
        id={descId}
        className={cn('mt-3 text-sm', success ? 'text-safe' : 'text-danger')}
      >
        {pick(result.detail)}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xs border border-line bg-line text-sm">
        {stats.map(([k, v]) => (
          <div key={k} className="bg-panel-solid p-2.5">
            <dt className="label-caps">{k}</dt>
            <dd className="display-num mt-0.5">{v}</dd>
          </div>
        ))}
      </dl>
      <StatusMessage
        className="mt-3"
        message={copy.key ? t(copy.key) : ''}
        tone={copy.ok ? 'info' : 'error'}
      />
      <div className="mt-3 flex justify-end gap-2">
        <Button onClick={copyResult}>{t('result.copy')}</Button>
        <Button variant="primary" onClick={() => ref.current?.close()}>
          {t('result.close')}
        </Button>
      </div>
    </dialog>
  )
}
