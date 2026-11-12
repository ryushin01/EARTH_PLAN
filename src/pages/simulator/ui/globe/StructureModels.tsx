import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Quaternion, Vector3 } from 'three'
import type { Group } from 'three'
import { latLonToVector3 } from '@/shared/lib'
import type { LatLon } from '@/shared/lib'
import type { BuiltStructure } from '../../model/structure/types'

const UP = new Vector3(0, 1, 0)

interface StructureModelsProps {
  structures: BuiltStructure[]
  /** 완공되어 가동 중인 구조물 id */
  activeIds: string[]
  /** 지점 id → 좌표 */
  locate: (siteId: string) => LatLon | undefined
}

function Model({
  structure,
  active,
}: {
  structure: BuiltStructure
  active: boolean
}) {
  const color = active ? '#00a1ff' : '#fc6a18'
  const opacity = active ? 1 : 0.55
  switch (structure.kind) {
    case 'sea-wall':
      return (
        <mesh position={[0, 0.006, 0]}>
          <torusGeometry args={[0.03, 0.004, 4, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
            transparent
            opacity={opacity}
          />
        </mesh>
      )
    case 'tsunami-barrier':
      return (
        <mesh position={[0, 0.008, 0]}>
          <cylinderGeometry
            args={[0.04, 0.04, 0.012, 32, 1, true, 0, Math.PI]}
          />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            transparent
            opacity={opacity * 0.8}
            side={2}
          />
        </mesh>
      )
    case 'strait-dam':
      return (
        <mesh position={[0, 0.008, 0]}>
          <boxGeometry args={[0.16, 0.014, 0.012]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            transparent
            opacity={opacity}
          />
        </mesh>
      )
    case 'glacier-curtain':
      return (
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[0.12, 0.02, 0.003]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.4}
            transparent
            opacity={opacity * 0.85}
          />
        </mesh>
      )
    case 'magma-relief':
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh
              key={i}
              position={[
                Math.cos((i * 2 * Math.PI) / 3) * 0.022,
                0.02,
                Math.sin((i * 2 * Math.PI) / 3) * 0.022,
              ]}
            >
              <cylinderGeometry args={[0.002, 0.002, 0.04, 6]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.6}
                transparent
                opacity={opacity}
              />
            </mesh>
          ))}
        </group>
      )
    case 'firefighting-base':
      return (
        <group>
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[0.014, 0.02, 0.014]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.5}
              transparent
              opacity={opacity}
            />
          </mesh>
          <mesh position={[0.02, 0.006, 0]}>
            <boxGeometry args={[0.02, 0.004, 0.006]} />
            <meshStandardMaterial
              color="#ff6b6b"
              emissive="#ff6b6b"
              emissiveIntensity={0.4}
              transparent
              opacity={opacity}
            />
          </mesh>
        </group>
      )
    case 'desalination':
      return (
        <group>
          {[-0.012, 0.012].map((x) => (
            <mesh key={x} position={[x, 0.008, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.016, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.5}
                transparent
                opacity={opacity}
              />
            </mesh>
          ))}
          <mesh position={[0, 0.002, 0.03]}>
            <boxGeometry args={[0.004, 0.002, 0.05]} />
            <meshStandardMaterial
              color="#9fd8ff"
              transparent
              opacity={opacity}
            />
          </mesh>
        </group>
      )
    case 'seismic-retrofit':
      return (
        <group>
          {[-0.008, 0.008].map((x) => (
            <mesh key={x} position={[x, 0.012, 0]}>
              <boxGeometry args={[0.006, 0.024, 0.006]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.5}
                transparent
                opacity={opacity}
              />
            </mesh>
          ))}
          <mesh position={[0, 0.012, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.024, 0.003, 0.004]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.5}
              transparent
              opacity={opacity}
            />
          </mesh>
        </group>
      )
    case 'solar-shade':
    case 'planetary-defense':
    case 'carbon-capture':
    case 'renewable-transition':
      return null
  }
}

/** 지구 둘레를 도는 행성 방위 요격 위성 */
function DefenseSatellites({ active }: { active: boolean }) {
  const ref = useRef<Group>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.25
  })
  const color = active ? '#00a1ff' : '#fc6a18'
  return (
    <group ref={ref} rotation={[0.45, 0, 0.2]}>
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2
        return (
          <mesh key={i} position={[Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35]}>
            <octahedronGeometry args={[0.018]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        )
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.35, 0.0015, 4, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
    </group>
  )
}

/** 태양 쪽을 향해 지구 밖에 떠 있는 우주 차양 */
function SolarShade({ active }: { active: boolean }) {
  const ref = useRef<Group>(null)
  useFrame(({ scene }) => {
    const sun = scene.getObjectByName('sun-light')
    if (sun && ref.current) {
      ref.current.position.copy(sun.position).normalize().multiplyScalar(1.9)
      ref.current.lookAt(0, 0, 0)
    }
  })
  return (
    <group ref={ref}>
      <mesh>
        <circleGeometry args={[0.22, 6]} />
        <meshStandardMaterial
          color={active ? '#9fd8ff' : '#fc6a18'}
          emissive={active ? '#00a1ff' : '#fc6a18'}
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={active ? 0.55 : 0.35}
          side={2}
        />
      </mesh>
    </group>
  )
}

export function StructureModels({
  structures,
  activeIds,
  locate,
}: StructureModelsProps) {
  const placed = useMemo(
    () =>
      structures.flatMap((structure) => {
        if (
          structure.kind === 'solar-shade' ||
          structure.kind === 'carbon-capture' ||
          structure.kind === 'renewable-transition' ||
          structure.kind === 'planetary-defense'
        )
          return []
        const at = locate(structure.siteId)
        if (!at) return []
        const [x, y, z] = latLonToVector3(at, 1.003)
        const quaternion = new Quaternion().setFromUnitVectors(
          UP,
          new Vector3(x, y, z).normalize(),
        )
        return [{ structure, position: [x, y, z] as const, quaternion }]
      }),
    [structures, locate],
  )
  const shade = structures.find((s) => s.kind === 'solar-shade')
  const defense = structures.find((s) => s.kind === 'planetary-defense')

  return (
    <group>
      {placed.map(({ structure, position, quaternion }) => (
        <group key={structure.id} position={position} quaternion={quaternion}>
          <Model
            structure={structure}
            active={activeIds.includes(structure.id)}
          />
        </group>
      ))}
      {shade ? <SolarShade active={activeIds.includes(shade.id)} /> : null}
      {defense ? (
        <DefenseSatellites active={activeIds.includes(defense.id)} />
      ) : null}
    </group>
  )
}
