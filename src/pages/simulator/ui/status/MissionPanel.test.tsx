import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorld } from '../../model/world/store'
import { MissionPanel } from './MissionPanel'

describe('MissionPanel', () => {
  beforeEach(() => useWorld.getState().reset())

  it('미션을 시작하면 목표와 진행 상황을 보여 주고, 그만둘 수 있다', async () => {
    const user = userEvent.setup()
    render(<MissionPanel />)
    await user.click(
      screen.getByRole('button', { name: '2032년 소행성 막기 시작' }),
    )
    expect(screen.getByText(/목표: 충돌 전에 막아/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: '예정된 사건' })).toHaveTextContent(
      '도쿄',
    )
    await user.click(screen.getByRole('button', { name: '미션 그만두기' }))
    expect(useWorld.getState().mission).toBeNull()
    expect(
      screen.getByRole('button', { name: '2100년 해안 지키기 시작' }),
    ).toBeInTheDocument()
  })
})
