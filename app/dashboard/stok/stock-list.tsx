"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Search,
  Package,
  TrendingUp,
  TrendingDown,
  Warehouse as WarehouseIcon,
  AlertTriangle,
  Filter,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, type Column } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatNumber, formatDateTime } from "@/lib/utils/format"
import { toast } from "sonner"
import type {
  Product,
  Warehouse as WarehouseType,
  Stock as StockType,
  StockMovement as StockMovementType,
} from "@/lib/types"

interface StockWithDetails extends StockType {
  product?: Product
  warehouse?: WarehouseType
  isLowStock: boolean
}

interface MovementWithDetails extends StockMovementType {
  product?: Product
  warehouse?: WarehouseType
}

type Meta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function StockList() {
  const [stocks, setStocks] = useState<StockWithDetails[]>([])
  const [movements, setMovements] = useState<MovementWithDetails[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([])
  const [search, setSearch] = useState("")
  const [warehouseFilter, setWarehouseFilter] = useState("all")
  const [showLowStock, setShowLowStock] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [stockMeta, setStockMeta] = useState<Meta | null>(null)
  const [movementMeta, setMovementMeta] = useState<Meta | null>(null)

  const [stockPage, setStockPage] = useState(1)
  const [movementPage, setMovementPage] = useState(1)
  const pageSize = 10

  // reset halaman saat filter berubah
  useEffect(() => {
    setStockPage(1)
    setMovementPage(1)
  }, [search, warehouseFilter, showLowStock])

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        const paramsStok = new URLSearchParams()
        paramsStok.set("page", String(stockPage))
        paramsStok.set("pageSize", String(pageSize))
        if (search) paramsStok.set("search", search)
        if (warehouseFilter !== "all")
          paramsStok.set("warehouseId", warehouseFilter)

        const paramsMov = new URLSearchParams()
        paramsMov.set("page", String(movementPage))
        paramsMov.set("pageSize", String(pageSize))
        if (search) paramsMov.set("search", search)
        if (warehouseFilter !== "all")
          paramsMov.set("warehouseId", warehouseFilter)

        const [stockRes, movementRes, whRes] = await Promise.all([
          fetch(`/api/stok?${paramsStok.toString()}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }),
          fetch(`/api/stock-movements?${paramsMov.toString()}`, {
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

        const [stockJson, movementJson, whJson] = await Promise.all([
          stockRes.json(),
          movementRes.json(),
          whRes.json(),
        ])

        if (!stockRes.ok)
          throw new Error(stockJson.message || "Gagal memuat stok")
        if (!movementRes.ok)
          throw new Error(
            movementJson.message || "Gagal memuat riwayat stok",
          )
        if (!whRes.ok)
          throw new Error(whJson.message || "Gagal memuat gudang")

        const allWarehouses: WarehouseType[] = (whJson.data ?? []).filter(
          (w: WarehouseType) => w.isActive,
        )

        // API stok sudah include product & warehouse
        const pageStocks: (StockType & {
          product?: Product
          warehouse?: WarehouseType
        })[] = stockJson.data ?? []

        // API movement sebaiknya juga include, tapi fallback ke allWarehouses
        const pageMovements: (StockMovementType & {
          product?: Product
          warehouse?: WarehouseType
        })[] = movementJson.data ?? []

        const stocksWithDetails: StockWithDetails[] = pageStocks.map(
          (stock) => {
            const product = stock.product
            const warehouse =
              stock.warehouse ??
              allWarehouses.find((w) => w.id === stock.warehouseId)
            return {
              ...stock,
              product,
              warehouse,
              isLowStock: product
                ? stock.quantity <= product.minStock
                : false,
            }
          },
        )

        const movementsWithDetails: MovementWithDetails[] = pageMovements.map(
          (movement) => ({
            ...movement,
            product: movement.product,
            warehouse:
              movement.warehouse ??
              allWarehouses.find((w) => w.id === movement.warehouseId),
          }),
        )

        setStocks(stocksWithDetails)
        setMovements(movementsWithDetails)
        setWarehouses(allWarehouses)

        setStockMeta(
          stockJson.meta ?? {
            page: stockPage,
            pageSize,
            total: stocksWithDetails.length,
            totalPages: 1,
          },
        )
        setMovementMeta(
          movementJson.meta ?? {
            page: movementPage,
            pageSize,
            total: movementsWithDetails.length,
            totalPages: 1,
          },
        )
      } catch (error: any) {
        console.error("[STOCK_LIST_LOAD]", error)
        toast.error(error.message || "Gagal memuat data stok")
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [stockPage, movementPage, search, warehouseFilter, showLowStock])

  // filter low stock hanya di FE
  const filteredStocks = useMemo(() => {
    if (!showLowStock) return stocks
    return stocks.filter((s) => s.isLowStock)
  }, [stocks, showLowStock])

  const lowStockCount = useMemo(
    () => stocks.filter((s) => s.isLowStock).length,
    [stocks],
  )

  const stockColumns: Column<StockWithDetails>[] = [
    {
      key: "product",
      header: "Produk",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{item.product?.name || "Unknown"}</p>
            <p className="text-xs text-muted-foreground">
              SKU: {item.product?.sku || "-"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "warehouse",
      header: "Gudang",
      cell: (item) => (
        <div className="flex items-center gap-2">
          <WarehouseIcon className="h-4 w-4 text-muted-foreground" />
          <span>{item.warehouse?.name || "Unknown"}</span>
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Stok",
      cell: (item) => (
        <div className="space-y-1">
          <span className="text-lg font-bold">
            {formatNumber(item.quantity)}
          </span>
          {item.product && (
            <p className="text-xs text-muted-foreground">
              Min: {formatNumber(item.product.minStock)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => (
        <Badge variant={item.isLowStock ? "destructive" : "default"}>
          {item.isLowStock ? "Stok Rendah" : "Normal"}
        </Badge>
      ),
    },
    {
      key: "updatedAt",
      header: "Terakhir Update",
      cell: (item) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(item.updatedAt)}
        </span>
      ),
    },
  ]

  const movementColumns: Column<MovementWithDetails>[] = [
    {
      key: "createdAt",
      header: "Waktu",
      cell: (item) => (
        <span className="text-sm">{formatDateTime(item.createdAt)}</span>
      ),
    },
    {
      key: "type",
      header: "Tipe",
      cell: (item) => <StatusBadge status={item.type} />,
    },
    {
      key: "product",
      header: "Produk",
      cell: (item) => (
        <div>
          <p className="font-medium">{item.product?.name || "Unknown"}</p>
          <p className="text-xs text-muted-foreground">
            SKU: {item.product?.sku || "-"}
          </p>
        </div>
      ),
    },
    {
      key: "warehouse",
      header: "Gudang",
      cell: (item) => <span>{item.warehouse?.name || "Unknown"}</span>,
    },
    {
      key: "quantity",
      header: "Perubahan",
      cell: (item) => {
        const isIncoming =
          item.type === "IN" ||
          item.type === "TRANSFER_IN" ||
          item.type === "ADJUSTMENT"
        return (
          <div className="flex items-center gap-2">
            {isIncoming ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={isIncoming ? "text-green-600" : "text-red-600"}>
              {isIncoming ? "+" : "-"}
              {formatNumber(item.quantity)}
            </span>
          </div>
        )
      },
    },
    {
      key: "result",
      header: "Hasil",
      cell: (item) => (
        <span className="text-muted-foreground">
          {formatNumber(item.previousQty)} → {formatNumber(item.newQty)}
        </span>
      ),
    },
    {
      key: "notes",
      header: "Catatan",
      cell: (item) => (
        <span className="text-sm text-muted-foreground line-clamp-1">
          {item.notes || "-"}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stok"
        description="Kelola stok produk per gudang dan lihat riwayat pergerakan"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Stok" },
        ]}
        actions={
          <div className="flex gap-2">
            <Link href="/dashboard/stok/masuk">
              <Button variant="outline" className="gap-2 bg-transparent">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Stok Masuk
              </Button>
            </Link>
            <Link href="/dashboard/stok/keluar">
              <Button variant="outline" className="gap-2 bg-transparent">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Stok Keluar
              </Button>
            </Link>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Unit Stok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatNumber(stocks.reduce((sum, s) => sum + s.quantity, 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Produk di Stok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Set(stocks.map((s) => s.productId)).size}
            </p>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {lowStockCount > 0 && (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
              Stok Rendah
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                lowStockCount > 0 ? "text-destructive" : ""
              }`}
            >
              {lowStockCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari produk atau SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={warehouseFilter}
          onValueChange={(val) => setWarehouseFilter(val)}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Pilih Gudang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Gudang</SelectItem>
            {warehouses.map((wh) => (
              <SelectItem key={wh.id} value={wh.id}>
                {wh.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showLowStock ? "default" : "outline"}
          onClick={() => setShowLowStock(!showLowStock)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Stok Rendah
          {lowStockCount > 0 && (
            <Badge variant="secondary">{lowStockCount}</Badge>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stok Saat Ini</TabsTrigger>
          <TabsTrigger value="movements">Riwayat Pergerakan</TabsTrigger>
        </TabsList>
        <TabsContent value="stock" className="mt-4">
          <DataTable
            columns={stockColumns}
            data={filteredStocks}
            isLoading={isLoading}
            emptyState={{
              title: "Belum ada data stok",
              description: "Mulai dengan menambahkan stok masuk",
            }}
            pagination={
              stockMeta
                ? {
                    page: stockMeta.page,
                    pageSize: stockMeta.pageSize,
                    total: stockMeta.total,
                    onPageChange: setStockPage,
                  }
                : undefined
            }
          />
        </TabsContent>
        <TabsContent value="movements" className="mt-4">
          <DataTable
            columns={movementColumns}
            data={movements}
            isLoading={isLoading}
            emptyState={{
              title: "Belum ada riwayat pergerakan",
              description:
                "Riwayat akan muncul setelah ada transaksi stok",
            }}
            pagination={
              movementMeta
                ? {
                    page: movementMeta.page,
                    pageSize: movementMeta.pageSize,
                    total: movementMeta.total,
                    onPageChange: setMovementPage,
                  }
                : undefined
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
