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
