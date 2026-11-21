import type { Text } from '../text'
import {
  EARTH_RADIUS_KM,
  ellipseFromAltitudes,
  geostationaryRadius,
  sunSynchronousInclination,
} from './orbit'
import type { OrbitElements } from './orbit'

/**
 * 인공위성 목록. 실명 위성은 공개 자료(운영 기관 발표)로 확인할 수 있는 궤도 종류·고도·경사각·정지 경도만 씁니다.
 * 군사 위성은 기밀·추정 정보를 넣지 않고 일반 유형 이름과 궤도 종류로만 나타내며, 정지 경도·위상은 설명용입니다.
 */

export type SatelliteUse = 'military' | 'civil'

export type SatelliteRole =
  | 'station'
  | 'science'
  | 'earth-observation'
  | 'weather'
  | 'communication'
  | 'broadcast'
  | 'navigation'
  | 'reconnaissance'
  | 'early-warning'

export type OrbitClass = 'leo' | 'sso' | 'meo' | 'geo' | 'molniya'

/** 3D 모형 종류 */
export type SatelliteModel =
  'station' | 'telescope' | 'bus' | 'geo' | 'recon' | 'nav'

export interface Satellite {
  id: string
  name: Text
  use: SatelliteUse
  role: SatelliteRole
  orbit: OrbitClass
  model: SatelliteModel
  elements: OrbitElements
  /** 실명 위성이면 공개 자료 출처, 일반 유형이면 없음 */
  source?: string
}

const circular = (
  altitudeKm: number,
  iDeg: number,
  raanDeg = 0,
  meanAnomalyDeg = 0,
): OrbitElements => ({
  aKm: EARTH_RADIUS_KM + altitudeKm,
  e: 0,
  iDeg,
  raanDeg,
  argPerigeeDeg: 0,
  meanAnomalyDeg,
})

/** 정지궤도: 시각 0에 지구 자전각이 0이므로 평균 근점 이각 = 경도 */
const geostationary = (lonDeg: number): OrbitElements => ({
  aKm: geostationaryRadius(),
  e: 0,
  iDeg: 0,
  raanDeg: 0,
  argPerigeeDeg: 0,
  meanAnomalyDeg: lonDeg,
})

const sunSync = (altitudeKm: number, raanDeg: number, m = 0) =>
  circular(altitudeKm, sunSynchronousInclination(altitudeKm), raanDeg, m)

/** 몰니야 궤도: 근지점 약 600km, 원지점 약 39,700km, 경사각 63.4°(근지점이 움직이지 않는 각), 원지점은 북반구 위 */
const molniya = (raanDeg: number, meanAnomalyDeg: number): OrbitElements => ({
  ...ellipseFromAltitudes(600, 39_700),
  iDeg: 63.4,
  raanDeg,
  argPerigeeDeg: 270,
  meanAnomalyDeg,
})

const both = (ko: string, en: string): Text => ({ ko, en })

const starlinkLike = Array.from({ length: 6 }, (_, k): Satellite => ({
  id: `leo-comms-${k + 1}`,
  name: both(
    `저궤도 통신 군집 위성 ${k + 1}`,
    `LEO broadband constellation ${k + 1}`,
  ),
  use: 'civil',
  role: 'communication',
  orbit: 'leo',
  model: 'bus',
  // 고도 약 550km, 경사각 53° 궤도면 하나에 고르게 (일반 유형)
  elements: circular(550, 53, 210, k * 60),
}))

export const SATELLITES: Satellite[] = [
  // ── 민간 ──
  {
    id: 'iss',
    name: both('국제우주정거장(ISS)', 'International Space Station'),
    use: 'civil',
    role: 'station',
    orbit: 'leo',
    model: 'station',
    elements: circular(420, 51.64, 30, 0),
    source: 'NASA',
  },
  {
    id: 'hubble',
    name: both('허블 우주 망원경', 'Hubble Space Telescope'),
    use: 'civil',
    role: 'science',
    orbit: 'leo',
    model: 'telescope',
    elements: circular(515, 28.47, 120, 90),
    source: 'NASA',
  },
  {
    id: 'landsat-9',
    name: both('랜드샛 9호', 'Landsat 9'),
    use: 'civil',
    role: 'earth-observation',
    orbit: 'sso',
    model: 'bus',
    elements: sunSync(705, 300, 200),
    source: 'USGS·NASA',
  },
  {
    id: 'polar-weather',
    name: both(
      '극궤도 기상 위성 (일반 유형)',
      'Polar-orbiting weather satellite (generic)',
    ),
    use: 'civil',
    role: 'weather',
    orbit: 'sso',
    model: 'bus',
    elements: sunSync(830, 60, 40),
  },
  ...starlinkLike,
  {
    id: 'gk2a',
    name: both('천리안위성 2A호', 'GEO-KOMPSAT-2A'),
    use: 'civil',
    role: 'weather',
    orbit: 'geo',
    model: 'geo',
    elements: geostationary(128.2),
    source: '기상청 국가기상위성센터',
  },
  {
    id: 'himawari-9',
    name: both('히마와리 9호', 'Himawari-9'),
    use: 'civil',
    role: 'weather',
    orbit: 'geo',
    model: 'geo',
    elements: geostationary(140.7),
    source: 'JMA',
  },
  {
    id: 'goes-east',
    name: both('GOES-East 기상 위성', 'GOES-East'),
    use: 'civil',
    role: 'weather',
    orbit: 'geo',
    model: 'geo',
    elements: geostationary(-75.2),
    source: 'NOAA',
  },
  {
    id: 'broadcast-geo',
    name: both(
      '정지궤도 방송 위성 (19.2°E, 일반 유형)',
      'Broadcast satellite at 19.2°E (generic)',
    ),
    use: 'civil',
    role: 'broadcast',
    orbit: 'geo',
    model: 'geo',
    elements: geostationary(19.2),
  },
  ...[0, 120, 240].map((m, k): Satellite => ({
    id: `galileo-${k + 1}`,
    name: both(`갈릴레오 항법 위성 ${k + 1}`, `Galileo navigation ${k + 1}`),
    use: 'civil',
    role: 'navigation',
    orbit: 'meo',
    model: 'nav',
    // 고도 23,222km, 경사각 56°, 주기 약 14시간 5분
    elements: circular(23_222, 56, 80, m),
    source: 'EUSPA',
  })),

  // ── 군사 (GPS·GLONASS는 군이 운용하는 민군 겸용 항법) ──
  ...[0, 60, 120, 180].map((raan, k): Satellite => ({
    id: `gps-${k + 1}`,
    name: both(
      `GPS 항법 위성 (궤도면 ${'ABCD'[k]})`,
      `GPS navigation (plane ${'ABCD'[k]})`,
    ),
    use: 'military',
    role: 'navigation',
    orbit: 'meo',
    model: 'nav',
    // 고도 약 20,180km, 경사각 55°, 주기 약 11시간 58분(항성일의 절반)
    elements: circular(20_180, 55, raan, k * 75),
    source: 'U.S. Space Force (gps.gov)',
  })),
  ...[0, 120].map((raan, k): Satellite => ({
    id: `glonass-${k + 1}`,
    name: both(`GLONASS 항법 위성 ${k + 1}`, `GLONASS navigation ${k + 1}`),
    use: 'military',
    role: 'navigation',
    orbit: 'meo',
    model: 'nav',
    // 고도 약 19,100km, 경사각 64.8°, 주기 약 11시간 16분
    elements: circular(19_100, 64.8, raan, 30 + k * 90),
    source: 'Roscosmos (glonass-iac.ru)',
  })),
  ...[0, 1].map((k): Satellite => ({
    id: `optical-recon-${k + 1}`,
    name: both(
      `광학 정찰 위성 ${k + 1} (일반 유형)`,
      `Optical reconnaissance ${k + 1} (generic)`,
    ),
    use: 'military',
    role: 'reconnaissance',
    orbit: 'sso',
    model: 'recon',
    elements: sunSync(500, 150 + k * 90, k * 180),
  })),
  {
    id: 'radar-recon',
    name: both(
      '레이더(SAR) 정찰 위성 (일반 유형)',
      'Radar (SAR) reconnaissance (generic)',
    ),
    use: 'military',
    role: 'reconnaissance',
    orbit: 'sso',
    model: 'recon',
    elements: sunSync(600, 240, 100),
  },
  ...[
    { lon: -40, region: 'Atlantic' },
    { lon: 100, region: 'Indian Ocean' },
  ].map(({ lon, region }, k): Satellite => ({
    id: `early-warning-geo-${k + 1}`,
    name: both(
      `미사일 조기경보 위성 ${k + 1} (정지궤도, 일반 유형)`,
      `Missile early warning ${k + 1} (GEO, generic, ${region})`,
    ),
    use: 'military',
    role: 'early-warning',
    orbit: 'geo',
    model: 'geo',
    elements: geostationary(lon),
  })),
  ...[0, 180].map((m, k): Satellite => ({
    id: `molniya-${k + 1}`,
    name: both(
      `몰니야 궤도 조기경보·통신 위성 ${k + 1} (일반 유형)`,
      `Molniya-orbit warning/comms ${k + 1} (generic)`,
    ),
    use: 'military',
    role: 'early-warning',
    orbit: 'molniya',
    model: 'bus',
    elements: molniya(40, m),
  })),
  ...[-150, 60].map((lon, k): Satellite => ({
    id: `milcom-geo-${k + 1}`,
    name: both(
      `군 통신 위성 ${k + 1} (정지궤도, 일반 유형)`,
      `Military comms ${k + 1} (GEO, generic)`,
    ),
    use: 'military',
    role: 'communication',
    orbit: 'geo',
    model: 'geo',
    elements: geostationary(lon),
  })),
]
