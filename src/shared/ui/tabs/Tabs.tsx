import { useId, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/shared/lib'

export interface TabItem {
  id: string
  label: string
  content: ReactNode
}

interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  /** 탭 목록의 접근 이름 */
  label: string
  className?: string
}

/** WAI-ARIA APG 탭 패턴 (자동 활성화, 화살표·Home·End 이동, roving tabindex) */
export function Tabs({ items, value, onChange, label, className }: TabsProps) {
  const baseId = useId()
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const tabId = (id: string) => `${baseId}-tab-${id}`
  const panelId = (id: string) => `${baseId}-panel-${id}`

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = items.findIndex((item) => item.id === value)
    let next = current
    switch (event.key) {
      case 'ArrowRight':
        next = (current + 1) % items.length
        break
      case 'ArrowLeft':
        next = (current - 1 + items.length) % items.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = items.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    onChange(items[next].id)
    tabRefs.current[next]?.focus()
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="grid border-b border-line"
        style={{
          gridTemplateColumns: `repeat(${items.length > 4 ? Math.ceil(items.length / 2) : items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item, index) => {
          const selected = item.id === value
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              type="button"
              role="tab"
              id={tabId(item.id)}
              aria-selected={selected}
              aria-controls={panelId(item.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.id)}
              className={cn(
                'relative min-h-11 px-2 font-display text-sm font-semibold uppercase tracking-[0.04em] transition-colors',
                selected ? 'text-ice' : 'text-muted hover:text-ice',
              )}
            >
              {item.label}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-2 -bottom-px h-0.5 transition-colors',
                  selected ? 'bg-accent' : 'bg-transparent',
                )}
              />
            </button>
          )
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={panelId(item.id)}
          aria-labelledby={tabId(item.id)}
          tabIndex={0}
          hidden={item.id !== value}
          className="pt-4 focus-visible:outline-offset-4"
        >
          {item.content}
        </div>
      ))}
    </div>
  )
}
