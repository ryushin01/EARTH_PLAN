import { buildFrame } from './frame'
import {
  AMBIENT_FRAME_MS,
  TRANSIENT_MS,
  nextFrameDelay,
  renderMode,
  transientUntil,
} from './render'
import { trafficConditions } from './traffic/disruption'
import { useWorld } from './world/store'

const calm = {
  running: false,
  interacting: false,
  cameraMoving: false,
  transient: false,
  autoRotate: false,
  ambientMotion: false,
}

describe('렌더링 방식', () => {
  it('재생·조작·카메라 이동·재해 전환 중에는 매 프레임 그린다', () => {
    for (const key of [
      'running',
      'interacting',
      'cameraMoving',
      'transient',
    ] as const)
      expect(
        renderMode({
          ...calm,
          autoRotate: true,
          ambientMotion: true,
          [key]: true,
        }),
      ).toBe('full')
  })

  it('자동 회전이나 운항·셰이더처럼 천천히 움직이는 것만 있으면 초당 30번 그린다', () => {
    expect(renderMode({ ...calm, autoRotate: true })).toBe('ambient')
    expect(renderMode({ ...calm, ambientMotion: true })).toBe('ambient')
  })

  it('움직이는 것이 없으면 쉬고, 바뀔 때만 그린다', () => {
    expect(renderMode(calm)).toBe('idle')
  })

  it('매 프레임은 바로, 초당 30번은 다음 화면 갱신에 맞춰, 쉴 때는 예약하지 않는다', () => {
    expect(nextFrameDelay('full')).toBe(0)
    expect(nextFrameDelay('ambient')).toBe(AMBIENT_FRAME_MS)
    // 타이머가 끝난 뒤 다음 화면 갱신(60Hz면 16.7ms 간격)에 그려지므로 1/30초보다 조금 짧게
    expect(AMBIENT_FRAME_MS).toBeGreaterThan(1000 / 60)
    expect(AMBIENT_FRAME_MS).toBeLessThan(1000 / 30)
    expect(nextFrameDelay('idle')).toBeNull()
  })
})

describe('재해 전환 구간', () => {
  beforeEach(() => useWorld.getState().reset())

  it('재해가 없으면 전환 구간도 없다', () => {
    expect(transientUntil(useWorld.getState())).toBe(Number.NEGATIVE_INFINITY)
  })

  it('가장 늦게 시작한 재해부터 정해진 시간 동안', () => {
    useWorld.getState().triggerEruption('eyjafjallajokull', 4, 1_000)
    useWorld.getState().triggerSolarStorm('g3', 5_000)
    expect(transientUntil(useWorld.getState())).toBe(5_000 + TRANSIENT_MS)
  })

  it('전환 구간이 지나면 지구 화면 입력과 운항 조건이 실제 시간에 따라 바뀌지 않는다', () => {
    const t0 = 1_000
    const world = useWorld.getState()
    world.triggerEruption('eyjafjallajokull', 6, t0)
    world.triggerTsunami('japan-trench', 9.5, t0)
    world.triggerImpact('north-atlantic', 1000, t0)
    world.triggerImpact('tokyo', 340, t0)
    world.triggerQuake('main-himalayan', 8, t0)
    world.startWildfire('australia-se', t0)
    world.triggerSolarStorm('carrington', t0)
    const state = useWorld.getState()
    const until = transientUntil(state)
    const frameAt = (now: number) =>
      buildFrame(state, now, { cloudOffset: 0, lastTime: 0 }, 0)

    // 전환 중에는 실제로 바뀌므로 이 비교가 의미 있음
    expect(frameAt(t0 + 1_000)).not.toEqual(frameAt(t0 + 2_000))
    expect(frameAt(until)).toEqual(frameAt(until + 60_000))
    expect(trafficConditions(state, until)).toEqual(
      trafficConditions(state, until + 60_000),
    )
  })
})
