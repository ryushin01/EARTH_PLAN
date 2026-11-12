//  @ts-check
import { tanstackConfig } from '@tanstack/eslint-config'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  ...tanstackConfig,
  reactHooks.configs.flat.recommended,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
      // R3F의 useFrame 안에서 three 객체를 직접 바꾸는 것은 의도된 사용법
      'react-hooks/immutability': 'off',
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'scripts/**',
      'src/routeTree.gen.ts',
      '.output/**',
      'dist/**',
      'storybook-static/**',
      'playwright-report/**',
      'test-results/**',
      '.storybook/**',
    ],
  },
]
