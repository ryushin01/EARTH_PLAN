import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { NotFoundPage } from './NotFoundPage'

/** 링크가 라우터를 쓰므로 메모리 라우터 안에서 그림 */
const withRouter: Decorator = (Story) => {
  const router = createRouter({
    routeTree: createRootRoute({ component: Story }),
    history: createMemoryHistory({ initialEntries: ['/no-such-page'] }),
  })
  return <RouterProvider router={router} />
}

const meta = {
  title: 'pages/NotFoundPage',
  component: NotFoundPage,
  decorators: [withRouter],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof NotFoundPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
