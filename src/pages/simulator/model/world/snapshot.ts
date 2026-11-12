import { getSite } from '../site/data'
import { STRUCTURES } from '../structure/catalog'
import type { StructureKind } from '../structure/catalog'
import type { BuiltStructure } from '../structure/types'
import { SCENARIOS } from './scenario'
import type { ScenarioId } from './scenario'
import { SPEED_BY_ID } from './time'
import type { SpeedId } from './time'
import type { WorldState } from './types'

/** 저장·공유하는 시나리오 (재해 애니메이션은 빼고 지속되는 상태만) */
export interface Snapshot {
  v: 1
  scenario: ScenarioId
  year: number
  seaLevel: number
  budget: number
  speed: SpeedId
  heldHour: number
  selectedSiteId: string | null
  /** [종류, 지점, 착공 연도, 완공 연도] */
  structures: Array<[StructureKind, string, number, number]>
}

const round = (n: number, digits = 4) =>
  Math.round(n * 10 ** digits) / 10 ** digits

export function toSnapshot(state: WorldState): Snapshot {
  return {
    v: 1,
    scenario: state.scenario,
    year: round(state.year, 6),
    seaLevel: round(state.seaLevel),
    budget: round(state.budget, 1),
    speed: state.speed,
    heldHour: round(state.heldHour, 2),
    selectedSiteId: state.selectedSiteId,
    structures: state.structures.map((s) => [
      s.kind,
      s.siteId,
      round(s.startYear, 6),
      round(s.completeYear, 6),
    ]),
  }
}

export function snapshotStructures(snapshot: Snapshot): BuiltStructure[] {
  return snapshot.structures.map(
    ([kind, siteId, startYear, completeYear], i) => ({
      id: `${kind}-${siteId}-s${i}`,
      kind,
      siteId,
      startYear,
      completeYear,
    }),
  )
}

const isNumber = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max

/** 밖에서 들어온 값(주소·저장소)을 검사합니다. 잘못되면 null */
export function parseSnapshot(value: unknown): Snapshot | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  if (v.v !== 1) return null
  if (typeof v.scenario !== 'string' || !(v.scenario in SCENARIOS)) return null
  if (typeof v.speed !== 'string' || !(v.speed in SPEED_BY_ID)) return null
  if (!isNumber(v.year, 1900, 3000)) return null
  if (!isNumber(v.seaLevel, -10, 100)) return null
  if (!isNumber(v.budget, -1e6, 1e7)) return null
  if (!isNumber(v.heldHour, 0, 24)) return null
  if (
    v.selectedSiteId !== null &&
    (typeof v.selectedSiteId !== 'string' || !getSite(v.selectedSiteId))
  ) {
    return null
  }
  if (!Array.isArray(v.structures) || v.structures.length > 200) return null
  for (const item of v.structures as unknown[]) {
    if (!Array.isArray(item) || item.length !== 4) return null
    const [kind, siteId, start, complete] = item as unknown[]
    if (typeof kind !== 'string' || !(kind in STRUCTURES)) return null
    if (typeof siteId !== 'string') return null
    const target = STRUCTURES[kind as StructureKind].target
    if (
      target === 'orbit' || target === 'global'
        ? siteId !== target
        : getSite(siteId)?.kind !== target
    )
      return null
    if (!isNumber(start, 1900, 3000) || !isNumber(complete, 1900, 3100))
      return null
  }
  return v as unknown as Snapshot
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(code: string): string {
  const base64 = code.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return new TextDecoder().decode(
    Uint8Array.from(binary, (c) => c.charCodeAt(0)),
  )
}

export function encodeSnapshot(snapshot: Snapshot): string {
  return toBase64Url(JSON.stringify(snapshot))
}

export function decodeSnapshot(code: string): Snapshot | null {
  try {
    return parseSnapshot(JSON.parse(fromBase64Url(code)))
  } catch {
    return null
  }
}

/** 공유 주소의 검색 매개변수 이름 */
export const SHARE_PARAM = 's'
