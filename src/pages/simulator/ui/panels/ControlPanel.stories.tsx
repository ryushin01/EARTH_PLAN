import type { Meta, StoryObj } from '@storybook/react-vite'
import { ControlPanel } from './ControlPanel'

const meta = {
  title: 'widgets/ControlPanel',
  component: ControlPanel,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ControlPanel>
export default meta
export const Default: StoryObj<typeof meta> = {}
