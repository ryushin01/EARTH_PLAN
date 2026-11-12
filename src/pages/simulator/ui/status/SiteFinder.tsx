import { ALL_SITES } from '../../model/site/data'
import { siteName } from '../../model/text'
import { useWorld } from '../../model/world/store'
import { useT } from '../i18n'
import { SelectField } from '@/shared/ui'

/** 키보드로 지점을 골라 카메라를 그 위치로 돌립니다 (지구 클릭의 대안) */
export function SiteFinder() {
  const { t, locale } = useT()
  const selectedSiteId = useWorld((s) => s.selectedSiteId)
  const select = useWorld((s) => s.select)
  return (
    <SelectField
      label={t('finder.label')}
      value={selectedSiteId ?? ''}
      onChange={(id) => select(id || null)}
      options={[
        { value: '', label: t('finder.none') },
        ...ALL_SITES.map((site) => ({
          value: site.id,
          label: siteName(site, locale),
          group: t(`kind.${site.kind}`),
        })),
      ]}
    />
  )
}
