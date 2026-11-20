import { useLayoutEffect, useRef } from 'react'
import { Color, Object3D, Vector3 } from 'three'
import type { InstancedMesh } from 'three'
import { latLonToVector3 } from '@/shared/lib'
import type { TodayQuake } from '../../model/today/today'

/** 지구(반지름 1) 표면 바로 위 */
const RADIUS = 1.004
/** 자료 시각 기준 최근 24시간 */
const RECENT = new Color('#ff6a3d')
const OLDER = new Color('#ffc46b')

/** 규모 4.5에서 지름 0.01(약 32km), 규모가 1 클 때마다 0.012씩 */
export function quakeSize(mag: number): number {
  return 0.005 + Math.max(0, mag - 4.5) * 0.006
}

/**
 * 오늘의 지구: 실제 지진(지난 7일 규모 4.5 이상)을 지구 표면의 점으로.
 * 움직이지 않으므로 바뀔 때만 행렬을 씀(필요할 때만 그리기와 어울림)
 */
export function TodayLayer({
  quakes,
  now,
}: {
  quakes: readonly TodayQuake[]
  /** 최근 24시간을 가를 기준 시각 (자료를 받은 시각, UTC ms) */
  now: number
}) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    const outward = new Vector3()
    quakes.forEach((quake, i) => {
      dummy.position.set(...latLonToVector3(quake, RADIUS))
      // 원(+z를 봄)이 바깥을 보게
      dummy.lookAt(outward.copy(dummy.position).multiplyScalar(2))
      dummy.scale.setScalar(quakeSize(quake.mag))
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, now - quake.time < 86_400_000 ? RECENT : OLDER)
    })
    mesh.count = quakes.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [quakes, now])
  return (
    <instancedMesh
      ref={ref}
      name="today-quakes"
      args={[undefined, undefined, Math.max(1, quakes.length)]}
      frustumCulled={false}
    >
      <circleGeometry args={[1, 24]} />
      <meshBasicMaterial
        transparent
        opacity={0.85}
        toneMapped={false}
        depthWrite={false}
      />
    </instancedMesh>
  )
}
