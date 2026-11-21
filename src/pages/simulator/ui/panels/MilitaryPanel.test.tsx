import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { militaryClock, useMilitary } from '../../model/military/store'
import { MilitaryPanel } from './MilitaryPanel'

const initial = useMilitary.getState()

beforeEach(() => {
  useMilitary.setState(initial, true)
  militaryClock.t = 0
})

describe('위성·군사 패널', () => {
  it('종류별 표시를 끄고 켠다', async () => {
    const user = userEvent.setup()
    render(<MilitaryPanel />)
    const fleets = screen.getByRole('checkbox', { name: '함대' })
    expect(fleets).toBeChecked()
    await user.click(fleets)
    expect(fleets).not.toBeChecked()
    expect(useMilitary.getState().layers.fleets).toBe(false)
    // 전체를 끄면 종류 선택은 쓸 수 없음
    await user.click(
      screen.getByRole('checkbox', { name: '지구에 위성·군사 표시' }),
    )
    expect(screen.getByRole('checkbox', { name: '군사 위성' })).toBeDisabled()
  })

  it('정지궤도 위성을 고르면 궤도·고도·주기를 보여 준다', async () => {
    const user = userEvent.setup()
    render(<MilitaryPanel />)
    await user.selectOptions(
      screen.getByRole('combobox', { name: '위성·편대·함대 고르기' }),
      'gk2a',
    )
    const card = screen.getByRole('region', { name: '천리안위성 2A호' })
    expect(within(card).getByText('정지궤도(GEO)')).toBeInTheDocument()
    expect(within(card).getByText('민간 · 기상')).toBeInTheDocument()
    // 궤도 고도와 지금 고도가 같음
    expect(within(card).getAllByText('35,786 km')).toHaveLength(2)
    expect(within(card).getByText('23시간 56분')).toBeInTheDocument()
    expect(within(card).getByText('0.0°N 128.2°E')).toBeInTheDocument()
    expect(useMilitary.getState().selectedId).toBe('gk2a')
  })

  it('몰니야 궤도는 근지점·원지점을 따로 적는다', async () => {
    const user = userEvent.setup()
    render(<MilitaryPanel />)
    await user.selectOptions(screen.getByRole('combobox'), 'molniya-1')
    expect(
      screen.getByText('근지점 600 km · 원지점 39,700 km'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('일반 유형 (위치·위상은 설명용)'),
    ).toBeInTheDocument()
  })

  it('편대를 고르면 대형과 전환을 상태로 알린다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<MilitaryPanel />)
    await user.selectOptions(screen.getByRole('combobox'), 'flight-gen5')
    expect(
      screen.getByText('5세대 스텔스 전투기 (F-22 · F-35 · J-20 · Su-57)'),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      '핑거 포 대형을 유지하며 선회 중',
    )
    // 화면 16초: 핑거 포(14초 유지) → 라인 어브레스트로 바꾸는 중
    militaryClock.t = 16
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(screen.getByRole('status')).toHaveTextContent(
      '핑거 포에서 라인 어브레스트(횡대)(으)로 대형 전환 중',
    )
    vi.useRealTimers()
  })

  it('함대는 구성과 속력을 보여 준다', async () => {
    const user = userEvent.setup()
    render(<MilitaryPanel />)
    await user.selectOptions(screen.getByRole('combobox'), 'fleet-sag')
    expect(screen.getByText(/전함 1 \(Iowa/)).toBeInTheDocument()
    expect(screen.getByText('22노트 · 41 km/h')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('종렬 진형')
  })
})
