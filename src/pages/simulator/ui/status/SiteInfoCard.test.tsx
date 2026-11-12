import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorld } from '../../model/world/store'
import { SiteInfoCard } from './SiteInfoCard'

describe('SiteInfoCard', () => {
  beforeEach(() => useWorld.getState().reset())

  it('고른 도시의 정보와 지은 구조물을 보여 주고, 선택을 풀 수 있다', async () => {
    const { container } = render(<SiteInfoCard />)
    expect(container).toBeEmptyDOMElement()
    act(() => {
      useWorld.getState().select('tokyo')
      useWorld.getState().build('sea-wall', 'tokyo')
    })
    const card = screen.getByRole('region', { name: /도쿄/ })
    expect(card).toHaveTextContent('37백만 명')
    expect(card).toHaveTextContent('지은 구조물 1개')
    expect(card).toHaveTextContent('해안 방조제')
    await userEvent.click(screen.getByRole('button', { name: '선택 해제' }))
    expect(useWorld.getState().selectedSiteId).toBeNull()
  })

  it('화산은 최대 VEI를 보여 준다', () => {
    useWorld.getState().select('baekdu')
    render(<SiteInfoCard />)
    expect(screen.getByRole('region', { name: /백두산/ })).toHaveTextContent(
      'VEI 7',
    )
  })
})
