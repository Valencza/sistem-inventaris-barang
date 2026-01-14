import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { verifyAuthToken } from "@/lib/auth"

async function userHasPermission(userId: string, permissionCode: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
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

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("access_token")?.value
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyAuthToken(token)
    const userId = String(payload.sub)

    const allowed = await userHasPermission(userId, "stock.view")
    if (!allowed) {
      return NextResponse.json(
        { message: "Forbidden: tidak punya akses melihat stok" },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(req.url)
    const productId = searchParams.get("productId") || undefined
    const warehouseId = searchParams.get("warehouseId") || undefined

    // pagination params (untuk list stok)
    const pageParam = searchParams.get("page")
    const pageSizeParam = searchParams.get("pageSize")
    const search = searchParams.get("search") || undefined

    const page = Math.max(Number(pageParam) || 1, 1)
    const pageSize = Math.min(Math.max(Number(pageSizeParam) || 10, 1), 200)
    const skip = (page - 1) * pageSize

    // Jika kedua parameter ada: kembalikan saldo satu kombinasi (untuk form stok masuk/keluar)
    if (productId && warehouseId) {
      const stock = await prisma.stock.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
      })

      return NextResponse.json({
        data: {
          productId,
          warehouseId,
          quantity: stock?.quantity ?? 0,
          minStock: stock?.minStock ?? 0,
        },
      })
    }

    // List stok (untuk halaman /dashboard/stok) dengan filter + pagination
    const where: any = {}

    if (productId) {
      where.productId = productId
    }
    if (warehouseId && warehouseId !== "all") {
      where.warehouseId = warehouseId
    }
    if (search) {
      // filter via relasi product (nama atau sku)
      where.OR = [
        {
          product: {
            name: { contains: search, mode: "insensitive" },
          },
        },
        {
          product: {
            sku: { contains: search, mode: "insensitive" },
          },
        },
      ]
    }

    const [total, stocks] = await Promise.all([
      prisma.stock.count({ where }),
      prisma.stock.findMany({
        where,
        include: {
          product: true,
          warehouse: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        skip,
        take: pageSize,
      }),
    ])

    const data = stocks.map((s) => ({
      id: s.id,
      productId: s.productId,
      warehouseId: s.warehouseId,
      quantity: s.quantity,
      minStock: s.minStock,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      product: s.product || undefined,
      warehouse: s.warehouse || undefined,
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
    console.error("[STOCK_GET]", error)
    return NextResponse.json(
      { message: "Gagal memuat data stok" },
      { status: 500 },
    )
  }
}
