import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"

type RouteContext = { params: Promise<{ id: string }> }

// PUT /api/roles/:id
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params // ⬅ wajib await

  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, permissions } = body as {
      name?: string
      description?: string
      permissions?: string[]
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: "Nama role wajib diisi" },
        { status: 400 },
      )
    }

    const existing = await prisma.role.findUnique({
      where: { id }, // sekarang id pasti string
      include: {
        permissions: { include: { permission: true } },
      },
    })

    if (!existing) {
      return NextResponse.json({ message: "Role tidak ditemukan" }, { status: 404 })
    }

    const codes = Array.isArray(permissions) ? permissions : []
    const uniqueCodes = [...new Set(codes)]

    const dbPermissions = await prisma.permission.findMany({
      where: { code: { in: uniqueCodes } },
    })

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null
    const userAgent = req.headers.get("user-agent") ?? null

    const updated = await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      })

      const role = await tx.role.update({
        where: { id },
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          permissions: {
            create: dbPermissions.map((p) => ({
              permissionId: p.id,
            })),
          },
        },
        include: {
          permissions: { include: { permission: true } },
          users: true,
        },
      })

      await createAuditLog({
        tx,
        userId: user.id,
        action: "UPDATE",
        entity: "role",
        entityId: role.id,
        oldData: {
          name: existing.name,
          description: existing.description,
          permissions: existing.permissions.map((rp) => rp.permission.code),
        },
        newData: {
          name: role.name,
          description: role.description,
          permissions: role.permissions.map((rp) => rp.permission.code),
        },
        ipAddress: ip,
        userAgent,
      })

      return role
    })

    const result = {
      id: updated.id,
      name: updated.name,
      description: updated.description ?? undefined,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      permissions: updated.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        code: rp.permission.code,
        description: rp.permission.description ?? undefined,
        module: rp.permission.module,
      })),
      userCount: updated.users.length,
    }

    return NextResponse.json({ data: result }, { status: 200 })
  } catch (error) {
    console.error("[ROLES_PUT]", error)
    return NextResponse.json(
      { message: "Gagal memperbarui role" },
      { status: 500 },
    )
  }
}

// DELETE /api/roles/:id
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params // ⬅ di‑await juga

  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const existing = await prisma.role.findUnique({
      where: { id },
      include: {
        users: true,
        permissions: { include: { permission: true } },
      },
    })

    if (!existing) {
      return NextResponse.json({ message: "Role tidak ditemukan" }, { status: 404 })
    }

    if (existing.users.length > 0) {
      return NextResponse.json(
        { message: "Role masih memiliki pengguna dan tidak dapat dihapus" },
        { status: 400 },
      )
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null
    const userAgent = req.headers.get("user-agent") ?? null

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      })

      await tx.role.delete({
        where: { id },
      })

      await createAuditLog({
        tx,
        userId: user.id,
        action: "DELETE",
        entity: "role",
        entityId: id,
        oldData: {
          name: existing.name,
          description: existing.description,
          permissions: existing.permissions.map((rp) => rp.permission.code),
        },
        newData: null,
        ipAddress: ip,
        userAgent,
      })
    })

    return NextResponse.json({ message: "Role berhasil dihapus" }, { status: 200 })
  } catch (error) {
    console.error("[ROLES_DELETE]", error)
    return NextResponse.json(
      { message: "Gagal menghapus role" },
      { status: 500 },
    )
  }
}
