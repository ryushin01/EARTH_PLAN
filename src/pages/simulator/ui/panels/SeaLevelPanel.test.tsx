import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorld } from '../../model/world/store'
import { SeaLevelPanel } from './SeaLevelPanel'

describe('SeaLevelPanel', () => {
  beforeEach(() => useWorld.getState().reset())

  it('해수면을 올리면 침수 도시가 목록에 나온다', () => {
    render(<SeaLevelPanel />)
    expect(
      screen.getByRole('button', { name: /암스테르담.*보호 중/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /도쿄/ }),
    ).not.toBeInTheDocument()
    fireEvent.change(
      screen.getByRole('slider', { name: '해수면 (2020년 대비)' }),
      { target: { value: '3.5' } },
    )
    expect(useWorld.getState().seaLevel).toBe(3.5)
    expect(
      screen.getByRole('button', { name: /도쿄.*침수/ }),
    ).toBeInTheDocument()
  })

  it('빙상 바로가기와 시나리오를 고른다', async () => {
    render(<SeaLevelPanel />)
    await userEvent.click(
      screen.getByRole('button', { name: /남극 빙상 전부/ }),
    )
    expect(useWorld.getState().seaLevel).toBe(58)
    await userEvent.click(screen.getByRole('radio', { name: /고배출/ }))
    expect(useWorld.getState().scenario).toBe('high')
  })
})
