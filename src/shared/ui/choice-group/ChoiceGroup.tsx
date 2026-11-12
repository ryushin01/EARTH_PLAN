import { useId } from 'react'
import { cn } from '@/shared/lib'

export interface Choice<T extends string> {
  value: T
  label: string
  hint?: string
}

interface ChoiceGroupProps<T extends string> {
  legend: string
  value: T
  choices: Array<Choice<T>>
  onChange: (value: T) => void
  columns?: 1 | 2 | 3 | 4 | 5
  /** 범례를 화면에서 숨김 (접근 이름은 유지) */
  hideLegend?: boolean
}

/** fieldset + 라디오 버튼 묶음 */
export function ChoiceGroup<T extends string>({
  legend,
  value,
  choices,
  onChange,
  columns = 2,
  hideLegend = false,
}: ChoiceGroupProps<T>) {
  const name = useId()
  const cols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
  }[columns]
  return (
    <fieldset className="grid gap-2">
      <legend className={cn('label-caps mb-2', hideLegend && 'sr-only')}>
        {legend}
      </legend>
      <div className={cn('grid gap-1.5', cols)}>
        {choices.map((choice) => {
          const checked = choice.value === value
          return (
            <label
              key={choice.value}
              className={cn(
                'flex min-h-11 cursor-pointer flex-col justify-center rounded-xs border px-3 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent',
                checked
                  ? 'border-accent bg-accent/10 text-ice'
                  : 'border-line text-muted hover:border-line-strong hover:text-ice',
              )}
            >
              <input
                type="radio"
                name={name}
                value={choice.value}
                checked={checked}
                onChange={() => onChange(choice.value)}
                className="sr-only"
              />
              <span className="text-sm font-semibold">{choice.label}</span>
              {choice.hint ? (
                <span className="text-xs text-muted">{choice.hint}</span>
              ) : null}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
