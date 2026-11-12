import { Suspense, lazy, useEffect } from 'react'
import { ClientOnly } from '@tanstack/react-router'
import { loadFloodCurve } from '../api/loadFloodCurve'
import { useWorld } from '../model/world/store'
import { useSimulationClock } from '../model/useSimulationClock'
import { ControlPanel } from './panels/ControlPanel'
import { MissionHud } from './status/MissionHud'
import { SiteFinder } from './status/SiteFinder'
import { TimeControls } from './status/TimeControls'
import { ScenarioShare } from './status/ScenarioShare'
import { MissionPanel } from './status/MissionPanel'
import { HistoryPanel } from './status/HistoryPanel'
import { SHARE_PARAM, decodeSnapshot } from '../model/world/snapshot'

// three.js는 브라우저에서만 불러옵니다
const GlobeViewport = lazy(() =>
  import('./globe/GlobeViewport').then((m) => ({
    default: m.GlobeViewport,
  })),
)

const panel = 'rounded-xs border border-line bg-panel p-4 backdrop-blur-md'
/** 모바일에서 위에 고정된 지구에 가리지 않도록 스크롤 위치를 띄움 */
const anchor = 'scroll-mt-[calc(45svh+0.5rem)] lg:scroll-mt-0'

const MOBILE_LINKS = [
  { href: '#controls', label: '지구 관리' },
  { href: '#mission', label: '미션' },
  { href: '#status', label: '지구 상태' },
]

export function SimulatorPage() {
  useSimulationClock()
  const setFloodCurve = useWorld((s) => s.setFloodCurve)

  // 공유 링크(?s=...)로 열면 그 시나리오를 불러옴
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get(SHARE_PARAM)
    if (!code) return
    const snapshot = decodeSnapshot(code)
    if (snapshot) useWorld.getState().loadSnapshot(snapshot, '공유 링크의')
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadFloodCurve(controller.signal)
      .then(setFloodCurve)
      .catch(() => {})
    return () => controller.abort()
  }, [setFloodCurve])

  return (
    <div className="relative min-h-svh bg-space pb-20 text-ice lg:h-svh lg:overflow-hidden lg:pb-0">
      <a
        href="#controls"
        className="sr-only z-50 rounded-xs bg-accent px-4 py-3 font-semibold text-black focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        제어판으로 건너뛰기
      </a>

      <header className="relative z-20 flex items-center justify-between gap-4 px-4 pt-4 lg:absolute lg:inset-x-0 lg:top-0 lg:pointer-events-none">
        <div className="lg:pointer-events-auto">
          <h1 className="font-display text-2xl font-semibold uppercase leading-none tracking-[-0.03em]">
            Earth<span className="text-accent">_</span>Plan
          </h1>
          <p className="mt-1 text-xs text-muted">
            지구 환경·재해 대응 시뮬레이터
          </p>
        </div>
      </header>

      <main className="lg:absolute lg:inset-0">
        <section
          aria-labelledby="globe-title"
          className="sticky top-0 z-30 flex h-[45svh] flex-col bg-space lg:fixed lg:inset-0 lg:z-auto lg:block lg:h-auto lg:bg-transparent"
        >
          <h2 id="globe-title" className="sr-only">
            3D 지구
          </h2>
          <div className="relative min-h-0 flex-1 lg:absolute lg:inset-0">
            <ClientOnly
              fallback={<p className="p-6 label-caps">3D 지구 준비 중</p>}
            >
              <Suspense
                fallback={<p className="p-6 label-caps">3D 지구 준비 중</p>}
              >
                <GlobeViewport hintId="globe-hint" />
              </Suspense>
            </ClientOnly>
          </div>
          {/* 사전 렌더링되도록 3D 묶음 밖에 둠 */}
          <p
            id="globe-hint"
            className="sr-only text-center text-xs text-muted lg:not-sr-only lg:pointer-events-none lg:absolute lg:inset-x-0 lg:bottom-3 lg:z-10"
          >
            끌어서 돌리기 · 휠이나 두 손가락으로 확대 · 지구를 선택한 뒤 화살표
            키로 돌리고 +, − 키로 확대
          </p>
        </section>

        <div className="relative z-10 grid gap-4 p-4 lg:pointer-events-none lg:absolute lg:inset-0 lg:top-16 lg:flex lg:items-start lg:justify-between lg:pb-28">
          <section
            id="controls"
            tabIndex={-1}
            aria-labelledby="controls-title"
            className={`${panel} ${anchor} lg:pointer-events-auto lg:max-h-full lg:w-[23rem] lg:overflow-y-auto`}
          >
            <h2
              id="controls-title"
              className="mb-3 font-display text-lg font-semibold uppercase tracking-[-0.02em]"
            >
              지구 관리
            </h2>
            <ControlPanel />
          </section>

          <aside
            id="status"
            aria-labelledby="status-title"
            className={`${panel} ${anchor} grid gap-5 lg:pointer-events-auto lg:max-h-full lg:w-[22rem] lg:overflow-y-auto`}
          >
            <h2
              id="status-title"
              className="font-display text-lg font-semibold uppercase tracking-[-0.02em]"
            >
              지구 상태
            </h2>
            <TimeControls />
            <MissionPanel />
            <SiteFinder />
            <MissionHud />
            <HistoryPanel />
            <ScenarioShare />
          </aside>
        </div>
      </main>
      {/* 모바일 화면 이동 */}
      <nav
        aria-label="화면 이동"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel-solid/95 backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-3">
          {MOBILE_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="flex min-h-14 items-center justify-center font-display text-sm font-semibold uppercase tracking-[0.04em] text-ice hover:text-accent"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
