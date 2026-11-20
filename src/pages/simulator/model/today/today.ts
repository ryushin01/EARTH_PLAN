/**
 * 오늘의 지구: 배포할 때 받아 사이트에 넣은 실제 기록(USGS 지진, NOAA 지자기 Kp).
 * 방문자 브라우저는 외부 API를 부르지 않아, API가 멈추거나 오프라인이어도 마지막 자료로 보임.
 * scripts/fetch-today.ts가 Node에서 그대로 쓰므로 다른 모듈(경로 별칭 포함)을 가져오지 않음
 */

export interface TodayQuake {
  id: string
  /** 발생 시각 (UTC ms) */
  time: number
  mag: number
  depthKm: number
  lat: number
  lon: number
  /** USGS가 붙인 위치 설명 (영어) */
  place: string
  /** 쓰나미 정보가 나간 지진 */
  tsunami: boolean
}

export interface KpReading {
  /** 3시간 구간의 시작 (UTC, ISO) */
  time: string
  kp: number
}

export interface TodayData {
  /** 자료를 받은 시각 (UTC, ISO) */
  fetchedAt: string
  /** 지난 7일 규모 4.5 이상 지진, 최근 순 */
  quakes: TodayQuake[]
  /** 3시간 간격 지자기 Kp, 오래된 순 */
  kp: KpReading[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const round = (value: number, digits: number) => {
  const f = 10 ** digits
  return Math.round(value * f) / f
}

/** USGS GeoJSON(earthquake.usgs.gov/earthquakes/feed) → 최근 순 지진 */
export function parseUsgs(json: unknown): TodayQuake[] {
  if (!isRecord(json) || !Array.isArray(json.features)) return []
  const quakes: TodayQuake[] = []
  for (const feature of json.features) {
    if (!isRecord(feature) || !isRecord(feature.properties)) continue
    const p = feature.properties
    const coordinates = isRecord(feature.geometry)
      ? feature.geometry.coordinates
      : null
    if (typeof p.mag !== 'number' || typeof p.time !== 'number') continue
    if (!Array.isArray(coordinates) || coordinates.length < 2) continue
    const [lon, lat, depth = 0] = coordinates as unknown[]
    if (
      typeof lon !== 'number' ||
      typeof lat !== 'number' ||
      typeof depth !== 'number' ||
      ![lon, lat, depth].every(Number.isFinite)
    )
      continue
    quakes.push({
      id: String(feature.id ?? p.code ?? quakes.length),
      time: p.time,
      mag: p.mag,
      depthKm: Math.round(depth),
      lat: round(lat, 2),
      lon: round(lon, 2),
      place: typeof p.place === 'string' ? p.place : '',
      tsunami: p.tsunami === 1,
    })
  }
  return quakes.sort((a, b) => b.time - a.time)
}

/** "2026-11-13T00:00:00"·"2024-05-10 21:00:00.000" → "2026-11-13T00:00:00Z" */
function utcTime(tag: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/.exec(tag)
  return m ? `${m[1]}T${m[2]}Z` : null
}

/** NOAA SWPC noaa-planetary-k-index.json → 오래된 순 Kp (객체 배열, 머리줄이 있는 옛 배열 형식 모두) */
export function parseKp(json: unknown): KpReading[] {
  if (!Array.isArray(json)) return []
  const readings: KpReading[] = []
  for (const row of json) {
    let tag: unknown
    let value: unknown
    if (Array.isArray(row)) [tag, value] = row
    else if (isRecord(row)) {
      tag = row.time_tag
      value = row.Kp ?? row.kp
    }
    const time = typeof tag === 'string' ? utcTime(tag) : null
    const kp =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim() !== ''
          ? Number(value)
          : Number.NaN
    if (time && Number.isFinite(kp)) readings.push({ time, kp })
  }
  return readings.sort((a, b) => a.time.localeCompare(b.time))
}

export type KpLevel = 'quiet' | 'active' | 'g1' | 'g2' | 'g3' | 'g4' | 'g5'

/** NOAA 지자기 폭풍 등급. Kp는 1/3 단위(5− = 4.67)로 나오고 5−부터 G1로 봄 */
export function kpLevel(kp: number): KpLevel {
  const band = Math.floor(kp + 0.34)
  if (band >= 9) return 'g5'
  if (band >= 8) return 'g4'
  if (band >= 7) return 'g3'
  if (band >= 6) return 'g2'
  if (band >= 5) return 'g1'
  if (band >= 4) return 'active'
  return 'quiet'
}

/**
 * Kp → 오로라 띠가 내려오는 지자기 위도(°)와 밝기. G3~G5(Kp 7~9)는 태양 폭풍 기능(SOLAR_SPEC)과 같은 값,
 * 조용할 때(Kp 0~3)는 지자기 위도 63~67°의 옅은 띠
 */
const AURORA_BY_KP: ReadonlyArray<{
  kp: number
  lat: number
  strength: number
}> = [
  { kp: 0, lat: 67, strength: 0.25 },
  { kp: 3, lat: 63, strength: 0.3 },
  { kp: 5, lat: 57, strength: 0.45 },
  { kp: 6, lat: 54, strength: 0.52 },
  { kp: 7, lat: 50, strength: 0.6 },
  { kp: 8, lat: 45, strength: 0.75 },
  { kp: 9, lat: 40, strength: 0.9 },
]

export function kpAurora(kp: number): { lat: number; strength: number } {
  const k = Math.min(9, Math.max(0, kp))
  for (let i = 0; i < AURORA_BY_KP.length; i++) {
    const at = AURORA_BY_KP[i]
    if (k > at.kp) continue
    if (i === 0 || k === at.kp) return { lat: at.lat, strength: at.strength }
    const from = AURORA_BY_KP[i - 1]
    const t = (k - from.kp) / (at.kp - from.kp)
    return {
      lat: from.lat + (at.lat - from.lat) * t,
      strength: from.strength + (at.strength - from.strength) * t,
    }
  }
  return { lat: 40, strength: 0.9 }
}

export interface TodaySummary {
  fetchedAt: string
  quakeCount: number
  largest: TodayQuake | undefined
  kpNow: KpReading | undefined
  /** 마지막 Kp 앞 24시간의 최대 */
  kpMax24h: number
}

export function summarizeToday(data: TodayData): TodaySummary {
  const largest = data.quakes.reduce<TodayQuake | undefined>(
    (best, q) => (!best || q.mag > best.mag ? q : best),
    undefined,
  )
  const kpNow = data.kp.at(-1)
  const since = kpNow
    ? Date.parse(kpNow.time) - 24 * 3_600_000
    : Number.POSITIVE_INFINITY
  const kpMax24h = data.kp
    .filter((r) => Date.parse(r.time) > since)
    .reduce((max, r) => Math.max(max, r.kp), 0)
  return {
    fetchedAt: data.fetchedAt,
    quakeCount: data.quakes.length,
    largest,
    kpNow,
    kpMax24h,
  }
}

/** 받은 today.json이 이 앱이 아는 모양인지 */
export function isTodayData(value: unknown): value is TodayData {
  if (!isRecord(value) || typeof value.fetchedAt !== 'string') return false
  if (!Array.isArray(value.quakes) || !Array.isArray(value.kp)) return false
  return (
    value.quakes.every(
      (q) =>
        isRecord(q) &&
        typeof q.id === 'string' &&
        typeof q.time === 'number' &&
        typeof q.mag === 'number' &&
        typeof q.lat === 'number' &&
        typeof q.lon === 'number',
    ) &&
    value.kp.every(
      (r) =>
        isRecord(r) && typeof r.time === 'string' && typeof r.kp === 'number',
    )
  )
}
