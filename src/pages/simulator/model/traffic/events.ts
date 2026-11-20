import { compose, num } from '../text'
import type { Text } from '../text'
import type { TrafficSummary } from './summary'

/**
 * 재해 전후 운항 요약을 비교해, 늘어난 우회·결항·대기와 새 발사 보류를 한 문장으로.
 * 재해 기록 끝에 붙여 사건 알림(3초 단위로 묶음)으로 함께 읽히게 함
 */
export function trafficImpactText(
  before: TrafficSummary,
  after: TrafficSummary,
): Text | null {
  const rerouted = Math.max(0, after.rerouted - before.rerouted)
  const cancelled = Math.max(0, after.cancelled - before.cancelled)
  const waiting = Math.max(0, after.waiting - before.waiting)
  const launch = after.launchHold && !before.launchHold
  if (!rerouted && !cancelled && !waiting && !launch) return null
  return compose((l) => {
    const parts: string[] = []
    if (l === 'ko') {
      const flights = [
        rerouted && `우회 ${num(rerouted, l)}편`,
        cancelled && `결항 ${num(cancelled, l)}편`,
      ].filter(Boolean)
      if (flights.length) parts.push(`여객기 ${flights.join(' · ')}`)
      if (waiting) parts.push(`선박 대기 ${num(waiting, l)}척`)
      if (launch) parts.push('우주왕복선 발사 보류')
      return `운항 영향: ${parts.join(', ')}.`
    }
    const plural = (n: number, word: string) =>
      `${num(n, l)} ${word}${n === 1 ? '' : 's'}`
    const flights: string[] = []
    if (rerouted) flights.push(`${plural(rerouted, 'flight')} rerouted`)
    if (cancelled)
      flights.push(
        rerouted
          ? `${num(cancelled, l)} cancelled`
          : `${plural(cancelled, 'flight')} cancelled`,
      )
    if (flights.length) parts.push(flights.join(' · '))
    if (waiting) parts.push(`${plural(waiting, 'ship')} holding`)
    if (launch) parts.push('shuttle launch on hold')
    return `Traffic: ${parts.join(', ')}.`
  })
}
