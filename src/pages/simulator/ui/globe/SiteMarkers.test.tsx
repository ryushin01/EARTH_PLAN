import ReactThreeTestRenderer from '@react-three/test-renderer'
import { useLayoutEffect } from 'react'
import type { ReactElement } from 'react'
import { useThree } from '@react-three/fiber'
import type { Mesh, MeshBasicMaterial } from 'three'
import { useLocale } from '@/shared/i18n'
import { getSite } from '../../model/site/data'
import type { Site } from '../../model/site/types'
import { SiteMarkers } from './SiteMarkers'

// drei Html은 DOM을 캔버스 밖에 그리므로, 테스트에서는 이름표 글자만 장면에 남김
vi.mock('@react-three/drei', () => ({
  Html: ({ children }: { children: ReactElement<{ children: string }> }) => (
    <group name="label" userData={{ text: children.props.children }} />
  ),
}))

const sites = ['tokyo', 'baekdu', 'japan-trench'].map(
  (id) => getSite(id) as Site,
)

/** 브라우저의 Canvas처럼 DOM 이벤트가 연결된 상태로 만듦 (테스트 렌더러는 연결하지 않음) */
function ConnectEvents() {
  const set = useThree((state) => state.set)
  useLayoutEffect(() => {
    set((state) => ({
      events: { ...state.events, connected: document.createElement('div') },
    }))
  }, [set])
  return null
}

async function setup(
  props: Partial<Parameters<typeof SiteMarkers>[0]> = {},
  connected = true,
) {
  const onSelect = vi.fn()
  const renderer = await ReactThreeTestRenderer.create(
    <>
      {connected ? <ConnectEvents /> : null}
      <SiteMarkers
        sites={sites}
        selectedId={null}
        onSelect={onSelect}
        {...props}
      />
    </>,
  )
  const markers = () => renderer.scene.findAll((node) => node.type === 'Mesh')
  const label = () =>
    renderer.scene
      .findAll((node) => node.instance.name === 'label')
      .map((node) => node.instance.userData.text)
  const color = (index: number) =>
    (
      (markers()[index].instance as Mesh).material as MeshBasicMaterial
    ).color.getHexString()
  return { renderer, onSelect, markers, label, color }
}

describe('SiteMarkers', () => {
  afterEach(() => {
    useLocale.setState({ locale: 'ko' })
    document.body.style.cursor = ''
  })

  it('지점마다 표시를 하나씩 지표면 바로 위에 놓는다', async () => {
    const { markers, label } = await setup()
    expect(markers()).toHaveLength(3)
    for (const marker of markers())
      expect(marker.instance.position.length()).toBeCloseTo(1.006)
    expect(label()).toEqual([])
  })

  it('고른 지점은 하늘색으로 크게 보이고 이름표가 붙는다', async () => {
    const { markers, label, color } = await setup({ selectedId: 'baekdu' })
    expect(color(1)).toBe('00a1ff')
    expect(markers()[1].instance.scale.x).toBeCloseTo(1.8)
    expect(label()).toEqual(['백두산'])
  })

  it('캔버스가 이벤트에 연결되기 전에는 이름표를 붙이지 않는다', async () => {
    // 연결 전에 붙이면 붙을 요소가 바뀌며 이름표를 렌더링 도중 다시 만들게 됨
    const { label } = await setup({ selectedId: 'baekdu' }, false)
    expect(label()).toEqual([])
  })

  it('상태에 따라 색이 다르다', async () => {
    const { color } = await setup({
      tones: { tokyo: 'danger', 'japan-trench': 'protected' },
    })
    expect(color(0)).toBe('ff4d4d')
    expect(color(1)).toBe('daf2ff')
    expect(color(2)).toBe('00a1ff')
  })

  it('누르면 그 지점을 고른다', async () => {
    const { renderer, markers, onSelect } = await setup()
    await renderer.fireEvent(markers()[2], 'click')
    expect(onSelect).toHaveBeenCalledWith('japan-trench')
  })

  it('마우스를 올리면 이름표와 손가락 커서가 나오고, 벗어나면 고른 지점으로 돌아간다', async () => {
    const { renderer, markers, label } = await setup({ selectedId: 'tokyo' })
    await renderer.fireEvent(markers()[1], 'pointerOver')
    expect(label()).toEqual(['백두산'])
    expect(markers()[1].instance.scale.x).toBeCloseTo(1.4)
    expect(document.body.style.cursor).toBe('pointer')
    await renderer.fireEvent(markers()[1], 'pointerOut')
    expect(label()).toEqual(['도쿄'])
    expect(document.body.style.cursor).toBe('')
  })

  it('영어로 바꾸면 이름표도 영어다', async () => {
    useLocale.setState({ locale: 'en' })
    const { label } = await setup({ selectedId: 'baekdu' })
    expect(label()).toEqual(['Mount Paektu'])
  })
})
