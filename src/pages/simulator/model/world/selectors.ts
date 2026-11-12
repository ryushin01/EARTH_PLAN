import { CITIES } from '../site/data'
import { cityState, floodedArea, riseRate, warming } from './engine'
import type { CityState, WorldState } from './types'

export function cityStates(
  state: Pick<WorldState, 'seaLevel' | 'structures' | 'year'>,
): Record<string, CityState> {
  return Object.fromEntries(
    CITIES.map((city) => [city.id, cityState(city, state)]),
  )
}

export interface WorldSummary {
  warming: number
  riseRateMmPerYear: number
  floodedAreaKm2: number | null
  floodedCities: number
  protectedCities: number
  atRiskCities: number
  displacedMillions: number
}

export function summarize(state: WorldState): WorldSummary {
  const states = cityStates(state)
  let floodedCities = 0
  let protectedCities = 0
  let atRiskCities = 0
  let displacedMillions = 0
  for (const city of CITIES) {
    const s = states[city.id]
    if (s === 'flooded') {
      floodedCities++
      // 저지대 침수 시 도시권 인구의 일부가 이주한다고 가정
      displacedMillions +=
        city.population *
        Math.min(1, 0.15 + (state.seaLevel - city.elevation) * 0.08)
    } else if (s === 'protected') protectedCities++
    else if (s === 'at-risk') atRiskCities++
  }
  return {
    warming: warming(state),
    riseRateMmPerYear: riseRate(state) * 1000,
    floodedAreaKm2: state.floodCurve
      ? floodedArea(state.floodCurve, state.seaLevel)
      : null,
    floodedCities,
    protectedCities,
    atRiskCities,
    displacedMillions,
  }
}
