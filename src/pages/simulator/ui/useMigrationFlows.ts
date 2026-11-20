import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { migrationFlows } from '../model/migration/flows'
import { transientUntil } from '../model/render'
import { useWorldSampled } from '../model/world/sampled'

/**
 * 인구 이동 흐름. 재해 피난은 재해 효과가 끝나면 사라지므로 그때 한 번만 다시 계산
 * (멈춰 있을 때 그리기를 쉬도록 일정 간격으로 다시 그리지 않음)
 */
export function useMigrationFlows() {
  const world = useWorldSampled(
    useShallow((s) => ({
      seaLevel: s.seaLevel,
      structures: s.structures,
      year: s.year,
      tsunamis: s.tsunamis,
      quakes: s.quakes,
      impacts: s.impacts,
      eruptions: s.eruptions,
      wildfires: s.wildfires,
      solarStorms: s.solarStorms,
    })),
  )
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    const wait = transientUntil(world) - performance.now()
    if (!(wait > 0)) return
    const id = window.setTimeout(() => setNow(performance.now()), wait + 50)
    return () => window.clearTimeout(id)
  }, [world])
  // 새 재해가 생긴 직후에는 now가 재해 시작보다 이르므로 계산상 '최근'으로 들어감
  return useMemo(() => migrationFlows(world, now), [world, now])
}
