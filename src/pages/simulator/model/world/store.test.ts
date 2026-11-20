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

  it('태양 폭풍을 기록하고 최근 세 번만 남긴다', () => {
    const result = useWorld.getState().triggerSolarStorm('carrington', 0)
    expect(result.ok).toBe(true)
    expect(result.message.ko).toContain('캐링턴급 태양 폭풍')
    expect(result.message.ko).toContain('변압기 손상')
    expect(result.message.en).toContain('Carrington-class solar storm')
    expect(useWorld.getState().events[0].tone).toBe('danger')
    for (const level of ['g3', 'g4', 'g5'] as const)
      useWorld.getState().triggerSolarStorm(level, 0)
    const storms = useWorld.getState().solarStorms
    expect(storms.map((s) => s.level)).toEqual(['g3', 'g4', 'g5'])
  })

  it('태양 폭풍 피해는 최근 세 번이 지워져도 누계로 남는다', () => {
    for (const level of ['g5', 'g5', 'g3', 'g4'] as const)
      useWorld.getState().triggerSolarStorm(level, 0)
    const s = useWorld.getState()
    expect(s.solarStorms).toHaveLength(3)
    // 변압기가 탄 도시는 한 번만 세고, 고장 위성은 폭풍마다 더함
    expect(s.gridDamagedCityIds).toContain('reykjavik')
    expect(new Set(s.gridDamagedCityIds).size).toBe(s.gridDamagedCityIds.length)
    expect(s.satellitesLost).toBe(40 + 40 + 0 + 5)
    useWorld.getState().reset()
    expect(useWorld.getState()).toMatchObject({
      gridDamagedCityIds: [],
      satellitesLost: 0,
    })
  })

  it('재해로 운항이 바뀌면 그 재해 기록과 결과 문구에 운항 영향을 덧붙인다', () => {
    useWorld.getState().reset()
    const before = useWorld.getState().events.length
    const result = useWorld.getState().triggerSolarStorm('carrington')
    const { events } = useWorld.getState()
    // 운항 영향은 따로 기록하지 않고 재해 기록 한 건에 담아, 사건 알림으로 함께 읽힘
    expect(events).toHaveLength(before + 1)
    expect(events[0].text.ko).toContain('운항 영향')
    expect(events[0].text.ko).toContain('우주왕복선 발사 보류')
    expect(result.message.ko).toContain('운항 영향')
  })

  it('운항에 영향이 없는 재해는 운항 영향을 덧붙이지 않는다', () => {
    useWorld.getState().reset()
    useWorld.getState().triggerEruption('eyjafjallajokull', 2)
    expect(
      useWorld.getState().events.some((e) => e.text.ko.includes('운항 영향')),
    ).toBe(false)
  })
})
