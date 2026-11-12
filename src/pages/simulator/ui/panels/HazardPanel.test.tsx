import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorld } from '../../model/world/store'
import { HazardPanel } from './HazardPanel'

describe('HazardPanel', () => {
  beforeEach(() => useWorld.getState().reset())

  it('산불과 가뭄을 일으키고, 가뭄 중에는 버튼을 막는다', async () => {
    const user = userEvent.setup()
    render(<HazardPanel />)
    await user.selectOptions(
      screen.getByRole('combobox', { name: '지역' }),
      'california',
    )
    await user.click(
      screen.getByRole('button', { name: '캘리포니아 산불 일으키기' }),
    )
    expect(
      screen
        .getByRole('region', { name: '산불' })
        .querySelector('[role=status]'),
    ).toHaveTextContent('대형 산불')
    await user.click(screen.getByRole('radio', { name: /극심/ }))
    await user.click(
      screen.getByRole('button', { name: '캘리포니아 가뭄 일으키기' }),
    )
    expect(useWorld.getState().droughts[0]).toMatchObject({
      regionId: 'california',
      severity: 3,
    })
    expect(
      screen.getByRole('button', { name: '캘리포니아 가뭄 진행 중' }),
    ).toBeDisabled()
  })
})
