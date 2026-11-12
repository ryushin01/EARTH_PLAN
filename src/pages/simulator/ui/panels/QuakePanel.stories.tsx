import type { Meta, StoryObj } from '@storybook/react-vite'
import { QuakePanel } from './QuakePanel'

const meta = {
  title: 'pages/simulator/QuakePanel',
  component: QuakePanel,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof QuakePanel>
export default meta
export const Default: StoryObj<typeof meta> = {}
