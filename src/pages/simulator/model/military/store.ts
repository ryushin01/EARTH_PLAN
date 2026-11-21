import { create } from 'zustand'

/** 지구에 보일 군사·위성 종류 */
export type MilitaryLayer = 'militarySat' | 'civilSat' | 'flights' | 'fleets'

export const MILITARY_LAYERS: readonly MilitaryLayer[] = [
  'militarySat',
  'civilSat',
  'flights',
  'fleets',
]

interface MilitaryStore {
  /** 전체 켜기 (저사양 기기에서는 끔) */
  enabled: boolean
  layers: Record<MilitaryLayer, boolean>
  /** 고른 위성·편대·함대 id */
  selectedId: string | null
  /** 같은 것을 다시 골라도 카메라가 가도록 고를 때마다 늘림 */
  focusTick: number
  setEnabled: (enabled: boolean) => void
  setLayer: (layer: MilitaryLayer, on: boolean) => void
  select: (id: string | null) => void
}

export const useMilitary = create<MilitaryStore>()((set) => ({
  enabled: true,
  layers: { militarySat: true, civilSat: true, flights: true, fleets: true },
  selectedId: null,
  focusTick: 0,
  setEnabled: (enabled) => set({ enabled }),
  setLayer: (layer, on) =>
    set((s) => ({ layers: { ...s.layers, [layer]: on } })),
  select: (id) => set((s) => ({ selectedId: id, focusTick: s.focusTick + 1 })),
}))

/**
 * 군사·위성 화면 시계 (화면 초). 3D 장면이 그릴 때마다 늘리고(동작 줄이기면 멈춤),
 * 정보 패널은 1초마다 읽음. 매 프레임 바뀌므로 상태 저장소에 두지 않음
 */
export const militaryClock = { t: 0 }
