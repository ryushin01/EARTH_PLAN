import type { Meta, StoryObj } from '@storybook/react-vite'
import { HistoryPanel } from './HistoryPanel'

const meta = {
  title: 'pages/simulator/HistoryPanel',
  component: HistoryPanel,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HistoryPanel>
export default meta
export const Default: StoryObj<typeof meta> = {}
