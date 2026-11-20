import type { TrafficConditions } from './disruption'
import { trafficSummary } from './summary'

const calm: TrafficConditions = {
  closedAirports: new Set(),
  closedPorts: new Set(),
  ash: [],
  storms: [],
  polarReroute: false,
  launchHold: false,
}

describe('운항 요약', () => {
  it('재해가 없으면 여객기 30편·배 11척이 모두 정상', () => {
    expect(trafficSummary(calm)).toEqual({
      flights: 30,
      rerouted: 0,
      cancelled: 0,
      ships: 11,
      waiting: 0,
      launchHold: false,
    })
  })

  it('공항이 닫히면 그 도시를 오가는 편 수만큼 결항', () => {
    // 인천: 로스앤젤레스·뉴욕·런던·싱가포르 4개 노선 × 2편
    const summary = trafficSummary({
      ...calm,
      closedAirports: new Set(['seoul-incheon']),
    })
    expect(summary.cancelled).toBe(8)
    expect(summary.rerouted).toBe(0)
  })

  it('강한 태양 폭풍이면 극항로 편이 우회하고 발사를 미룬다', () => {
    const summary = trafficSummary({
      ...calm,
      polarReroute: true,
      launchHold: true,
    })
    expect(summary.rerouted).toBeGreaterThan(0)
    expect(summary.launchHold).toBe(true)
  })

  it('항구가 닫히거나 태풍이 가까우면 그 바닷길의 배가 기다린다', () => {
    // 부산: 동북아 크루즈 1척 + 태평양 컨테이너선 2척
    expect(
      trafficSummary({ ...calm, closedPorts: new Set(['busan']) }).waiting,
    ).toBe(3)
    // 필리핀해 태풍: 항공모함 1척
    expect(
      trafficSummary({
        ...calm,
        storms: [{ center: { lat: 23, lon: 133 }, radiusKm: 620 }],
      }).waiting,
    ).toBe(1)
  })
})
