import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/** 손을 뗀 뒤 감속이 거의 멈출 때까지 (감속 0.08이면 약 1초) */
export const CONTROLS_SETTLE_MS = 1_500

export interface GlobeControlsProps {
  autoRotate: boolean
  autoRotateSpeed: number
  enableDamping: boolean
  dampingFactor: number
  rotateSpeed: number
  zoomSpeed: number
  minDistance: number
  maxDistance: number
  /** 사용자가 끌기·확대를 시작하면 */
  onStart?: () => void
}

export interface GlobeControlsHandle {
  instance: OrbitControls
  update: () => void
  /** 사용자가 끌거나 확대하는 중이거나, 손을 뗀 뒤 감속하는 중 */
  isActive: () => boolean
}

/**
 * 지구본 궤도 조작기. drei의 OrbitControls는 카메라가 바뀔 때마다 다음 프레임을 요청해
 * 자동 회전만 있을 때도 매 화면 갱신마다 그리게 되므로, three.js 조작기를 직접 씀.
 * 사용자 조작 중에만 바뀔 때마다 그리고, 자동 회전은 지난 시간에 비례해 돌림(화면 주사율과 무관)
 */
export const GlobeControls = forwardRef<
  GlobeControlsHandle,
  GlobeControlsProps
>(function GlobeControlsImpl({ onStart, ...options }, ref) {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const target = useThree((state) => state.events.connected) as
    HTMLElement | undefined
  const invalidate = useThree((state) => state.invalidate)
  const controls = useMemo(() => new OrbitControls(camera), [camera])
  const activity = useRef({ dragging: false, settleUntil: 0 })
  const onStartRef = useRef(onStart)
  onStartRef.current = onStart

  useLayoutEffect(() => {
    Object.assign(controls, options, { enablePan: false })
  })

  useEffect(() => {
    const element = target ?? gl.domElement
    // DOM 이벤트를 받을 수 없는 캔버스(테스트 렌더러·OffscreenCanvas)면 연결하지 않음.
    // 키보드 연결(listenToKeyEvents)은 쓰지 않으므로 연결 해제가 곧 정리(dispose)
    if (typeof element.addEventListener !== 'function') return
    controls.connect(element)
    return () => controls.disconnect()
  }, [controls, target, gl])

  useEffect(() => {
    const isActive = () =>
      activity.current.dragging ||
      performance.now() < activity.current.settleUntil
    const start = () => {
      activity.current.dragging = true
      onStartRef.current?.()
      invalidate()
    }
    const end = () => {
      activity.current.dragging = false
      activity.current.settleUntil = performance.now() + CONTROLS_SETTLE_MS
      invalidate()
    }
    // 자동 회전·코드로 옮긴 변화는 이미 그리는 중인 프레임에 들어가므로, 사용자 조작일 때만 요청
    const change = () => {
      if (isActive()) invalidate()
    }
    controls.addEventListener('start', start)
    controls.addEventListener('end', end)
    controls.addEventListener('change', change)
    return () => {
      controls.removeEventListener('start', start)
      controls.removeEventListener('end', end)
      controls.removeEventListener('change', change)
    }
  }, [controls, invalidate])

  useImperativeHandle(
    ref,
    () => ({
      instance: controls,
      update: () => {
        controls.update()
      },
      isActive: () =>
        activity.current.dragging ||
        performance.now() < activity.current.settleUntil,
    }),
    [controls],
  )

  // 쉬다가 다시 그릴 때 지난 시간이 길어도 한 번에 크게 돌지 않게 제한
  useFrame((_, delta) => {
    controls.update(Math.min(delta, 0.1))
  })

  return null
})
