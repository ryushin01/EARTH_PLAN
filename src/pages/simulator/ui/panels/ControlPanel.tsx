import { useState } from 'react'
import { SeaLevelPanel } from './SeaLevelPanel'
import { EruptionPanel } from './EruptionPanel'
import { TsunamiPanel } from './TsunamiPanel'
import { BuildPanel } from './BuildPanel'
import { AsteroidPanel } from './AsteroidPanel'
import { HazardPanel } from './HazardPanel'
import { Tabs } from '@/shared/ui'

const ITEMS = [
  { id: 'sea', label: '해수면', content: <SeaLevelPanel /> },
  { id: 'volcano', label: '화산', content: <EruptionPanel /> },
  { id: 'tsunami', label: '쓰나미', content: <TsunamiPanel /> },
  { id: 'asteroid', label: '소행성', content: <AsteroidPanel /> },
  { id: 'hazard', label: '산불·가뭄', content: <HazardPanel /> },
  { id: 'build', label: '구조물', content: <BuildPanel /> },
]

/** 환경 요소·재해·구조물을 다루는 탭 제어판 */
export function ControlPanel() {
  const [tab, setTab] = useState('sea')
  return (
    <Tabs label="지구 관리 항목" items={ITEMS} value={tab} onChange={setTab} />
  )
}
