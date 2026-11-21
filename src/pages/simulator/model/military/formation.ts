/**
 * 편대·함대 진형. 자리는 기준기(편대장·기준함)에서 본 실제 거리(m)로 적습니다: [오른쪽, 앞쪽].
 * 화면에서는 지구 규모에서 보이도록 FORMATION_SPREAD배로 벌려 그립니다.
 */

export type Offset = [right: number, forward: number]

export type FlightFormation =
  'finger-four' | 'echelon-right' | 'line-abreast' | 'trail' | 'diamond'

export type FleetFormation = 'circular' | 'column' | 'line-abreast'

/** 전투기 편대 기본 간격 (m): 전술 대형에서 윙맨이 편대장에게서 떨어지는 거리 */
export const FLIGHT_SPACING_M = 1000

const d = FLIGHT_SPACING_M

/** 4기 편대 자리 (1번기가 편대장) */
export const FLIGHT_FORMATIONS: Record<FlightFormation, Offset[]> = {
  // 오른손 손가락 끝 모양: 2번기는 왼쪽 뒤, 3·4번기(2분대)는 오른쪽 뒤로 비스듬히
  'finger-four': [
    [0, 0],
    [-d, -d],
    [1.5 * d, -d],
    [2.5 * d, -2 * d],
  ],
  // 오른쪽 뒤 45°로 한 줄
  'echelon-right': [
    [0, 0],
    [d, -d],
    [2 * d, -2 * d],
    [3 * d, -3 * d],
  ],
  // 나란히 옆으로 (서로 뒤를 살피는 전술 횡대)
  'line-abreast': [
    [-2.25 * d, 0],
    [-0.75 * d, 0],
    [0.75 * d, 0],
    [2.25 * d, 0],
  ],
  // 한 줄로 앞뒤
  trail: [
    [0, 0],
    [0, -1.2 * d],
    [0, -2.4 * d],
    [0, -3.6 * d],
  ],
  // 마름모: 4번기가 편대장 바로 뒤
  diamond: [
    [0, 0],
    [-d, -d],
    [d, -d],
    [0, -2 * d],
  ],
}

/** 함대 진형 간격 (m) */
export const FLEET_SPACING = {
  /** 종렬·횡렬에서 이웃한 배 사이 */
  line: 1500,
  /** 원형 진형 안쪽 원 (순양함·구축함) */
  inner: 2500,
  /** 원형 진형 바깥 원 (호위함·잠수함) */
  outer: 4500,
} as const

/** 함대 진형 안에서의 역할 */
export type FleetRole = 'center' | 'inner' | 'outer'

/**
 * 함대 진형 자리. roles 순서대로 배 하나씩 자리를 줌.
 * 원형: 중심함(항공모함·전함) 둘레에 안쪽 원·바깥 원으로 고르게 (안쪽은 정면부터, 바깥은 반 칸 돌려서).
 * 종렬·횡렬: 주어진 순서대로 한 줄, 중심함이 기준점(0, 0)에 오도록 밀어 둠
 */
export function fleetSlots(
  formation: FleetFormation,
  roles: FleetRole[],
): Offset[] {
  if (formation === 'circular') {
    const inner = roles.filter((r) => r === 'inner').length
    const outer = roles.filter((r) => r === 'outer').length
    let ki = 0
    let ko = 0
    return roles.map((role): Offset => {
      if (role === 'center') return [0, 0]
      const ring = role === 'inner'
      const n = ring ? inner : outer
      const k = ring ? ki++ : ko++
      const angle = ((k + (ring ? 0 : 0.5)) / n) * 2 * Math.PI
      const r = ring ? FLEET_SPACING.inner : FLEET_SPACING.outer
      return [r * Math.sin(angle), r * Math.cos(angle)]
    })
  }
  const center = Math.max(0, roles.indexOf('center'))
  return roles.map((_, k): Offset => {
    const along = (center - k) * FLEET_SPACING.line
    return formation === 'column' ? [0, along] : [-along, 0]
  })
}

/** 두 진형 사이를 u(0~1)만큼 부드럽게 옮긴 자리 */
export function blendOffsets(
  a: Offset[],
  b: Offset[],
  u: number,
  out: Offset[] = [],
): Offset[] {
  const t = Math.min(1, Math.max(0, u))
  const e = t * t * (3 - 2 * t)
  for (let k = 0; k < a.length; k++) {
    out[k] ??= [0, 0]
    out[k][0] = a[k][0] + (b[k][0] - a[k][0]) * e
    out[k][1] = a[k][1] + (b[k][1] - a[k][1]) * e
  }
  out.length = a.length
  return out
}

export interface DrillPhase<TName extends string> {
  /** 지금(또는 바꾸기 전) 진형 */
  from: TName
  /** 바꾸는 중이면 다음 진형, 아니면 from과 같음 */
  to: TName
  /** 바꾸는 진행률 (0~1) */
  u: number
  /** 다음 진형 전환까지 남은 시간 (초, 바꾸는 중이면 0) */
  untilNext: number
}

/**
 * 진형 전환 훈련: 진형마다 holdS초 유지한 뒤 changeS초 동안 다음 진형으로 옮김 (목록을 되풀이)
 */
export function drillPhase<TName extends string>(
  sequence: readonly TName[],
  holdS: number,
  changeS: number,
  tSec: number,
): DrillPhase<TName> {
  const step = holdS + changeS
  const cycle = step * sequence.length
  const t = ((tSec % cycle) + cycle) % cycle
  const k = Math.floor(t / step)
  const inStep = t - k * step
  const from = sequence[k]
  if (inStep < holdS) return { from, to: from, u: 0, untilNext: holdS - inStep }
  return {
    from,
    to: sequence[(k + 1) % sequence.length],
    u: (inStep - holdS) / changeS,
    untilNext: 0,
  }
}
