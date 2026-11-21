import {
  EARTH_RADIUS_KM,
  circularSpeed,
  displayRadius,
  ellipseFromAltitudes,
  geostationaryRadius,
  orbitState,
  orbitalPeriod,
  radiusOf,
  solveKepler,
  subPoint,
  sunSynchronousInclination,
  toScene,
} from './orbit'
import { SATELLITES } from './satellites'
import { latLonToVector3 } from '@/shared/lib'
import type { Vec3 } from '@/shared/lib'

const minutes = (s: number) => s / 60
const hours = (s: number) => s / 3600

describe('궤도 주기와 고도', () => {
  it('저궤도 ISS(420km)는 약 93분에 한 바퀴', () => {
    expect(minutes(orbitalPeriod(EARTH_RADIUS_KM + 420))).toBeCloseTo(92.8, 0)
  })

  it('저궤도는 300~2,000km에서 주기 90~128분', () => {
    expect(minutes(orbitalPeriod(EARTH_RADIUS_KM + 300))).toBeGreaterThan(90)
    expect(minutes(orbitalPeriod(EARTH_RADIUS_KM + 2000))).toBeLessThan(128)
  })

  it('정지궤도는 고도 35,786km, 주기가 항성일(23시간 56분)', () => {
    const a = geostationaryRadius()
    expect(a - EARTH_RADIUS_KM).toBeCloseTo(35_786, -1)
    expect(orbitalPeriod(a)).toBeCloseTo(86_164.1, -1)
  })

  it('GPS(20,180km)는 약 11시간 58분, 갈릴레오(23,222km)는 약 14시간 5분', () => {
    expect(hours(orbitalPeriod(EARTH_RADIUS_KM + 20_180))).toBeCloseTo(11.97, 1)
    expect(hours(orbitalPeriod(EARTH_RADIUS_KM + 23_222))).toBeCloseTo(14.08, 1)
  })

  it('몰니야 궤도는 이심률 약 0.74, 주기 약 12시간', () => {
    const { aKm, e } = ellipseFromAltitudes(600, 39_700)
    expect(e).toBeCloseTo(0.74, 2)
    expect(hours(orbitalPeriod(aKm))).toBeCloseTo(11.97, 0)
  })

  it('태양동기궤도 경사각: 705km는 약 98.2°, 500km는 약 97.4°', () => {
    expect(sunSynchronousInclination(705)).toBeCloseTo(98.2, 1)
    expect(sunSynchronousInclination(500)).toBeCloseTo(97.4, 1)
  })

  it('원궤도 속도: 420km에서 약 7.66km/s', () => {
    expect(circularSpeed(EARTH_RADIUS_KM + 420)).toBeCloseTo(7.66, 2)
  })
})

describe('케플러 운동', () => {
  it('케플러 방정식을 푼다 (이심률이 커도)', () => {
    for (const e of [0, 0.1, 0.74, 0.95])
      for (const M of [0.1, 1, 3, 5.5]) {
        const E = solveKepler(M, e)
        expect(E - e * Math.sin(E)).toBeCloseTo(M, 9)
      }
  })

  it('원궤도 위성은 늘 같은 고도이고 한 주기 뒤 제자리로', () => {
    const iss = SATELLITES.find((s) => s.id === 'iss')!
    const T = orbitalPeriod(iss.elements.aKm)
    const a = orbitState(iss.elements, 0).position.slice()
    const half = orbitState(iss.elements, T / 2).position
    expect(radiusOf(half) - EARTH_RADIUS_KM).toBeCloseTo(420, 3)
    const back = orbitState(iss.elements, T).position
    for (let i = 0; i < 3; i++) expect(back[i]).toBeCloseTo(a[i], 3)
  })

  it('몰니야 위성은 원지점에서 느리고 북반구 높이 머문다', () => {
    const sat = SATELLITES.find((s) => s.id === 'molniya-1')!
    const T = orbitalPeriod(sat.elements.aKm)
    // 평균 근점 이각 180°(원지점)
    const t = ((180 - sat.elements.meanAnomalyDeg) / 360) * T
    const s = orbitState(sat.elements, t)
    expect(radiusOf(s.position) - EARTH_RADIUS_KM).toBeCloseTo(39_700, -1)
    expect(subPoint(s.position, t).lat).toBeCloseTo(63.4, 0)
    expect(radiusOf(s.velocity)).toBeLessThan(1.6)
  })

  it('정지궤도 위성은 지구가 돌아도 같은 경도 위에 있다', () => {
    const gk2a = SATELLITES.find((s) => s.id === 'gk2a')!
    for (const t of [0, 3600, 40_000]) {
      const p = subPoint(orbitState(gk2a.elements, t).position, t)
      expect(p.lat).toBeCloseTo(0, 6)
      expect(p.lon).toBeCloseTo(128.2, 3)
    }
  })

  it('장면 좌표는 latLonToVector3와 같은 방향', () => {
    const gk2a = SATELLITES.find((s) => s.id === 'gk2a')!
    const out: Vec3 = [0, 0, 0]
    toScene(orbitState(gk2a.elements, 500).position, 500, 1, out)
    const want = latLonToVector3({ lat: 0, lon: 128.2 })
    for (let i = 0; i < 3; i++) expect(out[i]).toBeCloseTo(want[i], 5)
  })

  it('화면 고도는 로그 눈금으로 줄이되 순서는 지킨다', () => {
    const leo = displayRadius(420)
    const meo = displayRadius(20_180)
    const geo = displayRadius(35_786)
    expect(leo).toBeGreaterThan(1.05)
    expect(leo).toBeLessThan(meo)
    expect(meo).toBeLessThan(geo)
    expect(geo).toBeLessThan(1.55)
  })
})

describe('위성 목록', () => {
  it('id가 겹치지 않고 군사·민간이 모두 있다', () => {
    const ids = SATELLITES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(SATELLITES.some((s) => s.use === 'military')).toBe(true)
    expect(SATELLITES.some((s) => s.use === 'civil')).toBe(true)
  })

  it('궤도 종류와 고도가 맞는다', () => {
    for (const sat of SATELLITES) {
      const { aKm, e } = sat.elements
      const perigee = aKm * (1 - e) - EARTH_RADIUS_KM
      const apogee = aKm * (1 + e) - EARTH_RADIUS_KM
      const T = hours(orbitalPeriod(aKm))
      switch (sat.orbit) {
        case 'leo':
        case 'sso':
          expect(perigee, sat.id).toBeGreaterThanOrEqual(300)
          expect(apogee, sat.id).toBeLessThanOrEqual(2000)
          if (sat.orbit === 'sso')
            expect(sat.elements.iDeg, sat.id).toBeGreaterThan(96)
          break
        case 'meo':
          expect(T, sat.id).toBeGreaterThan(11)
          expect(T, sat.id).toBeLessThan(15)
          break
        case 'geo':
          expect(T, sat.id).toBeCloseTo(23.93, 1)
          expect(sat.elements.iDeg, sat.id).toBe(0)
          break
        case 'molniya':
          expect(e, sat.id).toBeGreaterThan(0.7)
          expect(sat.elements.iDeg, sat.id).toBeCloseTo(63.4, 1)
          break
      }
    }
  })
})
