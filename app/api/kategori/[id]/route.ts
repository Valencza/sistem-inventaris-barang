import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { verifyAuthToken } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"

type RouteContext = {
  params: Promise<{ id: string }>
}

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

// GET /api/kategori/[id]
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

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

    const category = await prisma.category.findUnique({
      where: { id },
    })

    if (!category) {
      return NextResponse.json({ message: "Kategori tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({ data: category }, { status: 200 })
  } catch (error) {
    console.error("[KATEGORI_GET_ID]", error)
    return NextResponse.json(
      { message: "Gagal memuat kategori" },
      { status: 500 },
    )
  }
}

// PUT /api/kategori/[id]
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const cookieStore = await cookies()
    const token = cookieStore.get("access_token")?.value
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyAuthToken(token)
    const userId = String(payload.sub)

    const allowed = await userHasPermission(userId, "category.update")
    if (!allowed) {
      return NextResponse.json(
        { message: "Forbidden: tidak punya akses mengubah kategori" },
        { status: 403 },
      )
    }

    const forwardedFor = req.headers.get("x-forwarded-for")
    const realIp = req.headers.get("x-real-ip")
    const ip =
      forwardedFor?.split(",")[0]?.trim() ??
      realIp ??
      null
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

    const category = await prisma.$transaction(async (tx) => {
      const existing = await tx.category.findUnique({ where: { id } })
      if (!existing) {
        throw new Error("NOT_FOUND")
      }

      const rawSlug = (slug ?? "").trim()
      const finalSlug =
        rawSlug !== ""
          ? rawSlug
          : name
              .trim()
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, "") || existing.slug

      const updated = await tx.category.update({
        where: { id },
        data: {
          name: name.trim(),
          slug: finalSlug,
          description: description?.trim() || null,
        },
      })

      await createAuditLog({
        tx,
        userId,
        action: "UPDATE",
        entity: "category",
        entityId: updated.id,
        oldData: {
          id: existing.id,
          name: existing.name,
          slug: existing.slug,
          description: existing.description,
        },
        newData: {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          description: updated.description,
        },
        ipAddress: ip,
        userAgent,
      })

      return updated
    })

    return NextResponse.json({ data: category }, { status: 200 })
  } catch (error: any) {
    console.error("[KATEGORI_PUT_ID]", error)

    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ message: "Kategori tidak ditemukan" }, { status: 404 })
    }

    if (error?.code === "P2002") {
      return NextResponse.json(
        { message: "Slug atau nama kategori sudah digunakan" },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { message: "Gagal memperbarui kategori" },
      { status: 500 },
    )
  }
}

// DELETE /api/kategori/[id]
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const cookieStore = await cookies()
    const token = cookieStore.get("access_token")?.value
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyAuthToken(token)
    const userId = String(payload.sub)

    const allowed = await userHasPermission(userId, "category.delete")
    if (!allowed) {
      return NextResponse.json(
        { message: "Forbidden: tidak punya akses menghapus kategori" },
        { status: 403 },
      )
    }

    const forwardedFor = req.headers.get("x-forwarded-for")
    const realIp = req.headers.get("x-real-ip")
    const ip =
      forwardedFor?.split(",")[0]?.trim() ??
      realIp ??
      null
    const userAgent = req.headers.get("user-agent") ?? null

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.category.findUnique({ where: { id } })
      if (!existing) {
        throw new Error("NOT_FOUND")
      }

      // Cek masih ada produk yang pakai kategori ini
      const productCount = await tx.product.count({
        where: { categoryId: id },
      })

      if (productCount > 0) {
        throw new Error("HAS_PRODUCTS")
      }

      await tx.category.delete({ where: { id } })

      await createAuditLog({
        tx,
        userId,
        action: "DELETE",
        entity: "category",
        entityId: existing.id,
        oldData: {
          id: existing.id,
          name: existing.name,
          slug: existing.slug,
          description: existing.description,
        },
        newData: null,
        ipAddress: ip,
        userAgent,
      })

      return { id: existing.id, deleted: true }
    })

    return NextResponse.json({ data: result }, { status: 200 })
  } catch (error: any) {
    console.error("[KATEGORI_DELETE_ID]", error)

    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ message: "Kategori tidak ditemukan" }, { status: 404 })
    }

    if (error instanceof Error && error.message === "HAS_PRODUCTS") {
      return NextResponse.json(
        { message: "Tidak dapat menghapus kategori yang masih memiliki produk" },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { message: "Gagal menghapus kategori" },
      { status: 500 },
    )
  }
}
