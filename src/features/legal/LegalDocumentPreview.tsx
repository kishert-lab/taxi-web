import { marked } from 'marked'
import { useMemo } from 'react'

import { Card } from '../../shared/ui/Card'

export function LegalDocumentPreview({ content }: { content: string }) {
  const html = useMemo(() => marked.parse(content, { async: false }), [content])

  return (
    <Card>
      <div
        className="markdown-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Card>
  )
}
