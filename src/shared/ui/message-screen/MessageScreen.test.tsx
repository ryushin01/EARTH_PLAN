import { render, screen } from '@testing-library/react'
import { MessageScreen } from './MessageScreen'

describe('MessageScreen', () => {
  it('제목(h1)·설명과 동작을 머리말·본문 랜드마크 안에 둔다', () => {
    render(
      <MessageScreen
        label="404"
        title="페이지를 찾을 수 없습니다"
        description="주소를 확인하세요."
        tagline="지구 환경·재해 대응 시뮬레이터"
      >
        <a href="/">처음 화면으로</a>
      </MessageScreen>,
    )
    expect(screen.getByRole('banner')).toHaveTextContent('Earth_Plan')
    const main = screen.getByRole('main')
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '페이지를 찾을 수 없습니다',
      }),
    ).toBeInTheDocument()
    expect(main).toHaveTextContent('주소를 확인하세요.')
    expect(screen.getByRole('link', { name: '처음 화면으로' })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
