import type { Meta, StoryObj } from '@storybook/react-vite'
import { MissionHud } from './MissionHud'

const meta = {
  title: 'pages/simulator/MissionHud',
  component: MissionHud,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MissionHud>
export default meta
export const Default: StoryObj<typeof meta> = {}
