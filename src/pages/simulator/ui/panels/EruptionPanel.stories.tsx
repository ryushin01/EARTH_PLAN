import type { Meta, StoryObj } from '@storybook/react-vite'
import { EruptionPanel } from './EruptionPanel'

const meta = {
  title: 'features/EruptionPanel',
  component: EruptionPanel,
} satisfies Meta<typeof EruptionPanel>
export default meta
export const Default: StoryObj<typeof meta> = {}
