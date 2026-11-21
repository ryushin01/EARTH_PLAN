import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * 항공·선박 저폴리 모형. 상자·원기둥·원뿔·평면 날개를 정점 색과 함께 하나의 도형으로 합쳐
 * 종류마다 인스턴스 메시 하나로 그립니다. 앞쪽 +Z, 위쪽 +Y, 길이 약 1.
 * (발사 모습 stack은 맨 아래가 원점이고 +Z로 섬)
 */
export type ModelKind =
  | 'airliner'
  | 'fighter'
  | 'carrier'
  | 'cruise'
  | 'container'
  | 'orbiter'
  | 'stack'

type At = [number, number, number]

const tint = new Color()

/** 색인을 풀고 uv를 지운 뒤 정점 색을 칠함 (합치기 쉽게) */
export function paint(geometry: BufferGeometry, hex: string): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry
  if (flat !== geometry) geometry.dispose()
  flat.deleteAttribute('uv')
  tint.set(hex)
  const count = flat.getAttribute('position').count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    colors[i * 3] = tint.r
    colors[i * 3 + 1] = tint.g
    colors[i * 3 + 2] = tint.b
  }
  flat.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return flat
}

export function box(
  w: number,
  h: number,
  l: number,
  hex: string,
  at: At,
  yaw = 0,
) {
  const g = new BoxGeometry(w, h, l)
  if (yaw) g.rotateY(yaw)
  g.translate(...at)
  return paint(g, hex)
}

/** Z축으로 누운 원기둥 (앞 반지름 front, 뒤 반지름 back) */
export function tube(
  front: number,
  back: number,
  l: number,
  hex: string,
  at: At,
) {
  const g = new CylinderGeometry(front, back, l, 10)
  g.rotateX(Math.PI / 2)
  g.translate(...at)
  return paint(g, hex)
}

/** 원뿔: forward면 끝이 +Z, 아니면 -Z를 향함 */
export function cone(
  r: number,
  l: number,
  hex: string,
  at: At,
  forward = true,
) {
  const g = new ConeGeometry(r, l, 10)
  g.rotateX(forward ? Math.PI / 2 : -Math.PI / 2)
  g.translate(...at)
  return paint(g, hex)
}

/** 높이 y인 XZ 평면의 볼록 다각형 (x > 0 쪽 꼭짓점을 주면 좌우 대칭으로 만듦) */
export function wings(points: [number, number][], y: number, hex: string) {
  const position: number[] = []
  for (const side of [1, -1])
    for (let i = 1; i < points.length - 1; i++)
      for (const [x, z] of [points[0], points[i], points[i + 1]])
        position.push(x * side, y, z)
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(position, 3))
  g.computeVertexNormals()
  return paint(g, hex)
}

export function merge(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts)
  for (const p of parts) p.dispose()
  merged.computeBoundingSphere()
  return merged
}

const ACCENT = '#00a1ff'

function airliner() {
  const body = '#e9f1f8'
  return [
    tube(0.055, 0.055, 0.82, body, [0, 0, -0.02]),
    cone(0.055, 0.14, body, [0, 0, 0.46]),
    cone(0.055, 0.16, body, [0, 0, -0.51], false),
    wings(
      [
        [0.04, 0.14],
        [0.52, -0.12],
        [0.52, -0.2],
        [0.04, -0.06],
      ],
      -0.012,
      '#c7d3df',
    ),
    wings(
      [
        [0.03, -0.37],
        [0.2, -0.47],
        [0.2, -0.51],
        [0.03, -0.47],
      ],
      0,
      '#c7d3df',
    ),
    box(0.014, 0.17, 0.14, ACCENT, [0, 0.1, -0.43]),
    tube(0.03, 0.03, 0.12, '#8a98a6', [0.21, -0.05, 0.03]),
    tube(0.03, 0.03, 0.12, '#8a98a6', [-0.21, -0.05, 0.03]),
  ]
}

function fighter() {
  const body = '#8d99a5'
  return [
    tube(0.045, 0.04, 0.8, body, [0, 0, -0.05]),
    cone(0.045, 0.25, body, [0, 0, 0.475]),
    wings(
      [
        [0.04, 0.22],
        [0.4, -0.28],
        [0.4, -0.34],
        [0.04, -0.34],
      ],
      0,
      '#76828e',
    ),
    box(0.012, 0.13, 0.12, '#6c7884', [0.07, 0.07, -0.36]),
    box(0.012, 0.13, 0.12, '#6c7884', [-0.07, 0.07, -0.36]),
    box(0.05, 0.035, 0.14, ACCENT, [0, 0.045, 0.22]),
  ]
}

function carrier() {
  return [
    box(0.17, 0.07, 0.95, '#5f6b77', [0, -0.03, 0]),
    box(0.24, 0.015, 1, '#39424b', [0.02, 0.012, 0]),
    box(0.1, 0.014, 0.4, '#39424b', [0.11, 0.012, -0.12], 0.16),
    box(0.045, 0.08, 0.14, '#8a96a2', [-0.09, 0.06, -0.05]),
    box(0.008, 0.002, 0.9, '#e8eef3', [0.02, 0.0205, 0]),
  ]
}

function cruise() {
  const white = '#f3f6f9'
  return [
    box(0.19, 0.07, 1, white, [0, -0.02, 0]),
    box(0.195, 0.022, 1.005, '#1f3c5a', [0, -0.045, 0]),
    box(0.17, 0.05, 0.78, white, [0, 0.04, -0.03]),
    box(0.15, 0.045, 0.6, '#dde5ec', [0, 0.085, -0.06]),
    box(0.11, 0.04, 0.36, white, [0, 0.125, -0.08]),
    box(0.05, 0.07, 0.09, ACCENT, [0, 0.175, -0.2]),
  ]
}

const CONTAINER_COLORS = [
  '#b5523b',
  '#2e7cb8',
  '#c9a227',
  '#3f8f5a',
  '#d07a2a',
  '#7f8c8d',
]

function container() {
  return [
    box(0.17, 0.07, 1, '#2c3e50', [0, -0.02, 0]),
    box(0.175, 0.02, 1.005, '#7a2e2a', [0, -0.05, 0]),
    ...CONTAINER_COLORS.map((hex, i) =>
      box(0.15, 0.05, 0.1, hex, [0, 0.04, 0.36 - i * 0.12]),
    ),
    box(0.15, 0.1, 0.07, '#e8edf2', [0, 0.065, -0.44]),
  ]
}

function orbiter() {
  const white = '#f4f6f8'
  const dark = '#23272d'
  const delta: [number, number][] = [
    [0.07, 0.15],
    [0.42, -0.3],
    [0.42, -0.38],
    [0.07, -0.38],
  ]
  return [
    box(0.16, 0.1, 0.78, white, [0, 0.01, -0.02]),
    box(0.16, 0.03, 0.78, dark, [0, -0.05, -0.02]),
    cone(0.08, 0.2, white, [0, 0, 0.47]),
    wings(delta, -0.03, white),
    wings(delta, -0.036, dark),
    box(0.014, 0.2, 0.16, white, [0, 0.14, -0.33]),
    tube(0.03, 0.035, 0.06, dark, [0, 0.03, -0.43]),
    tube(0.03, 0.035, 0.06, dark, [0.045, -0.01, -0.43]),
    tube(0.03, 0.035, 0.06, dark, [-0.045, -0.01, -0.43]),
  ]
}

function stack() {
  const tank = '#d9773a'
  const booster = '#eef2f5'
  const shuttle = orbiter().map((part) => {
    part.scale(0.62, 0.62, 0.62)
    part.translate(0, 0.17, 0.42)
    return part
  })
  return [
    tube(0.1, 0.1, 0.82, tank, [0, 0, 0.41]),
    cone(0.1, 0.16, tank, [0, 0, 0.9]),
    tube(0.045, 0.045, 0.78, booster, [0.15, 0, 0.39]),
    tube(0.045, 0.045, 0.78, booster, [-0.15, 0, 0.39]),
    cone(0.045, 0.08, booster, [0.15, 0, 0.82]),
    cone(0.045, 0.08, booster, [-0.15, 0, 0.82]),
    ...shuttle,
  ]
}

const BUILDERS: Record<ModelKind, () => BufferGeometry[]> = {
  airliner,
  fighter,
  carrier,
  cruise,
  container,
  orbiter,
  stack,
}

export function buildModel(kind: ModelKind): BufferGeometry {
  return merge(BUILDERS[kind]())
}

/** 발사 불꽃: 맨 아래(원점)에서 -Z로 뻗는 원뿔 */
export function buildFlame(): BufferGeometry {
  const g = new ConeGeometry(0.11, 0.34, 10)
  g.rotateX(-Math.PI / 2)
  g.translate(0, 0, -0.17)
  return g
}
