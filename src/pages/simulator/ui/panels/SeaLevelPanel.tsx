import { useShallow } from 'zustand/react/shallow'
import { CITIES } from '../../model/site/data'
import { siteName } from '../../model/text'
import { SCENARIOS, baselineSeaLevel } from '../../model/world/scenario'
import { cityStates, summarize } from '../../model/world/selectors'
import { useWorld } from '../../model/world/store'
import type { CityState } from '../../model/world/types'
import type { ScenarioId } from '../../model/world/scenario'
import { useT } from '../i18n'
import { formatNumber } from '@/shared/lib'
import { Button, ChoiceGroup, RangeField } from '@/shared/ui'

const PRESETS = [
  { label: 'sea.preset.greenland', meters: 7.4 },
  { label: 'sea.preset.westAntarctica', meters: 3.3 },
  { label: 'sea.preset.antarctica', meters: 58 },
  { label: 'sea.preset.all', meters: 70 },
] as const

const STATE_STYLE: Record<CityState, string> = {
  safe: 'text-muted',
  'at-risk': 'text-warn',
  protected: 'text-accent',
  flooded: 'text-danger',
}

export function SeaLevelPanel() {
  const { t, locale } = useT()
  const scenario = useWorld((s) => s.scenario)
  const seaLevel = useWorld((s) => s.seaLevel)
  const year = useWorld((s) => s.year)
  const structures = useWorld((s) => s.structures)
  const setScenario = useWorld((s) => s.setScenario)
  const setSeaLevel = useWorld((s) => s.setSeaLevel)
  const select = useWorld((s) => s.select)

  const summary = useWorld(useShallow(summarize))
  const states = cityStates({ seaLevel, structures, year })
  const watched = CITIES.filter((c) => states[c.id] !== 'safe').sort(
    (a, b) => a.elevation - b.elevation,
  )
  const scenarioLabel = (id: ScenarioId) =>
    locale === 'en' ? SCENARIOS[id].labelEn : SCENARIOS[id].label

  return (
    <div className="grid gap-6">
      <ChoiceGroup<ScenarioId>
        legend={t('sea.scenario')}
        value={scenario}
        onChange={setScenario}
        columns={2}
        choices={Object.values(SCENARIOS).map((s) => ({
          value: s.id,
          label: scenarioLabel(s.id),
          hint: t('sea.scenarioHint', { code: s.code, rise: s.rise2100 }),
        }))}
      />

      <RangeField
        label={t('sea.level')}
        min={0}
        max={80}
        step={0.1}
        value={Math.round(seaLevel * 10) / 10}
        onChange={setSeaLevel}
        valueText={`+${formatNumber(seaLevel, 2)} m`}
        description={t('sea.levelHelp')}
      />

      <div className="grid gap-2">
        <h3 className="label-caps">{t('sea.ifMelts')}</h3>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            size="sm"
            onClick={() =>
              setSeaLevel(baselineSeaLevel(2100, SCENARIOS[scenario]))
            }
          >
            {t('sea.preset.2100', { scenario: scenarioLabel(scenario) })}
          </Button>
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              size="sm"
              onClick={() => setSeaLevel(preset.meters)}
            >
              {t(preset.label)} +{preset.meters}m
            </Button>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xs border border-line bg-line">
        <div className="bg-panel-solid p-3">
          <dt className="label-caps">{t('sea.newlyFlooded')}</dt>
          <dd className="display-num text-xl">
            {summary.floodedAreaKm2 === null
              ? t('sea.calculating')
              : t('sea.area', {
                  area: formatNumber(summary.floodedAreaKm2 / 1000, 0),
                })}
          </dd>
        </div>
        <div className="bg-panel-solid p-3">
          <dt className="label-caps">{t('sea.rate')}</dt>
          <dd className="display-num text-xl">
            {t('sea.rateValue', {
              rate: formatNumber(summary.riseRateMmPerYear, 1),
            })}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="sea-cities" className="grid gap-2">
        <h3 id="sea-cities" className="label-caps">
          {t('sea.affected', { count: watched.length })}
        </h3>
        {watched.length === 0 ? (
          <p className="text-sm text-muted">{t('sea.noneAffected')}</p>
        ) : (
          <ul className="grid max-h-56 gap-1 overflow-y-auto pr-1">
            {watched.map((city) => (
              <li key={city.id}>
                <button
                  type="button"
                  onClick={() => select(city.id)}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xs border border-line px-3 text-left text-sm hover:border-line-strong"
                >
                  <span>
                    {siteName(city, locale)}{' '}
                    <span className="text-xs text-muted">
                      {t('sea.elevation', { m: city.elevation })}
                    </span>
                  </span>
                  <span
                    className={`text-xs font-semibold ${STATE_STYLE[states[city.id]]}`}
                  >
                    {t(`city.${states[city.id]}`)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
