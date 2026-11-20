import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { trafficConditions } from '../../model/traffic/disruption'
import { trafficSummary } from '../../model/traffic/summary'
import { useWorldSampled } from '../../model/world/sampled'
import { useT } from '../i18n'
import { cn } from '@/shared/lib'

/** 재해의 화면 시간 창은 시뮬레이션이 멈춰 있어도 끝나므로 1초마다 다시 봄 */
const REFRESH_MS = 1000

function useTrafficSummary() {
  const world = useWorldSampled(
    useShallow((s) => ({
      year: s.year,
      seaLevel: s.seaLevel,
      structures: s.structures,
      eruptions: s.eruptions,
      tsunamis: s.tsunamis,
      impacts: s.impacts,
      quakes: s.quakes,
      solarStorms: s.solarStorms,
      storms: s.storms,
    })),
  )
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(performance.now()), REFRESH_MS)
    return () => window.clearInterval(id)
  }, [])
  return useMemo(
    () => trafficSummary(trafficConditions(world, now)),
    [world, now],
  )
}

/** 항공·선박 운항 요약. 재해로 우회·결항·대기·발사 보류가 생기면 덧붙입니다. */
export function TrafficStatus({ className }: { className?: string }) {
  const { t } = useT()
  const summary = useTrafficSummary()
  const extras = [
    summary.rerouted > 0 && t('traffic.rerouted', { count: summary.rerouted }),
    summary.cancelled > 0 &&
      t('traffic.cancelled', { count: summary.cancelled }),
    summary.waiting > 0 && t('traffic.waiting', { count: summary.waiting }),
    summary.launchHold && t('traffic.launchHold'),
  ].filter(Boolean)
  return (
    <p
      className={cn(
        'rounded-xs border border-line bg-panel px-3 py-1.5 text-xs text-ice',
        className,
      )}
    >
      <span className="label-caps mr-2 text-muted">{t('traffic.heading')}</span>
      <span>
        {t('traffic.summary', {
          flights: summary.flights,
          ships: summary.ships,
        })}
      </span>
      {extras.length > 0 ? (
        <span className="text-warn"> · {extras.join(' · ')}</span>
      ) : null}
    </p>
  )
}
