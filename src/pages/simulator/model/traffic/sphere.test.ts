import { distanceKm, kmToRadians, latLonToVector3 } from '@/shared/lib'
import type { LatLon, Vec3 } from '@/shared/lib'
import {
  detourAround,
  headingAt,
  makePath,
  nearestOnPath,
  peakLatitude,
  peakPoint,
  pointAt,
} from './sphere'

function expectVec(actual: Vec3, expected: Vec3, eps = 1e-6) {
  for (let i = 0; i < 3; i++)
    expect(Math.abs(actual[i] - expected[i])).toBeLessThan(eps)
}

const INCHEON: LatLon = { lat: 37.46, lon: 126.71 }
const LA: LatLon = { lat: 34.05, lon: -118.24 }
const NEW_YORK: LatLon = { lat: 40.71, lon: -74.01 }

describe('구면 경로', () => {
  it('s=0과 s=1은 양 끝점이다', () => {
    const path = makePath([INCHEON, LA])
    expectVec(pointAt(path, 0), latLonToVector3(INCHEON))
    expectVec(pointAt(path, 1), latLonToVector3(LA))
  })

  it('가운데 점은 대권 위에 있다 (적도 0°→90°의 가운데는 45°)', () => {
    const path = makePath([
      { lat: 0, lon: 0 },
      { lat: 0, lon: 90 },
    ])
    expectVec(pointAt(path, 0.5), latLonToVector3({ lat: 0, lon: 45 }))
  })

  it('길이는 구간 중심각의 합이고 s는 길이 비율이다', () => {
    const a = { lat: 0, lon: 0 }
    const b = { lat: 0, lon: 30 }
    const c = { lat: 0, lon: 90 }
    const path = makePath([a, b, c])
    expect(path.length).toBeCloseTo(
      kmToRadians(distanceKm(a, b) + distanceKm(b, c)),
      6,
    )
    // 전체 90° 중 30° 지점
    expectVec(pointAt(path, 1 / 3), latLonToVector3(b))
  })

  it('고리 경로는 s=1에서 처음 자리로 돌아온다', () => {
    const path = makePath(
      [
        { lat: 10, lon: 130 },
        { lat: 10, lon: 135 },
        { lat: 15, lon: 135 },
      ],
      true,
    )
    expectVec(pointAt(path, 1), latLonToVector3({ lat: 10, lon: 130 }))
  })

  it('진행 방향은 다음 꼭짓점 쪽 접선이다', () => {
    const path = makePath([
      { lat: 0, lon: 0 },
      { lat: 0, lon: 90 },
    ])
    expectVec(headingAt(path, 0), latLonToVector3({ lat: 0, lon: 90 }))
  })

  it('경로에서 가장 가까운 거리와 그 위치를 찾는다', () => {
    const path = makePath([
      { lat: 0, lon: 0 },
      { lat: 0, lon: 90 },
    ])
    const near = nearestOnPath(path, { lat: 10, lon: 45 })
    expect(near.km).toBeCloseTo(
      distanceKm({ lat: 10, lon: 45 }, { lat: 0, lon: 45 }),
      3,
    )
    expect(near.s).toBeCloseTo(0.5, 6)
  })

  it('경로 바깥쪽 점은 가까운 끝점까지 거리를 잰다', () => {
    const path = makePath([
      { lat: 0, lon: 0 },
      { lat: 0, lon: 90 },
    ])
    const near = nearestOnPath(path, { lat: 0, lon: -20 })
    expect(near.km).toBeCloseTo(
      distanceKm({ lat: 0, lon: -20 }, { lat: 0, lon: 0 }),
      3,
    )
    expect(near.s).toBe(0)
  })

  it('최고 위도: 인천→뉴욕 대권은 북위 60°를 넘고 적도 경로는 0°', () => {
    expect(peakLatitude(makePath([INCHEON, NEW_YORK]))).toBeGreaterThan(60)
    expect(
      peakLatitude(
        makePath([
          { lat: 0, lon: 0 },
          { lat: 0, lon: 90 },
        ]),
      ),
    ).toBeCloseTo(0, 6)
  })

  it('최고 위도 지점의 경도도 알려 준다 (대칭 경로는 가운데)', () => {
    const peak = peakPoint(
      makePath([
        { lat: 50, lon: -10 },
        { lat: 50, lon: 10 },
      ]),
    )
    expect(peak.lon).toBeCloseTo(0, 1)
    expect(peak.lat).toBeGreaterThan(50)
  })

  it('우회점을 지나는 경로는 원 밖으로 지난다', () => {
    const a = { lat: 0, lon: 0 }
    const b = { lat: 0, lon: 60 }
    const center = { lat: 1, lon: 30 }
    const via = detourAround(a, b, center, 800)
    expect(nearestOnPath(makePath([a, via, b]), center).km).toBeGreaterThan(800)
  })

  it('끝점이 원에 가까워도 우회 경로는 원 밖으로 지난다', () => {
    const a = { lat: 0, lon: 0 }
    const b = { lat: 0, lon: 60 }
    const center = { lat: 2, lon: 10 }
    expect(distanceKm(a, center)).toBeGreaterThan(900)
    const via = detourAround(a, b, center, 900)
    expect(nearestOnPath(makePath([a, via, b]), center).km).toBeGreaterThan(900)
  })
})
