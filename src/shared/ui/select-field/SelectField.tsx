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
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={description ? `${id}-desc` : undefined}
        className="min-h-11 w-full rounded-xs border border-line-strong bg-panel-solid px-3 text-sm text-ice hover:border-ice"
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
      {description ? (
        <p id={`${id}-desc`} className="text-xs leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
    </div>
  )
}
