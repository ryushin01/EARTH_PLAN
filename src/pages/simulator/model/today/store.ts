import { create } from 'zustand'
import type { TodayData } from './today'

export type TodayStatus = 'idle' | 'loading' | 'ready' | 'error'

interface TodayStore {
  /** 지구에 실제 지진·오로라를 표시 */
  enabled: boolean
  status: TodayStatus
  data: TodayData | null
  /** 사이트 자료를 받지 못해 코드에 넣어 둔 스냅숏을 보여 주는 중 */
  fromSnapshot: boolean
  /** 카메라를 보낼 지진 */
  focusId: string | null
  /** 같은 지진을 다시 골라도 카메라가 가도록 고를 때마다 늘림 */
  focusTick: number
  setEnabled: (enabled: boolean) => void
  /** 지진을 고르면 표시를 켜고 카메라를 그쪽으로 */
  focus: (quakeId: string) => void
  /**
   * 아직 받지 않았거나 실패했으면 불러옴 (불러오는 중이면 기다리지 않고 돌아감).
   * 받지 못하면 fallback(스냅숏)으로 대신 보여 주고, 다음에 다시 부르면 사이트 자료를 다시 시도함
   */
  ensureLoaded: (
    loader: () => Promise<TodayData | null>,
    fallback?: () => Promise<TodayData | null>,
  ) => Promise<void>
}

export const useToday = create<TodayStore>()((set, get) => ({
  enabled: false,
  status: 'idle',
  data: null,
  fromSnapshot: false,
  focusId: null,
  focusTick: 0,
  setEnabled: (enabled) => set({ enabled }),
  focus: (quakeId) =>
    set((s) => ({
      enabled: true,
      focusId: quakeId,
      focusTick: s.focusTick + 1,
    })),
  ensureLoaded: async (loader, fallback) => {
    const { status, fromSnapshot } = get()
    if ((status === 'ready' && !fromSnapshot) || status === 'loading') return
    set({ status: 'loading' })
    const data = await loader()
    if (data) {
      set({ status: 'ready', data, fromSnapshot: false })
      return
    }
    const snapshot = fallback ? await fallback() : null
    if (snapshot) set({ status: 'ready', data: snapshot, fromSnapshot: true })
    else set({ status: 'error' })
  },
}))
