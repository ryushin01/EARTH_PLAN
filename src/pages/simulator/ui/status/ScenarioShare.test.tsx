import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  SHARE_PARAM,
  decodeSnapshot,
  toSnapshot,
} from '../../model/world/snapshot'
import { useWorld } from '../../model/world/store'
import { ScenarioShare, shareUrl } from './ScenarioShare'

describe('ScenarioShare', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useWorld.getState().reset()
  })

  it('공유 주소에는 시나리오만 담긴다', () => {
    const url = new URL(
      shareUrl(toSnapshot(useWorld.getState()), 'https://example.com/?x=1#top'),
    )
    expect([...url.searchParams.keys()]).toEqual([SHARE_PARAM])
    expect(url.hash).toBe('')
    expect(decodeSnapshot(url.searchParams.get(SHARE_PARAM)!)?.scenario).toBe(
      'mid',
    )
  })

  it('이름을 붙여 저장하고 불러오고 지운다', async () => {
    const user = userEvent.setup()
    render(<ScenarioShare />)
    useWorld.getState().setSeaLevel(30)
    await user.type(
      screen.getByRole('textbox', { name: '저장할 이름' }),
      '30m 실험',
    )
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(screen.getByRole('status')).toHaveTextContent(
      '"30m 실험"을(를) 저장했습니다',
    )
    useWorld.getState().setSeaLevel(0)
    await user.click(screen.getByRole('button', { name: '30m 실험 불러오기' }))
    expect(useWorld.getState().seaLevel).toBe(30)
    await user.click(screen.getByRole('button', { name: '30m 실험 지우기' }))
    expect(
      screen.queryByRole('list', { name: '저장한 시나리오' }),
    ).not.toBeInTheDocument()
  })

  it('복사가 막히면 링크 칸을 보여 주고 안내한다', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    })
    render(<ScenarioShare />)
    await user.click(screen.getByRole('button', { name: '공유 링크 복사' }))
    const link = screen.getByRole<HTMLInputElement>('textbox', {
      name: '공유 링크',
    })
    expect(link.value).toContain(`?${SHARE_PARAM}=`)
    expect(screen.getByRole('status')).toHaveTextContent('직접 복사')
  })
})
