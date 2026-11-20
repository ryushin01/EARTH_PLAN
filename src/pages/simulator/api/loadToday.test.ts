import { TODAY_DATA } from '@/shared/config'
import { loadToday } from './loadToday'

const data = {
  fetchedAt: '2026-11-20T21:00:00Z',
  quakes: [],
  kp: [{ time: '2026-11-20T18:00:00Z', kp: 2 }],
}

describe('loadToday', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('사이트 안의 자료 파일을 읽는다 (외부 API를 부르지 않음)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(data))
    vi.stubGlobal('fetch', fetchMock)
    await expect(loadToday()).resolves.toEqual(data)
    expect(fetchMock).toHaveBeenCalledWith(TODAY_DATA, { signal: undefined })
    expect(TODAY_DATA).toMatch(/data\/today\.json$/)
  })

  it('받지 못했거나 모양이 다르면 null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 404 })),
    )
    await expect(loadToday()).resolves.toBeNull()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ quakes: 1 })),
    )
    await expect(loadToday()).resolves.toBeNull()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(loadToday()).resolves.toBeNull()
  })
})
