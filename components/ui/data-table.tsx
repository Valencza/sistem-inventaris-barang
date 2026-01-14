"use client"

import type React from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { EmptyState } from "./empty-state"
import { Loading } from "./loading"
import { Button } from "./button"

export interface Column<T> {
  key: string
  header: string
  cell: (item: T) => React.ReactNode
  className?: string
}

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  emptyState?: {
    title: string
    description?: string
  }
  onRowClick?: (item: T) => void
  className?: string
  pagination?: PaginationProps
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  isLoading,
  emptyState,
  onRowClick,
  className,
  pagination,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading text="Memuat data..." />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyState?.title || "Tidak ada data"}
        description={emptyState?.description}
      />
    )
  }

  const totalPages =
    pagination && pagination.pageSize > 0
      ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
      : 1

  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn("font-semibold", column.className)}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={item.id}
              className={cn(
                onRowClick && "cursor-pointer hover:bg-muted/50 transition-colors",
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.cell(item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
          <span className="text-muted-foreground">
            Halaman {pagination.page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
