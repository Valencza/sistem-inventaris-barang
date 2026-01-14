import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"

type RouteContext = { params: Promise<{ id: string }> }

// PUT /api/users/:id
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params

  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const body = await req.json()
    const { name, email, isActive, roleIds } = body as {
      name?: string
      email?: string
      isActive?: boolean
      roleIds?: string[]
    }

    if (!name || !name.trim() || !email || !email.trim()) {
      return NextResponse.json(
        { message: "Nama dan email wajib diisi" },
        { status: 400 },
      )
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { message: "Pengguna tidak ditemukan" },
        { status: 404 },
      )
    }

    const rolesToAssign = Array.isArray(roleIds) ? [...new Set(roleIds)] : []

    const forwardedFor = req.headers.get("x-forwarded-for")
    const realIp = req.headers.get("x-real-ip")
    const ip =
      forwardedFor?.split(",")[0]?.trim() ??
      realIp ??
      null
    const userAgent = req.headers.get("user-agent") ?? null

    const updated = await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: { userId: id },
      })

      const user = await tx.user.update({
        where: { id },
        data: {
          name: name.trim(),
          email: email.trim(),
          isActive:
            typeof isActive === "boolean" ? isActive : existing.isActive,
          roles: {
            create: rolesToAssign.map((roleId) => ({
              roleId,
            })),
          },
        },
        include: {
          roles: { include: { role: true } },
        },
      })

      await createAuditLog({
        tx,
        userId: authUser.id,
        action: "UPDATE",
        entity: "user",
        entityId: user.id,
        oldData: {
          name: existing.name,
          email: existing.email,
          isActive: existing.isActive,
          roles: existing.roles.map((ur) => ur.roleId),
        },
        newData: {
          name: user.name,
          email: user.email,
          isActive: user.isActive,
          roles: user.roles.map((ur) => ur.roleId),
        },
        ipAddress: ip,
        userAgent,
      })

      return user
    })

    const result = {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      roles: updated.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description ?? undefined,
        createdAt: ur.role.createdAt,
        updatedAt: ur.role.updatedAt,
        permissions: [],
      })),
    }

    return NextResponse.json({ data: result }, { status: 200 })
  } catch (error: any) {
    console.error("[USERS_PUT]", error)

    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return NextResponse.json(
        { message: "Email sudah terdaftar" },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { message: "Gagal memperbarui pengguna" },
      { status: 500 },
    )
  }
}

// DELETE /api/users/:id
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params

  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    if (authUser.id === id) {
      return NextResponse.json(
        { message: "Tidak dapat menghapus akun sendiri" },
        { status: 400 },
      )
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { message: "Pengguna tidak ditemukan" },
        { status: 404 },
      )
    }

    const forwardedFor = req.headers.get("x-forwarded-for")
    const realIp = req.headers.get("x-real-ip")
    const ip =
      forwardedFor?.split(",")[0]?.trim() ??
      realIp ??
      null
    const userAgent = req.headers.get("user-agent") ?? null

    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: { userId: id },
      })

      await tx.user.delete({
        where: { id },
      })

      await createAuditLog({
        tx,
        userId: authUser.id,
        action: "DELETE",
        entity: "user",
        entityId: id,
        oldData: {
          name: existing.name,
          email: existing.email,
          isActive: existing.isActive,
          roles: existing.roles.map((ur) => ur.roleId),
        },
        newData: null,
        ipAddress: ip,
        userAgent,
      })
    })

    return NextResponse.json(
      { message: "Pengguna berhasil dihapus" },
      { status: 200 },
    )
  } catch (error) {
    console.error("[USERS_DELETE]", error)
    return NextResponse.json(
      { message: "Gagal menghapus pengguna" },
      { status: 500 },
    )
  }
}
