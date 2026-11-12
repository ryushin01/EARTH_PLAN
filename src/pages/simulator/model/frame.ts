import type { PlanetFrame, PlumeInput } from './planet'
import { ashRadiusKm, climateVisuals, TSUNAMI_SPEED_KMH } from './world/engine'
import { isHourFrozen, SPEED_BY_ID, withUtcHour } from './world/time'
import type { WorldState } from './world/types'
import { getSite } from './site/data'
import { regionOf, wildfireRadiusKm } from './world/hazards'
import {
  DAYS_PER_YEAR,
  kmToRadians,
  latLonToVector3,
  subsolarPoint,
} from '@/shared/lib'

/** 화면의 1초 = 쓰나미 1시간 */
const TSUNAMI_HOURS_PER_SECOND = 1

export interface FrameClock {
  cloudOffset: number
  lastTime: number
}

/** 시뮬레이션 상태 → 지구 셰이더 입력 */
export function buildFrame(
  state: WorldState,
  nowMs: number,
  clock: FrameClock,
  elapsed: number,
): PlanetFrame {
  const dt = Math.max(0, Math.min(0.1, elapsed - clock.lastTime))
  clock.lastTime = elapsed
  if (state.running) {
    const daysPerSecond =
      SPEED_BY_ID[state.speed].yearsPerSecond * DAYS_PER_YEAR
    clock.cloudOffset +=
      dt * 0.0025 * Math.min(Math.max(daysPerSecond, 0.15), 40)
  }

  const sunYear = isHourFrozen(state.speed)
    ? withUtcHour(state.year, state.heldHour)
    : state.year
  const climate = climateVisuals(state)

  const waves = state.tsunamis.flatMap((t) => {
    const trench = getSite(t.sourceId)
    if (!trench) return []
    const hours = ((nowMs - t.startedAt) / 1000) * TSUNAMI_HOURS_PER_SECOND
    const radius = kmToRadians(hours * TSUNAMI_SPEED_KMH)
    if (radius > Math.PI * 0.98) return []
    const strength =
      Math.min(1, (t.magnitude - 7) / 2) * (1 - radius / Math.PI) ** 0.5
    return [{ center: latLonToVector3(trench), radius, strength }]
  })

  const plumes: PlumeInput[] = []
  const ashes = state.eruptions.flatMap((e) => {
    const volcano = getSite(e.volcanoId)
    if (!volcano) return []
    const age = (nowMs - e.startedAt) / 1000
    const realFade = age < 40 ? 1 : Math.max(0, 1 - (age - 40) / 20)
    const simFade = Math.max(0, 1 - (state.year - e.year) / 3)
    const amount = 0.85 * Math.min(realFade, simFade)
    if (amount <= 0) return []
    const center = latLonToVector3(volcano)
    plumes.push({
      id: e.id,
      kind: 'volcano',
      center,
      age,
      size: (e.vei - 2) / 6,
    })
    return [
      {
        center,
        radius: kmToRadians(ashRadiusKm(e.vei)) * Math.min(1, 0.2 + age / 6),
        amount,
      },
    ]
  })

  // 소행성 충돌: 불덩이와 잔해(화산재처럼 어두운 범위)
  for (const impact of state.impacts) {
    const target = getSite(impact.targetId)
    if (!target || impact.effectiveDiameterM <= 0) continue
    const age = (nowMs - impact.startedAt) / 1000
    const center = latLonToVector3(target)
    plumes.push({
      id: impact.id,
      kind: 'impact',
      center,
      age,
      size: Math.min(1, Math.log10(impact.effectiveDiameterM / 20) / 2.7),
    })
    const realFade = age < 40 ? 1 : Math.max(0, 1 - (age - 40) / 20)
    const simFade = Math.max(0, 1 - (state.year - impact.year) / 5)
    const amount = 0.9 * Math.min(realFade, simFade)
    if (amount > 0 && !impact.ocean) {
      ashes.push({
        center,
        radius:
          kmToRadians(impact.thermalRadiusKm) * Math.min(1, 0.15 + age / 4),
        amount,
      })
    }
  }

  const fires = state.wildfires.flatMap((f) => {
    const region = regionOf(f.regionId)
    if (!region) return []
    const progress = (state.year - f.year) / f.durationYears
    const age = (nowMs - f.startedAt) / 1000
    // 멈춘 상태에서도 직접 일으킨 산불은 30초 동안 타오름
    const burning = progress < 1 || (!f.natural && age < 30) ? 1 : 0
    const scar = Math.max(0, 1 - Math.max(0, progress - 1) / 2)
    if (burning === 0 && scar <= 0) return []
    return [
      {
        center: latLonToVector3(region),
        radius: kmToRadians(wildfireRadiusKm(region, f.burnedKm2)),
        intensity: burning * Math.min(1, 0.4 + f.burnedKm2 / 20000),
        scar,
      },
    ]
  })

  const droughts = state.droughts.flatMap((d) => {
    const region = regionOf(d.regionId)
    if (!region) return []
    const progress = (state.year - d.year) / d.durationYears
    const amount =
      Math.min(1, progress * 8 + 0.3, (1 - progress) * 4) *
      (0.45 + d.severity * 0.18)
    return amount > 0
      ? [
          {
            center: latLonToVector3(region),
            radius: kmToRadians(region.radiusKm),
            amount,
          },
        ]
      : []
  })

  const storms = state.storms.map((s) => {
    const ageDays = (state.year - s.bornYear) * DAYS_PER_YEAR
    const life = ageDays / s.lifeDays
    const strength =
      Math.min(1, life * 6, (1 - life) * 4) * (0.6 + s.category * 0.08)
    return {
      center: latLonToVector3(s),
      radius: kmToRadians(250 + 90 * s.category),
      strength: Math.max(0, strength),
      hemisphere: s.hemisphere,
    }
  })

  return {
    sun: latLonToVector3(subsolarPoint(sunYear)),
    seaLevel: state.seaLevel,
    seaIceLatN: climate.seaIceLatN,
    seaIceLatS: climate.seaIceLatS,
    snowLatN: climate.snowLatN,
    snowLatS: climate.snowLatS,
    snowAltitude: climate.snowAltitude,
    aridity: climate.aridity,
    cloudCover: climate.cloudCover,
    cloudOffset: clock.cloudOffset,
    waves: waves.slice(-4),
    ashes: ashes.slice(-6),
    storms,
    plumes,
    fires: fires.slice(-6),
    droughts: droughts.slice(-4),
  }
}
