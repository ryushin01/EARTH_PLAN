import type { LatLon } from '@/shared/lib'

/**
 * 항공·선박 운항 데이터. 실시간 위치(ADS-B·AIS)는 쓰지 않고 실제 노선·바닷길을 본뜬 가상 운항입니다.
 * 바닷길 꼭짓점은 침수 계산용 육지 격자(512×256)로 바다 위인지 테스트합니다.
 */

/** 여객기 노선: 두 도시를 대권으로 잇고, planes대가 번갈아 반대쪽에서 출발 */
export interface FlightRoute {
  id: string
  from: string
  to: string
  planes: number
}

export type ShipKind = 'cruise' | 'container' | 'carrier'

/** 바닷길: 꼭짓점 사이를 대권으로 잇는 꺾은선. loop가 아니면 끝에서 돌아옴 */
export interface SeaLane {
  id: string
  kind: ShipKind
  waypoints: LatLon[]
  loop: boolean
  /** 기항지: 도시 id와 꼭짓점 번호 (항구가 닫히면 그 앞바다에서 기다림) */
  ports: { cityId: string; at: number }[]
  ships: number
}

export const FLIGHT_ROUTES: FlightRoute[] = [
  { id: 'icn-lax', from: 'seoul-incheon', to: 'los-angeles', planes: 2 },
  { id: 'icn-jfk', from: 'seoul-incheon', to: 'new-york', planes: 2 },
  { id: 'icn-lhr', from: 'seoul-incheon', to: 'london', planes: 2 },
  { id: 'icn-sin', from: 'seoul-incheon', to: 'singapore', planes: 2 },
  { id: 'gmp-cju', from: 'seoul', to: 'jeju', planes: 2 },
  { id: 'hnd-sfo', from: 'tokyo', to: 'san-francisco', planes: 2 },
  { id: 'hnd-syd', from: 'tokyo', to: 'sydney', planes: 2 },
  { id: 'lhr-jfk', from: 'london', to: 'new-york', planes: 2 },
  { id: 'ams-yvr', from: 'amsterdam', to: 'vancouver', planes: 2 },
  { id: 'lhr-sin', from: 'london', to: 'singapore', planes: 2 },
  { id: 'sin-syd', from: 'singapore', to: 'sydney', planes: 2 },
  { id: 'lax-hnl', from: 'los-angeles', to: 'honolulu', planes: 2 },
  { id: 'jfk-gig', from: 'new-york', to: 'rio', planes: 2 },
  { id: 'lhr-los', from: 'london', to: 'lagos', planes: 2 },
  { id: 'hkg-bom', from: 'hong-kong', to: 'mumbai', planes: 2 },
]

export const SEA_LANES: SeaLane[] = [
  {
    // 마이애미 → 플로리다 해협 → 유카탄 해협 → 코수멜 → 그랜드케이맨 → 자메이카
    id: 'cruise-caribbean',
    kind: 'cruise',
    waypoints: [
      { lat: 25.77, lon: -80.13 },
      { lat: 24.3, lon: -80.9 },
      { lat: 23.9, lon: -83.0 },
      { lat: 21.8, lon: -85.8 },
      { lat: 20.45, lon: -86.55 },
      { lat: 19.2, lon: -81.6 },
      { lat: 18.9, lon: -78.0 },
    ],
    loop: false,
    ports: [{ cityId: 'miami', at: 0 }],
    ships: 2,
  },
  {
    // 바르셀로나 앞바다 → 사르데냐 남쪽 → 티레니아해 → 나폴리
    id: 'cruise-mediterranean',
    kind: 'cruise',
    waypoints: [
      { lat: 41.0, lon: 2.8 },
      { lat: 40.3, lon: 4.8 },
      { lat: 38.4, lon: 8.6 },
      { lat: 39.6, lon: 12.0 },
      { lat: 40.75, lon: 14.15 },
    ],
    loop: false,
    ports: [{ cityId: 'naples', at: 4 }],
    ships: 1,
  },
  {
    // 뉴욕 → 대서양 → 영국 해협(사우샘프턴 쪽)
    id: 'cruise-transatlantic',
    kind: 'cruise',
    waypoints: [
      { lat: 40.45, lon: -73.75 },
      { lat: 40.0, lon: -69.0 },
      { lat: 45.0, lon: -40.0 },
      { lat: 49.2, lon: -8.0 },
      { lat: 49.7, lon: -5.0 },
      { lat: 50.2, lon: -2.0 },
    ],
    loop: false,
    ports: [
      { cityId: 'new-york', at: 0 },
      { cityId: 'london', at: 5 },
    ],
    ships: 1,
  },
  {
    // 부산 → 대한해협 → 제주 → 동중국해 → 상하이
    id: 'cruise-northeast-asia',
    kind: 'cruise',
    waypoints: [
      { lat: 35.05, lon: 129.15 },
      { lat: 34.3, lon: 128.9 },
      { lat: 33.75, lon: 127.3 },
      { lat: 33.62, lon: 126.55 },
      { lat: 32.6, lon: 124.5 },
      { lat: 31.15, lon: 122.3 },
    ],
    loop: false,
    ports: [
      { cityId: 'busan', at: 0 },
      { cityId: 'jeju', at: 3 },
      { cityId: 'shanghai', at: 5 },
    ],
    ships: 1,
  },
  {
    // 부산 → 규슈 서쪽·남쪽 → 북태평양 → 로스앤젤레스
    id: 'container-transpacific',
    kind: 'container',
    waypoints: [
      { lat: 35.05, lon: 129.15 },
      { lat: 34.3, lon: 128.9 },
      { lat: 33.0, lon: 128.3 },
      { lat: 31.0, lon: 128.6 },
      { lat: 29.0, lon: 130.0 },
      { lat: 30.5, lon: 133.0 },
      { lat: 31.5, lon: 136.5 },
      { lat: 33.0, lon: -121.0 },
      { lat: 33.72, lon: -118.27 },
    ],
    loop: false,
    ports: [
      { cityId: 'busan', at: 0 },
      { cityId: 'los-angeles', at: 8 },
    ],
    ships: 2,
  },
  {
    // 상하이 → 타이완 동쪽 → 바시 해협 → 남중국해 → 싱가포르
    id: 'container-asia',
    kind: 'container',
    waypoints: [
      { lat: 31.15, lon: 122.3 },
      { lat: 29.5, lon: 123.4 },
      { lat: 25.6, lon: 123.2 },
      { lat: 22.5, lon: 122.2 },
      { lat: 20.5, lon: 120.7 },
      { lat: 16.0, lon: 116.5 },
      { lat: 10.0, lon: 111.5 },
      { lat: 4.0, lon: 106.0 },
      { lat: 1.4, lon: 104.6 },
      { lat: 1.25, lon: 103.85 },
    ],
    loop: false,
    ports: [
      { cityId: 'shanghai', at: 0 },
      { cityId: 'singapore', at: 9 },
    ],
    ships: 2,
  },
  {
    // 필리핀해 순찰
    id: 'carrier-west-pacific',
    kind: 'carrier',
    waypoints: [
      { lat: 16.5, lon: 129.0 },
      { lat: 16.5, lon: 135.0 },
      { lat: 22.0, lon: 137.0 },
      { lat: 24.0, lon: 131.5 },
    ],
    loop: true,
    ports: [],
    ships: 1,
  },
  {
    // 아라비아해 순찰
    id: 'carrier-arabian-sea',
    kind: 'carrier',
    waypoints: [
      { lat: 13.0, lon: 61.0 },
      { lat: 13.0, lon: 66.0 },
      { lat: 17.5, lon: 67.0 },
      { lat: 18.5, lon: 62.0 },
    ],
    loop: true,
    ports: [],
    ships: 1,
  },
]

/** 항공모함마다 위를 도는 전투기 수 */
export const FIGHTERS_PER_CARRIER = 2

/** 우주왕복선 발사장 (케네디 우주 센터) */
export const LAUNCH_SITE: LatLon = { lat: 28.57, lon: -80.65 }
