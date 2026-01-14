"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { RequirePermission } from "@/components/auth/require-permission"
import type { User, Role } from "@/lib/types"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Key,
  Search,
  UserCheck,
  UserX,
} from "lucide-react"
import { formatDate } from "@/lib/utils/format"
import { toast } from "sonner"

type UserWithRoles = User & {
  roles: Role[]
  lastLogin?: Date
}

type Meta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function UserList() {
  const { user: currentUser, PERMISSIONS } = useAuth()

  const [users, setUsers] = useState<UserWithRoles[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "",
    isActive: true,
  })
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  })

  // pagination state
  const [meta, setMeta] = useState<Meta | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 10

  // LOAD USERS & ROLES (dengan pagination & optional search q)
  const loadData = async (pageArg = page, searchArg = search) => {
    try {
      setIsLoading(true)

      const userParams = new URLSearchParams()
      userParams.set("page", String(pageArg))
      userParams.set("pageSize", String(pageSize))
      if (searchArg.trim()) userParams.set("q", searchArg.trim())

      const [userRes, roleRes] = await Promise.all([
        fetch(`/api/users?${userParams.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
        fetch("/api/roles?pageSize=200", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
      ])

      const [userJson, roleJson] = await Promise.all([
        userRes.json(),
        roleRes.json(),
      ])

      if (!userRes.ok) throw new Error(userJson?.message || "Gagal memuat pengguna")
      if (!roleRes.ok) throw new Error(roleJson?.message || "Gagal memuat role")

      setUsers((userJson.data ?? []) as UserWithRoles[])
      setRoles((roleJson.data ?? []) as Role[])
      setMeta(
        userJson.meta ?? {
          page: pageArg,
          pageSize,
          total: (userJson.data ?? []).length,
          totalPages: 1,
        },
      )
    } catch (error: any) {
      console.error("[USER_LIST_LOAD]", error)
      toast.error(error?.message || "Gagal memuat data pengguna")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData(1)
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // kalau search berubah, reset ke page 1 dan reload dari server
  useEffect(() => {
    const handler = setTimeout(() => {
      void loadData(1, search)
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // optional: masih bisa filter tipis di client (misal roles) kalau mau
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roles.some((r) => r.name.toLowerCase().includes(q)),
    )
  }, [users, search])

  const handleOpenDialog = (user?: UserWithRoles) => {
    if (user) {
      setSelectedUser(user)
      setFormData({
        name: user.name,
        email: user.email,
        password: "",
        roleId: user.roles[0]?.id ?? "",
        isActive: user.isActive,
      })
    } else {
      setSelectedUser(null)
      setFormData({
        name: "",
        email: "",
        password: "",
        roleId: "",
        isActive: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleOpenPasswordDialog = (user: UserWithRoles) => {
    setSelectedUser(user)
    setPasswordData({ newPassword: "", confirmPassword: "" })
    setIsPasswordDialogOpen(true)
  }

  const handleSubmit: React.FormEventHandler = async (e) => {
    e.preventDefault()

    if (!formData.roleId) {
      toast.error("Role wajib dipilih")
      return
    }

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password || undefined,
        roleIds: [formData.roleId],
        isActive: formData.isActive,
      }

      let res: Response

      if (selectedUser) {
        res = await fetch(`/api/users/${selectedUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        })
      }

      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || "Gagal menyimpan pengguna")

      toast.success(
        selectedUser ? "Pengguna berhasil diperbarui" : "Pengguna berhasil ditambahkan",
      )
      setIsDialogOpen(false)
      setSelectedUser(null)
      await loadData(selectedUser ? meta?.page ?? 1 : 1, search)
      if (!selectedUser) setPage(1)
    } catch (error: any) {
      console.error("[USER_SAVE]", error)
      toast.error(error?.message || "Gagal menyimpan pengguna")
    }
  }

  const handleChangePassword: React.FormEventHandler = async (e) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Password tidak cocok")
      return
    }

    if (!selectedUser) return

    try {
      const res = await fetch(`/api/users/${selectedUser.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: passwordData.newPassword }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || "Gagal mengubah password")
      toast.success("Password berhasil diubah")
      setIsPasswordDialogOpen(false)
      setSelectedUser(null)
    } catch (error: any) {
      console.error("[USER_PASSWORD]", error)
      toast.error(error?.message || "Gagal mengubah password")
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || "Gagal menghapus pengguna")
      toast.success("Pengguna berhasil dihapus")

      if (meta && meta.page > 1 && users.length === 1) {
        setPage(meta.page - 1)
        await loadData(meta.page - 1, search)
      } else {
        await loadData(meta?.page ?? 1, search)
      }
    } catch (error: any) {
      console.error("[USER_DELETE]", error)
      toast.error(error?.message || "Gagal menghapus pengguna")
    } finally {
      setIsDeleteDialogOpen(false)
      setSelectedUser(null)
    }
  }

  const handleToggleStatus = async (user: UserWithRoles) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          isActive: !user.isActive,
          roleIds: user.roles.map((r) => r.id),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || "Gagal mengubah status pengguna")
      toast.success("Status pengguna berhasil diubah")
      await loadData(meta?.page ?? 1, search)
    } catch (error: any) {
      console.error("[USER_TOGGLE_STATUS]", error)
      toast.error(error?.message || "Gagal mengubah status pengguna")
    }
  }

  const columns: Column<UserWithRoles>[] = [
    {
      key: "name",
      header: "Nama",
      cell: (user) => <span className="font-medium">{user.name}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (user) => <span>{user.email}</span>,
    },
    {
      key: "roles",
      header: "Role",
      cell: (user) =>
        user.roles.length ? (
          <div className="flex flex-wrap gap-1">
            {user.roles.map((r) => (
              <Badge key={r.id} variant="outline">
                {r.name}
              </Badge>
            ))}
          </div>
        ) : (
          <span>-</span>
        ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (user) => (
        <Badge variant={user.isActive ? "default" : "secondary"}>
          {user.isActive ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Dibuat",
      cell: (user) => <span>{formatDate(user.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      cell: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={user.id === currentUser?.id}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenDialog(user)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOpenPasswordDialog(user)}>
              <Key className="mr-2 h-4 w-4" />
              Ubah Password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleToggleStatus(user)}>
              {user.isActive ? (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Nonaktifkan
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Aktifkan
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedUser(user)
                setIsDeleteDialogOpen(true)
              }}
              className="text-destructive"
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
    <RequirePermission permission={PERMISSIONS.USER_VIEW}>
      <div className="space-y-6">
        <PageHeader
          title="Manajemen Pengguna"
          description="Kelola pengguna dan hak akses sistem"
          actions={
            <RequirePermission permission={PERMISSIONS.USER_CREATE} fallback={null}>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Pengguna
              </Button>
            </RequirePermission>
          }
        />

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari pengguna..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <DataTable
          data={filteredUsers}
          columns={columns}
          isLoading={isLoading}
          emptyState={{
            title: "Belum ada pengguna",
            description: "Mulai dengan menambahkan pengguna pertama Anda",
          }}
          pagination={
            meta
              ? {
                page: meta.page,
                pageSize: meta.pageSize,
                total: meta.total,
                onPageChange: (p) => {
                  setPage(p)
                  void loadData(p, search)
                },
              }
              : undefined
          }
        />

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedUser ? "Edit Pengguna" : "Tambah Pengguna"}
              </DialogTitle>
              <DialogDescription>
                {selectedUser
                  ? "Ubah informasi pengguna"
                  : "Tambahkan pengguna baru ke sistem"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    required
                  />
                </div>
                {!selectedUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="roleId">Role</Label>
                  <Select
                    value={formData.roleId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, roleId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isActive">Status</Label>
                  <Select
                    value={formData.isActive ? "active" : "inactive"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: value === "active",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="inactive">Nonaktif</SelectItem>
                    </SelectContent>
                  </Select>
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
                <Button type="submit">
                  {selectedUser ? "Simpan" : "Tambah"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ubah Password</DialogTitle>
              <DialogDescription>
                Ubah password untuk {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleChangePassword}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Password Baru</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit">Ubah Password</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title="Hapus Pengguna"
          description={`Apakah Anda yakin ingin menghapus pengguna "${selectedUser?.name}"? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={handleDelete}
          confirmLabel="Hapus"
          variant="destructive"
        />
      </div>
    </RequirePermission>
  )
}
