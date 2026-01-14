import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { verifyAuthToken } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"

// Helper cek permission
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
 * GET /api/produk/[id]
 * Detail satu produk.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { params } = context
    const { id } = await params

    const cookieStore = await cookies()
    const token = cookieStore.get("access_token")?.value

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyAuthToken(token)
    const userId = String(payload.sub)

    const allowed = await userHasPermission(userId, "product.view")
    if (!allowed) {
      return NextResponse.json(
        { message: "Forbidden: tidak punya akses melihat produk" },
        { status: 403 },
      )
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stocks: true,
      },
    })

    if (!product) {
      return NextResponse.json(
        { message: "Produk tidak ditemukan" },
        { status: 404 },
      )
    }

    const totalStock = product.stocks.reduce((sum, s) => sum + s.quantity, 0)

    const result = {
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      unit: product.unit,
      image: product.imageUrl,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      categoryId: product.categoryId,
      category: product.category,
      totalStock,
      minStock: product.minStock,
    }

    // (opsional) audit view detail
    const ipAddress = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip")
    const userAgent = req.headers.get("user-agent")

    await createAuditLog({
      userId,
      action: "PRODUCT_DETAIL_VIEW",
      entity: "product",
      entityId: product.id,
      oldData: null,
      newData: { id: product.id, sku: product.sku, name: product.name },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ product: result }, { status: 200 })
  } catch (error) {
    console.error("GET /api/produk/[id] error", error)
    return NextResponse.json(
      { message: "Gagal mengambil detail produk" },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/produk/[id]
 * Update data produk.
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { params } = context
    const { id } = await params

    const cookieStore = await cookies()
    const token = cookieStore.get("access_token")?.value

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyAuthToken(token)
    const userId = String(payload.sub)

    const allowed = await userHasPermission(userId, "product.update")
    if (!allowed) {
      return NextResponse.json(
        { message: "Forbidden: tidak punya akses mengubah produk" },
        { status: 403 },
      )
    }

    const body = await req.json()

    // snapshot sebelum update
    const before = await prisma.product.findUnique({
      where: { id },
    })
    if (!before) {
      return NextResponse.json(
        { message: "Produk tidak ditemukan" },
        { status: 404 },
      )
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        slug: body.slug,
        sku: body.sku,
        description: body.description,
        price: body.price,
        categoryId: body.categoryId,
        minStock: body.minStock,
        isActive: body.isActive,
        unit: body.unit ?? before.unit,
        imageUrl: body.imageUrl ?? before.imageUrl,
      },
    })

    const ipAddress = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip")
    const userAgent = req.headers.get("user-agent")

    await createAuditLog({
      userId,
      action: "PRODUCT_UPDATE",
      entity: "product",
      entityId: updated.id,
      oldData: {
        id: before.id,
        sku: before.sku,
        name: before.name,
        price: before.price,
        categoryId: before.categoryId,
        minStock: before.minStock,
        isActive: before.isActive,
      },
      newData: {
        id: updated.id,
        sku: updated.sku,
        name: updated.name,
        price: updated.price,
        categoryId: updated.categoryId,
        minStock: updated.minStock,
        isActive: updated.isActive,
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json(
      { message: "Produk berhasil diperbarui", product: updated },
      { status: 200 },
    )
  } catch (error) {
    console.error("PUT /api/produk/[id] error", error)
    return NextResponse.json(
      { message: "Gagal memperbarui produk" },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/produk/[id]
 * Hapus produk.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { params } = context
    const { id } = await params

    const cookieStore = await cookies()
    const token = cookieStore.get("access_token")?.value

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyAuthToken(token)
    const userId = String(payload.sub)

    const allowed = await userHasPermission(userId, "product.delete")
    if (!allowed) {
      return NextResponse.json(
        { message: "Forbidden: tidak punya akses menghapus produk" },
        { status: 403 },
      )
    }

    const before = await prisma.product.findUnique({
      where: { id },
    })
    if (!before) {
      return NextResponse.json(
        { message: "Produk tidak ditemukan" },
        { status: 404 },
      )
    }

    await prisma.product.delete({
      where: { id },
    })

    const ipAddress = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip")
    const userAgent = req.headers.get("user-agent")

    await createAuditLog({
      userId,
      action: "PRODUCT_DELETE",
      entity: "product",
      entityId: before.id,
      oldData: {
        id: before.id,
        sku: before.sku,
        name: before.name,
        price: before.price,
        categoryId: before.categoryId,
        minStock: before.minStock,
        isActive: before.isActive,
      },
      newData: null,
      ipAddress,
      userAgent,
    })

    return NextResponse.json(
      { message: "Produk berhasil dihapus" },
      { status: 200 },
    )
  } catch (error) {
    console.error("DELETE /api/produk/[id] error", error)
    return NextResponse.json(
      { message: "Gagal menghapus produk" },
      { status: 500 },
    )
  }
}
