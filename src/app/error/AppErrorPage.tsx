import { useEffect } from 'react'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { useLocale, useLocaleSync } from '@/shared/i18n'
import {
  Button,
  ButtonIndicator,
  MessageScreen,
  buttonClasses,
} from '@/shared/ui'

const TEXT = {
  ko: {
    title: '문제가 생겼습니다',
    description:
      '화면을 그리다가 오류가 났습니다. 다시 시도하거나 처음 화면으로 돌아가세요. 계속되면 새로고침해 주세요.',
    retry: '다시 시도',
    home: '처음 화면으로',
    tagline: '지구 환경·재해 대응 시뮬레이터',
  },
  en: {
    title: 'Something went wrong',
    description:
      'An error occurred while drawing this screen. Try again or go back to the start. If it keeps happening, reload the page.',
    retry: 'Try again',
    home: 'Back to start',
    tagline: 'Planetary climate & disaster simulator',
  },
} as const

/** 화면 코드에서 예외가 나면 빈 화면 대신 보여 줌 (라우터의 기본 오류 화면) */
export function AppErrorPage({ error, reset }: ErrorComponentProps) {
  useLocaleSync()
  const locale = useLocale((s) => s.locale)
  const text = TEXT[locale]
  useEffect(() => {
    // 원인을 찾을 수 있게 콘솔에는 남김
    console.error(error)
  }, [error])
  useEffect(() => {
    document.title = `${text.title} · TerraNova`
  }, [text])
  return (
    <MessageScreen
      label="Error"
      title={text.title}
      description={text.description}
      tagline={text.tagline}
    >
      <Button variant="primary" onClick={reset}>
        {text.retry}
      </Button>
      {/* 앱 상태를 처음부터 다시 만들도록 라우터 링크가 아닌 문서 이동으로 */}
      <a href={import.meta.env.BASE_URL} className={buttonClasses()}>
        <ButtonIndicator />
        {text.home}
      </a>
    </MessageScreen>
  )
}
