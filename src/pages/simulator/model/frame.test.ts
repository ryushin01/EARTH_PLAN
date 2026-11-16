import { useWorld } from './world/store'
import { buildFrame } from './frame'

describe('buildFrame', () => {
  beforeEach(() => useWorld.getState().reset())

  it('태양 방향은 단위 벡터이고, 쓰나미 파면은 시간에 따라 넓어진다', () => {
    useWorld.getState().triggerTsunami('japan-trench', 9, 0)
    const clock = { cloudOffset: 0, lastTime: 0 }
    const a = buildFrame(useWorld.getState(), 2000, clock, 0)
    const b = buildFrame(useWorld.getState(), 6000, clock, 0)
    expect(Math.hypot(...a.sun)).toBeCloseTo(1)
    expect(b.waves[0].radius).toBeGreaterThan(a.waves[0].radius)
  })

  it('분화 직후 화산재와 분출 기둥이 생긴다', () => {
    useWorld.getState().triggerEruption('baekdu', 7, 0)
    const frame = buildFrame(
      useWorld.getState(),
      3000,
      { cloudOffset: 0, lastTime: 0 },
      0,
    )
    expect(frame.ashes).toHaveLength(1)
    expect(frame.plumes[0].age).toBeCloseTo(3)
  })

  it('재생 중일 때만 구름이 흐른다', () => {
    const clock = { cloudOffset: 0, lastTime: 0 }
    buildFrame(useWorld.getState(), 0, clock, 0.05)
    expect(clock.cloudOffset).toBe(0)
    useWorld.getState().setRunning(true)
    buildFrame(useWorld.getState(), 0, clock, 0.1)
    expect(clock.cloudOffset).toBeGreaterThan(0)
  })

  it('태양 폭풍 오로라는 밝아졌다가 1분이 안 돼 사라진다', () => {
    const clock = { cloudOffset: 0, lastTime: 0 }
    const at = (ms: number) =>
      buildFrame(useWorld.getState(), ms, clock, 0).aurora
    expect(at(0).strength).toBe(0)
    useWorld.getState().triggerSolarStorm('carrington', 0)
    expect(at(10_000)).toEqual({ strength: 1, lat: 22 })
    expect(at(40_000).strength).toBeCloseTo(0.5)
    expect(at(60_000).strength).toBe(0)
  })
})
