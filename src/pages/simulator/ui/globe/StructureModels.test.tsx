import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { Mesh, MeshStandardMaterial } from 'three'
import { getSite } from '../../model/site/data'
import type { BuiltStructure } from '../../model/structure/types'
import { StructureModels } from './StructureModels'

const built = (
  kind: BuiltStructure['kind'],
  siteId: string,
): BuiltStructure => ({
  id: `${kind}-${siteId}`,
  kind,
  siteId,
  startYear: 2026,
  completeYear: 2030,
})

async function render(
  structures: BuiltStructure[],
  activeIds: string[] = [],
  withSun = false,
) {
  return ReactThreeTestRenderer.create(
    <>
      {withSun ? <group name="sun-light" position={[10, 0, 0]} /> : null}
      <StructureModels
        structures={structures}
        activeIds={activeIds}
        locate={getSite}
      />
    </>,
  )
}

const geometries = (
  renderer: Awaited<ReturnType<typeof render>>,
  type: string,
) =>
  renderer.scene.findAll(
    (node) =>
      node.type === 'Mesh' && (node.instance as Mesh).geometry.type === type,
  )

describe('StructureModels', () => {
  it('도시 구조물은 그 도시 지표면 위에 놓인다', async () => {
    const renderer = await render([built('sea-wall', 'tokyo')])
    const [ring] = geometries(renderer, 'TorusGeometry')
    const group = ring.parent!
    expect(group.instance.position.length()).toBeCloseTo(1.003)
    await renderer.unmount()
  })

  it('완공 전에는 주황, 가동 중에는 하늘색이다', async () => {
    const wall = built('sea-wall', 'tokyo')
    const color = async (activeIds: string[]) => {
      const renderer = await render([wall], activeIds)
      const [ring] = geometries(renderer, 'TorusGeometry')
      const hex = (
        (ring.instance as Mesh).material as MeshStandardMaterial
      ).color.getHexString()
      await renderer.unmount()
      return hex
    }
    expect(await color([])).toBe('fc6a18')
    expect(await color([wall.id])).toBe('00a1ff')
  })

  it('없는 지점이나 위치가 없는 정책은 지표면에 그리지 않는다', async () => {
    const renderer = await render([
      built('sea-wall', 'nowhere'),
      built('carbon-capture', 'global'),
      built('renewable-transition', 'global'),
    ])
    expect(renderer.scene.findAll((node) => node.type === 'Mesh')).toHaveLength(
      0,
    )
    await renderer.unmount()
  })

  it('우주 차양은 태양 쪽 지구 밖에 떠 있다', async () => {
    const renderer = await render([built('solar-shade', 'orbit')], [], true)
    await renderer.advanceFrames(1, 0.016)
    const [shade] = geometries(renderer, 'CircleGeometry')
    const position = shade.parent!.instance.position
    expect(position.x).toBeCloseTo(1.9)
    expect(Math.abs(position.y) + Math.abs(position.z)).toBeCloseTo(0)
    await renderer.unmount()
  })

  it('행성 방위 요격 위성 4기가 궤도를 돈다', async () => {
    const renderer = await render([built('planetary-defense', 'orbit')])
    const satellites = geometries(renderer, 'OctahedronGeometry')
    expect(satellites).toHaveLength(4)
    expect(satellites[0].instance.position.length()).toBeCloseTo(1.35)
    const orbit = satellites[0].parent!.instance
    const before = orbit.rotation.y
    await renderer.advanceFrames(10, 0.1)
    expect(orbit.rotation.y - before).toBeCloseTo(0.25)
    await renderer.unmount()
  })
})
