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
  warming,
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
import {
  SEVERITY_LABEL,
  WILDFIRE_YEARS,
  blastRadiusKm,
  deflectedDiameter,
  droughtEffects,
  impactEnergyMt,
  impactTsunamiMagnitude,
  isInDrought,
  regionOf,
  thermalRadiusKm,
  wildfireArea,
} from './hazards'
import { snapshotStructures } from './snapshot'
import type { Snapshot } from './snapshot'
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
    sourceId: string,
    magnitude: number,
    now?: number,
  ) => ActionResult
  triggerImpact: (
    targetId: string,
    diameterM: number,
    now?: number,
  ) => ActionResult
  startWildfire: (regionId: string, now?: number) => ActionResult
  startDrought: (regionId: string, severity: 1 | 2 | 3) => ActionResult
  loadSnapshot: (snapshot: Snapshot, source: string) => void
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
    impacts: [],
    wildfires: [],
    droughts: [],
    storms: [],
    events: [],
    floodedCityIds: [],
    selectedSiteId: null,
    floodCurve: null,
    nextEventId: 1,
  }
}

export function formatDiameter(m: number): string {
  return m >= 1000 ? `${(m / 1000).toLocaleString('ko-KR')}km` : `${m}m`
}

export function formatEnergy(mt: number): string {
  if (mt >= 1e6)
    return `TNT ${(mt / 1e6).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}조 톤`
  if (mt >= 100)
    return `TNT ${(mt / 100).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억 톤`
  return `TNT ${mt.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}메가톤`
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
        Math.random,
        nowMs(),
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

    triggerTsunami: (sourceId, magnitude, now = nowMs()) => {
      const state = get()
      const trench = getSite(sourceId)
      if (trench?.kind !== 'trench')
        return { ok: false, message: '해구를 선택하세요.' }
      const impacts = tsunamiImpacts(
        sourceId,
        magnitude,
        state.structures,
        state.year,
      )
      set({
        tsunamis: [
          ...state.tsunamis.slice(-3),
          {
            id: `tsunami-${state.nextEventId}`,
            sourceId,
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

    triggerImpact: (targetId, diameterM, now = nowMs()) => {
      const state = get()
      const target = getSite(targetId)
      if (!target) return { ok: false, message: '충돌 지점을 선택하세요.' }
      const effective = deflectedDiameter(
        diameterM,
        state.structures,
        state.year,
      )
      const size = formatDiameter(diameterM)
      if (effective === 0) {
        const message = `지름 ${size} 소행성을 행성 방위 요격망이 궤도를 바꿔 빗나가게 했습니다.`
        set({
          impacts: [
            ...state.impacts.slice(-3),
            {
              id: `impact-${state.nextEventId}`,
              targetId,
              diameterM,
              effectiveDiameterM: 0,
              year: state.year,
              startedAt: now,
              energyMt: 0,
              blastRadiusKm: 0,
              thermalRadiusKm: 0,
              ocean: target.kind === 'ocean',
              affectedCityIds: [],
            },
          ],
        })
        log([{ tone: 'good', text: message }])
        return { ok: true, message }
      }
      const energyMt = impactEnergyMt(effective)
      const blast = blastRadiusKm(energyMt)
      const thermal = thermalRadiusKm(energyMt)
      const affected = citiesWithin(target, thermal).map((c) => c.id)
      const ocean = target.kind === 'ocean'
      const id = `impact-${state.nextEventId}`
      set({
        impacts: [
          ...state.impacts.slice(-3),
          {
            id,
            targetId,
            diameterM,
            effectiveDiameterM: effective,
            year: state.year,
            startedAt: now,
            energyMt,
            blastRadiusKm: blast,
            thermalRadiusKm: thermal,
            ocean,
            affectedCityIds: affected,
          },
        ],
      })
      let tsunamiText = ''
      if (ocean) {
        const magnitude = impactTsunamiMagnitude(energyMt)
        const impacts = tsunamiImpacts(
          targetId,
          magnitude,
          state.structures,
          state.year,
        )
        set({
          tsunamis: [
            ...get().tsunamis.slice(-3),
            {
              id: `tsunami-${id}`,
              sourceId: targetId,
              magnitude,
              year: state.year,
              startedAt: now,
              impacts,
            },
          ],
        })
        const hit = impacts.filter((i) => i.outcome === 'hit').length
        tsunamiText = ` 충돌 쓰나미가 도시 ${hit}곳을 덮칩니다.`
      }
      const reduced =
        effective < diameterM
          ? ` (요격으로 ${formatDiameter(effective)}로 줄어듦)`
          : ''
      const people = affected.length
        ? ` 열복사 반경 ${Math.round(thermal).toLocaleString('ko-KR')}km 안 도시 ${affected.length}곳, 약 ${totalPopulation(affected).toFixed(1)}백만 명 피해.`
        : ` 폭풍 반경 ${Math.round(blast).toLocaleString('ko-KR')}km 안에 주요 도시는 없습니다.`
      const message = `${target.name}에 지름 ${size} 소행성 충돌${reduced}, 약 ${formatEnergy(energyMt)}.${people}${tsunamiText}`
      log([{ tone: effective >= 140 ? 'danger' : 'warn', text: message }])
      return { ok: true, message }
    },

    startWildfire: (regionId, now = nowMs()) => {
      const state = get()
      const region = regionOf(regionId)
      if (!region) return { ok: false, message: '지역을 선택하세요.' }
      const drought = isInDrought(regionId, state.droughts, state.year)
      const burnedKm2 = wildfireArea(
        region,
        warming(state),
        state.structures,
        state.year,
        drought,
      )
      set({
        wildfires: [
          ...state.wildfires.slice(-7),
          {
            id: `fire-${state.nextEventId}`,
            regionId,
            year: state.year,
            startedAt: now,
            burnedKm2,
            durationYears: WILDFIRE_YEARS,
            natural: false,
          },
        ],
      })
      const smoke = region.population * 0.3
      const message =
        `${region.name} 대형 산불, 약 ${Math.round(burnedKm2).toLocaleString('ko-KR')}km² 소실` +
        `${drought ? ' (가뭄으로 커짐)' : ''}. 연기 영향 약 ${smoke.toFixed(1)}백만 명.`
      log([{ tone: 'warn', text: message }])
      return { ok: true, message }
    },

    startDrought: (regionId, severity) => {
      const state = get()
      const region = regionOf(regionId)
      if (!region) return { ok: false, message: '지역을 선택하세요.' }
      if (isInDrought(regionId, state.droughts, state.year)) {
        return {
          ok: false,
          message: `${region.name}은(는) 이미 가뭄 중입니다.`,
        }
      }
      const effects = droughtEffects(
        region,
        severity,
        state.structures,
        state.year,
        warming(state),
      )
      set({
        droughts: [
          ...state.droughts,
          {
            id: `drought-${state.nextEventId}`,
            regionId,
            severity,
            year: state.year,
            ...effects,
          },
        ],
      })
      const message =
        `${region.name} ${SEVERITY_LABEL[severity]} 가뭄 ${effects.durationYears}년. ` +
        `약 ${effects.affectedMillions.toFixed(1)}백만 명 물 부족, 농작물 ${Math.round(effects.cropLoss)}% 감소.`
      log([{ tone: severity >= 3 ? 'danger' : 'warn', text: message }])
      return { ok: true, message }
    },

    loadSnapshot: (snapshot, source) => {
      const curve = get().floodCurve
      const structures = snapshotStructures(snapshot)
      const base = {
        ...initialState(),
        floodCurve: curve,
        scenario: snapshot.scenario,
        year: snapshot.year,
        seaLevel: snapshot.seaLevel,
        budget: snapshot.budget,
        speed: snapshot.speed,
        heldHour: snapshot.heldHour,
        selectedSiteId: snapshot.selectedSiteId,
        structures,
      }
      const { floodedCityIds } = detectFlooding([], base)
      set({ ...base, floodedCityIds })
      log([{ tone: 'info', text: `${source} 시나리오를 불러왔습니다.` }])
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
