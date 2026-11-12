import { render, screen } from '@testing-library/react'
import { StatusMessage } from './StatusMessage'

describe('StatusMessage', () => {
  it('빈 메시지여도 status 영역을 유지한다', () => {
    const { rerender } = render(<StatusMessage message="" />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    rerender(<StatusMessage message="완료" />)
    expect(screen.getByRole('status')).toHaveTextContent('완료')
  })
})
