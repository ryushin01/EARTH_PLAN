import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ControlPanel } from './ControlPanel'

describe('ControlPanel', () => {
  it('탭으로 패널을 바꾼다', async () => {
    const user = userEvent.setup()
    render(<ControlPanel />)
    expect(screen.getByRole('tabpanel', { name: '해수면' })).toBeVisible()
    await user.click(screen.getByRole('tab', { name: '구조물' }))
    expect(screen.getByRole('tabpanel', { name: '구조물' })).toBeVisible()
    expect(
      screen.getByRole('group', { name: '거대 구조물' }),
    ).toBeInTheDocument()
  })
})
