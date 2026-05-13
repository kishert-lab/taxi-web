import type { HTMLAttributes } from 'react'

import { cn } from '../utils/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

export function StatCard({
  title,
  value,
  description,
}: {
  title: string
  value: string | number
  description?: string
}) {
  return (
    <Card>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <div className="mt-3 text-2xl font-bold text-slate-950">{value}</div>
      {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
    </Card>
  )
}
