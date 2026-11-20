import ReactThreeTestRenderer from '@react-three/test-renderer'
import { useThree } from '@react-three/fiber'
import { createRef, useLayoutEffect } from 'react'
import type { RefObject } from 'react'
import type { Camera } from 'three'
import { CONTROLS_SETTLE_MS, GlobeControls } from './GlobeControls'
import type { GlobeControlsHandle } from './GlobeControls'

function CameraProbe({ cameraRef }: { cameraRef: RefObject<Camera | null> }) {
  const camera = useThree((state) => state.camera)
  useLayoutEffect(() => {
    camera.position.set(0, 0, 3.7)
    cameraRef.current = camera
  }, [camera, cameraRef])
  return null
}

const options = {
  autoRotate: false,
  autoRotateSpeed: 0.35,
  enableDamping: false,
  dampingFactor: 0.08,
  rotateSpeed: 0.45,
  zoomSpeed: 0.6,
  minDistance: 1.4,
  maxDistance: 8,
}

async function render(
  props: Partial<typeof options> & { onStart?: () => void } = {},
) {
  const ref = createRef<GlobeControlsHandle>()
  const cameraRef = createRef<Camera>()
  const renderer = await ReactThreeTestRenderer.create(
    <>
      <CameraProbe cameraRef={cameraRef} />
      <GlobeControls ref={ref} {...options} {...props} />
    </>,
  )
  return {
    renderer,
    handle: () => ref.current!,
    camera: () => cameraRef.current!,
  }
}

/** 카메라가 y축을 따라 돈 각도 (라디안) */
const azimuth = (camera: Camera) =>
  Math.atan2(camera.position.x, camera.position.z)

describe('GlobeControls', () => {
  afterEach(() => vi.restoreAllMocks())

  it('설정을 three.js 궤도 조작기에 넘기고, 옆으로 끌기(이동)는 막는다', async () => {
    const { handle, renderer } = await render({ enableDamping: true })
    expect(handle().instance).toMatchObject({
      enablePan: false,
      enableDamping: true,
      dampingFactor: 0.08,
      rotateSpeed: 0.45,
      zoomSpeed: 0.6,
      minDistance: 1.4,
      maxDistance: 8,
    })
    await renderer.unmount()
  })

  it('끌기를 시작하면 알리고, 손을 뗀 뒤 감속하는 동안까지 조작 중으로 본다', async () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1_000)
    const onStart = vi.fn()
    const { handle, renderer } = await render({ onStart })
    expect(handle().isActive()).toBe(false)
    handle().instance.dispatchEvent({ type: 'start' })
    expect(onStart).toHaveBeenCalledOnce()
    expect(handle().isActive()).toBe(true)
    handle().instance.dispatchEvent({ type: 'end' })
    now.mockReturnValue(1_000 + CONTROLS_SETTLE_MS - 1)
    expect(handle().isActive()).toBe(true)
    now.mockReturnValue(1_000 + CONTROLS_SETTLE_MS + 1)
    expect(handle().isActive()).toBe(false)
    await renderer.unmount()
  })

  it('자동 회전은 프레임 수가 아니라 지난 시간에 비례한다 (120Hz 화면에서도 같은 속도)', async () => {
    const slow = await render({ autoRotate: true })
    await slow.renderer.advanceFrames(1, 0.1)
    const once = azimuth(slow.camera())
    await slow.renderer.unmount()

    const fast = await render({ autoRotate: true })
    await fast.renderer.advanceFrames(4, 0.025)
    expect(azimuth(fast.camera())).toBeCloseTo(once, 6)
    // 0.35 → 1초에 2π/60 × 0.35 라디안 (한 바퀴 약 171초)
    expect(Math.abs(once)).toBeCloseTo(((2 * Math.PI) / 60) * 0.35 * 0.1, 6)
    await fast.renderer.unmount()
  })

  it('쉬다가 다시 그릴 때는 지난 시간이 길어도 한 번에 크게 돌지 않는다', async () => {
    const { renderer, camera } = await render({ autoRotate: true })
    await renderer.advanceFrames(1, 30)
    expect(Math.abs(azimuth(camera()))).toBeCloseTo(
      ((2 * Math.PI) / 60) * 0.35 * 0.1,
      6,
    )
    await renderer.unmount()
  })
})
