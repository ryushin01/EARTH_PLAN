import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorld } from '../../model/world/store'
import { SiteFinder } from './SiteFinder'

describe('SiteFinder', () => {
  beforeEach(() => useWorld.getState().reset())

  it('지점을 고르면 선택 상태가 바뀐다', async () => {
    render(<SiteFinder />)
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '지점으로 이동' }),
      'baekdu',
    )
    expect(useWorld.getState().selectedSiteId).toBe('baekdu')
  })
})
