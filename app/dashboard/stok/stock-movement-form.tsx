"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Save, Loader2, ArrowLeft, TrendingUp, TrendingDown, Package, Warehouse } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { formatNumber } from "@/lib/utils/format"
import { toast } from "sonner"
import type { Product, Warehouse as WarehouseType } from "@/lib/types"

interface StockMovementFormProps {
  type: "IN" | "OUT"
}

async function fetchCurrentStock(productId: string, warehouseId: string): Promise<number> {
  try {
    const res = await fetch(
      `/api/stok?productId=${encodeURIComponent(productId)}&warehouseId=${encodeURIComponent(
        warehouseId,
      )}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    )

    if (!res.ok) {
      return 0
    }

    const json = await res.json()
    return json.data?.quantity ?? 0
  } catch {
    return 0
  }
}

export function StockMovementForm({ type }: StockMovementFormProps) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    productId: "",
    warehouseId: "",
    quantity: "",
    notes: "",
  })

  const [currentStock, setCurrentStock] = useState<number | null>(null)

  // Ambil produk & gudang aktif dari API
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [prodRes, whRes] = await Promise.all([
          fetch("/api/produk?isActive=true", {
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

        const [prodJson, whJson] = await Promise.all([prodRes.json(), whRes.json()])

        if (!prodRes.ok) throw new Error(prodJson.message || "Gagal memuat produk")
        if (!whRes.ok) throw new Error(whJson.message || "Gagal memuat gudang")

        // /api/produk mengembalikan { products: [...] }
        const allProducts: Product[] = prodJson.products ?? []
        const allWarehouses: WarehouseType[] = (whJson.data ?? []).filter(
          (w: WarehouseType) => w.isActive,
        )

        setProducts(allProducts.filter((p) => p.isActive))
        setWarehouses(allWarehouses)
      } catch (error: any) {
        console.error("[STOCK_MOVEMENT_LOAD_OPTIONS]", error)
        toast.error(error.message || "Gagal memuat data produk/gudang")
      }
    }

    void loadOptions()
  }, [])

  useEffect(() => {
    if (formData.productId && formData.warehouseId) {
      void (async () => {
        const qty = await fetchCurrentStock(formData.productId, formData.warehouseId)
        setCurrentStock(qty)
      })()
    } else {
      setCurrentStock(null)
    }
  }, [formData.productId, formData.warehouseId])

  const isStockIn = type === "IN"
  const selectedProduct = products.find((p) => p.id === formData.productId)
  const quantity = Number.parseInt(formData.quantity) || 0
  const newStock =
    currentStock !== null ? (isStockIn ? currentStock + quantity : currentStock - quantity) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.productId || !formData.warehouseId) {
      toast.error("Produk dan gudang wajib dipilih")
      return
    }

    if (quantity <= 0) {
      toast.error("Jumlah harus lebih dari 0")
      return
    }

    if (!isStockIn && currentStock !== null && quantity > currentStock) {
      toast.error("Jumlah keluar melebihi stok tersedia")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productId: formData.productId,
          warehouseId: formData.warehouseId,
          type,
          quantity,
          notes: formData.notes || undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.message || "Gagal mencatat pergerakan stok")
      }

      toast.success(isStockIn ? "Stok masuk berhasil dicatat" : "Stok keluar berhasil dicatat")
      router.push("/dashboard/stok")
    } catch (error: any) {
      console.error("[STOCK_MOVEMENT_SUBMIT]", error)
      toast.error(error.message || "Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isStockIn ? "Stok Masuk" : "Stok Keluar"}
        description={isStockIn ? "Catat penerimaan stok baru" : "Catat pengeluaran stok"}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Stok", href: "/dashboard/stok" },
          { label: isStockIn ? "Masuk" : "Keluar" },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isStockIn ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  {isStockIn ? "Penerimaan Stok" : "Pengeluaran Stok"}
                </CardTitle>
                <CardDescription>
                  Pilih produk dan gudang untuk {isStockIn ? "menerima" : "mengeluarkan"} stok
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Produk *</Label>
                  <Select
                    value={formData.productId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, productId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih produk" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{product.name}</span>
                            <span className="text-muted-foreground">({product.sku})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warehouse">Gudang *</Label>
                  <Select
                    value={formData.warehouseId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, warehouseId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih gudang" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          <div className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4 text-muted-foreground" />
                            <span>{warehouse.name}</span>
                            <span className="text-muted-foreground">({warehouse.code})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Jumlah *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={!isStockIn && currentStock !== null ? currentStock : undefined}
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                    placeholder="0"
                    required
                  />
                  {!isStockIn && currentStock !== null && (
                    <p className="text-xs text-muted-foreground">
                      Maksimal: {formatNumber(currentStock)} unit
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Catatan untuk transaksi ini..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Stock Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ringkasan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedProduct && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium">{selectedProduct.name}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: {selectedProduct.sku}
                    </p>
                  </div>
                )}

                {currentStock !== null && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Stok Saat Ini</span>
                      <Badge variant="outline">{formatNumber(currentStock)}</Badge>
                    </div>

                    {quantity > 0 && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            {isStockIn ? "Masuk" : "Keluar"}
                          </span>
                          <Badge variant={isStockIn ? "default" : "destructive"}>
                            {isStockIn ? "+" : "-"}
                            {formatNumber(quantity)}
                          </Badge>
                        </div>

                        <div className="border-t pt-4">
                          <div className="flex justify_between items-center">
                            <span className="font-medium">Stok Akhir</span>
                            <span className="text-xl font-bold">
                              {formatNumber(newStock || 0)}
                            </span>
                          </div>
                          {selectedProduct &&
                            newStock !== null &&
                            newStock <= selectedProduct.minStock && (
                              <p className="text-xs text-destructive mt-2">
                                Peringatan: Stok di bawah minimum!
                              </p>
                            )}
                        </div>
                      </>
                    )}
                  </>
                )}

                {currentStock === null && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Pilih produk dan gudang untuk melihat stok
                  </p>
                )}
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={
                isLoading || !formData.productId || !formData.warehouseId || quantity <= 0
              }
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Simpan {isStockIn ? "Stok Masuk" : "Stok Keluar"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
