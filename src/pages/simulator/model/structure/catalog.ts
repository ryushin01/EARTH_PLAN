export type StructureKind =
  | 'sea-wall'
  | 'tsunami-barrier'
  | 'strait-dam'
  | 'glacier-curtain'
  | 'magma-relief'
  | 'solar-shade'
  | 'planetary-defense'
  | 'firefighting-base'
  | 'desalination'
  | 'seismic-retrofit'

export type StructureTarget =
  'city' | 'strait' | 'glacier' | 'volcano' | 'region' | 'orbit'

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
  /** 이 지름(m) 이하 소행성은 궤도를 바꿔 빗나가게 함 */
  deflectDiameter?: number
  /** 산불 피해 감소율 (0~1) */
  fireReduction?: number
  /** 가뭄 피해 감소율 (0~1) */
  droughtReduction?: number
  /** 지진 피해 감소율 (0~1) */
  quakeReduction?: number
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
  'planetary-defense': {
    kind: 'planetary-defense',
    name: '행성 방위 요격망',
    summary:
      '궤도의 감시 망원경과 충돌 요격선(DART 방식). 지름 1km 이하 소행성은 궤도를 바꿔 빗나가게 하고, 더 큰 것은 부숴 지름을 절반으로 줄입니다.',
    target: 'orbit',
    cost: 800,
    buildYears: 5,
    deflectDiameter: 1000,
  },
  'firefighting-base': {
    kind: 'firefighting-base',
    name: '공중 소방 거점',
    summary:
      '대형 소방 항공기와 위성 조기 감시망. 그 지역 산불 피해를 60% 줄입니다.',
    target: 'region',
    cost: 60,
    buildYears: 2,
    fireReduction: 0.6,
  },
  desalination: {
    kind: 'desalination',
    name: '해수 담수화·수로망',
    summary:
      '바닷물을 민물로 바꿔 수로로 보내는 시설. 그 지역 가뭄 피해를 50% 줄입니다.',
    target: 'region',
    cost: 150,
    buildYears: 4,
    droughtReduction: 0.5,
  },
  'seismic-retrofit': {
    kind: 'seismic-retrofit',
    name: '도시 내진 보강',
    summary:
      '건물·다리·가스관에 내진 설계와 면진 장치를 넣습니다. 그 도시의 지진 피해를 70% 줄입니다.',
    target: 'city',
    cost: 30,
    buildYears: 3,
    quakeReduction: 0.7,
  },
}

export const STRUCTURE_LIST = Object.values(STRUCTURES)

export const TARGET_LABEL: Record<StructureTarget, string> = {
  city: '도시',
  strait: '해협',
  glacier: '빙하',
  volcano: '화산',
  region: '지역',
  orbit: '궤도',
}
