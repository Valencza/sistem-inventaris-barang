"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Package,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, type Column } from "@/components/ui/data-table"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useStore } from "@/components/providers/store-provider"
import { formatCurrency, formatNumber } from "@/lib/utils/format"
import { toast } from "sonner"
import type { Product, Category } from "@/lib/types"

interface ProductWithStock extends Product {
  category?: Category
  totalStock: number
}

type Meta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function ProductList() {
  const router = useRouter()
  const { isReady } = useStore()

  const [products, setProducts] = useState<ProductWithStock[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)

  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    if (!isReady) return
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, page, categoryFilter])

  const loadData = async () => {
    try {
      setIsLoading(true)

      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter)

      const [produkRes, kategoriRes] = await Promise.all([
        fetch(`/api/produk?${params.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
        fetch("/api/kategori", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
      ])

      if (!produkRes.ok) {
        const err = await produkRes.json().catch(() => null)
        throw new Error(err?.message || "Gagal memuat produk")
      }

      if (!kategoriRes.ok) {
        const err = await kategoriRes.json().catch(() => null)
        throw new Error(err?.message || "Gagal memuat kategori")
      }

      const produkJson = await produkRes.json()
      const kategoriJson = await kategoriRes.json()

      setProducts((produkJson.data ?? []) as ProductWithStock[])
      setMeta(produkJson.meta ?? null)
      setCategories((kategoriJson.data ?? kategoriJson.categories) || [])
    } catch (error: any) {
      console.error("Load products/categories error", error)
      toast.error(error?.message || "Gagal memuat data produk/kategori")
    } finally {
      setIsLoading(false)
    }
  }

  // search masih client‑side di atas hasil page saat ini
  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase()
    return products.filter((product) => {
      const matchesSearch =
        term === "" ||
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term)

      return matchesSearch
    })
  }, [products, search])

  const handleDelete = async () => {
    if (!deleteProduct) return
    try {
      const res = await fetch(`/api/produk/${deleteProduct.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || "Gagal menghapus produk")
      }
      toast.success("Produk berhasil dihapus")
      // kalau halaman cuma berisi 1 item dan dihapus, mundur 1 halaman
      if (meta && meta.page > 1 && products.length === 1) {
        setPage(meta.page - 1)
      } else {
        await loadData()
      }
    } catch (error: any) {
      console.error("Delete product error", error)
      toast.error(error?.message || "Gagal menghapus produk")
    } finally {
      setDeleteProduct(null)
    }
  }

  const columns: Column<ProductWithStock>[] = [
    {
      key: "name",
      header: "Produk",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
            {item.image ? (
              <img
                src={item.image || "/placeholder.svg"}
                alt={item.name}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <Package className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Kategori",
      cell: (item) => (
        <Badge variant="secondary">{item.category?.name || "-"}</Badge>
      ),
    },
    {
      key: "price",
      header: "Harga",
      cell: (item) => (
        <span className="font-medium">{formatCurrency(item.price)}</span>
      ),
    },
    {
      key: "stock",
      header: "Stok",
      cell: (item) => {
        const isLow = item.totalStock <= item.minStock
        return (
          <Badge variant={isLow ? "destructive" : "outline"}>
            {formatNumber(item.totalStock)} / {formatNumber(item.minStock)}
          </Badge>
        )
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => (
        <Badge variant={item.isActive ? "default" : "secondary"}>
          {item.isActive ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
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
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={`/produk/${item.slug}`} target="_blank">
                <Eye className="mr-2 h-4 w-4" />
                Lihat Publik
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={`/dashboard/produk/${item.id}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setDeleteProduct(item)
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produk"
        description="Kelola daftar produk inventaris Anda"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Produk" },
        ]}
        actions={
          <Link href="/dashboard/produk/tambah">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Produk
            </Button>
          </Link>
        }
      />

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
          value={categoryFilter}
          onValueChange={(val) => {
            setCategoryFilter(val)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredProducts}
        isLoading={isLoading}
        emptyState={{
          title: "Belum ada produk",
          description: "Mulai dengan menambahkan produk pertama Anda",
        }}
        onRowClick={(item) => router.push(`/dashboard/produk/${item.id}`)}
        pagination={
          meta
            ? {
                page: meta.page,
                pageSize: meta.pageSize,
                total: meta.total,
                onPageChange: setPage,
              }
            : undefined
        }
      />

      <ConfirmDialog
        open={!!deleteProduct}
        onOpenChange={() => setDeleteProduct(null)}
        title="Hapus Produk"
        description={`Apakah Anda yakin ingin menghapus produk "${deleteProduct?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
