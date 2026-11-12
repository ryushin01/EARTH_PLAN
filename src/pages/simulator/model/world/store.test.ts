import { useWorld } from './store'

describe('world store', () => {
  beforeEach(() => useWorld.getState().reset())

  it('예산이 모자라면 건설하지 않는다', () => {
    const result = useWorld.getState().build('solar-shade', 'orbit')
    expect(result.ok).toBe(false)
    expect(result.message.ko).toContain('모자랍니다')
    expect(useWorld.getState().structures).toHaveLength(0)
  })

  it('건설하면 예산이 줄고, 같은 곳에 두 번 지을 수 없다', () => {
    const before = useWorld.getState().budget
    expect(useWorld.getState().build('sea-wall', 'tokyo').ok).toBe(true)
    expect(useWorld.getState().budget).toBe(before - 40)
    expect(useWorld.getState().build('sea-wall', 'tokyo').ok).toBe(false)
    expect(useWorld.getState().build('sea-wall', 'fuji').ok).toBe(false)
  })

  it('해수면을 올리면 침수 알림이 쌓이고, 즉시 완공 방조제가 보호한다', () => {
    useWorld.getState().setSeaLevel(5)
    expect(useWorld.getState().floodedCityIds).toContain('tokyo')
    expect(useWorld.getState().events[0].tone).toBe('danger')
    useWorld.getState().build('sea-wall', 'tokyo', { instant: true })
    expect(useWorld.getState().floodedCityIds).not.toContain('tokyo')
  })

  it('재생 중일 때만 시간이 흐른다', () => {
    const year = useWorld.getState().year
    useWorld.getState().tick(0.05)
    expect(useWorld.getState().year).toBe(year)
    useWorld.getState().setSpeed('year')
    useWorld.getState().setRunning(true)
    useWorld.getState().tick(0.05)
    expect(useWorld.getState().year).toBeCloseTo(year + 0.05)
  })

  it('분화와 쓰나미를 기록한다', () => {
    expect(useWorld.getState().triggerEruption('vesuvius', 5, 0).ok).toBe(true)
    expect(useWorld.getState().eruptions[0].affectedCityIds).toContain('naples')
    expect(
      useWorld.getState().triggerTsunami('japan-trench', 9, 0).message.ko,
    ).toContain('일본 해구')
    expect(useWorld.getState().triggerTsunami('fuji', 9, 0).ok).toBe(false)
  })
})

describe('새 재해', () => {
  beforeEach(() => useWorld.getState().reset())

  it('바다에 소행성이 떨어지면 쓰나미도 생긴다', () => {
    const r = useWorld.getState().triggerImpact('north-atlantic', 1000, 0)
    expect(r.ok).toBe(true)
    expect(useWorld.getState().impacts[0].ocean).toBe(true)
    expect(useWorld.getState().tsunamis[0].sourceId).toBe('north-atlantic')
    expect(
      useWorld.getState().tsunamis[0].impacts.map((i) => i.cityId),
    ).toContain('new-york')
  })

  it('요격망이 있으면 빗나가고 기록한다', () => {
    useWorld.getState().build('planetary-defense', 'orbit', { instant: true })
    const r = useWorld.getState().triggerImpact('tokyo', 340, 0)
    expect(r.message.ko).toContain('빗나가게')
    expect(useWorld.getState().tsunamis).toHaveLength(0)
  })

  it('가뭄 중에는 같은 지역에 가뭄을 또 일으킬 수 없고 산불이 커진다', () => {
    const before = useWorld.getState().startWildfire('australia-se', 0)
    expect(before.ok).toBe(true)
    const area1 = useWorld.getState().wildfires[0].burnedKm2
    expect(useWorld.getState().startDrought('australia-se', 3).ok).toBe(true)
    expect(useWorld.getState().startDrought('australia-se', 1).ok).toBe(false)
    useWorld.getState().startWildfire('australia-se', 0)
    expect(useWorld.getState().wildfires[1].burnedKm2).toBeCloseTo(area1 * 1.8)
    expect(useWorld.getState().startWildfire('tokyo', 0).ok).toBe(false)
  })
})
