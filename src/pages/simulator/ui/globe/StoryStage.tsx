import { Suspense, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useTexture } from '@react-three/drei'
import { SRGBColorSpace, Vector3 } from 'three'
import { TEXTURES_SMALL } from '@/shared/config'
import { latLonToVector3 } from '@/shared/lib'
import type { LatLon, Vec3 } from '@/shared/lib'

/*
 * 지구본 컴포넌트 스토리 전용 무대 (앱에서는 쓰지 않음)
 */

interface StageProps {
  children: ReactNode
  /** 카메라가 바라볼 지점 */
  focus?: LatLon
  /** 지구 중심에서 카메라까지 거리 */
  distance?: number
  /** 정하면 focus 지점을 남쪽 위에서 비스듬히 내려다봄 (그 지점에서 카메라까지 거리) */
  range?: number
  height?: number
}

/** 스토리의 parameters.stage로 넘기는 무대 설정 */
export type StageOptions = Omit<StageProps, 'children'>

const ELEVATION = (40 * Math.PI) / 180

/** 카메라 위치와 바라보는 점 */
function view(focus: LatLon, distance: number, range?: number) {
  if (range === undefined)
    return {
      position: latLonToVector3(focus, distance),
      target: [0, 0, 0] as Vec3,
    }
  const ground = new Vector3(...latLonToVector3(focus))
  const south = new Vector3(
    ...latLonToVector3({ lat: focus.lat - 1, lon: focus.lon }),
  )
    .sub(ground)
    .normalize()
  const position = ground
    .clone()
    .addScaledVector(ground, Math.sin(ELEVATION) * range)
    .addScaledVector(south, Math.cos(ELEVATION) * range)
  return {
    position: position.toArray(),
    target: ground.toArray(),
  }
}

/** 위치를 알아보기 쉽게 지구 사진만 입힌 구 (지구 본체 셰이더 없이) */
function TexturedEarth() {
  const map = useTexture(TEXTURES_SMALL.albedo, (texture) => {
    texture.colorSpace = SRGBColorSpace
  })
  return (
    <mesh>
      <sphereGeometry args={[1, 128, 64]} />
      <meshStandardMaterial map={map} roughness={0.9} />
    </mesh>
  )
}

/** 3D 부품(마커·구조물·분출 효과)용: 지구, 햇빛, 태양 방향 기준점, 카메라 조작 */
export function StoryStage({
  children,
  focus = { lat: 34, lon: 132 },
  distance = 2.4,
  range,
  height = 420,
}: StageProps) {
  const { position, target } = view(focus, distance, range)
  // 멀리서 볼 때는 해를 옆에서 비춰 낮 쪽 지구와 궤도 구조물이 함께 보이게 하고,
  // 가까이 볼 때는 카메라가 있는 남쪽 위에서 비춰 보이는 면이 밝게 함
  const sun = latLonToVector3(
    range === undefined
      ? { lat: focus.lat + 10, lon: focus.lon + 45 }
      : { lat: focus.lat - 20, lon: focus.lon + 15 },
    10,
  )
  return (
    <div style={{ height }} className="relative w-full">
      <Canvas camera={{ position, fov: 40, near: 0.005, far: 50 }} dpr={1}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={sun} intensity={2.2} />
        <group name="sun-light" position={sun} />
        <Suspense fallback={null}>
          <TexturedEarth />
        </Suspense>
        {children}
        <OrbitControls
          target={target}
          enablePan={false}
          minDistance={0.05}
          maxDistance={8}
        />
      </Canvas>
    </div>
  )
}

/**
 * 지구가 보이게 된 뒤 한 번 그려지면 알림.
 * three.js는 셰이더 오류를 처음 그릴 때 검사하므로 그다음 프레임까지 기다림
 */
function PlanetReady({ onReady }: { onReady: () => void }) {
  const drawn = useRef(0)
  useFrame(({ scene }) => {
    if (drawn.current > 1) return
    if (!scene.getObjectByName('earth')?.parent?.visible) return
    drawn.current += 1
    if (drawn.current > 1) onReady()
  })
  return null
}

/**
 * 지구 본체용 무대. 셰이더 오류 수(data-shader-errors)와 준비 여부(data-planet-ready)를 남겨
 * 스토리 테스트가 실제 WebGL에서 셰이더가 컴파일되고 지구가 보이는지 확인할 수 있게 함
 */
export function PlanetStage({
  children,
  focus = { lat: 25, lon: 128 },
  distance = 3.2,
  height = 440,
  controls = true,
}: Omit<StageProps, 'range'> & {
  /** 카메라 조작 (GlobeScene처럼 자체 조작이 있으면 끔) */
  controls?: boolean
}) {
  const [ready, setReady] = useState(false)
  const [shaderErrors, setShaderErrors] = useState(0)
  return (
    <div
      style={{ height }}
      className="relative w-full"
      data-planet-ready={ready}
      data-shader-errors={shaderErrors}
    >
      <Canvas
        camera={{ position: latLonToVector3(focus, distance), fov: 40 }}
        dpr={1}
        onCreated={({ gl }) => {
          gl.debug.onShaderError = (context, program, vertex, fragment) => {
            console.error(
              '셰이더 오류',
              context.getProgramInfoLog(program),
              context.getShaderInfoLog(vertex),
              context.getShaderInfoLog(fragment),
            )
            setShaderErrors((n) => n + 1)
          }
        }}
      >
        <color attach="background" args={['#000000']} />
        <Suspense fallback={null}>{children}</Suspense>
        <PlanetReady onReady={() => setReady(true)} />
        {controls ? (
          <OrbitControls enablePan={false} minDistance={1.3} maxDistance={8} />
        ) : null}
      </Canvas>
    </div>
  )
}
