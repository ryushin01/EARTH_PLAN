import { LAND_GRID_SIZE, TEXTURES } from '@/shared/config'
import { buildFloodCurve } from '../model/world/engine'

/** 육지 고도 격자를 받아 침수 면적 곡선을 만듭니다 */
export async function loadFloodCurve(
  signal?: AbortSignal,
): Promise<Float64Array> {
  const response = await fetch(TEXTURES.landGrid, { signal })
  if (!response.ok)
    throw new Error(`육지 고도 자료를 받지 못했습니다 (${response.status})`)
  const grid = new Uint8Array(await response.arrayBuffer())
  return buildFloodCurve(grid, LAND_GRID_SIZE.width, LAND_GRID_SIZE.height)
}
