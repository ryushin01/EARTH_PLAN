import type { Meta, StoryObj } from '@storybook/react-vite'
import { HazardPanel } from './HazardPanel'

const meta = {
  title: 'pages/simulator/HazardPanel',
  component: HazardPanel,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HazardPanel>
export default meta
export const Default: StoryObj<typeof meta> = {}
