import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode, RefObject } from 'react'
import { useLocale } from '@/shared/i18n'
import type { CameraApi } from '../../model/camera'
import { GlobeViewport } from './GlobeViewport'

// WebGL이 없는 jsdom에서는 3D 캔버스와 장면을 대역으로 바꾸고, 받은 설정과 카메라 조작을 기록함
const seen = vi.hoisted(() => ({
  scene: null as null | {
    autoRotate: boolean
    showClouds: boolean
    showMarkers: boolean
    reducedMotion: boolean
  },
  api: { rotate: vi.fn(), zoom: vi.fn(), focus: vi.fn() },
}))

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: ReactNode }) => (
    <div data-testid="canvas">{children}</div>
  ),
}))
vi.mock('@react-three/drei', () => ({
  useProgress: () => ({ active: false, progress: 100 }),
}))
vi.mock('./GlobeScene', () => ({
  GlobeScene: (
    props: NonNullable<typeof seen.scene> & {
      apiRef: RefObject<CameraApi | null>
    },
  ) => {
    seen.scene = props
    props.apiRef.current = seen.api
    return null
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
  }
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
    seen.scene = null
    seen.api.rotate.mockClear()
    seen.api.zoom.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    useLocale.setState({ locale: 'ko' })
  })

  it('지구본 영역은 키보드 초점을 받고 조작 안내와 연결된다', () => {
    const { globe } = setup()
    expect(globe).toHaveAttribute('tabindex', '0')
    expect(globe).toHaveAttribute('aria-roledescription', '3D 지구본')
    expect(globe).toHaveAccessibleDescription('조작 안내')
  })

  it('화살표 키로 돌리고 +, − 키로 확대·축소하며, 자동 회전을 멈춘다', async () => {
    const user = userEvent.setup()
    const { globe, autoRotate } = setup()
    expect(autoRotate()).toHaveAttribute('aria-pressed', 'true')
    globe.focus()
    await user.keyboard('{ArrowRight}{ArrowUp}+-')
    expect(seen.api.rotate.mock.calls).toEqual([
      [STEP, 0],
      [0, -STEP],
    ])
    expect(seen.api.zoom.mock.calls).toEqual([[0.8], [1.25]])
    expect(autoRotate()).toHaveAttribute('aria-pressed', 'false')
  })

  it('지구본 영역 안의 다른 요소에서 누른 키는 무시한다', () => {
    setup()
    fireEvent.keyDown(screen.getByTestId('canvas'), { key: 'ArrowLeft' })
    expect(seen.api.rotate).not.toHaveBeenCalled()
  })

  it('버튼으로도 돌리고 확대한다', async () => {
    const user = userEvent.setup()
    setup()
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
    const clouds = screen.getByRole('button', { name: '구름' })
    expect(clouds).toHaveAttribute('aria-pressed', 'true')
    await user.click(clouds)
    await user.click(screen.getByRole('button', { name: '지점' }))
    expect(clouds).toHaveAttribute('aria-pressed', 'false')
    expect(seen.scene).toMatchObject({ showClouds: false, showMarkers: false })
  })

  it('운영체제의 동작 줄이기가 켜져 있으면 처음부터 자동 회전을 끈다', () => {
    prefersReducedMotion(true)
    const { autoRotate } = setup()
    expect(autoRotate()).toHaveAttribute('aria-pressed', 'false')
    expect(seen.scene).toMatchObject({ autoRotate: false, reducedMotion: true })
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
