import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { AppErrorPage } from './AppErrorPage'

const meta = {
  title: 'app/AppErrorPage',
  component: AppErrorPage,
  parameters: { layout: 'fullscreen' },
  args: { error: new Error('스토리용 오류'), reset: fn() },
} satisfies Meta<typeof AppErrorPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
