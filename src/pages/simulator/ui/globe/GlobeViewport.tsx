import { useId, useRef, useState, useSyncExternalStore } from 'react'
import type { KeyboardEvent } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { Button } from '@/shared/ui'
import { cn, latLonToVector3 } from '@/shared/lib'
import type { CameraApi } from '../../model/camera'
import { GlobeScene } from './GlobeScene'

const STEP = Math.PI / 12
const MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(MOTION_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false,
  )
}

type CameraAction = 'left' | 'right' | 'up' | 'down' | 'in' | 'out'

const ACTIONS: Record<CameraAction, (api: CameraApi) => void> = {
  left: (api) => api.rotate(-STEP, 0),
  right: (api) => api.rotate(STEP, 0),
  up: (api) => api.rotate(0, -STEP),
  down: (api) => api.rotate(0, STEP),
  in: (api) => api.zoom(0.8),
  out: (api) => api.zoom(1.25),
}

const KEY_ACTIONS: Partial<Record<string, CameraAction>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  '+': 'in',
  '=': 'in',
  '-': 'out',
}

const BUTTONS: Array<{ action: CameraAction; label: string; symbol: string }> =
  [
    { action: 'left', label: '왼쪽으로 돌리기', symbol: '←' },
    { action: 'right', label: '오른쪽으로 돌리기', symbol: '→' },
    { action: 'up', label: '북쪽으로 기울이기', symbol: '↑' },
    { action: 'down', label: '남쪽으로 기울이기', symbol: '↓' },
    { action: 'in', label: '확대', symbol: '+' },
    { action: 'out', label: '축소', symbol: '−' },
  ]

function LoadingStatus() {
  const { active, progress } = useProgress()
  return (
    <p
      role="status"
      className="label-caps pointer-events-none absolute inset-x-0 top-1/3 text-center"
    >
      {active ? `지구를 불러오는 중 ${Math.round(progress)}%` : ''}
    </p>
  )
}

function ToggleButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'min-h-11 rounded-xs border px-3 font-display text-xs font-semibold uppercase tracking-[0.04em] transition-colors',
        pressed
          ? 'border-accent bg-accent/15 text-ice'
          : 'border-line-strong text-muted hover:text-ice',
      )}
    >
      {children}
    </button>
  )
}

/** 끌어서 돌리고 확대할 수 있는 3D 지구본 */
export function GlobeViewport({ className }: { className?: string }) {
  const apiRef = useRef<CameraApi | null>(null)
  const reducedMotion = usePrefersReducedMotion()
  // 사용자가 직접 바꾸기 전에는 '동작 줄이기' 설정을 따름
  const [autoRotateChoice, setAutoRotate] = useState<boolean | null>(null)
  const autoRotate = autoRotateChoice ?? !reducedMotion
  const [showClouds, setShowClouds] = useState(true)
  const [showMarkers, setShowMarkers] = useState(true)
  const hintId = useId()

  const perform = (action: CameraAction) => {
    setAutoRotate(false)
    const api = apiRef.current
    if (api) ACTIONS[action](api)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const action = KEY_ACTIONS[event.key]
    if (!action || event.target !== event.currentTarget) return
    event.preventDefault()
    perform(action)
  }

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col lg:relative lg:block',
        className,
      )}
    >
      {/* 초점을 받으면 화살표 키로 돌리고 +, − 키로 확대합니다 */}
      <div
        role="group"
        aria-roledescription="3D 지구본"
        aria-label="지구본 조작 영역"
        aria-describedby={hintId}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative min-h-0 flex-1 touch-none focus-visible:outline-offset-[-4px] lg:absolute lg:inset-0"
      >
        <Canvas
          camera={{
            position: latLonToVector3({ lat: 25, lon: 128 }, 3.7),
            fov: 40,
            near: 0.05,
            far: 200,
          }}
          dpr={[1, 2]}
          gl={{ antialias: true }}
          fallback={
            <p className="p-6 text-sm text-muted">
              이 브라우저에서는 WebGL을 쓸 수 없어 3D 지구를 표시하지 못합니다.
            </p>
          }
        >
          <GlobeScene
            apiRef={apiRef}
            autoRotate={autoRotate}
            showClouds={showClouds}
            showMarkers={showMarkers}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      </div>
      <LoadingStatus />
      <div className="pointer-events-none flex flex-wrap items-end justify-center gap-2 px-3 pt-2 lg:absolute lg:inset-x-0 lg:bottom-4 lg:gap-3 lg:p-3">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-xs border border-line bg-panel p-1.5 backdrop-blur">
          {BUTTONS.map((button) => (
            <Button
              key={button.action}
              size="sm"
              indicator={false}
              className="min-w-11 text-base"
              aria-label={button.label}
              onClick={() => perform(button.action)}
            >
              {button.symbol}
            </Button>
          ))}
          <ToggleButton
            pressed={autoRotate}
            onClick={() => setAutoRotate(!autoRotate)}
          >
            자동 회전
          </ToggleButton>
          <ToggleButton
            pressed={showClouds}
            onClick={() => setShowClouds((v) => !v)}
          >
            구름
          </ToggleButton>
          <ToggleButton
            pressed={showMarkers}
            onClick={() => setShowMarkers((v) => !v)}
          >
            지점
          </ToggleButton>
        </div>
        <p
          id={hintId}
          className="pointer-events-none w-full text-center text-xs text-muted"
        >
          끌어서 돌리기 · 휠이나 두 손가락으로 확대 · 지구를 선택한 뒤 화살표
          키로 돌리고 +, − 키로 확대
        </p>
      </div>
    </div>
  )
}
