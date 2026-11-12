import { create } from 'zustand'
import { getSite } from '../site/data'
import { STRUCTURES, STRUCTURE_EN } from '../structure/catalog'
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
  touchHistory,
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
  SEVERITY_LABEL_EN,
  WILDFIRE_YEARS,
  blastRadiusKm,
  deflectedDiameter,
  droughtEffects,
  impactEnergyMt,
  impactTsunamiMagnitude,
  isInDrought,
  quakeImpacts,
  quakeSevereRadiusKm,
  quakeStrongRadiusKm,
  regionOf,
  thermalRadiusKm,
  wildfireArea,
} from './hazards'
import { MISSION_BY_ID } from './missions'
import { both, compose, nameList, num, siteName } from '../text'
import type { Text } from '../text'
import type { Locale } from '@/shared/i18n'
import { snapshotStructures } from './snapshot'
import type { Snapshot } from './snapshot'
import type { WorldState } from './types'

export interface ActionResult {
  ok: boolean
  message: Text
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
  triggerQuake: (
    faultId: string,
    magnitude: number,
    now?: number,
  ) => ActionResult
  startDrought: (regionId: string, severity: 1 | 2 | 3) => ActionResult
  /** source: 어디서 불러왔는지 (예: 공유 링크) */
  loadSnapshot: (snapshot: Snapshot, source: Text) => void
  startMission: (id: string) => void
  quitMission: () => void
  select: (siteId: string | null) => void
  setFloodCurve: (curve: Float64Array) => void
  reset: () => void
}

export type WorldStore = WorldState & WorldActions

function initialState(): WorldState {
  const state: WorldState = {
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
    quakes: [],
    wildfires: [],
    droughts: [],
    storms: [],
    events: [],
    floodedCityIds: [],
    selectedSiteId: null,
    floodCurve: null,
    nextEventId: 1,
    history: [],
    stormDamage: 0,
    spent: 0,
    mission: null,
  }
  return { ...state, history: touchHistory([], state) }
}

export function formatDiameter(m: number, locale: Locale = 'ko'): string {
  return m >= 1000
    ? `${num(m / 1000, locale, m % 1000 ? 1 : 0)} km`.replace(
        ' km',
        locale === 'ko' ? 'km' : ' km',
      )
    : `${m}${locale === 'ko' ? 'm' : ' m'}`
}

export function formatEnergy(mt: number, locale: Locale = 'ko'): string {
  const f = (v: number) =>
    v.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      maximumFractionDigits: 1,
    })
  if (locale === 'en') {
    if (mt >= 1e6) return `${f(mt / 1e6)} teratons of TNT`
    if (mt >= 1e3) return `${f(mt / 1e3)} gigatons of TNT`
    return `${f(mt)} megatons of TNT`
  }
  if (mt >= 1e6) return `TNT ${f(mt / 1e6)}조 톤`
  if (mt >= 100) return `TNT ${f(mt / 100)}억 톤`
  return `TNT ${f(mt)}메가톤`
}

const nowMs = () => (typeof performance === 'undefined' ? 0 : performance.now())

export const useWorld = create<WorldStore>()((set, get) => {
  const log = (events: NewEvent[]) =>
    set((state) => appendEvents(state, events))

  /** 미션: 예정된 재해를 일으키고, 마지막 해에 판정 */
  const runMission = () => {
    const current = get().mission
    if (current?.status !== 'active') return
    const mission = MISSION_BY_ID[current.id] as
      (typeof MISSION_BY_ID)[string] | undefined
    if (!mission) return
    for (const item of mission.schedule) {
      if (current.firedIds.includes(item.id) || get().year < item.year) continue
      set((state) => ({
        mission: state.mission && {
          ...state.mission,
          firedIds: [...state.mission.firedIds, item.id],
        },
      }))
      log([
        {
          tone: 'warn',
          text: compose(
            (l) =>
              `${l === 'ko' ? '미션 사건' : 'Mission event'}: ${item.warning[l]}`,
          ),
        },
      ])
      const h = item.hazard
      if (h.kind === 'impact') get().triggerImpact(h.targetId, h.diameterM)
      if (h.kind === 'tsunami') get().triggerTsunami(h.sourceId, h.magnitude)
      if (h.kind === 'eruption') get().triggerEruption(h.volcanoId, h.vei)
    }
    if (get().year < mission.endYear) return
    const result = mission.evaluate(get())
    set((state) => ({
      running: false,
      mission: state.mission && {
        ...state.mission,
        status: result.ok ? 'success' : 'failed',
      },
    }))
    log([
      {
        tone: result.ok ? 'good' : 'danger',
        text: compose((l) =>
          l === 'ko'
            ? `미션 ${result.ok ? '성공' : '실패'}: ${mission.title.ko}. ${result.detail.ko}`
            : `Mission ${result.ok ? 'accomplished' : 'failed'}: ${mission.title.en}. ${result.detail.en}`,
        ),
      },
    ])
  }

  return {
    ...initialState(),

    tick: (dtSeconds) => {
      const state = get()
      if (!state.running) return
      const dt = Math.min(dtSeconds, 0.1)
      let dtYears = SPEED_BY_ID[state.speed].yearsPerSecond * dt
      // 미션 중에는 마지막 해를 넘기지 않음
      const mission =
        state.mission?.status === 'active'
          ? MISSION_BY_ID[state.mission.id]
          : undefined
      if (mission)
        dtYears = Math.min(
          dtYears,
          Math.max(0, mission.endYear - state.year) + 1e-9,
        )
      const { patch, events } = step(state, dtYears, Math.random, nowMs())
      set(patch)
      log(events)
      runMission()
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
      set((state) => ({
        scenario,
        history: touchHistory(state.history, { ...state, scenario }),
      }))
      log([
        {
          tone: 'info',
          text: both(
            `배출 시나리오: ${SCENARIOS[scenario].label} (${SCENARIOS[scenario].code})`,
            `Emissions scenario: ${SCENARIOS[scenario].labelEn} (${SCENARIOS[scenario].code})`,
          ),
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
      set({
        seaLevel: meters,
        floodedCityIds,
        history: touchHistory(state.history, { ...next, floodedCityIds }),
      })
      log(events)
    },

    build: (kind, siteId, options) => {
      const state = get()
      const spec = STRUCTURES[kind]
      const site = spec.target === 'orbit' ? null : getSite(siteId)
      if (spec.target !== 'orbit' && site?.kind !== spec.target) {
        return {
          ok: false,
          message: both(
            `${spec.name}은(는) 이 위치에 지을 수 없습니다.`,
            `${STRUCTURE_EN[kind].name} can't be built here.`,
          ),
        }
      }
      if (
        state.structures.some((s) => s.kind === kind && s.siteId === siteId)
      ) {
        return {
          ok: false,
          message: both(
            `${site ? siteName(site, 'ko') : '궤도'}에는 이미 ${spec.name}이(가) 있습니다.`,
            `${site ? siteName(site, 'en') : 'Orbit'} already has a ${STRUCTURE_EN[kind].name}.`,
          ),
        }
      }
      if (state.budget < spec.cost) {
        return {
          ok: false,
          message: both(
            `예산이 ${formatBillions(spec.cost - state.budget)} 모자랍니다. 시간을 진행하면 매년 예산이 늘어납니다.`,
            `You are ${formatBillions(spec.cost - state.budget)} short. The budget grows every year while time runs.`,
          ),
        }
      }
      // 미션 중에는 바로 완공을 쓸 수 없음
      const instant =
        options?.instant === true && state.mission?.status !== 'active'
      const completeYear = instant ? state.year : state.year + spec.buildYears
      set({
        budget: state.budget - spec.cost,
        spent: state.spent + spec.cost,
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
      const message = compose((l) => {
        if (l === 'ko') {
          const where = site ? `${siteName(site, l)}에 ` : ''
          return instant
            ? `${where}${spec.name}을(를) 완공했습니다.`
            : `${where}${spec.name} 건설을 시작했습니다. ${spec.buildYears}년 뒤 완공됩니다.`
        }
        const where = site ? ` in ${siteName(site, l)}` : ''
        const name = STRUCTURE_EN[kind].name
        return instant
          ? `${name} completed${where}.`
          : `Construction of ${name}${where} has begun. It will be finished in ${spec.buildYears} years.`
      })
      log([{ tone: 'good', text: message }])
      // 즉시 완공이면 침수 상태를 다시 계산
      if (instant) get().setSeaLevel(get().seaLevel)
      return { ok: true, message }
    },

    triggerEruption: (volcanoId, vei, now = nowMs()) => {
      const state = get()
      const volcano = getSite(volcanoId)
      if (volcano?.kind !== 'volcano')
        return {
          ok: false,
          message: both('화산을 선택하세요.', 'Choose a volcano.'),
        }
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
      const pop = totalPopulation(affected).toFixed(1)
      const message = compose((l) => {
        const name = siteName(volcano, l)
        const r = num(radius, l)
        if (l === 'ko') {
          const reduced =
            effective < vei ? ` (감압 시추로 VEI ${vei} → ${effective})` : ''
          const people = affected.length
            ? ` 화산재 반경 ${r}km 안 도시 ${affected.length}곳, 약 ${pop}백만 명 영향.`
            : ` 화산재 반경 ${r}km 안에 주요 도시는 없습니다.`
          return `${name} 분화, VEI ${effective}${reduced}.${people}`
        }
        const reduced =
          effective < vei
            ? ` (relief drilling lowered VEI ${vei} → ${effective})`
            : ''
        const people = affected.length
          ? ` ${affected.length} cities and about ${pop} million people within the ${r} km ash radius.`
          : ` No major city within the ${r} km ash radius.`
        return `${name} erupts at VEI ${effective}${reduced}.${people}`
      })
      log([{ tone: effective >= 6 ? 'danger' : 'warn', text: message }])
      return { ok: true, message }
    },

    triggerTsunami: (sourceId, magnitude, now = nowMs()) => {
      const state = get()
      const trench = getSite(sourceId)
      if (trench?.kind !== 'trench')
        return {
          ok: false,
          message: both('해구를 선택하세요.', 'Choose a trench.'),
        }
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
      const message = compose((l) =>
        l === 'ko'
          ? `${siteName(trench, l)} 규모 ${magnitude.toFixed(1)} 지진, 쓰나미 발생. ` +
            `큰 피해 ${hit.length}곳${first ? ` (가장 먼저 ${siteName(first.cityId, l)}, 약 ${first.arrivalHours.toFixed(1)}시간 뒤 ${first.waveHeight.toFixed(1)}m)` : ''}` +
            `, 방벽으로 막은 곳 ${blocked.length}곳.`
          : `M${magnitude.toFixed(1)} earthquake on the ${siteName(trench, l)} triggers a tsunami. ` +
            `${hit.length} cities badly hit${first ? ` (first: ${siteName(first.cityId, l)} in about ${first.arrivalHours.toFixed(1)} h, ${first.waveHeight.toFixed(1)} m)` : ''}` +
            `, ${blocked.length} protected by barriers.`,
      )
      log([{ tone: hit.length ? 'danger' : 'warn', text: message }])
      return { ok: true, message }
    },

    triggerImpact: (targetId, diameterM, now = nowMs()) => {
      const state = get()
      const target = getSite(targetId)
      if (!target)
        return {
          ok: false,
          message: both('충돌 지점을 선택하세요.', 'Choose an impact site.'),
        }
      const effective = deflectedDiameter(
        diameterM,
        state.structures,
        state.year,
      )
      if (effective === 0) {
        const message = both(
          `지름 ${formatDiameter(diameterM)} 소행성을 행성 방위 요격망이 궤도를 바꿔 빗나가게 했습니다.`,
          `The planetary defense network deflected the ${formatDiameter(diameterM, 'en')} asteroid.`,
        )
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
      let tsunamiHits: number | null = null
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
        tsunamiHits = impacts.filter((i) => i.outcome === 'hit').length
      }
      const pop = totalPopulation(affected).toFixed(1)
      const message = compose((l) => {
        const name = siteName(target, l)
        const size = formatDiameter(diameterM, l)
        if (l === 'ko') {
          const reduced =
            effective < diameterM
              ? ` (요격으로 ${formatDiameter(effective)}로 줄어듦)`
              : ''
          const people = affected.length
            ? ` 열복사 반경 ${num(thermal, l)}km 안 도시 ${affected.length}곳, 약 ${pop}백만 명 피해.`
            : ` 폭풍 반경 ${num(blast, l)}km 안에 주요 도시는 없습니다.`
          const wave =
            tsunamiHits === null
              ? ''
              : ` 충돌 쓰나미가 도시 ${tsunamiHits}곳을 덮칩니다.`
          return `${name}에 지름 ${size} 소행성 충돌${reduced}, 약 ${formatEnergy(energyMt)}.${people}${wave}`
        }
        const reduced =
          effective < diameterM
            ? ` (interception cut it to ${formatDiameter(effective, l)})`
            : ''
        const people = affected.length
          ? ` ${affected.length} cities and about ${pop} million people inside the ${num(thermal, l)} km thermal radius.`
          : ` No major city inside the ${num(blast, l)} km blast radius.`
        const wave =
          tsunamiHits === null
            ? ''
            : ` The impact tsunami strikes ${tsunamiHits} cities.`
        return `A ${size} asteroid hits ${name}${reduced}: about ${formatEnergy(energyMt, l)}.${people}${wave}`
      })
      log([{ tone: effective >= 140 ? 'danger' : 'warn', text: message }])
      return { ok: true, message }
    },

    startWildfire: (regionId, now = nowMs()) => {
      const state = get()
      const region = regionOf(regionId)
      if (!region)
        return {
          ok: false,
          message: both('지역을 선택하세요.', 'Choose a region.'),
        }
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
      const message = compose((l) =>
        l === 'ko'
          ? `${siteName(region, l)} 대형 산불, 약 ${num(burnedKm2, l)}km² 소실${drought ? ' (가뭄으로 커짐)' : ''}. 연기 영향 약 ${smoke.toFixed(1)}백만 명.`
          : `Major wildfire in ${siteName(region, l)}: about ${num(burnedKm2, l)} km² burned${drought ? ' (worse because of drought)' : ''}. Smoke affects about ${smoke.toFixed(1)} million people.`,
      )
      log([{ tone: 'warn', text: message }])
      return { ok: true, message }
    },

    triggerQuake: (faultId, magnitude, now = nowMs()) => {
      const state = get()
      const fault = getSite(faultId)
      if (fault?.kind !== 'fault')
        return {
          ok: false,
          message: both('단층을 선택하세요.', 'Choose a fault.'),
        }
      const impacts = quakeImpacts(
        fault,
        magnitude,
        state.structures,
        state.year,
      )
      set({
        quakes: [
          ...state.quakes.slice(-3),
          {
            id: `quake-${state.nextEventId}`,
            faultId,
            magnitude,
            year: state.year,
            startedAt: now,
            severeRadiusKm: quakeSevereRadiusKm(magnitude),
            strongRadiusKm: quakeStrongRadiusKm(magnitude),
            impacts,
          },
        ],
      })
      const severe = impacts.filter((i) => i.outcome === 'severe')
      const reduced = impacts.filter((i) => i.outcome === 'reduced')
      const pop = totalPopulation(impacts.map((i) => i.cityId)).toFixed(1)
      const message = compose((l) => {
        const list = (items: typeof impacts) =>
          nameList(
            items.map((i) => i.cityId),
            l,
          )
        const name = siteName(fault, l)
        if (l === 'ko') {
          if (!impacts.length)
            return `${name} 규모 ${magnitude.toFixed(1)} 지진. 강한 흔들림 범위 안에 주요 도시는 없습니다.`
          return (
            `${name} 규모 ${magnitude.toFixed(1)} 지진. 큰 피해 ${severe.length}곳${severe.length ? ` (${list(severe)})` : ''}, 흔들림 ${impacts.length}곳, 약 ${pop}백만 명 영향` +
            (reduced.length
              ? `. 내진 보강으로 버틴 곳: ${list(reduced)}`
              : '') +
            '.'
          )
        }
        if (!impacts.length)
          return `M${magnitude.toFixed(1)} earthquake on the ${name}. No major city within strong shaking.`
        return (
          `M${magnitude.toFixed(1)} earthquake on the ${name}. ${severe.length} cities badly damaged${severe.length ? ` (${list(severe)})` : ''}, ${impacts.length} shaken, about ${pop} million people affected` +
          (reduced.length
            ? `. Held up thanks to retrofits: ${list(reduced)}`
            : '') +
          '.'
        )
      })
      log([{ tone: severe.length ? 'danger' : 'warn', text: message }])
      return { ok: true, message }
    },

    startDrought: (regionId, severity) => {
      const state = get()
      const region = regionOf(regionId)
      if (!region)
        return {
          ok: false,
          message: both('지역을 선택하세요.', 'Choose a region.'),
        }
      if (isInDrought(regionId, state.droughts, state.year)) {
        return {
          ok: false,
          message: both(
            `${siteName(region, 'ko')}은(는) 이미 가뭄 중입니다.`,
            `${siteName(region, 'en')} is already in drought.`,
          ),
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
      const message = compose((l) =>
        l === 'ko'
          ? `${siteName(region, l)} ${SEVERITY_LABEL[severity]} 가뭄 ${effects.durationYears}년. 약 ${effects.affectedMillions.toFixed(1)}백만 명 물 부족, 농작물 ${Math.round(effects.cropLoss)}% 감소.`
          : `${SEVERITY_LABEL_EN[severity]} drought in ${siteName(region, l)} for ${effects.durationYears} years. About ${effects.affectedMillions.toFixed(1)} million people short of water, crops down ${Math.round(effects.cropLoss)}%.`,
      )
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
      set({
        ...base,
        floodedCityIds,
        history: touchHistory([], { ...base, floodedCityIds }),
      })
      log([
        {
          tone: 'info',
          text: both(
            `${source.ko} 시나리오를 불러왔습니다.`,
            `Loaded the scenario from ${source.en}.`,
          ),
        },
      ])
    },

    startMission: (id) => {
      const mission = MISSION_BY_ID[id] as
        (typeof MISSION_BY_ID)[string] | undefined
      if (!mission) return
      const base = initialState()
      const state: WorldState = {
        ...base,
        floodCurve: get().floodCurve,
        scenario: mission.scenario,
        budget: mission.budget,
        seaLevel: baselineSeaLevel(base.year, SCENARIOS[mission.scenario]),
        mission: { id, status: 'active', firedIds: [] },
      }
      set({ ...state, history: touchHistory([], state) })
      log([
        {
          tone: 'info',
          text: both(
            `미션 시작: ${mission.title.ko}. 목표: ${mission.goal.ko}`,
            `Mission started: ${mission.title.en}. Goal: ${mission.goal.en}`,
          ),
        },
      ])
    },

    quitMission: () => {
      const mission = get().mission
      if (!mission) return
      set({ mission: null })
      log([
        {
          tone: 'info',
          text: both(
            '미션을 그만두었습니다. 지금 상태에서 자유롭게 이어 갑니다.',
            'Mission abandoned. Carry on freely from here.',
          ),
        },
      ])
    },

    select: (siteId) => set({ selectedSiteId: siteId }),

    setFloodCurve: (floodCurve) => set({ floodCurve }),

    reset: () => {
      const curve = get().floodCurve
      set({ ...initialState(), floodCurve: curve })
      log([
        {
          tone: 'info',
          text: both(
            '시뮬레이션을 처음 상태로 되돌렸습니다.',
            'The simulation was reset.',
          ),
        },
      ])
    },
  }
})
