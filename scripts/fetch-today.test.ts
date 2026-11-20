import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SOURCES, updateToday } from './fetch-today'

const usgs = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'us1',
      properties: { mag: 6.6, place: 'Tual', time: 1_795_000_000_000 },
      geometry: { type: 'Point', coordinates: [131.46, -6.02, 68] },
    },
  ],
}
const kp = [{ time_tag: '2026-11-20T18:00:00', Kp: 2.33 }]

/** 주소마다 정해진 응답을 돌려주는 fetch 대역 */
function fakeFetch(responses: Record<string, unknown>) {
  return vi.fn(async (url: string | URL | Request) => {
    const key = String(url)
    if (!(key in responses)) throw new TypeError('network')
    const body = responses[key]
    return body instanceof Response ? body : Response.json(body)
  })
}

describe('오늘의 지구 자료 받기 (배포 때)', () => {
  const now = new Date('2026-11-20T21:00:00.123Z')
  const out = () => join(mkdtempSync(join(tmpdir(), 'tn-today-')), 'today.json')

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('USGS 지진과 NOAA Kp를 받아 자료 파일로 쓴다', async () => {
    const file = out()
    const ok = await updateToday(
      file,
      fakeFetch({ [SOURCES.quakes]: usgs, [SOURCES.kp]: kp }),
      now,
    )
    expect(ok).toBe(true)
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({
      fetchedAt: '2026-11-20T21:00:00Z',
      quakes: [
        {
          id: 'us1',
          time: 1_795_000_000_000,
          mag: 6.6,
          depthKm: 68,
          lat: -6.02,
          lon: 131.46,
          place: 'Tual',
          tsunami: false,
        },
      ],
      kp: [{ time: '2026-11-20T18:00:00Z', kp: 2.33 }],
    })
  })

  it('받지 못하거나 응답이 이상하면 마지막 자료를 그대로 두고, 배포는 멈추지 않는다', async () => {
    for (const fetchImpl of [
      fakeFetch({ [SOURCES.quakes]: usgs }),
      fakeFetch({
        [SOURCES.quakes]: usgs,
        [SOURCES.kp]: new Response('busy', { status: 503 }),
      }),
      fakeFetch({ [SOURCES.quakes]: { features: [] }, [SOURCES.kp]: kp }),
    ]) {
      const file = out()
      writeFileSync(file, 'previous')
      await expect(updateToday(file, fetchImpl, now)).resolves.toBe(false)
      expect(readFileSync(file, 'utf8')).toBe('previous')
    }
  })
})
