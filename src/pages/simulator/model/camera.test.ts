import { MAX_DISTANCE, MIN_DISTANCE, orbitPosition } from './camera'

describe('orbitPosition', () => {
  it('거리를 유지한 채 돌린다', () => {
    const next = orbitPosition([0, 0, 3], Math.PI / 2, 0)
    expect(Math.hypot(...next)).toBeCloseTo(3)
    expect(next[0]).toBeCloseTo(3)
  })

  it('극을 넘어가지 않고 확대 범위를 지킨다', () => {
    const top = orbitPosition([0, 0, 3], 0, -10)
    expect(top[1]).toBeLessThan(3)
    expect(Math.hypot(...orbitPosition([0, 0, 3], 0, 0, 0.01))).toBeCloseTo(
      MIN_DISTANCE,
    )
    expect(Math.hypot(...orbitPosition([0, 0, 3], 0, 0, 100))).toBeCloseTo(
      MAX_DISTANCE,
    )
  })
})
