import { HeadContent, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import restFontsCss from '../styles/fonts/paperlogy-rest.css?url'
import { useReloadOnStaleBuild } from './useReloadOnStaleBuild'
import { useRestFonts } from './useRestFonts'

export function RootDocument({ children }: { children: ReactNode }) {
  useRestFonts(restFontsCss)
  useReloadOnStaleBuild()
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
