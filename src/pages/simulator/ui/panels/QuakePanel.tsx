import { useState } from 'react'
import { FAULTS, getSite } from '../../model/site/data'
import {
  quakeImpacts,
  quakeSevereRadiusKm,
  quakeStrongRadiusKm,
} from '../../model/world/hazards'
import { useWorld } from '../../model/world/store'
import { Button, RangeField, SelectField, StatusMessage } from '@/shared/ui'
import { formatNumber } from '@/shared/lib'

const OUTCOME_LABEL = {
  severe: '큰 피해',
  moderate: '흔들림 피해',
  reduced: '내진 보강으로 버팀',
} as const
const OUTCOME_STYLE = {
  severe: 'text-danger',
  moderate: 'text-warn',
  reduced: 'text-accent',
} as const

export function QuakePanel() {
  const selectedSiteId = useWorld((s) => s.selectedSiteId)
  const structures = useWorld((s) => s.structures)
  const year = useWorld((s) => s.year)
  const quakes = useWorld((s) => s.quakes)
  const select = useWorld((s) => s.select)
  const triggerQuake = useWorld((s) => s.triggerQuake)

  const [faultId, setFaultId] = useState(FAULTS[0].id)
  const [magnitude, setMagnitude] = useState(7)
  const [result, setResult] = useState({ message: '', ok: true })

  const fault =
    FAULTS.find((f) => f.id === selectedSiteId) ??
    FAULTS.find((f) => f.id === faultId) ??
    FAULTS[0]
  const preview = quakeImpacts(fault, magnitude, structures, year)
  const latest = quakes.at(-1)

  return (
    <div className="grid gap-5">
      <SelectField
        label="단층"
        value={fault.id}
        onChange={(id) => {
          setFaultId(id)
          select(id)
        }}
        options={FAULTS.map((f) => ({
          value: f.id,
          label: f.name,
          group: f.region,
        }))}
        description={`${fault.note} · 최대 규모 ${fault.historicMagnitude}`}
      />
      <RangeField
        label="지진 규모"
        min={5.5}
        max={8.5}
        step={0.1}
        value={magnitude}
        onChange={setMagnitude}
        valueText={`규모 ${magnitude.toFixed(1)}`}
        description="규모가 1 오르면 에너지는 약 32배가 됩니다. 바다 밑 해구 지진은 쓰나미 탭에서 일으킵니다."
      />
      <div className="rounded-xs border border-line p-3 text-sm leading-relaxed">
        <p>
          큰 피해 반경{' '}
          <strong className="display-num">
            {formatNumber(quakeSevereRadiusKm(magnitude), 0)}km
          </strong>{' '}
          · 강한 흔들림{' '}
          <strong className="display-num">
            {formatNumber(quakeStrongRadiusKm(magnitude), 0)}km
          </strong>
        </p>
        <p className="text-muted">
          {preview.length
            ? `영향 도시: ${preview.map((i) => getSite(i.cityId)?.name).join(', ')}`
            : '강한 흔들림 범위 안에 주요 도시가 없습니다.'}
        </p>
      </div>
      <Button
        variant="danger"
        onClick={() => {
          setResult(triggerQuake(fault.id, magnitude))
          select(fault.id)
        }}
      >
        {fault.name} 지진 일으키기
      </Button>
      <StatusMessage
        message={result.message}
        tone={result.ok ? 'info' : 'error'}
      />
      {latest?.impacts.length ? (
        <section aria-labelledby="quake-impacts" className="grid gap-2">
          <h3 id="quake-impacts" className="label-caps">
            최근 지진 피해
          </h3>
          <ul className="grid gap-1 text-sm">
            {latest.impacts.map((impact) => (
              <li
                key={impact.cityId}
                className="flex justify-between gap-2 border-t border-line py-1.5"
              >
                <span>
                  {getSite(impact.cityId)?.name}{' '}
                  <span className="text-xs text-muted">
                    진앙에서 {formatNumber(impact.distanceKm, 0)}km
                  </span>
                </span>
                <span
                  className={`font-semibold ${OUTCOME_STYLE[impact.outcome]}`}
                >
                  {OUTCOME_LABEL[impact.outcome]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
