import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { useMilitary } from '../../model/military/store'
import { MilitaryPanel } from './MilitaryPanel'

const meta = {
  title: 'pages/simulator/MilitaryPanel',
  component: MilitaryPanel,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  beforeEach: () => {
    useMilitary.setState({ enabled: true, selectedId: null })
  },
} satisfies Meta<typeof MilitaryPanel>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** 항모 타격단을 고른 모습 */
export const CarrierStrikeGroup: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.selectOptions(canvas.getByRole('combobox'), 'fleet-csg')
    await expect(
      canvas.getByRole('region', { name: '항모 타격단' }),
    ).toBeVisible()
  },
}
