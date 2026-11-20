import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { BufferGeometry, LineSegments, Points } from 'three'
import { Vector3 } from 'three'
import type { MigrationFlow } from '../../model/migration/flows'
import { flowArc } from '../../model/migration/arcs'
import { getSite } from '../../model/site/data'
import { ARC_SEGMENTS, MigrationArcs, particleCount } from './MigrationLayer'

const flows: MigrationFlow[] = [
  { from: 'dhaka', to: 'kolkata', millions: 12, kind: 'sea' },
  { from: 'tokyo', to: 'osaka', millions: 0.4, kind: 'disaster' },
]

describe('MigrationArcs', () => {
  it('흐름마다 호 하나와 옮겨 가는 인구에 따른 점들을 그린다', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <MigrationArcs flows={flows} reducedMotion />,
    )
    const group = renderer.scene.findByProps({ name: 'migration' })
    const lines = group.findByType('LineSegments').instance as LineSegments
    const points = group.findByType('Points').instance as Points
    const count = (g: BufferGeometry) => g.getAttribute('position').count
    expect(count(lines.geometry)).toBe(flows.length * ARC_SEGMENTS * 2)
    expect(count(points.geometry)).toBe(particleCount(12) + particleCount(0.4))
    expect(particleCount(12)).toBeGreaterThan(particleCount(0.4))
    // 동작 줄이기면 점은 호 가운데에 멈춰 있음
    const middle = flowArc(
      getSite('dhaka')!,
      getSite('kolkata')!,
      ARC_SEGMENTS,
    )[ARC_SEGMENTS / 2]
    const first = new Vector3().fromBufferAttribute(
      points.geometry.getAttribute('position'),
      0,
    )
    expect(first.distanceTo(new Vector3(...middle))).toBeLessThan(1e-6)
    await renderer.unmount()
  })
})
