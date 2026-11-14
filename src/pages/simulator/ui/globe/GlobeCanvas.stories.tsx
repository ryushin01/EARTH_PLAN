import { useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'
import type { CameraApi } from '../../model/camera'
import { useWorld } from '../../model/world/store'
import { GlobeCanvas } from './GlobeCanvas'

/** 처음 상태의 지구를 정사각형 캔버스에 그리고, 지구가 보이면 data-globe-ready를 켬 */
function Frame({ size, stars }: { size: number; stars: boolean }) {
  const apiRef = useRef<CameraApi | null>(null)
  const [ready, setReady] = useState(false)
  return (
    <div style={{ width: size, height: size }} data-globe-ready={ready}>
      <GlobeCanvas
        apiRef={apiRef}
        autoRotate={false}
        showClouds
        showMarkers
        reducedMotion
        showStars={stars}
        onReady={() => setReady(true)}
      />
    </div>
  )
}

const meta = {
  title: 'pages/simulator/GlobeCanvas',
  component: Frame,
  args: { size: 480, stars: true },
  beforeEach: () => {
    useWorld.setState(useWorld.getInitialState(), true)
  },
} satisfies Meta<typeof Frame>
export default meta
type Story = StoryObj<typeof meta>

/** 지구본 화면이 처음 불러오는 3D 장면 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector('[data-globe-ready]')
    await waitFor(
      () => expect(frame).toHaveAttribute('data-globe-ready', 'true'),
      { timeout: 30_000 },
    )
  },
}

/**
 * 정지 이미지 촬영용 (pnpm poster): 별 없이 1200px.
 * 3D가 뜨기 전에 보여 주는 이미지와 첫 3D 화면이 같아지도록, 처음 상태·카메라를 그대로 씀
 */
export const Poster: Story = {
  args: { size: 1200, stars: false },
  tags: ['!test'],
}
