import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppErrorPage } from './AppErrorPage'

describe('AppErrorPage', () => {
  it('오류를 알리고 다시 시도·처음 화면으로 갈 수 있게 하며, 원인은 콘솔에 남긴다', async () => {
    const error = new Error('패널 오류')
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const reset = vi.fn()
    render(<AppErrorPage error={error} reset={reset} />)
    expect(
      screen.getByRole('heading', { level: 1, name: '문제가 생겼습니다' }),
    ).toBeInTheDocument()
    expect(logged).toHaveBeenCalledWith(error)
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(reset).toHaveBeenCalledOnce()
    expect(screen.getByRole('link', { name: '처음 화면으로' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(document.title).toBe('문제가 생겼습니다 · EARTH PLAN')
    logged.mockRestore()
  })
})
