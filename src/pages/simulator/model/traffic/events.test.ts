import { trafficImpactText } from './events'
import type { TrafficSummary } from './summary'

const calm: TrafficSummary = {
  flights: 30,
  rerouted: 0,
  cancelled: 0,
  ships: 11,
  waiting: 0,
  launchHold: false,
}

describe('운항 영향 문장', () => {
  it('운항이 그대로면 만들지 않는다', () => {
    expect(trafficImpactText(calm, calm)).toBeNull()
  })

  it('늘어난 우회·결항·대기와 새 발사 보류만 알린다', () => {
    const text = trafficImpactText(
      { ...calm, rerouted: 2 },
      { ...calm, rerouted: 6, cancelled: 2, waiting: 3, launchHold: true },
    )
    expect(text?.ko).toBe(
      '운항 영향: 여객기 우회 4편 · 결항 2편, 선박 대기 3척, 우주왕복선 발사 보류.',
    )
    expect(text?.en).toBe(
      'Traffic: 4 flights rerouted · 2 cancelled, 3 ships holding, shuttle launch on hold.',
    )
  })

  it('이미 미뤄진 발사는 다시 알리지 않는다', () => {
    expect(
      trafficImpactText(
        { ...calm, launchHold: true },
        { ...calm, launchHold: true },
      ),
    ).toBeNull()
  })
})
