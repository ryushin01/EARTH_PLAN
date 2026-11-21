import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { distanceKm, kmToRadians, vector3ToLatLon } from '@/shared/lib'
import type { LatLon } from '@/shared/lib'
import { newPose } from '../traffic/motion'
import {
  DISPLAY,
  KNOT_MS,
  destination,
  fleetGroup,
  flightGroup,
  groupDrill,
  groupPoses,
  groupProgress,
  machToMs,
  racetrackPoints,
  satelliteNow,
  satellitePose,
  speedOfSound,
} from './motion'
import { displayRadius } from './orbit'
import { SATELLITES } from './satellites'
import { AIRCRAFT, FLEETS, FLIGHTS, SHIPS } from './units'

// 침수 계산용 512×256 격자: 첫 줄이 북위 90°, 첫 칸이 서경 180°, 0이면 바다
const grid = readFileSync(resolve('public/textures/land-elevation-512x256.u8'))
function isSea({ lat, lon }: LatLon): boolean {
  const row = Math.min(255, Math.max(0, Math.floor(((90 - lat) / 180) * 256)))
  const col = (((Math.floor(((lon + 180) / 360) * 512) % 512) + 512) % 512) | 0
  return grid[row * 512 + col] === 0
}

describe('현실 단위', () => {
  it('고도 10km 음속은 약 299m/s, 마하 0.85는 약 917km/h', () => {
    expect(speedOfSound(10)).toBeCloseTo(299.5, 0)
    expect(machToMs(0.85, 10) * 3.6).toBeCloseTo(917, -1)
  })

  it('편대는 마하 0.8~0.9, 고도 9~12km로 순항한다', () => {
    for (const f of FLIGHTS) {
      expect(f.mach, f.id).toBeGreaterThanOrEqual(0.8)
      expect(f.mach, f.id).toBeLessThanOrEqual(0.9)
      expect(f.altitudeKm, f.id).toBeGreaterThanOrEqual(9)
      expect(f.altitudeKm, f.id).toBeLessThanOrEqual(12)
    }
  })

  it('함대는 20~30노트로 항해한다', () => {
    for (const f of FLEETS) {
      expect(f.knots, f.id).toBeGreaterThanOrEqual(20)
      expect(f.knots, f.id).toBeLessThanOrEqual(30)
    }
    expect(25 * KNOT_MS).toBeCloseTo(12.86, 2)
  })

  it('함종 길이 순서: 항공모함 > 전함 > 순양함 > 구축함 > 호위함 > 잠수함', () => {
    const order = [
      'carrier',
      'battleship',
      'cruiser',
      'destroyer',
      'frigate',
      'submarine',
    ] as const
    for (let k = 1; k < order.length; k++)
      expect(SHIPS[order[k - 1]].lengthM).toBeGreaterThan(
        SHIPS[order[k]].lengthM,
      )
    expect(Object.keys(AIRCRAFT)).toHaveLength(4)
  })

  it('화면 1초에 실제 속도 × 시간 압축만큼 경로를 간다', () => {
    const group = flightGroup(FLIGHTS[0])
    const km =
      (machToMs(FLIGHTS[0].mach, FLIGHTS[0].altitudeKm) *
        DISPLAY.timeScale.air) /
      1000
    const ds = groupProgress(group, 1) - groupProgress(group, 0)
    expect(ds * group.lapKm).toBeCloseTo(km, 3)
  })
})

describe('경주로 훈련 경로', () => {
  it('destination은 주어진 거리만큼 떨어진 지점', () => {
    const from = { lat: 30, lon: 150 }
    expect(distanceKm(from, destination(from, 45, 500))).toBeCloseTo(500, 0)
  })

  it('경주로 둘레 = 직선 둘 + 원 하나 (다각형 근사 1% 안)', () => {
    const track = FLEETS[0].track
    const want = 2 * track.straightKm + 2 * Math.PI * track.turnKm
    expect(fleetGroup(FLEETS[0]).lapKm / want).toBeCloseTo(1, 1)
    expect(racetrackPoints(track).length).toBe(26)
  })

  it('함대는 어느 진형에서든 모든 배가 바다 위에 있다', () => {
    const poses = Array.from({ length: 8 }, newPose)
    FLEETS.forEach((fleet, index) => {
      const group = fleetGroup(fleet, index)
      const lap = (group.lapKm * 1000) / group.speedMs / group.timeScale
      for (let t = 0; t < lap; t += lap / 120) {
        const n = groupPoses(group, t, poses)
        for (let k = 0; k < n; k++) {
          const at = vector3ToLatLon(poses[k].position)
          expect(
            isSea(at),
            `${fleet.id} ${at.lat.toFixed(1)},${at.lon.toFixed(1)}`,
          ).toBe(true)
        }
      }
    })
  })
})

describe('대형 자리 (화면)', () => {
  it('편대장과 윙맨 사이는 실제 간격 × 대형 과장 배율', () => {
    const group = flightGroup(FLIGHTS[0])
    const poses = Array.from({ length: 4 }, newPose)
    // 시각 1: 첫 대형(핑거 포)을 유지하는 중
    expect(groupDrill(group, 1).from).toBe('finger-four')
    groupPoses(group, 1, poses)
    const a = vector3ToLatLon(poses[0].position)
    const b = vector3ToLatLon(poses[1].position)
    const want = Math.SQRT2 * 1 * DISPLAY.formationSpread
    expect(distanceKm(a, b)).toBeCloseTo(want, -1)
    expect(Math.hypot(...poses[0].position)).toBeCloseTo(1 + 0.0022 * 11, 6)
  })

  it('자세의 앞·위 방향은 서로 수직인 단위 벡터', () => {
    const poses = Array.from({ length: 7 }, newPose)
    groupPoses(fleetGroup(FLEETS[0]), 33, poses)
    for (const p of poses) {
      expect(Math.hypot(...p.forward)).toBeCloseTo(1)
      expect(Math.hypot(...p.up)).toBeCloseTo(1)
      expect(
        p.forward[0] * p.up[0] +
          p.forward[1] * p.up[1] +
          p.forward[2] * p.up[2],
      ).toBeCloseTo(0)
    }
  })

  it('위성 자세는 화면 고도에, 속도는 궤도 속도', () => {
    const iss = SATELLITES.find((s) => s.id === 'iss')
    if (!iss) throw new Error('ISS 없음')
    const pose = satellitePose(iss, 100, newPose())
    expect(Math.hypot(...pose.position)).toBeCloseTo(displayRadius(420), 4)
    expect(satelliteNow(iss, 100).speedKms).toBeCloseTo(7.66, 2)
    expect(kmToRadians(6371)).toBe(1)
  })
})
