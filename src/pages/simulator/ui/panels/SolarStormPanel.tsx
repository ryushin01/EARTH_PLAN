import { useState } from 'react'
import { EMPTY_TEXT, siteName } from '../../model/text'
import {
  SOLAR_LEVELS,
  SOLAR_SPEC,
  solarStormImpacts,
} from '../../model/world/hazards'
import type { SolarLevel } from '../../model/world/types'
import { isActive } from '../../model/structure/types'
import { useWorldSampled } from '../../model/world/sampled'
import { useT } from '../i18n'
import { Button, ChoiceGroup, StatusMessage } from '@/shared/ui'

const OUTCOME_STYLE = {
  damaged: 'text-danger',
  outage: 'text-warn',
  protected: 'text-accent',
} as const

/** 태양 폭풍(코로나 질량 방출): 오로라와 고위도 전력망·위성 피해 */
export function SolarStormPanel() {
  const { t, pick, locale } = useT()
  const structures = useWorldSampled((s) => s.structures)
  const year = useWorldSampled((s) => s.year)
  const solarStorms = useWorldSampled((s) => s.solarStorms)
  const triggerSolarStorm = useWorldSampled((s) => s.triggerSolarStorm)

  const [level, setLevel] = useState<SolarLevel>('g5')
  const [result, setResult] = useState({ message: EMPTY_TEXT, ok: true })

  const preview = solarStormImpacts(level, structures, year)
  const dark = preview.impacts.filter((i) => i.outcome !== 'protected')
  const damaged = preview.impacts.filter((i) => i.outcome === 'damaged')
  const shielded = preview.impacts.some((i) => i.outcome === 'protected')
  const latest = solarStorms.at(-1)

  return (
    <div className="grid gap-5">
      <ChoiceGroup<SolarLevel>
        legend={t('solar.level')}
        value={level}
        onChange={setLevel}
        columns={2}
        choices={SOLAR_LEVELS.map((value) => ({
          value,
          label: t(`solar.${value}`),
          hint: t('solar.hint', { lat: SOLAR_SPEC[value].auroraLat }),
        }))}
      />
      <p className="-mt-3 text-xs leading-relaxed text-muted">
        {t('solar.levelHelp')} {t('solar.explain')}
      </p>
      <div className="rounded-xs border border-line p-3 text-sm leading-relaxed">
        <p>
          {dark.length ? (
            <>
              <strong className="display-num">
                {t('solar.blackout', { n: dark.length })}
              </strong>
              {damaged.length
                ? ` · ${t('solar.damage', { n: damaged.length })}`
                : ''}
            </>
          ) : (
            t('solar.noCities')
          )}
          {preview.satellitesLost
            ? ` · ${t('solar.satellites', { n: preview.satellitesLost })}`
            : ''}
        </p>
        {shielded ||
        structures.some(
          (s) => s.kind === 'space-weather-shield' && isActive(s, year),
        ) ? (
          <p className="text-accent">{t('solar.shielded')}</p>
        ) : null}
      </div>
      <Button
        variant="danger"
        onClick={() => setResult(triggerSolarStorm(level))}
      >
        {t('solar.trigger')}
      </Button>
      <StatusMessage
        message={pick(result.message)}
        tone={result.ok ? 'info' : 'error'}
      />
      {latest?.impacts.length ? (
        <section aria-labelledby="solar-impacts" className="grid gap-2">
          <h3 id="solar-impacts" className="label-caps">
            {t('solar.latest')}
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
                    {t('solar.magLat', {
                      lat: Math.round(Math.abs(impact.magLat)),
                    })}
                  </span>
                </span>
                <span
                  className={`font-semibold ${OUTCOME_STYLE[impact.outcome]}`}
                >
                  {t(`solar.outcome.${impact.outcome}`)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
