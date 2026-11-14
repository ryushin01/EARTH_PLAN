import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/lib'
import type { CameraApi } from '../../model/camera'
import { SHARE_PARAM } from '../../model/world/snapshot'
import { useT } from '../i18n'
import type { MessageKey } from '../i18n'
import { WAKE_EVENTS, wokeEarly } from './earlyWake'
import poster600 from './poster/earth-600.webp'
import poster800 from './poster/earth-800.webp'
import poster1200 from './poster/earth-1200.webp'

// three.js를 쓰는 부분은 필요할 때 따로 받습니다
const loadGlobeCanvas = () => import('./GlobeCanvas')
const GlobeCanvas = lazy(() =>
  loadGlobeCanvas().then((m) => ({ default: m.GlobeCanvas })),
)

/** 상호작용이 없을 때 3D 지구를 불러오기까지 기다리는 시간 */
export const IDLE_LOAD_MS = 5000

/** requestIdleCallback이 없는 브라우저에서 미리 받기까지 기다리는 시간 */
export const PREFETCH_FALLBACK_MS = 1500

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

const subscribeNothing = () => () => {}

/** 공유 링크로 열었는지 (상태가 처음과 달라 정지 이미지를 쓸 수 없음) */
function useOpenedFromShareLink() {
  return useSyncExternalStore(
    subscribeNothing,
    () => new URLSearchParams(window.location.search).has(SHARE_PARAM),
    () => false,
  )
}

type NetworkInformation = { saveData?: boolean; effectiveType?: string }

function connection() {
  return (navigator as Navigator & { connection?: NetworkInformation })
    .connection
}

/** 브라우저의 데이터 절약 모드 (지원하지 않으면 false) */
function prefersSaveData() {
  return connection()?.saveData === true
}

/** 2G급 느린 회선 (지원하지 않으면 false) */
function slowConnection() {
  return /(^|-)2g$/.test(connection()?.effectiveType ?? '')
}

/**
 * 페이지가 한가해지면 3D 묶음과 텍스처를 미리 받아 둠 (첫 상호작용 뒤 기다림을 줄임).
 * 이미 3D를 불러오기 시작했거나, 데이터 절약 모드·느린 회선이면 하지 않음
 */
function usePrefetchGlobe(skip: boolean) {
  useEffect(() => {
    if (skip || prefersSaveData() || slowConnection()) return
    let cancelled = false
    const run = () => {
      if (cancelled) return
      loadGlobeCanvas()
        .then((m) => {
          if (!cancelled) m.preloadGlobe()
        })
        // 미리 받기에 실패해도 3D를 그릴 때 다시 받음
        .catch(() => undefined)
    }
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(run, { timeout: IDLE_LOAD_MS })
      return () => {
        cancelled = true
        window.cancelIdleCallback(handle)
      }
    }
    const timer = setTimeout(run, PREFETCH_FALLBACK_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [skip])
}

/**
 * 첫 상호작용이나 IDLE_LOAD_MS가 지나면 true. 공유 링크면 바로 true.
 * 페이지가 준비되기 전에 입력이 있었으면(EARLY_WAKE_SCRIPT가 기록) 바로 true.
 * 데이터 절약 모드에서는 저절로 받지 않고 상호작용할 때만 받음
 */
function useWake(immediate: boolean) {
  const [awake, setAwake] = useState(false)
  useEffect(() => {
    if (awake) return
    const wake = () => setAwake(true)
    const options = { capture: true, passive: true } as const
    for (const type of WAKE_EVENTS) window.addEventListener(type, wake, options)
    const now = immediate || wokeEarly()
    const timer =
      now || !prefersSaveData()
        ? setTimeout(wake, now ? 0 : IDLE_LOAD_MS)
        : undefined
    return () => {
      clearTimeout(timer)
      for (const type of WAKE_EVENTS)
        window.removeEventListener(type, wake, options)
    }
  }, [awake, immediate])
  return awake
}

/** 3D를 그리지 못하면(WebGL 없음, 묶음 받기 실패) 알리고 정지 이미지를 그대로 둠 */
class GlobeErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
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

/**
 * 끌어서 돌리고 확대할 수 있는 3D 지구본.
 * 처음에는 같은 시점의 정지 이미지를 보여 주고, 첫 상호작용이나 잠시 뒤에 3D를 불러와 바꿉니다.
 */
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

  const shared = useOpenedFromShareLink()
  const awake = useWake(shared)
  usePrefetchGlobe(awake)
  const [percent, setPercent] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [posterFaded, setPosterFaded] = useState(false)
  // 지구가 보이기 전에 누른 회전·확대는 모아 두었다가 보이면 이어서 실행
  // (정지 이미지와 같은 자리에서 3D로 바뀐 뒤에 움직이도록)
  const pending = useRef<CameraAction[]>([])

  const perform = (action: CameraAction) => {
    setAutoRotate(false)
    const api = apiRef.current
    if (api && ready) ACTIONS[action](api)
    else pending.current.push(action)
  }

  const onReady = useCallback(() => {
    setReady(true)
    const api = apiRef.current
    if (api)
      for (const action of pending.current.splice(0)) ACTIONS[action](api)
  }, [])
  const onFailed = useCallback(() => {
    setFailed(true)
    // 지구가 보인 뒤에 멈춰도 정지 이미지를 다시 보여 줌
    setReady(false)
    setPosterFaded(false)
  }, [])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const action = KEY_ACTIONS[event.key]
    if (!action || event.target !== event.currentTarget) return
    event.preventDefault()
    perform(action)
  }

  const showPoster = !shared && !(ready && (posterFaded || reducedMotion))
  const status = failed
    ? t('globe.noWebgl')
    : awake && !ready
      ? percent === null
        ? t('page.globeLoading')
        : t('globe.loading', { percent })
      : ''

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
        {awake ? (
          <GlobeErrorBoundary onError={onFailed}>
            <Suspense fallback={null}>
              <GlobeCanvas
                apiRef={apiRef}
                // 정지 이미지와 같은 자리에서 바뀌도록 지구가 보인 뒤에 돌기 시작
                autoRotate={autoRotate && ready}
                showClouds={showClouds}
                showMarkers={showMarkers}
                reducedMotion={reducedMotion}
                onProgress={setPercent}
                onReady={onReady}
              />
            </Suspense>
          </GlobeErrorBoundary>
        ) : null}
        {showPoster ? (
          // 3D와 같은 시점·시각에서 찍은 정지 이미지 (같은 지구를 보여 주므로 꾸밈 이미지로 둠)
          <div className="pointer-events-none absolute inset-0 flex justify-center overflow-hidden">
            <img
              src={poster1200}
              srcSet={`${poster600} 600w, ${poster800} 800w, ${poster1200} 1200w`}
              sizes="(min-width: 1024px) 100vh, 45vh"
              width={1200}
              height={1200}
              alt=""
              fetchPriority="high"
              onTransitionEnd={() => setPosterFaded(true)}
              className={cn(
                'h-full w-auto max-w-none transition-opacity duration-500 motion-reduce:transition-none',
                ready && 'opacity-0',
              )}
            />
          </div>
        ) : null}
      </div>
      {/* 정지 이미지가 보이는 동안에는 화면에서 감추고 낭독기에만 알림 */}
      <p
        role="status"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-1/3 z-10 text-center',
          // 실패 안내는 정지 이미지 위에서도 읽히도록 어두운 상자에 보통 글자로
          failed
            ? 'mx-auto w-fit max-w-[calc(100%-2rem)] rounded-xs border border-line bg-panel-solid px-4 py-2 text-sm text-ice'
            : 'label-caps px-6',
          showPoster && !failed && 'sr-only',
        )}
      >
        {status}
      </p>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-wrap items-end justify-center gap-2 px-3 lg:bottom-8 lg:gap-3 lg:p-3">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-xs border border-line bg-panel p-1.5">
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
