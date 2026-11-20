// @vitest-environment jsdom
import { warmOfflineCache } from './offline'

/** navigator.serviceWorker 대역 (controllerchange를 직접 보낼 수 있게) */
function stubServiceWorker(controller: object | null) {
  const container = Object.assign(new EventTarget(), { controller })
  Object.defineProperty(navigator, 'serviceWorker', {
    value: container,
    configurable: true,
  })
  return container
}

describe('warmOfflineCache', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response('ok'))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    Reflect.deleteProperty(navigator, 'serviceWorker')
  })

  it('서비스 워커를 쓸 수 없는 브라우저에서는 아무것도 받지 않는다', async () => {
    await warmOfflineCache(['/a'])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('서비스 워커가 페이지를 맡고 있으면 파일을 브라우저 캐시 우선으로 다시 요청한다', async () => {
    stubServiceWorker({})
    await warmOfflineCache(['/a', '/b'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenCalledWith('/a', { cache: 'force-cache' })
    expect(fetchMock).toHaveBeenCalledWith('/b', { cache: 'force-cache' })
  })

  it('아직 맡지 않았으면 맡을 때까지 기다린다', async () => {
    const sw = stubServiceWorker(null)
    const done = warmOfflineCache(['/a'], 1_000)
    expect(fetchMock).not.toHaveBeenCalled()
    sw.dispatchEvent(new Event('controllerchange'))
    await done
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('정해진 시간 안에 맡지 않으면 그만둔다', async () => {
    vi.useFakeTimers()
    stubServiceWorker(null)
    const done = warmOfflineCache(['/a'], 1_000)
    vi.advanceTimersByTime(1_000)
    await done
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('일부 파일을 받지 못해도 오류 없이 나머지를 받는다', async () => {
    stubServiceWorker({})
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    await expect(warmOfflineCache(['/a', '/b'])).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
