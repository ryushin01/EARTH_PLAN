import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocale } from '@/shared/i18n'
import type { GlobeCanvasProps } from './GlobeCanvas'
import { GlobeViewport, IDLE_LOAD_MS } from './GlobeViewport'

// WebGL이 없는 jsdom에서는 3D 묶음을 대역으로 바꾸고, 받은 설정과 카메라 조작을 기록함
const seen = vi.hoisted(() => ({
  canvas: null as null | GlobeCanvasProps,
  api: { rotate: vi.fn(), zoom: vi.fn(), focus: vi.fn() },
  fail: false,
}))

vi.mock('./GlobeCanvas', () => ({
  GlobeCanvas: (props: GlobeCanvasProps) => {
    if (seen.fail) throw new Error('WebGL을 만들 수 없음')
    seen.canvas = props
    props.apiRef.current = seen.api
    return <div data-testid="canvas" />
  },
}))

const STEP = Math.PI / 12

function setup(names = { globe: '지구본 조작 영역', autoRotate: '자동 회전' }) {
  render(
    <>
      <GlobeViewport hintId="hint" />
      <p id="hint">조작 안내</p>
    </>,
  )
  return {
    globe: screen.getByRole('group', { name: names.globe }),
    autoRotate: () => screen.getByRole('button', { name: names.autoRotate }),
    poster: () => document.querySelector('img'),
    status: () => screen.getByRole('status'),
  }
}

/** 첫 상호작용으로 3D를 불러오고, 지구가 보이게 함 */
async function wakeAndShow() {
  fireEvent.pointerMove(window)
  await screen.findByTestId('canvas')
  act(() => seen.canvas?.onReady?.())
}

function prefersReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: matches && query.includes('reduced-motion'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  )
}

describe('GlobeViewport', () => {
  beforeEach(() => {
    seen.canvas = null
    seen.fail = false
    seen.api.rotate.mockClear()
    seen.api.zoom.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    useLocale.setState({ locale: 'ko' })
    window.history.replaceState(null, '', '/')
  })

  it('지구본 영역은 키보드 초점을 받고 조작 안내와 연결된다', () => {
    const { globe } = setup()
    expect(globe).toHaveAttribute('tabindex', '0')
    expect(globe).toHaveAttribute('aria-roledescription', '3D 지구본')
    expect(globe).toHaveAccessibleDescription('조작 안내')
  })

  it('처음에는 3D 없이 같은 시점의 정지 이미지를 먼저 보여 준다', () => {
    const { poster, status } = setup()
    expect(screen.queryByTestId('canvas')).toBeNull()
    // 같은 지구를 보여 주는 꾸밈 이미지라 대체 텍스트는 비움
    expect(poster()).toHaveAttribute('alt', '')
    expect(poster()?.getAttribute('srcset')).toMatch(/600w, .+ 1200w/)
    expect(poster()).toHaveAttribute('fetchpriority', 'high')
    // 상태 알림 영역은 처음부터 있고 비어 있음
    expect(status()).toHaveTextContent('')
  })

  it('상호작용하면 3D를 불러오고, 지구가 보이면 정지 이미지를 흐리게 지운다', async () => {
    const { poster, status } = setup()
    fireEvent.pointerMove(window)
    await screen.findByTestId('canvas')
    expect(status()).toHaveTextContent('3D 지구 준비 중')
    act(() => seen.canvas?.onProgress?.(40))
    expect(status()).toHaveTextContent('지구를 불러오는 중 40%')
    expect(poster()).not.toHaveClass('opacity-0')

    act(() => seen.canvas?.onReady?.())
    expect(status()).toHaveTextContent('')
    expect(poster()).toHaveClass('opacity-0')
    fireEvent.transitionEnd(poster()!)
    expect(poster()).toBeNull()
  })

  it('상호작용이 없어도 잠시 뒤에는 3D를 불러온다', async () => {
    vi.useFakeTimers()
    setup()
    act(() => vi.advanceTimersByTime(IDLE_LOAD_MS - 1))
    expect(screen.queryByTestId('canvas')).toBeNull()
    act(() => vi.advanceTimersByTime(1))
    vi.useRealTimers()
    expect(await screen.findByTestId('canvas')).toBeInTheDocument()
  })

  it('데이터 절약 모드에서는 저절로 받지 않고 상호작용할 때만 3D를 불러온다', async () => {
    // jsdom에는 Network Information API가 없어 직접 정의
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    })
    try {
      vi.useFakeTimers()
      setup()
      act(() => vi.advanceTimersByTime(IDLE_LOAD_MS * 4))
      expect(screen.queryByTestId('canvas')).toBeNull()
      vi.useRealTimers()
      fireEvent.pointerDown(window)
      expect(await screen.findByTestId('canvas')).toBeInTheDocument()
    } finally {
      Reflect.deleteProperty(navigator, 'connection')
    }
  })

  it('공유 링크로 열면 상태가 처음과 달라 정지 이미지 없이 바로 3D를 불러온다', async () => {
    window.history.replaceState(null, '', '/?s=abc')
    const { poster } = setup()
    expect(poster()).toBeNull()
    expect(await screen.findByTestId('canvas')).toBeInTheDocument()
  })

  it('3D가 뜨기 전에 누른 회전은 지구가 보이면 이어서 실행한다', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: '왼쪽으로 돌리기' }))
    await screen.findByTestId('canvas')
    expect(seen.api.rotate).not.toHaveBeenCalled()
    act(() => seen.canvas?.onReady?.())
    expect(seen.api.rotate.mock.calls).toEqual([[-STEP, 0]])
  })

  it('자동 회전은 지구가 보인 뒤에 시작해 정지 이미지와 같은 자리에서 바뀐다', async () => {
    const { autoRotate } = setup()
    expect(autoRotate()).toHaveAttribute('aria-pressed', 'true')
    fireEvent.pointerMove(window)
    await screen.findByTestId('canvas')
    expect(seen.canvas?.autoRotate).toBe(false)
    act(() => seen.canvas?.onReady?.())
    expect(seen.canvas?.autoRotate).toBe(true)
  })

  it('3D를 그리지 못하면 정지 이미지를 두고 이유를 알린다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    seen.fail = true
    const { poster, status } = setup()
    fireEvent.pointerMove(window)
    expect(
      await screen.findByText(/WebGL을 쓸 수 없어 3D 지구를 표시하지 못합니다/),
    ).toBe(status())
    expect(poster()).toBeInTheDocument()
  })

  it('화살표 키로 돌리고 +, − 키로 확대·축소하며, 자동 회전을 멈춘다', async () => {
    const user = userEvent.setup()
    const { globe, autoRotate } = setup()
    await wakeAndShow()
    globe.focus()
    await user.keyboard('{ArrowRight}{ArrowUp}+-')
    expect(seen.api.rotate.mock.calls).toEqual([
      [STEP, 0],
      [0, -STEP],
    ])
    expect(seen.api.zoom.mock.calls).toEqual([[0.8], [1.25]])
    expect(autoRotate()).toHaveAttribute('aria-pressed', 'false')
  })

  it('지구본 영역 안의 다른 요소에서 누른 키는 무시한다', async () => {
    setup()
    await wakeAndShow()
    fireEvent.keyDown(screen.getByTestId('canvas'), { key: 'ArrowLeft' })
    expect(seen.api.rotate).not.toHaveBeenCalled()
  })

  it('버튼으로도 돌리고 확대한다', async () => {
    const user = userEvent.setup()
    setup()
    await wakeAndShow()
    await user.click(screen.getByRole('button', { name: '왼쪽으로 돌리기' }))
    await user.click(screen.getByRole('button', { name: '남쪽으로 기울이기' }))
    await user.click(screen.getByRole('button', { name: '축소' }))
    expect(seen.api.rotate.mock.calls).toEqual([
      [-STEP, 0],
      [0, STEP],
    ])
    expect(seen.api.zoom).toHaveBeenCalledWith(1.25)
  })

  it('보기 버튼은 토글 묶음을 펼치고 접는다', async () => {
    const user = userEvent.setup()
    setup()
    const view = screen.getByRole('button', { name: '보기' })
    expect(view).toHaveAttribute('aria-expanded', 'false')
    await user.click(view)
    expect(view).toHaveAttribute('aria-expanded', 'true')
    const options = document.getElementById(
      view.getAttribute('aria-controls')!,
    )!
    expect(options).toContainElement(
      screen.getByRole('button', { name: '구름' }),
    )
  })

  it('구름·지점 토글은 눌림 상태를 알리고 장면에 전달한다', async () => {
    const user = userEvent.setup()
    setup()
    await wakeAndShow()
    const clouds = screen.getByRole('button', { name: '구름' })
    expect(clouds).toHaveAttribute('aria-pressed', 'true')
    await user.click(clouds)
    await user.click(screen.getByRole('button', { name: '지점' }))
    expect(clouds).toHaveAttribute('aria-pressed', 'false')
    expect(seen.canvas).toMatchObject({
      showClouds: false,
      showMarkers: false,
    })
  })

  it('운영체제의 동작 줄이기가 켜져 있으면 처음부터 자동 회전을 끄고, 정지 이미지를 바로 지운다', async () => {
    prefersReducedMotion(true)
    const { autoRotate, poster } = setup()
    expect(autoRotate()).toHaveAttribute('aria-pressed', 'false')
    await wakeAndShow()
    expect(seen.canvas).toMatchObject({
      autoRotate: false,
      reducedMotion: true,
    })
    expect(poster()).toBeNull()
  })

  it('영어로 바꾸면 이름도 영어다', () => {
    useLocale.setState({ locale: 'en' })
    const { globe, autoRotate } = setup({
      globe: 'Globe controls area',
      autoRotate: 'Auto-rotate',
    })
    expect(globe).toHaveAttribute('aria-roledescription', '3D globe')
    expect(autoRotate()).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Rotate left' }),
    ).toBeInTheDocument()
  })
})
