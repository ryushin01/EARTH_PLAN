import { useEffect, useLayoutEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color } from 'three'
import { getSite } from '../../model/site/data'
import { flowArc } from '../../model/migration/arcs'
import type { MigrationFlow } from '../../model/migration/flows'
import { useMigrationFlows } from '../useMigrationFlows'

/** 호를 나누는 구간 수 */
export const ARC_SEGMENTS = 24
/** 점이 호를 한 번 지나는 데 걸리는 화면 시간 (초) */
const TRIP_SECONDS = 12
const COLORS = {
  sea: new Color('#5ad1e6'),
  disaster: new Color('#ff9f43'),
} as const

/** 흐름마다 움직이는 점 수: 많이 옮겨 갈수록 많이 (1~6개) */
export function particleCount(millions: number): number {
  return Math.min(6, 1 + Math.floor(Math.log2(1 + millions)))
}

/** 인구 이동: 떠나는 도시에서 가까운 안전한 도시로 가는 호와 그 위를 움직이는 점 */
export function MigrationLayer({ reducedMotion }: { reducedMotion: boolean }) {
  const flows = useMigrationFlows()
  return flows.length ? (
    <MigrationArcs flows={flows} reducedMotion={reducedMotion} />
  ) : null
}

export function MigrationArcs({
  flows,
  reducedMotion,
}: {
  flows: readonly MigrationFlow[]
  reducedMotion: boolean
}) {
  const { lines, points, paths, particles } = useMemo(() => {
    const arcPaths = flows.map((flow) =>
      flowArc(getSite(flow.from)!, getSite(flow.to)!, ARC_SEGMENTS),
    )
    const linePositions = new Float32Array(arcPaths.length * ARC_SEGMENTS * 6)
    const lineColors = new Float32Array(linePositions.length)
    arcPaths.forEach((path, f) => {
      const color = COLORS[flows[f].kind]
      for (let s = 0; s < ARC_SEGMENTS; s++)
        for (const [k, p] of [path[s], path[s + 1]].entries()) {
          const at = ((f * ARC_SEGMENTS + s) * 2 + k) * 3
          linePositions.set(p, at)
          lineColors.set([color.r, color.g, color.b], at)
        }
    })
    const lineGeometry = new BufferGeometry()
    lineGeometry.setAttribute('position', new BufferAttribute(linePositions, 3))
    lineGeometry.setAttribute('color', new BufferAttribute(lineColors, 3))

    const moving = flows.flatMap((flow, f) => {
      const n = particleCount(flow.millions)
      return Array.from({ length: n }, (_, k) => ({ path: f, offset: k / n }))
    })
    const pointColors = new Float32Array(moving.length * 3)
    moving.forEach((p, i) => {
      const color = COLORS[flows[p.path].kind]
      pointColors.set([color.r, color.g, color.b], i * 3)
    })
    const pointGeometry = new BufferGeometry()
    pointGeometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(moving.length * 3), 3),
    )
    pointGeometry.setAttribute('color', new BufferAttribute(pointColors, 3))
    return {
      lines: lineGeometry,
      points: pointGeometry,
      paths: arcPaths,
      particles: moving,
    }
  }, [flows])

  useEffect(
    () => () => {
      lines.dispose()
      points.dispose()
    },
    [lines, points],
  )

  /** 점을 호 위 t(0~1) 자리에. 동작 줄이기면 가운데에 멈춰 둠 */
  const place = (seconds: number) => {
    const position = points.getAttribute('position') as BufferAttribute
    particles.forEach((p, i) => {
      const t = reducedMotion ? 0.5 : (seconds / TRIP_SECONDS + p.offset) % 1
      const path = paths[p.path]
      const x = t * ARC_SEGMENTS
      const j = Math.min(ARC_SEGMENTS - 1, Math.floor(x))
      const u = x - j
      const a = path[j]
      const b = path[j + 1]
      position.setXYZ(
        i,
        a[0] + (b[0] - a[0]) * u,
        a[1] + (b[1] - a[1]) * u,
        a[2] + (b[2] - a[2]) * u,
      )
    })
    position.needsUpdate = true
  }
  useLayoutEffect(() => place(0))
  useFrame(({ clock }) => {
    if (!reducedMotion) place(clock.elapsedTime)
  })

  return (
    <group name="migration">
      <lineSegments geometry={lines}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.55}
          toneMapped={false}
          depthWrite={false}
        />
      </lineSegments>
      <points geometry={points}>
        <pointsMaterial
          vertexColors
          size={0.014}
          sizeAttenuation
          transparent
          toneMapped={false}
          depthWrite={false}
        />
      </points>
    </group>
  )
}
