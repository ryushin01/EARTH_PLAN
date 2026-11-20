import ReactThreeTestRenderer from '@react-three/test-renderer'
import { Matrix4, Vector3 } from 'three'
import type { InstancedMesh, LineSegments, Points } from 'three'
import { flightPlan, trafficConditions } from '../../model/traffic/disruption'
import { FLIGHT_ROUTES } from '../../model/traffic/routes'
import { useWorld } from '../../model/world/store'
import { Traffic } from './Traffic'

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>

const render = (reducedMotion = false) =>
  ReactThreeTestRenderer.create(<Traffic reducedMotion={reducedMotion} />)

const instanced = (renderer: Renderer) =>
  renderer.scene
    .findAll((node) =>
      Boolean((node.instance as { isInstancedMesh?: boolean }).isInstancedMesh),
    )
    .map((node) => node.instance as InstancedMesh)

const byName = (renderer: Renderer, name: string) =>
  instanced(renderer).find((mesh) => mesh.name === name)!

const matrices = (mesh: InstancedMesh) => Array.from(mesh.instanceMatrix.array)

describe('Traffic', () => {
  beforeEach(() => useWorld.getState().reset())

  it('종류마다 인스턴스 메시 하나로, 운항 데이터 수만큼 그린다', async () => {
    const renderer = await render()
    expect(
      Object.fromEntries(instanced(renderer).map((m) => [m.name, m.count])),
    ).toEqual({ airliner: 30, fighter: 4, carrier: 2, cruise: 5, container: 4 })
    await renderer.unmount()
  })

  it('프레임이 지나면 여객기와 배가 움직인다', async () => {
    const renderer = await render()
    await renderer.advanceFrames(1, 0.1)
    const before = [
      byName(renderer, 'airliner'),
      byName(renderer, 'container'),
    ].map(matrices)
    await renderer.advanceFrames(10, 0.1)
    expect(matrices(byName(renderer, 'airliner'))).not.toEqual(before[0])
    expect(matrices(byName(renderer, 'container'))).not.toEqual(before[1])
    await renderer.unmount()
  })

  it('동작 줄이기면 프레임이 지나도 그대로 있다', async () => {
    const renderer = await render(true)
    await renderer.advanceFrames(1, 0.1)
    const before = matrices(byName(renderer, 'airliner'))
    await renderer.advanceFrames(10, 0.1)
    expect(matrices(byName(renderer, 'airliner'))).toEqual(before)
    await renderer.unmount()
  })

  it('도시가 잠겨 결항된 노선의 여객기는 모두 크기 0으로 숨긴다', async () => {
    useWorld.getState().setSeaLevel(10)
    const conditions = trafficConditions(useWorld.getState(), performance.now())
    const renderer = await render(true)
    await renderer.advanceFrames(1, 0.1)
    const planes = byName(renderer, 'airliner')
    const m = new Matrix4()
    const scale = new Vector3()
    // 인스턴스 순서는 노선 순서 × 편 수
    let index = 0
    let cancelled = 0
    for (const route of FLIGHT_ROUTES)
      for (let k = 0; k < route.planes; k++, index++) {
        if (flightPlan(route, conditions).status !== 'cancelled') continue
        cancelled++
        planes.getMatrixAt(index, m)
        expect(scale.setFromMatrixScale(m).x, route.id).toBe(0)
      }
    expect(cancelled).toBeGreaterThanOrEqual(6)
    await renderer.unmount()
  })

  it('꼬리는 하늘과 바다 두 묶음의 선으로 그린다', async () => {
    const renderer = await render()
    await renderer.advanceFrames(2, 0.1)
    const lines = renderer.scene
      .findAll((node) => node.type === 'LineSegments')
      .map((node) => node.instance as LineSegments)
    expect(lines.map((l) => l.name).sort()).toEqual([
      'air-trails',
      'sea-trails',
    ])
    for (const line of lines)
      expect(line.geometry.drawRange.count).toBeGreaterThan(0)
    await renderer.unmount()
  })

  it('밤 쪽에 있는 탈것에만 불빛 점을 켠다', async () => {
    // 태양이 +X 쪽(경도 0°)에 있으면 x < 0 쪽이 밤
    const renderer = await ReactThreeTestRenderer.create(
      <>
        <group name="sun-light" position={[10, 0, 0]} />
        <Traffic reducedMotion />
      </>,
    )
    await renderer.advanceFrames(1, 0.1)
    const lights = renderer.scene.find(
      (node) => node.instance.name === 'night-lights',
    ).instance as Points
    const count = lights.geometry.drawRange.count
    expect(count).toBeGreaterThan(0)
    const position = lights.geometry.getAttribute('position')
    for (let i = 0; i < count; i++) {
      const x = position.getX(i)
      const r = Math.hypot(x, position.getY(i), position.getZ(i))
      expect(x / r).toBeLessThan(0.05)
    }
    await renderer.unmount()
  })

  it('언마운트하면 도형과 재질을 해제한다', async () => {
    const renderer = await render()
    const planes = byName(renderer, 'airliner')
    const geometry = vi.spyOn(planes.geometry, 'dispose')
    const material = vi.spyOn(
      planes.material as unknown as { dispose: () => void },
      'dispose',
    )
    await renderer.unmount()
    expect(geometry).toHaveBeenCalled()
    expect(material).toHaveBeenCalled()
  })
})
