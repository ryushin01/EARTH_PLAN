import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'

const esm = (path: string) =>
  fileURLToPath(new URL(`./node_modules/${path}`, import.meta.url))

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      /*
       * 단위·컴포넌트 테스트 (pnpm test)
       * - jsdom 환경. 3D 장면은 @react-three/test-renderer로 WebGL 없이 검사합니다.
       */
      {
        extends: true,
        plugins: [viteReact()],
        resolve: {
          // R3F·test-renderer는 exports 없이 main이 CommonJS판이라, 그대로 두면 테스트에서
          // CommonJS판 three.js가 따로 올라와 앱과 다르게 동작할 수 있음 → ESM판 파일로 직접 연결
          alias: {
            '@react-three/fiber': esm(
              '@react-three/fiber/dist/react-three-fiber.esm.js',
            ),
            '@react-three/drei': esm('@react-three/drei/index.js'),
            '@react-three/test-renderer': esm(
              '@react-three/test-renderer/dist/react-three-test-renderer.esm.js',
            ),
          },
        },
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./vitest.setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          // 위 패키지들이 서로 ESM판을 쓰도록 Vite가 직접 처리
          server: { deps: { inline: [/@react-three\//] } },
        },
      },
      /*
       * 스토리 테스트 (pnpm test:storybook, CI)
       * - 모든 스토리를 실제 Chromium에서 렌더링하고 접근성 검사(axe)를 실행합니다.
       * - GPU가 없는 CI에서도 3D 스토리가 그려지도록 소프트웨어 WebGL(SwiftShader)을 씁니다.
       */
      {
        extends: true,
        plugins: [
          tailwindcss(),
          viteReact(),
          storybookTest({ configDir: '.storybook' }),
        ],
        test: {
          name: 'storybook',
          // 3D 스토리 파일이 한 GPU 프로세스(SwiftShader)를 나눠 쓰면 서로 크게 느려지므로 차례로 실행하고,
          // 셰이더 컴파일이 느린 CI에 맞춰 제한 시간을 넉넉히 둠
          fileParallelism: false,
          testTimeout: 60_000,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              launchOptions: {
                args: [
                  '--use-angle=swiftshader',
                  '--enable-unsafe-swiftshader',
                  '--ignore-gpu-blocklist',
                ],
              },
            }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
