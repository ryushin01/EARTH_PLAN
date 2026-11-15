import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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
    }),
    viteReact(),
  ],
})
