import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ComponentRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Vector3 } from 'three'
import { useShallow } from 'zustand/react/shallow'
import { Planet } from './Planet'
import { Plumes } from './Plumes'
import type { PlumeInput } from '../../model/planet'
import { ALL_SITES, getSite } from '../../model/site/data'
import { SiteMarkers } from './SiteMarkers'
import type { MarkerTone } from './SiteMarkers'
import { StructureModels } from './StructureModels'
import { cityStates } from '../../model/world/selectors'
import { useWorld } from '../../model/world/store'
import type { CityState } from '../../model/world/types'
import { distanceKm, latLonToVector3, vector3ToLatLon } from '@/shared/lib'
import type { Vec3 } from '@/shared/lib'
import { buildFrame } from '../../model/frame'
import type { FrameClock } from '../../model/frame'
import { MAX_DISTANCE, MIN_DISTANCE, orbitPosition } from '../../model/camera'
import type { CameraApi } from '../../model/camera'

const TONE_BY_STATE: Record<CityState, MarkerTone> = {
  safe: 'normal',
  'at-risk': 'warn',
  protected: 'protected',
  flooded: 'danger',
}

interface GlobeSceneProps {
  apiRef: React.RefObject<CameraApi | null>
  autoRotate: boolean
  showClouds: boolean
  showMarkers: boolean
  reducedMotion: boolean
}

export function GlobeScene({
  apiRef,
  autoRotate,
  showClouds,
  showMarkers,
  reducedMotion,
}: GlobeSceneProps) {
  const camera = useThree((s) => s.camera)
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const goal = useRef<Vector3 | null>(null)
  const clock = useRef<FrameClock>({ cloudOffset: 0, lastTime: 0 })
  const plumesRef = useRef<PlumeInput[]>([])

  const selectedSiteId = useWorld((s) => s.selectedSiteId)
  const select = useWorld((s) => s.select)
  const structures = useWorld((s) => s.structures)
  const activeIds = useWorld(
    useShallow((s) =>
      s.structures.filter((x) => s.year >= x.completeYear).map((x) => x.id),
    ),
  )
  const tones = useWorld(
    useShallow((s) => {
      const states = cityStates(s)
      const out: Record<string, MarkerTone> = {}
      for (const [id, state] of Object.entries(states))
        out[id] = TONE_BY_STATE[state]
      for (const e of s.eruptions)
        if (s.year - e.year < 3) out[e.volcanoId] = 'danger'
      return out
    }),
  )

  // 카메라 조작 API (버튼·키보드용)
  useEffect(() => {
    apiRef.current = {
      rotate: (dTheta, dPhi) => {
        const from = goal.current ?? camera.position
        goal.current = new Vector3(
          ...orbitPosition([from.x, from.y, from.z], dTheta, dPhi),
        )
      },
      zoom: (factor) => {
        const from = goal.current ?? camera.position
        goal.current = new Vector3(
          ...orbitPosition([from.x, from.y, from.z], 0, 0, factor),
        )
      },
      focus: (direction) => {
        const distance = Math.min(camera.position.length(), 3)
        goal.current = new Vector3(...direction)
          .normalize()
          .multiplyScalar(Math.max(distance, 2.2))
      },
    }
    return () => {
      apiRef.current = null
    }
  }, [apiRef, camera])

  // 지점을 고르면 그쪽으로 돌림
  useEffect(() => {
    const site = selectedSiteId ? getSite(selectedSiteId) : undefined
    if (site) apiRef.current?.focus(latLonToVector3(site))
  }, [selectedSiteId, apiRef])

  useFrame((_, delta) => {
    const target = goal.current
    if (!target) return
    const step = reducedMotion ? 1 : 1 - Math.exp(-delta * 4)
    // 구면을 따라 방향과 거리를 따로 보간
    const dir = camera.position.clone().normalize()
    const goalDir = target.clone().normalize()
    const distance = camera.position.length()
    const newDir = dir.lerp(goalDir, step).normalize()
    const newDistance = distance + (target.length() - distance) * step
    camera.position.copy(newDir.multiplyScalar(newDistance))
    camera.lookAt(0, 0, 0)
    controlsRef.current?.update()
    if (camera.position.distanceTo(target) < 0.002) goal.current = null
  })

  const readFrame = useCallback((elapsed: number) => {
    const frame = buildFrame(
      useWorld.getState(),
      performance.now(),
      clock.current,
      elapsed,
    )
    plumesRef.current = frame.plumes
    return frame
  }, [])

  const onSurfaceClick = useCallback(
    (point: Vec3) => {
      const at = vector3ToLatLon(point)
      let best: { id: string; d: number } | null = null
      for (const site of ALL_SITES) {
        const d = distanceKm(at, site)
        if (d < 400 && (!best || d < best.d)) best = { id: site.id, d }
      }
      if (best) select(best.id)
    },
    [select],
  )

  const locate = useCallback((id: string) => getSite(id), [])
  const sites = useMemo(() => ALL_SITES, [])

  return (
    <>
      <color attach="background" args={['#000000']} />
      <Stars
        radius={60}
        depth={40}
        count={5000}
        factor={3}
        saturation={0}
        fade
        speed={reducedMotion ? 0 : 0.4}
      />
      <Suspense fallback={null}>
        <Planet
          readFrame={readFrame}
          showClouds={showClouds}
          onSurfaceClick={onSurfaceClick}
        />
        <PlumeLayer plumesRef={plumesRef} />
      </Suspense>
      {showMarkers ? (
        <SiteMarkers
          sites={sites}
          selectedId={selectedSiteId}
          tones={tones}
          onSelect={select}
        />
      ) : null}
      <StructureModels
        structures={structures}
        activeIds={activeIds}
        locate={locate}
      />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        rotateSpeed={0.45}
        zoomSpeed={0.6}
        minDistance={MIN_DISTANCE}
        maxDistance={MAX_DISTANCE}
        autoRotate={autoRotate}
        autoRotateSpeed={0.35}
        onStart={() => {
          goal.current = null
        }}
      />
    </>
  )
}

/** 분출 기둥은 매 프레임 나이가 바뀌므로, 분출이 있는 동안만 다시 그립니다 */
function PlumeLayer({
  plumesRef,
}: {
  plumesRef: React.RefObject<PlumeInput[]>
}) {
  const [plumes, setPlumes] = useState<PlumeInput[]>([])
  useFrame(() => {
    const next = plumesRef.current
    if (next.length > 0 || plumes.length > 0) setPlumes(next)
  })
  return <Plumes plumes={plumes} />
}
