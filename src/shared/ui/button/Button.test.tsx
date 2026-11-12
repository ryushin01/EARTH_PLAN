import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('기본 type은 button이고 클릭을 전달한다', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>건설</Button>)
    const button = screen.getByRole('button', { name: '건설' })
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })
})
