import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib'

type Variant = 'primary' | 'ghost' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'md' | 'sm'
  /** 앞쪽 작은 사각 표시 (아이콘 버튼은 끔) */
  indicator?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-black hover:bg-accent-strong disabled:bg-steel disabled:text-muted',
  ghost:
    'border border-line-strong text-ice hover:border-ice hover:text-accent disabled:text-muted disabled:border-line',
  danger:
    'bg-warn text-black hover:brightness-110 disabled:bg-steel disabled:text-muted',
}

/** 대문자 라벨 + 작은 사각 표시가 있는 각진 버튼 */
export function Button({
  variant = 'ghost',
  size = 'md',
  indicator = true,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'group inline-flex items-center justify-center gap-2 rounded-xs font-display font-semibold uppercase tracking-[0.04em] transition-colors disabled:cursor-not-allowed',
        size === 'md' ? 'min-h-11 px-4 text-sm' : 'min-h-9 px-3 text-xs',
        variants[variant],
        className,
      )}
      {...props}
    >
      {indicator ? (
        <span
          aria-hidden="true"
          className={cn(
            'size-1.5 shrink-0 transition-colors',
            variant === 'ghost'
              ? 'bg-muted group-hover:bg-accent'
              : 'bg-black/70',
          )}
        />
      ) : null}
      {children}
    </button>
  )
}
