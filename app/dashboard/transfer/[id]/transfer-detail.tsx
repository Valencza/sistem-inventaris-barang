"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle,
  ArrowRightLeft,
  Package,
  Warehouse,
  User,
  Calendar,
  XCircle,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Loading } from "@/components/ui/loading"
import { NotFoundState } from "@/components/ui/empty-state"
import { formatNumber, formatDateTime } from "@/lib/utils/format"
import { toast } from "sonner"
import type {
  StockTransfer,
  Warehouse as WarehouseType,
  Product,
  User as UserType,
} from "@/lib/types"

interface TransferDetailProps {
  transferId: string
}

type TransferDetailResponse = {
  data?: StockTransfer & {
    fromWarehouse?: WarehouseType
    toWarehouse?: WarehouseType
    createdBy?: UserType
    postedBy?: UserType
  }
  message?: string
} | any

type ProductsResponse = { products?: Product[]; data?: Product[]; message?: string } | any

type ConfirmMode = "post" | "cancel" | "delete" | "restore"

export function TransferDetail({ transferId }: TransferDetailProps) {
  const router = useRouter()

  const [transfer, setTransfer] = useState<
    (StockTransfer & {
      fromWarehouse?: WarehouseType
      toWarehouse?: WarehouseType
      createdByUser?: UserType
      postedByUser?: UserType
    }) | null
  >(null)
  const [products, setProducts] = useState<Product[]>([])
  const [confirmMode, setConfirmMode] = useState<ConfirmMode | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    try {
      setIsLoading(true)

      const [transferRes, prodRes] = await Promise.all([
        fetch(`/api/transfers/${transferId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
        fetch("/api/produk?isActive=true", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
      ])

      const [transferJson, prodJson] = await Promise.all([
        transferRes.json() as Promise<TransferDetailResponse>,
        prodRes.json() as Promise<ProductsResponse>,
      ])

      if (!transferRes.ok) {
        throw new Error(transferJson?.message || "Gagal memuat detail transfer")
      }
      if (!prodRes.ok) {
        throw new Error(prodJson?.message || "Gagal memuat produk")
      }

      const transferData = transferJson?.data
      if (!transferData) {
        setTransfer(null)
      } else {
        const normalized: StockTransfer & {
          fromWarehouse?: WarehouseType
          toWarehouse?: WarehouseType
          createdByUser?: UserType
          postedByUser?: UserType
        } = {
          ...transferData,
          fromWarehouse: (transferData as any).fromWarehouse,
          toWarehouse: (transferData as any).toWarehouse,
          createdByUser: (transferData as any).createdByUser ?? (transferData as any).createdBy,
          postedByUser: (transferData as any).postedByUser ?? (transferData as any).postedBy,
        }

        setTransfer(normalized)
      }

      const allProducts: Product[] = prodJson?.products ?? prodJson?.data ?? []
      setProducts(allProducts)
    } catch (error: any) {
      console.error("[TRANSFER_DETAIL_LOAD]", error)
      toast.error(error?.message || "Gagal memuat detail transfer")
      setTransfer(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [transferId])

  const openConfirm = (mode: ConfirmMode) => setConfirmMode(mode)

  const closeConfirm = () => {
    setConfirmMode(null)
  }

  const handlePostTransfer = async () => {
    if (!transfer) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/transfers/${transfer.id}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || "Gagal memposting transfer")
      toast.success("Transfer berhasil diposting")
      await loadData()
    } catch (error: any) {
      console.error("[TRANSFER_DETAIL_POST]", error)
      toast.error(error?.message || "Gagal memposting transfer")
    } finally {
      setIsLoading(false)
      closeConfirm()
    }
  }

  const handleCancelTransfer = async () => {
    if (!transfer) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/transfers/${transfer.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || "Gagal membatalkan transfer")
      toast.success("Transfer berhasil dibatalkan")
      await loadData()
    } catch (error: any) {
      console.error("[TRANSFER_DETAIL_CANCEL]", error)
      toast.error(error?.message || "Gagal membatalkan transfer")
    } finally {
      setIsLoading(false)
      closeConfirm()
    }
  }

  // RESTORE: CANCELLED -> DRAFT (tanpa mengubah stok)
  const handleRestoreToDraft = async () => {
    if (!transfer) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/transfers/${transfer.id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || "Gagal mengembalikan ke draft")
      toast.success("Transfer berhasil dikembalikan ke draft")
      await loadData()
    } catch (error: any) {
      console.error("[TRANSFER_DETAIL_RESTORE]", error)
      toast.error(error?.message || "Gagal mengembalikan ke draft")
    } finally {
      setIsLoading(false)
      closeConfirm()
    }
  }

  const handleDeleteTransfer = async () => {
    if (!transfer) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/transfers/${transfer.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || "Gagal menghapus transfer")
      toast.success("Transfer berhasil dihapus")
      router.push("/dashboard/transfer")
    } catch (error: any) {
      console.error("[TRANSFER_DETAIL_DELETE]", error)
      toast.error(error?.message || "Gagal menghapus transfer")
    } finally {
      setIsLoading(false)
      closeConfirm()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading text="Memuat detail transfer..." />
      </div>
    )
  }

  if (!transfer) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Detail Transfer"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Transfer", href: "/dashboard/transfer" },
            { label: "Detail" },
          ]}
        />
        <NotFoundState />
        <div className="text-center">
          <Button onClick={() => router.push("/dashboard/transfer")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Transfer
          </Button>
        </div>
      </div>
    )
  }

  const totalQuantity = transfer.items.reduce((sum, item) => sum + item.quantity, 0)
  const fromWarehouse = transfer.fromWarehouse
  const toWarehouse = transfer.toWarehouse
  const createdByUser = transfer.createdByUser
  const postedByUser = transfer.postedByUser

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
      ? "Apakah Anda yakin ingin memposting transfer ini? Stok akan dipindahkan sesuai item."
      : confirmMode === "cancel"
        ? "Apakah Anda yakin ingin membatalkan transfer ini?"
        : confirmMode === "delete"
          ? "Apakah Anda yakin ingin menghapus transfer ini? Tindakan ini tidak dapat dibatalkan."
          : confirmMode === "restore"
            ? "Apakah Anda yakin ingin mengembalikan transfer ini ke status draft?"
            : ""


  const handleConfirm = async () => {
    if (confirmMode === "post") return handlePostTransfer()
    if (confirmMode === "cancel") return handleCancelTransfer()
    if (confirmMode === "delete") return handleDeleteTransfer()
    if (confirmMode === "restore") return handleRestoreToDraft()
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title={`Transfer ${transfer.transferNumber}`}
        description={`Dibuat pada ${formatDateTime(transfer.createdAt)}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Transfer", href: "/dashboard/transfer" },
          { label: transfer.transferNumber },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>

            {transfer.status === "DRAFT" && (
              <>
                <Button onClick={() => openConfirm("post")} className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Post Transfer
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => openConfirm("cancel")}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Batalkan (Draft)
                </Button>
              </>
            )}

            {transfer.status === "POSTED" && (
              <Button
                variant="destructive"
                onClick={() => openConfirm("cancel")}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Batalkan (Posted)
              </Button>
            )}

            {transfer.status === "CANCELLED" && (
              <>
                <Button onClick={() => openConfirm("restore")} variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Kembalikan ke Draft
                </Button>
                <Button onClick={() => openConfirm("post")} className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Post Ulang
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => openConfirm("delete")}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus Permanen
                </Button>
              </>
            )}

          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transfer Route */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                Rute Transfer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 w-full p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Warehouse className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Gudang Asal</span>
                  </div>
                  <p className="font-semibold">{fromWarehouse?.name ?? "-"}</p>
                  <p className="text-sm text-muted-foreground">{fromWarehouse?.code ?? "-"}</p>
                </div>

                <ArrowRightLeft className="h-6 w-6 text-primary hidden sm:block" />

                <div className="flex-1 w-full p-4 rounded-lg bg-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Warehouse className="h-4 w-4 text-primary" />
                    <span className="text-sm text-primary">Gudang Tujuan</span>
                  </div>
                  <p className="font-semibold">{toWarehouse?.name ?? "-"}</p>
                  <p className="text-sm text-muted-foreground">{toWarehouse?.code ?? "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Item Transfer</CardTitle>
              <CardDescription>
                {transfer.items.length} produk, {formatNumber(totalQuantity)} unit total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Produk</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfer.items.map((item, index) => {
                      const product = products.find((p) => p.id === item.productId)
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="rounded-lg bg-muted p-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="font-medium">{product?.name || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {product?.sku ?? "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNumber(item.quantity)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {transfer.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Catatan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{transfer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBadge status={transfer.status} className="text-base px-4 py-1" />
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Dibuat oleh</p>
                  <p className="font-medium">{createdByUser?.name || "Unknown"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal dibuat</p>
                  <p className="font-medium">{formatDateTime(transfer.createdAt)}</p>
                </div>
              </div>

              {transfer.status === "POSTED" && (
                <>
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Diposting oleh</p>
                        <p className="font-medium">{postedByUser?.name || "Unknown"}</p>
                      </div>
                    </div>
                  </div>

                  {transfer.postedAt && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Tanggal posting</p>
                        <p className="font-medium">{formatDateTime(transfer.postedAt)}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Produk</span>
                <Badge variant="outline">{transfer.items.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Unit</span>
                <Badge variant="outline">{formatNumber(totalQuantity)}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={!!confirmMode}
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
