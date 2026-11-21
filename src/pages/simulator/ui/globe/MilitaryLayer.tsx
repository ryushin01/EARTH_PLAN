import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  Matrix4,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import type { Vec3 } from '@/shared/lib'
import {
  FLEET_GROUPS,
  FLIGHT_GROUPS,
  findUnit,
  satelliteTime,
} from '../../model/military/catalog'
import {
  DISPLAY,
  groupLine,
  groupPoses,
  orbitLine,
  satellitePose,
} from '../../model/military/motion'
import { SATELLITES } from '../../model/military/satellites'
import type { SatelliteModel } from '../../model/military/satellites'
import { militaryClock, useMilitary } from '../../model/military/store'
import { AIRCRAFT, FLEETS, FLIGHTS, SHIPS } from '../../model/military/units'
import type { AircraftType, ShipClass } from '../../model/military/units'
import { newPose } from '../../model/traffic/motion'
import type { Pose } from '../../model/traffic/motion'
import { buildAircraft, buildSatellite, buildShip } from './militaryModels'

/** 위성 모형 길이 (지구 반지름 1 기준, 실제 크기와 상관없이 보이도록) */
const SAT_SIZE: Record<SatelliteModel, number> = {
  station: 0.045,
  telescope: 0.03,
  bus: 0.028,
  geo: 0.034,
  recon: 0.03,
  nav: 0.03,
}
const LINE_POINTS = 160

/** 카메라 거리 → 크기 배율 (운항 모형과 같은 식) */
const zoomScale = (distance: number) =>
  Math.min(1.6, Math.max(0.45, (distance - 1) / 2.7))

type Slot = { mesh: InstancedMesh; index: number }

function createAssets() {
  // 운항 모형과 같은 설정이라 셰이더를 새로 컴파일하지 않음 (소프트웨어 WebGL에서 컴파일이 수 초 걸림)
  const material = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.6,
    metalness: 0.15,
    emissive: new Color('#0d2236'),
    emissiveIntensity: 0.6,
    side: DoubleSide,
  })
  const meshes: InstancedMesh[] = []
  const hidden = new Matrix4().makeScale(0, 0, 0)
  /** 같은 종류끼리 인스턴스 메시 하나 */
  function pool<TKey extends string>(
    keys: TKey[],
    build: (k: TKey) => BufferGeometry,
    prefix: string,
  ) {
    const counts = new Map<TKey, number>()
    for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1)
    const byKind = new Map<TKey, InstancedMesh>()
    for (const [k, n] of counts) {
      const mesh = new InstancedMesh(build(k), material, n)
      mesh.name = `${prefix}-${k}`
      mesh.frustumCulled = false
      mesh.instanceMatrix.setUsage(DynamicDrawUsage)
      for (let i = 0; i < n; i++) mesh.setMatrixAt(i, hidden)
      byKind.set(k, mesh)
      meshes.push(mesh)
    }
    const used = new Map<TKey, number>()
    return keys.map((k): Slot => {
      const index = used.get(k) ?? 0
      used.set(k, index + 1)
      const mesh = byKind.get(k)
      if (!mesh) throw new Error(k)
      return { mesh, index }
    })
  }
  const satSlots = pool(
    SATELLITES.map((s) => s.model),
    buildSatellite,
    'satellite',
  )
  const airSlots = pool<AircraftType>(
    FLIGHTS.flatMap((f) => f.aircraft),
    buildAircraft,
    'aircraft',
  )
  const seaSlots = pool<ShipClass>(
    FLEETS.flatMap((f) => f.ships.map((s) => s.ship)),
    buildShip,
    'ship',
  )
  const positions = new Float32Array(LINE_POINTS * 3)
  // 선 색은 정점 색으로 (운항 꼬리 선과 같은 셰이더)
  const colors = new Float32Array(LINE_POINTS * 4)
  for (let k = 0; k < LINE_POINTS; k++) colors.set([0, 0.63, 1, 0.8], k * 4)
  const lineGeometry = new BufferGeometry()
  lineGeometry.setAttribute(
    'position',
    new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage),
  )
  lineGeometry.setAttribute('color', new BufferAttribute(colors, 4))
  lineGeometry.setDrawRange(0, 0)
  const lineMaterial = new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
  })
  const line = new Line(lineGeometry, lineMaterial)
  line.name = 'military-selected-track'
  line.frustumCulled = false

  return {
    meshes,
    satSlots,
    airSlots,
    seaSlots,
    line,
    linePoints: Array.from({ length: LINE_POINTS }, (): Vec3 => [0, 0, 0]),
    dispose() {
      for (const mesh of meshes) {
        mesh.geometry.dispose()
        mesh.dispose()
      }
      material.dispose()
      lineGeometry.dispose()
      lineMaterial.dispose()
    },
  }
}

const matrix = new Matrix4()
const xAxis = new Vector3()
const yAxis = new Vector3()
const zAxis = new Vector3()
const sized = new Vector3()

function place(slot: Slot, pose: Pose, size: number) {
  if (size <= 0) {
    slot.mesh.setMatrixAt(slot.index, matrix.makeScale(0, 0, 0))
    return
  }
  yAxis.fromArray(pose.up)
  zAxis.fromArray(pose.forward)
  xAxis.crossVectors(yAxis, zAxis)
  matrix.makeBasis(xAxis, yAxis, zAxis).scale(sized.set(size, size, size))
  matrix.setPosition(pose.position[0], pose.position[1], pose.position[2])
  slot.mesh.setMatrixAt(slot.index, matrix)
}

/**
 * 인공위성(군사·민간)과 전투기 편대·함대 훈련. 계산은 실제 단위이고,
 * 시간 압축·대형 간격·모형 크기·위성 고도 눈금은 model/military/motion의 DISPLAY를 따릅니다.
 */
export function MilitaryLayer({ reducedMotion }: { reducedMotion: boolean }) {
  const assets = useMemo(() => createAssets(), [])
  useEffect(() => () => assets.dispose(), [assets])
  // 올라오자마자 한 번 그려 첫 그리기(버퍼 올리기)를 조작과 겹치지 않게 함
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [invalidate])
  const poses = useMemo(() => Array.from({ length: 8 }, newPose), [])
  const pose = useMemo(() => newPose(), [])

  useFrame(({ camera }, delta) => {
    if (!reducedMotion) militaryClock.t += Math.min(delta, 0.1)
    const t = militaryClock.t
    const { layers, selectedId } = useMilitary.getState()
    const zoom = zoomScale(camera.position.length())

    SATELLITES.forEach((sat, k) => {
      const on = sat.use === 'military' ? layers.militarySat : layers.civilSat
      satellitePose(sat, satelliteTime(t), pose)
      place(assets.satSlots[k], pose, on ? SAT_SIZE[sat.model] * zoom : 0)
    })

    let a = 0
    FLIGHTS.forEach((flight, g) => {
      const n = groupPoses(FLIGHT_GROUPS[g], t, poses)
      for (let k = 0; k < n; k++) {
        const size =
          AIRCRAFT[flight.aircraft[k]].lengthM * DISPLAY.modelPerMeter.air
        place(assets.airSlots[a++], poses[k], layers.flights ? size * zoom : 0)
      }
    })

    let s = 0
    FLEETS.forEach((fleet, g) => {
      const n = groupPoses(FLEET_GROUPS[g], t, poses)
      for (let k = 0; k < n; k++) {
        const size =
          SHIPS[fleet.ships[k].ship].lengthM * DISPLAY.modelPerMeter.sea
        place(assets.seaSlots[s++], poses[k], layers.fleets ? size * zoom : 0)
      }
    })

    for (const mesh of assets.meshes) mesh.instanceMatrix.needsUpdate = true

    // 고른 개체의 궤도·훈련 경로
    const unit = findUnit(selectedId)
    const visible = unit ? layers[unit.layer] : false
    let count = 0
    if (unit && visible)
      count =
        unit.kind === 'satellite'
          ? orbitLine(unit.satellite, satelliteTime(t), assets.linePoints)
          : groupLine(unit.group, assets.linePoints)
    const attr = assets.line.geometry.getAttribute('position')
    for (let k = 0; k < count; k++) attr.setXYZ(k, ...assets.linePoints[k])
    attr.needsUpdate = true
    assets.line.geometry.setDrawRange(0, count)
  })

  return (
    <group name="military">
      {assets.meshes.map((mesh) => (
        <primitive key={mesh.name} object={mesh} />
      ))}
      <primitive object={assets.line} />
    </group>
  )
}
