import { useEffect, useSyncExternalStore } from 'react'
import { Link } from '@tanstack/react-router'
import { useLocale, useLocaleSync } from '@/shared/i18n'
import { ButtonIndicator, MessageScreen, buttonClasses } from '@/shared/ui'

const TEXT = {
  ko: {
    title: '페이지를 찾을 수 없습니다',
    description:
      '주소가 바뀌었거나 없는 페이지입니다. 처음 화면에서 지구를 다시 살펴보세요.',
    home: '처음 화면으로',
    tagline: '지구 환경·재해 대응 시뮬레이터',
  },
  en: {
    title: 'Page not found',
    description:
      'This address has moved or never existed. Head back to the start and explore the Earth again.',
    home: 'Back to start',
    tagline: 'Planetary climate & disaster simulator',
  },
} as const

const subscribeNothing = () => () => {}

/**
 * 본문이 빈 SPA 셸(GitHub Pages의 404.html)을 하이드레이션하는 중인지.
 * 서버 스냅숏은 하이드레이션 때 브라우저에서도 쓰이므로, 그때 받은 HTML에 본문(main)이 없으면
 * 비워 두어 서버 HTML과 맞추고, 하이드레이션이 끝나면 곧바로 화면을 그립니다.
 * 서버에서 그린 404(본문 있음)와 화면 이동으로 온 404는 처음부터 그립니다.
 */
function useHydratingEmptyShell(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => false,
    () => typeof document !== 'undefined' && !document.querySelector('main'),
  )
}

/** 없는 주소로 들어왔을 때 (GitHub Pages의 404.html도 이 화면을 그림) */
export function NotFoundPage() {
  useLocaleSync()
  const locale = useLocale((s) => s.locale)
  const text = TEXT[locale]
  const hydratingShell = useHydratingEmptyShell()
  useEffect(() => {
    document.title = `${text.title} · EARTH PLAN`
  }, [text])
  if (hydratingShell) return null
  return (
    <MessageScreen
      label="404"
      title={text.title}
      description={text.description}
      tagline={text.tagline}
    >
      <Link to="/" className={buttonClasses({ variant: 'primary' })}>
        <ButtonIndicator variant="primary" />
        {text.home}
      </Link>
    </MessageScreen>
  )
}
