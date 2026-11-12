import {
  decodeSnapshot,
  encodeSnapshot,
  parseSnapshot,
  toSnapshot,
} from './snapshot'
import { useWorld } from './store'

describe('시나리오 저장·공유', () => {
  beforeEach(() => useWorld.getState().reset())

  it('인코딩한 시나리오를 그대로 되돌리고, 불러오면 상태가 같아진다', () => {
    const world = useWorld.getState()
    world.setScenario('high')
    world.setSeaLevel(12.3)
    world.build('strait-dam', 'north-sea', { instant: true })
    world.select('amsterdam')
    const snapshot = toSnapshot(useWorld.getState())
    const code = encodeSnapshot(snapshot)
    expect(code).not.toMatch(/[+/=]/)
    expect(decodeSnapshot(code)).toEqual(snapshot)

    useWorld.getState().reset()
    useWorld.getState().loadSnapshot(snapshot, '테스트')
    const loaded = useWorld.getState()
    expect(loaded.scenario).toBe('high')
    expect(loaded.seaLevel).toBeCloseTo(12.3)
    expect(loaded.structures[0]).toMatchObject({
      kind: 'strait-dam',
      siteId: 'north-sea',
    })
    expect(loaded.floodedCityIds).not.toContain('amsterdam')
    expect(loaded.events[0].text).toContain('테스트 시나리오를 불러왔습니다')
  })

  it('망가지거나 조작된 값은 거부한다', () => {
    expect(decodeSnapshot('not-base64!!')).toBeNull()
    const good = toSnapshot(useWorld.getState())
    expect(parseSnapshot({ ...good, v: 2 })).toBeNull()
    expect(parseSnapshot({ ...good, scenario: 'evil' })).toBeNull()
    expect(parseSnapshot({ ...good, seaLevel: 1e9 })).toBeNull()
    expect(parseSnapshot({ ...good, selectedSiteId: 'nowhere' })).toBeNull()
    expect(
      parseSnapshot({
        ...good,
        structures: [['sea-wall', 'fuji', 2030, 2031]],
      }),
    ).toBeNull()
    expect(
      parseSnapshot({
        ...good,
        structures: [['solar-shade', 'orbit', 2030, 2031]],
      }),
    ).not.toBeNull()
  })
})
