import { createRootRoute } from '@tanstack/react-router'
import { RootDocument } from '@/app'
import appCss from '@/app/styles/index.css?url'
import { OG_IMAGE, SITE_URL } from '@/shared/config'

const TITLE = 'TerraNova · 지구 환경·재해 대응 시뮬레이터'
const DESCRIPTION =
  '3D 지구 위에서 해수면 상승, 화산 분화, 쓰나미, 지진, 소행성, 태양 폭풍을 일으키고 거대 구조물로 막아 보는 시뮬레이터'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      { name: 'theme-color', content: '#000000' },
      // 메신저·SNS에 링크(공유 시나리오 포함)를 붙였을 때의 미리보기
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'TerraNova' },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:url', content: SITE_URL },
      { property: 'og:locale', content: 'ko_KR' },
      { property: 'og:locale:alternate', content: 'en_US' },
      { property: 'og:image', content: OG_IMAGE.url },
      { property: 'og:image:width', content: String(OG_IMAGE.width) },
      { property: 'og:image:height', content: String(OG_IMAGE.height) },
      { property: 'og:image:alt', content: OG_IMAGE.alt },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: TITLE },
      { name: 'twitter:description', content: DESCRIPTION },
      { name: 'twitter:image', content: OG_IMAGE.url },
      { name: 'twitter:image:alt', content: OG_IMAGE.alt },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      // 공유 링크(?s=...)도 같은 페이지로 모음
      { rel: 'canonical', href: SITE_URL },
      {
        rel: 'icon',
        href: `${import.meta.env.BASE_URL}favicon.svg`,
        type: 'image/svg+xml',
      },
      {
        rel: 'manifest',
        href: `${import.meta.env.BASE_URL}manifest.webmanifest`,
      },
      {
        rel: 'apple-touch-icon',
        href: `${import.meta.env.BASE_URL}apple-touch-icon.png`,
      },
    ],
  }),
  shellComponent: RootDocument,
})
