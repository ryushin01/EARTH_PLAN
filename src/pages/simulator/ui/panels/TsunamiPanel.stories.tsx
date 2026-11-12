import type { Meta, StoryObj } from '@storybook/react-vite'
import { TsunamiPanel } from './TsunamiPanel'

const meta = {
  title: 'features/TsunamiPanel',
  component: TsunamiPanel,
} satisfies Meta<typeof TsunamiPanel>
export default meta
export const Default: StoryObj<typeof meta> = {}
