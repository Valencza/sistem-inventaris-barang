"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Warehouse,
  MapPin,
  Phone,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { formatNumber } from "@/lib/utils/format"
import { toast } from "sonner"
import type { Warehouse as WarehouseType } from "@/lib/types"

interface WarehouseWithStats extends WarehouseType {
  totalProducts: number
  totalStock: number
}

type Meta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function WarehouseList() {
  const [warehouses, setWarehouses] = useState<WarehouseWithStats[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] =
    useState<WarehouseWithStats | null>(null)
  const [deleteWarehouse, setDeleteWarehouse] =
    useState<WarehouseWithStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    address: "",
    pic: "",
    phone: "",
    isActive: true,
  })

  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const loadData = async () => {
    try {
      setIsLoading(true)

      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      const res = await fetch(`/api/gudang?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.message || "Gagal memuat data gudang")
      }

      setWarehouses((json.data ?? []) as WarehouseWithStats[])
      setMeta(json.meta ?? null)
    } catch (error) {
      console.error("[WAREHOUSE_LIST_LOAD]", error)
      toast.error("Gagal memuat data gudang")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredWarehouses = warehouses.filter(
    (wh) =>
      search === "" ||
      wh.name.toLowerCase().includes(search.toLowerCase()) ||
      wh.code.toLowerCase().includes(search.toLowerCase()),
  )

  const handleOpenDialog = (warehouse?: WarehouseWithStats) => {
    if (warehouse) {
      setEditingWarehouse(warehouse)
      setFormData({
        code: warehouse.code,
        name: warehouse.name,
        address: warehouse.address ?? "",
        pic: warehouse.pic ?? "",
        phone: warehouse.phone || "",
        isActive: warehouse.isActive,
      })
    } else {
      setEditingWarehouse(null)
      setFormData({
        code: "",
        name: "",
        address: "",
        pic: "",
        phone: "",
        isActive: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingWarehouse(null)
    setFormData({
      code: "",
      name: "",
      address: "",
      pic: "",
      phone: "",
      isActive: true,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      code: formData.code.toUpperCase(),
      name: formData.name,
      address: formData.address,
      pic: formData.pic,
      phone: formData.phone || null,
      isActive: formData.isActive,
    }

    try {
      const url = editingWarehouse
        ? `/api/gudang/${editingWarehouse.id}`
        : "/api/gudang"
      const method = editingWarehouse ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.message || "Gagal menyimpan gudang")
      }

      toast.success(
        editingWarehouse
          ? "Gudang berhasil diperbarui"
          : "Gudang berhasil ditambahkan",
      )
      handleCloseDialog()
      // reset ke halaman 1 saat tambah baru
      if (!editingWarehouse) setPage(1)
      void loadData()
    } catch (error: any) {
      console.error("[WAREHOUSE_LIST_SUBMIT]", error)
      toast.error(error.message || "Gagal menyimpan gudang")
    }
  }

  const handleDelete = async () => {
    if (!deleteWarehouse) return

    try {
      const res = await fetch(`/api/gudang/${deleteWarehouse.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.message || "Gagal menghapus gudang")
      }

      toast.success("Gudang berhasil dihapus")
      setDeleteWarehouse(null)
      // jika halaman kosong setelah delete, mundurkan 1 halaman
      if (meta && meta.page > 1 && warehouses.length === 1) {
        setPage(meta.page - 1)
      } else {
        void loadData()
      }
    } catch (error: any) {
      console.error("[WAREHOUSE_LIST_DELETE]", error)
      toast.error(error.message || "Gagal menghapus gudang")
      setDeleteWarehouse(null)
    }
  }

  const columns: Column<WarehouseWithStats>[] = [
    {
      key: "name",
      header: "Gudang",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Warehouse className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: "address",
      header: "Alamat",
      cell: (item) => (
        <div className="flex items-start gap-2 max-w-xs">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-sm text-muted-foreground line-clamp-2">
            {item.address ?? "-"}
          </span>
        </div>
      ),
    },
    {
      key: "pic",
      header: "PIC",
      cell: (item) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{item.pic ?? "-"}</span>
          </div>
          {item.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {item.phone}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "stats",
      header: "Stok",
      cell: (item) => (
        <div className="space-y-1">
          <Badge variant="outline">{formatNumber(item.totalStock)} unit</Badge>
          <p className="text-xs text-muted-foreground">
            {item.totalProducts} produk
          </p>
        </div>
      ),
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
            <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteWarehouse(item)}
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
        title="Gudang"
        description="Kelola lokasi gudang penyimpanan"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Gudang" }]}
        actions={
          <Button className="gap-2" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4" />
            Tambah Gudang
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari gudang..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredWarehouses}
        isLoading={isLoading}
        emptyState={{
          title: "Belum ada gudang",
          description: "Mulai dengan menambahkan gudang pertama Anda",
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
      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? "Edit Gudang" : "Tambah Gudang"}</DialogTitle>
            <DialogDescription>
              {editingWarehouse ? "Perbarui data gudang" : "Tambahkan lokasi gudang baru"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="code">Kode Gudang *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                    }
                    placeholder="JKT-01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Gudang *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Gudang Jakarta"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Alamat *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Jl. Contoh No. 123, Jakarta"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pic">Person in Charge (PIC) *</Label>
                  <Input
                    id="pic"
                    value={formData.pic}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, pic: e.target.value }))
                    }
                    placeholder="Nama PIC"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">No. Telepon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="021-12345678"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Status Gudang</p>
                  <p className="text-sm text-muted-foreground">
                    Gudang aktif dapat digunakan untuk stok
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Batal
              </Button>
              <Button type="submit">{editingWarehouse ? "Simpan" : "Tambah"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteWarehouse}
        onOpenChange={() => setDeleteWarehouse(null)}
        title="Hapus Gudang"
        description={`Apakah Anda yakin ingin menghapus gudang "${deleteWarehouse?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
