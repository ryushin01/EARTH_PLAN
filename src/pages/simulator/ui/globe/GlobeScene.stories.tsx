import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'
import { useWorld } from '../../model/world/store'
import { GlobeScene } from './GlobeScene'
import { PlanetStage } from './StoryStage'

const meta = {
  title: 'pages/simulator/GlobeScene',
  component: GlobeScene,
  decorators: [
    (Story) => (
      <PlanetStage controls={false} distance={3.7}>
        <Story />
      </PlanetStage>
    ),
  ],
  args: {
    apiRef: { current: null },
    autoRotate: true,
    showClouds: true,
    showMarkers: true,
    reducedMotion: false,
  },
  beforeEach: () => {
    useWorld.setState(useWorld.getInitialState(), true)
  },
  // 별, 지구, 마커, 구조물을 함께 그려도 셰이더 오류 없이 지구가 보이는지 확인
  play: async ({ canvasElement }) => {
    const stage = canvasElement.querySelector('[data-planet-ready]')
    await waitFor(
      () => expect(stage).toHaveAttribute('data-planet-ready', 'true'),
      { timeout: 30_000 },
    )
    await expect(stage).toHaveAttribute('data-shader-errors', '0')
  },
} satisfies Meta<typeof GlobeScene>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** 방파제를 짓고 재해를 일으킨 뒤: 분출 기둥, 쓰나미 파면, 산불, 고른 화산으로 카메라 이동 */
export const Disasters: Story = {
  args: { autoRotate: false },
  beforeEach: () => {
    const world = useWorld.getState()
    world.build('sea-wall', 'tokyo', { instant: true })
    world.triggerTsunami('japan-trench', 9)
    world.startWildfire('korea')
    world.triggerEruption('sakurajima', 5)
    world.select('sakurajima')
  },
}

/** 구름·지점 표시를 끈 모습 */
export const Plain: Story = {
  args: { showClouds: false, showMarkers: false, autoRotate: false },
}
