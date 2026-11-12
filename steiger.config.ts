import { defineConfig } from 'steiger'
import fsd from '@feature-sliced/steiger-plugin'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // TanStack Router 파일 기반 라우트와 생성 파일은 FSD 밖
    ignores: ['./src/routes/**', './src/routeTree.gen.ts', './src/router.tsx'],
  },
])
