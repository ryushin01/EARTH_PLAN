import { create } from 'zustand'
import type { TodayData } from './today'

export type TodayStatus = 'idle' | 'loading' | 'ready' | 'error'

interface TodayStore {
  /** 지구에 실제 지진·오로라를 표시 */
  enabled: boolean
  status: TodayStatus
  data: TodayData | null
  /** 카메라를 보낼 지진 */
  focusId: string | null
  /** 같은 지진을 다시 골라도 카메라가 가도록 고를 때마다 늘림 */
  focusTick: number
  setEnabled: (enabled: boolean) => void
  /** 지진을 고르면 표시를 켜고 카메라를 그쪽으로 */
  focus: (quakeId: string) => void
  /** 아직 받지 않았거나 실패했으면 불러옴 (불러오는 중이면 기다리지 않고 돌아감) */
  ensureLoaded: (loader: () => Promise<TodayData | null>) => Promise<void>
}

export const useToday = create<TodayStore>()((set, get) => ({
  enabled: false,
  status: 'idle',
  data: null,
  focusId: null,
  focusTick: 0,
  setEnabled: (enabled) => set({ enabled }),
  focus: (quakeId) =>
    set((s) => ({
      enabled: true,
      focusId: quakeId,
      focusTick: s.focusTick + 1,
    })),
  ensureLoaded: async (loader) => {
    const { status } = get()
    if (status === 'ready' || status === 'loading') return
    set({ status: 'loading' })
    const data = await loader()
    set(data ? { status: 'ready', data } : { status: 'error' })
  },
}))
