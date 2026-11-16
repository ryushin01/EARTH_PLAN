import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorld } from '../../model/world/store'
import { SolarStormPanel } from './SolarStormPanel'

describe('SolarStormPanel', () => {
  beforeEach(() => useWorld.getState().reset())

  it('세기를 골라 미리 보고, 태양 폭풍을 일으키면 도시별 피해를 보여 준다', async () => {
    const user = userEvent.setup()
    render(<SolarStormPanel />)
    const levels = screen.getByRole('group', { name: '폭풍 세기' })
    expect(within(levels).getByRole('radio', { name: /G5 극심/ })).toBeChecked()
    expect(screen.getByText(/정전 위험 도시 \d+곳/)).toBeInTheDocument()
    await user.click(within(levels).getByRole('radio', { name: /캐링턴급/ }))
    expect(screen.getByText(/그중 변압기 손상 \d+곳/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '태양 폭풍 일으키기' }))
    expect(screen.getByRole('status')).toHaveTextContent('캐링턴급 태양 폭풍')
    const damage = screen.getByRole('region', { name: '최근 태양 폭풍 피해' })
    expect(within(damage).getAllByRole('listitem')[0].textContent).toMatch(
      /레이캬비크.*지자기 위도 69°.*변압기 손상/,
    )
  })

  it('우주 기상 경보망이 있으면 경보로 막은 곳을 보여 준다', async () => {
    const user = userEvent.setup()
    useWorld
      .getState()
      .build('space-weather-shield', 'orbit', { instant: true })
    render(<SolarStormPanel />)
    expect(screen.getByText(/우주 기상 경보망이 하루 전에 알려/)).toBeVisible()
    await user.click(screen.getByRole('radio', { name: /캐링턴급/ }))
    await user.click(screen.getByRole('button', { name: '태양 폭풍 일으키기' }))
    const damage = screen.getByRole('region', { name: '최근 태양 폭풍 피해' })
    expect(within(damage).getAllByText('경보로 막음').length).toBeGreaterThan(0)
    expect(within(damage).queryByText('변압기 손상')).not.toBeInTheDocument()
  })
})
