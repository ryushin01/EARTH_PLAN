import { useState } from 'react'
import { FAULTS } from '../../model/site/data'
import {
  EMPTY_TEXT,
  nameList,
  regionName,
  siteName,
  siteNote,
} from '../../model/text'
import {
  quakeImpacts,
  quakeSevereRadiusKm,
  quakeStrongRadiusKm,
} from '../../model/world/hazards'
import { useWorld } from '../../model/world/store'
import { useT } from '../i18n'
import { Button, RangeField, SelectField, StatusMessage } from '@/shared/ui'
import { formatNumber } from '@/shared/lib'

const OUTCOME_STYLE = {
  severe: 'text-danger',
  moderate: 'text-warn',
  reduced: 'text-accent',
} as const

export function QuakePanel() {
  const { t, pick, locale } = useT()
  const selectedSiteId = useWorld((s) => s.selectedSiteId)
  const structures = useWorld((s) => s.structures)
  const year = useWorld((s) => s.year)
  const quakes = useWorld((s) => s.quakes)
  const select = useWorld((s) => s.select)
  const triggerQuake = useWorld((s) => s.triggerQuake)

  const [faultId, setFaultId] = useState(FAULTS[0].id)
  const [magnitude, setMagnitude] = useState(7)
  const [result, setResult] = useState({ message: EMPTY_TEXT, ok: true })

  const fault =
    FAULTS.find((f) => f.id === selectedSiteId) ??
    FAULTS.find((f) => f.id === faultId) ??
    FAULTS[0]
  const preview = quakeImpacts(fault, magnitude, structures, year)
  const latest = quakes.at(-1)

  return (
    <div className="grid gap-5">
      <SelectField
        label={t('quake.fault')}
        value={fault.id}
        onChange={(id) => {
          setFaultId(id)
          select(id)
        }}
        options={FAULTS.map((f) => ({
          value: f.id,
          label: siteName(f, locale),
          group: regionName(f.region, locale),
        }))}
        description={t('quake.note', {
          note: siteNote(fault, locale),
          m: fault.historicMagnitude,
        })}
      />
      <RangeField
        label={t('quake.magnitude')}
        min={5.5}
        max={8.5}
        step={0.1}
        value={magnitude}
        onChange={setMagnitude}
        valueText={t('common.magnitude', { m: magnitude.toFixed(1) })}
        description={t('quake.help')}
      />
      <div className="rounded-xs border border-line p-3 text-sm leading-relaxed">
        <p>
          {t('quake.severeRadius')}{' '}
          <strong className="display-num">
            {formatNumber(quakeSevereRadiusKm(magnitude), 0)}km
          </strong>{' '}
          · {t('quake.strongRadius')}{' '}
          <strong className="display-num">
            {formatNumber(quakeStrongRadiusKm(magnitude), 0)}km
          </strong>
        </p>
        <p className="text-muted">
          {preview.length
            ? t('common.affectedCities', {
                list: nameList(
                  preview.map((i) => i.cityId),
                  locale,
                ),
              })
            : t('quake.noCities')}
        </p>
      </div>
      <Button
        variant="danger"
        onClick={() => {
          setResult(triggerQuake(fault.id, magnitude))
          select(fault.id)
        }}
      >
        {t('quake.trigger', { name: siteName(fault, locale) })}
      </Button>
      <StatusMessage
        message={pick(result.message)}
        tone={result.ok ? 'info' : 'error'}
      />
      {latest?.impacts.length ? (
        <section aria-labelledby="quake-impacts" className="grid gap-2">
          <h3 id="quake-impacts" className="label-caps">
            {t('quake.latest')}
          </h3>
          <ul className="grid gap-1 text-sm">
            {latest.impacts.map((impact) => (
              <li
                key={impact.cityId}
                className="flex justify-between gap-2 border-t border-line py-1.5"
              >
                <span>
                  {siteName(impact.cityId, locale)}{' '}
                  <span className="text-xs text-muted">
                    {t('quake.distance', {
                      km: formatNumber(impact.distanceKm, 0),
                    })}
                  </span>
                </span>
                <span
                  className={`font-semibold ${OUTCOME_STYLE[impact.outcome]}`}
                >
                  {t(`quake.outcome.${impact.outcome}`)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
