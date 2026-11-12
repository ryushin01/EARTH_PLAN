import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorld } from '../../model/world/store'
import { TsunamiPanel } from './TsunamiPanel'

describe('TsunamiPanel', () => {
  beforeEach(() => useWorld.getState().reset())

  it('지진을 일으키면 도시별 도달 표를 보여 준다', async () => {
    render(<TsunamiPanel />)
    await userEvent.click(
      screen.getByRole('button', { name: '일본 해구 지진 일으키기' }),
    )
    expect(screen.getByRole('status')).toHaveTextContent('일본 해구 규모 9.0')
    const table = screen.getByRole('table')
    expect(table).toHaveTextContent('센다이')
  })
})
