import ReactThreeTestRenderer from '@react-three/test-renderer'
import { Color, Matrix4, Quaternion, Vector3 } from 'three'
import type { InstancedMesh } from 'three'
import type { TodayQuake } from '../../model/today/today'
import { TodayLayer, quakeSize } from './TodayLayer'

const quake = (
  id: string,
  mag: number,
  time: number,
  lat = 0,
  lon = 0,
): TodayQuake => ({
  id,
  time,
  mag,
  depthKm: 10,
  lat,
  lon,
  place: id,
  tsunami: false,
})

describe('TodayLayer', () => {
  const now = Date.parse('2026-11-20T21:00:00Z')

  it('지진마다 지구 표면에 점 하나, 규모가 클수록 크게, 최근 24시간은 다른 색', async () => {
    const quakes = [
      quake('recent', 6.6, now - 3_600_000, -6.02, 131.46),
      quake('old', 4.6, now - 5 * 86_400_000, 35, 139),
    ]
    const renderer = await ReactThreeTestRenderer.create(
      <TodayLayer quakes={quakes} now={now} />,
    )
    const mesh = renderer.scene.findByProps({ name: 'today-quakes' })
      .instance as InstancedMesh
    expect(mesh.count).toBe(2)
    const at = (i: number) => {
      const m = new Matrix4()
      mesh.getMatrixAt(i, m)
      const position = new Vector3()
      const scale = new Vector3()
      m.decompose(position, new Quaternion(), scale)
      return { position, scale }
    }
    // 표면 바로 위 (반지름 1보다 조금 큼)
    expect(at(0).position.length()).toBeGreaterThan(1)
    expect(at(0).position.length()).toBeLessThan(1.01)
    expect(at(0).scale.x).toBeCloseTo(quakeSize(6.6))
    expect(quakeSize(6.6)).toBeGreaterThan(quakeSize(4.6))
    const color = (i: number) => {
      const c = new Color()
      mesh.getColorAt(i, c)
      return c.getHexString()
    }
    expect(color(0)).not.toBe(color(1))
    await renderer.unmount()
  })
})
