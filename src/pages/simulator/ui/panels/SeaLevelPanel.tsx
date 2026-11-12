import { useShallow } from 'zustand/react/shallow'
import { CITIES } from '../../model/site/data'
import { SCENARIOS, baselineSeaLevel } from '../../model/world/scenario'
import { cityStates, summarize } from '../../model/world/selectors'
import { useWorld } from '../../model/world/store'
import type { CityState } from '../../model/world/types'
import type { ScenarioId } from '../../model/world/scenario'
import { formatNumber } from '@/shared/lib'
import { Button, ChoiceGroup, RangeField } from '@/shared/ui'

const PRESETS = [
  { label: '그린란드 빙상 전부', meters: 7.4 },
  { label: '남극 서부 빙상', meters: 3.3 },
  { label: '남극 빙상 전부', meters: 58 },
  { label: '지구의 모든 빙하', meters: 70 },
]

const STATE_LABEL: Record<CityState, string> = {
  safe: '안전',
  'at-risk': '위험',
  protected: '보호 중',
  flooded: '침수',
}

const STATE_STYLE: Record<CityState, string> = {
  safe: 'text-muted',
  'at-risk': 'text-warn',
  protected: 'text-accent',
  flooded: 'text-danger',
}

export function SeaLevelPanel() {
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

  return (
    <div className="grid gap-6">
      <ChoiceGroup<ScenarioId>
        legend="온실가스 배출 시나리오"
        value={scenario}
        onChange={setScenario}
        columns={2}
        choices={Object.values(SCENARIOS).map((s) => ({
          value: s.id,
          label: s.label,
          hint: `${s.code} · 2100년 +${s.rise2100}m`,
        }))}
      />

      <RangeField
        label="해수면 (2020년 대비)"
        min={0}
        max={80}
        step={0.1}
        value={Math.round(seaLevel * 10) / 10}
        onChange={setSeaLevel}
        valueText={`+${formatNumber(seaLevel, 2)} m`}
        description="재생하면 시나리오 속도대로 오르고, 직접 옮겨 극단적인 상황도 볼 수 있습니다. 고도 자료: NOAA ETOPO1."
      />

      <div className="grid gap-2">
        <h3 className="label-caps">빙상이 녹으면</h3>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            size="sm"
            onClick={() =>
              setSeaLevel(baselineSeaLevel(2100, SCENARIOS[scenario]))
            }
          >
            2100년 ({SCENARIOS[scenario].label})
          </Button>
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              size="sm"
              onClick={() => setSeaLevel(preset.meters)}
            >
              {preset.label} +{preset.meters}m
            </Button>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xs border border-line bg-line">
        <div className="bg-panel-solid p-3">
          <dt className="label-caps">새로 잠긴 육지</dt>
          <dd className="display-num text-xl">
            {summary.floodedAreaKm2 === null
              ? '계산 중'
              : `${formatNumber(summary.floodedAreaKm2 / 1000, 0)}천 km²`}
          </dd>
        </div>
        <div className="bg-panel-solid p-3">
          <dt className="label-caps">상승 속도</dt>
          <dd className="display-num text-xl">
            {formatNumber(summary.riseRateMmPerYear, 1)} mm/년
          </dd>
        </div>
      </dl>

      <section aria-labelledby="sea-cities" className="grid gap-2">
        <h3 id="sea-cities" className="label-caps">
          영향받는 도시 {watched.length}곳
        </h3>
        {watched.length === 0 ? (
          <p className="text-sm text-muted">
            아직 잠기거나 위험한 주요 도시가 없습니다.
          </p>
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
                    {city.name}{' '}
                    <span className="text-xs text-muted">
                      고도 약 {city.elevation}m
                    </span>
                  </span>
                  <span
                    className={`text-xs font-semibold ${STATE_STYLE[states[city.id]]}`}
                  >
                    {STATE_LABEL[states[city.id]]}
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
