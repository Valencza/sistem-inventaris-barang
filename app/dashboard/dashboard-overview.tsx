"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Package,
  Warehouse as WarehouseIcon,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  BarChart3,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { PageHeader } from "@/components/ui/page-header"
import { Loading } from "@/components/ui/loading"
import { formatCurrency, formatNumber, formatRelativeTime } from "@/lib/utils/format"
import type { StockMovement, StockTransfer } from "@/lib/types"
import { useAuth } from "@/lib/hooks/use-auth"
import { toast } from "sonner"

interface LowStockProduct {
  id: string
  name: string
  sku: string
  minStock: number
  totalStock: number
}

interface StockByWarehouse {
  id: string
  name: string
  code: string
  stock: number
}

interface DashboardData {
  totalProducts: number
  totalWarehouses: number
  totalStock: number
  totalValue: number
  lowStockProducts: LowStockProduct[]
  recentMovements: StockMovement[]
  pendingTransfers: StockTransfer[]
  stockByWarehouse: StockByWarehouse[]
}

export function DashboardOverview() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true)
        const res = await fetch("/api/dashboard/overview", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.message || "Gagal memuat dashboard")
        setData(json.data as DashboardData)
      } catch (error: any) {
        console.error("[DASHBOARD_OVERVIEW_LOAD]", error)
        toast.error(error?.message || "Gagal memuat dashboard")
      } finally {
        setIsLoading(false)
      }
    }

    void loadDashboardData()
  }, [])

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading text="Memuat dashboard..." />
      </div>
    )
  }

  const firstName = user?.name?.split(" ")[0] ?? "User"
  const maxStock =
    data.stockByWarehouse.length > 0
      ? Math.max(...data.stockByWarehouse.map((w) => w.stock))
      : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Selamat datang, ${firstName}!`}
        description="Berikut ringkasan inventaris bisnis Anda hari ini."
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Produk" value={formatNumber(data.totalProducts)} icon={Package} />
        <StatCard title="Gudang Aktif" value={formatNumber(data.totalWarehouses)} icon={WarehouseIcon} />
        <StatCard title="Total Unit Stok" value={formatNumber(data.totalStock)} icon={BarChart3} />
        <StatCard title="Nilai Inventaris" value={formatCurrency(data.totalValue)} icon={TrendingUp} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock Alert */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Stok Rendah
              </CardTitle>
              <CardDescription>Produk dengan stok di bawah minimum</CardDescription>
            </div>
            <Link href="/dashboard/stok">
              <Button variant="ghost" size="sm" className="gap-1">
                Lihat Semua
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.lowStockProducts.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Tidak ada produk dengan stok rendah
              </p>
            ) : (
              <div className="space-y-3">
                {data.lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-destructive/10 p-2">
                        <Package className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="text-xs">
                        {formatNumber(product.totalStock)} / {formatNumber(product.minStock)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Transfers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                Transfer Pending
              </CardTitle>
              <CardDescription>Transfer stok yang belum diposting</CardDescription>
            </div>
            <Link href="/dashboard/transfer">
              <Button variant="ghost" size="sm" className="gap-1">
                Lihat Semua
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.pendingTransfers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Tidak ada transfer pending
              </p>
            ) : (
              <div className="space-y-3">
                {data.pendingTransfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <ArrowRightLeft className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{transfer.transferNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {transfer.fromWarehouseId} → {transfer.toWarehouseId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        Draft
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRelativeTime(transfer.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock by Warehouse */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <WarehouseIcon className="h-5 w-5 text-primary" />
              Distribusi Stok per Gudang
            </CardTitle>
            <CardDescription>Jumlah unit stok di setiap gudang</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.stockByWarehouse.map((wh) => (
                <div key={wh.id} className="space-y-2 rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{wh.name}</span>
                    <Badge variant="outline">{formatNumber(wh.stock)} unit</Badge>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width:
                          maxStock > 0
                            ? `${Math.min((wh.stock / maxStock) * 100, 100)}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Aktivitas Terbaru</CardTitle>
              <CardDescription>Pergerakan stok terbaru</CardDescription>
            </div>
            <Link href="/dashboard/stok">
              <Button variant="ghost" size="sm" className="gap-1">
                Lihat Semua
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentMovements.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Belum ada aktivitas
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentMovements.map((movement) => {
                  const isIncoming =
                    movement.type === "IN" || movement.type === "TRANSFER_IN"

                  return (
                    <div
                      key={movement.id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-lg p-2 ${
                            isIncoming ? "bg-green-500/10" : "bg-red-500/10"
                          }`}
                        >
                          {isIncoming ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {movement.productId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {movement.warehouseId} • {movement.type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={isIncoming ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {isIncoming ? "+" : "-"}
                          {formatNumber(movement.quantity)}
                        </Badge>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatRelativeTime(movement.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aksi Cepat</CardTitle>
          <CardDescription>
            Shortcut untuk tugas yang sering dilakukan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/produk/tambah">
              <Button
                variant="outline"
                className="h-auto w-full justify-start gap-2 bg-transparent py-3"
              >
                <Package className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Tambah Produk</p>
                  <p className="text-xs text-muted-foreground">
                    Daftarkan produk baru
                  </p>
                </div>
              </Button>
            </Link>
            <Link href="/dashboard/stok/masuk">
              <Button
                variant="outline"
                className="h-auto w-full justify-start gap-2 bg-transparent py-3"
              >
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <p className="font-medium">Stok Masuk</p>
                  <p className="text-xs text-muted-foreground">
                    Catat penerimaan stok
                  </p>
                </div>
              </Button>
            </Link>
            <Link href="/dashboard/stok/keluar">
              <Button
                variant="outline"
                className="h-auto w-full justify-start gap-2 bg-transparent py-3"
              >
                <TrendingDown className="h-5 w-5 text-red-600" />
                <div className="text-left">
                  <p className="font-medium">Stok Keluar</p>
                  <p className="text-xs text-muted-foreground">
                    Catat pengeluaran stok
                  </p>
                </div>
              </Button>
            </Link>
            <Link href="/dashboard/transfer/tambah">
              <Button
                variant="outline"
                className="h-auto w-full justify-start gap-2 bg-transparent py-3"
              >
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Transfer Stok</p>
                  <p className="text-xs text-muted-foreground">
                    Pindahkan antar gudang
                  </p>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
