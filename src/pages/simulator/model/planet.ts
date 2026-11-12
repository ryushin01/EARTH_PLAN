import type { Vec3 } from '@/shared/lib'

export interface WaveInput {
  center: Vec3
  /** 파면의 중심각 (라디안) */
  radius: number
  strength: number
}

export interface AshInput {
  center: Vec3
  radius: number
  amount: number
}

export interface StormInput {
  center: Vec3
  radius: number
  strength: number
  hemisphere: 1 | -1
}

export interface PlumeInput {
  id: string
  center: Vec3
  /** 분출 후 지난 시간 (초) */
  age: number
  size: number
}

/** 매 프레임 지구 셰이더에 넣는 값 */
export interface PlanetFrame {
  sun: Vec3
  seaLevel: number
  seaIceLatN: number
  seaIceLatS: number
  snowLatN: number
  snowLatS: number
  snowAltitude: number
  aridity: number
  cloudCover: number
  /** 구름이 흘러간 정도 (텍스처 u 좌표) */
  cloudOffset: number
  waves: WaveInput[]
  ashes: AshInput[]
  storms: StormInput[]
  plumes: PlumeInput[]
}

export const MAX_WAVES = 4
export const MAX_ASHES = 6
export const MAX_STORMS = 8
