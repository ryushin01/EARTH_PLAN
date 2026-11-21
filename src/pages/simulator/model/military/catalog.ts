import type { Vec3 } from '@/shared/lib'
import type { Text } from '../text'
import {
  DISPLAY,
  fleetGroup,
  flightGroup,
  groupCenter,
  satellitePose,
} from './motion'
import type { Group } from './motion'
import { newPose } from '../traffic/motion'
import { SATELLITES } from './satellites'
import type { Satellite } from './satellites'
import type { MilitaryLayer } from './store'
import { FLEETS, FLIGHTS } from './units'
import type { Fleet, Flight } from './units'

/** 고를 수 있는 위성·편대·함대 하나 */
export type MilitaryUnit =
  | {
      kind: 'satellite'
      id: string
      layer: MilitaryLayer
      name: Text
      satellite: Satellite
    }
  | {
      kind: 'flight'
      id: string
      layer: MilitaryLayer
      name: Text
      flight: Flight
      group: Group
    }
  | {
      kind: 'fleet'
      id: string
      layer: MilitaryLayer
      name: Text
      fleet: Fleet
      group: Group
    }

export const FLIGHT_GROUPS = FLIGHTS.map((f, k) => flightGroup(f, k))
export const FLEET_GROUPS = FLEETS.map((f, k) => fleetGroup(f, k))

export const MILITARY_UNITS: MilitaryUnit[] = [
  ...SATELLITES.map((satellite): MilitaryUnit => ({
    kind: 'satellite',
    id: satellite.id,
    layer: satellite.use === 'military' ? 'militarySat' : 'civilSat',
    name: satellite.name,
    satellite,
  })),
  ...FLIGHTS.map((flight, k): MilitaryUnit => ({
    kind: 'flight',
    id: flight.id,
    layer: 'flights',
    name: flight.name,
    flight,
    group: FLIGHT_GROUPS[k],
  })),
  ...FLEETS.map((fleet, k): MilitaryUnit => ({
    kind: 'fleet',
    id: fleet.id,
    layer: 'fleets',
    name: fleet.name,
    fleet,
    group: FLEET_GROUPS[k],
  })),
]

export const findUnit = (id: string | null) =>
  id ? MILITARY_UNITS.find((u) => u.id === id) : undefined

/** 위성 실제 시각 (초) = 화면 시각 × 시간 압축 */
export const satelliteTime = (screenSec: number) =>
  screenSec * DISPLAY.timeScale.satellite

const pose = newPose()

/** 지금 그 개체가 있는 방향 (카메라를 돌릴 때) */
export function unitDirection(unit: MilitaryUnit, screenSec: number): Vec3 {
  if (unit.kind === 'satellite') {
    satellitePose(unit.satellite, satelliteTime(screenSec), pose)
    return [...pose.up]
  }
  return groupCenter(unit.group, screenSec)
}
