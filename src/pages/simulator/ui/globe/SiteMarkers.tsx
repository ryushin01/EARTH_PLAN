import { useMemo, useState } from 'react'
import { Html } from '@react-three/drei'
import { Quaternion, Vector3 } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { latLonToVector3 } from '@/shared/lib'
import type { Site, SiteKind } from '../../model/site/types'

export type MarkerTone = 'normal' | 'safe' | 'warn' | 'danger' | 'protected'

const TONE_COLOR: Record<MarkerTone, string> = {
  normal: '#daf2ff',
  safe: '#3ddc97',
  warn: '#fc6a18',
  danger: '#ff4d4d',
  protected: '#00a1ff',
}

const UP = new Vector3(0, 1, 0)

function Shape({ kind }: { kind: SiteKind }) {
  switch (kind) {
    case 'city':
      return <boxGeometry args={[0.012, 0.012, 0.012]} />
    case 'volcano':
      return <coneGeometry args={[0.011, 0.026, 12]} />
    case 'trench':
      return <torusGeometry args={[0.014, 0.0028, 6, 20]} />
    case 'strait':
      return <octahedronGeometry args={[0.013]} />
    case 'glacier':
      return <tetrahedronGeometry args={[0.014]} />
    case 'region':
      return <cylinderGeometry args={[0.014, 0.014, 0.003, 6]} />
    case 'ocean':
      return <sphereGeometry args={[0.008, 10, 8]} />
    case 'fault':
      return <boxGeometry args={[0.026, 0.004, 0.006]} />
  }
}

interface SiteMarkersProps {
  sites: Site[]
  selectedId: string | null
  tones?: Partial<Record<string, MarkerTone>>
  onSelect?: (id: string) => void
}

/** 지구 표면 위 지점 표시 (뒤쪽은 지구에 가려 보이지 않음) */
export function SiteMarkers({
  sites,
  selectedId,
  tones = {},
  onSelect,
}: SiteMarkersProps) {
  const [hoverId, setHoverId] = useState<string | null>(null)

  const placed = useMemo(
    () =>
      sites.map((site) => {
        const [x, y, z] = latLonToVector3(site, 1.006)
        const normal = new Vector3(x, y, z).normalize()
        const quaternion = new Quaternion().setFromUnitVectors(UP, normal)
        return { site, position: [x, y, z] as const, quaternion }
      }),
    [sites],
  )

  const labelId = hoverId ?? selectedId

  return (
    <group>
      {placed.map(({ site, position, quaternion }) => {
        const selected = site.id === selectedId
        const tone = tones[site.id] ?? 'normal'
        const color = selected ? '#00a1ff' : TONE_COLOR[tone]
        const scale = selected ? 1.8 : site.id === hoverId ? 1.4 : 1
        return (
          <mesh
            key={site.id}
            position={position}
            quaternion={quaternion}
            scale={scale}
            onClick={(event: ThreeEvent<MouseEvent>) => {
              event.stopPropagation()
              onSelect?.(site.id)
            }}
            onPointerOver={(event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation()
              setHoverId(site.id)
              document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              setHoverId((id) => (id === site.id ? null : id))
              document.body.style.cursor = ''
            }}
          >
            <Shape kind={site.kind} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        )
      })}
      {labelId
        ? placed
            .filter(({ site }) => site.id === labelId)
            .map(({ site, position }) => (
              <Html
                key={site.id}
                position={position}
                center={false}
                zIndexRange={[20, 0]}
                occlude={false}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none ml-3 -mt-3 whitespace-nowrap rounded-xs border border-line-strong bg-panel px-2 py-1 font-display text-xs font-semibold uppercase tracking-[0.04em] text-ice"
                >
                  {site.name}
                </div>
              </Html>
            ))
        : null}
    </group>
  )
}
