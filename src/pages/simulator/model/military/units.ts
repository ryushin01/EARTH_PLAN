import type { LatLon } from '@/shared/lib'
import type { Text } from '../text'
import type { FleetFormation, FleetRole, FlightFormation } from './formation'

/**
 * 전투기·함선 종류와 훈련 편대·함대. 기종은 실루엣 계열(일반 유형)로 나누고, 길이·속도는 공개된 대표값입니다.
 * 훈련 공역·경로는 가상이며 실제 작전·배치와 관계없습니다.
 */

export type AircraftType = 'gen4-heavy' | 'gen4-light' | 'gen45' | 'gen5'

export interface AircraftSpec {
  name: Text
  /** 같은 실루엣 계열의 실제 기종 */
  family: string
  /** 대표 길이 (m) */
  lengthM: number
  features: Text
}

export const AIRCRAFT: Record<AircraftType, AircraftSpec> = {
  'gen4-heavy': {
    name: {
      ko: '4세대 쌍발 제공 전투기',
      en: '4th-gen twin-engine air superiority',
    },
    family: 'F-15 · Su-27',
    lengthM: 19.4,
    features: {
      ko: '쌍발 엔진, 수직 꼬리날개 두 장, 큰 후퇴익, 날개 밑 외부 무장',
      en: 'Twin engines, twin upright tails, large swept wing, external stores',
    },
  },
  'gen4-light': {
    name: {
      ko: '4세대 단발 다목적 전투기',
      en: '4th-gen single-engine multirole',
    },
    family: 'F-16',
    lengthM: 15.1,
    features: {
      ko: '단발 엔진, 수직 꼬리날개 한 장, 동체 아래 공기 흡입구, 크롭드 델타 날개',
      en: 'Single engine, single tail, chin intake, cropped-delta wing',
    },
  },
  gen45: {
    name: {
      ko: '4.5세대 카나드 델타 전투기',
      en: '4.5-gen canard-delta fighter',
    },
    family: 'Rafale · Typhoon · Gripen',
    lengthM: 15.5,
    features: {
      ko: '앞날개(카나드)와 큰 삼각 날개, 수직 꼬리날개 한 장',
      en: 'Foreplanes (canards), large delta wing, single tail',
    },
  },
  gen5: {
    name: { ko: '5세대 스텔스 전투기', en: '5th-gen stealth fighter' },
    family: 'F-22 · F-35 · J-20 · Su-57',
    lengthM: 19.2,
    features: {
      ko: '각진 마름모 단면 동체, 바깥으로 기운 수직 꼬리날개, 평행한 날개 모서리, 내부 무장창(외부 무장 없음)',
      en: 'Faceted diamond-section body, outward-canted tails, aligned edges, internal weapons bays',
    },
  },
}

export type ShipClass =
  'carrier' | 'battleship' | 'cruiser' | 'destroyer' | 'frigate' | 'submarine'

export interface ShipSpec {
  name: Text
  family: string
  lengthM: number
  features: Text
}

export const SHIPS: Record<ShipClass, ShipSpec> = {
  carrier: {
    name: { ko: '항공모함', en: 'Aircraft carrier' },
    family: 'Nimitz · Ford',
    lengthM: 333,
    features: {
      ko: '평평한 비행갑판, 우현의 작은 함교(아일랜드), 경사 갑판',
      en: 'Flat flight deck, starboard island, angled deck',
    },
  },
  battleship: {
    name: { ko: '전함', en: 'Battleship' },
    family: 'Iowa (퇴역 함종)',
    lengthM: 270,
    features: {
      ko: '앞에 두 개·뒤에 한 개의 3연장 주포탑, 높은 탑형 함교, 굴뚝 두 개',
      en: 'Two forward and one aft triple turrets, tower bridge, twin funnels',
    },
  },
  cruiser: {
    name: { ko: '순양함', en: 'Cruiser' },
    family: 'Ticonderoga',
    lengthM: 173,
    features: {
      ko: '앞뒤 두 덩어리 상부 구조물(위상배열 레이더), 앞뒤 수직발사기(VLS), 함포 두 문, 격자 마스트',
      en: 'Fore and aft deckhouses (phased-array radar), fore/aft VLS, two guns, lattice masts',
    },
  },
  destroyer: {
    name: { ko: '구축함', en: 'Destroyer' },
    family: 'Arleigh Burke · 세종대왕급',
    lengthM: 155,
    features: {
      ko: '앞쪽 하나로 된 경사진 상부 구조물, 함포 한 문, 앞뒤 VLS, 뒤로 기운 마스트 하나',
      en: 'Single sloped forward superstructure, one gun, fore/aft VLS, single raked mast',
    },
  },
  frigate: {
    name: { ko: '호위함', en: 'Frigate' },
    family: 'Constellation · FREMM · 대구급',
    lengthM: 140,
    features: {
      ko: '짧은 선체, 가운데 상부 구조물, 뒤쪽 헬리콥터 갑판',
      en: 'Shorter hull, midships superstructure, aft helicopter deck',
    },
  },
  submarine: {
    name: { ko: '공격 잠수함', en: 'Attack submarine' },
    family: 'Virginia · Los Angeles',
    lengthM: 115,
    features: {
      ko: '원통형 선체와 함교탑(세일), 수면 항해로 표시',
      en: 'Cylindrical hull and sail, shown surfaced',
    },
  },
}

/** 훈련 경로: 훈련 공역 가운데를 중심으로 한 경주로(직선 둘·반원 둘) */
export interface Racetrack {
  center: LatLon
  /** 직선 구간 방향 (도, 북쪽에서 시계 방향) */
  headingDeg: number
  /** 직선 구간 길이 (km) */
  straightKm: number
  /** 반원 반지름 (km) */
  turnKm: number
}

export interface Flight {
  id: string
  name: Text
  area: Text
  aircraft: AircraftType[]
  /** 순항 마하수 */
  mach: number
  /** 순항 고도 (km) */
  altitudeKm: number
  track: Racetrack
  /** 바꿔 가며 익히는 대형 */
  drill: FlightFormation[]
}

export interface FleetShip {
  ship: ShipClass
  role: FleetRole
}

export interface Fleet {
  id: string
  name: Text
  area: Text
  /** 종렬·횡렬일 때의 순서이기도 함 */
  ships: FleetShip[]
  /** 함대 속력 (노트) */
  knots: number
  track: Racetrack
  drill: FleetFormation[]
}

const four = (type: AircraftType): AircraftType[] => [type, type, type, type]

export const FLIGHTS: Flight[] = [
  {
    id: 'flight-gen5',
    name: { ko: '5세대 스텔스 편대', en: '5th-gen stealth flight' },
    area: { ko: '필리핀해 훈련 공역', en: 'Philippine Sea training area' },
    aircraft: four('gen5'),
    mach: 0.85,
    altitudeKm: 11,
    track: {
      center: { lat: 24, lon: 139 },
      headingDeg: 20,
      straightKm: 600,
      turnKm: 250,
    },
    drill: ['finger-four', 'line-abreast', 'echelon-right', 'trail'],
  },
  {
    id: 'flight-gen4-heavy',
    name: {
      ko: '4세대 제공 전투기 편대',
      en: '4th-gen air superiority flight',
    },
    area: { ko: '멕시코만 훈련 공역', en: 'Gulf of Mexico training area' },
    aircraft: four('gen4-heavy'),
    mach: 0.85,
    altitudeKm: 10,
    track: {
      center: { lat: 25.5, lon: -90 },
      headingDeg: 80,
      straightKm: 600,
      turnKm: 250,
    },
    drill: ['finger-four', 'echelon-right', 'trail', 'line-abreast'],
  },
  {
    id: 'flight-gen4-light',
    name: { ko: '4세대 다목적 전투기 편대', en: '4th-gen multirole flight' },
    area: {
      ko: '서지중해 훈련 공역',
      en: 'Western Mediterranean training area',
    },
    aircraft: four('gen4-light'),
    mach: 0.82,
    altitudeKm: 9.5,
    track: {
      center: { lat: 38.8, lon: 5.5 },
      headingDeg: 70,
      straightKm: 450,
      turnKm: 200,
    },
    drill: ['diamond', 'echelon-right', 'finger-four', 'trail'],
  },
  {
    id: 'flight-gen45',
    name: { ko: '4.5세대 카나드 델타 편대', en: '4.5-gen canard-delta flight' },
    area: { ko: '북해 훈련 공역', en: 'North Sea training area' },
    aircraft: four('gen45'),
    mach: 0.88,
    altitudeKm: 11,
    track: {
      center: { lat: 56.5, lon: 3 },
      headingDeg: 0,
      straightKm: 500,
      turnKm: 220,
    },
    drill: ['line-abreast', 'finger-four', 'trail', 'diamond'],
  },
  {
    id: 'flight-mixed',
    name: {
      ko: '혼성 편대 (5세대 2기 + 4.5세대 2기)',
      en: 'Mixed flight (2× 5th-gen + 2× 4.5-gen)',
    },
    area: { ko: '산호해 훈련 공역', en: 'Coral Sea training area' },
    aircraft: ['gen5', 'gen5', 'gen45', 'gen45'],
    mach: 0.85,
    altitudeKm: 10.5,
    track: {
      center: { lat: -18, lon: 156 },
      headingDeg: 150,
      straightKm: 600,
      turnKm: 250,
    },
    drill: ['finger-four', 'trail', 'line-abreast', 'echelon-right'],
  },
]

export const FLEETS: Fleet[] = [
  {
    id: 'fleet-csg',
    name: { ko: '항모 타격단', en: 'Carrier strike group' },
    area: { ko: '북태평양 훈련 해역', en: 'North Pacific exercise area' },
    // 종렬일 때 순서: 순양함이 앞장서고 항공모함이 가운데
    ships: [
      { ship: 'cruiser', role: 'inner' },
      { ship: 'destroyer', role: 'inner' },
      { ship: 'carrier', role: 'center' },
      { ship: 'destroyer', role: 'inner' },
      { ship: 'destroyer', role: 'inner' },
      { ship: 'frigate', role: 'outer' },
      { ship: 'submarine', role: 'outer' },
    ],
    knots: 25,
    track: {
      center: { lat: 32, lon: 160 },
      headingDeg: 90,
      straightKm: 800,
      turnKm: 300,
    },
    drill: ['circular', 'column', 'circular', 'line-abreast'],
  },
  {
    id: 'fleet-sag',
    name: { ko: '전함 수상전투단', en: 'Battleship surface action group' },
    area: { ko: '북대서양 훈련 해역', en: 'North Atlantic exercise area' },
    ships: [
      { ship: 'destroyer', role: 'inner' },
      { ship: 'cruiser', role: 'inner' },
      { ship: 'battleship', role: 'center' },
      { ship: 'cruiser', role: 'inner' },
      { ship: 'destroyer', role: 'inner' },
      { ship: 'frigate', role: 'outer' },
    ],
    knots: 22,
    track: {
      center: { lat: 38, lon: -48 },
      headingDeg: 60,
      straightKm: 700,
      turnKm: 280,
    },
    drill: ['column', 'line-abreast', 'circular'],
  },
]
