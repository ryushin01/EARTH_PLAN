import { useState } from 'react'
import { REGIONS } from '../../model/site/data'
import { EMPTY_TEXT, regionName, siteName, siteNote } from '../../model/text'
import { warming } from '../../model/world/engine'
import {
  SEVERITY_LABEL,
  SEVERITY_LABEL_EN,
  droughtEffects,
  isInDrought,
  wildfireArea,
} from '../../model/world/hazards'
import { useWorld } from '../../model/world/store'
import { useT } from '../i18n'
import { decimalYearToDate, formatNumber } from '@/shared/lib'
import { Button, ChoiceGroup, SelectField, StatusMessage } from '@/shared/ui'

type Severity = '1' | '2' | '3'

/** 산불과 가뭄 */
export function HazardPanel() {
  const { t, pick, locale } = useT()
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
  const [fireResult, setFireResult] = useState({
    message: EMPTY_TEXT,
    ok: true,
  })
  const [droughtResult, setDroughtResult] = useState({
    message: EMPTY_TEXT,
    ok: true,
  })

  const region =
    REGIONS.find((r) => r.id === selectedSiteId) ??
    REGIONS.find((r) => r.id === regionId) ??
    REGIONS[0]
  const name = siteName(region, locale)
  const inDrought = isInDrought(region.id, droughts, year)
  const area = wildfireArea(region, warmingC, structures, year, inDrought)
  const level = Number(severity) as 1 | 2 | 3
  const effects = droughtEffects(region, level, structures, year, warmingC)
  const active = droughts.filter((d) => year < d.year + d.durationYears)
  const severityLabel = (s: 1 | 2 | 3) =>
    locale === 'en' ? SEVERITY_LABEL_EN[s] : SEVERITY_LABEL[s]

  return (
    <div className="grid gap-5">
      <SelectField
        label={t('hazard.region')}
        value={region.id}
        onChange={(id) => {
          setRegionId(id)
          select(id)
        }}
        options={REGIONS.map((r) => ({
          value: r.id,
          label: siteName(r, locale),
          group: regionName(r.region, locale),
        }))}
        description={t('hazard.regionNote', {
          note: siteNote(region, locale),
          pop: region.population,
        })}
      />

      <section
        aria-labelledby="fire-title"
        className="grid gap-3 border-t border-line pt-4"
      >
        <h3 id="fire-title" className="label-caps">
          {t('hazard.fire')}
        </h3>
        <p className="text-sm leading-relaxed text-muted">
          {t('hazard.fireArea', { area: formatNumber(area, 0) })}
          {inDrought ? ` ${t('hazard.fireDrought')}` : ''}{' '}
          {t('hazard.fireHelp')}
        </p>
        <Button
          variant="danger"
          onClick={() => {
            setFireResult(startWildfire(region.id))
            select(region.id)
          }}
        >
          {t('hazard.fireTrigger', { name })}
        </Button>
        <StatusMessage
          message={pick(fireResult.message)}
          tone={fireResult.ok ? 'info' : 'error'}
        />
      </section>

      <section
        aria-labelledby="drought-title"
        className="grid gap-3 border-t border-line pt-4"
      >
        <h3 id="drought-title" className="label-caps">
          {t('hazard.drought')}
        </h3>
        <ChoiceGroup<Severity>
          legend={t('hazard.severity')}
          value={severity}
          onChange={setSeverity}
          columns={3}
          choices={(['1', '2', '3'] as const).map((s) => ({
            value: s,
            label: severityLabel(Number(s) as 1 | 2 | 3),
            hint: t('hazard.years', { n: Number(s) + 1 }),
          }))}
        />
        <p className="text-sm leading-relaxed text-muted">
          {t('hazard.droughtEffect', {
            people: effects.affectedMillions.toFixed(1),
            crop: Math.round(effects.cropLoss),
          })}
        </p>
        <Button
          variant="danger"
          disabled={inDrought}
          onClick={() => {
            setDroughtResult(startDrought(region.id, level))
            select(region.id)
          }}
        >
          {inDrought
            ? t('hazard.droughtActive', { name })
            : t('hazard.droughtTrigger', { name })}
        </Button>
        <StatusMessage
          message={pick(droughtResult.message)}
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
                  {siteName(d.regionId, locale)} · {severityLabel(d.severity)}
                </span>
                <span className="text-warn">
                  {t('hazard.until', {
                    year: decimalYearToDate(
                      d.year + d.durationYears,
                    ).getUTCFullYear(),
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
