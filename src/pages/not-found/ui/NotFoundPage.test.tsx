import { render, screen } from '@testing-library/react'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { useLocale } from '@/shared/i18n'
import { NotFoundPage } from './NotFoundPage'

function renderAt(path: string) {
  const root = createRootRoute({ component: Outlet })
  const index = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <p>시뮬레이터</p>,
  })
  const router = createRouter({
    routeTree: root.addChildren([index]),
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultNotFoundComponent: NotFoundPage,
  })
  return render(<RouterProvider router={router} />)
}

describe('NotFoundPage', () => {
  afterEach(() => useLocale.setState({ locale: 'ko' }))

  it('없는 주소면 제목과 처음 화면 링크를 보여 주고 문서 제목을 바꾼다', async () => {
    renderAt('/no-such-page')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '페이지를 찾을 수 없습니다',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '처음 화면으로' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(document.title).toBe('페이지를 찾을 수 없습니다 · EARTH PLAN')
  })

  it('영어로 바꿔 두었으면 영어로 보여 준다', async () => {
    useLocale.setState({ locale: 'en' })
    renderAt('/missing')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to start' })).toBeVisible()
  })
})
