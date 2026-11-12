/** public 폴더의 지구 텍스처 경로 */
export const TEXTURES = {
  albedo: '/textures/earth-albedo.jpg',
  lights: '/textures/earth-lights.png',
  clouds: '/textures/earth-clouds.png',
  /** R: −50~205m(1m 단위), G: 전체 고도·수심(제곱근 척도), B: 육지 마스크 */
  elevation: '/textures/earth-elevation.png',
  /** 512×256 Int16 육지 고도(m), 바다는 −32768 */
  landGrid: '/textures/land-elevation-512x256.i16',
} as const

export const LAND_GRID_SIZE = { width: 512, height: 256 } as const
