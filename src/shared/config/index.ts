/** 배포 경로 접두사 (GitHub Pages에서는 /EARTH_PLAN/) */
const BASE = import.meta.env.BASE_URL

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
