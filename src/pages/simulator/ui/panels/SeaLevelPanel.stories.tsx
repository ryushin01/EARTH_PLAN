import type { Meta, StoryObj } from '@storybook/react-vite'
import { SeaLevelPanel } from './SeaLevelPanel'

const meta = {
  title: 'features/SeaLevelPanel',
  component: SeaLevelPanel,
} satisfies Meta<typeof SeaLevelPanel>
export default meta
export const Default: StoryObj<typeof meta> = {}
