import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { distanceKm, vector3ToLatLon } from '@/shared/lib'
import type { LatLon } from '@/shared/lib'
import { getSite } from '../site/data'
import { FLIGHT_ROUTES, SEA_LANES } from './routes'
import type { SeaLane } from './routes'
import { makePath, pointAt } from './sphere'

// 침수 계산용 512×256 격자: 첫 줄이 북위 90°, 첫 칸이 서경 180°, 0이면 바다
const grid = readFileSync(resolve('public/textures/land-elevation-512x256.u8'))

function isSea({ lat, lon }: LatLon): boolean {
  const row = Math.min(255, Math.max(0, Math.floor(((90 - lat) / 180) * 256)))
  const col = (((Math.floor(((lon + 180) / 360) * 512) % 512) + 512) % 512) | 0
  return grid[row * 512 + col] === 0
}

/** 바닷길 위를 0.25°마다 짚어, 기항지 150km 밖인데 육지인 곳 */
function landPoints(lane: SeaLane): string[] {
  const onLand: string[] = []
  const step = (0.25 * Math.PI) / 180
  const path = makePath(lane.waypoints, lane.loop)
  const ports = lane.ports.map((p) => lane.waypoints[p.at])
  const steps = Math.ceil(path.length / step)
  for (let k = 0; k <= steps; k++) {
    const at = vector3ToLatLon(pointAt(path, k / steps))
    if (ports.some((p) => distanceKm(p, at) < 150)) continue
    if (!isSea(at))
      onLand.push(`${lane.id} ${at.lat.toFixed(2)},${at.lon.toFixed(2)}`)
  }
  return onLand
}

describe('항로 데이터', () => {
  it('육지 격자 방향: 태평양 한가운데는 바다, 사하라는 육지', () => {
    expect(isSea({ lat: 0, lon: -150 })).toBe(true)
    expect(isSea({ lat: 23, lon: 13 })).toBe(false)
  })

  it('여객기 노선의 양 끝은 모두 도시 지점이고 id가 겹치지 않는다', () => {
    for (const route of FLIGHT_ROUTES) {
      expect(getSite(route.from)?.kind, route.id).toBe('city')
      expect(getSite(route.to)?.kind, route.id).toBe('city')
    }
    const ids = FLIGHT_ROUTES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('기항지는 도시 지점이고 꼭짓점 번호가 범위 안에 있다', () => {
    for (const lane of SEA_LANES)
      for (const port of lane.ports) {
        expect(getSite(port.cityId)?.kind, lane.id).toBe('city')
        expect(port.at, lane.id).toBeLessThan(lane.waypoints.length)
      }
  })

  it('바닷길은 기항지 150km 안을 빼고 모두 바다 위로 지난다', () => {
    expect(SEA_LANES.flatMap(landPoints)).toEqual([])
  })

  it('육지를 가로지르는 바닷길은 잡아낸다 (혼슈 횡단)', () => {
    const across: SeaLane = {
      id: 'across-honshu',
      kind: 'cruise',
      waypoints: [
        { lat: 37.5, lon: 136.0 },
        { lat: 35.5, lon: 141.5 },
      ],
      loop: false,
      ports: [],
      ships: 1,
    }
    expect(landPoints(across).length).toBeGreaterThan(3)
  })
})
