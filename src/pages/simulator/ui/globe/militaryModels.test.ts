import type { BufferGeometry } from 'three'
import { AIRCRAFT, SHIPS } from '../../model/military/units'
import type { AircraftType, ShipClass } from '../../model/military/units'
import type { SatelliteModel } from '../../model/military/satellites'
import { buildAircraft, buildSatellite, buildShip } from './militaryModels'

const size = (g: BufferGeometry) => {
  g.computeBoundingBox()
  const box = g.boundingBox
  if (!box) throw new Error('범위 없음')
  return {
    x: box.max.x - box.min.x,
    y: box.max.y - box.min.y,
    z: box.max.z - box.min.z,
  }
}

const signature = (g: BufferGeometry) => {
  const s = size(g)
  return `${g.getAttribute('position').count}:${s.x.toFixed(3)}:${s.y.toFixed(3)}`
}

describe('군사·위성 모형', () => {
  const aircraft = Object.keys(AIRCRAFT) as AircraftType[]
  const ships = Object.keys(SHIPS) as ShipClass[]
  const sats: SatelliteModel[] = [
    'station',
    'telescope',
    'bus',
    'geo',
    'recon',
    'nav',
  ]

  it('모든 모형이 정점 색을 가진 하나의 도형이고 길이가 약 1', () => {
    for (const g of [
      ...aircraft.map(buildAircraft),
      ...ships.map(buildShip),
      ...sats.map(buildSatellite),
    ]) {
      expect(g.getAttribute('position').count).toBeGreaterThan(30)
      expect(g.getAttribute('color')).toBeDefined()
      const s = size(g)
      expect(Math.max(s.x, s.z)).toBeGreaterThan(0.6)
      expect(Math.max(s.x, s.y, s.z)).toBeLessThan(1.4)
    }
  })

  it('전투기는 앞(+Z)으로 길고, 세대마다 실루엣이 다르다', () => {
    const shapes = aircraft.map((type) => {
      const g = buildAircraft(type)
      expect(size(g).z, type).toBeGreaterThan(size(g).x)
      return signature(g)
    })
    expect(new Set(shapes).size).toBe(aircraft.length)
  })

  it('5세대 스텔스기는 바깥으로 기운 꼬리날개 때문에 4세대 쌍발기보다 꼬리 폭이 넓고 외부 무장이 없다', () => {
    const tailWidth = (g: BufferGeometry) => {
      const p = g.getAttribute('position')
      let max = 0
      for (let i = 0; i < p.count; i++)
        if (p.getY(i) > 0.12) max = Math.max(max, Math.abs(p.getX(i)))
      return max
    }
    expect(tailWidth(buildAircraft('gen5'))).toBeGreaterThan(
      tailWidth(buildAircraft('gen4-heavy')),
    )
    // 외부 무장(날개 밑으로 처진 연료통)이 없어 동체 아래로 덜 내려옴
    const lowest = (g: BufferGeometry) => {
      const p = g.getAttribute('position')
      let min = 0
      for (let i = 0; i < p.count; i++)
        if (Math.abs(p.getX(i)) > 0.2) min = Math.min(min, p.getY(i))
      return min
    }
    expect(lowest(buildAircraft('gen5'))).toBeGreaterThan(
      lowest(buildAircraft('gen4-heavy')),
    )
  })

  it('함종마다 실루엣이 다르고, 잠수함은 수면 위 구조물이 낮다', () => {
    const shapes = ships.map((kind) => signature(buildShip(kind)))
    expect(new Set(shapes).size).toBe(ships.length)
    expect(size(buildShip('submarine')).y).toBeLessThan(
      size(buildShip('destroyer')).y,
    )
  })

  it('전함은 포신이 많아 순양함·구축함보다 정점이 많다', () => {
    const count = (k: ShipClass) => buildShip(k).getAttribute('position').count
    expect(count('battleship')).toBeGreaterThan(count('cruiser'))
    expect(count('battleship')).toBeGreaterThan(count('destroyer'))
  })
})
