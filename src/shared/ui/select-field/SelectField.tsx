import { useId } from 'react'

export interface SelectOption {
  value: string
  label: string
  group?: string
}

interface SelectFieldProps {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  description?: string
}

/** 네이티브 select (그룹이 있으면 optgroup으로 묶음) */
export function SelectField({
  label,
  value,
  options,
  onChange,
  description,
}: SelectFieldProps) {
  const id = useId()
  const groups = [...new Set(options.map((o) => o.group ?? ''))]
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="label-caps">
        {label}
      </label>
      {/* 브라우저 기본 화살표는 위치를 맞출 수 없어 직접 그림.
          화살표와 칸 오른쪽 끝 사이 = 글자와 칸 왼쪽 끝 사이 (테두리 1px + 여백 12px) */}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={description ? `${id}-desc` : undefined}
          className="min-h-11 w-full appearance-none rounded-xs border border-line-strong bg-panel-solid py-0 pr-9 pl-3 text-sm text-ice hover:border-ice"
        >
          {groups.map((group) =>
            group ? (
              <optgroup key={group} label={group}>
                {options
                  .filter((o) => o.group === group)
                  .map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
              </optgroup>
            ) : (
              options
                .filter((o) => !o.group)
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))
            ),
          )}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="pointer-events-none absolute top-1/2 right-[calc(0.75rem+1px)] size-4 -translate-y-1/2 text-ice"
        >
          <path
            d="M3.5 6l4.5 4.5L12.5 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="square"
          />
        </svg>
      </div>
      {description ? (
        <p id={`${id}-desc`} className="text-xs leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
    </div>
  )
}
