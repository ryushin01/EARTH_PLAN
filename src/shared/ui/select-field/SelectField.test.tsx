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

  it('기본 화살표 대신 꾸밈 화살표를 오른쪽 여백 안에 그린다', () => {
    const { container } = render(
      <SelectField
        label="지점"
        value="a"
        onChange={() => {}}
        options={[{ value: 'a', label: '가' }]}
      />,
    )
    const select = screen.getByRole('combobox', { name: '지점' })
    expect(select).toHaveClass('appearance-none', 'pl-3', 'pr-9')
    const arrow = container.querySelector('svg')
    expect(arrow).toHaveAttribute('aria-hidden', 'true')
    expect(arrow).toHaveClass(
      'pointer-events-none',
      'right-[calc(0.75rem+1px)]',
    )
  })
})
