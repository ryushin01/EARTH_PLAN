import { useState } from 'react'
import { CITIES, OCEANS, REGIONS } from '../../model/site/data'
import { EMPTY_TEXT, regionName, siteName } from '../../model/text'
import {
  blastRadiusKm,
  deflectedDiameter,
  impactEnergyMt,
  impactPeakCooling,
  thermalRadiusKm,
} from '../../model/world/hazards'
import { formatDiameter, formatEnergy, useWorld } from '../../model/world/store'
import { useT } from '../i18n'
import { Button, RangeField, SelectField, StatusMessage } from '@/shared/ui'
import { formatNumber } from '@/shared/lib'

const SIZES = [50, 140, 340, 1000, 5000, 10000] as const

export function AsteroidPanel() {
  const { t, pick, locale } = useT()
  const selectedSiteId = useWorld((s) => s.selectedSiteId)
  const structures = useWorld((s) => s.structures)
  const year = useWorld((s) => s.year)
  const select = useWorld((s) => s.select)
  const triggerImpact = useWorld((s) => s.triggerImpact)

  const [targetId, setTargetId] = useState(OCEANS[0].id)
  const [sizeIndex, setSizeIndex] = useState(3)
  const [result, setResult] = useState({ message: EMPTY_TEXT, ok: true })

  const options = [
    ...OCEANS.map((o) => ({
      value: o.id,
      label: siteName(o, locale),
      group: t('kind.ocean'),
    })),
    ...REGIONS.map((r) => ({
      value: r.id,
      label: siteName(r, locale),
      group: t('kind.region'),
    })),
    ...CITIES.map((c) => ({
      value: c.id,
      label: siteName(c, locale),
      group: `${t('kind.city')} · ${regionName(c.region, locale)}`,
    })),
  ]
  const current = options.some((o) => o.value === selectedSiteId)
    ? (selectedSiteId as string)
    : targetId
  const target = options.find((o) => o.value === current) ?? options[0]
  const diameter = SIZES[sizeIndex]
  const effective = deflectedDiameter(diameter, structures, year)
  const energy = impactEnergyMt(effective)
  const cooling = impactPeakCooling(effective)

  return (
    <div className="grid gap-5">
      <SelectField
        label={t('asteroid.target')}
        value={target.value}
        onChange={(id) => {
          setTargetId(id)
          select(id)
        }}
        options={options}
        description={t('asteroid.targetHelp')}
      />
      <RangeField
        label={t('asteroid.diameter')}
        min={0}
        max={SIZES.length - 1}
        step={1}
        value={sizeIndex}
        onChange={setSizeIndex}
        valueText={formatDiameter(diameter, locale)}
        description={`${t(`asteroid.size${diameter}`)}. ${t('asteroid.assume')}`}
      />
      <div className="rounded-xs border border-line p-3 text-sm leading-relaxed">
        {effective === 0 ? (
          <p className="text-accent">{t('asteroid.deflected')}</p>
        ) : (
          <>
            <p>
              {t('asteroid.energy')}{' '}
              <strong className="display-num">
                {formatEnergy(energy, locale)}
              </strong>
              {effective < diameter
                ? ` ${t('asteroid.intercepted', { size: formatDiameter(effective, locale) })}`
                : ''}
            </p>
            <p className="text-muted">
              {t('asteroid.radii', {
                blast: formatNumber(blastRadiusKm(energy), 0),
                thermal: formatNumber(thermalRadiusKm(energy), 0),
              })}
              {cooling > 0
                ? ` · ${t('asteroid.winter', { c: cooling.toFixed(1) })}`
                : ''}
            </p>
          </>
        )}
      </div>
      <Button
        variant="danger"
        onClick={() => {
          setResult(triggerImpact(target.value, diameter))
          select(target.value)
        }}
      >
        {t('asteroid.trigger', { name: target.label })}
      </Button>
      <StatusMessage
        message={pick(result.message)}
        tone={result.ok ? 'info' : 'error'}
      />
    </div>
  )
}
