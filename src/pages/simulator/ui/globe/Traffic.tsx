import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import type { Material } from 'three'
import type { Vec3 } from '@/shared/lib'
import {
  createTraffic,
  fighterPose,
  fighterTrail,
  newPose,
  planePose,
  planeTrail,
  shipPose,
  shipTrail,
  shuttlePose,
  shuttleTrail,
  stepTraffic,
} from '../../model/traffic/motion'
import type { Pose, Traffic as TrafficState } from '../../model/traffic/motion'
import type { ShipKind } from '../../model/traffic/routes'
import { useWorld } from '../../model/world/store'
import { buildFlame, buildModel } from './trafficModels'
import type { ModelKind } from './trafficModels'

/** 기본 거리(3.7)에서 길이 (지구 반지름 1 기준, 실제보다 크게) */
const SIZE: Record<ModelKind, number> = {
  airliner: 0.022,
  fighter: 0.014,
  carrier: 0.028,
  cruise: 0.024,
  container: 0.026,
  orbiter: 0.02,
  stack: 0.034,
}

/** 꼬리 점 수 */
const TRAIL = { plane: 8, ship: 5, fighter: 6, shuttle: 10 }
const CONTRAIL: Vec3 = [0.86, 0.94, 1]
const JET: Vec3 = [0.62, 0.85, 1]
const EXHAUST: Vec3 = [1, 0.62, 0.3]
const WAKE: Vec3 = [0.62, 0.85, 1]

const INSTANCED = [
  'airliner',
  'fighter',
  'carrier',
  'cruise',
  'container',
] as const

/** 카메라 거리 → 크기 배율: 멀리서는 키우고 가까이서는 줄여 늘 알아볼 만하게 */
function zoomScale(distance: number): number {
  return Math.min(1.6, Math.max(0.45, (distance - 1) / 2.7))
}

/** 머리는 진하고 끝으로 갈수록 투명해지는 꼬리 선 묶음 */
class Trails {
  readonly line: LineSegments
  private readonly positions: Float32Array
  private readonly colors: Float32Array
  private segments = 0

  constructor(name: string, maxSegments: number, renderOrder: number) {
    this.positions = new Float32Array(maxSegments * 6)
    this.colors = new Float32Array(maxSegments * 8)
    const geometry = new BufferGeometry()
    geometry.setAttribute(
      'position',
      new BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage),
    )
    geometry.setAttribute(
      'color',
      new BufferAttribute(this.colors, 4).setUsage(DynamicDrawUsage),
    )
    geometry.setDrawRange(0, 0)
    this.line = new LineSegments(
      geometry,
      new LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
      }),
    )
    this.line.name = name
    this.line.frustumCulled = false
    this.line.renderOrder = renderOrder
  }

  begin() {
    this.segments = 0
  }

  add(points: Vec3[], count: number, color: Vec3, alpha: number) {
    const max = this.positions.length / 6
    for (let k = 0; k < count - 1 && this.segments < max; k++) {
      const p = this.segments * 6
      const c = this.segments * 8
      for (let i = 0; i < 3; i++) {
        this.positions[p + i] = points[k][i]
        this.positions[p + 3 + i] = points[k + 1][i]
        this.colors[c + i] = color[i]
        this.colors[c + 4 + i] = color[i]
      }
      this.colors[c + 3] = alpha * (1 - k / (count - 1))
      this.colors[c + 7] = alpha * (1 - (k + 1) / (count - 1))
      this.segments++
    }
  }

  end() {
    const { geometry } = this.line
    geometry.setDrawRange(0, this.segments * 2)
    geometry.getAttribute('position').needsUpdate = true
    geometry.getAttribute('color').needsUpdate = true
  }

  dispose() {
    this.line.geometry.dispose()
    ;(this.line.material as LineBasicMaterial).dispose()
  }
}

const points = (n: number): Vec3[] =>
  Array.from({ length: n }, () => [0, 0, 0] as Vec3)

function createAssets(traffic: TrafficState) {
  const material = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.6,
    metalness: 0.15,
    // 밤 쪽에서도 윤곽이 보이도록 아주 옅게 스스로 빛남
    emissive: new Color('#0d2236'),
    emissiveIntensity: 0.6,
    side: DoubleSide,
  })
  const shipCounts: Record<ShipKind, number> = {
    carrier: 0,
    cruise: 0,
    container: 0,
  }
  const shipSlots = traffic.ships.map((ship) => ({
    kind: ship.lane.kind,
    index: shipCounts[ship.lane.kind]++,
  }))
  const counts = {
    airliner: traffic.planes.length,
    fighter: traffic.fighters.length,
    ...shipCounts,
  }
  const hidden = new Matrix4().makeScale(0, 0, 0)
  const meshes = {} as Record<
    (typeof INSTANCED)[number],
    InstancedMesh<BufferGeometry, MeshStandardMaterial>
  >
  for (const kind of INSTANCED) {
    const mesh = new InstancedMesh(buildModel(kind), material, counts[kind])
    mesh.name = kind
    mesh.frustumCulled = false
    mesh.instanceMatrix.setUsage(DynamicDrawUsage)
    for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, hidden)
    meshes[kind] = mesh
  }

  const single = (
    name: string,
    geometry: BufferGeometry,
    mat: Material = material,
  ) => {
    const mesh = new Mesh(geometry, mat)
    mesh.name = name
    mesh.matrixAutoUpdate = false
    mesh.frustumCulled = false
    mesh.visible = false
    return mesh
  }
  const flameMaterial = new MeshBasicMaterial({
    color: '#ffb347',
    transparent: true,
    opacity: 0.9,
    blending: AdditiveBlending,
    depthWrite: false,
  })
  const stack = single('shuttle-stack', buildModel('stack'))
  const orbiter = single('shuttle-orbiter', buildModel('orbiter'))
  const flame = single('shuttle-flame', buildFlame(), flameMaterial)

  // 하늘 꼬리는 구름 뒤에, 배 물결은 구름 앞에 그려 구름이 덮게 함
  const air = new Trails(
    'air-trails',
    traffic.planes.length * (TRAIL.plane - 1) +
      traffic.fighters.length * (TRAIL.fighter - 1) +
      (TRAIL.shuttle - 1),
    2,
  )
  const sea = new Trails(
    'sea-trails',
    traffic.ships.length * (TRAIL.ship - 1),
    -1,
  )

  return {
    meshes,
    shipSlots,
    stack,
    orbiter,
    flame,
    air,
    sea,
    dispose() {
      for (const mesh of Object.values(meshes)) {
        mesh.geometry.dispose()
        mesh.dispose()
      }
      stack.geometry.dispose()
      orbiter.geometry.dispose()
      flame.geometry.dispose()
      material.dispose()
      flameMaterial.dispose()
      air.dispose()
      sea.dispose()
    },
  }
}

const matrix = new Matrix4()
const xAxis = new Vector3()
const yAxis = new Vector3()
const zAxis = new Vector3()
const sized = new Vector3()

/** 자세 → 행렬 (앞쪽 +Z, 위쪽 +Y). 크기가 0이면 숨김 */
function compose(out: Matrix4, pose: Pose, size: number): Matrix4 {
  const s = size * pose.scale
  if (s <= 0) return out.makeScale(0, 0, 0)
  yAxis.fromArray(pose.up)
  zAxis.fromArray(pose.forward)
  xAxis.crossVectors(yAxis, zAxis)
  out.makeBasis(xAxis, yAxis, zAxis).scale(sized.set(s, s, s))
  return out.setPosition(pose.position[0], pose.position[1], pose.position[2])
}

const flicker = new Matrix4()

interface TrafficProps {
  /** 동작 줄이기: 움직이지 않고 재해에 따른 결항·우회만 바로 반영 */
  reducedMotion: boolean
}

/**
 * 여객기·전투기·우주왕복선과 항공모함·크루즈선·컨테이너선. 실제 항로를 본뜬 가상 운항이고,
 * 화산재·태양 폭풍·쓰나미·지진·소행성·침수·태풍에 따라 우회·결항·피항합니다.
 */
export function Traffic({ reducedMotion }: TrafficProps) {
  const traffic = useMemo(() => createTraffic(), [])
  const assets = useMemo(() => createAssets(traffic), [traffic])
  useEffect(() => () => assets.dispose(), [assets])
  const scratch = useMemo(
    () => ({
      pose: newPose(),
      plane: points(TRAIL.plane),
      ship: points(TRAIL.ship),
      fighter: points(TRAIL.fighter),
      shuttle: points(TRAIL.shuttle),
    }),
    [],
  )

  useFrame(({ camera }, delta) => {
    const dt = reducedMotion ? 0 : Math.min(delta, 0.1)
    stepTraffic(traffic, useWorld.getState(), performance.now(), dt)
    const zoom = zoomScale(camera.position.length())
    const { meshes, shipSlots, air, sea } = assets
    const { pose } = scratch
    air.begin()
    sea.begin()

    for (let i = 0; i < traffic.planes.length; i++) {
      const plane = traffic.planes[i]
      planePose(plane, pose)
      meshes.airliner.setMatrixAt(
        i,
        compose(matrix, pose, SIZE.airliner * zoom),
      )
      const n = planeTrail(plane, scratch.plane)
      air.add(scratch.plane, n, CONTRAIL, 0.55 * pose.scale)
    }
    for (let i = 0; i < traffic.ships.length; i++) {
      const ship = traffic.ships[i]
      const slot = shipSlots[i]
      shipPose(ship, pose)
      meshes[slot.kind].setMatrixAt(
        slot.index,
        compose(matrix, pose, SIZE[slot.kind] * zoom),
      )
      sea.add(scratch.ship, shipTrail(ship, scratch.ship), WAKE, 0.4)
    }
    for (let i = 0; i < traffic.fighters.length; i++) {
      fighterPose(traffic, i, pose)
      meshes.fighter.setMatrixAt(i, compose(matrix, pose, SIZE.fighter * zoom))
      air.add(
        scratch.fighter,
        fighterTrail(traffic, i, scratch.fighter),
        JET,
        0.5,
      )
    }
    for (const mesh of Object.values(meshes))
      mesh.instanceMatrix.needsUpdate = true

    const { stacked, flame } = shuttlePose(traffic.shuttle, pose)
    const { stack, orbiter, flame: fire } = assets
    stack.visible = stacked
    orbiter.visible = !stacked
    const body = stacked ? stack : orbiter
    compose(body.matrix, pose, SIZE[stacked ? 'stack' : 'orbiter'] * zoom)
    body.matrixWorldNeedsUpdate = true
    fire.visible = flame > 0
    if (fire.visible) {
      const length = flame * (reducedMotion ? 1 : 0.85 + 0.3 * Math.random())
      fire.matrix.copy(stack.matrix).multiply(flicker.makeScale(1, 1, length))
      fire.matrixWorldNeedsUpdate = true
    }
    air.add(
      scratch.shuttle,
      shuttleTrail(traffic.shuttle, scratch.shuttle),
      EXHAUST,
      0.6,
    )

    air.end()
    sea.end()
  })

  return (
    <group>
      {Object.values(assets.meshes).map((mesh) => (
        <primitive key={mesh.name} object={mesh} />
      ))}
      <primitive object={assets.stack} />
      <primitive object={assets.orbiter} />
      <primitive object={assets.flame} />
      <primitive object={assets.air.line} />
      <primitive object={assets.sea.line} />
    </group>
  )
}
