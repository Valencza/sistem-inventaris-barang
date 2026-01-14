"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle,
  ArrowRightLeft,
  XCircle,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, type Column } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { formatDateTime, formatNumber } from "@/lib/utils/format"
import { toast } from "sonner"
import type {
  StockTransfer,
  Warehouse as WarehouseType,
  TransferStatus,
} from "@/lib/types"

interface TransferWithDetails extends StockTransfer {
  fromWarehouse?: WarehouseType
  toWarehouse?: WarehouseType
  totalItems: number
  totalQuantity: number
}

type ApiListResponse<T> = { data?: T; meta?: any; message?: string } | any
type ConfirmMode = "post" | "cancel" | "delete" | "restore"

type Meta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function TransferList() {
  const router = useRouter()

  const [transfers, setTransfers] = useState<TransferWithDetails[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<TransferStatus | "all">("all")
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null)
  const [confirmMode, setConfirmMode] = useState<ConfirmMode | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [meta, setMeta] = useState<Meta | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const loadData = async (pageArg = page) => {
    try {
      setIsLoading(true)

      const params = new URLSearchParams()
      params.set("page", String(pageArg))
      params.set("pageSize", String(pageSize))
      if (statusFilter !== "all") params.set("status", statusFilter)
      // kalau mau search di server, bisa tambahkan params.set("search", search)

      const [transferRes, whRes] = await Promise.all([
        fetch(`/api/transfers?${params.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
        fetch("/api/gudang", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
      ])

      const [transferJson, whJson] = await Promise.all([
        transferRes.json() as Promise<ApiListResponse<StockTransfer[]>>,
        whRes.json() as Promise<ApiListResponse<WarehouseType[]>>,
      ])

      if (!transferRes.ok) throw new Error(transferJson?.message || "Gagal memuat transfer")
      if (!whRes.ok) throw new Error(whJson?.message || "Gagal memuat gudang")

      const pageTransfers: StockTransfer[] = transferJson?.data ?? []
      const allWarehouses: WarehouseType[] = (whJson?.data ?? []).filter(
        (w: WarehouseType) => w.isActive,
      )

      const transfersWithDetails: TransferWithDetails[] = pageTransfers.map((t) => ({
        ...t,
        fromWarehouse: allWarehouses.find((w) => w.id === t.fromWarehouseId),
        toWarehouse: allWarehouses.find((w) => w.id === t.toWarehouseId),
        totalItems: t.items?.length ?? 0,
        totalQuantity: (t.items ?? []).reduce(
          (sum, it) => sum + (it.quantity ?? 0),
          0,
        ),
      }))

      setTransfers(transfersWithDetails)
      setWarehouses(allWarehouses)

      setMeta(
        transferJson.meta ?? {
          page: pageArg,
          pageSize,
          total: transfersWithDetails.length,
          totalPages: 1,
        },
      )
    } catch (error: any) {
      console.error("[TRANSFER_LIST_LOAD]", error)
      toast.error(error?.message || "Gagal memuat data transfer")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData(1)
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  // jika ingin search di client‑side saja (di atas page saat ini)
  const filteredTransfers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return transfers

    return transfers.filter((t) => {
      return (
        t.transferNumber?.toLowerCase().includes(q) ||
        t.fromWarehouse?.name?.toLowerCase().includes(q) ||
        t.toWarehouse?.name?.toLowerCase().includes(q)
      )
    })
  }, [transfers, search])

  const openConfirm = (mode: ConfirmMode, transfer: StockTransfer) => {
    setSelectedTransfer(transfer)
    setConfirmMode(mode)
  }

  const closeConfirm = () => {
    setSelectedTransfer(null)
    setConfirmMode(null)
  }

  const handlePost = async () => {
    if (!selectedTransfer) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/transfers/${selectedTransfer.id}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || "Gagal memposting transfer")
      toast.success("Transfer berhasil diposting")
      await loadData()
    } catch (error: any) {
      console.error("[TRANSFER_POST]", error)
      toast.error(error?.message || "Gagal memposting transfer")
    } finally {
      closeConfirm()
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!selectedTransfer) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/transfers/${selectedTransfer.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || "Gagal membatalkan transfer")
      toast.success("Transfer berhasil dibatalkan")
      await loadData()
    } catch (error: any) {
      console.error("[TRANSFER_CANCEL]", error)
      toast.error(error?.message || "Gagal membatalkan transfer")
    } finally {
      closeConfirm()
      setIsLoading(false)
    }
  }

  const handleRestore = async () => {
    if (!selectedTransfer) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/transfers/${selectedTransfer.id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || "Gagal mengembalikan ke draft")
      toast.success("Transfer berhasil dikembalikan ke draft")
      await loadData()
    } catch (error: any) {
      console.error("[TRANSFER_RESTORE]", error)
      toast.error(error?.message || "Gagal mengembalikan ke draft")
    } finally {
      closeConfirm()
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTransfer) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/transfers/${selectedTransfer.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || "Gagal menghapus transfer")
      toast.success("Transfer berhasil dihapus")
      await loadData()
    } catch (error: any) {
      console.error("[TRANSFER_DELETE]", error)
      toast.error(error?.message || "Gagal menghapus transfer")
    } finally {
      closeConfirm()
      setIsLoading(false)
    }
  }

  const columns: Column<TransferWithDetails>[] = [
    {
      key: "transferNumber",
      header: "No. Transfer",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium font-mono">{item.transferNumber}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(item.createdAt)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "route",
      header: "Rute Transfer",
      cell: (item) => (
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-medium">{item.fromWarehouse?.name ?? "-"}</p>
            <p className="text-xs text-muted-foreground">
              {item.fromWarehouse?.code ?? "-"}
            </p>
          </div>
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">{item.toWarehouse?.name ?? "-"}</p>
            <p className="text-xs text-muted-foreground">
              {item.toWarehouse?.code ?? "-"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "items",
      header: "Items",
      cell: (item) => (
        <div>
          <p className="font-medium">{formatNumber(item.totalItems)} produk</p>
          <p className="text-xs text-muted-foreground">
            {formatNumber(item.totalQuantity)} unit
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "actions",
      header: "",
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Aksi</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              asChild
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <Link href={`/dashboard/transfer/${item.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Lihat Detail
              </Link>
            </DropdownMenuItem>

            {item.status === "DRAFT" && (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openConfirm("post", item)
                  }}
                  className="text-primary"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Post Transfer
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openConfirm("cancel", item)
                  }}
                  className="text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Batalkan (Draft)
                </DropdownMenuItem>
              </>
            )}

            {item.status === "POSTED" && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  openConfirm("cancel", item)
                }}
                className="text-destructive"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Batalkan (Posted)
              </DropdownMenuItem>
            )}

            {item.status === "CANCELLED" && (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openConfirm("restore", item)
                  }}
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Kembalikan ke Draft
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openConfirm("post", item)
                  }}
                  className="text-primary"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Post Ulang
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openConfirm("delete", item)
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hapus Permanen
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ]

  const draftCount = transfers.filter((t) => t.status === "DRAFT").length
  const postedCount = transfers.filter((t) => t.status === "POSTED").length
  const cancelledCount = transfers.filter((t) => t.status === "CANCELLED").length

  const confirmTitle =
    confirmMode === "post"
      ? "Post Transfer"
      : confirmMode === "cancel"
      ? "Batalkan Transfer"
      : confirmMode === "delete"
      ? "Hapus Transfer"
      : confirmMode === "restore"
      ? "Kembalikan ke Draft"
      : ""

  const confirmDesc =
    confirmMode === "post"
      ? `Apakah Anda yakin ingin memposting transfer ${selectedTransfer?.transferNumber}? Stok akan dipindahkan sesuai item.`
      : confirmMode === "cancel"
      ? `Apakah Anda yakin ingin membatalkan transfer ${selectedTransfer?.transferNumber}?`
      : confirmMode === "delete"
      ? `Apakah Anda yakin ingin menghapus transfer ${selectedTransfer?.transferNumber}? Tindakan ini tidak dapat dibatalkan.`
      : confirmMode === "restore"
      ? `Apakah Anda yakin ingin mengembalikan transfer ${selectedTransfer?.transferNumber} ke status draft?`
      : ""

  const handleConfirm = async () => {
    if (confirmMode === "post") return handlePost()
    if (confirmMode === "cancel") return handleCancel()
    if (confirmMode === "delete") return handleDelete()
    if (confirmMode === "restore") return handleRestore()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transfer Stok"
        description="Kelola transfer stok antar gudang"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Transfer" }]}
        actions={
          <Link href="/dashboard/transfer/tambah">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Buat Transfer
            </Button>
          </Link>
        }
      />

      <div className="flex gap-4">
        <Badge variant="secondary" className="text-sm py-1 px-3">
          Draft: {draftCount}
        </Badge>
        <Badge variant="default" className="text-sm py-1 px-3">
          Posted: {postedCount}
        </Badge>
        <Badge variant="outline" className="text-sm py-1 px-3">
          Cancelled: {cancelledCount}
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor transfer atau gudang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as TransferStatus | "all")}
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="POSTED">Posted</SelectItem>
            <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredTransfers}
        isLoading={isLoading}
        emptyState={{
          title: "Belum ada transfer",
          description: "Mulai dengan membuat transfer stok pertama",
        }}
        onRowClick={(item) => router.push(`/dashboard/transfer/${item.id}`)}
        pagination={
          meta
            ? {
                page: meta.page,
                pageSize: meta.pageSize,
                total: meta.total,
                onPageChange: (p) => {
                  setPage(p)
                  void loadData(p)
                },
              }
            : undefined
        }
      />

      <ConfirmDialog
        open={!!confirmMode && !!selectedTransfer}
        onOpenChange={closeConfirm}
        title={confirmTitle}
        description={confirmDesc}
        confirmLabel={
          confirmMode === "post"
            ? "Post Transfer"
            : confirmMode === "cancel"
            ? "Batalkan"
            : confirmMode === "delete"
            ? "Hapus"
            : confirmMode === "restore"
            ? "Kembalikan ke Draft"
            : "OK"
        }
        onConfirm={handleConfirm}
      />
    </div>
  )
}
