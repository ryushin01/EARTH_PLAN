import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs } from './Tabs'

const items = [
  { id: 'a', label: '가', content: <p>가 내용</p> },
  { id: 'b', label: '나', content: <p>나 내용</p> },
  { id: 'c', label: '다', content: <p>다 내용</p> },
]

function Demo() {
  const [value, setValue] = useState('a')
  return <Tabs label="테스트" items={items} value={value} onChange={setValue} />
}

describe('Tabs', () => {
  it('선택 상태와 패널 연결을 표시한다', () => {
    render(<Demo />)
    const tab = screen.getByRole('tab', { name: '가' })
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: '나' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(screen.getByRole('tabpanel', { name: '가' })).toHaveTextContent(
      '가 내용',
    )
  })

  it('화살표·Home·End로 이동하고 roving tabindex를 유지한다', async () => {
    const user = userEvent.setup()
    render(<Demo />)
    await user.tab()
    expect(screen.getByRole('tab', { name: '가' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: '나' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: '나' })).toHaveAttribute(
      'tabindex',
      '0',
    )
    expect(screen.getByRole('tab', { name: '가' })).toHaveAttribute(
      'tabindex',
      '-1',
    )
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: '다' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: '가' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: '다' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
