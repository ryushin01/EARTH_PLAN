import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { AppErrorPage } from '@/app'
import { NotFoundPage } from '@/pages/not-found'

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultNotFoundComponent: NotFoundPage,
    defaultErrorComponent: AppErrorPage,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
