import type { Meta, StoryObj } from '@storybook/react-vite'
import { EruptionPanel } from './EruptionPanel'

const meta = {
  title: 'pages/simulator/EruptionPanel',
  component: EruptionPanel,
} satisfies Meta<typeof EruptionPanel>
export default meta
export const Default: StoryObj<typeof meta> = {}
