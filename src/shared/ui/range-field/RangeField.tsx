import { useId } from 'react'
import type { ReactNode } from 'react'

interface RangeFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** 화면에 보이는 값 (예: "+1.2 m") */
  valueText: string
  description?: ReactNode
}

/** 레이블·현재 값·설명이 연결된 범위 입력 */
export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  valueText,
  description,
}: RangeFieldProps) {
  const id = useId()
  const descId = `${id}-desc`
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label-caps">
          {label}
        </label>
        {/* 값은 aria-valuetext로 전달하므로 output(암묵적 status)을 쓰지 않음 */}
        <span aria-hidden="true" className="display-num text-lg text-ice">
          {valueText}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText}
        aria-describedby={description ? descId : undefined}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full cursor-pointer accent-accent"
      />
      {description ? (
        <p id={descId} className="text-xs leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
    </div>
  )
}
