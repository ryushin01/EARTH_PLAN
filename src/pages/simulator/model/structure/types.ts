import type { StructureKind } from './catalog'

export interface BuiltStructure {
  id: string
  kind: StructureKind
  /** 설치 지점 id (궤도 구조물은 'orbit', 전 지구 정책은 'global') */
  siteId: string
  startYear: number
  completeYear: number
}

/** 완공 뒤 효과가 얼마나 나타났는지 0~1 (감축 정책은 서서히) */
export function effectFactor(
  structure: BuiltStructure,
  year: number,
  rampYears = 0,
): number {
  if (year < structure.completeYear) return 0
  if (rampYears <= 0) return 1
  return Math.min(1, (year - structure.completeYear) / rampYears)
}

export function isActive(structure: BuiltStructure, year: number): boolean {
  return year >= structure.completeYear
}
