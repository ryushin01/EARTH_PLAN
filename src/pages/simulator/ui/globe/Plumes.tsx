import { useMemo } from 'react'
import { Quaternion, Vector3 } from 'three'
import type { PlumeInput } from '../../model/planet'

const UP = new Vector3(0, 1, 0)

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
  return (
    <group position={position} quaternion={quaternion}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry
          args={[plume.size * 0.035 * grow + 0.004, 0.006, height, 16, 1, true]}
        />
        <meshBasicMaterial
          color="#5b5550"
          transparent
          opacity={0.7 * fade}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, height, 0]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[plume.size * 0.06 * grow + 0.008, 20, 12]} />
        <meshBasicMaterial
          color="#6d655f"
          transparent
          opacity={0.65 * fade}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry
          args={[0.008, 0.008 + 0.01 * (1 + Math.sin(plume.age * 6) * 0.3), 24]}
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
  const fireColor = `rgb(255, ${Math.round(200 - cool * 150)}, ${Math.round(80 - cool * 70)})`
  return (
    <group position={position} quaternion={quaternion}>
      <mesh scale={[1, 0.6 + ball * 0.6, 1]}>
        <sphereGeometry
          args={[
            size * (0.3 + ball * 0.7),
            24,
            16,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          ]}
        />
        <meshBasicMaterial
          color={fireColor}
          transparent
          opacity={(0.85 - cool * 0.45) * fade}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, size * (0.6 + cool * 1.4), 0]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[size * (0.4 + cool * 0.8), 20, 12]} />
        <meshBasicMaterial
          color="#5f5249"
          transparent
          opacity={0.7 * cool * fade}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[Math.max(0.001, ring * 0.92), ring + 0.002, 48]} />
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
            <ringGeometry args={[Math.max(0.0005, r - 0.004), r + 0.002, 96]} />
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
