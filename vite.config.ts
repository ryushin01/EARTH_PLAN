import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { serviceWorkerVersion } from './scripts/vite-sw-version.ts'

// GitHub Pages처럼 하위 경로에 올릴 때 BASE_PATH=/EARTH_PLAN/ 로 빌드
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  resolve: { tsconfigPaths: true },
  build: {
    // 한글 글꼴 조각(대부분 4KB 미만)을 CSS에 base64로 넣지 않고 파일로 둠.
    // 넣으면 쓰지 않는 글자까지 CSS에 실려 첫 화면을 막음
    assetsInlineLimit: (filePath) =>
      filePath.endsWith('.woff2') ? false : undefined,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      router: { basepath: base },
      // 정적 사이트로 내보내 어느 호스팅에서도 동작하게 함 (서버 함수 없음)
      prerender: { enabled: true, crawlLinks: true },
      // GitHub Pages가 없는 주소에 내주는 404.html: 경로가 정해지지 않은 껍데기(SPA 셸)를 내보내
      // 브라우저에서 라우터가 404 화면을 그리게 함 (사전 렌더링한 첫 화면과 하이드레이션이 어긋나지 않음)
      spa: {
        enabled: true,
        maskPath: '/?shell',
        prerender: { outputPath: '/404' },
      },
    }),
    viteReact(),
    // 배포마다 바뀐 코드·텍스처의 옛 캐시를 지우도록 서비스 워커 캐시 이름에 버전을 넣음
    serviceWorkerVersion(),
  ],
})
