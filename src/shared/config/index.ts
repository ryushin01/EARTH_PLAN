/** 배포 경로 접두사 (GitHub Pages에서는 /TerraNova/) */
const BASE = import.meta.env.BASE_URL

/** 실제 서비스 주소 (canonical·공유 미리보기에 씀) */
export const SITE_URL = 'https://ryushin01.github.io/TerraNova/'

/** 공유 미리보기 이미지 (1200×630, 실제 첫 화면) */
export const OG_IMAGE = {
  url: `${SITE_URL}og-image.jpg`,
  width: 1200,
  height: 630,
  alt: '검은 우주 위 3D 지구와 왼쪽 지구 관리, 오른쪽 지구 상태 패널이 있는 TerraNova 첫 화면',
} as const

/** public 폴더의 지구 텍스처 경로 */
export const TEXTURES = {
  albedo: `${BASE}textures/earth-albedo.webp`,
  lights: `${BASE}textures/earth-lights.webp`,
  clouds: `${BASE}textures/earth-clouds.webp`,
  /** R: −50~205m(1m 단위), G: 전체 고도·수심(제곱근 척도), B: 육지 마스크 */
  elevation: `${BASE}textures/earth-elevation.webp`,
  /** 512×256 Uint8 육지 고도: 0 바다, 1~254 (값 − 51)m, 255 204m 이상 */
  landGrid: `${BASE}textures/land-elevation-512x256.u8`,
} as const

export interface DetailPatch {
  id: string
  /** 회색조 ETOPO1 1분 고도: −50~205m (값 − 50), 첫 줄이 북쪽·첫 칸이 서쪽 */
  url: string
  /** 덮는 범위 (도, 픽셀 가장자리) */
  bounds: { west: number; east: number; south: number; north: number }
}

/** 1분 격자(격자점이 픽셀 가운데)가 덮는 범위: 사방으로 반 칸(1/120°)씩 넓음 */
const minuteGrid = (
  south: number,
  north: number,
  west: number,
  east: number,
) => ({
  west: west - 1 / 120,
  east: east + 1 / 120,
  south: south - 1 / 120,
  north: north + 1 / 120,
})

/**
 * 고해상도 고도 패치 (전 세계 고도보다 10배 촘촘한 1분, 약 1.8km).
 * 침수를 세밀하게 그릴 낮은 해안: 서해안 간척지·한강·낙동강 하구, 도쿄만·간토 평야, 해발 0m 아래 간척지가 많은 네덜란드.
 * 셰이더 입력(uDetail0, uDetail1 …)은 이 목록의 순서대로 만듦(lib/shaders.ts)
 */
export const DETAIL_PATCHES: readonly DetailPatch[] = [
  {
    id: 'korea',
    url: `${BASE}textures/korea-elevation.webp`,
    bounds: minuteGrid(33, 43, 124, 131),
  },
  {
    id: 'tokyo-bay',
    url: `${BASE}textures/tokyo-bay-elevation.webp`,
    bounds: minuteGrid(34.8, 36.5, 139.2, 141),
  },
  {
    id: 'netherlands',
    url: `${BASE}textures/netherlands-elevation.webp`,
    bounds: minuteGrid(50.7, 53.8, 2.5, 7.5),
  },
]

/** 작은 화면용 1024px 텍스처 (모바일 전송량·GPU 업로드 시간 절약) */
export const TEXTURES_SMALL = {
  albedo: `${BASE}textures/earth-albedo-1024.webp`,
  lights: `${BASE}textures/earth-lights-1024.webp`,
  clouds: TEXTURES.clouds,
  elevation: `${BASE}textures/earth-elevation-1024.webp`,
} as const

/** 화면이 좁거나 기기 메모리가 적으면 작은 텍스처를 씀 */
export function prefersSmallTextures(): boolean {
  if (typeof window === 'undefined') return false
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory
  return (
    window.matchMedia('(max-width: 767px)').matches ||
    (memory !== undefined && memory <= 2)
  )
}

export const LAND_GRID_SIZE = { width: 512, height: 256 } as const
