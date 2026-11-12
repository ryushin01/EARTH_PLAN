import type { Meta, StoryObj } from '@storybook/react-vite'
import { StatusMessage } from './StatusMessage'

const meta = {
  title: 'shared/StatusMessage',
  component: StatusMessage,
} satisfies Meta<typeof StatusMessage>
export default meta
type Story = StoryObj<typeof meta>
export const Info: Story = {
  args: { message: '도쿄에 해안 방조제 건설을 시작했습니다.' },
}
export const Error: Story = {
  args: { message: '예산이 $200B 모자랍니다.', tone: 'error' },
}
