import type { Meta, StoryObj } from '@storybook/react-vite'
import { ScenarioShare } from './ScenarioShare'

const meta = {
  title: 'pages/simulator/ScenarioShare',
  component: ScenarioShare,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScenarioShare>
export default meta
export const Default: StoryObj<typeof meta> = {}
