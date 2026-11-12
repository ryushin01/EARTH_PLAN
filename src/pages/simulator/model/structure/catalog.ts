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

/** 구조물 영어 이름·설명 */
export const STRUCTURE_EN: Record<
  StructureKind,
  { name: string; summary: string }
> = {
  'sea-wall': {
    name: 'Coastal Sea Wall',
    summary:
      'A levee along the city shoreline. Holds back 8 m of sea-level rise and 4 m tsunamis.',
  },
  'tsunami-barrier': {
    name: 'Tsunami Barrier',
    summary: 'A 15 m breakwater with floodgates. Stops tsunamis up to 15 m.',
  },
  'strait-dam': {
    name: 'Strait Dam',
    summary:
      'Seals off a whole sea, protecting the coastal cities inside from up to 60 m of sea-level rise.',
  },
  'glacier-curtain': {
    name: 'Glacier Seabed Curtain',
    summary:
      'Blocks warm water from reaching under the glacier, slowing sea-level rise by 12%.',
  },
  'magma-relief': {
    name: 'Magma Relief Drilling',
    summary:
      'Draws heat and pressure from the magma chamber for geothermal power, lowering eruptions by 2 VEI steps.',
  },
  'solar-shade': {
    name: 'L1 Space Sunshade',
    summary:
      'A shade at the Sun–Earth L1 point. Cools the planet by 0.8°C and slows sea-level rise by 20%.',
  },
  'planetary-defense': {
    name: 'Planetary Defense Network',
    summary:
      'Survey telescopes and kinetic impactors (DART-style). Deflects asteroids up to 1 km; breaks larger ones to half their size.',
  },
  'firefighting-base': {
    name: 'Aerial Firefighting Base',
    summary:
      'Large firefighting aircraft and satellite early warning. Cuts wildfire damage in the region by 60%.',
  },
  desalination: {
    name: 'Desalination & Canal Network',
    summary:
      'Turns seawater into fresh water and pipes it inland. Cuts drought damage in the region by 50%.',
  },
  'seismic-retrofit': {
    name: 'Seismic Retrofit',
    summary:
      'Earthquake-resistant design and base isolation for buildings, bridges and gas lines. Lowers quake damage by one step.',
  },
}

export function structureName(
  kind: StructureKind,
  locale: 'ko' | 'en',
): string {
  return locale === 'en' ? STRUCTURE_EN[kind].name : STRUCTURES[kind].name
}

export function structureSummary(
  kind: StructureKind,
  locale: 'ko' | 'en',
): string {
  return locale === 'en' ? STRUCTURE_EN[kind].summary : STRUCTURES[kind].summary
}

export const TARGET_LABEL_EN: Record<StructureTarget, string> = {
  city: 'City',
  strait: 'Strait',
  glacier: 'Glacier',
  volcano: 'Volcano',
  region: 'Region',
  orbit: 'Orbit',
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
