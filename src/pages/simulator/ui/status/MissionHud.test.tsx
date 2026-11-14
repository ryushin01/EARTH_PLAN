import { act, render, screen } from '@testing-library/react'
import { useWorld } from '../../model/world/store'
import { MissionHud } from './MissionHud'

describe('MissionHud', () => {
  beforeEach(() => useWorld.getState().reset())

  it('수치와 새 사건을 보여 주고 알린다', () => {
    render(<MissionHud />)
    expect(screen.getByText('해수면')).toBeInTheDocument()
    act(() => {
      useWorld.getState().setSeaLevel(5)
    })
    expect(screen.getByRole('status').textContent).toMatch(/경보: .*침수/)
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(1)
  })
})
