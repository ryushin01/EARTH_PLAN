import ReactThreeTestRenderer, { act } from '@react-three/test-renderer'
import { useThree } from '@react-three/fiber'
import {
  createRef,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
} from 'react'
import type { ReactElement, RefObject } from 'react'
import { Vector3 } from 'three'
import type { Camera } from 'three'
import { ALL_SITES, getSite } from '../../model/site/data'
import { MAX_DISTANCE, MIN_DISTANCE, orbitPosition } from '../../model/camera'
import type { CameraApi } from '../../model/camera'
import type { PlanetFrame } from '../../model/planet'
import { useWorld } from '../../model/world/store'
import { latLonToVector3 } from '@/shared/lib'
import type { Vec3 } from '@/shared/lib'
import { GlobeScene } from './GlobeScene'

// 텍스처·셰이더를 쓰는 지구 본체와 drei 부품은 가벼운 대역으로 바꾸고, 받은 값을 기록함
const seen = vi.hoisted(() => ({
  planet: null as null | {
    readFrame: (t: number) => PlanetFrame
    showClouds?: boolean
    onSurfaceClick?: (point: Vec3) => void
    onReady?: () => void
  },
  controls: null as null | {
    autoRotate?: boolean
    enableDamping?: boolean
    onStart?: () => void
  },
  stars: null as null | { speed?: number },
}))

vi.mock('./Planet', () => ({
  Planet: (props: NonNullable<typeof seen.planet>) => {
    seen.planet = props
    return <group name="planet" />
  },
}))

vi.mock('@react-three/drei', () => ({
  OrbitControls: forwardRef((props: NonNullable<typeof seen.controls>, ref) => {
    seen.controls = props
    useImperativeHandle(ref, () => ({ update: () => {} }))
    return null
  }),
  Stars: (props: NonNullable<typeof seen.stars>) => {
    seen.stars = props
    return null
  },
  Html: ({ children }: { children: ReactElement<{ children: string }> }) => (
    <group name="label" userData={{ text: children.props.children }} />
  ),
}))

/** 장면을 그리는 카메라를 받아 둠 */
function CameraProbe({ cameraRef }: { cameraRef: RefObject<Camera | null> }) {
  const camera = useThree((state) => state.camera)
  useLayoutEffect(() => {
    cameraRef.current = camera
  }, [camera, cameraRef])
  return null
}

const defaults = {
  autoRotate: false,
  showClouds: true,
  showMarkers: true,
  reducedMotion: true,
}

async function render(
  props: Partial<typeof defaults> & {
    showStars?: boolean
    onReady?: () => void
  } = {},
) {
  const apiRef = createRef<CameraApi>()
  const cameraRef = createRef<Camera>()
  const renderer = await ReactThreeTestRenderer.create(
    <>
      <CameraProbe cameraRef={cameraRef} />
      <GlobeScene apiRef={apiRef} {...defaults} {...props} />
    </>,
  )
  const camera = () => cameraRef.current!.position
  const api = () => apiRef.current!
  return { renderer, camera, api }
}

const toVector = (v: Vec3) => new Vector3(...v)

describe('GlobeScene', () => {
  beforeEach(() => {
    useWorld.getState().reset()
    seen.planet = null
    seen.controls = null
    seen.stars = null
  })

  it('카메라 조작 API로 돌리고, 확대·축소 범위를 지킨다', async () => {
    const { renderer, camera, api } = await render()
    const start: Vec3 = [camera().x, camera().y, camera().z]
    api().rotate(Math.PI / 2, 0)
    await renderer.advanceFrames(1, 0.016)
    expect(
      camera().distanceTo(toVector(orbitPosition(start, Math.PI / 2, 0))),
    ).toBeLessThan(1e-6)
    api().zoom(0.01)
    await renderer.advanceFrames(1, 0.016)
    expect(camera().length()).toBeCloseTo(MIN_DISTANCE)
    api().zoom(100)
    await renderer.advanceFrames(1, 0.016)
    expect(camera().length()).toBeCloseTo(MAX_DISTANCE)
    await renderer.unmount()
  })

  it('움직임 줄이기를 끄면 몇 프레임에 걸쳐 부드럽게 돈다', async () => {
    const { renderer, camera, api } = await render({ reducedMotion: false })
    const start = camera().clone()
    api().rotate(Math.PI / 2, 0)
    await renderer.advanceFrames(1, 0.016)
    const goal = toVector(
      orbitPosition([start.x, start.y, start.z], Math.PI / 2, 0),
    )
    const afterOne = camera().distanceTo(goal)
    expect(afterOne).toBeGreaterThan(0.01)
    await renderer.advanceFrames(240, 0.016)
    expect(camera().distanceTo(goal)).toBeLessThan(0.01)
    await renderer.unmount()
  })

  it('끌기를 시작하면 진행 중이던 카메라 이동을 멈춘다', async () => {
    const { renderer, camera, api } = await render({ reducedMotion: false })
    api().rotate(Math.PI / 2, 0)
    await renderer.advanceFrames(1, 0.016)
    const moved = camera().clone()
    seen.controls!.onStart!()
    await renderer.advanceFrames(10, 0.016)
    expect(camera().distanceTo(moved)).toBeLessThan(1e-9)
    await renderer.unmount()
  })

  it('지점을 고르면 카메라가 그 지점 쪽으로 돈다', async () => {
    const { renderer, camera } = await render()
    await act(async () => {
      useWorld.getState().select('tokyo')
    })
    await renderer.advanceFrames(1, 0.016)
    const tokyo = toVector(latLonToVector3(getSite('tokyo')!)).normalize()
    expect(camera().clone().normalize().dot(tokyo)).toBeCloseTo(1, 5)
    expect(camera().length()).toBeGreaterThanOrEqual(2.2)
    await renderer.unmount()
  })

  it('지표면을 누르면 400km 안의 가장 가까운 지점을 고르고, 멀면 무시한다', async () => {
    const { renderer } = await render()
    const tokyo = getSite('tokyo')!
    await act(async () => {
      seen.planet!.onSurfaceClick!(
        latLonToVector3({ lat: tokyo.lat + 0.3, lon: tokyo.lon }),
      )
    })
    expect(useWorld.getState().selectedSiteId).toBe('tokyo')
    await act(async () => {
      seen.planet!.onSurfaceClick!(latLonToVector3({ lat: -50, lon: -120 }))
    })
    expect(useWorld.getState().selectedSiteId).toBe('tokyo')
    await renderer.unmount()
  })

  it('분출이 일어나면 다음 프레임부터 분출 기둥을 그린다', async () => {
    const { renderer } = await render()
    await act(async () => {
      useWorld.getState().triggerEruption('fuji', 6, performance.now())
    })
    seen.planet!.readFrame(0)
    // advanceFrames는 act 밖에서 프레임 함수를 부르므로, 그 안의 상태 변경은 act로 반영
    await act(async () => {
      await renderer.advanceFrames(1, 0.016)
    })
    const ring = renderer.scene.findAll(
      (node) =>
        node.type === 'Mesh' &&
        (node.instance as { geometry?: { type: string } }).geometry?.type ===
          'RingGeometry',
    )
    expect(ring.length).toBeGreaterThan(0)
    await renderer.unmount()
  })

  it('지점 표시를 끄고 켤 수 있고, 설정을 카메라 조작기와 별에 넘긴다', async () => {
    const off = await render({
      showMarkers: false,
      autoRotate: true,
      reducedMotion: true,
    })
    const boxes = () =>
      off.renderer.scene.findAll(
        (node) =>
          node.type === 'Mesh' &&
          (node.instance as { geometry?: { type: string } }).geometry?.type ===
            'BoxGeometry',
      )
    expect(boxes()).toHaveLength(0)
    expect(seen.controls).toMatchObject({
      autoRotate: true,
      enableDamping: false,
    })
    expect(seen.stars?.speed).toBe(0)
    expect(seen.planet?.showClouds).toBe(true)
    await off.renderer.unmount()

    const on = await render({ showMarkers: true, reducedMotion: false })
    const markers = on.renderer.scene.findAll((node) => node.type === 'Mesh')
    expect(markers).toHaveLength(ALL_SITES.length)
    expect(seen.controls?.enableDamping).toBe(true)
    await on.renderer.unmount()
  })

  it('정지 이미지를 찍을 때는 별을 빼고, 지구가 보이면 알린다', async () => {
    const onReady = vi.fn()
    const { renderer } = await render({ showStars: false, onReady })
    expect(seen.stars).toBeNull()
    expect(seen.planet?.onReady).toBe(onReady)
    await renderer.unmount()
  })
})
