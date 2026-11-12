import { useId, useRef, useState, useSyncExternalStore } from 'react'
import type { KeyboardEvent } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { Button } from '@/shared/ui'
import { cn, latLonToVector3 } from '@/shared/lib'
import type { CameraApi } from '../../model/camera'
import { GlobeScene } from './GlobeScene'
import { useT } from '../i18n'
import type { MessageKey } from '../i18n'

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

const BUTTONS: Array<{
  action: CameraAction
  label: MessageKey
  symbol: string
}> = [
  { action: 'left', label: 'globe.left', symbol: '←' },
  { action: 'right', label: 'globe.right', symbol: '→' },
  { action: 'up', label: 'globe.up', symbol: '↑' },
  { action: 'down', label: 'globe.down', symbol: '↓' },
  { action: 'in', label: 'globe.in', symbol: '+' },
  { action: 'out', label: 'globe.out', symbol: '−' },
]

function LoadingStatus() {
  const { active, progress } = useProgress()
  const { t } = useT()
  return (
    <p
      role="status"
      className="label-caps pointer-events-none absolute inset-x-0 top-1/3 text-center"
    >
      {active ? t('globe.loading', { percent: Math.round(progress) }) : ''}
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
export function GlobeViewport({
  className,
  hintId,
}: {
  className?: string
  /** 조작 안내 문구 id (페이지에 미리 그려 둠) */
  hintId: string
}) {
  const apiRef = useRef<CameraApi | null>(null)
  const { t } = useT()
  const reducedMotion = usePrefersReducedMotion()
  // 사용자가 직접 바꾸기 전에는 '동작 줄이기' 설정을 따름
  const [autoRotateChoice, setAutoRotate] = useState<boolean | null>(null)
  const autoRotate = autoRotateChoice ?? !reducedMotion
  const [showClouds, setShowClouds] = useState(true)
  const [showMarkers, setShowMarkers] = useState(true)
  // 모바일에서는 보기 토글을 접어 둠
  const [moreOpen, setMoreOpen] = useState(false)
  const optionsId = useId()

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
      className={cn('relative flex h-full w-full flex-col lg:block', className)}
    >
      {/* 초점을 받으면 화살표 키로 돌리고 +, − 키로 확대합니다 */}
      <div
        role="group"
        aria-roledescription={t('globe.role')}
        aria-label={t('globe.area')}
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
          dpr={[1, 1.75]}
          gl={{ antialias: true }}
          fallback={
            <p className="p-6 text-sm text-muted">{t('globe.noWebgl')}</p>
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
      <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-wrap items-end justify-center gap-2 px-3 lg:bottom-8 lg:gap-3 lg:p-3">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-xs border border-line bg-panel p-1.5 backdrop-blur">
          {BUTTONS.map((button) => (
            <Button
              key={button.action}
              size="sm"
              indicator={false}
              className="min-w-10 text-base lg:min-w-11"
              aria-label={t(button.label)}
              onClick={() => perform(button.action)}
            >
              {button.symbol}
            </Button>
          ))}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls={optionsId}
            onClick={() => setMoreOpen((v) => !v)}
            className="min-h-9 rounded-xs border border-line-strong px-3 font-display text-xs font-semibold uppercase tracking-[0.04em] text-ice lg:hidden"
          >
            {t('globe.view')}
          </button>
          <div
            id={optionsId}
            className={cn(
              'flex-wrap justify-center gap-1.5 lg:flex',
              moreOpen ? 'flex' : 'hidden',
            )}
          >
            <ToggleButton
              pressed={autoRotate}
              onClick={() => setAutoRotate(!autoRotate)}
            >
              {t('globe.autoRotate')}
            </ToggleButton>
            <ToggleButton
              pressed={showClouds}
              onClick={() => setShowClouds((v) => !v)}
            >
              {t('globe.clouds')}
            </ToggleButton>
            <ToggleButton
              pressed={showMarkers}
              onClick={() => setShowMarkers((v) => !v)}
            >
              {t('globe.markers')}
            </ToggleButton>
          </div>
        </div>
      </div>
    </div>
  )
}
