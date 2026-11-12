import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SelectField } from './SelectField'

describe('SelectField', () => {
  it('선택 값을 전달한다', async () => {
    const onChange = vi.fn()
    render(
      <SelectField
        label="화산"
        value="a"
        onChange={onChange}
        options={[
          { value: 'a', label: '가', group: '아시아' },
          { value: 'b', label: '나', group: '유럽' },
        ]}
      />,
    )
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '화산' }),
      'b',
    )
    expect(onChange).toHaveBeenCalledWith('b')
    expect(screen.getByRole('group', { name: '유럽' })).toBeInTheDocument()
  })
})
