import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button'

const meta = {
  title: 'shared/Button',
  component: Button,
  args: { children: '건설하기' },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = { args: { variant: 'primary' } }
export const Ghost: Story = { args: { variant: 'ghost', children: '초기화' } }
export const Danger: Story = {
  args: { variant: 'danger', children: '분화 시키기' },
}
export const Disabled: Story = {
  args: { variant: 'primary', disabled: true, children: '예산 부족' },
}
