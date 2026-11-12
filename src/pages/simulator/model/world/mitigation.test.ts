import { riseReduction, warming } from './engine'
import { useWorld } from './store'

const renewables = [
  {
    id: 'r',
    kind: 'renewable-transition' as const,
    siteId: 'global',
    startYear: 2026,
    completeYear: 2036,
  },
]

describe('온실가스 감축', () => {
  beforeEach(() => useWorld.getState().reset())

  it('완공 뒤 효과가 25년에 걸쳐 커진다', () => {
    const base = (year: number) =>
      warming({ year, scenario: 'mid', structures: [], eruptions: [] })
    const withPolicy = (year: number) =>
      warming({ year, scenario: 'mid', structures: renewables, eruptions: [] })
    expect(withPolicy(2035)).toBeCloseTo(base(2035))
    expect(base(2048.5) - withPolicy(2048.5)).toBeCloseTo(0.3)
    expect(base(2070) - withPolicy(2070)).toBeCloseTo(0.6)
    expect(riseReduction(renewables, 2061)).toBeCloseTo(0.1)
  })

  it('전 지구 정책은 위치 없이 한 번만 지을 수 있다', () => {
    useWorld.setState({ budget: 5000 })
    expect(useWorld.getState().build('carbon-capture', 'global').ok).toBe(true)
    expect(useWorld.getState().build('carbon-capture', 'global').ok).toBe(false)
    expect(useWorld.getState().build('renewable-transition', 'tokyo').ok).toBe(
      false,
    )
  })
})
