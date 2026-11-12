import { useId, useState } from 'react'
import { ALL_SITES, getSite } from '../../model/site/data'
import {
  STRUCTURES,
  STRUCTURE_LIST,
  TARGET_LABEL,
} from '../../model/structure/catalog'
import type { StructureKind } from '../../model/structure/catalog'
import { useWorld } from '../../model/world/store'
import { decimalYearToDate, formatBillions } from '@/shared/lib'
import { Button, ChoiceGroup, SelectField, StatusMessage } from '@/shared/ui'

export function BuildPanel() {
  const budget = useWorld((s) => s.budget)
  const year = useWorld((s) => s.year)
  const structures = useWorld((s) => s.structures)
  const selectedSiteId = useWorld((s) => s.selectedSiteId)
  const build = useWorld((s) => s.build)
  const select = useWorld((s) => s.select)

  const [kind, setKind] = useState<StructureKind>('sea-wall')
  const [siteByKind, setSiteByKind] = useState<
    Partial<Record<StructureKind, string>>
  >({})
  const [instant, setInstant] = useState(false)
  const [result, setResult] = useState({ message: '', ok: true })
  const instantId = useId()

  const spec = STRUCTURES[kind]
  const candidates = ALL_SITES.filter((site) => site.kind === spec.target)
  const selected = candidates.find((c) => c.id === selectedSiteId)
  const siteId =
    spec.target === 'orbit'
      ? 'orbit'
      : (selected?.id ?? siteByKind[kind] ?? candidates.at(0)?.id ?? '')
  const affordable = budget >= spec.cost

  return (
    <div className="grid gap-5">
      <p className="flex items-baseline justify-between">
        <span className="label-caps">사용 가능 예산</span>
        <span className="display-num text-xl">{formatBillions(budget)}</span>
      </p>
      <ChoiceGroup<StructureKind>
        legend="거대 구조물"
        value={kind}
        onChange={setKind}
        columns={2}
        choices={STRUCTURE_LIST.map((s) => ({
          value: s.kind,
          label: s.name,
          hint: `${formatBillions(s.cost)} · ${s.buildYears}년 · ${TARGET_LABEL[s.target]}`,
        }))}
      />
      <p className="text-sm leading-relaxed text-muted">{spec.summary}</p>
      {spec.target === 'orbit' ? null : (
        <SelectField
          label={`설치할 ${TARGET_LABEL[spec.target]}`}
          value={siteId}
          onChange={(id) => {
            setSiteByKind((m) => ({ ...m, [kind]: id }))
            select(id)
          }}
          options={candidates.map((c) => ({
            value: c.id,
            label: c.name,
            group: c.region,
          }))}
          description={(() => {
            const site = getSite(siteId)
            if (!site) return undefined
            if (site.kind === 'strait')
              return `${site.note}. 보호 도시: ${site.protects.map((id) => getSite(id)?.name).join(', ')}`
            if (site.kind === 'glacier')
              return `${site.note}. 다 녹으면 해수면 +${site.potentialRise}m`
            if (site.kind === 'city')
              return `저지대 고도 약 ${site.elevation}m, 도시권 인구 약 ${site.population}백만 명`
            return site.note
          })()}
        />
      )}
      <div className="flex min-h-11 items-center gap-3">
        <input
          id={instantId}
          type="checkbox"
          checked={instant}
          onChange={(e) => setInstant(e.target.checked)}
          className="size-5 accent-accent"
        />
        <label htmlFor={instantId} className="text-sm">
          건설 기간 없이 바로 완공 (실험용)
        </label>
      </div>
      <Button
        variant="primary"
        disabled={!affordable}
        aria-describedby={affordable ? undefined : `${instantId}-budget`}
        onClick={() => setResult(build(kind, siteId, { instant }))}
      >
        {spec.name} 짓기 · {formatBillions(spec.cost)}
      </Button>
      {affordable ? null : (
        <p id={`${instantId}-budget`} className="text-sm text-warn">
          예산이 {formatBillions(spec.cost - budget)} 모자랍니다. 시간을
          재생하면 매년 $150B씩 늘어납니다.
        </p>
      )}
      <StatusMessage
        message={result.message}
        tone={result.ok ? 'info' : 'error'}
      />

      <section aria-labelledby="built-list" className="grid gap-2">
        <h3 id="built-list" className="label-caps">
          지은 구조물 {structures.length}개
        </h3>
        {structures.length === 0 ? (
          <p className="text-sm text-muted">아직 없습니다.</p>
        ) : (
          <ul className="grid gap-1">
            {structures.map((s) => {
              const active = year >= s.completeYear
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 border-t border-line py-2 text-sm"
                >
                  <span>
                    {STRUCTURES[s.kind].name}
                    <span className="text-muted">
                      {' '}
                      · {getSite(s.siteId)?.name ?? '궤도'}
                    </span>
                  </span>
                  <span className={active ? 'text-accent' : 'text-warn'}>
                    {active
                      ? '가동 중'
                      : `${decimalYearToDate(s.completeYear).getUTCFullYear()}년 완공 예정`}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
