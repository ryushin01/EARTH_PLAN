import { ashRadiusKm } from './engine'
import type { Eruption, SolarStorm } from './types'

/**
 * 재해가 화면에서 얼마나 보이는지. 셰이더와 운항 규칙이 같은 기준을 씁니다.
 * 화면 시간(실제 초)과 시뮬레이션 시간 중 먼저 끝나는 쪽에서 사라집니다.
 */

/**
 * 화산재 구름: 화면 40초 동안 짙다가 20초에 걸쳐, 시뮬레이션으로는 3년에 걸쳐 옅어짐.
 * 반지름은 화면 4.8초 동안 20%에서 다 퍼짐. 다 사라졌으면 null.
 */
export function ashCloud(
  e: Eruption,
  year: number,
  nowMs: number,
): { radiusKm: number; amount: number } | null {
  const age = Math.max(0, (nowMs - e.startedAt) / 1000)
  const realFade = age < 40 ? 1 : Math.max(0, 1 - (age - 40) / 20)
  const simFade = Math.max(0, 1 - (year - e.year) / 3)
  const amount = 0.85 * Math.min(realFade, simFade)
  if (amount <= 0) return null
  return {
    radiusKm: ashRadiusKm(e.vei) * Math.min(1, 0.2 + age / 6),
    amount,
  }
}

/**
 * 태양 폭풍 세기(0~1): 2초에 걸쳐 밝아져 30초 동안 유지되고 20초에 걸쳐 사라짐.
 * 실제 폭풍은 며칠이므로 시뮬레이션 시간으로 약 11일(0.03년)이 지나도 사라짐.
 */
export function solarFade(s: SolarStorm, year: number, nowMs: number): number {
  const age = Math.max(0, (nowMs - s.startedAt) / 1000)
  const realFade =
    age < 30 ? Math.min(1, age / 2) : Math.max(0, 1 - (age - 30) / 20)
  const simFade = Math.max(0, 1 - (year - s.year) / 0.03)
  return Math.max(0, Math.min(realFade, simFade))
}
