import { useState } from 'react'
import { VOLCANOES } from '../../model/site/data'
import {
  EMPTY_TEXT,
  nameList,
  siteName,
  siteNote,
  regionName,
} from '../../model/text'
import {
  ashRadiusKm,
  citiesWithin,
  effectiveVei,
} from '../../model/world/engine'
import { useWorld } from '../../model/world/store'
import { useT } from '../i18n'
import { Button, RangeField, SelectField, StatusMessage } from '@/shared/ui'

export function EruptionPanel() {
  const { t, pick, locale } = useT()
  const selectedSiteId = useWorld((s) => s.selectedSiteId)
  const structures = useWorld((s) => s.structures)
  const year = useWorld((s) => s.year)
  const select = useWorld((s) => s.select)
  const triggerEruption = useWorld((s) => s.triggerEruption)

  const [volcanoId, setVolcanoId] = useState(VOLCANOES[0].id)
  const [vei, setVei] = useState(6)
  const [result, setResult] = useState({ message: EMPTY_TEXT, ok: true })

  // 지구에서 화산을 고르면 따라감
  const current =
    VOLCANOES.find((v) => v.id === selectedSiteId)?.id ?? volcanoId
  const volcano = VOLCANOES.find((v) => v.id === current) ?? VOLCANOES[0]
  const effective = effectiveVei(volcano.id, vei, structures, year)
  const radius = ashRadiusKm(effective)
  const nearby = citiesWithin(volcano, radius)
  const name = siteName(volcano, locale)

  return (
    <div className="grid gap-5">
      <SelectField
        label={t('volcano.label')}
        value={volcano.id}
        onChange={(id) => {
          setVolcanoId(id)
          select(id)
        }}
        options={VOLCANOES.map((v) => ({
          value: v.id,
          label: siteName(v, locale),
          group: regionName(v.region, locale),
        }))}
        description={t('volcano.note', {
          note: siteNote(volcano, locale),
          vei: volcano.historicVei,
        })}
      />
      <RangeField
        label={t('volcano.vei')}
        min={4}
        max={8}
        step={1}
        value={vei}
        onChange={setVei}
        valueText={`VEI ${vei}`}
        description={`${t(`volcano.vei${vei as 4 | 5 | 6 | 7 | 8}`)}. ${t('volcano.veiHelp')}`}
      />
      <div className="rounded-xs border border-line p-3 text-sm leading-relaxed">
        <p>
          {t('volcano.ashRadius')}{' '}
          <strong className="display-num">
            {radius.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US')}km
          </strong>
          {effective < vei
            ? ` ${t('volcano.reduced', { vei: effective })}`
            : ''}
        </p>
        <p className="text-muted">
          {nearby.length
            ? t('common.affectedCities', {
                list: nameList(
                  nearby.map((c) => c.id),
                  locale,
                ),
              })
            : t('volcano.noCities')}
        </p>
      </div>
      <Button
        variant="danger"
        onClick={() => {
          setResult(triggerEruption(volcano.id, vei))
          select(volcano.id)
        }}
      >
        {t('volcano.trigger', { name })}
      </Button>
      <StatusMessage
        message={pick(result.message)}
        tone={result.ok ? 'info' : 'error'}
      />
    </div>
  )
}
