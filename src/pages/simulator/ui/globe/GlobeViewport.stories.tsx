import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { useWorld } from '../../model/world/store'
import { useT } from '../i18n'
import { GlobeViewport } from './GlobeViewport'

const HINT_ID = 'globe-story-hint'

/** 페이지에서는 3D 묶음 밖에 미리 그려 두는 조작 안내 */
function Hint() {
  const { t } = useT()
  return (
    <p id={HINT_ID} className="mt-2 text-center text-xs text-muted">
      {t('page.hint')}
    </p>
  )
}

const meta = {
  title: 'pages/simulator/GlobeViewport',
  component: GlobeViewport,
  args: { hintId: HINT_ID },
  decorators: [
    (Story) => (
      <>
        <div className="h-[520px]">
          <Story />
        </div>
        <Hint />
      </>
    ),
  ],
  beforeEach: () => {
    useWorld.setState(useWorld.getInitialState(), true)
  },
} satisfies Meta<typeof GlobeViewport>
export default meta
type Story = StoryObj<typeof meta>

/** 끌거나 화살표 키로 돌리면 자동 회전이 멈춤 */
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const globe = canvas.getByRole('group', { name: '지구본 조작 영역' })
    // 좁은 화면에서는 보기 토글이 접혀 있음
    const view = canvas.queryByRole('button', { name: '보기' })
    if (view) await userEvent.click(view)
    const autoRotate = canvas.getByRole('button', { name: '자동 회전' })
    await expect(autoRotate).toHaveAttribute('aria-pressed', 'true')
    globe.focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(autoRotate).toHaveAttribute('aria-pressed', 'false')
  },
}
