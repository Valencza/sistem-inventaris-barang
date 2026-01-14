"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Package, Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency, formatNumber } from "@/lib/utils/format"
import { EmptyState, SearchEmptyState } from "@/components/ui/empty-state"
import { Loading } from "@/components/ui/loading"
import type { Product, Category, Warehouse, Stock } from "@/lib/types"

interface ProductCatalogProps {
  warehouseCode?: string
  categorySlug?: string
  searchQuery?: string
}

export function ProductCatalog({
  warehouseCode,
  categorySlug,
  searchQuery,
}: ProductCatalogProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [search, setSearch] = useState(searchQuery || "")
  const [selectedWarehouse, setSelectedWarehouse] = useState("all")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

  // sinkron filter awal dengan URL (sekali di awal)
  useEffect(() => {
    if (warehouseCode) setSelectedWarehouse(warehouseCode)
    if (categorySlug) setSelectedCategory(categorySlug)
    if (searchQuery) setSearch(searchQuery)
  }, [warehouseCode, categorySlug, searchQuery])

  // Ambil data real dari API publik
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        const [prodRes, catRes, whRes, stockRes] = await Promise.all([
          fetch("/api/public/produk", { cache: "no-store" }),
          fetch("/api/public/kategori", { cache: "no-store" }),
          fetch("/api/public/gudang", { cache: "no-store" }),
          fetch("/api/public/stok", { cache: "no-store" }),
        ])

        const [prodJson, catJson, whJson, stockJson] = await Promise.all([
          prodRes.json(),
          catRes.json(),
          whRes.json(),
          stockRes.json(),
        ])

        if (!prodRes.ok)
          throw new Error(prodJson.message || "Gagal memuat produk")
        if (!catRes.ok)
          throw new Error(catJson.message || "Gagal memuat kategori")
        if (!whRes.ok)
          throw new Error(whJson.message || "Gagal memuat gudang")
        if (!stockRes.ok)
          throw new Error(stockJson.message || "Gagal memuat stok")

        setProducts(prodJson.data ?? [])
        setCategories(catJson.data ?? [])
        setWarehouses(
          (whJson.data ?? []).filter((w: Warehouse) => w.isActive),
        )
        setStocks(stockJson.data ?? [])
      } catch (error) {
        console.error("[PUBLIC_CATALOG_LOAD]", error)
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [])

  // Update URL ketika filter berubah
  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/produk?${params.toString()}`, { scroll: false })
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set("q", value)
    } else {
      params.delete("q")
    }
    router.push(`/produk?${params.toString()}`, { scroll: false })
  }

  const clearFilters = () => {
    setSearch("")
    setSelectedWarehouse("all")
    setSelectedCategory("all")
    router.push("/produk", { scroll: false })
  }

  // Hitung stok per produk
  const getProductStock = (productId: string): number => {
    if (selectedWarehouse && selectedWarehouse !== "all") {
      const warehouse = warehouses.find(
        (w) => w.code === selectedWarehouse,
      )
      if (warehouse) {
        const stock = stocks.find(
          (s) =>
            s.productId === productId && s.warehouseId === warehouse.id,
        )
        return stock?.quantity || 0
      }
    }
    return stocks
      .filter((s) => s.productId === productId)
      .reduce((sum, s) => sum + s.quantity, 0)
  }

  // Filter produk di FE
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // search
      if (search) {
        const searchLower = search.toLowerCase()
        const matchesSearch =
          product.name.toLowerCase().includes(searchLower) ||
          product.sku.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // kategori
      if (selectedCategory && selectedCategory !== "all") {
        const category = categories.find(
          (c) => c.slug === selectedCategory,
        )
        if (category && product.categoryId !== category.id) return false
      }

      // gudang
      if (selectedWarehouse && selectedWarehouse !== "all") {
        const warehouse = warehouses.find(
          (w) => w.code === selectedWarehouse,
        )
        if (warehouse) {
          const hasStock = stocks.some(
            (s) =>
              s.productId === product.id &&
              s.warehouseId === warehouse.id &&
              s.quantity > 0,
          )
          if (!hasStock) return false
        }
      }

      return true
    })
  }, [
    products,
    search,
    selectedCategory,
    selectedWarehouse,
    categories,
    warehouses,
    stocks,
  ])

  const hasFilters =
    !!search ||
    (selectedWarehouse && selectedWarehouse !== "all") ||
    (selectedCategory && selectedCategory !== "all")

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading text="Memuat katalog..." />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 md:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>

          {/* Category Filter */}
          <Select
            value={selectedCategory}
            onValueChange={(value) => {
              setSelectedCategory(value)
              updateFilters("kategori", value)
            }}
          >
            <SelectTrigger className="h-9 w-full text-sm sm:w-[180px]">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Warehouse Filter */}
          <Select
            value={selectedWarehouse}
            onValueChange={(value) => {
              setSelectedWarehouse(value)
              updateFilters("gudang", value)
            }}
          >
            <SelectTrigger className="h-9 w-full text-sm sm:w-[200px]">
              <SelectValue placeholder="Pilih Gudang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Gudang</SelectItem>
              {warehouses.map((wh) => (
                <SelectItem key={wh.id} value={wh.code}>
                  {wh.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Filter aktif:
            </span>
            {search && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Pencarian: {search}
                <button
                  onClick={() => handleSearch("")}
                  aria-label="Hapus filter pencarian"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedCategory && selectedCategory !== "all" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                {categories.find((c) => c.slug === selectedCategory)?.name}
                <button
                  onClick={() => {
                    setSelectedCategory("all")
                    updateFilters("kategori", "all")
                  }}
                  aria-label="Hapus filter kategori"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedWarehouse && selectedWarehouse !== "all" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                {
                  warehouses.find(
                    (w) => w.code === selectedWarehouse,
                  )?.name
                }
                <button
                  onClick={() => {
                    setSelectedWarehouse("all")
                    updateFilters("gudang", "all")
                  }}
                  aria-label="Hapus filter gudang"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 px-2 text-xs"
            >
              Hapus Semua
            </Button>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>
          Menampilkan{" "}
          <span className="font-semibold text-foreground">
            {filteredProducts.length}
          </span>{" "}
          produk
        </p>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        search ? (
          <SearchEmptyState query={search} />
        ) : (
          <EmptyState
            icon={Package}
            title="Tidak ada produk"
            description="Belum ada produk yang tersedia dengan filter yang dipilih."
          />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => {
            const category = categories.find(
              (c) => c.id === product.categoryId,
            )
            const stock = getProductStock(product.id)
            const isLowStock = stock <= product.minStock

            return (
              <Link key={product.id} href={`/produk/${product.slug}`}>
                <Card className="group h-full overflow-hidden border-muted bg-card/60 transition hover:border-primary/40 hover:shadow-sm">
                  <CardHeader className="p-0">
                    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted">
                      {product.image ? (
                        <img
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <Package className="h-10 w-10 text-muted-foreground/50" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1.5 p-3">
                    {category && (
                      <Badge
                        variant="secondary"
                        className="mb-1 text-[10px]"
                      >
                        {category.name}
                      </Badge>
                    )}
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      SKU: {product.sku}
                    </p>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between p-3 pt-0">
                    <span className="text-sm font-semibold text-primary">
                      {formatCurrency(product.price)}
                    </span>
                    <Badge
                      variant={isLowStock ? "destructive" : "outline"}
                      className="text-[10px]"
                    >
                      Stok: {formatNumber(stock)}
                    </Badge>
                  </CardFooter>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
