import { create } from 'zustand'
import { getSite } from '../site/data'
import { STRUCTURES } from '../structure/catalog'
import type { StructureKind } from '../structure/catalog'
import { formatBillions } from '@/shared/lib'
import {
  START_BUDGET,
  appendEvents,
  ashRadiusKm,
  citiesWithin,
  detectFlooding,
  effectiveVei,
  step,
  totalPopulation,
  tsunamiImpacts,
} from './engine'
import type { NewEvent } from './engine'
import { SCENARIOS, baselineSeaLevel } from './scenario'
import type { ScenarioId } from './scenario'
import {
  SPEED_BY_ID,
  START_YEAR,
  isHourFrozen,
  utcHourOf,
  withUtcHour,
} from './time'
import type { SpeedId } from './time'
import type { WorldState } from './types'

export interface ActionResult {
  ok: boolean
  message: string
}

interface WorldActions {
  tick: (dtSeconds: number) => void
  setRunning: (running: boolean) => void
  setSpeed: (speed: SpeedId) => void
  setHour: (hour: number) => void
  setScenario: (scenario: ScenarioId) => void
  setSeaLevel: (meters: number) => void
  build: (
    kind: StructureKind,
    siteId: string,
    options?: { instant?: boolean },
  ) => ActionResult
  triggerEruption: (
    volcanoId: string,
    vei: number,
    now?: number,
  ) => ActionResult
  triggerTsunami: (
    trenchId: string,
    magnitude: number,
    now?: number,
  ) => ActionResult
  select: (siteId: string | null) => void
  setFloodCurve: (curve: Float64Array) => void
  reset: () => void
}

export type WorldStore = WorldState & WorldActions

function initialState(): WorldState {
  return {
    year: START_YEAR,
    running: false,
    speed: 'day',
    heldHour: utcHourOf(START_YEAR),
    scenario: 'mid',
    seaLevel: baselineSeaLevel(START_YEAR, SCENARIOS.mid),
    budget: START_BUDGET,
    structures: [],
    eruptions: [],
    tsunamis: [],
    storms: [],
    events: [],
    floodedCityIds: [],
    selectedSiteId: null,
    floodCurve: null,
    nextEventId: 1,
  }
}

const nowMs = () => (typeof performance === 'undefined' ? 0 : performance.now())

export const useWorld = create<WorldStore>()((set, get) => {
  const log = (events: NewEvent[]) =>
    set((state) => appendEvents(state, events))

  return {
    ...initialState(),

    tick: (dtSeconds) => {
      const state = get()
      if (!state.running) return
      const dt = Math.min(dtSeconds, 0.1)
      const { patch, events } = step(
        state,
        SPEED_BY_ID[state.speed].yearsPerSecond * dt,
      )
      set(patch)
      log(events)
    },

    setRunning: (running) => set({ running }),

    setSpeed: (speed) =>
      set((state) => ({
        speed,
        heldHour:
          isHourFrozen(speed) && !isHourFrozen(state.speed)
            ? utcHourOf(state.year)
            : state.heldHour,
        year:
          !isHourFrozen(speed) && isHourFrozen(state.speed)
            ? withUtcHour(state.year, state.heldHour)
            : state.year,
      })),

    setHour: (hour) =>
      set((state) => ({
        heldHour: hour,
        year: isHourFrozen(state.speed)
          ? state.year
          : withUtcHour(state.year, hour),
      })),

    setScenario: (scenario) => {
      set({ scenario })
      log([
        {
          tone: 'info',
          text: `배출 시나리오: ${SCENARIOS[scenario].label} (${SCENARIOS[scenario].code})`,
        },
      ])
    },

    setSeaLevel: (meters) => {
      const state = get()
      const next = { ...state, seaLevel: meters }
      const { floodedCityIds, events } = detectFlooding(
        state.floodedCityIds,
        next,
      )
      set({ seaLevel: meters, floodedCityIds })
      log(events)
    },

    build: (kind, siteId, options) => {
      const state = get()
      const spec = STRUCTURES[kind]
      const site = spec.target === 'orbit' ? null : getSite(siteId)
      if (spec.target !== 'orbit' && site?.kind !== spec.target) {
        return {
          ok: false,
          message: `${spec.name}은(는) 이 위치에 지을 수 없습니다.`,
        }
      }
      if (
        state.structures.some((s) => s.kind === kind && s.siteId === siteId)
      ) {
        return {
          ok: false,
          message: `${site?.name ?? '궤도'}에는 이미 ${spec.name}이(가) 있습니다.`,
        }
      }
      if (state.budget < spec.cost) {
        return {
          ok: false,
          message: `예산이 ${formatBillions(spec.cost - state.budget)} 모자랍니다. 시간을 진행하면 매년 예산이 늘어납니다.`,
        }
      }
      const completeYear = options?.instant
        ? state.year
        : state.year + spec.buildYears
      set({
        budget: state.budget - spec.cost,
        structures: [
          ...state.structures,
          {
            id: `${kind}-${siteId}-${state.nextEventId}`,
            kind,
            siteId,
            startYear: state.year,
            completeYear,
          },
        ],
      })
      const where = site ? `${site.name}에 ` : ''
      const message = options?.instant
        ? `${where}${spec.name}을(를) 완공했습니다.`
        : `${where}${spec.name} 건설을 시작했습니다. ${spec.buildYears}년 뒤 완공됩니다.`
      log([{ tone: 'good', text: message }])
      // 즉시 완공이면 침수 상태를 다시 계산
      if (options?.instant) get().setSeaLevel(get().seaLevel)
      return { ok: true, message }
    },

    triggerEruption: (volcanoId, vei, now = nowMs()) => {
      const state = get()
      const volcano = getSite(volcanoId)
      if (volcano?.kind !== 'volcano')
        return { ok: false, message: '화산을 선택하세요.' }
      const effective = effectiveVei(
        volcanoId,
        vei,
        state.structures,
        state.year,
      )
      const radius = ashRadiusKm(effective)
      const affected = citiesWithin(volcano, radius).map((c) => c.id)
      set({
        eruptions: [
          ...state.eruptions.slice(-5),
          {
            id: `eruption-${state.nextEventId}`,
            volcanoId,
            requestedVei: vei,
            vei: effective,
            year: state.year,
            startedAt: now,
            ashRadiusKm: radius,
            affectedCityIds: affected,
          },
        ],
      })
      const reduced =
        effective < vei ? ` (감압 시추로 VEI ${vei} → ${effective})` : ''
      const people = affected.length
        ? ` 화산재 반경 ${radius.toLocaleString('ko-KR')}km 안 도시 ${affected.length}곳, 약 ${totalPopulation(affected).toFixed(1)}백만 명 영향.`
        : ` 화산재 반경 ${radius.toLocaleString('ko-KR')}km 안에 주요 도시는 없습니다.`
      const message = `${volcano.name} 분화, VEI ${effective}${reduced}.${people}`
      log([{ tone: effective >= 6 ? 'danger' : 'warn', text: message }])
      return { ok: true, message }
    },

    triggerTsunami: (trenchId, magnitude, now = nowMs()) => {
      const state = get()
      const trench = getSite(trenchId)
      if (trench?.kind !== 'trench')
        return { ok: false, message: '해구를 선택하세요.' }
      const impacts = tsunamiImpacts(
        trenchId,
        magnitude,
        state.structures,
        state.year,
      )
      set({
        tsunamis: [
          ...state.tsunamis.slice(-3),
          {
            id: `tsunami-${state.nextEventId}`,
            trenchId,
            magnitude,
            year: state.year,
            startedAt: now,
            impacts,
          },
        ],
      })
      const hit = impacts.filter((i) => i.outcome === 'hit')
      const blocked = impacts.filter((i) => i.outcome === 'blocked')
      const first = hit[0] as (typeof hit)[number] | undefined
      const message =
        `${trench.name} 규모 ${magnitude.toFixed(1)} 지진, 쓰나미 발생. ` +
        `큰 피해 ${hit.length}곳${first ? ` (가장 먼저 ${getSite(first.cityId)?.name}, 약 ${first.arrivalHours.toFixed(1)}시간 뒤 ${first.waveHeight.toFixed(1)}m)` : ''}` +
        `, 방벽으로 막은 곳 ${blocked.length}곳.`
      log([{ tone: hit.length ? 'danger' : 'warn', text: message }])
      return { ok: true, message }
    },

    select: (siteId) => set({ selectedSiteId: siteId }),

    setFloodCurve: (floodCurve) => set({ floodCurve }),

    reset: () => {
      const curve = get().floodCurve
      set({ ...initialState(), floodCurve: curve })
      log([{ tone: 'info', text: '시뮬레이션을 처음 상태로 되돌렸습니다.' }])
    },
  }
})
