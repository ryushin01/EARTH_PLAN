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

export const LAND_GRID_SIZE = { width: 512, height: 256 } as const
