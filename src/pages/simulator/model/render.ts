import type { WorldState } from './world/types'

/**
 * 지구본을 얼마나 자주 그릴지 (배터리·발열을 줄이려고 필요한 만큼만 그림)
 * - full: 매 화면 갱신마다
 * - ambient: 초당 약 30번 (한 바퀴에 3분쯤 걸리는 자동 회전처럼 느린 움직임만 있을 때)
 * - idle: 쉬다가 상태가 바뀌거나 조작이 있을 때만
 */
export type RenderMode = 'full' | 'ambient' | 'idle'

export interface RenderInputs {
  /** 시뮬레이션 재생 중 */
  running: boolean
  /** 끌기·확대 중이거나 손을 뗀 뒤 감속 중 */
  interacting: boolean
  /** 버튼·키보드로 정한 지점까지 카메라가 움직이는 중 */
  cameraMoving: boolean
  /** 재해 효과가 실제 시간에 따라 바뀌는 중 (transientUntil 전) */
  transient: boolean
  autoRotate: boolean
  /** 운항·별·셰이더 애니메이션처럼 멈춤 중에도 움직이는 것 (동작 줄이기면 없음) */
  ambientMotion: boolean
}

export function renderMode(inputs: RenderInputs): RenderMode {
  if (
    inputs.running ||
    inputs.interacting ||
    inputs.cameraMoving ||
    inputs.transient
  )
    return 'full'
  if (inputs.autoRotate || inputs.ambientMotion) return 'ambient'
  return 'idle'
}

/** 초당 30번: 타이머가 끝난 뒤 다음 화면 갱신에 그려지므로 1/30초보다 조금 짧게 */
export const AMBIENT_FRAME_MS = 25

/** 다음 프레임을 요청하기까지 (ms). null이면 요청하지 않음 */
export function nextFrameDelay(mode: RenderMode): number | null {
  if (mode === 'full') return 0
  if (mode === 'ambient') return AMBIENT_FRAME_MS
  return null
}

/**
 * 재해가 시작된 뒤 화면·운항이 실제 시간에 따라 바뀌는 가장 긴 시간.
 * 화산재·충돌 잔해(40초 + 20초에 걸쳐 사라짐)와 소행성 피해 도시의 결항(60초)이 가장 김.
 * 쓰나미는 1초 = 1시간이라 지구 반대편까지 약 28초, 결항은 마지막 도달 30초 뒤까지
 */
export const TRANSIENT_MS = 60_000

/** 실제 시간에 따른 재해 효과가 끝나는 시각 (performance.now 기준). 없으면 -Infinity */
export function transientUntil(
  state: Pick<
    WorldState,
    | 'eruptions'
    | 'tsunamis'
    | 'impacts'
    | 'quakes'
    | 'wildfires'
    | 'solarStorms'
  >,
): number {
  let latest = Number.NEGATIVE_INFINITY
  for (const list of [
    state.eruptions,
    state.tsunamis,
    state.impacts,
    state.quakes,
    state.wildfires,
    state.solarStorms,
  ])
    for (const item of list) latest = Math.max(latest, item.startedAt)
  return latest + TRANSIENT_MS
}
