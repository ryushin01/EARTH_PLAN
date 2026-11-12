import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorld } from '../../model/world/store'
import { QuakePanel } from './QuakePanel'

describe('QuakePanel', () => {
  beforeEach(() => useWorld.getState().reset())

  it('단층과 규모를 골라 지진을 일으키고 도시별 피해를 보여 준다', async () => {
    const user = userEvent.setup()
    render(<QuakePanel />)
    await user.selectOptions(
      screen.getByRole('combobox', { name: '단층' }),
      'yangsan',
    )
    expect(screen.getByText(/영향 도시: .*경주/)).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: '양산 단층 지진 일으키기' }),
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      '양산 단층 규모 7.0 지진',
    )
    expect(
      screen.getByRole('region', { name: '최근 지진 피해' }),
    ).toHaveTextContent('경주')
  })
})
