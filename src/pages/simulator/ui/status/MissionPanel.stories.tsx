import type { Meta, StoryObj } from '@storybook/react-vite'
import { MissionPanel } from './MissionPanel'

const meta = {
  title: 'pages/simulator/MissionPanel',
  component: MissionPanel,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MissionPanel>
export default meta
export const Default: StoryObj<typeof meta> = {}
