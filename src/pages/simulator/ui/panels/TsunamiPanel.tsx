import { useState } from 'react'
import { TRENCHES } from '../../model/site/data'
import { EMPTY_TEXT, regionName, siteName, siteNote } from '../../model/text'
import { useWorld } from '../../model/world/store'
import { useT } from '../i18n'
import { Button, RangeField, SelectField, StatusMessage } from '@/shared/ui'
import { formatNumber } from '@/shared/lib'

const OUTCOME_STYLE = {
  hit: 'text-danger',
  minor: 'text-warn',
  blocked: 'text-accent',
} as const

export function TsunamiPanel() {
  const { t, pick, locale } = useT()
  const selectedSiteId = useWorld((s) => s.selectedSiteId)
  const tsunamis = useWorld((s) => s.tsunamis)
  const select = useWorld((s) => s.select)
  const triggerTsunami = useWorld((s) => s.triggerTsunami)

  const [trenchId, setTrenchId] = useState(TRENCHES[0].id)
  const [magnitude, setMagnitude] = useState(9)
  const [result, setResult] = useState({ message: EMPTY_TEXT, ok: true })

  const current =
    TRENCHES.find((tr) => tr.id === selectedSiteId)?.id ?? trenchId
  const trench = TRENCHES.find((tr) => tr.id === current) ?? TRENCHES[0]
  const latest = tsunamis.at(-1)

  return (
    <div className="grid gap-5">
      <SelectField
        label={t('tsunami.source')}
        value={trench.id}
        onChange={(id) => {
          setTrenchId(id)
          select(id)
        }}
        options={TRENCHES.map((tr) => ({
          value: tr.id,
          label: siteName(tr, locale),
          group: regionName(tr.region, locale),
        }))}
        description={t('tsunami.note', {
          note: siteNote(trench, locale),
          m: trench.historicMagnitude,
        })}
      />
      <RangeField
        label={t('tsunami.magnitude')}
        min={7.5}
        max={9.5}
        step={0.1}
        value={magnitude}
        onChange={setMagnitude}
        valueText={t('common.magnitude', { m: magnitude.toFixed(1) })}
        description={t('tsunami.help')}
      />
      <Button
        variant="danger"
        onClick={() => {
          setResult(triggerTsunami(trench.id, magnitude))
          select(trench.id)
        }}
      >
        {t('tsunami.trigger', { name: siteName(trench, locale) })}
      </Button>
      <StatusMessage
        message={pick(result.message)}
        tone={result.ok ? 'info' : 'error'}
      />
      {latest ? (
        <section aria-labelledby="tsunami-impacts" className="grid gap-2">
          <h3 id="tsunami-impacts" className="label-caps">
            {t('tsunami.latest')}
          </h3>
          <div
            className="max-h-56 overflow-y-auto"
            tabIndex={0}
            role="region"
            aria-labelledby="tsunami-impacts"
          >
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{t('tsunami.caption')}</caption>
              <thead className="label-caps">
                <tr>
                  <th scope="col" className="py-1 font-semibold">
                    {t('tsunami.col.city')}
                  </th>
                  <th scope="col" className="py-1 font-semibold">
                    {t('tsunami.col.arrival')}
                  </th>
                  <th scope="col" className="py-1 font-semibold">
                    {t('tsunami.col.height')}
                  </th>
                  <th scope="col" className="py-1 font-semibold">
                    {t('tsunami.col.result')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {latest.impacts.map((impact) => (
                  <tr key={impact.cityId} className="border-t border-line">
                    <th scope="row" className="py-1.5 font-normal">
                      {siteName(impact.cityId, locale)}
                    </th>
                    <td className="display-num">
                      {t('tsunami.hours', {
                        h: formatNumber(impact.arrivalHours, 1),
                      })}
                    </td>
                    <td className="display-num">
                      {formatNumber(impact.waveHeight, 1)}m
                    </td>
                    <td
                      className={`font-semibold ${OUTCOME_STYLE[impact.outcome]}`}
                    >
                      {t(`tsunami.outcome.${impact.outcome}`)}
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
