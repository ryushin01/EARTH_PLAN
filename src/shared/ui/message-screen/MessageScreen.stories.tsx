import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, buttonClasses, ButtonIndicator } from '../button/Button'
import { MessageScreen } from './MessageScreen'

const meta = {
  title: 'shared/MessageScreen',
  component: MessageScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    label: '404',
    title: '페이지를 찾을 수 없습니다',
    description:
      '주소가 바뀌었거나 없는 페이지입니다. 처음 화면에서 지구를 다시 살펴보세요.',
    tagline: '지구 환경·재해 대응 시뮬레이터',
    children: (
      <a href="#home" className={buttonClasses({ variant: 'primary' })}>
        <ButtonIndicator variant="primary" />
        처음 화면으로
      </a>
    ),
  },
} satisfies Meta<typeof MessageScreen>

export default meta
type Story = StoryObj<typeof meta>

export const NotFound: Story = {}

export const Error: Story = {
  args: {
    label: 'Error',
    title: '문제가 생겼습니다',
    description:
      '화면을 그리다가 오류가 났습니다. 다시 시도하거나 처음 화면으로 돌아가세요.',
    children: (
      <>
        <Button variant="primary">다시 시도</Button>
        <a href="#home" className={buttonClasses()}>
          <ButtonIndicator />
          처음 화면으로
        </a>
      </>
    ),
  },
}
