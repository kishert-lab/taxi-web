import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Card } from '../../shared/ui/Card'
import { Skeleton } from '../../shared/ui/Loader'
import { getPublicLegalDocument } from './api'
import { LegalDocumentPreview } from './LegalDocumentPreview'

export function PublicLegalDocumentPage() {
  const params = useParams()
  const kind =
    params.kind === 'privacy-policy' || params.kind === 'consent'
      ? params.kind
      : 'terms'
  const document = useQuery({
    queryKey: ['public-legal', kind],
    queryFn: () => getPublicLegalDocument(kind),
  })

  return (
    <main className="mx-auto max-w-4xl p-4 md:p-8">
      {document.isLoading ? <Skeleton className="h-96" /> : null}
      {document.isError ? <Card className="text-red-700">{getApiErrorMessage(document.error)}</Card> : null}
      {document.data ? <LegalDocumentPreview content={document.data.content} /> : null}
    </main>
  )
}
