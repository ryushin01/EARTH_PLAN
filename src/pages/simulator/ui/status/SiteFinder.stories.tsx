import type { Meta, StoryObj } from '@storybook/react-vite'
import { SiteFinder } from './SiteFinder'

const meta = {
  title: 'pages/simulator/SiteFinder',
  component: SiteFinder,
} satisfies Meta<typeof SiteFinder>
export default meta
export const Default: StoryObj<typeof meta> = {}
