import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorld } from '../../model/world/store'
import { EruptionPanel } from './EruptionPanel'

describe('EruptionPanel', () => {
  beforeEach(() => useWorld.getState().reset())

  it('고른 화산을 분화시키고 결과를 알린다', async () => {
    const user = userEvent.setup()
    render(<EruptionPanel />)
    await user.selectOptions(
      screen.getByRole('combobox', { name: '화산' }),
      'vesuvius',
    )
    expect(useWorld.getState().selectedSiteId).toBe('vesuvius')
    await user.click(
      screen.getByRole('button', { name: '베수비오 분화 시키기' }),
    )
    expect(useWorld.getState().eruptions).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('베수비오 분화')
  })
})
