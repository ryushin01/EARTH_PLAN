import { formatNumber } from '@/shared/lib'
import { useT } from '../i18n'
import { useMigrationFlows } from '../useMigrationFlows'

/** 인구 이동 요약: 해수면 이주와 재해 피난 (흐름이 없으면 그리지 않음) */
export function MigrationStatus() {
  const { t } = useT()
  const flows = useMigrationFlows()
  if (!flows.length) return null
  const total = (kind: 'sea' | 'disaster') =>
    flows.filter((f) => f.kind === kind).reduce((sum, f) => sum + f.millions, 0)
  const sea = total('sea')
  const disaster = total('disaster')
  const parts = [
    sea > 0 && t('migration.sea', { n: formatNumber(sea, 1) }),
    disaster > 0 && t('migration.disaster', { n: formatNumber(disaster, 1) }),
  ].filter(Boolean)
  return (
    <p className="rounded-xs border border-line bg-panel px-3 py-2 text-xs text-ice">
      {[t('migration.heading'), ...parts].join(' · ')}
    </p>
  )
}
