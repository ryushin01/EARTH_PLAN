import { latLonToVector3 } from '@/shared/lib'
import { arcLift, flowArc } from './arcs'

const len = (v: readonly number[]) => Math.hypot(v[0], v[1], v[2])
const dot = (a: readonly number[], b: readonly number[]) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

describe('인구 이동 호', () => {
  const dhaka = { lat: 23.81, lon: 90.41 }
  const delhi = { lat: 28.61, lon: 77.21 }

  it('양 끝은 두 도시의 지표면 바로 위, 가운데는 떠오른다', () => {
    const arc = flowArc(dhaka, delhi, 16)
    expect(arc).toHaveLength(17)
    const a = latLonToVector3(dhaka)
    const b = latLonToVector3(delhi)
    expect(dot(arc[0], a) / len(arc[0])).toBeCloseTo(1, 6)
    expect(dot(arc[16], b) / len(arc[16])).toBeCloseTo(1, 6)
    expect(len(arc[0])).toBeCloseTo(1.004, 6)
    expect(len(arc[8])).toBeGreaterThan(len(arc[0]))
  })

  it('중간 점들은 두 도시를 잇는 대권 평면 위에 있다', () => {
    const a = latLonToVector3(dhaka)
    const b = latLonToVector3(delhi)
    const n = [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ]
    for (const p of flowArc(dhaka, delhi, 8))
      expect(dot(p, n) / len(p) / len(n)).toBeCloseTo(0, 6)
  })

  it('멀리 갈수록 높이 떠오른다', () => {
    expect(arcLift(Math.PI / 2)).toBeGreaterThan(arcLift(0.1))
  })
})
