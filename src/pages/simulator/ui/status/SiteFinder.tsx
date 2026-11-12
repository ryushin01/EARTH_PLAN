import { ALL_SITES } from '../../model/site/data'
import { SITE_KIND_LABEL } from '../../model/site/labels'
import { useWorld } from '../../model/world/store'
import { SelectField } from '@/shared/ui'

/** 키보드로 지점을 골라 카메라를 그 위치로 돌립니다 (지구 클릭의 대안) */
export function SiteFinder() {
  const selectedSiteId = useWorld((s) => s.selectedSiteId)
  const select = useWorld((s) => s.select)
  return (
    <SelectField
      label="지점으로 이동"
      value={selectedSiteId ?? ''}
      onChange={(id) => select(id || null)}
      options={[
        { value: '', label: '선택 안 함' },
        ...ALL_SITES.map((site) => ({
          value: site.id,
          label: site.name,
          group: SITE_KIND_LABEL[site.kind],
        })),
      ]}
    />
  )
}
