import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorld } from '../../model/world/store'
import { BuildPanel } from './BuildPanel'

describe('BuildPanel', () => {
  beforeEach(() => useWorld.getState().reset())

  it('도시를 골라 방조제를 짓는다', async () => {
    const user = userEvent.setup()
    render(<BuildPanel />)
    await user.selectOptions(
      screen.getByRole('combobox', { name: '설치할 도시' }),
      'tokyo',
    )
    await user.click(screen.getByRole('button', { name: /해안 방조제 짓기/ }))
    expect(useWorld.getState().structures[0]).toMatchObject({
      kind: 'sea-wall',
      siteId: 'tokyo',
    })
    expect(screen.getByRole('status')).toHaveTextContent(
      '도쿄에 해안 방조제 건설을 시작했습니다',
    )
    expect(screen.getByText(/완공 예정/)).toBeInTheDocument()
  })

  it('같은 곳을 빠르게 두 번 눌러도 한 번만 짓는다', async () => {
    const user = userEvent.setup()
    render(<BuildPanel />)
    await user.dblClick(
      screen.getByRole('button', { name: /해안 방조제 짓기/ }),
    )
    expect(useWorld.getState().structures).toHaveLength(1)
  })

  it('예산이 모자라면 버튼을 막고 이유를 알린다', async () => {
    const user = userEvent.setup()
    render(<BuildPanel />)
    await user.click(screen.getByRole('radio', { name: /L1 우주 차양/ }))
    const button = screen.getByRole('button', { name: /L1 우주 차양 짓기/ })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription(/모자랍니다/)
  })
})
