import { marked } from 'marked'
import { useMemo } from 'react'

import { Card } from '../../shared/ui/Card'

function normalizeMarkdownContent(content: string) {
  return content
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
}

export function LegalDocumentPreview({ content }: { content: string }) {
  const html = useMemo(
    () => marked.parse(normalizeMarkdownContent(content), { async: false }),
    [content],
  )

  return (
    <Card>
      <div
        className="markdown-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Card>
  )
}
