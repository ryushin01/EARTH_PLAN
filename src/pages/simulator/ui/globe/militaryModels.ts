import { BoxGeometry, CylinderGeometry } from 'three'
import type { BufferGeometry } from 'three'
import type { SatelliteModel } from '../../model/military/satellites'
import type { AircraftType, ShipClass } from '../../model/military/units'
import {
  box,
  buildModel,
  cone,
  merge,
  paint,
  tube,
  wings,
} from './trafficModels'

/**
 * 군용기·군함·인공위성 저폴리 모형 (코드로 만듦, 외부 에셋 없음).
 * 앞쪽 +Z, 위쪽 +Y, 길이 약 1. 종류마다 인스턴스 메시 하나로 그립니다.
 * 실루엣이 구별되도록 계열별 특징(꼬리날개 수·기울기, 카나드, 포탑·VLS·마스트, 비행갑판)을 살렸습니다.
 */

type At = [number, number, number]

/** 기울인 상자 (roll: 앞쪽 축 기준, pitch: 오른쪽 축 기준) */
function slab(
  w: number,
  h: number,
  l: number,
  hex: string,
  at: At,
  { roll = 0, pitch = 0, yaw = 0 } = {},
) {
  const g = new BoxGeometry(w, h, l)
  if (pitch) g.rotateX(pitch)
  if (roll) g.rotateZ(roll)
  if (yaw) g.rotateY(yaw)
  g.translate(...at)
  return paint(g, hex)
}

/** 각진 동체: sides각 기둥을 Z축으로 눕히고 위아래로 납작하게 (sides=4면 마름모 단면) */
function prism(
  front: number,
  back: number,
  l: number,
  sides: number,
  hex: string,
  at: At,
  flatten = 0.6,
) {
  const g = new CylinderGeometry(front, back, l, sides)
  g.rotateX(Math.PI / 2)
  g.scale(1, flatten, 1)
  g.translate(...at)
  return paint(g, hex)
}

// ── 전투기 ──

const CANOPY = '#3b5f7a'
const GOLD_CANOPY = '#9c8445'

/** F-15·Su-27 계열: 쌍발, 똑바로 선 수직 꼬리날개 둘, 큰 후퇴익, 날개 밑 연료·무장 */
function gen4Heavy() {
  const body = '#8f9ba6'
  const dark = '#6d7984'
  return [
    tube(0.05, 0.06, 0.62, body, [0, 0, 0.05]),
    cone(0.05, 0.22, body, [0, 0, 0.47]),
    tube(0.045, 0.045, 0.34, dark, [0.05, -0.01, -0.36]),
    tube(0.045, 0.045, 0.34, dark, [-0.05, -0.01, -0.36]),
    slab(0.07, 0.06, 0.22, dark, [0.09, -0.02, 0.1]),
    slab(0.07, 0.06, 0.22, dark, [-0.09, -0.02, 0.1]),
    wings(
      [
        [0.08, 0.12],
        [0.45, -0.2],
        [0.45, -0.28],
        [0.08, -0.3],
      ],
      0,
      '#7d8994',
    ),
    wings(
      [
        [0.08, -0.36],
        [0.24, -0.46],
        [0.24, -0.52],
        [0.08, -0.5],
      ],
      0,
      '#7d8994',
    ),
    slab(0.012, 0.16, 0.16, dark, [0.09, 0.09, -0.4]),
    slab(0.012, 0.16, 0.16, dark, [-0.09, 0.09, -0.4]),
    // 날개 밑 외부 무장·연료
    tube(0.018, 0.018, 0.2, '#c9d1d8', [0.25, -0.04, -0.06]),
    tube(0.018, 0.018, 0.2, '#c9d1d8', [-0.25, -0.04, -0.06]),
    slab(0.05, 0.04, 0.16, CANOPY, [0, 0.055, 0.28]),
  ]
}

/** F-16 계열: 단발, 수직 꼬리날개 하나, 동체 아래 흡입구, 크롭드 델타 */
function gen4Light() {
  const body = '#a3adb7'
  return [
    tube(0.045, 0.045, 0.7, body, [0, 0, -0.02]),
    cone(0.045, 0.22, body, [0, 0, 0.44]),
    slab(0.07, 0.05, 0.22, '#6f7b86', [0, -0.06, 0.12]),
    wings(
      [
        [0.04, 0.32],
        [0.08, 0.05],
        [0.4, -0.18],
        [0.4, -0.24],
        [0.05, -0.24],
      ],
      0,
      '#8995a0',
    ),
    wings(
      [
        [0.04, -0.33],
        [0.2, -0.43],
        [0.2, -0.48],
        [0.04, -0.46],
      ],
      0,
      '#8995a0',
    ),
    slab(0.012, 0.2, 0.18, '#7c8893', [0, 0.11, -0.36], { pitch: -0.2 }),
    tube(0.016, 0.016, 0.16, '#d0d7de', [0.41, 0, -0.18]),
    tube(0.016, 0.016, 0.16, '#d0d7de', [-0.41, 0, -0.18]),
    slab(0.045, 0.045, 0.18, CANOPY, [0, 0.045, 0.24]),
  ]
}

/** 라팔·타이푼·그리펜 계열: 앞날개(카나드)와 큰 삼각 날개, 꼬리날개 하나 (수평 꼬리날개 없음) */
function gen45() {
  const body = '#99a4ae'
  return [
    tube(0.045, 0.05, 0.72, body, [0, 0, -0.02]),
    cone(0.045, 0.24, body, [0, 0, 0.46]),
    slab(0.12, 0.05, 0.2, '#727e89', [0, -0.05, 0.05]),
    wings(
      [
        [0.05, 0.05],
        [0.42, -0.33],
        [0.42, -0.38],
        [0.05, -0.38],
      ],
      -0.01,
      '#86929d',
    ),
    wings(
      [
        [0.04, 0.3],
        [0.17, 0.2],
        [0.17, 0.16],
        [0.04, 0.2],
      ],
      0.02,
      '#86929d',
    ),
    slab(0.012, 0.19, 0.2, '#76828d', [0, 0.1, -0.3], { pitch: -0.3 }),
    slab(0.045, 0.045, 0.18, CANOPY, [0, 0.05, 0.27]),
  ]
}

/** F-22·F-35·J-20·Su-57 계열: 마름모 단면 동체, 바깥으로 기운 꼬리날개 둘, 평행한 날개 모서리, 외부 무장 없음 */
function gen5() {
  const body = '#5f6872'
  const edge = '#4c545d'
  return [
    prism(0.06, 0.09, 0.66, 4, body, [0, 0, 0], 0.45),
    prism(0.001, 0.06, 0.3, 4, body, [0, 0, 0.48], 0.45),
    // 동체와 이어지는 넓은 몸통(차인)
    wings(
      [
        [0.02, 0.4],
        [0.13, 0.12],
        [0.13, -0.32],
        [0.02, -0.4],
      ],
      0.005,
      edge,
    ),
    // 앞전 후퇴 42°, 뒷전은 앞쪽으로 꺾인 다이아몬드 날개 (앞뒤 모서리가 평행)
    wings(
      [
        [0.1, 0.1],
        [0.43, -0.2],
        [0.43, -0.25],
        [0.1, -0.16],
      ],
      0,
      body,
    ),
    wings(
      [
        [0.09, -0.3],
        [0.25, -0.44],
        [0.25, -0.48],
        [0.09, -0.44],
      ],
      0,
      body,
    ),
    slab(0.012, 0.17, 0.18, edge, [0.12, 0.08, -0.34], { roll: -0.45 }),
    slab(0.012, 0.17, 0.18, edge, [-0.12, 0.08, -0.34], { roll: 0.45 }),
    slab(0.04, 0.04, 0.2, GOLD_CANOPY, [0, 0.04, 0.25]),
  ]
}

// ── 함선 ──

const HULL = '#6b7682'
const DECK = '#4b545e'
const SUPER = '#8d98a3'
const VLS = '#2f363d'

/** 선체: 상자와 뾰족한 뱃머리 (beam: 길이 대비 폭) */
function hull(beam: number, height: number, hex = HULL) {
  const bow = new CylinderGeometry(0.001, beam / 2, 0.16, 4)
  bow.rotateX(Math.PI / 2)
  bow.rotateZ(Math.PI / 4)
  bow.scale(1, height / beam, 1)
  bow.translate(0, -height / 2, 0.42)
  return [
    box(beam, height, 0.84, hex, [0, -height / 2, -0.08]),
    paint(bow, hex),
  ]
}

/** 포탑: 포신 barrels개 */
function turret(at: At, size: number, barrels: number, facing = 1) {
  const parts = [box(size, size * 0.45, size * 1.1, '#7a858f', at)]
  for (let k = 0; k < barrels; k++) {
    const x = at[0] + (k - (barrels - 1) / 2) * size * 0.28
    parts.push(
      tube(size * 0.06, size * 0.07, size * 1.6, '#55606a', [
        x,
        at[1] + size * 0.05,
        at[2] + facing * size * 1.2,
      ]),
    )
  }
  return parts
}

function battleship() {
  return [
    ...hull(0.12, 0.05),
    box(0.11, 0.004, 0.8, DECK, [0, 0.001, -0.06]),
    ...turret([0, 0.025, 0.28], 0.07, 3),
    ...turret([0, 0.045, 0.17], 0.07, 3),
    ...turret([0, 0.025, -0.34], 0.07, 3, -1),
    // 탑형 함교와 굴뚝 둘
    box(0.07, 0.06, 0.16, SUPER, [0, 0.03, 0.02]),
    box(0.045, 0.1, 0.06, SUPER, [0, 0.1, 0.06]),
    box(0.03, 0.08, 0.035, '#5c6670', [0, 0.08, -0.05]),
    box(0.03, 0.08, 0.035, '#5c6670', [0, 0.08, -0.12]),
    box(0.006, 0.12, 0.006, '#c4ccd3', [0, 0.18, 0.06]),
    box(0.06, 0.04, 0.12, SUPER, [0, 0.02, -0.2]),
  ]
}

function cruiser() {
  return [
    ...hull(0.1, 0.05),
    box(0.09, 0.004, 0.8, DECK, [0, 0.001, -0.06]),
    // 앞뒤 두 덩어리 상부 구조물 (위상배열 레이더 면)
    box(0.08, 0.09, 0.17, SUPER, [0, 0.045, 0.06]),
    box(0.07, 0.07, 0.13, SUPER, [0, 0.035, -0.17]),
    box(0.04, 0.004, 0.04, '#3f6f8f', [0.041, 0.06, 0.1]),
    box(0.04, 0.004, 0.04, '#3f6f8f', [-0.041, 0.06, 0.1]),
    // 격자 마스트 둘
    box(0.01, 0.11, 0.01, '#c4ccd3', [0, 0.14, 0.04]),
    box(0.01, 0.09, 0.01, '#c4ccd3', [0, 0.11, -0.16]),
    // VLS와 함포
    box(0.06, 0.006, 0.09, VLS, [0, 0.003, 0.23]),
    box(0.06, 0.006, 0.09, VLS, [0, 0.003, -0.32]),
    ...turret([0, 0.012, 0.33], 0.035, 1),
    ...turret([0, 0.012, -0.41], 0.035, 1, -1),
  ]
}

function destroyer() {
  return [
    ...hull(0.12, 0.05),
    box(0.11, 0.004, 0.8, DECK, [0, 0.001, -0.06]),
    // 앞쪽 하나로 된 상부 구조물 (앞면이 기운 모양)
    slab(0.1, 0.09, 0.2, SUPER, [0, 0.045, 0.05], { pitch: 0.12 }),
    box(0.07, 0.05, 0.12, SUPER, [0, 0.025, -0.12]),
    box(0.03, 0.05, 0.04, '#5c6670', [0, 0.07, -0.07]),
    box(0.03, 0.05, 0.04, '#5c6670', [0, 0.06, -0.14]),
    slab(0.012, 0.14, 0.012, '#c4ccd3', [0, 0.15, 0.02], { pitch: -0.25 }),
    box(0.07, 0.006, 0.08, VLS, [0, 0.003, 0.24]),
    box(0.07, 0.006, 0.08, VLS, [0, 0.003, -0.28]),
    ...turret([0, 0.012, 0.34], 0.035, 1),
  ]
}

function frigate() {
  return [
    ...hull(0.13, 0.05),
    box(0.12, 0.004, 0.8, DECK, [0, 0.001, -0.06]),
    box(0.1, 0.08, 0.3, SUPER, [0, 0.04, 0]),
    box(0.012, 0.12, 0.012, '#c4ccd3', [0, 0.14, 0.05]),
    // 헬리콥터 갑판
    box(0.12, 0.006, 0.2, '#a9b3bc', [0, 0.003, -0.34]),
    box(0.06, 0.006, 0.06, VLS, [0, 0.003, 0.22]),
    ...turret([0, 0.012, 0.32], 0.035, 1),
  ]
}

function submarine() {
  const black = '#262b31'
  return [
    tube(0.06, 0.06, 0.8, black, [0, -0.01, -0.02]),
    cone(0.06, 0.14, black, [0, -0.01, 0.45]),
    cone(0.06, 0.16, black, [0, -0.01, -0.5], false),
    box(0.03, 0.08, 0.12, black, [0, 0.07, 0.18]),
    box(0.12, 0.006, 0.03, black, [0, 0.07, 0.2]),
    box(0.006, 0.1, 0.05, black, [0, -0.01, -0.52]),
    box(0.1, 0.006, 0.05, black, [0, -0.01, -0.52]),
  ]
}

// ── 인공위성 ──

const PANEL = '#4f7fc4'
const FOIL = '#c9a24a'
const SILVER = '#c3cad1'

/** 몸체 + 좌우 태양전지판 */
function satBus(bus = FOIL, span = 0.9) {
  return [
    box(0.22, 0.22, 0.26, bus, [0, 0, 0]),
    box(span / 2, 0.01, 0.2, PANEL, [span / 4 + 0.12, 0, 0]),
    box(span / 2, 0.01, 0.2, PANEL, [-span / 4 - 0.12, 0, 0]),
  ]
}

function station() {
  const parts = [
    box(1, 0.04, 0.04, SILVER, [0, 0, 0]),
    tube(0.06, 0.06, 0.5, '#e2e6ea', [0, 0, 0]),
    tube(0.05, 0.05, 0.18, '#e2e6ea', [0.12, 0, 0.12]),
  ]
  for (const x of [-0.45, -0.3, 0.3, 0.45])
    parts.push(box(0.1, 0.01, 0.5, PANEL, [x, 0, 0]))
  return parts
}

function telescope() {
  return [
    tube(0.13, 0.13, 0.62, SILVER, [0, 0, 0]),
    tube(0.13, 0.13, 0.02, '#1a1d21', [0, 0, 0.32]),
    box(0.06, 0.01, 0.5, PANEL, [0.2, 0, -0.05]),
    box(0.06, 0.01, 0.5, PANEL, [-0.2, 0, -0.05]),
  ]
}

function geoSat() {
  return [
    ...satBus(FOIL, 1.1),
    cone(0.12, 0.05, '#e8ecef', [0, -0.14, 0.05], false),
    cone(0.09, 0.04, '#e8ecef', [0.08, 0.13, 0.05]),
  ]
}

function recon() {
  return [
    tube(0.1, 0.1, 0.55, '#9aa4ad', [0, 0, 0]),
    tube(0.07, 0.07, 0.02, '#0d0f12', [0, -0.05, 0.28]),
    box(0.5, 0.01, 0.18, PANEL, [0.35, 0.05, -0.12]),
    box(0.5, 0.01, 0.18, PANEL, [-0.35, 0.05, -0.12]),
  ]
}

function nav() {
  return [
    ...satBus('#d7dde2', 0.8),
    box(0.16, 0.04, 0.16, '#8c96a0', [0, -0.13, 0]),
  ]
}

const AIR_BUILDERS: Record<AircraftType, () => BufferGeometry[]> = {
  'gen4-heavy': gen4Heavy,
  'gen4-light': gen4Light,
  gen45,
  gen5,
}

const SHIP_BUILDERS: Record<
  Exclude<ShipClass, 'carrier'>,
  () => BufferGeometry[]
> = {
  battleship,
  cruiser,
  destroyer,
  frigate,
  submarine,
}

const SAT_BUILDERS: Record<SatelliteModel, () => BufferGeometry[]> = {
  station,
  telescope,
  bus: () => satBus(),
  geo: geoSat,
  recon,
  nav,
}

export function buildAircraft(type: AircraftType): BufferGeometry {
  return merge(AIR_BUILDERS[type]())
}

/** 항공모함은 기존 운항 모형을 같이 씀 */
export function buildShip(kind: ShipClass): BufferGeometry {
  return kind === 'carrier'
    ? buildModel('carrier')
    : merge(SHIP_BUILDERS[kind]())
}

export function buildSatellite(model: SatelliteModel): BufferGeometry {
  return merge(SAT_BUILDERS[model]())
}
