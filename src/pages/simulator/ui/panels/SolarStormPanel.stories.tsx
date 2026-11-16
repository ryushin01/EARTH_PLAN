import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { useWorld } from '../../model/world/store'
import { SolarStormPanel } from './SolarStormPanel'

const meta = {
  title: 'pages/simulator/SolarStormPanel',
  component: SolarStormPanel,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  beforeEach: () => {
    useWorld.getState().reset()
  },
} satisfies Meta<typeof SolarStormPanel>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** 캐링턴급 폭풍을 일으킨 뒤의 도시별 피해 */
export const Carrington: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('radio', { name: /캐링턴급/ }))
    await userEvent.click(
      canvas.getByRole('button', { name: '태양 폭풍 일으키기' }),
    )
    await expect(
      canvas.getByRole('region', { name: '최근 태양 폭풍 피해' }),
    ).toBeVisible()
  },
}
