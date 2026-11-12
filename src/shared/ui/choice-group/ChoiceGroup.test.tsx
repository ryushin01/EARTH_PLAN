import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChoiceGroup } from './ChoiceGroup'

describe('ChoiceGroup', () => {
  it('라디오 묶음으로 선택한다', async () => {
    const onChange = vi.fn()
    render(
      <ChoiceGroup
        legend="속도"
        value="a"
        onChange={onChange}
        choices={[
          { value: 'a', label: '느림' },
          { value: 'b', label: '빠름' },
        ]}
      />,
    )
    expect(screen.getByRole('group', { name: '속도' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '느림' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: '빠름' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })
})
