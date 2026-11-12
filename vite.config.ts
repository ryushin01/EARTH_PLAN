import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart({
      // 정적 사이트로 내보내 어느 호스팅에서도 동작하게 함 (서버 함수 없음)
      prerender: { enabled: true, crawlLinks: true },
    }),
    viteReact(),
  ],
})
