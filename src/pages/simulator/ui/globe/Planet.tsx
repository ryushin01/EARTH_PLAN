import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  ImageBitmapLoader,
  NoColorSpace,
  Texture,
  SRGBColorSpace,
  Vector2,
  Vector3,
  Vector4,
} from 'three'
import type { DirectionalLight, Group, ShaderMaterial } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { TEXTURES } from '@/shared/config'
import { latLonToVector3 } from '@/shared/lib'
import type { LatLon, Vec3 } from '@/shared/lib'
import {
  MAX_ASHES,
  MAX_DROUGHTS,
  MAX_FIRES,
  MAX_STORMS,
  MAX_WAVES,
} from '../../model/planet'
import type { PlanetFrame } from '../../model/planet'
import {
  atmosphereFragment,
  atmosphereVertex,
  cloudFragment,
  earthFragment,
  earthVertex,
} from '../../lib/shaders'

interface PlanetProps {
  /** 매 프레임 호출해 셰이더 값을 받습니다 (리렌더 없이 갱신) */
  readFrame: (elapsedSeconds: number) => PlanetFrame
  showClouds?: boolean
  /** 지구 표면을 눌렀을 때 그 지점의 위경도 */
  onSurfaceClick?: (point: Vec3) => void
}

const TEXTURE_URLS = [
  TEXTURES.albedo,
  TEXTURES.lights,
  TEXTURES.elevation,
  TEXTURES.clouds,
]

const vec4s = (n: number) => Array.from({ length: n }, () => new Vector4())
const zeros = (n: number) => Array.from({ length: n }, () => 0)

export function Planet({
  readFrame,
  showClouds = true,
  onSurfaceClick,
}: PlanetProps) {
  // 이미지 해석을 메인 스레드 밖(ImageBitmap)에서 처리해 첫 화면 멈춤을 줄입니다
  const bitmaps = useLoader(ImageBitmapLoader, TEXTURE_URLS, (loader) => {
    loader.setOptions({
      imageOrientation: 'flipY',
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'none',
    })
  })
  const [albedo, lights, elevation, clouds] = useMemo(
    () =>
      bitmaps.map((bitmap, i) => {
        const texture = new Texture(bitmap)
        texture.flipY = false
        // 색 텍스처만 sRGB, 고도·구름 양은 값 그대로
        texture.colorSpace = i < 2 ? SRGBColorSpace : NoColorSpace
        if (i === 0) texture.anisotropy = 8
        texture.needsUpdate = true
        return texture
      }),
    [bitmaps],
  )

  const earthRef = useRef<ShaderMaterial>(null)
  const cloudRef = useRef<ShaderMaterial>(null)
  const atmoRef = useRef<ShaderMaterial>(null)
  const sunRef = useRef<Group>(null)

  const earthUniforms = useMemo(
    () => ({
      uAlbedo: { value: albedo },
      uLights: { value: lights },
      uElevation: { value: elevation },
      uSun: { value: new Vector3(1, 0, 0) },
      uSeaLevel: { value: 0 },
      uIceN: { value: 75 },
      uIceS: { value: -65 },
      uSnowN: { value: 60 },
      uSnowS: { value: -55 },
      uSnowAlt: { value: 4500 },
      uArid: { value: 0 },
      uTime: { value: 0 },
      uWaves: { value: vec4s(MAX_WAVES) },
      uWaveStrength: { value: zeros(MAX_WAVES) },
      uAsh: { value: vec4s(MAX_ASHES) },
      uAshAmount: { value: zeros(MAX_ASHES) },
      uFires: { value: vec4s(MAX_FIRES) },
      uFireInfo: {
        value: Array.from({ length: MAX_FIRES }, () => new Vector2()),
      },
      uDroughts: { value: vec4s(MAX_DROUGHTS) },
      uDroughtAmount: { value: zeros(MAX_DROUGHTS) },
    }),
    [albedo, lights, elevation],
  )

  const cloudUniforms = useMemo(
    () => ({
      uClouds: { value: clouds },
      uSun: { value: new Vector3(1, 0, 0) },
      uCover: { value: 0.55 },
      uOffset: { value: 0 },
      uTime: { value: 0 },
      uStorms: { value: vec4s(MAX_STORMS) },
      uStormInfo: {
        value: Array.from({ length: MAX_STORMS }, () => new Vector2()),
      },
    }),
    [clouds],
  )

  const atmoUniforms = useMemo(
    () => ({ uSun: { value: new Vector3(1, 0, 0) } }),
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const frame = readFrame(t)
    const sun = new Vector3(...frame.sun).normalize()
    const earth = earthRef.current
    if (earth) {
      const u = earth.uniforms
      u.uSun.value.copy(sun)
      u.uSeaLevel.value = frame.seaLevel
      u.uIceN.value = frame.seaIceLatN
      u.uIceS.value = frame.seaIceLatS
      u.uSnowN.value = frame.snowLatN
      u.uSnowS.value = frame.snowLatS
      u.uSnowAlt.value = frame.snowAltitude
      u.uArid.value = frame.aridity
      u.uTime.value = t
      for (let i = 0; i < MAX_WAVES; i++) {
        const w = frame.waves.at(i)
        if (w) u.uWaves.value[i].set(...w.center, w.radius)
        u.uWaveStrength.value[i] = w?.strength ?? 0
      }
      for (let i = 0; i < MAX_ASHES; i++) {
        const a = frame.ashes.at(i)
        if (a) u.uAsh.value[i].set(...a.center, a.radius)
        u.uAshAmount.value[i] = a?.amount ?? 0
      }
      for (let i = 0; i < MAX_FIRES; i++) {
        const f = frame.fires.at(i)
        if (f) u.uFires.value[i].set(...f.center, f.radius)
        u.uFireInfo.value[i].set(f?.intensity ?? 0, f?.scar ?? 0)
      }
      for (let i = 0; i < MAX_DROUGHTS; i++) {
        const d = frame.droughts.at(i)
        if (d) u.uDroughts.value[i].set(...d.center, d.radius)
        u.uDroughtAmount.value[i] = d?.amount ?? 0
      }
    }
    const cloud = cloudRef.current
    if (cloud) {
      const u = cloud.uniforms
      u.uSun.value.copy(sun)
      u.uCover.value = frame.cloudCover
      u.uOffset.value = frame.cloudOffset
      u.uTime.value = t
      for (let i = 0; i < MAX_STORMS; i++) {
        const s = frame.storms.at(i)
        if (s) u.uStorms.value[i].set(...s.center, s.radius)
        u.uStormInfo.value[i].set(s?.strength ?? 0, s?.hemisphere ?? 1)
      }
    }
    atmoRef.current?.uniforms.uSun.value.copy(sun)
    sunRef.current?.position.copy(sun).multiplyScalar(10)
  })

  // 셰이더를 병렬로 미리 컴파일한 뒤 보여 줘 첫 화면에서 메인 스레드가 오래 멈추지 않게 함
  const rootRef = useRef<Group>(null)
  const [compiled, setCompiled] = useState(false)
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let cancelled = false
    gl.compileAsync(root, camera, scene)
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) setCompiled(true)
      })
    return () => {
      cancelled = true
    }
  }, [gl, camera, scene])

  return (
    <group ref={rootRef} visible={compiled}>
      {/* 태양 방향 (구조물 조명·우주 차양 위치 기준) */}
      <group ref={sunRef} name="sun-light" />
      <SunLight />
      <mesh
        name="earth"
        onClick={(event: ThreeEvent<MouseEvent>) => {
          if (event.delta > 4) return
          const { x, y, z } = event.point
          onSurfaceClick?.([x, y, z])
        }}
      >
        <sphereGeometry args={[1, 128, 64]} />
        <shaderMaterial
          ref={earthRef}
          vertexShader={earthVertex}
          fragmentShader={earthFragment}
          uniforms={earthUniforms}
        />
      </mesh>
      {showClouds ? (
        <mesh scale={1.012} raycast={() => null}>
          <sphereGeometry args={[1, 96, 48]} />
          <shaderMaterial
            ref={cloudRef}
            vertexShader={earthVertex}
            fragmentShader={cloudFragment}
            uniforms={cloudUniforms}
            transparent
            depthWrite={false}
          />
        </mesh>
      ) : null}
      <mesh scale={1.09} raycast={() => null}>
        <sphereGeometry args={[1, 64, 32]} />
        <shaderMaterial
          ref={atmoRef}
          vertexShader={atmosphereVertex}
          fragmentShader={atmosphereFragment}
          uniforms={atmoUniforms}
          side={BackSide}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/** 구조물(표준 재질)을 비추는 태양광. 태양 방향 그룹을 따라갑니다 */
function SunLight() {
  const ref = useRef<DirectionalLight>(null)
  useFrame(({ scene }) => {
    const anchor = scene.getObjectByName('sun-light')
    const light = ref.current
    if (anchor && light) light.position.copy(anchor.position)
  })
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight ref={ref} intensity={2.2} />
    </>
  )
}

/** 위경도 → 지구 표면 벡터 (셰이더 입력용) */
export function surfaceVector(point: LatLon): Vec3 {
  return latLonToVector3(point, 1)
}
