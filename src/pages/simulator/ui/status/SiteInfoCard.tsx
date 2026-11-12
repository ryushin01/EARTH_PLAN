import { getSite } from '../../model/site/data'
import { structureName } from '../../model/structure/catalog'
import { nameList, regionName, siteName, siteNote } from '../../model/text'
import { isInDrought } from '../../model/world/hazards'
import { cityStates } from '../../model/world/selectors'
import { useWorld } from '../../model/world/store'
import { useT } from '../i18n'
import { decimalYearToDate } from '@/shared/lib'
import { Button } from '@/shared/ui'

/** 선택한 지점의 정보와 그곳에 지은 구조물 */
export function SiteInfoCard() {
  const { t, locale } = useT()
  const selectedSiteId = useWorld((s) => s.selectedSiteId)
  const structures = useWorld((s) => s.structures)
  const seaLevel = useWorld((s) => s.seaLevel)
  const year = useWorld((s) => s.year)
  const droughts = useWorld((s) => s.droughts)
  const select = useWorld((s) => s.select)

  const site = selectedSiteId ? getSite(selectedSiteId) : undefined
  if (!site) return null

  const facts: Array<[string, string]> = []
  switch (site.kind) {
    case 'city': {
      const state = cityStates({ seaLevel, structures, year })[site.id]
      facts.push(
        [t('info.population'), t('info.millions', { n: site.population })],
        [t('info.elevation'), `${site.elevation} m`],
        [
          t('info.defense'),
          site.defense ? `${site.defense} m` : t('info.none'),
        ],
        [t('info.state'), t(`city.${state}`)],
      )
      break
    }
    case 'volcano':
      facts.push([t('info.maxVei'), `VEI ${site.historicVei}`])
      break
    case 'trench':
    case 'fault':
      facts.push([t('info.maxMagnitude'), `M${site.historicMagnitude}`])
      break
    case 'strait':
      facts.push([t('info.protects'), nameList(site.protects, locale)])
      break
    case 'glacier':
      facts.push([t('info.potentialRise'), `+${site.potentialRise} m`])
      break
    case 'region':
      facts.push(
        [t('info.population'), t('info.millions', { n: site.population })],
        [t('info.fireProne'), `${Math.round(site.fireProne * 100)}%`],
        [t('info.droughtProne'), `${Math.round(site.droughtProne * 100)}%`],
        [
          t('info.drought'),
          isInDrought(site.id, droughts, year) ? t('info.yes') : t('info.no'),
        ],
      )
      break
    case 'ocean':
      break
  }
  const note = siteNote(site, locale)
  const here = structures.filter((s) => s.siteId === site.id)

  return (
    <section
      aria-labelledby="site-info-title"
      className="grid gap-2 rounded-xs border border-line p-3"
    >
      <h3
        id="site-info-title"
        className="flex items-baseline justify-between gap-2"
      >
        <span className="font-display text-base font-semibold">
          {siteName(site, locale)}
        </span>
        <span className="label-caps">
          {t(`kind.${site.kind}`)} · {regionName(site.region, locale)}
        </span>
      </h3>
      {note ? (
        <p className="text-sm leading-relaxed text-muted">{note}</p>
      ) : null}
      {facts.length ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          {facts.map(([k, v]) => (
            <div key={k} className="grid">
              <dt className="label-caps">{k}</dt>
              <dd className="display-num">{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="label-caps mt-1">
        {t('info.structures', { n: here.length })}
      </p>
      {here.length ? (
        <ul className="grid gap-1 text-sm">
          {here.map((s) => (
            <li key={s.id} className="flex justify-between gap-2">
              <span>{structureName(s.kind, locale)}</span>
              <span
                className={year >= s.completeYear ? 'text-accent' : 'text-warn'}
              >
                {year >= s.completeYear
                  ? t('build.active')
                  : t('build.pending', {
                      year: decimalYearToDate(s.completeYear).getUTCFullYear(),
                    })}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <Button size="sm" onClick={() => select(null)}>
        {t('info.clear')}
      </Button>
    </section>
  )
}
