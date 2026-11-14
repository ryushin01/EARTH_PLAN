import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useFrame } from '@react-three/fiber'
import { kmToRadians, latLonToVector3 } from '@/shared/lib'
import type { LatLon } from '@/shared/lib'
import type { PlumeInput } from '../../model/planet'
import { getSite } from '../../model/site/data'
import { Plumes } from './Plumes'
import { StoryStage } from './StoryStage'
import type { StageOptions } from './StoryStage'

const plume = (
  kind: PlumeInput['kind'],
  at: LatLon,
  age: number,
  size: number,
): PlumeInput => ({
  id: kind,
  kind,
  center: latLonToVector3(at),
  age,
  size,
})

const VOLCANO = getSite('sakurajima') as LatLon
const IMPACT: LatLon = { lat: 30, lon: 141 }
const QUAKE = getSite('tokyo-direct') as LatLon

// 앱과 같은 크기 계산: 화산 (VEI - 2) / 6, 지진 강한 흔들림 반경(라디안)
const volcano = (age: number) => plume('volcano', VOLCANO, age, 5 / 6)
const impact = (age: number) => plume('impact', IMPACT, age, 0.7)
const quake = (age: number) => plume('quake', QUAKE, age, kmToRadians(120))

const meta = {
  title: 'pages/simulator/Plumes',
  component: Plumes,
  // 분출 지점을 비스듬히 내려다봄
  decorators: [
    (Story, { parameters }) => (
      <StoryStage {...(parameters.stage as StageOptions)}>
        <Story />
      </StoryStage>
    ),
  ],
  args: { plumes: [] },
} satisfies Meta<typeof Plumes>
export default meta
type Story = StoryObj<typeof meta>

const stage = (options: StageOptions) => ({ stage: options })

/** 분출 6초 뒤: 기둥과 화산재 구름 */
export const Volcano: Story = {
  args: { plumes: [volcano(6)] },
  parameters: stage({ focus: VOLCANO, range: 0.35 }),
}

/** 충돌 3초 뒤: 불덩이, 솟는 연기, 퍼지는 충격파 고리 (처음 1.5초는 섬광) */
export const Impact: Story = {
  args: { plumes: [impact(3)] },
  parameters: stage({ focus: IMPACT, range: 1 }),
}

/** 진앙에서 퍼지는 지진파 고리와 강한 흔들림 범위 */
export const Quake: Story = {
  args: { plumes: [quake(2.5)] },
  parameters: stage({ focus: QUAKE, range: 0.9 }),
}

const LOOP_SECONDS = 24

/** 시간에 따라 자라고 사라지는 모습을 되풀이 */
function Looping() {
  const [age, setAge] = useState(0)
  useFrame(({ clock }) => setAge(clock.getElapsedTime() % LOOP_SECONDS))
  return <Plumes plumes={[volcano(age), impact(age), quake(age % 12)]} />
}

export const Animated: Story = {
  render: () => <Looping />,
  parameters: stage({ focus: { lat: 32.5, lon: 136 }, range: 0.9 }),
}
