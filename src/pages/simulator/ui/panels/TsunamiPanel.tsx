import { useState } from 'react'
import { TRENCHES, getSite } from '../../model/site/data'
import { useWorld } from '../../model/world/store'
import { Button, RangeField, SelectField, StatusMessage } from '@/shared/ui'
import { formatNumber } from '@/shared/lib'

const OUTCOME_LABEL = {
  hit: '큰 피해',
  minor: '경미',
  blocked: '방벽이 막음',
} as const
const OUTCOME_STYLE = {
  hit: 'text-danger',
  minor: 'text-warn',
  blocked: 'text-accent',
} as const

export function TsunamiPanel() {
  const selectedSiteId = useWorld((s) => s.selectedSiteId)
  const tsunamis = useWorld((s) => s.tsunamis)
  const select = useWorld((s) => s.select)
  const triggerTsunami = useWorld((s) => s.triggerTsunami)

  const [sourceId, setTrenchId] = useState(TRENCHES[0].id)
  const [magnitude, setMagnitude] = useState(9)
  const [result, setResult] = useState({ message: '', ok: true })

  const current = TRENCHES.find((t) => t.id === selectedSiteId)?.id ?? sourceId
  const trench = TRENCHES.find((t) => t.id === current) ?? TRENCHES[0]
  const latest = tsunamis.at(-1)

  return (
    <div className="grid gap-5">
      <SelectField
        label="진원 (섭입대)"
        value={trench.id}
        onChange={(id) => {
          setTrenchId(id)
          select(id)
        }}
        options={TRENCHES.map((t) => ({
          value: t.id,
          label: t.name,
          group: t.region,
        }))}
        description={`${trench.note} · 기록상 최대 규모 ${trench.historicMagnitude}`}
      />
      <RangeField
        label="지진 규모 (Mw)"
        min={7.5}
        max={9.5}
        step={0.1}
        value={magnitude}
        onChange={setMagnitude}
        valueText={`규모 ${magnitude.toFixed(1)}`}
        description="쓰나미는 시속 약 700km로 퍼집니다. 화면에서는 1초가 1시간입니다. 같은 바다에 접한 도시만 계산합니다."
      />
      <Button
        variant="danger"
        onClick={() => {
          setResult(triggerTsunami(trench.id, magnitude))
          select(trench.id)
        }}
      >
        {trench.name} 지진 일으키기
      </Button>
      <StatusMessage
        message={result.message}
        tone={result.ok ? 'info' : 'error'}
      />
      {latest ? (
        <section aria-labelledby="tsunami-impacts" className="grid gap-2">
          <h3 id="tsunami-impacts" className="label-caps">
            최근 쓰나미 도달 예상
          </h3>
          <div
            className="max-h-56 overflow-y-auto"
            tabIndex={0}
            role="region"
            aria-labelledby="tsunami-impacts"
          >
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                도시별 쓰나미 도달 시간, 파고, 결과
              </caption>
              <thead className="label-caps">
                <tr>
                  <th scope="col" className="py-1 font-semibold">
                    도시
                  </th>
                  <th scope="col" className="py-1 font-semibold">
                    도달
                  </th>
                  <th scope="col" className="py-1 font-semibold">
                    파고
                  </th>
                  <th scope="col" className="py-1 font-semibold">
                    결과
                  </th>
                </tr>
              </thead>
              <tbody>
                {latest.impacts.map((impact) => (
                  <tr key={impact.cityId} className="border-t border-line">
                    <th scope="row" className="py-1.5 font-normal">
                      {getSite(impact.cityId)?.name}
                    </th>
                    <td className="display-num">
                      {formatNumber(impact.arrivalHours, 1)}시간
                    </td>
                    <td className="display-num">
                      {formatNumber(impact.waveHeight, 1)}m
                    </td>
                    <td
                      className={`font-semibold ${OUTCOME_STYLE[impact.outcome]}`}
                    >
                      {OUTCOME_LABEL[impact.outcome]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
