import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { isTicking, useWorld } from './store'
import type { WorldStore } from './store'

/** 시간 진행으로 바뀐 값을 화면에 반영하는 최소 간격 (초당 10번) */
export const SAMPLE_MS = 100

/**
 * 화면 패널이 읽는 세계 상태의 사본.
 * 재생 중에는 매 프레임 상태가 바뀌므로 SAMPLE_MS마다 한 번만 옮기고,
 * 사용자 조작(건설, 슬라이더 등)으로 바뀐 값은 바로 옮깁니다.
 * 3D 장면은 지금처럼 useWorld.getState()로 매 프레임 읽습니다.
 */
const sampled = createStore<WorldStore>(() => useWorld.getState())

let timer: ReturnType<typeof setTimeout> | undefined
let last = Number.NEGATIVE_INFINITY

function flush() {
  clearTimeout(timer)
  timer = undefined
  last = performance.now()
  sampled.setState(useWorld.getState(), true)
}

useWorld.subscribe(() => {
  if (!isTicking()) {
    flush()
    return
  }
  // 한 프레임 안의 여러 변경(진행·사건·미션)이 끝난 뒤에 옮기도록 늘 타이머로
  timer ??= setTimeout(
    flush,
    Math.max(0, SAMPLE_MS - (performance.now() - last)),
  )
})

/** 화면 표시용으로 솎아 낸 세계 상태를 고릅니다 (useWorld와 같은 방식) */
export function useWorldSampled<T>(selector: (state: WorldStore) => T): T {
  return useStore(sampled, selector)
}
