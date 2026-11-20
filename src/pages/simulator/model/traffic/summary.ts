import { flightPlan, laneStatus } from './disruption'
import type { TrafficConditions } from './disruption'
import { FLIGHT_ROUTES, SEA_LANES } from './routes'

/** 화면 문구용 운항 요약 (여객기는 편, 배는 척) */
export interface TrafficSummary {
  flights: number
  rerouted: number
  cancelled: number
  ships: number
  /** 기항지가 닫혔거나 태풍이 가까운 바닷길의 배 */
  waiting: number
  launchHold: boolean
}

export function trafficSummary(c: TrafficConditions): TrafficSummary {
  let flights = 0
  let rerouted = 0
  let cancelled = 0
  for (const route of FLIGHT_ROUTES) {
    flights += route.planes
    const { status } = flightPlan(route, c)
    if (status === 'rerouted') rerouted += route.planes
    else if (status === 'cancelled') cancelled += route.planes
  }
  let ships = 0
  let waiting = 0
  for (const lane of SEA_LANES) {
    ships += lane.ships
    const status = laneStatus(lane, c)
    if (status.closedPorts.length > 0 || status.stormNear) waiting += lane.ships
  }
  return {
    flights,
    rerouted,
    cancelled,
    ships,
    waiting,
    launchHold: c.launchHold,
  }
}
