"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { RequirePermission } from "@/components/auth/require-permission"
import type { Role, Permission } from "@/lib/types"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Plus, MoreHorizontal, Pencil, Trash2, Shield, Search } from "lucide-react"
import { formatDate } from "@/lib/utils/format"
import { PERMISSION_GROUPS } from "@/lib/permissions"
import { toast } from "sonner"

type PermissionDefinition = (typeof PERMISSION_GROUPS)[number]["permissions"][number]

type Meta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// Role yang datang dari API, pakai Permission “penuh” dari types.ts
interface RoleWithUsers extends Role {
  userCount: number
}

export function RoleList() {
  const { PERMISSIONS } = useAuth()

  const [roles, setRoles] = useState<RoleWithUsers[]>([])
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleWithUsers | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    description: string
    permissions: PermissionDefinition[]
  }>({
    name: "",
    description: "",
    permissions: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  const [meta, setMeta] = useState<Meta | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const loadRoles = async (pageArg = page) => {
    try {
      setIsLoading(true)

      const params = new URLSearchParams()
      params.set("page", String(pageArg))
      params.set("pageSize", String(pageSize))

      const res = await fetch(`/api/roles?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.message || "Gagal memuat role")
      }

      const apiRoles = (json.data ?? []) as RoleWithUsers[]
      setRoles(apiRoles)
      setMeta(
        json.meta ?? {
          page: pageArg,
          pageSize,
          total: apiRoles.length,
          totalPages: 1,
        },
      )
    } catch (error: any) {
      console.error("[ROLE_LIST_LOAD]", error)
      toast.error(error?.message || "Gagal memuat role")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadRoles(1)
    setPage(1)
  }, [])

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return roles
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(q) ||
        (role.description ?? "").toLowerCase().includes(q),
    )
  }, [roles, search])

  const getUserCount = (roleId: string) => {
    const r = roles.find((r) => r.id === roleId)
    return r?.userCount ?? 0
  }

  const handleOpenDialog = (role?: RoleWithUsers) => {
    if (role) {
      setSelectedRole(role)
      // map Permission penuh → PermissionDefinition (code,name) via PERMISSION_GROUPS
      const defs: PermissionDefinition[] = []

      role.permissions.forEach((perm: Permission) => {
        const def = PERMISSION_GROUPS
          .flatMap((g) => g.permissions as PermissionDefinition[])
          .find((p) => p.code === perm.code)

        if (def) {
          defs.push(def)
        }
      })

      setFormData({
        name: role.name,
        description: role.description ?? "",
        permissions: defs,
      })
    } else {
      setSelectedRole(null)
      setFormData({
        name: "",
        description: "",
        permissions: [],
      })
    }
    setIsDialogOpen(true)
  }

  const handlePermissionToggle = (permission: PermissionDefinition) => {
    setFormData((prev) => {
      const exists = prev.permissions.some((p) => p.code === permission.code)
      if (exists) {
        return {
          ...prev,
          permissions: prev.permissions.filter((p) => p.code !== permission.code),
        }
      }
      return {
        ...prev,
        permissions: [...prev.permissions, permission],
      }
    })
  }

  const handleGroupToggle = (group: (typeof PERMISSION_GROUPS)[0]) => {
    setFormData((prev) => {
      const allSelected = group.permissions.every((p) =>
        prev.permissions.some((fp) => fp.code === p.code),
      )

      if (allSelected) {
        return {
          ...prev,
          permissions: prev.permissions.filter(
            (p) => !group.permissions.some((gp) => gp.code === p.code),
          ),
        }
      }

      const newPermissions = [...prev.permissions]
      group.permissions.forEach((p) => {
        if (!newPermissions.some((np) => np.code === p.code)) {
          newPermissions.push(p)
        }
      })
      return { ...prev, permissions: newPermissions }
    })
  }

  const handleSubmit: React.FormEventHandler = async (e) => {
    e.preventDefault()

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        // kirim hanya code ke API
        permissions: formData.permissions.map((p) => p.code),
      }

      let res: Response

      if (selectedRole) {
        res = await fetch(`/api/roles/${selectedRole.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        })
      }

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.message || "Gagal menyimpan role")
      }

      toast.success(selectedRole ? "Role berhasil diperbarui" : "Role berhasil ditambahkan")
      setIsDialogOpen(false)
      setSelectedRole(null)
      await loadRoles(selectedRole ? meta?.page ?? 1 : 1)
      if (!selectedRole) setPage(1)
    } catch (error: any) {
      console.error("[ROLE_SAVE]", error)
      toast.error(error?.message || "Gagal menyimpan role")
    }
  }

  const handleDelete = async () => {
    if (!selectedRole) return
    try {
      const res = await fetch(`/api/roles/${selectedRole.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.message || "Gagal menghapus role")
      }
      toast.success("Role berhasil dihapus")

      if (meta && meta.page > 1 && roles.length === 1) {
        setPage(meta.page - 1)
        await loadRoles(meta.page - 1)
      } else {
        await loadRoles(meta?.page ?? 1)
      }
    } catch (error: any) {
      console.error("[ROLE_DELETE]", error)
      toast.error(error?.message || "Gagal menghapus role")
    } finally {
      setIsDeleteDialogOpen(false)
      setSelectedRole(null)
    }
  }

  const columns: Column<RoleWithUsers>[] = [
    {
      key: "name",
      header: "Nama Role",
      cell: (role) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-medium">{role.name}</span>
        </div>
      ),
    },
    {
      key: "description",
      header: "Deskripsi",
      cell: (role) => <span>{role.description}</span>,
    },
    {
      key: "permissions",
      header: "Permissions",
      cell: (role) => (
        <Badge variant="secondary">{role.permissions.length} permission</Badge>
      ),
    },
    {
      key: "users",
      header: "Pengguna",
      cell: (role) => <span>{getUserCount(role.id)} pengguna</span>,
    },
    {
      key: "createdAt",
      header: "Dibuat",
      cell: (role) => <span>{formatDate(role.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      cell: (role) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenDialog(role)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedRole(role)
                setIsDeleteDialogOpen(true)
              }}
              className="text-destructive"
              disabled={getUserCount(role.id) > 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <RequirePermission permission={PERMISSIONS.ROLE_VIEW}>
      <div className="space-y-6">
        <PageHeader
          title="Manajemen Role"
          description="Kelola role dan permission akses sistem"
          actions={
            <RequirePermission permission={PERMISSIONS.ROLE_CREATE} fallback={null}>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Role
              </Button>
            </RequirePermission>
          }
        />

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <DataTable
          data={filteredRoles}
          columns={columns}
          isLoading={isLoading}
          emptyState={{
            title: "Belum ada role",
            description: "Mulai dengan menambahkan role pertama Anda",
          }}
          pagination={
            meta
              ? {
                page: meta.page,
                pageSize: meta.pageSize,
                total: meta.total,
                onPageChange: (p) => {
                  setPage(p)
                  void loadRoles(p)
                },
              }
              : undefined
          }
        />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedRole ? "Edit Role" : "Tambah Role"}</DialogTitle>
              <DialogDescription>
                {selectedRole
                  ? "Ubah informasi dan permission role"
                  : "Tambahkan role baru ke sistem"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Role</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="contoh: Admin Gudang"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Deskripsi singkat tentang role ini"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="border rounded-lg">
                    <Accordion type="multiple" className="w-full">
                      {PERMISSION_GROUPS.map((group) => {
                        const selectedCount = group.permissions.filter((p) =>
                          formData.permissions.some((fp) => fp.code === p.code),
                        ).length
                        const allSelected = selectedCount === group.permissions.length

                        return (
                          <AccordionItem key={group.name} value={group.name}>
                            {/* Trigger HANYA teks + badge, TANPA checkbox */}
                            <AccordionTrigger className="px-4 hover:no-underline">
                              <div className="flex items-center gap-3">
                                <span>{group.name}</span>
                                <Badge variant="secondary" className="ml-2">
                                  {selectedCount}/{group.permissions.length}
                                </Badge>
                              </div>
                            </AccordionTrigger>

                            <AccordionContent className="px-4 pb-4">
                              {/* Checkbox grup: pilih / batal pilih semua, ADA DI CONTENT, bukan di Trigger */}
                              <div className="mb-3 flex items-center gap-2">
                                <Checkbox
                                  checked={allSelected}
                                  onCheckedChange={() => handleGroupToggle(group)}
                                />
                                <span className="text-sm text-muted-foreground">
                                  Pilih semua di grup ini
                                </span>
                              </div>

                              <div className="grid gap-2 ml-1">
                                {group.permissions.map((permission) => (
                                  <label
                                    key={permission.code}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={formData.permissions.some(
                                        (p) => p.code === permission.code,
                                      )}
                                      onCheckedChange={() => handlePermissionToggle(permission)}
                                    />
                                    <span className="text-sm">{permission.name}</span>
                                  </label>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )
                      })}
                    </Accordion>

                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit">{selectedRole ? "Simpan" : "Tambah"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title="Hapus Role"
          description={`Apakah Anda yakin ingin menghapus role "${selectedRole?.name}"? Role yang masih memiliki pengguna tidak dapat dihapus.`}
          onConfirm={handleDelete}
          confirmLabel="Hapus"
          variant="destructive"
        />
      </div>
    </RequirePermission>
  )
}
