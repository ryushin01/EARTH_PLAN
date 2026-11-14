import { EARLY_WAKE_SCRIPT, WAKE_EVENTS, wokeEarly } from './earlyWake'

describe('EARLY_WAKE_SCRIPT', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, '__earthPlanWoke')
  })

  it('첫 입력을 기록하고 나머지 듣기는 그만둔다', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    // 문서 머리에서 실행되는 것과 같게 스크립트 문자열을 실행
    new Function(EARLY_WAKE_SCRIPT)()
    expect(add.mock.calls.map(([type]) => type)).toEqual([...WAKE_EVENTS])
    expect(wokeEarly()).toBe(false)

    window.dispatchEvent(new Event('keydown'))
    expect(wokeEarly()).toBe(true)
    expect(remove.mock.calls.map(([type]) => type)).toEqual([...WAKE_EVENTS])
    vi.restoreAllMocks()
  })
})
