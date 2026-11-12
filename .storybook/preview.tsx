import type { Preview } from '@storybook/react-vite'
import '../src/app/styles/index.css'

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    layout: 'padded',
    a11y: { test: 'error' },
  },
  decorators: [
    (Story) => (
      <div lang="ko" className="bg-space p-4 text-ice">
        <Story />
      </div>
    ),
  ],
}

export default preview
