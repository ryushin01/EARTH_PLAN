import type { Meta, StoryObj } from '@storybook/react-vite'
import { AsteroidPanel } from './AsteroidPanel'

const meta = {
  title: 'pages/simulator/AsteroidPanel',
  component: AsteroidPanel,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AsteroidPanel>
export default meta
export const Default: StoryObj<typeof meta> = {}
