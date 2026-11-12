import { getSite } from '../site/data'
import { dateToDecimalYear } from '@/shared/lib'
import type { ScenarioId } from './scenario'
import type { WorldState } from './types'

export type ScheduledHazard =
  | { kind: 'impact'; targetId: string; diameterM: number }
  | { kind: 'tsunami'; sourceId: string; magnitude: number }
  | { kind: 'eruption'; volcanoId: string; vei: number }

export interface MissionResult {
  ok: boolean
  /** 목표 대비 지금 상태 (진행 중 표시와 최종 판정에 함께 씀) */
  detail: string
}

export interface Mission {
  id: string
  title: string
  brief: string
  goal: string
  scenario: ScenarioId
  budget: number
  endYear: number
  /** 정해진 해에 일어나는 재해 */
  schedule: Array<{
    id: string
    year: number
    hazard: ScheduledHazard
    warning: string
  }>
  evaluate: (state: WorldState) => MissionResult
}

const year = (y: number, month = 1, day = 1) =>
  dateToDecimalYear(new Date(Date.UTC(y, month - 1, day)))

export const MISSIONS: Mission[] = [
  {
    id: 'coast-2100',
    title: '2100년 해안 지키기',
    brief:
      '빙상이 무너지는 최악의 시나리오입니다. 예산은 $400B뿐이라 태풍이 자주 오는 도시부터 골라 막아야 합니다. 아무것도 하지 않으면 해일 피해가 1,000번을 넘습니다.',
    goal: '2100년까지 열대 저기압 해일 큰 피해 120회 이하, 침수 도시 0곳',
    scenario: 'extreme',
    budget: 400,
    endYear: year(2100),
    schedule: [],
    evaluate: (state) => {
      const flooded = state.floodedCityIds.length
      return {
        ok: state.stormDamage <= 120 && flooded === 0,
        detail: `해일 큰 피해 ${state.stormDamage}회 / 120회 · 침수 도시 ${flooded}곳 / 0곳`,
      }
    },
  },
  {
    id: 'ice-2150',
    title: '빙상 붕괴 대응 2150',
    brief:
      '2150년이면 해수면이 4m 가까이 오릅니다. 빙하 커튼·우주 차양으로 속도를 늦추고 방조제·해협 댐으로 도시를 지키세요.',
    goal: '2150년에 해수면 3m 미만, 침수 도시 3곳 이하',
    scenario: 'extreme',
    budget: 1500,
    endYear: year(2150),
    schedule: [],
    evaluate: (state) => {
      const flooded = state.floodedCityIds.length
      return {
        ok: state.seaLevel < 3 && flooded <= 3,
        detail: `해수면 +${state.seaLevel.toFixed(2)}m / 3m 미만 · 침수 도시 ${flooded}곳 / 3곳 이하`,
      }
    },
  },
  {
    id: 'asteroid-2032',
    title: '2032년 소행성 막기',
    brief:
      '지름 340m 소행성이 2032년 6월 도쿄에 떨어질 궤도입니다. 시간이 많지 않습니다.',
    goal: '충돌 전에 막아 피해 도시 0곳',
    scenario: 'mid',
    budget: 1500,
    endYear: year(2032, 7),
    schedule: [
      {
        id: 'apophis',
        year: year(2032, 6, 1),
        hazard: { kind: 'impact', targetId: 'tokyo', diameterM: 340 },
        warning: '지름 340m 소행성이 도쿄에 다가옵니다.',
      },
    ],
    evaluate: (state) => {
      const impact = state.impacts.find((i) => i.targetId === 'tokyo')
      const damaged = impact ? impact.affectedCityIds.length : 0
      return {
        ok: impact !== undefined && impact.effectiveDiameterM === 0,
        detail: impact
          ? impact.effectiveDiameterM === 0
            ? '소행성을 빗나가게 했습니다.'
            : `피해 도시 ${damaged}곳 (${impact.affectedCityIds.map((id) => getSite(id)?.name).join(', ')})`
          : '아직 충돌 전입니다.',
      }
    },
  },
]

export const MISSION_BY_ID = Object.fromEntries(
  MISSIONS.map((m) => [m.id, m]),
) as Record<string, Mission>

export type MissionStatus = 'active' | 'success' | 'failed'

export interface MissionState {
  id: string
  status: MissionStatus
  /** 이미 일어난 예정 재해 */
  firedIds: string[]
}
