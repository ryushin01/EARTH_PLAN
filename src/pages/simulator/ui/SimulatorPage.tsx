import { useEffect } from 'react'
import { useLocale, useLocaleSync } from '@/shared/i18n'
import { cn } from '@/shared/lib'
import { useT } from './i18n'
import { loadFloodCurve } from '../api/loadFloodCurve'
import { useWorld } from '../model/world/store'
import { useSimulationClock } from '../model/useSimulationClock'
import { ControlPanel } from './panels/ControlPanel'
import { MissionHud } from './status/MissionHud'
import { SiteFinder } from './status/SiteFinder'
import { SiteInfoCard } from './status/SiteInfoCard'
import { TimeControls } from './status/TimeControls'
import { ScenarioShare } from './status/ScenarioShare'
import { MissionPanel } from './status/MissionPanel'
import { HistoryPanel } from './status/HistoryPanel'
import { GlobeViewport } from './globe/GlobeViewport'
import { SHARE_PARAM, decodeSnapshot } from '../model/world/snapshot'

// 배경 흐림(backdrop-filter)은 매 프레임 바뀌는 3D 위에서 GPU를 많이 써서 쓰지 않고, 불투명도로 가독성을 맞춤
const panel = 'rounded-xs border border-line bg-panel p-4'
/** 모바일에서 위에 고정된 지구에 가리지 않도록 스크롤 위치를 띄움 */
const anchor = 'scroll-mt-[calc(45svh+0.5rem)] lg:scroll-mt-0'

const MOBILE_LINKS = [
  { href: '#controls', label: 'page.controls' },
  { href: '#mission', label: 'page.mission' },
  { href: '#status', label: 'page.status' },
] as const

/** 한국어 / English 전환 */
function LanguageSwitch() {
  const { t, locale } = useT()
  const setLocale = useLocale((s) => s.setLocale)
  return (
    <div role="group" aria-label={t('page.language')} className="flex gap-1">
      {(
        [
          ['ko', '한국어'],
          ['en', 'English'],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          lang={value}
          aria-pressed={locale === value}
          onClick={() => setLocale(value)}
          className={cn(
            'min-h-9 rounded-xs border px-2.5 font-display text-xs font-semibold tracking-[0.04em]',
            locale === value
              ? 'border-accent bg-accent/15 text-ice'
              : 'border-line-strong text-muted hover:text-ice',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function SimulatorPage() {
  useLocaleSync()
  const { t, locale } = useT()
  useEffect(() => {
    document.title = `EARTH PLAN · ${t('page.tagline')}`
  }, [locale, t])
  useSimulationClock()
  const setFloodCurve = useWorld((s) => s.setFloodCurve)

  // 프로덕션에서만 서비스 워커 등록 (다시 방문할 때 텍스처·코드를 캐시에서)
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    const base = import.meta.env.BASE_URL
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .catch(() => {})
  }, [])

  // 공유 링크(?s=...)로 열면 그 시나리오를 불러옴
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get(SHARE_PARAM)
    if (!code) return
    const snapshot = decodeSnapshot(code)
    if (snapshot)
      useWorld
        .getState()
        .loadSnapshot(snapshot, { ko: '공유 링크의', en: 'a shared link' })
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
        {t('page.skip')}
      </a>

      <header className="relative z-20 flex items-center justify-between gap-4 px-4 pt-4 lg:absolute lg:inset-x-0 lg:top-0 lg:pointer-events-none">
        <div className="lg:pointer-events-auto">
          <h1 className="font-display text-2xl font-semibold uppercase leading-none tracking-[-0.03em]">
            Earth<span className="text-accent">_</span>Plan
          </h1>
          <p className="mt-1 text-xs text-muted">{t('page.tagline')}</p>
        </div>
        <div className="lg:pointer-events-auto">
          <LanguageSwitch />
        </div>
      </header>

      <main className="lg:absolute lg:inset-0">
        <section
          aria-labelledby="globe-title"
          className="sticky top-0 z-30 flex h-[45svh] flex-col bg-space lg:fixed lg:inset-0 lg:z-auto lg:block lg:h-auto lg:bg-transparent"
        >
          <h2 id="globe-title" className="sr-only">
            {t('page.globe')}
          </h2>
          <div className="relative min-h-0 flex-1 lg:absolute lg:inset-0">
            {/* 정지 이미지와 조작 버튼은 사전 렌더링하고, three.js 묶음은 필요할 때 받음 */}
            <GlobeViewport hintId="globe-hint" />
          </div>
          {/* 사전 렌더링되도록 3D 묶음 밖에 둠 */}
          <p
            id="globe-hint"
            className="sr-only text-center text-xs text-muted lg:not-sr-only lg:pointer-events-none lg:absolute lg:inset-x-0 lg:bottom-3 lg:z-10"
          >
            {t('page.hint')}
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
              {t('page.controls')}
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
              {t('page.status')}
            </h2>
            <TimeControls />
            <MissionPanel />
            <SiteFinder />
            <SiteInfoCard />
            <MissionHud />
            <HistoryPanel />
            <ScenarioShare />
          </aside>
        </div>
      </main>
      {/* 모바일 화면 이동 */}
      <nav
        aria-label={t('page.mobileNav')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel-solid/95 lg:hidden"
      >
        <ul className="grid grid-cols-3">
          {MOBILE_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="flex min-h-14 items-center justify-center font-display text-sm font-semibold uppercase tracking-[0.04em] text-ice hover:text-accent"
              >
                {t(link.label)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
