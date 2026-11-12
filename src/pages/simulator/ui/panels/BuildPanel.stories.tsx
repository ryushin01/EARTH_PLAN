import type { Meta, StoryObj } from '@storybook/react-vite'
import { BuildPanel } from './BuildPanel'

const meta = {
  title: 'pages/simulator/BuildPanel',
  component: BuildPanel,
} satisfies Meta<typeof BuildPanel>
export default meta
export const Default: StoryObj<typeof meta> = {}
