import { both, compose, nameList } from '../text'
import type { Text } from '../text'
import { dateToDecimalYear } from '@/shared/lib'
import type { ScenarioId } from './scenario'
import type { SolarLevel, WorldState } from './types'

export type ScheduledHazard =
  | { kind: 'impact'; targetId: string; diameterM: number }
  | { kind: 'tsunami'; sourceId: string; magnitude: number }
  | { kind: 'eruption'; volcanoId: string; vei: number }
  | { kind: 'solar'; level: SolarLevel }

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
    /** 며칠 만에 지나가는 사건: 일어날 때 1일보다 빠르면 1일 속도로 늦춰 보여 줌 */
    slowDown?: boolean
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
        // 잔해 구름은 시뮬레이션 5년에 걸쳐 걷히지만 불덩이는 화면 25초뿐이라, 빠른 속도에서도 충돌 순간을 보이게
        slowDown: true,
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
  {
    id: 'solar-2031',
    title: both('2031년 태양 폭풍 견디기', 'Weather the 2031 Solar Storm'),
    brief: both(
      '2031년 9월, 1859년과 같은 캐링턴급 태양 폭풍이 옵니다. 그 전에 G4·G5 폭풍이 먼저 오고, 폭풍 때마다 극항로 여객기는 남쪽으로 돌고 우주왕복선 발사는 보류됩니다. 변압기가 타면 몇 달씩 정전됩니다.',
      'In September 2031 a Carrington-class solar storm, like the one in 1859, will strike. G4 and G5 storms come first, and each one sends polar flights south and holds shuttle launches. A burned-out transformer means months without power.',
    ),
    goal: both(
      '2031년 10월까지 변압기 손상 도시 0곳, 고장 위성 350기 이하',
      'By October 2031: no burned-out transformers and at most 350 satellites lost',
    ),
    scenario: 'mid',
    budget: 200,
    endYear: year(2031, 10),
    // 날짜는 2024년 5월 10일 폭풍, 2012년 7월 23일 지구를 비껴간 코로나 질량 방출, 1859년 9월 1일 캐링턴 사건에서 따옴.
    // 경보망은 짓는 데 3년이 걸려서, 첫 폭풍(G4)을 겪고 바로 지어도 G5 전에 완공됨
    schedule: [
      {
        id: 'g4-2027',
        year: year(2027, 5, 10),
        hazard: { kind: 'solar', level: 'g4' },
        warning: both(
          'G4 심한 태양 폭풍이 옵니다.',
          'A severe G4 solar storm is coming.',
        ),
        slowDown: true,
      },
      {
        id: 'g5-2030',
        year: year(2030, 7, 23),
        hazard: { kind: 'solar', level: 'g5' },
        warning: both(
          'G5 극심한 태양 폭풍이 옵니다.',
          'An extreme G5 solar storm is coming.',
        ),
        slowDown: true,
      },
      {
        id: 'carrington-2031',
        year: year(2031, 9, 1),
        hazard: { kind: 'solar', level: 'carrington' },
        warning: both(
          '캐링턴급 태양 폭풍이 옵니다.',
          'A Carrington-class solar storm is coming.',
        ),
        slowDown: true,
      },
    ],
    evaluate: (state) => {
      const burned = state.gridDamagedCityIds.length
      const lost = state.satellitesLost
      return {
        ok: burned === 0 && lost <= 350,
        detail: both(
          `변압기 손상 ${burned}곳 / 0곳 · 고장 위성 ${lost}기 / 350기 이하`,
          `Burned-out transformers ${burned} / 0 · Satellites lost ${lost} / 350 or fewer`,
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
