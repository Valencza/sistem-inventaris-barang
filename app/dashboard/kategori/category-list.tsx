"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Tags } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, type Column } from "@/components/ui/data-table"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useStore } from "@/components/providers/store-provider"
import { formatDate } from "@/lib/utils/format"
import { toast } from "sonner"
import type { Category } from "@/lib/types"

interface CategoryWithCount extends Category {
  productCount: number
}

type Meta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function CategoryList() {
  const { isReady } = useStore()
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)

  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false)

  const [page, setPage] = useState(1)
  const pageSize = 10

  const slugify = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
  })

  useEffect(() => {
    if (!isReady) return
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, page])

  const loadData = async () => {
    try {
      setIsLoading(true)

      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))

      const res = await fetch(`/api/kategori?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        console.error("[CATEGORY_LOAD]", res.status, err)
        toast.error(err?.message || "Gagal memuat kategori")
        setIsLoading(false)
        return
      }

      const json = await res.json()
      const data = (json.data ?? []) as CategoryWithCount[]
      setCategories(data)
      setMeta(
        json.meta ?? {
          page,
          pageSize,
          total: data.length,
          totalPages: 1,
        },
      )
    } catch (error) {
      console.error("[CATEGORY_LOAD]", error)
      toast.error("Gagal memuat kategori")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCategories = categories.filter((cat) =>
    search === "" ? true : cat.name.toLowerCase().includes(search.toLowerCase()),
  )

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
      })
      setIsSlugManuallyEdited(true)
    } else {
      setEditingCategory(null)
      setFormData({ name: "", slug: "", description: "" })
      setIsSlugManuallyEdited(false)
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingCategory(null)
    setFormData({ name: "", slug: "", description: "" })
    setIsSlugManuallyEdited(false)
  }

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: isSlugManuallyEdited ? prev.slug : slugify(name),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        description: formData.description.trim() || undefined,
      }

      let res: Response

      if (editingCategory) {
        res = await fetch(`/api/kategori/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/kategori", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        toast.error(err?.message || "Gagal menyimpan kategori")
        return
      }

      toast.success(
        editingCategory ? "Kategori berhasil diperbarui" : "Kategori berhasil ditambahkan",
      )
      handleCloseDialog()
      await loadData()
    } catch (error) {
      console.error("[CATEGORY_SAVE]", error)
      toast.error("Gagal menyimpan kategori")
    }
  }

  const handleDelete = async () => {
    if (!deleteCategory) return

    try {
      const res = await fetch(`/api/kategori/${deleteCategory.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        toast.error(err?.message || "Gagal menghapus kategori")
        setDeleteCategory(null)
        return
      }

      toast.success("Kategori berhasil dihapus")

      // kalau di halaman ini cuma ada 1 item dan dihapus, mundur 1 halaman
      if (meta && meta.page > 1 && categories.length === 1) {
        setPage(meta.page - 1)
      } else {
        await loadData()
      }
    } catch (error) {
      console.error("[CATEGORY_DELETE]", error)
      toast.error("Gagal menghapus kategori")
    } finally {
      setDeleteCategory(null)
    }
  }

  const columns: Column<CategoryWithCount>[] = [
    {
      key: "name",
      header: "Kategori",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Tags className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">/{item.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "description",
      header: "Deskripsi",
      cell: (item) => (
        <span className="text-muted-foreground line-clamp-1">
          {item.description || "-"}
        </span>
      ),
    },
    {
      key: "products",
      header: "Produk",
      cell: (item) => (
        <Badge variant="outline">{item.productCount ?? 0} produk</Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Dibuat",
      cell: (item) => (
        <span className="text-muted-foreground">
          {formatDate(item.createdAt)}
        </span>
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
            <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteCategory(item)}
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
        title="Kategori"
        description="Kelola kategori produk Anda"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kategori" },
        ]}
        actions={
          <Button className="gap-2" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4" />
            Tambah Kategori
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari kategori..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredCategories}
        isLoading={isLoading}
        emptyState={{
          title: "Belum ada kategori",
          description: "Mulai dengan menambahkan kategori pertama Anda",
        }}
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

      {/* Dialog tambah/edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Kategori" : "Tambah Kategori"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Perbarui data kategori"
                : "Buat kategori baru untuk produk"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Kategori *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Nama kategori"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug URL</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => {
                    setIsSlugManuallyEdited(true)
                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }}
                  placeholder="nama-kategori"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Deskripsi kategori..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Batal
              </Button>
              <Button type="submit">
                {editingCategory ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteCategory}
        onOpenChange={() => setDeleteCategory(null)}
        title="Hapus Kategori"
        description={`Apakah Anda yakin ingin menghapus kategori "${deleteCategory?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
