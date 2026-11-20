import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { Vector3 } from 'three'
import { useShallow } from 'zustand/react/shallow'
import { GlobeControls } from './GlobeControls'
import type { GlobeControlsHandle } from './GlobeControls'
import { Planet } from './Planet'
import { Plumes } from './Plumes'
import type { PlumeInput } from '../../model/planet'
import { ALL_SITES, getSite } from '../../model/site/data'
import { SiteMarkers } from './SiteMarkers'
import type { MarkerTone } from './SiteMarkers'
import { StructureModels } from './StructureModels'
import { Traffic } from './Traffic'
import { TodayLayer } from './TodayLayer'
import { MigrationLayer } from './MigrationLayer'
import { useToday } from '../../model/today/store'
import { kpAurora } from '../../model/today/today'
import { cityStates } from '../../model/world/selectors'
import { useWorld } from '../../model/world/store'
import { useWorldSampled } from '../../model/world/sampled'
import type { CityState } from '../../model/world/types'
import { distanceKm, latLonToVector3, vector3ToLatLon } from '@/shared/lib'
import type { Vec3 } from '@/shared/lib'
import { buildFrame } from '../../model/frame'
import type { FrameClock } from '../../model/frame'
import { MAX_DISTANCE, MIN_DISTANCE, orbitPosition } from '../../model/camera'
import type { CameraApi } from '../../model/camera'
import { nextFrameDelay, renderMode, transientUntil } from '../../model/render'

const scratchDir = new Vector3()
const scratchGoal = new Vector3()

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
  /** 항공·선박 운항 */
  showTraffic: boolean
  /** 인구 이동 흐름 */
  showMigration?: boolean
  reducedMotion: boolean
  /** 별 배경 (정지 이미지를 찍을 때는 끔) */
  showStars?: boolean
  /** 지구가 처음 보이게 되면 */
  onReady?: () => void
}

export function GlobeScene({
  apiRef,
  autoRotate,
  showClouds,
  showMarkers,
  showTraffic,
  showMigration = false,
  reducedMotion,
  showStars = true,
  onReady,
}: GlobeSceneProps) {
  const camera = useThree((s) => s.camera)
  const controlsRef = useRef<GlobeControlsHandle>(null)
  const invalidate = useThree((s) => s.invalidate)
  const frameTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const goal = useRef<Vector3 | null>(null)
  const clock = useRef<FrameClock>({ cloudOffset: 0, lastTime: 0 })
  const plumesRef = useRef<PlumeInput[]>([])

  const todayEnabled = useToday((s) => s.enabled)
  const todayData = useToday((s) => s.data)
  const todayFocus = useToday((s) => s.focusTick)
  const selectedSiteId = useWorldSampled((s) => s.selectedSiteId)
  const select = useWorldSampled((s) => s.select)
  const structures = useWorldSampled((s) => s.structures)
  const activeIds = useWorldSampled(
    useShallow((s) =>
      s.structures.filter((x) => s.year >= x.completeYear).map((x) => x.id),
    ),
  )
  const tones = useWorldSampled(
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
        invalidate()
      },
      zoom: (factor) => {
        const from = goal.current ?? camera.position
        goal.current = new Vector3(
          ...orbitPosition([from.x, from.y, from.z], 0, 0, factor),
        )
        invalidate()
      },
      focus: (direction) => {
        const distance = Math.min(camera.position.length(), 3)
        goal.current = new Vector3(...direction)
          .normalize()
          .multiplyScalar(Math.max(distance, 2.2))
        invalidate()
      },
    }
    return () => {
      apiRef.current = null
    }
  }, [apiRef, camera, invalidate])

  // 지점을 고르면 그쪽으로 돌림
  useEffect(() => {
    const site = selectedSiteId ? getSite(selectedSiteId) : undefined
    if (site) apiRef.current?.focus(latLonToVector3(site))
  }, [selectedSiteId, apiRef])

  // 오늘의 지구에서 지진을 고르면 그쪽으로 돌림
  useEffect(() => {
    if (todayFocus === 0) return
    const { data, focusId } = useToday.getState()
    const quake = data?.quakes.find((q) => q.id === focusId)
    if (quake) apiRef.current?.focus(latLonToVector3(quake))
  }, [todayFocus, apiRef])

  useFrame((_, delta) => {
    const target = goal.current
    if (!target) return
    const step = reducedMotion ? 1 : 1 - Math.exp(-delta * 4)
    // 구면을 따라 방향과 거리를 따로 보간 (프레임마다 벡터를 새로 만들지 않음)
    const distance = camera.position.length()
    const newDistance = distance + (target.length() - distance) * step
    const newDir = scratchDir
      .copy(camera.position)
      .normalize()
      .lerp(scratchGoal.copy(target).normalize(), step)
      .normalize()
    camera.position.copy(newDir.multiplyScalar(newDistance))
    camera.lookAt(0, 0, 0)
    controlsRef.current?.update()
    if (camera.position.distanceTo(target) < 0.002) goal.current = null
  })

  // 필요할 때만 그리기 (Canvas는 frameloop="demand"). 세계 상태가 바뀌거나 설정이 바뀌면 다시 그리고,
  // 프레임마다 다음 프레임을 바로·약 1/30초 뒤에 요청하거나 쉼
  useEffect(() => useWorld.subscribe(() => invalidate()), [invalidate])
  useEffect(() => {
    invalidate()
  }, [
    autoRotate,
    reducedMotion,
    showClouds,
    showMarkers,
    showTraffic,
    invalidate,
  ])
  useEffect(() => () => clearTimeout(frameTimer.current), [])
  useFrame((state) => {
    clearTimeout(frameTimer.current)
    const world = useWorld.getState()
    const delay = nextFrameDelay(
      renderMode({
        running: world.running,
        interacting: controlsRef.current?.isActive() ?? false,
        cameraMoving: goal.current !== null,
        transient: performance.now() < transientUntil(world),
        autoRotate,
        ambientMotion: !reducedMotion,
      }),
    )
    if (delay === 0) state.invalidate()
    else if (delay !== null)
      frameTimer.current = setTimeout(() => state.invalidate(), delay)
  })

  const readFrame = useCallback((elapsed: number) => {
    const frame = buildFrame(
      useWorld.getState(),
      performance.now(),
      clock.current,
      elapsed,
    )
    plumesRef.current = frame.plumes
    // 오늘의 지구: 지금 Kp에 맞는 오로라 (더 센 가상 태양 폭풍이 있으면 그쪽)
    const today = useToday.getState()
    const kp = today.enabled ? today.data?.kp.at(-1) : undefined
    if (kp) {
      const real = kpAurora(kp.kp)
      if (real.strength > frame.aurora.strength) frame.aurora = real
    }
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
      {showStars ? (
        <Stars
          radius={60}
          depth={40}
          count={3000}
          factor={3}
          saturation={0}
          fade
          speed={reducedMotion ? 0 : 0.4}
        />
      ) : null}
      <Suspense fallback={null}>
        <Planet
          readFrame={readFrame}
          showClouds={showClouds}
          onSurfaceClick={onSurfaceClick}
          onReady={onReady}
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
      {showTraffic ? <Traffic reducedMotion={reducedMotion} /> : null}
      {showMigration ? <MigrationLayer reducedMotion={reducedMotion} /> : null}
      {todayEnabled && todayData ? (
        <TodayLayer
          // 인스턴스 수가 바뀌면 메시를 새로 만듦
          key={todayData.quakes.length}
          quakes={todayData.quakes}
          now={Date.parse(todayData.fetchedAt)}
        />
      ) : null}
      <GlobeControls
        ref={controlsRef}
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
