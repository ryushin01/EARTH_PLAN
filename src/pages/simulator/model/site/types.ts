import type { LatLon } from '@/shared/lib'

/** 쓰나미가 퍼지는 바다 구역 */
export type Basin =
  | 'pacific'
  | 'east-asian-seas'
  | 'south-china-sea'
  | 'indian'
  | 'atlantic'
  | 'mediterranean'

export type SiteKind = 'city' | 'volcano' | 'trench' | 'strait' | 'glacier'

interface SiteBase extends LatLon {
  id: string
  name: string
  region: string
}

export interface City extends SiteBase {
  kind: 'city'
  /** 저지대 대표 고도 (m, 대략값) */
  elevation: number
  /** 도시권 인구 (백만 명, 대략값) */
  population: number
  coastal: boolean
  /** 이미 있는 제방·방조제가 막는 높이 (m) */
  defense: number
  /** 접한 바다 (내륙 도시는 빈 배열) */
  basins: Basin[]
}

export interface Volcano extends SiteBase {
  kind: 'volcano'
  /** 기록상 최대 화산폭발지수 */
  historicVei: number
  note: string
}

export interface Trench extends SiteBase {
  kind: 'trench'
  /** 기록상 최대 지진 규모 */
  historicMagnitude: number
  basin: Basin
  note: string
}

export interface Strait extends SiteBase {
  kind: 'strait'
  /** 댐으로 막으면 보호되는 도시 */
  protects: string[]
  note: string
}

export interface Glacier extends SiteBase {
  kind: 'glacier'
  /** 전부 녹을 때 해수면 상승 잠재량 (m) */
  potentialRise: number
  note: string
}

export type Site = City | Volcano | Trench | Strait | Glacier
