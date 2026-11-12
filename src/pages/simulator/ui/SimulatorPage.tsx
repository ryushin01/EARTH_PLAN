import { Suspense, lazy, useEffect } from 'react'
import { ClientOnly } from '@tanstack/react-router'
import { loadFloodCurve } from '../api/loadFloodCurve'
import { useWorld } from '../model/world/store'
import { useSimulationClock } from '../model/useSimulationClock'
import { ControlPanel } from './panels/ControlPanel'
import { MissionHud } from './status/MissionHud'
import { SiteFinder } from './status/SiteFinder'
import { TimeControls } from './status/TimeControls'

// three.js는 브라우저에서만 불러옵니다
const GlobeViewport = lazy(() =>
  import('./globe/GlobeViewport').then((m) => ({
    default: m.GlobeViewport,
  })),
)

const panel = 'rounded-xs border border-line bg-panel p-4 backdrop-blur-md'

export function SimulatorPage() {
  useSimulationClock()
  const setFloodCurve = useWorld((s) => s.setFloodCurve)

  useEffect(() => {
    const controller = new AbortController()
    loadFloodCurve(controller.signal)
      .then(setFloodCurve)
      .catch(() => {})
    return () => controller.abort()
  }, [setFloodCurve])

  return (
    <div className="relative min-h-svh bg-space text-ice lg:h-svh lg:overflow-hidden">
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
          className="relative h-[72svh] lg:fixed lg:inset-0 lg:h-auto"
        >
          <h2 id="globe-title" className="sr-only">
            3D 지구
          </h2>
          <ClientOnly
            fallback={<p className="p-6 label-caps">3D 지구 준비 중</p>}
          >
            <Suspense
              fallback={<p className="p-6 label-caps">3D 지구 준비 중</p>}
            >
              <GlobeViewport />
            </Suspense>
          </ClientOnly>
        </section>

        <div className="relative z-10 grid gap-4 p-4 lg:pointer-events-none lg:absolute lg:inset-0 lg:top-16 lg:flex lg:items-start lg:justify-between lg:pb-28">
          <section
            id="controls"
            tabIndex={-1}
            aria-labelledby="controls-title"
            className={`${panel} lg:pointer-events-auto lg:max-h-full lg:w-[23rem] lg:overflow-y-auto`}
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
            aria-labelledby="status-title"
            className={`${panel} grid gap-5 lg:pointer-events-auto lg:max-h-full lg:w-[22rem] lg:overflow-y-auto`}
          >
            <h2
              id="status-title"
              className="font-display text-lg font-semibold uppercase tracking-[-0.02em]"
            >
              지구 상태
            </h2>
            <TimeControls />
            <SiteFinder />
            <MissionHud />
          </aside>
        </div>
      </main>
    </div>
  )
}
