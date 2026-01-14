import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { verifyAuthToken } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"

/**
 * Cek apakah user punya permission tertentu.
 */
async function userHasPermission(userId: string, permissionCode: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!user) return false

  const codes = user.roles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission.code),
  )

  return codes.includes(permissionCode)
}

/**
 * GET /api/kategori
 * Mengembalikan daftar kategori (paginated).
 * Query: page, pageSize
 * Butuh permission "category.view".
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("access_token")?.value

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyAuthToken(token)
    const userId = String(payload.sub)

    const allowed = await userHasPermission(userId, "category.view")
    if (!allowed) {
      return NextResponse.json(
        { message: "Forbidden: tidak punya akses melihat kategori" },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(req.url)
    const pageParam = searchParams.get("page")
    const pageSizeParam = searchParams.get("pageSize")

    const page = Math.max(Number(pageParam) || 1, 1)
    const pageSize = Math.min(Math.max(Number(pageSizeParam) || 10, 1), 200)
    const skip = (page - 1) * pageSize

    const where = {} // kalau nanti mau tambah filter, taruh di sini

    const [total, categories] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        orderBy: [
          { createdAt: "desc" },
          { name: "asc" },
        ],
        skip,
        take: pageSize,
        // kalau mau productCount: pastikan di schema:
        // Category { products Product[] }
        include: {
          _count: {
            select: { products: true },
          },
        },
      }),
    ])

    const data = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      // map ke field yang dipakai CategoryWithCount di FE
      productCount: (c as any)._count?.products ?? 0,
    }))

    return NextResponse.json(
      {
        data,
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("GET /api/kategori error", error)
    return NextResponse.json(
      { message: "Gagal mengambil data kategori" },
      { status: 500 },
    )
  }
}

/**
 * POST /api/kategori
 * Membuat kategori baru.
 * Butuh permission "category.create".
 * Body: { name: string; slug?: string; description?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("access_token")?.value

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyAuthToken(token)
    const userId = String(payload.sub)

    const allowed = await userHasPermission(userId, "category.create")
    if (!allowed) {
      return NextResponse.json(
        { message: "Forbidden: tidak punya akses membuat kategori" },
        { status: 403 },
      )
    }

    const forwardedFor = req.headers.get("x-forwarded-for")
    const realIp = req.headers.get("x-real-ip")
    const ip = forwardedFor?.split(",")[0]?.trim() ?? realIp ?? null
    const userAgent = req.headers.get("user-agent") ?? null

    const body = await req.json()
    const { name, slug, description } = body as {
      name?: string
      slug?: string
      description?: string
    }

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { message: "Nama kategori wajib diisi" },
        { status: 400 },
      )
    }

    const rawSlug = (slug ?? "").trim()
    const finalSlug =
      rawSlug !== ""
        ? rawSlug
        : name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "") || "kategori"

    const dataToCreate = {
      name: name.trim(),
      slug: finalSlug,
      description: description?.trim() || undefined,
    }

    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: dataToCreate,
      })

      await createAuditLog({
        tx,
        userId,
        action: "CREATE",
        entity: "kategori",
        entityId: created.id,
        oldData: null,
        newData: {
          id: created.id,
          name: created.name,
          slug: created.slug,
          description: created.description,
        },
        ipAddress: ip,
        userAgent,
      })

      return created
    })

    return NextResponse.json({ data: category }, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/kategori error", error)

    if (error?.code === "P2002") {
      return NextResponse.json(
        { message: "Slug atau nama kategori sudah digunakan" },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { message: "Gagal membuat kategori" },
      { status: 500 },
    )
  }
}
