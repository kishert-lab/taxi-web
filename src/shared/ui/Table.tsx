import type { TableHTMLAttributes } from 'react'

import { cn } from '../utils/cn'

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn('w-full border-separate border-spacing-0 text-left text-sm', className)}
        {...props}
      />
    </div>
  )
}

export function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
      {title}
    </div>
  )
}
