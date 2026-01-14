import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import type { Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"

// GET /api/users?page=&pageSize=&q=
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const pageParam = searchParams.get("page")
    const pageSizeParam = searchParams.get("pageSize")
    const q = searchParams.get("q")?.trim().toLowerCase() ?? ""

    const page = Math.max(Number(pageParam) || 1, 1)
    const pageSize = Math.min(Math.max(Number(pageSizeParam) || 10, 1), 100)
    const skip = (page - 1) * pageSize

    const where: Prisma.UserWhereInput =
      q === ""
        ? {}
        : {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      }),
    ])

    const data = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      roles: u.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description ?? undefined,
        createdAt: ur.role.createdAt,
        updatedAt: ur.role.updatedAt,
        permissions: [],
      })),
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
    console.error("[USERS_GET]", error)
    return NextResponse.json(
      { message: "Gagal memuat pengguna" },
      { status: 500 },
    )
  }
}

// POST /api/users
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const body = await req.json()
    const { name, email, password, roleIds, isActive } = body as {
      name?: string
      email?: string
      password?: string
      roleIds?: string[]
      isActive?: boolean
    }

    if (!name || !name.trim() || !email || !email.trim()) {
      return NextResponse.json(
        { message: "Nama dan email wajib diisi" },
        { status: 400 },
      )
    }

    if (!password || !password.trim()) {
      return NextResponse.json(
        { message: "Password wajib diisi" },
        { status: 400 },
      )
    }

    const rolesToAssign = Array.isArray(roleIds) ? [...new Set(roleIds)] : []

    // HASH password pakai bcryptjs
    const passwordHash = await bcrypt.hash(password.trim(), 10)

    const forwardedFor = req.headers.get("x-forwarded-for")
    const realIp = req.headers.get("x-real-ip")
    const ip =
      forwardedFor?.split(",")[0]?.trim() ??
      realIp ??
      null
    const userAgent = req.headers.get("user-agent") ?? null

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.trim(),
          passwordHash,
          isActive: isActive ?? true,
          roles: {
            create: rolesToAssign.map((roleId) => ({
              roleId,
            })),
          },
        },
        include: {
          roles: {
            include: { role: true },
          },
        },
      })

      await createAuditLog({
        tx,
        userId: authUser.id,
        action: "CREATE",
        entity: "user",
        entityId: user.id,
        oldData: null,
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
      id: created.id,
      email: created.email,
      name: created.name,
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      roles: created.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description ?? undefined,
        createdAt: ur.role.createdAt,
        updatedAt: ur.role.updatedAt,
        permissions: [],
      })),
    }

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error: any) {
    console.error("[USERS_POST]", error)

    // tangani email duplikat (Prisma P2002) biar msg lebih jelas
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return NextResponse.json(
        { message: "Email sudah terdaftar" },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { message: "Gagal menyimpan pengguna" },
      { status: 500 },
    )
  }
}
