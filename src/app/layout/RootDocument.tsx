import { HeadContent, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import restFontsCss from '../styles/fonts/paperlogy-rest.css?url'
import { useRestFonts } from './useRestFonts'

export function RootDocument({ children }: { children: ReactNode }) {
  useRestFonts(restFontsCss)
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
