"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Package,
  Warehouse,
  MapPin,
  Phone,
  User,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency, formatNumber } from "@/lib/utils/format"
import { NotFoundState } from "@/components/ui/empty-state"
import { Loading } from "@/components/ui/loading"
import type {
  Product,
  Category,
  Warehouse as WarehouseType,
  Stock,
} from "@/lib/types"

interface ProductDetailProps {
  slug: string
}

type ProductWithCategory = Product & { category?: Category }

export function ProductDetail({ slug }: ProductDetailProps) {
  const router = useRouter()

  const [product, setProduct] = useState<ProductWithCategory | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        // asumsi: kamu buat endpoint /api/public/produk/[slug]
        // yang mengembalikan { data: { product, related, stocks, warehouses } }
        const res = await fetch(`/api/public/produk/${slug}`, {
          cache: "no-store",
        })
        const json = await res.json()

        if (!res.ok || !json.data) {
          setProduct(null)
          return
        }

        const {
          product,
          category,
          warehouses,
          stocks,
          relatedProducts,
        }: {
          product: ProductWithCategory
          category?: Category
          warehouses: WarehouseType[]
          stocks: Stock[]
          relatedProducts: Product[]
        } = json.data

        setProduct(product)
        setCategory(category ?? null)
        setWarehouses(warehouses.filter((w) => w.isActive))
        setStocks(stocks)
        setRelatedProducts(relatedProducts)
      } catch (error) {
        console.error("[PUBLIC_PRODUCT_DETAIL_LOAD]", error)
        setProduct(null)
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [slug])

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <Loading text="Memuat detail produk..." />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container py-8">
        <NotFoundState />
        <div className="mt-4 text-center">
          <Button onClick={() => router.push("/produk")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Katalog
          </Button>
        </div>
      </div>
    )
  }

  // util stok
  const getDisplayedStock = () => {
    if (selectedWarehouse === "all") {
      return stocks.reduce((sum, s) => sum + s.quantity, 0)
    }
    const stock = stocks.find((s) => s.warehouseId === selectedWarehouse)
    return stock?.quantity || 0
  }

  const displayedStock = getDisplayedStock()
  const isLowStock = displayedStock <= product.minStock
  const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0)

  return (
    <div className="container flex justify-center py-8">
      <div className="w-full max-w-5xl">
        {/* Breadcrumb */}
        <nav
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <Link
            href="/"
            className="transition-colors hover:text-foreground"
          >
            Beranda
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href="/produk"
            className="transition-colors hover:text-foreground"
          >
            Katalog
          </Link>
          <ChevronRight className="h-4 w-4" />
          {category && (
            <>
              <Link
                href={`/produk?kategori=${category.slug}`}
                className="transition-colors hover:text-foreground"
              >
                {category.name}
              </Link>
              <ChevronRight className="h-4 w-4" />
            </>
          )}
          <span className="max-w-[200px] truncate font-medium text-foreground">
            {product.name}
          </span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-muted">
              {product.image ? (
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Package className="h-32 w-32 text-muted-foreground/50" />
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              {category && (
                <Link href={`/produk?kategori=${category.slug}`}>
                  <Badge
                    variant="secondary"
                    className="mb-3 hover:bg-secondary/80"
                  >
                    {category.name}
                  </Badge>
                </Link>
              )}
              <h1 className="text-2xl font-semibold tracking-tight text-balance">
                {product.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                SKU: {product.sku}
              </p>
            </div>

            <div className="text-2xl font-bold text-primary">
              {formatCurrency(product.price)}
            </div>

            {product.description && (
              <div>
                <h2 className="mb-1 text-sm font-semibold">Deskripsi</h2>
                <p className="text-sm text-muted-foreground text-pretty">
                  {product.description}
                </p>
              </div>
            )}

            <Separator />

            {/* Stock Info */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">
                  Ketersediaan Stok
                </h2>
                <Select
                  value={selectedWarehouse}
                  onValueChange={setSelectedWarehouse}
                >
                  <SelectTrigger className="h-9 w-[200px] text-xs">
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
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {selectedWarehouse === "all"
                            ? "Total Stok"
                            : warehouses.find(
                                (w) => w.id === selectedWarehouse,
                              )?.name}
                        </p>
                        <p className="text-xl font-bold">
                          {formatNumber(displayedStock)} unit
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={isLowStock ? "destructive" : "default"}
                    >
                      {isLowStock ? "Stok Rendah" : "Tersedia"}
                    </Badge>
                  </div>
                  {product.minStock > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Minimum stok:{" "}
                      {formatNumber(product.minStock)} unit
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Total semua gudang: {formatNumber(totalStock)} unit
                  </p>
                </CardContent>
              </Card>

              {/* Stock per Warehouse */}
              {selectedWarehouse === "all" && stocks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium">
                    Stok per Gudang
                  </h3>
                  <div className="grid gap-2">
                    {warehouses.map((wh) => {
                      const stock = stocks.find(
                        (s) => s.warehouseId === wh.id,
                      )
                      const qty = stock?.quantity || 0
                      const isLow = qty <= product.minStock

                      return (
                        <div
                          key={wh.id}
                          className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                        >
                          <div className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{wh.name}</span>
                          </div>
                          <Badge
                            variant={
                              isLow && qty > 0
                                ? "destructive"
                                : qty === 0
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {formatNumber(qty)} unit
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Selected Warehouse Info */}
              {selectedWarehouse !== "all" && (
                <Card className="bg-muted/50">
                  <CardContent className="space-y-2 p-4">
                    {(() => {
                      const wh = warehouses.find(
                        (w) => w.id === selectedWarehouse,
                      )
                      if (!wh) return null
                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {wh.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                            >
                              {wh.code}
                            </Badge>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span>{wh.address}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{wh.pic}</span>
                          </div>
                          {wh.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{wh.phone}</span>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => router.push("/produk")}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Katalog
              </Button>
              <Button
                onClick={() => router.push("/login")}
                className="flex-1"
              >
                Login untuk Order
              </Button>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-12">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Produk Sejenis</h2>
              {category && (
                <Link href={`/produk?kategori=${category.slug}`}>
                  <Button variant="ghost" className="gap-1 text-xs">
                    Lihat Semua
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((relatedProduct) => {
                const relatedTotalStock = stocks
                  .filter((s) => s.productId === relatedProduct.id)
                  .reduce((sum, s) => sum + s.quantity, 0)
                const relatedIsLow =
                  relatedTotalStock <= relatedProduct.minStock

                return (
                  <Link
                    key={relatedProduct.id}
                    href={`/produk/${relatedProduct.slug}`}
                  >
                    <Card className="group h-full overflow-hidden transition-shadow hover:shadow-sm">
                      <CardContent className="space-y-2 p-3">
                        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-muted">
                          {relatedProduct.image ? (
                            <img
                              src={
                                relatedProduct.image ||
                                "/placeholder.svg"
                              }
                              alt={relatedProduct.name}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <Package className="h-10 w-10 text-muted-foreground/50" />
                          )}
                        </div>
                        <h3 className="line-clamp-2 text-sm font-semibold group-hover:text-primary">
                          {relatedProduct.name}
                        </h3>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-sm font-semibold text-primary">
                            {formatCurrency(relatedProduct.price)}
                          </span>
                          <Badge
                            variant={
                              relatedIsLow ? "destructive" : "outline"
                            }
                            className="text-[10px]"
                          >
                            {formatNumber(relatedTotalStock)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
