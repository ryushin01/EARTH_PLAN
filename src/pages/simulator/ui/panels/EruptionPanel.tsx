import { useState } from 'react'
import { VOLCANOES } from '../../model/site/data'
import {
  ashRadiusKm,
  citiesWithin,
  effectiveVei,
} from '../../model/world/engine'
import { useWorld } from '../../model/world/store'
import { Button, RangeField, SelectField, StatusMessage } from '@/shared/ui'

const VEI_EXAMPLE: Record<number, string> = {
  4: '대규모 · 2010년 에이야퍄들라이외퀴들',
  5: '거대 · 1980년 세인트헬렌스',
  6: '초대형 · 1991년 피나투보',
  7: '초거대 · 1815년 탐보라',
  8: '초화산 · 7만 4천 년 전 토바',
}

export function EruptionPanel() {
  const selectedSiteId = useWorld((s) => s.selectedSiteId)
  const structures = useWorld((s) => s.structures)
  const year = useWorld((s) => s.year)
  const select = useWorld((s) => s.select)
  const triggerEruption = useWorld((s) => s.triggerEruption)

  const [volcanoId, setVolcanoId] = useState(VOLCANOES[0].id)
  const [vei, setVei] = useState(6)
  const [result, setResult] = useState({ message: '', ok: true })

  // 지구에서 화산을 고르면 따라감
  const current =
    VOLCANOES.find((v) => v.id === selectedSiteId)?.id ?? volcanoId
  const volcano = VOLCANOES.find((v) => v.id === current) ?? VOLCANOES[0]
  const effective = effectiveVei(volcano.id, vei, structures, year)
  const radius = ashRadiusKm(effective)
  const nearby = citiesWithin(volcano, radius)

  return (
    <div className="grid gap-5">
      <SelectField
        label="화산"
        value={volcano.id}
        onChange={(id) => {
          setVolcanoId(id)
          select(id)
        }}
        options={VOLCANOES.map((v) => ({
          value: v.id,
          label: v.name,
          group: v.region,
        }))}
        description={`${volcano.note} · 기록상 최대 VEI ${volcano.historicVei}`}
      />
      <RangeField
        label="분화 규모 (화산폭발지수)"
        min={4}
        max={8}
        step={1}
        value={vei}
        onChange={setVei}
        valueText={`VEI ${vei}`}
        description={`${VEI_EXAMPLE[vei]}. VEI가 1 오를 때마다 분출물이 약 10배 늘어납니다. VEI 6 이상은 성층권에 황산 에어로졸을 올려 지구 기온을 몇 년 동안 낮춥니다.`}
      />
      <div className="rounded-xs border border-line p-3 text-sm leading-relaxed">
        <p>
          화산재 반경{' '}
          <strong className="display-num">
            {radius.toLocaleString('ko-KR')}km
          </strong>
          {effective < vei ? ` (감압 시추로 VEI ${effective})` : ''}
        </p>
        <p className="text-muted">
          {nearby.length
            ? `영향 도시: ${nearby.map((c) => c.name).join(', ')}`
            : '반경 안에 주요 도시가 없습니다.'}
        </p>
      </div>
      <Button
        variant="danger"
        onClick={() => {
          const r = triggerEruption(volcano.id, vei)
          setResult(r)
          select(volcano.id)
        }}
      >
        {volcano.name} 분화 시키기
      </Button>
      <StatusMessage
        message={result.message}
        tone={result.ok ? 'info' : 'error'}
      />
    </div>
  )
}
