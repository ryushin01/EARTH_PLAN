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

/** 산불: 범위 안에 불씨 무늬와 연기 */
export interface FireInput {
  center: Vec3
  radius: number
  /** 불이 타는 정도 0~1 (0이면 탄 자리만) */
  intensity: number
  /** 탄 자리 진하기 0~1 */
  scar: number
}

/** 가뭄: 범위 안 땅이 누렇게 마름 */
export interface DroughtInput {
  center: Vec3
  radius: number
  amount: number
}

export interface PlumeInput {
  id: string
  /** 화산 분출 기둥 또는 소행성 충돌 불덩이 */
  kind: 'volcano' | 'impact' | 'quake'
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
  fires: FireInput[]
  droughts: DroughtInput[]
}

export const MAX_WAVES = 4
export const MAX_ASHES = 6
export const MAX_STORMS = 8
export const MAX_FIRES = 6
export const MAX_DROUGHTS = 4
