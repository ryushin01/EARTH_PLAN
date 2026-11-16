import { useEffect } from 'react'
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

/** 없는 주소로 들어왔을 때 (GitHub Pages의 404.html도 이 화면을 그림) */
export function NotFoundPage() {
  useLocaleSync()
  const locale = useLocale((s) => s.locale)
  const text = TEXT[locale]
  useEffect(() => {
    document.title = `${text.title} · EARTH PLAN`
  }, [text])
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
