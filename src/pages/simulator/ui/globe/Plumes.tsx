import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { CylinderGeometry, Quaternion, RingGeometry, Vector3 } from 'three'
import type { PlumeInput } from '../../model/planet'

const UP = new Vector3(0, 1, 0)

/*
 * 분출 기둥·고리는 크기가 매 프레임 바뀝니다. 크기를 도형 인자(args)로 넘기면
 * React Three Fiber가 프레임마다 도형을 새로 만들고 버리므로,
 * 구는 반지름 1로 한 번 만들고 scale로, 두께가 일정한 고리와 위가 넓어지는 기둥은
 * 같은 도형의 정점 위치만 고쳐 씁니다 (모양은 인자로 만든 것과 같음).
 */

/** 고친 정점을 GPU에 다시 올리고, 화면 밖 판정용 경계 구를 다시 계산 */
function commitPositions(geometry: RingGeometry | CylinderGeometry) {
  geometry.attributes.position.needsUpdate = true
  geometry.computeBoundingSphere()
}

/** 한 번만 만든 도형을 언마운트할 때 해제 */
function useDisposeOnUnmount(geometry: RingGeometry | CylinderGeometry) {
  useEffect(() => () => geometry.dispose(), [geometry])
}

/** 안쪽·바깥 반지름이 바뀌는 평면 고리 (RingGeometry와 같은 정점 배치) */
function Ring({
  inner,
  outer,
  segments,
}: {
  inner: number
  outer: number
  segments: number
}) {
  const [geometry] = useState(() => new RingGeometry(1, 2, segments, 1))
  useDisposeOnUnmount(geometry)
  useLayoutEffect(() => {
    const position = geometry.attributes.position
    for (let j = 0; j <= 1; j++) {
      const radius = j === 0 ? inner : outer
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        position.setXYZ(
          j * (segments + 1) + i,
          radius * Math.cos(angle),
          radius * Math.sin(angle),
          0,
        )
      }
    }
    commitPositions(geometry)
  }, [geometry, inner, outer, segments])
  return <primitive object={geometry} attach="geometry" />
}

/** 위·아래 반지름과 높이가 바뀌는 열린 기둥 (CylinderGeometry와 같은 정점 배치) */
function Tube({
  top,
  bottom,
  height,
  segments,
}: {
  top: number
  bottom: number
  height: number
  segments: number
}) {
  const [geometry] = useState(
    () => new CylinderGeometry(1, 1, 1, segments, 1, true),
  )
  useDisposeOnUnmount(geometry)
  useLayoutEffect(() => {
    const position = geometry.attributes.position
    for (let y = 0; y <= 1; y++) {
      const radius = y === 0 ? top : bottom
      for (let x = 0; x <= segments; x++) {
        const theta = (x / segments) * Math.PI * 2
        position.setXYZ(
          y * (segments + 1) + x,
          radius * Math.sin(theta),
          height / 2 - y * height,
          radius * Math.cos(theta),
        )
      }
    }
    commitPositions(geometry)
  }, [geometry, top, bottom, height, segments])
  return <primitive object={geometry} attach="geometry" />
}

/** 화산 분출 기둥: 시간이 지나면 퍼지고 옅어지는 화산재 덩어리 */
export function Plumes({ plumes }: { plumes: PlumeInput[] }) {
  return (
    <group>
      {plumes.map((plume) => (
        <Plume key={plume.id} plume={plume} />
      ))}
    </group>
  )
}

function Plume({ plume }: { plume: PlumeInput }) {
  const { position, quaternion } = useMemo(() => {
    const normal = new Vector3(...plume.center).normalize()
    return {
      position: normal.clone().multiplyScalar(1.004),
      quaternion: new Quaternion().setFromUnitVectors(UP, normal),
    }
  }, [plume.center])
  if (plume.kind === 'quake') {
    return (
      <QuakeRings plume={plume} position={position} quaternion={quaternion} />
    )
  }
  if (plume.kind === 'impact') {
    return (
      <ImpactBurst plume={plume} position={position} quaternion={quaternion} />
    )
  }
  const grow = Math.min(1, plume.age / 4)
  const fade = Math.max(0, 1 - Math.max(0, plume.age - 8) / 12)
  if (fade <= 0) return null
  const height = 0.02 + plume.size * 0.12 * grow
  const cap = plume.size * 0.06 * grow + 0.008
  return (
    <group position={position} quaternion={quaternion}>
      <mesh position={[0, height / 2, 0]}>
        <Tube
          top={plume.size * 0.035 * grow + 0.004}
          bottom={0.006}
          height={height}
          segments={16}
        />
        <meshBasicMaterial
          color="#5b5550"
          transparent
          opacity={0.7 * fade}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, height, 0]} scale={[cap, cap * 0.45, cap]}>
        <sphereGeometry args={[1, 20, 12]} />
        <meshBasicMaterial
          color="#6d655f"
          transparent
          opacity={0.65 * fade}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <Ring
          inner={0.008}
          outer={0.008 + 0.01 * (1 + Math.sin(plume.age * 6) * 0.3)}
          segments={24}
        />
        <meshBasicMaterial
          color="#ff5a1f"
          transparent
          opacity={0.9 * fade}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

/** 소행성 충돌: 섬광 불덩이, 지표를 따라 퍼지는 충격파 고리, 버섯구름 */
function ImpactBurst({
  plume,
  position,
  quaternion,
}: {
  plume: PlumeInput
  position: Vector3
  quaternion: Quaternion
}) {
  const t = plume.age
  if (t > 25) return null
  const flash = Math.max(0, 1 - t / 1.5)
  const ball = Math.min(1, t / 1.2)
  const cool = Math.min(1, t / 6)
  const fade = Math.max(0, 1 - Math.max(0, t - 10) / 15)
  const size = 0.02 + plume.size * 0.16
  const ring = Math.min(1, t / 5) * size * 3
  const fireball = size * (0.3 + ball * 0.7)
  const cloud = size * (0.4 + cool * 0.8)
  const fireColor = `rgb(255, ${Math.round(200 - cool * 150)}, ${Math.round(80 - cool * 70)})`
  return (
    <group position={position} quaternion={quaternion}>
      <mesh scale={[fireball, fireball * (0.6 + ball * 0.6), fireball]}>
        <sphereGeometry args={[1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial
          color={fireColor}
          transparent
          opacity={(0.85 - cool * 0.45) * fade}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[0, size * (0.6 + cool * 1.4), 0]}
        scale={[cloud, cloud * 0.5, cloud]}
      >
        <sphereGeometry args={[1, 20, 12]} />
        <meshBasicMaterial
          color="#5f5249"
          transparent
          opacity={0.7 * cool * fade}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <Ring
          inner={Math.max(0.001, ring * 0.92)}
          outer={ring + 0.002}
          segments={48}
        />
        <meshBasicMaterial
          color="#ffd8a8"
          transparent
          opacity={Math.max(0, 1 - t / 5) * 0.9}
          toneMapped={false}
          side={2}
        />
      </mesh>
      {flash > 0 ? (
        <mesh>
          <sphereGeometry args={[size * 2.5, 16, 12]} />
          <meshBasicMaterial
            color="#fff6e0"
            transparent
            opacity={flash * 0.8}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </group>
  )
}

/** 지진: 멀리 퍼지는 지진파 고리 세 개와, 강한 흔들림 범위(주황 원) */
function QuakeRings({
  plume,
  position,
  quaternion,
}: {
  plume: PlumeInput
  position: Vector3
  quaternion: Quaternion
}) {
  const strong = Math.max(0.006, plume.size)
  const waveReach = 0.3 // 약 1,900km
  const area = Math.max(0, 1 - plume.age / 12)
  return (
    <group position={position} quaternion={quaternion}>
      {[0, 1, 2].map((k) => {
        const t = (plume.age - k * 0.8) / 3.5
        if (t < 0 || t > 1) return null
        const r = waveReach * t
        return (
          <mesh
            key={k}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.002, 0]}
          >
            <Ring
              inner={Math.max(0.0005, r - 0.004)}
              outer={r + 0.002}
              segments={96}
            />
            <meshBasicMaterial
              color="#ffd166"
              transparent
              opacity={(1 - t) * 0.85}
              toneMapped={false}
              side={2}
              depthWrite={false}
            />
          </mesh>
        )
      })}
      {area > 0 ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]}>
            <circleGeometry args={[strong, 64]} />
            <meshBasicMaterial
              color="#ff8a3d"
              transparent
              opacity={0.28 * area}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0016, 0]}>
            <ringGeometry args={[strong * 0.97, strong, 64]} />
            <meshBasicMaterial
              color="#ff8a3d"
              transparent
              opacity={0.9 * area}
              toneMapped={false}
              side={2}
              depthWrite={false}
            />
          </mesh>
        </>
      ) : null}
    </group>
  )
}
