"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { RequirePermission } from "@/components/auth/require-permission"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { Column } from "@/components/ui/data-table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, User, FileText, Clock } from "lucide-react"
import { formatDate } from "@/lib/utils/format"

export type AuditLog = {
  id: string
  action: string
  entity: string
  entityId?: string
  oldData?: unknown
  newData?: unknown
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string | Date
  userId: string
  user?: {
    id: string
    name: string | null
    email: string | null
  }
}

const ACTION_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  CREATE: { label: "Tambah", variant: "default" },
  UPDATE: { label: "Ubah", variant: "secondary" },
  DELETE: { label: "Hapus", variant: "destructive" },
  LOGIN: { label: "Login", variant: "outline" },
  LOGOUT: { label: "Logout", variant: "outline" },
  STOCK_IN: { label: "Stok Masuk", variant: "default" },
  STOCK_OUT: { label: "Stok Keluar", variant: "secondary" },
  TRANSFER: { label: "Transfer", variant: "outline" },
  CREATE_POSTED: { label: "Tambah & Posting", variant: "default" },
  POST_TRANSFER: { label: "Posting Transfer", variant: "secondary" },
  RESTORE_TO_DRAFT: { label: "Restore Draft", variant: "outline" },
  CANCEL_TRANSFER: { label: "Cancel Transfer", variant: "destructive" },
}

const ENTITY_LABELS: Record<string, string> = {
  product: "Produk",
  category: "Kategori",
  warehouse: "Gudang",
  stock: "Stok",
  stockMovement: "Pergerakan Stok",
  transfer: "Transfer",
  user: "Pengguna",
  role: "Role",
  auth: "Autentikasi",
}

type Meta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function AuditLogList() {
  const { PERMISSIONS } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [entityFilter, setEntityFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  const pageSize = 10

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (actionFilter !== "all") params.set("action", actionFilter)
      if (entityFilter !== "all") params.set("entity", entityFilter)

      const res = await fetch(`/api/audit-logs?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      })
      if (!res.ok) {
        console.error("Failed to fetch audit logs")
        return
      }

      const json = await res.json()
      setLogs(json.data ?? [])
      setMeta(json.meta ?? null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, actionFilter, entityFilter])

  const filteredLogs = useMemo(() => {
    const term = search.toLowerCase()

    return logs.filter((log) => {
      const userName = log.user?.name || log.user?.email || "System"
      const descParts = [
        log.action,
        log.entity,
        log.entityId ?? "",
        JSON.stringify(log.oldData ?? {}),
        JSON.stringify(log.newData ?? {}),
      ]
      const matchesSearch =
        !term ||
        userName.toLowerCase().includes(term) ||
        descParts.join(" ").toLowerCase().includes(term)

      return matchesSearch
    })
  }, [logs, search])

  const columns: Column<AuditLog>[] = [
    {
      key: "createdAt",
      header: "Waktu",
      cell: (log) => (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {formatDate(log.createdAt)}
        </div>
      ),
    },
    {
      key: "user",
      header: "Pengguna",
      cell: (log) => {
        const name = log.user?.name || log.user?.email || "System"
        return (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{name}</span>
          </div>
        )
      },
    },
    {
      key: "action",
      header: "Aksi",
      cell: (log) => {
        const actionKey = log.action.toUpperCase()
        const actionInfo =
          ACTION_LABELS[actionKey] || ({ label: log.action, variant: "outline" } as const)
        return <Badge variant={actionInfo.variant}>{actionInfo.label}</Badge>
      },
    },
    {
      key: "entity",
      header: "Entitas",
      cell: (log) => {
        const label = ENTITY_LABELS[log.entity] || log.entity
        return (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>{label}</span>
          </div>
        )
      },
    },
    {
      key: "summary",
      header: "Ringkasan",
      cell: (log) => {
        const entityLabel = ENTITY_LABELS[log.entity] || log.entity
        const actionKey = log.action.toUpperCase()
        const actionLabel = ACTION_LABELS[actionKey]?.label || log.action
        return (
          <span className="text-sm text-muted-foreground">
            {actionLabel} {entityLabel}
            {log.entityId ? ` (#${log.entityId})` : ""}
          </span>
        )
      },
    },
    {
      key: "ipAddress",
      header: "IP Address",
      cell: (log) => (
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {log.ipAddress || "-"}
        </code>
      ),
    },
  ]

  return (
    <RequirePermission permission={PERMISSIONS.AUDIT_VIEW}>
      <div className="space-y-6">
        <PageHeader
          title="Audit Log"
          description="Riwayat semua aktivitas yang terjadi di sistem"
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari aktivitas, pengguna, atau detail perubahan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={actionFilter}
            onValueChange={(val) => {
              setPage(1)
              setActionFilter(val)
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter aksi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Aksi</SelectItem>
              {Object.entries(ACTION_LABELS).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={entityFilter}
            onValueChange={(val) => {
              setPage(1)
              setEntityFilter(val)
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter entitas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Entitas</SelectItem>
              {Object.entries(ENTITY_LABELS).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DataTable
          data={filteredLogs}
          columns={columns}
          isLoading={loading}
          emptyState={{ title: "Belum ada aktivitas tercatat" }}
          pagination={
            meta
              ? {
                page: meta.page,
                pageSize: meta.pageSize,
                total: meta.total,
                onPageChange: setPage,
              }
              : undefined      // ⬅ ganti null jadi undefined
          }
        />
      </div>
    </RequirePermission>
  )
}
