import { useEffect } from 'react'

/** Sets document.title as "<title> — NetGenX" (Vercel guideline: accurate page titles). */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — NetGenX` : 'NetGenX — Report suspicious messages'
  }, [title])
}
