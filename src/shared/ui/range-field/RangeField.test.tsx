import { fireEvent, render, screen } from '@testing-library/react'
import { RangeField } from './RangeField'

describe('RangeField', () => {
  it('레이블·값 설명·설명문을 연결한다', () => {
    const onChange = vi.fn()
    render(
      <RangeField
        label="해수면"
        value={2}
        min={0}
        max={10}
        onChange={onChange}
        valueText="+2 m"
        description="설명"
      />,
    )
    const slider = screen.getByRole('slider', { name: '해수면' })
    expect(slider).toHaveAttribute('aria-valuetext', '+2 m')
    expect(slider).toHaveAccessibleDescription('설명')
    fireEvent.change(slider, { target: { value: '5' } })
    expect(onChange).toHaveBeenCalledWith(5)
  })
})
