import { TODAY_DATA } from '@/shared/config'
import { isTodayData } from '../model/today/today'
import type { TodayData } from '../model/today/today'

/** 사이트에 넣은 오늘의 지구 자료를 읽습니다. 받지 못했거나 모양이 다르면 null */
export async function loadToday(
  signal?: AbortSignal,
): Promise<TodayData | null> {
  try {
    const response = await fetch(TODAY_DATA, { signal })
    if (!response.ok) return null
    const json: unknown = await response.json()
    return isTodayData(json) ? json : null
  } catch {
    return null
  }
}

/**
 * 사이트 안 자료 파일도 받지 못할 때(서비스 워커 캐시도 없이 오프라인 등) 쓰는 대체 자료.
 * 코드 묶음에 넣어 둔 스냅숏(저장소에 커밋한 때의 USGS·NOAA 자료)이며, 필요할 때만 따로 받습니다
 */
export async function loadTodaySnapshot(): Promise<TodayData | null> {
  try {
    const json: unknown = (await import('./today-snapshot.json')).default
    return isTodayData(json) ? json : null
  } catch {
    return null
  }
}
