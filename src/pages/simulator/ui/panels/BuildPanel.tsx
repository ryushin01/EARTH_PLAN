import { useId, useState } from 'react'
import { ALL_SITES, getSite } from '../../model/site/data'
import {
  STRUCTURES,
  STRUCTURE_LIST,
  TARGET_LABEL,
  TARGET_LABEL_EN,
  structureName,
  structureSummary,
} from '../../model/structure/catalog'
import type {
  StructureKind,
  StructureTarget,
} from '../../model/structure/catalog'
import {
  EMPTY_TEXT,
  nameList,
  regionName,
  siteName,
  siteNote,
} from '../../model/text'
import { useWorld } from '../../model/world/store'
import { useT } from '../i18n'
import { decimalYearToDate, formatBillions } from '@/shared/lib'
import { Button, ChoiceGroup, SelectField, StatusMessage } from '@/shared/ui'

export function BuildPanel() {
  const { t, pick, locale } = useT()
  const budget = useWorld((s) => s.budget)
  const year = useWorld((s) => s.year)
  const structures = useWorld((s) => s.structures)
  const selectedSiteId = useWorld((s) => s.selectedSiteId)
  const build = useWorld((s) => s.build)
  const inMission = useWorld((s) => s.mission?.status === 'active')
  const select = useWorld((s) => s.select)

  const [kind, setKind] = useState<StructureKind>('sea-wall')
  const [siteByKind, setSiteByKind] = useState<
    Partial<Record<StructureKind, string>>
  >({})
  const [instant, setInstant] = useState(false)
  const [result, setResult] = useState({ message: EMPTY_TEXT, ok: true })
  const instantId = useId()

  const spec = STRUCTURES[kind]
  const targetLabel = (target: StructureTarget) =>
    locale === 'en' ? TARGET_LABEL_EN[target] : TARGET_LABEL[target]
  const candidates = ALL_SITES.filter((site) => site.kind === spec.target)
  const selected = candidates.find((c) => c.id === selectedSiteId)
  const siteId =
    spec.target === 'orbit'
      ? 'orbit'
      : (selected?.id ?? siteByKind[kind] ?? candidates.at(0)?.id ?? '')
  const affordable = budget >= spec.cost

  const describe = () => {
    const site = getSite(siteId)
    if (!site) return undefined
    const note = siteNote(site, locale)
    if (site.kind === 'strait')
      return t('build.strait', { note, list: nameList(site.protects, locale) })
    if (site.kind === 'glacier')
      return t('build.glacier', { note, m: site.potentialRise })
    if (site.kind === 'region')
      return t('build.region', { note, pop: site.population })
    if (site.kind === 'city')
      return t('build.city', { m: site.elevation, pop: site.population })
    return note
  }

  return (
    <div className="grid gap-5">
      <p className="flex items-baseline justify-between">
        <span className="label-caps">{t('build.budget')}</span>
        <span className="display-num text-xl">{formatBillions(budget)}</span>
      </p>
      <ChoiceGroup<StructureKind>
        legend={t('build.structures')}
        value={kind}
        onChange={setKind}
        columns={2}
        choices={STRUCTURE_LIST.map((s) => ({
          value: s.kind,
          label: structureName(s.kind, locale),
          hint: t('build.hint', {
            cost: formatBillions(s.cost),
            years: s.buildYears,
            target: targetLabel(s.target),
          }),
        }))}
      />
      <p className="text-sm leading-relaxed text-muted">
        {structureSummary(kind, locale)}
      </p>
      {spec.target === 'orbit' ? null : (
        <SelectField
          label={t('build.where', { target: targetLabel(spec.target) })}
          value={siteId}
          onChange={(id) => {
            setSiteByKind((m) => ({ ...m, [kind]: id }))
            select(id)
          }}
          options={candidates.map((c) => ({
            value: c.id,
            label: siteName(c, locale),
            group: regionName(c.region, locale),
          }))}
          description={describe()}
        />
      )}
      {inMission ? (
        <p className="text-sm text-muted">{t('build.missionRule')}</p>
      ) : (
        <div className="flex min-h-11 items-center gap-3">
          <input
            id={instantId}
            type="checkbox"
            checked={instant}
            onChange={(e) => setInstant(e.target.checked)}
            className="size-5 accent-accent"
          />
          <label htmlFor={instantId} className="text-sm">
            {t('build.instant')}
          </label>
        </div>
      )}
      <Button
        variant="primary"
        disabled={!affordable}
        aria-describedby={affordable ? undefined : `${instantId}-budget`}
        onClick={() =>
          setResult(build(kind, siteId, { instant: instant && !inMission }))
        }
      >
        {t('build.action', {
          name: structureName(kind, locale),
          cost: formatBillions(spec.cost),
        })}
      </Button>
      {affordable ? null : (
        <p id={`${instantId}-budget`} className="text-sm text-warn">
          {t('build.short', { amount: formatBillions(spec.cost - budget) })}
        </p>
      )}
      <StatusMessage
        message={pick(result.message)}
        tone={result.ok ? 'info' : 'error'}
      />

      <section aria-labelledby="built-list" className="grid gap-2">
        <h3 id="built-list" className="label-caps">
          {t('build.built', { count: structures.length })}
        </h3>
        {structures.length === 0 ? (
          <p className="text-sm text-muted">{t('build.none')}</p>
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
                    {structureName(s.kind, locale)}
                    <span className="text-muted">
                      {' '}
                      ·{' '}
                      {s.siteId === 'orbit'
                        ? targetLabel('orbit')
                        : siteName(s.siteId, locale)}
                    </span>
                  </span>
                  <span className={active ? 'text-accent' : 'text-warn'}>
                    {active
                      ? t('build.active')
                      : t('build.pending', {
                          year: decimalYearToDate(
                            s.completeYear,
                          ).getUTCFullYear(),
                        })}
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
