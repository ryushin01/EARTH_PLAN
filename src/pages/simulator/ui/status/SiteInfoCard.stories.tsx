import type { Meta, StoryObj } from '@storybook/react-vite'
import { useWorld } from '../../model/world/store'
import { SiteInfoCard } from './SiteInfoCard'

const meta = {
  title: 'pages/simulator/SiteInfoCard',
  component: SiteInfoCard,
  decorators: [
    (Story) => {
      useWorld.setState({ selectedSiteId: 'tokyo' })
      return (
        <div className="max-w-sm">
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof SiteInfoCard>
export default meta
export const Default: StoryObj<typeof meta> = {}
