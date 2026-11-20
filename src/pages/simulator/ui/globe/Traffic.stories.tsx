import type { Meta, StoryObj } from '@storybook/react-vite'
import { LAUNCH_SITE } from '../../model/traffic/routes'
import { Traffic } from './Traffic'
import { StoryStage } from './StoryStage'
import type { StageOptions } from './StoryStage'

const meta = {
  title: 'pages/simulator/Traffic',
  component: Traffic,
  decorators: [
    (Story, { parameters }) => (
      <StoryStage {...(parameters.stage as StageOptions)}>
        <Story />
      </StoryStage>
    ),
  ],
  args: { reducedMotion: false },
} satisfies Meta<typeof Traffic>
export default meta
type Story = StoryObj<typeof meta>

/** 동아시아: 인천·도쿄에서 뜨는 여객기, 부산·상하이 바닷길의 배 */
export const EastAsia: Story = {
  parameters: {
    stage: {
      focus: { lat: 32, lon: 132 },
      distance: 2.2,
    } satisfies StageOptions,
  },
}

/** 필리핀해를 순찰하는 항공모함과 그 위를 도는 전투기 편대 */
export const CarrierGroup: Story = {
  parameters: {
    stage: {
      focus: { lat: 16.5, lon: 130 },
      range: 0.28,
    } satisfies StageOptions,
  },
}

/** 케네디 우주 센터에서 뜨고 내리는 우주왕복선 (궤도는 북위 28.5°에서 동쪽으로) */
export const Shuttle: Story = {
  parameters: {
    stage: { focus: LAUNCH_SITE, distance: 1.9 } satisfies StageOptions,
  },
}

/** 동작 줄이기: 제자리에 멈춘 채 재해에 따른 결항·우회만 반영 */
export const ReducedMotion: Story = {
  args: { reducedMotion: true },
  parameters: {
    stage: {
      focus: { lat: 32, lon: 132 },
      distance: 2.2,
    } satisfies StageOptions,
  },
}
