import { useState } from 'react'
import { SeaLevelPanel } from './SeaLevelPanel'
import { EruptionPanel } from './EruptionPanel'
import { TsunamiPanel } from './TsunamiPanel'
import { BuildPanel } from './BuildPanel'
import { AsteroidPanel } from './AsteroidPanel'
import { HazardPanel } from './HazardPanel'
import { QuakePanel } from './QuakePanel'
import { Tabs } from '@/shared/ui'
import { useT } from '../i18n'

const ITEMS = [
  { id: 'sea', label: 'tabs.sea' as const, content: <SeaLevelPanel /> },
  { id: 'volcano', label: 'tabs.volcano' as const, content: <EruptionPanel /> },
  { id: 'tsunami', label: 'tabs.tsunami' as const, content: <TsunamiPanel /> },
  { id: 'quake', label: 'tabs.quake' as const, content: <QuakePanel /> },
  {
    id: 'asteroid',
    label: 'tabs.asteroid' as const,
    content: <AsteroidPanel />,
  },
  { id: 'hazard', label: 'tabs.hazard' as const, content: <HazardPanel /> },
  { id: 'build', label: 'tabs.build' as const, content: <BuildPanel /> },
]

/** 환경 요소·재해·구조물을 다루는 탭 제어판 */
export function ControlPanel() {
  const [tab, setTab] = useState('sea')
  const { t } = useT()
  const items = ITEMS.map((item) => ({ ...item, label: t(item.label) }))
  return (
    <Tabs label={t('tabs.label')} items={items} value={tab} onChange={setTab} />
  )
}
