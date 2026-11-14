import ReactThreeTestRenderer, {
  act,
  waitFor,
} from '@react-three/test-renderer'
import type { Mesh, ShaderMaterial } from 'three'
import type { PlanetFrame } from '../../model/planet'
import { useThree } from '@react-three/fiber'
import type * as Fiber from '@react-three/fiber'
import { COMPILE_TIMEOUT_MS, Planet } from './Planet'

// 텍스처는 내려받지 않고 가짜 이미지로 대신함
vi.mock('@react-three/fiber', async (importOriginal) => ({
  ...(await importOriginal<typeof Fiber>()),
  useLoader: () => Array.from({ length: 4 }, () => ({ width: 2, height: 1 })),
}))

const frame = (patch: Partial<PlanetFrame> = {}): PlanetFrame => ({
  sun: [2, 0, 0],
  seaLevel: 0,
  seaIceLatN: 75,
  seaIceLatS: -65,
  snowLatN: 60,
  snowLatS: -55,
  snowAltitude: 4500,
  aridity: 0,
  cloudCover: 0.6,
  cloudOffset: 0,
  waves: [],
  ashes: [],
  storms: [],
  plumes: [],
  fires: [],
  droughts: [],
  ...patch,
})

/** 렌더러 인스턴스의 셰이더 컴파일 결과를 정함 (Planet의 효과보다 먼저 렌더 단계에서 설치) */
function CompileResult({ result }: { result: Promise<unknown> }) {
  const gl = useThree((state) => state.gl)
  if (!vi.isMockFunction(gl.compileAsync))
    vi.spyOn(gl, 'compileAsync').mockReturnValue(result as never)
  return null
}

async function render(
  props: Partial<Parameters<typeof Planet>[0]> = {},
  compile: Promise<unknown> = Promise.resolve(),
) {
  const renderer = await ReactThreeTestRenderer.create(
    <>
      <CompileResult result={compile} />
      <Planet readFrame={() => frame()} {...props} />
    </>,
  )
  const meshes = () => renderer.scene.findAll((node) => node.type === 'Mesh')
  const earth = () => meshes().find((node) => node.instance.name === 'earth')!
  const uniforms = () =>
    ((earth().instance as Mesh).material as ShaderMaterial).uniforms
  return { renderer, meshes, earth, uniforms }
}

describe('Planet', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('지구·구름·대기 세 겹으로 그리고, 셰이더를 컴파일한 뒤 보여 준다', async () => {
    const onReady = vi.fn()
    const { renderer, meshes } = await render({ onReady })
    expect(meshes().map((m) => m.instance.scale.x)).toEqual([1, 1.012, 1.09])
    const root = renderer.scene.findAll(
      (node) => node.instance.name === 'sun-light',
    )[0].parent!.instance
    await waitFor(() => root.visible)
    // 보이게 되면 한 번 알림 (지구본 화면이 정지 이미지를 지우는 신호)
    expect(onReady).toHaveBeenCalledTimes(1)
    await renderer.unmount()
  })

  it('컴파일 완료 알림이 오지 않아도 잠시 뒤에는 보여 준다', async () => {
    vi.useFakeTimers()
    const { renderer } = await render({}, new Promise(() => {}))
    const root = renderer.scene.findAll(
      (node) => node.instance.name === 'sun-light',
    )[0].parent!.instance
    expect(root.visible).toBe(false)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(COMPILE_TIMEOUT_MS)
    })
    expect(root.visible).toBe(true)
    await renderer.unmount()
  })

  it('구름을 끄면 구름층을 그리지 않는다', async () => {
    const { renderer, meshes } = await render({ showClouds: false })
    expect(meshes().map((m) => m.instance.scale.x)).toEqual([1, 1.09])
    await renderer.unmount()
  })

  it('매 프레임 해수면·쓰나미·태양 방향을 셰이더에 넣는다', async () => {
    const { renderer, uniforms } = await render({
      readFrame: () =>
        frame({
          seaLevel: 25,
          waves: [{ center: [0, 0, 1], radius: 0.4, strength: 0.8 }],
          storms: [
            { center: [1, 0, 0], radius: 0.1, strength: 0.7, hemisphere: -1 },
          ],
        }),
    })
    await renderer.advanceFrames(1, 0.016)
    const u = uniforms()
    expect(u.uSeaLevel.value).toBe(25)
    expect(u.uWaves.value[0].toArray()).toEqual([0, 0, 1, 0.4])
    expect(u.uWaveStrength.value).toEqual([0.8, 0, 0, 0])
    // 태양 방향은 단위 벡터로, 태양 기준점은 10배 거리에
    expect(u.uSun.value.toArray()).toEqual([1, 0, 0])
    const sun = renderer.scene.findAll(
      (node) => node.instance.name === 'sun-light',
    )[0]
    expect(sun.instance.position.x).toBeCloseTo(10)
    const cloud = renderer.scene.findAll((node) => node.type === 'Mesh')[1]
    const cu = ((cloud.instance as Mesh).material as ShaderMaterial).uniforms
    expect(cu.uStormInfo.value[0].toArray()).toEqual([0.7, -1])
    await renderer.unmount()
  })

  it('지표면을 누르면 그 지점을 알리고, 끌기는 무시한다', async () => {
    const onSurfaceClick = vi.fn()
    const { renderer, earth } = await render({ onSurfaceClick })
    await renderer.fireEvent(earth(), 'click', {
      point: { x: 0, y: 1, z: 0 },
      delta: 10,
    })
    expect(onSurfaceClick).not.toHaveBeenCalled()
    await renderer.fireEvent(earth(), 'click', {
      point: { x: 0, y: 1, z: 0 },
      delta: 0,
    })
    expect(onSurfaceClick).toHaveBeenCalledWith([0, 1, 0])
    await renderer.unmount()
  })
})
