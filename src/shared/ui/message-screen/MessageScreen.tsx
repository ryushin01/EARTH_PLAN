import type { ReactNode } from 'react'

interface MessageScreenProps {
  /** 제목 위 작은 대문자 라벨 (예: 404) */
  label: string
  /** 페이지 제목 (h1) */
  title: string
  description: string
  /** 머리말의 한 줄 소개 */
  tagline: string
  /** 링크·버튼 */
  children: ReactNode
}

/** 없는 주소·오류처럼 한 가지 안내만 하는 전체 화면 (시뮬레이터와 같은 머리말·패널 모양) */
export function MessageScreen({
  label,
  title,
  description,
  tagline,
  children,
}: MessageScreenProps) {
  return (
    <div className="flex min-h-svh flex-col bg-space text-ice">
      <header className="px-4 pt-4">
        <p className="font-display text-2xl font-semibold uppercase leading-none tracking-[-0.03em]">
          Terra<span className="text-accent">Nova</span>
        </p>
        <p className="mt-1 text-xs text-muted">{tagline}</p>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <section
          aria-labelledby="message-title"
          className="grid w-full max-w-md gap-4 rounded-xs border border-line bg-panel p-6"
        >
          <p className="label-caps">{label}</p>
          <h1
            id="message-title"
            className="font-display text-2xl font-semibold tracking-[-0.02em] break-keep"
          >
            {title}
          </h1>
          <p className="text-sm leading-relaxed break-keep text-muted">
            {description}
          </p>
          <div className="flex flex-wrap gap-2">{children}</div>
        </section>
      </main>
    </div>
  )
}
