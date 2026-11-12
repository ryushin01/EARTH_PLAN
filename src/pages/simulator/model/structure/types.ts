import type { StructureKind } from './catalog'

export interface BuiltStructure {
  id: string
  kind: StructureKind
  /** 설치 지점 id (궤도 구조물은 'orbit') */
  siteId: string
  startYear: number
  completeYear: number
}

export function isActive(structure: BuiltStructure, year: number): boolean {
  return year >= structure.completeYear
}
