import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"

// GET /api/roles?page=&pageSize=
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const pageParam = searchParams.get("page")
    const pageSizeParam = searchParams.get("pageSize")

    const page = Math.max(Number(pageParam) || 1, 1)
    const pageSize = Math.min(Math.max(Number(pageSizeParam) || 10, 1), 100)
    const skip = (page - 1) * pageSize

    const [total, roles] = await Promise.all([
      prisma.role.count(),
      prisma.role.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          permissions: {
            include: {
              permission: true, // RolePermission.permission
            },
          },
          users: true, // UserRole[]
        },
      }),
    ])

    const data = roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      permissions: r.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        code: rp.permission.code,
        description: rp.permission.description ?? undefined,
        module: rp.permission.module,
      })),
      userCount: r.users.length,
    }))

    return NextResponse.json(
      {
        data,
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[ROLES_GET]", error)
    return NextResponse.json(
      { message: "Gagal memuat role" },
      { status: 500 },
    )
  }
}

// POST /api/roles
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, permissions } = body as {
      name?: string
      description?: string
      permissions?: string[] // array kode permission
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: "Nama role wajib diisi" },
        { status: 400 },
      )
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

    const created = await prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          permissions: {
            create: dbPermissions.map((p) => ({
              permissionId: p.id,
            })), // RolePermission
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
        action: "CREATE",
        entity: "role",
        entityId: role.id,
        oldData: null,
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
      id: created.id,
      name: created.name,
      description: created.description ?? undefined,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      permissions: created.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        code: rp.permission.code,
        description: rp.permission.description ?? undefined,
        module: rp.permission.module,
      })),
      userCount: created.users.length,
    }

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    console.error("[ROLES_POST]", error)
    return NextResponse.json(
      { message: "Gagal menyimpan role" },
      { status: 500 },
    )
  }
}
