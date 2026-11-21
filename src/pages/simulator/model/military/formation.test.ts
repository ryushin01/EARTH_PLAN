import {
  FLEET_SPACING,
  FLIGHT_FORMATIONS,
  FLIGHT_SPACING_M,
  blendOffsets,
  drillPhase,
  fleetSlots,
} from './formation'
import type { FleetRole, Offset } from './formation'

const dist = (a: Offset, b: Offset) => Math.hypot(a[0] - b[0], a[1] - b[1])

describe('전투기 편대 대형', () => {
  it('모든 대형은 4기이고, 어느 두 기도 500m보다 가깝지 않다', () => {
    for (const [name, slots] of Object.entries(FLIGHT_FORMATIONS)) {
      expect(slots, name).toHaveLength(4)
      for (let a = 0; a < 4; a++)
        for (let b = a + 1; b < 4; b++)
          expect(dist(slots[a], slots[b]), name).toBeGreaterThanOrEqual(500)
    }
  })

  it('핑거 포: 2번기는 편대장 왼쪽 뒤, 3·4번기는 오른쪽 뒤', () => {
    const [lead, two, three, four] = FLIGHT_FORMATIONS['finger-four']
    expect(lead).toEqual([0, 0])
    expect(two[0]).toBeLessThan(0)
    expect(two[1]).toBeLessThan(0)
    expect(three[0]).toBeGreaterThan(0)
    expect(four[0]).toBeGreaterThan(three[0])
    expect(four[1]).toBeLessThan(three[1])
  })

  it('에셜론은 45° 한 줄, 라인 어브레스트는 같은 앞뒤 위치, 트레일은 같은 좌우 위치', () => {
    for (const [x, y] of FLIGHT_FORMATIONS['echelon-right'])
      expect(x).toBeCloseTo(-y)
    for (const [, y] of FLIGHT_FORMATIONS['line-abreast']) expect(y).toBe(0)
    for (const [x] of FLIGHT_FORMATIONS.trail) expect(x).toBe(0)
    expect(FLIGHT_FORMATIONS['echelon-right'][1][0]).toBe(FLIGHT_SPACING_M)
  })
})

describe('함대 진형', () => {
  const roles: FleetRole[] = [
    'inner',
    'inner',
    'center',
    'inner',
    'inner',
    'outer',
    'outer',
  ]

  it('원형 진형: 중심함은 가운데, 호위함은 안쪽·바깥 원 위에', () => {
    const slots = fleetSlots('circular', roles)
    roles.forEach((role, k) => {
      const r = Math.hypot(...slots[k])
      if (role === 'center') expect(r).toBe(0)
      else
        expect(r).toBeCloseTo(
          role === 'inner' ? FLEET_SPACING.inner : FLEET_SPACING.outer,
        )
    })
  })

  it('종렬은 같은 간격으로 앞뒤 한 줄, 횡렬은 옆으로 한 줄 (중심함이 기준점)', () => {
    const column = fleetSlots('column', roles)
    const line = fleetSlots('line-abreast', roles)
    expect(column[2]).toEqual([0, 0])
    for (let k = 1; k < roles.length; k++) {
      expect(column[k - 1][1] - column[k][1]).toBe(FLEET_SPACING.line)
      expect(column[k][0]).toBe(0)
      expect(line[k][0] - line[k - 1][0]).toBe(FLEET_SPACING.line)
      expect(line[k][1]).toBe(0)
    }
  })
})

describe('진형 전환 훈련', () => {
  it('유지 시간 동안은 같은 진형, 그 뒤 다음 진형으로 옮긴다', () => {
    const seq = ['a', 'b', 'c'] as const
    expect(drillPhase(seq, 10, 4, 3)).toEqual({
      from: 'a',
      to: 'a',
      u: 0,
      untilNext: 7,
    })
    const moving = drillPhase(seq, 10, 4, 12)
    expect(moving.from).toBe('a')
    expect(moving.to).toBe('b')
    expect(moving.u).toBeCloseTo(0.5)
    // 마지막 진형 다음은 처음 진형
    expect(drillPhase(seq, 10, 4, 40).to).toBe('a')
    expect(drillPhase(seq, 10, 4, 42).from).toBe('a')
  })

  it('두 진형 사이 자리는 처음과 끝이 정확하다', () => {
    const a = FLIGHT_FORMATIONS['finger-four']
    const b = FLIGHT_FORMATIONS.trail
    expect(blendOffsets(a, b, 0)).toEqual(a)
    expect(blendOffsets(a, b, 1)).toEqual(b)
    const mid = blendOffsets(a, b, 0.5)
    expect(mid[1][0]).toBeCloseTo((a[1][0] + b[1][0]) / 2)
  })
})
