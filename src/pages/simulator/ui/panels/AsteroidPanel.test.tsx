import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorld } from '../../model/world/store'
import { AsteroidPanel } from './AsteroidPanel'

describe('AsteroidPanel', () => {
  beforeEach(() => useWorld.getState().reset())

  it('지점과 지름을 골라 충돌시키고 결과를 알린다', async () => {
    const user = userEvent.setup()
    render(<AsteroidPanel />)
    await user.selectOptions(
      screen.getByRole('combobox', { name: '충돌 지점' }),
      'chicxulub',
    )
    expect(screen.getByRole('slider', { name: '소행성 지름' })).toHaveAttribute(
      'aria-valuetext',
      '1km',
    )
    await user.click(
      screen.getByRole('button', { name: /칙술루브.*충돌시키기/ }),
    )
    expect(useWorld.getState().impacts).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('지름 1km 소행성 충돌')
  })
})
