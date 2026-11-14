import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { ALL_SITES } from '../../model/site/data'
import { SiteMarkers } from './SiteMarkers'
import { StoryStage } from './StoryStage'

const meta = {
  title: 'pages/simulator/SiteMarkers',
  component: SiteMarkers,
  decorators: [
    (Story) => (
      <StoryStage>
        <Story />
      </StoryStage>
    ),
  ],
  args: { sites: ALL_SITES, selectedId: null, onSelect: fn() },
} satisfies Meta<typeof SiteMarkers>
export default meta
type Story = StoryObj<typeof meta>

/** 지점 종류마다 모양이 다름 (도시 상자, 화산 원뿔, 해구 고리, 단층 막대 등) */
export const Default: Story = {}

/** 고른 지점은 크게 보이고 이름표가 붙음 */
export const Selected: Story = {
  args: { selectedId: 'baekdu' },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('백두산', {}, { timeout: 10_000 }),
    ).toBeInTheDocument()
  },
}

/** 도시 상태: 안전, 위험, 보호, 침수 */
export const Tones: Story = {
  args: {
    tones: {
      'seoul-incheon': 'safe',
      busan: 'warn',
      tokyo: 'protected',
      osaka: 'danger',
      shanghai: 'danger',
      sakurajima: 'danger',
    },
  },
}
