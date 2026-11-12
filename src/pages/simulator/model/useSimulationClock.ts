import { useEffect } from 'react'
import { useWorld } from './world/store'

/** 브라우저 프레임마다 시뮬레이션 시간을 진행합니다 */
export function useSimulationClock() {
  useEffect(() => {
    let frame = 0
    let last = performance.now()
    const loop = (now: number) => {
      useWorld.getState().tick((now - last) / 1000)
      last = now
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])
}
