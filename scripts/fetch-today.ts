/**
 * 오늘의 지구 자료(public/data/today.json)를 받아 씁니다. Pages 배포 때(매일 예약 실행 포함) 빌드 전에 돌립니다.
 * - USGS: 지난 7일 규모 4.5 이상 지진
 * - NOAA SWPC: 3시간 간격 지자기 Kp (최근 7일)
 * 받지 못하거나 응답이 이상하면 저장소에 있는 마지막 자료를 그대로 두고 성공으로 끝냅니다(배포가 멈추지 않게).
 * 방문자 브라우저는 외부 API를 부르지 않고 이 파일만 읽으므로, API가 멈추거나 오프라인이어도 마지막 자료가 보입니다.
 *
 * 사용법: node scripts/fetch-today.ts [출력 경로]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parseKp, parseUsgs } from '../src/pages/simulator/model/today/today.ts'
import type { TodayData } from '../src/pages/simulator/model/today/today.ts'

export const SOURCES = {
  quakes:
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson',
  kp: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
} as const

/** 3시간 간격 Kp 7일치 */
const KP_READINGS = 7 * 8

type Fetch = typeof fetch

export async function fetchToday(
  fetchImpl: Fetch = fetch,
  now = new Date(),
): Promise<TodayData | null> {
  const get = async (url: string): Promise<unknown> => {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(20_000),
      headers: { 'User-Agent': 'TerraNova static site build' },
    })
    if (!response.ok) throw new Error(`${url}: ${response.status}`)
    return response.json()
  }
  try {
    const [usgs, kpJson] = await Promise.all([
      get(SOURCES.quakes),
      get(SOURCES.kp),
    ])
    const quakes = parseUsgs(usgs)
    const kp = parseKp(kpJson)
    // 한 주에 규모 4.5 이상 지진이 하나도 없거나 Kp가 비면 응답이 잘못된 것으로 봄
    if (quakes.length === 0 || kp.length === 0) return null
    return {
      fetchedAt: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      quakes,
      kp: kp.slice(-KP_READINGS),
    }
  } catch {
    return null
  }
}

export async function updateToday(
  outFile: string,
  fetchImpl: Fetch = fetch,
  now = new Date(),
): Promise<boolean> {
  const data = await fetchToday(fetchImpl, now)
  if (!data) {
    console.warn('오늘의 지구 자료를 받지 못해 마지막 자료를 그대로 둡니다')
    return false
  }
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, `${JSON.stringify(data)}\n`)
  console.log(
    `오늘의 지구: 지진 ${data.quakes.length}회, Kp ${data.kp.at(-1)?.kp} (${data.fetchedAt})`,
  )
  return true
}

if (import.meta.main)
  await updateToday(resolve(process.argv[2] ?? 'public/data/today.json'))
