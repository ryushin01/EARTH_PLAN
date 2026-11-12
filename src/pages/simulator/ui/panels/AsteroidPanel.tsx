import { useState } from 'react'
import { CITIES, OCEANS, REGIONS } from '../../model/site/data'
import {
  blastRadiusKm,
  deflectedDiameter,
  impactEnergyMt,
  impactPeakCooling,
  thermalRadiusKm,
} from '../../model/world/hazards'
import { formatDiameter, formatEnergy, useWorld } from '../../model/world/store'
import { Button, RangeField, SelectField, StatusMessage } from '@/shared/ui'

const SIZES = [
  { diameterM: 50, example: '1908년 퉁구스카 (숲 2,000km² 쓰러짐)' },
  { diameterM: 140, example: 'NASA가 추적하는 "도시 파괴급" 기준' },
  { diameterM: 340, example: '아포피스 크기, 2029년 지구 근접 통과' },
  { diameterM: 1000, example: '문명을 흔드는 규모, 충돌 겨울 시작' },
  { diameterM: 5000, example: '대륙 규모 피해' },
  { diameterM: 10000, example: '6,600만 년 전 칙술루브, 공룡 멸종' },
]

const TARGET_OPTIONS = [
  ...OCEANS.map((o) => ({ value: o.id, label: o.name, group: '바다' })),
  ...REGIONS.map((r) => ({ value: r.id, label: r.name, group: '지역' })),
  ...CITIES.map((c) => ({
    value: c.id,
    label: c.name,
    group: `도시 · ${c.region}`,
  })),
]

export function AsteroidPanel() {
  const selectedSiteId = useWorld((s) => s.selectedSiteId)
  const structures = useWorld((s) => s.structures)
  const year = useWorld((s) => s.year)
  const select = useWorld((s) => s.select)
  const triggerImpact = useWorld((s) => s.triggerImpact)

  const [targetId, setTargetId] = useState(OCEANS[0].id)
  const [sizeIndex, setSizeIndex] = useState(3)
  const [result, setResult] = useState({ message: '', ok: true })

  const current = TARGET_OPTIONS.some((o) => o.value === selectedSiteId)
    ? (selectedSiteId as string)
    : targetId
  const target =
    TARGET_OPTIONS.find((o) => o.value === current) ?? TARGET_OPTIONS[0]
  const size = SIZES[sizeIndex]
  const effective = deflectedDiameter(size.diameterM, structures, year)
  const energy = impactEnergyMt(effective)
  const cooling = impactPeakCooling(effective)

  return (
    <div className="grid gap-5">
      <SelectField
        label="충돌 지점"
        value={target.value}
        onChange={(id) => {
          setTargetId(id)
          select(id)
        }}
        options={TARGET_OPTIONS}
        description="바다에 떨어지면 거대한 쓰나미가 생깁니다."
      />
      <RangeField
        label="소행성 지름"
        min={0}
        max={SIZES.length - 1}
        step={1}
        value={sizeIndex}
        onChange={setSizeIndex}
        valueText={formatDiameter(size.diameterM)}
        description={`${size.example}. 암석질, 초속 20km로 가정합니다.`}
      />
      <div className="rounded-xs border border-line p-3 text-sm leading-relaxed">
        {effective === 0 ? (
          <p className="text-accent">
            행성 방위 요격망이 이 소행성을 빗나가게 합니다.
          </p>
        ) : (
          <>
            <p>
              에너지 약{' '}
              <strong className="display-num">{formatEnergy(energy)}</strong>
              {effective < size.diameterM
                ? ` (요격으로 ${formatDiameter(effective)})`
                : ''}
            </p>
            <p className="text-muted">
              폭풍 반경{' '}
              {Math.round(blastRadiusKm(energy)).toLocaleString('ko-KR')}km ·
              열복사 반경{' '}
              {Math.round(thermalRadiusKm(energy)).toLocaleString('ko-KR')}km
              {cooling > 0 ? ` · 충돌 겨울 최대 −${cooling.toFixed(1)}°C` : ''}
            </p>
          </>
        )}
      </div>
      <Button
        variant="danger"
        onClick={() => {
          setResult(triggerImpact(target.value, size.diameterM))
          select(target.value)
        }}
      >
        {target.label}에 충돌시키기
      </Button>
      <StatusMessage
        message={result.message}
        tone={result.ok ? 'info' : 'error'}
      />
    </div>
  )
}
