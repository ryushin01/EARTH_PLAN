/** 이 중 하나라도 일어나면 3D 지구를 바로 불러옴 */
export const WAKE_EVENTS = [
  'pointerdown',
  'pointermove',
  'keydown',
  'wheel',
  'touchstart',
  'scroll',
  'focusin',
] as const

const FLAG = '__earthPlanWoke'

/**
 * 페이지가 준비(하이드레이션)되기 전에 들어온 첫 입력을 기록하는 인라인 스크립트.
 * 문서 머리에 넣어, 번들이 실행되기 전의 입력도 놓치지 않게 함
 */
export const EARLY_WAKE_SCRIPT = `(()=>{const t=${JSON.stringify(WAKE_EVENTS)},o={capture:true,passive:true},w=()=>{window.${FLAG}=true;t.forEach(e=>removeEventListener(e,w,o))};t.forEach(e=>addEventListener(e,w,o))})()`

/** 준비되기 전에 입력이 있었는지 */
export function wokeEarly(): boolean {
  return (window as unknown as Record<string, unknown>)[FLAG] === true
}
