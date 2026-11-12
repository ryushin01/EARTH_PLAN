import { cn } from '@/shared/lib'

interface StatusMessageProps {
  message: string
  tone?: 'info' | 'error'
  className?: string
}

/** 결과를 알리는 상태 영역. 내용만 바뀌도록 항상 DOM에 둡니다 */
export function StatusMessage({
  message,
  tone = 'info',
  className,
}: StatusMessageProps) {
  return (
    <p
      role="status"
      className={cn(
        'min-h-5 text-sm leading-relaxed',
        tone === 'error' ? 'text-warn' : 'text-ice',
        className,
      )}
    >
      {message}
    </p>
  )
}
