export type StructureKind =
  | 'sea-wall'
  | 'tsunami-barrier'
  | 'strait-dam'
  | 'glacier-curtain'
  | 'magma-relief'
  | 'solar-shade'

export type StructureTarget =
  'city' | 'strait' | 'glacier' | 'volcano' | 'orbit'

export interface StructureSpec {
  kind: StructureKind
  name: string
  summary: string
  target: StructureTarget
  /** 비용 (십억 달러) */
  cost: number
  /** 건설 기간 (년) */
  buildYears: number
  /** 막아 주는 해수면 상승 높이 (m) */
  seaProtection?: number
  /** 막아 주는 쓰나미 높이 (m) */
  waveProtection?: number
  /** 해수면 상승 속도 감소율 (0~1) */
  riseReduction?: number
  /** 지구 평균기온 감소 (°C) */
  cooling?: number
  /** 화산폭발지수 감소 */
  veiReduction?: number
}

export const STRUCTURES: Record<StructureKind, StructureSpec> = {
  'sea-wall': {
    kind: 'sea-wall',
    name: '해안 방조제',
    summary:
      '도시 해안선을 따라 쌓는 제방. 해수면 상승 8m와 쓰나미 4m까지 막습니다.',
    target: 'city',
    cost: 40,
    buildYears: 3,
    seaProtection: 8,
    waveProtection: 4,
  },
  'tsunami-barrier': {
    kind: 'tsunami-barrier',
    name: '쓰나미 방벽',
    summary: '높이 15m의 방파 장벽과 수문. 쓰나미 15m까지 막습니다.',
    target: 'city',
    cost: 25,
    buildYears: 2,
    waveProtection: 15,
  },
  'strait-dam': {
    kind: 'strait-dam',
    name: '해협 차단 댐',
    summary:
      '바다 입구를 통째로 막아 안쪽 해안 도시를 해수면 상승 60m까지 지킵니다.',
    target: 'strait',
    cost: 500,
    buildYears: 8,
    seaProtection: 60,
  },
  'glacier-curtain': {
    kind: 'glacier-curtain',
    name: '빙하 해저 커튼',
    summary:
      '빙하 아래로 들어오는 따뜻한 바닷물을 막아 해수면 상승 속도를 12% 늦춥니다.',
    target: 'glacier',
    cost: 300,
    buildYears: 6,
    riseReduction: 0.12,
  },
  'magma-relief': {
    kind: 'magma-relief',
    name: '마그마 감압 시추',
    summary:
      '마그마 방의 열과 압력을 지열 발전으로 빼내 분화 규모(VEI)를 2단계 낮춥니다.',
    target: 'volcano',
    cost: 60,
    buildYears: 4,
    veiReduction: 2,
  },
  'solar-shade': {
    kind: 'solar-shade',
    name: 'L1 우주 차양',
    summary:
      '태양과 지구 사이 L1 지점의 차양막. 기온 0.8°C를 낮추고 해수면 상승 속도를 20% 늦춥니다.',
    target: 'orbit',
    cost: 2000,
    buildYears: 10,
    cooling: 0.8,
    riseReduction: 0.2,
  },
}

export const STRUCTURE_LIST = Object.values(STRUCTURES)

export const TARGET_LABEL: Record<StructureTarget, string> = {
  city: '도시',
  strait: '해협',
  glacier: '빙하',
  volcano: '화산',
  orbit: '궤도',
}
