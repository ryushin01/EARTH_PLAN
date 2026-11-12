import type { Meta, StoryObj } from '@storybook/react-vite'
import { TimeControls } from './TimeControls'

const meta = {
  title: 'features/TimeControls',
  component: TimeControls,
} satisfies Meta<typeof TimeControls>
export default meta
export const Default: StoryObj<typeof meta> = {}
