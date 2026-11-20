import ReactThreeTestRenderer, {
  act,
  waitFor,
} from '@react-three/test-renderer'
import { useLayoutEffect } from 'react'
import { ImageBitmapLoader } from 'three'
import type { Mesh, ShaderMaterial, Texture } from 'three'
import type { PlanetFrame } from '../../model/planet'
import { useThree } from '@react-three/fiber'
import type * as Fiber from '@react-three/fiber'
import { DETAIL_PATCHES, TEXTURES } from '@/shared/config'
import { warmOfflineCache } from '@/shared/lib'
import type * as SharedLib from '@/shared/lib'
import { COMPILE_TIMEOUT_MS, Planet, preloadPlanet } from './Planet'

const preload = vi.hoisted(() => vi.fn())

vi.mock('@/shared/lib', async (importOriginal) => ({
  ...(await importOriginal<typeof SharedLib>()),
  warmOfflineCache: vi.fn(),
}))

// 텍스처는 내려받지 않고 가짜 이미지로 대신함
vi.mock('@react-three/fiber', async (importOriginal) => ({
  ...(await importOriginal<typeof Fiber>()),
  useLoader: Object.assign(
    () => Array.from({ length: 4 }, () => ({ width: 2, height: 1 })),
    { preload },
  ),
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
  aurora: { strength: 0, lat: 90 },
  ...patch,
})

/** 렌더러 인스턴스의 셰이더 컴파일 결과를 정함 (Planet의 효과보다 먼저 렌더 단계에서 설치) */
function CompileResult({ result }: { result: Promise<unknown> }) {
  const gl = useThree((state) => state.gl)
  if (!vi.isMockFunction(gl.compileAsync))
    vi.spyOn(gl, 'compileAsync').mockReturnValue(result as never)
  return null
}

/** 다음 프레임 요청(invalidate)을 기록하는 대역으로 바꿈 */
function InvalidateSpy({ spy }: { spy: () => void }) {
  const set = useThree((state) => state.set)
  useLayoutEffect(() => {
    set({ invalidate: spy })
  }, [set, spy])
  return null
}

async function render(
  props: Partial<Parameters<typeof Planet>[0]> = {},
  compile: Promise<unknown> = Promise.resolve(),
) {
  const invalidate = vi.fn()
  const renderer = await ReactThreeTestRenderer.create(
    <>
      <InvalidateSpy spy={invalidate} />
      <CompileResult result={compile} />
      <Planet readFrame={() => frame()} {...props} />
    </>,
  )
  const meshes = () => renderer.scene.findAll((node) => node.type === 'Mesh')
  const earth = () => meshes().find((node) => node.instance.name === 'earth')!
  const uniforms = () =>
    ((earth().instance as Mesh).material as ShaderMaterial).uniforms
  return { renderer, meshes, earth, uniforms, invalidate }
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

  it('텍스처 네 장을 지구를 그릴 때와 같은 설정으로 미리 받아 둔다', () => {
    preloadPlanet()
    const [loader, urls, configure] = preload.mock.calls[0] as [
      unknown,
      string[],
      (loader: { setOptions: (options: object) => void }) => void,
    ]
    expect(loader).toBe(ImageBitmapLoader)
    expect(urls).toHaveLength(4)
    const setOptions = vi.fn()
    configure({ setOptions })
    expect(setOptions).toHaveBeenCalledWith(
      expect.objectContaining({ imageOrientation: 'flipY' }),
    )
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
    // 오로라는 없으면 밝기 0
    expect(u.uAurora.value.x).toBe(0)
    expect(u.uMagPole.value.length()).toBeCloseTo(1)
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

  it('지구가 사라지면 직접 만든 텍스처를 해제한다', async () => {
    const { renderer, uniforms } = await render()
    const u = uniforms()
    const textures = [u.uAlbedo.value, u.uLights.value, u.uElevation.value]
    const disposed = textures.map((texture) => vi.spyOn(texture, 'dispose'))
    await renderer.unmount()
    for (const spy of disposed) expect(spy).toHaveBeenCalledOnce()
  })

  it('지구가 보이면 고해상도 고도 패치를 모두 받아 셰이더에 넣고, 사라지면 해제한다', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn())
    const deliveries = new Map<string, () => void>()
    const bitmaps = DETAIL_PATCHES.map(() => ({
      width: 2,
      height: 3,
      close: vi.fn(),
    }))
    const load = vi
      .spyOn(ImageBitmapLoader.prototype, 'load')
      .mockImplementation((url, onLoad) => {
        const i = DETAIL_PATCHES.findIndex((patch) => patch.url === url)
        expect(i).toBeGreaterThanOrEqual(0)
        deliveries.set(url, () => onLoad?.(bitmaps[i]))
      })
    const { renderer, uniforms, invalidate } = await render()
    await waitFor(() =>
      expect(load).toHaveBeenCalledTimes(DETAIL_PATCHES.length),
    )
    const u = uniforms()
    DETAIL_PATCHES.forEach((patch, i) => {
      invalidate.mockClear()
      deliveries.get(patch.url)!()
      // 그리기를 쉬는 중에도 바로 보이게 다음 프레임을 요청
      expect(invalidate).toHaveBeenCalled()
      expect(u.uDetailOn.value[i]).toBe(1)
      expect((u[`uDetail${i}`].value as Texture).image).toBe(bitmaps[i])
      // 텍스처 좌표의 서·남·동·북 (격자점이 픽셀 가운데라 반 칸씩 더함)
      const rect = u.uDetailRect.value[i]
      expect(rect.x).toBeCloseTo((patch.bounds.west + 180) / 360)
      expect(rect.y).toBeCloseTo((patch.bounds.south + 90) / 180)
      expect(rect.z).toBeCloseTo((patch.bounds.east + 180) / 360)
      expect(rect.w).toBeCloseTo((patch.bounds.north + 90) / 180)
    })
    // 한반도: 동경 124~131°, 북위 33~43° 격자에 반 칸(1/120°)씩
    expect(DETAIL_PATCHES[0].bounds).toEqual({
      west: 124 - 1 / 120,
      east: 131 + 1 / 120,
      south: 33 - 1 / 120,
      north: 43 + 1 / 120,
    })
    const disposes = DETAIL_PATCHES.map((_, i) =>
      vi.spyOn(u[`uDetail${i}`].value as Texture, 'dispose'),
    )
    await renderer.unmount()
    for (const dispose of disposes) expect(dispose).toHaveBeenCalledOnce()
    // 직접 받은 패치 이미지도 닫음
    for (const bitmap of bitmaps) expect(bitmap.close).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('고도 패치를 다 받으면 쓴 텍스처·육지 격자·패치를 오프라인 캐시에 넣는다', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn())
    const deliveries: Array<() => void> = []
    vi.spyOn(ImageBitmapLoader.prototype, 'load').mockImplementation(
      (_url, onLoad) => {
        deliveries.push(() => onLoad?.({ width: 1, height: 1, close: vi.fn() }))
      },
    )
    const { renderer } = await render()
    await waitFor(() => expect(deliveries).toHaveLength(DETAIL_PATCHES.length))
    expect(warmOfflineCache).not.toHaveBeenCalled()
    for (const deliver of deliveries) deliver()
    await waitFor(() => expect(warmOfflineCache).toHaveBeenCalledOnce())
    const urls = vi.mocked(warmOfflineCache).mock.calls[0][0]
    expect(urls).toEqual(
      expect.arrayContaining([
        TEXTURES.albedo,
        TEXTURES.elevation,
        TEXTURES.landGrid,
        ...DETAIL_PATCHES.map((patch) => patch.url),
      ]),
    )
    await renderer.unmount()
    vi.unstubAllGlobals()
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
