import { ArrowDownUp, Search } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { Button } from './Button'
import { Card } from './Card'
import { Input } from './Input'
import { Select } from './Select'
import { EmptyState, Table } from './Table'
import { statusLabel } from './badge-utils'

export type DataTableColumn<T> = {
  key: keyof T | string
  title: string
  sortable?: boolean
  render?: (row: T) => ReactNode
}

export function DataTable<T extends { id: string }>({
  title,
  rows,
  columns,
  statusOptions = [],
  getSearchText,
  getStatus,
  actions,
}: {
  title: string
  rows: T[]
  columns: DataTableColumn<T>[]
  statusOptions?: string[]
  getSearchText: (row: T) => string
  getStatus?: (row: T) => string
  actions?: ReactNode
}) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortKey, setSortKey] = useState<string>('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const nextRows = rows.filter((row) => {
      const matchesSearch =
        !normalizedSearch || getSearchText(row).toLowerCase().includes(normalizedSearch)
      const matchesStatus = !status || getStatus?.(row) === status
      return matchesSearch && matchesStatus
    })

    if (!sortKey) return nextRows

    return [...nextRows].sort((left, right) => {
      const leftValue = String(left[sortKey as keyof T] ?? '')
      const rightValue = String(right[sortKey as keyof T] ?? '')
      return sortDir === 'asc'
        ? leftValue.localeCompare(rightValue)
        : rightValue.localeCompare(leftValue)
    })
  }, [getSearchText, getStatus, rows, search, sortDir, sortKey, status])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 lg:grid-cols-[1fr_280px_180px_120px_auto] lg:items-end">
        <div>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h2>
          <p className="text-sm text-slate-500">Поиск, фильтры, сортировка и пагинация</p>
        </div>
        <label className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск" />
        </label>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Все статусы</option>
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {statusLabel(option)}
            </option>
          ))}
        </Select>
        <Select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </Select>
        {actions}
      </Card>

      {visibleRows.length === 0 ? (
        <EmptyState title="Данные не найдены" />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr className="text-slate-500">
                {columns.map((column) => (
                  <th key={String(column.key)} className="border-b border-slate-200 p-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 font-semibold"
                      disabled={!column.sortable}
                      onClick={() => {
                        setSortKey(String(column.key))
                        setSortDir((value) => (value === 'asc' ? 'desc' : 'asc'))
                      }}
                    >
                      {column.title}
                      {column.sortable ? <ArrowDownUp className="h-3.5 w-3.5" /> : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  {columns.map((column) => (
                    <td key={String(column.key)} className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {column.render ? column.render(row) : String(row[column.key as keyof T] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
          Назад
        </Button>
        <span className="text-sm text-slate-500">
          {page} / {totalPages}
        </span>
        <Button type="button" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
          Далее
        </Button>
      </div>
    </div>
  )
}
