import { both, compose, nameList } from '../text'
import type { Text } from '../text'
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
  detail: Text
}

export interface Mission {
  id: string
  title: Text
  brief: Text
  goal: Text
  scenario: ScenarioId
  budget: number
  endYear: number
  /** 정해진 해에 일어나는 재해 */
  schedule: Array<{
    id: string
    year: number
    hazard: ScheduledHazard
    warning: Text
  }>
  evaluate: (state: WorldState) => MissionResult
}

const year = (y: number, month = 1, day = 1) =>
  dateToDecimalYear(new Date(Date.UTC(y, month - 1, day)))

export const MISSIONS: Mission[] = [
  {
    id: 'coast-2100',
    title: both('2100년 해안 지키기', 'Defend the Coasts to 2100'),
    brief: both(
      '빙상이 무너지는 최악의 시나리오입니다. 예산은 $400B뿐이라 태풍이 자주 오는 도시부터 골라 막아야 합니다. 아무것도 하지 않으면 해일 피해가 1,000번을 넘습니다.',
      'The worst case: the ice sheets collapse. With only $400B, protect the cities typhoons hit most. Do nothing and storm surges strike over 1,000 times.',
    ),
    goal: both(
      '2100년까지 열대 저기압 해일 큰 피해 120회 이하, 침수 도시 0곳',
      'By 2100: at most 120 damaging storm surges and no flooded cities',
    ),
    scenario: 'extreme',
    budget: 400,
    endYear: year(2100),
    schedule: [],
    evaluate: (state) => {
      const flooded = state.floodedCityIds.length
      return {
        ok: state.stormDamage <= 120 && flooded === 0,
        detail: both(
          `해일 큰 피해 ${state.stormDamage}회 / 120회 · 침수 도시 ${flooded}곳 / 0곳`,
          `Storm surge damage ${state.stormDamage} / 120 · Flooded cities ${flooded} / 0`,
        ),
      }
    },
  },
  {
    id: 'ice-2150',
    title: both('빙상 붕괴 대응 2150', 'Ice-Sheet Collapse 2150'),
    brief: both(
      '2150년이면 해수면이 4m 가까이 오릅니다. 빙하 커튼·우주 차양으로 속도를 늦추고 방조제·해협 댐으로 도시를 지키세요.',
      'By 2150 the sea rises almost 4 m. Slow it with glacier curtains and the sunshade, and guard cities with sea walls and strait dams.',
    ),
    goal: both(
      '2150년에 해수면 3m 미만, 침수 도시 3곳 이하',
      'In 2150: sea level under 3 m and at most 3 flooded cities',
    ),
    scenario: 'extreme',
    budget: 1500,
    endYear: year(2150),
    schedule: [],
    evaluate: (state) => {
      const flooded = state.floodedCityIds.length
      return {
        ok: state.seaLevel < 3 && flooded <= 3,
        detail: both(
          `해수면 +${state.seaLevel.toFixed(2)}m / 3m 미만 · 침수 도시 ${flooded}곳 / 3곳 이하`,
          `Sea level +${state.seaLevel.toFixed(2)} m / under 3 m · Flooded cities ${flooded} / 3 or fewer`,
        ),
      }
    },
  },
  {
    id: 'asteroid-2032',
    title: both('2032년 소행성 막기', 'Stop the 2032 Asteroid'),
    brief: both(
      '지름 340m 소행성이 2032년 6월 도쿄에 떨어질 궤도입니다. 시간이 많지 않습니다.',
      'A 340 m asteroid is on course to hit Tokyo in June 2032. Time is short.',
    ),
    goal: both(
      '충돌 전에 막아 피해 도시 0곳',
      'Stop it before impact: no damaged cities',
    ),
    scenario: 'mid',
    budget: 1500,
    endYear: year(2032, 7),
    schedule: [
      {
        id: 'apophis',
        year: year(2032, 6, 1),
        hazard: { kind: 'impact', targetId: 'tokyo', diameterM: 340 },
        warning: both(
          '지름 340m 소행성이 도쿄에 다가옵니다.',
          'A 340 m asteroid is approaching Tokyo.',
        ),
      },
    ],
    evaluate: (state) => {
      const impact = state.impacts.find((i) => i.targetId === 'tokyo')
      const damaged = impact ? impact.affectedCityIds.length : 0
      return {
        ok: impact !== undefined && impact.effectiveDiameterM === 0,
        detail: !impact
          ? both('아직 충돌 전입니다.', 'Impact has not happened yet.')
          : impact.effectiveDiameterM === 0
            ? both('소행성을 빗나가게 했습니다.', 'The asteroid was deflected.')
            : compose((l) =>
                l === 'ko'
                  ? `피해 도시 ${damaged}곳 (${nameList(impact.affectedCityIds, l)})`
                  : `${damaged} cities damaged (${nameList(impact.affectedCityIds, l)})`,
              ),
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
