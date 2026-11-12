import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    // TanStack Start 플러그인 없이 React + Tailwind만 쓰는 설정
    options: { builder: { viteConfigPath: '.storybook/vite.config.ts' } },
  },
  staticDirs: ['../public'],
}

export default config
