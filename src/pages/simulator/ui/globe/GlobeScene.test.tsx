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
import { AMBIENT_FRAME_MS } from '../../model/render'
import type { CameraApi } from '../../model/camera'
import type { PlanetFrame } from '../../model/planet'
import { useWorld } from '../../model/world/store'
import { useToday } from '../../model/today/store'
import { kpAurora } from '../../model/today/today'
import type { TodayData } from '../../model/today/today'
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
  controlsActive: false,
}))

vi.mock('./Planet', () => ({
  Planet: (props: NonNullable<typeof seen.planet>) => {
    seen.planet = props
    return <group name="planet" />
  },
}))

vi.mock('./GlobeControls', () => ({
  GlobeControls: forwardRef((props: NonNullable<typeof seen.controls>, ref) => {
    seen.controls = props
    useImperativeHandle(ref, () => ({
      update: () => {},
      isActive: () => seen.controlsActive,
    }))
    return null
  }),
}))

vi.mock('@react-three/drei', () => ({
  Stars: (props: NonNullable<typeof seen.stars>) => {
    seen.stars = props
    return null
  },
  Html: ({ children }: { children: ReactElement<{ children: string }> }) => (
    <group name="label" userData={{ text: children.props.children }} />
  ),
}))

/** 다음 프레임 요청(invalidate)을 기록하는 대역으로 바꿈 */
function InvalidateSpy({ spy }: { spy: () => void }) {
  const set = useThree((state) => state.set)
  useLayoutEffect(() => {
    set({ invalidate: spy })
  }, [set, spy])
  return null
}

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
  showTraffic: false,
  reducedMotion: true,
}

async function render(
  props: Partial<typeof defaults> & {
    showStars?: boolean
    showMigration?: boolean
    onReady?: () => void
  } = {},
) {
  const apiRef = createRef<CameraApi>()
  const cameraRef = createRef<Camera>()
  const invalidate = vi.fn()
  const renderer = await ReactThreeTestRenderer.create(
    <>
      <InvalidateSpy spy={invalidate} />
      <CameraProbe cameraRef={cameraRef} />
      <GlobeScene apiRef={apiRef} {...defaults} {...props} />
    </>,
  )
  const camera = () => cameraRef.current!.position
  const api = () => apiRef.current!
  return { renderer, camera, api, invalidate }
}

const toVector = (v: Vec3) => new Vector3(...v)

describe('GlobeScene', () => {
  beforeEach(() => {
    useWorld.getState().reset()
    useToday.setState(useToday.getInitialState())
    seen.planet = null
    seen.controls = null
    seen.stars = null
    seen.controlsActive = false
  })

  describe('필요할 때만 그리기', () => {
    afterEach(() => vi.useRealTimers())

    it('멈춰 있고 움직이는 것이 없으면 다음 프레임을 요청하지 않는다', async () => {
      const { renderer, invalidate } = await render()
      await renderer.advanceFrames(1, 0.016)
      invalidate.mockClear()
      await renderer.advanceFrames(3, 0.016)
      expect(invalidate).not.toHaveBeenCalled()
      await renderer.unmount()
    })

    it('세계 상태가 바뀌거나 카메라 조작 API를 부르면 바로 다시 그린다', async () => {
      const { renderer, invalidate, api } = await render()
      invalidate.mockClear()
      act(() => {
        useWorld.getState().setSeaLevel(3)
      })
      expect(invalidate).toHaveBeenCalled()
      invalidate.mockClear()
      api().rotate(0.3, 0)
      expect(invalidate).toHaveBeenCalled()
      await renderer.unmount()
    })

    it('끌기 중이거나 재생 중이면 매 프레임 그린다', async () => {
      const { renderer, invalidate } = await render()
      seen.controlsActive = true
      invalidate.mockClear()
      await renderer.advanceFrames(1, 0.016)
      expect(invalidate).toHaveBeenCalledTimes(1)
      seen.controlsActive = false
      act(() => {
        useWorld.getState().setRunning(true)
      })
      invalidate.mockClear()
      await renderer.advanceFrames(1, 0.016)
      expect(invalidate).toHaveBeenCalledTimes(1)
      await renderer.unmount()
    })

    it('자동 회전만 있으면 약 1/30초 뒤에 다음 프레임을 요청한다', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const { renderer, invalidate } = await render({ autoRotate: true })
      await renderer.advanceFrames(1, 0.016)
      invalidate.mockClear()
      await renderer.advanceFrames(1, 0.016)
      expect(invalidate).not.toHaveBeenCalled()
      vi.advanceTimersByTime(AMBIENT_FRAME_MS)
      expect(invalidate).toHaveBeenCalledTimes(1)
      await renderer.unmount()
    })
  })

  describe('오늘의 지구', () => {
    const data: TodayData = {
      fetchedAt: '2026-11-20T21:00:00Z',
      quakes: [
        {
          id: 'q1',
          time: Date.parse('2026-11-20T20:00:00Z'),
          mag: 6.6,
          depthKm: 68,
          lat: -6.02,
          lon: 131.46,
          place: 'Tual',
          tsunami: false,
        },
      ],
      kp: [{ time: '2026-11-20T18:00:00Z', kp: 7 }],
    }
    const quakeLayers = (r: {
      scene: {
        findAll: (f: (n: { props: { name?: string } }) => boolean) => unknown[]
      }
    }) => r.scene.findAll((node) => node.props.name === 'today-quakes')

    beforeEach(() =>
      useToday.setState({
        ...useToday.getInitialState(),
        status: 'ready',
        data,
      }),
    )

    it('켜면 실제 지진을 그리고, 지금 Kp에 맞는 오로라를 셰이더 입력에 넣는다', async () => {
      const off = await render()
      expect(quakeLayers(off.renderer)).toHaveLength(0)
      expect(seen.planet!.readFrame(0).aurora.strength).toBe(0)
      await off.renderer.unmount()

      useToday.getState().setEnabled(true)
      const on = await render()
      expect(quakeLayers(on.renderer)).toHaveLength(1)
      expect(seen.planet!.readFrame(0).aurora).toEqual(kpAurora(7))
      await on.renderer.unmount()
    })

    it('더 센 가상 태양 폭풍이 있으면 그 오로라를 쓴다', async () => {
      useToday.getState().setEnabled(true)
      useWorld
        .getState()
        .triggerSolarStorm('carrington', performance.now() - 5_000)
      const { renderer } = await render()
      const aurora = seen.planet!.readFrame(0).aurora
      expect(aurora.strength).toBeGreaterThan(kpAurora(7).strength)
      await renderer.unmount()
    })

    it('지진을 고르면 카메라가 그쪽으로 돈다', async () => {
      const { renderer, camera } = await render()
      await act(async () => {
        useToday.getState().focus('q1')
      })
      await renderer.advanceFrames(1, 0.016)
      const target = toVector(
        latLonToVector3({ lat: -6.02, lon: 131.46 }),
      ).normalize()
      expect(camera().clone().normalize().dot(target)).toBeCloseTo(1, 5)
      await renderer.unmount()
    })
  })

  it('인구 이동을 켜면 잠긴 도시가 있을 때 이동 흐름을 그린다', async () => {
    const migration = (r: Awaited<ReturnType<typeof render>>) =>
      r.renderer.scene.findAll((node) => node.props.name === 'migration')
    const none = await render({ showMigration: true })
    expect(migration(none)).toHaveLength(0)
    await none.renderer.unmount()
    useWorld.getState().setSeaLevel(6)
    const flooded = await render({ showMigration: true })
    expect(migration(flooded)).toHaveLength(1)
    await flooded.renderer.unmount()
    const off = await render({ showMigration: false })
    expect(migration(off)).toHaveLength(0)
    await off.renderer.unmount()
  })

  it('항공·선박을 켜면 운항 레이어를 그리고, 끄면 그리지 않는다', async () => {
    const airliners = (r: Awaited<ReturnType<typeof render>>) =>
      r.renderer.scene.findAll((node) => node.instance.name === 'airliner')
    const shown = await render({ showTraffic: true })
    expect(airliners(shown)).toHaveLength(1)
    await shown.renderer.unmount()
    const hidden = await render({ showTraffic: false })
    expect(airliners(hidden)).toHaveLength(0)
    await hidden.renderer.unmount()
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
