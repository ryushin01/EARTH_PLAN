import { useState } from 'react'
import { REGIONS } from '../../model/site/data'
import { warming } from '../../model/world/engine'
import {
  SEVERITY_LABEL,
  droughtEffects,
  isInDrought,
  wildfireArea,
} from '../../model/world/hazards'
import { useWorld } from '../../model/world/store'
import { decimalYearToDate } from '@/shared/lib'
import { Button, ChoiceGroup, SelectField, StatusMessage } from '@/shared/ui'

type Severity = '1' | '2' | '3'

/** 산불과 가뭄 */
export function HazardPanel() {
  const selectedSiteId = useWorld((s) => s.selectedSiteId)
  const structures = useWorld((s) => s.structures)
  const year = useWorld((s) => s.year)
  const droughts = useWorld((s) => s.droughts)
  const warmingC = useWorld(warming)
  const select = useWorld((s) => s.select)
  const startWildfire = useWorld((s) => s.startWildfire)
  const startDrought = useWorld((s) => s.startDrought)

  const [regionId, setRegionId] = useState(REGIONS[0].id)
  const [severity, setSeverity] = useState<Severity>('2')
  const [fireResult, setFireResult] = useState({ message: '', ok: true })
  const [droughtResult, setDroughtResult] = useState({ message: '', ok: true })

  const region =
    REGIONS.find((r) => r.id === selectedSiteId) ??
    REGIONS.find((r) => r.id === regionId) ??
    REGIONS[0]
  const inDrought = isInDrought(region.id, droughts, year)
  const area = wildfireArea(region, warmingC, structures, year, inDrought)
  const effects = droughtEffects(
    region,
    Number(severity) as 1 | 2 | 3,
    structures,
    year,
    warmingC,
  )
  const active = droughts.filter((d) => year < d.year + d.durationYears)

  return (
    <div className="grid gap-5">
      <SelectField
        label="지역"
        value={region.id}
        onChange={(id) => {
          setRegionId(id)
          select(id)
        }}
        options={REGIONS.map((r) => ({
          value: r.id,
          label: r.name,
          group: r.region,
        }))}
        description={`${region.note} · 인구 약 ${region.population}백만 명`}
      />

      <section
        aria-labelledby="fire-title"
        className="grid gap-3 border-t border-line pt-4"
      >
        <h3 id="fire-title" className="label-caps">
          산불
        </h3>
        <p className="text-sm leading-relaxed text-muted">
          지금 나면 약{' '}
          <strong className="display-num text-ice">
            {Math.round(area).toLocaleString('ko-KR')}km²
          </strong>
          가 탑니다{inDrought ? ' (가뭄 중이라 1.8배)' : ''}. 기온이 오를수록
          커지고, 재생하면 산불이 잘 나는 지역에서 저절로도 납니다.
        </p>
        <Button
          variant="danger"
          onClick={() => {
            setFireResult(startWildfire(region.id))
            select(region.id)
          }}
        >
          {region.name} 산불 일으키기
        </Button>
        <StatusMessage
          message={fireResult.message}
          tone={fireResult.ok ? 'info' : 'error'}
        />
      </section>

      <section
        aria-labelledby="drought-title"
        className="grid gap-3 border-t border-line pt-4"
      >
        <h3 id="drought-title" className="label-caps">
          가뭄
        </h3>
        <ChoiceGroup<Severity>
          legend="가뭄 정도"
          value={severity}
          onChange={setSeverity}
          columns={3}
          choices={(['1', '2', '3'] as const).map((s) => ({
            value: s,
            label: SEVERITY_LABEL[Number(s) as 1 | 2 | 3],
            hint: `${Number(s) + 1}년`,
          }))}
        />
        <p className="text-sm leading-relaxed text-muted">
          약 {effects.affectedMillions.toFixed(1)}백만 명 물 부족, 농작물{' '}
          {Math.round(effects.cropLoss)}% 감소. 가뭄 동안 산불이 더 크게 납니다.
        </p>
        <Button
          variant="danger"
          disabled={inDrought}
          onClick={() => {
            setDroughtResult(
              startDrought(region.id, Number(severity) as 1 | 2 | 3),
            )
            select(region.id)
          }}
        >
          {inDrought
            ? `${region.name} 가뭄 진행 중`
            : `${region.name} 가뭄 일으키기`}
        </Button>
        <StatusMessage
          message={droughtResult.message}
          tone={droughtResult.ok ? 'info' : 'error'}
        />
        {active.length ? (
          <ul className="grid gap-1 text-sm">
            {active.map((d) => (
              <li
                key={d.id}
                className="flex justify-between border-t border-line py-1.5"
              >
                <span>
                  {REGIONS.find((r) => r.id === d.regionId)?.name} ·{' '}
                  {SEVERITY_LABEL[d.severity]}
                </span>
                <span className="text-warn">
                  {decimalYearToDate(d.year + d.durationYears).getUTCFullYear()}
                  년까지
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
