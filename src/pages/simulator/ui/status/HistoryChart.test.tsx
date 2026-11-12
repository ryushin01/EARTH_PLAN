import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HistoryChart } from './HistoryChart'

const points = Array.from({ length: 30 }, (_, i) => ({
  year: 2030 + i,
  seaLevel: i * 0.01,
  warming: 1.3 + i * 0.02,
  floodedCities: Math.floor(i / 10),
}))

describe('HistoryChart', () => {
  it('기록이 적으면 안내만 보여 준다', () => {
    render(<HistoryChart points={points.slice(0, 1)} />)
    expect(screen.getByText(/재생하면/)).toBeInTheDocument()
  })

  it('그래프 제목과 최신 값, 표 보기를 제공한다', async () => {
    render(<HistoryChart points={points} />)
    expect(screen.getByText('해수면 (m)')).toBeInTheDocument()
    expect(screen.getByText('평균 기온 (°C)')).toBeInTheDocument()
    await userEvent.click(screen.getByText('표로 보기'))
    const table = screen.getByRole('table', {
      name: /해수면, 평균 기온, 침수 도시/,
    })
    expect(table).toHaveTextContent('+0.29m')
    expect(screen.getAllByRole('row').length).toBeLessThanOrEqual(14)
  })
})
