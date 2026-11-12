import { createRootRoute } from '@tanstack/react-router'
import { RootDocument } from '@/app'
import appCss from '@/app/styles/index.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'EARTH PLAN · 지구 환경·재해 대응 시뮬레이터' },
      {
        name: 'description',
        content:
          '3D 지구 위에서 해수면 상승, 화산 분화, 쓰나미를 일으키고 거대 구조물로 막아 보는 시뮬레이터',
      },
      { name: 'theme-color', content: '#000000' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  shellComponent: RootDocument,
})
