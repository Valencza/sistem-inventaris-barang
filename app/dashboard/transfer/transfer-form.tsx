"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Save, Loader2, ArrowLeft, Plus, Trash2, Package, ArrowRight, Warehouse } from "lucide-react"
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
import type {
  Product,
  Warehouse as WarehouseType,
  TransferItem,
  Stock as StockType,
} from "@/lib/types"

interface TransferItemInput {
  productId: string
  quantity: string
}

type ApiListResponse<T> = { data?: T; message?: string } | any

export function TransferForm() {
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([])
  const [stocks, setStocks] = useState<StockType[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [fromWarehouseId, setFromWarehouseId] = useState("")
  const [toWarehouseId, setToWarehouseId] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<TransferItemInput[]>([])

  const loadMasterData = async () => {
    try {
      setIsLoading(true)

      const [prodRes, whRes, stockRes] = await Promise.all([
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
        fetch("/api/stok", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
      ])

      const [prodJson, whJson, stockJson] = await Promise.all([
        prodRes.json() as Promise<ApiListResponse<Product[]>>,
        whRes.json() as Promise<ApiListResponse<WarehouseType[]>>,
        stockRes.json() as Promise<ApiListResponse<StockType[]>>,
      ])

      if (!prodRes.ok) throw new Error(prodJson?.message || "Gagal memuat produk")
      if (!whRes.ok) throw new Error(whJson?.message || "Gagal memuat gudang")
      if (!stockRes.ok) throw new Error(stockJson?.message || "Gagal memuat stok")

      const allProducts: Product[] = prodJson?.products ?? prodJson?.data ?? []
      const allWarehouses: WarehouseType[] = (whJson?.data ?? []).filter(
        (w: WarehouseType) => w.isActive,
      )
      const allStocks: StockType[] = stockJson?.data ?? []

      setProducts(allProducts)
      setWarehouses(allWarehouses)
      setStocks(allStocks)
    } catch (error: any) {
      console.error("[TRANSFER_FORM_LOAD]", error)
      toast.error(error?.message || "Gagal memuat data transfer")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadMasterData()
  }, [])

  const getStockByProductAndWarehouse = (productId: string, warehouseId: string) => {
    return stocks.find((s) => s.productId === productId && s.warehouseId === warehouseId) || null
  }

  // Produk yang punya stok > 0 di gudang asal
  const availableProducts = useMemo(() => {
    if (!fromWarehouseId) return []
    return products.filter((product) => {
      const stock = getStockByProductAndWarehouse(product.id, fromWarehouseId)
      return stock && stock.quantity > 0
    })
  }, [products, stocks, fromWarehouseId])

  const addItem = () => {
    setItems((prev) => [...prev, { productId: "", quantity: "" }])
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof TransferItemInput, value: string) => {
    setItems((prev) => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }
      return newItems
    })
  }

  const handleFromWarehouseChange = (warehouseId: string) => {
    setFromWarehouseId(warehouseId)
    setItems([]) // reset item ketika gudang asal ganti
  }

  const totalItems = useMemo(
    () => items.filter((i) => i.productId && Number.parseInt(i.quantity) > 0).length,
    [items],
  )

  const totalQuantity = useMemo(
    () => items.reduce((sum, i) => sum + (Number.parseInt(i.quantity) || 0), 0),
    [items],
  )

  const handleSubmit = async (e: React.FormEvent, postImmediately = false) => {
    e.preventDefault()

    if (!fromWarehouseId || !toWarehouseId) {
      toast.error("Gudang asal dan tujuan wajib diisi")
      return
    }

    if (fromWarehouseId === toWarehouseId) {
      toast.error("Gudang asal dan tujuan tidak boleh sama")
      return
    }

    // Validasi item & stok
    const validItems: TransferItemInput[] = []
    for (const i of items) {
      const qty = Number.parseInt(i.quantity) || 0
      if (!i.productId || qty <= 0) continue

      const stock = getStockByProductAndWarehouse(i.productId, fromWarehouseId)
      const availableQty = stock?.quantity ?? 0

      if (qty > availableQty) {
        const prod = products.find((p) => p.id === i.productId)
        toast.error(
          `Qty untuk produk ${prod?.name ?? i.productId} melebihi stok (${formatNumber(
            availableQty,
          )})`,
        )
        return
      }

      validItems.push(i)
    }

    if (validItems.length === 0) {
      toast.error("Tambahkan minimal 1 item yang valid")
      return
    }

    setIsLoading(true)

    try {
      const transferItems: Omit<TransferItem, "id" | "transferId">[] = validItems.map((item) => ({
        productId: item.productId,
        quantity: Number.parseInt(item.quantity),
      }))

      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fromWarehouseId,
          toWarehouseId,
          notes: notes || undefined,
          items: transferItems,
          // status ditentukan di server; kalau mau dukung "langsung post",
          // bisa kirim flag mis. postImmediately
          postImmediately,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.message || "Gagal menyimpan transfer")
      }

      if (postImmediately) {
        toast.success("Transfer berhasil dibuat dan diposting")
      } else {
        toast.success("Transfer draft berhasil dibuat")
      }

      router.push("/dashboard/transfer")
    } catch (error: any) {
      console.error("[TRANSFER_SAVE]", error)
      toast.error(error?.message || "Terjadi kesalahan saat menyimpan transfer")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat Transfer Stok"
        description="Transfer stok dari satu gudang ke gudang lain"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Transfer", href: "/dashboard/transfer" },
          { label: "Buat Transfer" },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        }
      />

      <form onSubmit={(e) => handleSubmit(e, false)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Warehouse Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Pilih Gudang</CardTitle>
                <CardDescription>Tentukan gudang asal dan tujuan transfer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1 w-full space-y-2">
                    <Label>Gudang Asal *</Label>
                    <Select value={fromWarehouseId} onValueChange={handleFromWarehouseChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih gudang asal" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id} disabled={wh.id === toWarehouseId}>
                            <div className="flex items-center gap-2">
                              <Warehouse className="h-4 w-4" />
                              {wh.name} ({wh.code})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <ArrowRight className="h-6 w-6 text-muted-foreground hidden sm:block mt-6" />

                  <div className="flex-1 w-full space-y-2">
                    <Label>Gudang Tujuan *</Label>
                    <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih gudang tujuan" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id} disabled={wh.id === fromWarehouseId}>
                            <div className="flex items-center gap-2">
                              <Warehouse className="h-4 w-4" />
                              {wh.name} ({wh.code})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Item Transfer</CardTitle>
                  <CardDescription>Pilih produk dan jumlah yang akan ditransfer</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  disabled={!fromWarehouseId || availableProducts.length === 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Item
                </Button>
              </CardHeader>
              <CardContent>
                {!fromWarehouseId ? (
                  <p className="text-center text-muted-foreground py-8">
                    Pilih gudang asal terlebih dahulu
                  </p>
                ) : availableProducts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Tidak ada produk dengan stok di gudang ini
                  </p>
                ) : items.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Klik &quot;Tambah Item&quot; untuk menambahkan produk
                  </p>
                ) : (
                  <div className="space-y-4">
                    {items.map((item, index) => {
                      const product = products.find((p) => p.id === item.productId)
                      const qty = Number.parseInt(item.quantity) || 0
                      const stock = item.productId
                        ? getStockByProductAndWarehouse(item.productId, fromWarehouseId)
                        : null
                      const availableStock = stock?.quantity ?? 0
                      const isOverStock = qty > availableStock

                      return (
                        <div
                          key={index}
                          className="flex gap-4 items-start p-4 rounded-lg bg-muted/50"
                        >
                          <div className="flex-1 space-y-2">
                            <Label>Produk</Label>
                            <Select
                              value={item.productId}
                              onValueChange={(v) => updateItem(index, "productId", v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih produk" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableProducts.map((p) => {
                                  const st = getStockByProductAndWarehouse(p.id, fromWarehouseId)
                                  return (
                                    <SelectItem key={p.id} value={p.id}>
                                      <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        {p.name}
                                        <Badge variant="outline" className="ml-2">
                                          {formatNumber(st?.quantity || 0)}
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="w-32 space-y-2">
                            <Label>Jumlah</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, "quantity", e.target.value)}
                              placeholder="0"
                              className={isOverStock ? "border-destructive" : ""}
                            />
                            {item.productId && (
                              <p
                                className={`text-xs ${
                                  isOverStock ? "text-destructive" : "text-muted-foreground"
                                }`}
                              >
                                Maks: {formatNumber(availableStock)}
                              </p>
                            )}
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mt-6"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Catatan</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan untuk transfer ini..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ringkasan Transfer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fromWarehouseId && toWarehouseId && (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Dari:</span>
                      <span className="font-medium">
                        {warehouses.find((w) => w.id === fromWarehouseId)?.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Ke:</span>
                      <span className="font-medium">
                        {warehouses.find((w) => w.id === toWarehouseId)?.name}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Item</span>
                  <Badge variant="outline">{totalItems} produk</Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Unit</span>
                  <Badge variant="outline">{formatNumber(totalQuantity)} unit</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                type="submit"
                variant="outline"
                className="w-full gap-2 bg-transparent"
                disabled={isLoading || !fromWarehouseId || !toWarehouseId || totalItems === 0}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan sebagai Draft
              </Button>

              <Button
                type="button"
                className="w-full gap-2"
                disabled={isLoading || !fromWarehouseId || !toWarehouseId || totalItems === 0}
                onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan &amp; Post Langsung
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
