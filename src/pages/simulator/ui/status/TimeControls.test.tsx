import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorld } from '../../model/world/store'
import { TimeControls } from './TimeControls'

describe('TimeControls', () => {
  beforeEach(() => useWorld.getState().reset())

  it('재생 버튼 글자가 바뀌고 상태를 바꾼다', async () => {
    render(<TimeControls />)
    await userEvent.click(screen.getByRole('button', { name: '재생' }))
    expect(useWorld.getState().running).toBe(true)
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument()
  })

  it('빠른 속도에서는 시각을 고정한다고 안내한다', async () => {
    render(<TimeControls />)
    await userEvent.click(screen.getByRole('radio', { name: '1년' }))
    expect(useWorld.getState().speed).toBe('year')
    expect(
      screen.getByRole('slider', { name: '시각 (UTC)' }),
    ).toHaveAccessibleDescription(/고정/)
  })
})
