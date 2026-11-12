import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages처럼 하위 경로에 올릴 때 BASE_PATH=/EARTH_PLAN/ 로 빌드
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  resolve: { tsconfigPaths: true },
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
