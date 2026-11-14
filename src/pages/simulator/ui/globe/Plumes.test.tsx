import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { Mesh } from 'three'
import type { PlumeInput } from '../../model/planet'
import { Plumes } from './Plumes'

const at = (kind: PlumeInput['kind'], age: number, size = 0.5): PlumeInput => ({
  id: `${kind}-${age}`,
  kind,
  center: [0, 1, 0],
  age,
  size,
})

async function meshes(plume: PlumeInput) {
  const renderer = await ReactThreeTestRenderer.create(
    <Plumes plumes={[plume]} />,
  )
  const found = renderer.scene.findAll((node) => node.type === 'Mesh')
  await renderer.unmount()
  return found.map((node) => node.instance as Mesh)
}

describe('Plumes', () => {
  it('분출 지점의 지표 바로 위에 놓인다', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Plumes plumes={[at('volcano', 2)]} />,
    )
    const [group] = renderer.scene.children[0].children
    expect(group.instance.position.length()).toBeCloseTo(1.004)
    await renderer.unmount()
  })

  it('화산 분출 기둥은 기둥·화산재·분화구 고리로 그리고, 시간이 지나면 사라진다', async () => {
    expect(await meshes(at('volcano', 2))).toHaveLength(3)
    expect(await meshes(at('volcano', 25))).toHaveLength(0)
  })

  it('소행성 충돌은 처음에만 섬광이 있고 25초 뒤 사라진다', async () => {
    expect(await meshes(at('impact', 0.5))).toHaveLength(4)
    expect(await meshes(at('impact', 3))).toHaveLength(3)
    expect(await meshes(at('impact', 30))).toHaveLength(0)
  })

  it('지진파 고리는 시간차를 두고 퍼지고, 흔들림 범위는 12초 뒤 사라진다', async () => {
    // 1초: 고리 2개(0초·0.8초 출발) + 흔들림 범위 원·테두리
    expect(await meshes(at('quake', 1, 0.02))).toHaveLength(4)
    // 3초: 고리 3개 + 범위 2개
    expect(await meshes(at('quake', 3, 0.02))).toHaveLength(5)
    expect(await meshes(at('quake', 13, 0.02))).toHaveLength(0)
  })
})
