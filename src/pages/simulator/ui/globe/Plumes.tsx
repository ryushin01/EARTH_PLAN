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
