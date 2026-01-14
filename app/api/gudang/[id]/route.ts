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

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const cookieStore = await cookies()
    const token = cookieStore.get("access_token")?.value
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const payload = await verifyAuthToken(token)
    const userId = String(payload.sub)

    const allowed = await userHasPermission(userId, "warehouse.update")
    if (!allowed) {
      return NextResponse.json(
        { message: "Forbidden: tidak punya akses mengubah gudang" },
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
    const { code, name, address, pic, phone, isActive } = body

    if (!code || !name || !address || !pic) {
      return NextResponse.json(
        { message: "Kode, nama, alamat, dan PIC wajib diisi" },
        { status: 400 },
      )
    }

    const warehouse = await prisma.$transaction(async (tx) => {
      const existing = await tx.warehouse.findUnique({ where: { id } })
      if (!existing) {
        throw new Error("NOT_FOUND")
      }

      const updated = await tx.warehouse.update({
        where: { id },
        data: {
          code: String(code).toUpperCase(),
          name,
          address,
          pic,
          phone: phone || null,
          isActive: typeof isActive === "boolean" ? isActive : true,
        },
      })

      await createAuditLog({
        tx,
        userId,
        action: "UPDATE",
        entity: "warehouse",
        entityId: updated.id,
        oldData: {
          code: existing.code,
          name: existing.name,
          address: existing.address,
          pic: existing.pic,
          phone: existing.phone,
          isActive: existing.isActive,
        },
        newData: {
          code: updated.code,
          name: updated.name,
          address: updated.address,
          pic: updated.pic,
          phone: updated.phone,
          isActive: updated.isActive,
        },
        ipAddress: ip,
        userAgent,
      })

      return updated
    })

    return NextResponse.json({ data: warehouse }, { status: 200 })
  } catch (error: any) {
    console.error("[WAREHOUSE_PUT]", error)

    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ message: "Gudang tidak ditemukan" }, { status: 404 })
    }

    if (error?.code === "P2002") {
      return NextResponse.json({ message: "Kode gudang sudah digunakan" }, { status: 400 })
    }

    return NextResponse.json({ message: "Gagal memperbarui gudang" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const cookieStore = await cookies()
    const token = cookieStore.get("access_token")?.value
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const payload = await verifyAuthToken(token)
    const userId = String(payload.sub)

    const allowed = await userHasPermission(userId, "warehouse.delete")
    if (!allowed) {
      return NextResponse.json(
        { message: "Forbidden: tidak punya akses menghapus gudang" },
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
      const existing = await tx.warehouse.findUnique({ where: { id } })
      if (!existing) {
        throw new Error("NOT_FOUND")
      }

      const stocksAgg = await tx.stock.aggregate({
        where: { warehouseId: id },
        _sum: { quantity: true },
      })

      const totalStock = stocksAgg._sum.quantity ?? 0
      if (totalStock > 0) {
        throw new Error("HAS_STOCK")
      }

      await tx.warehouse.delete({ where: { id } })

      await createAuditLog({
        tx,
        userId,
        action: "DELETE",
        entity: "warehouse",
        entityId: existing.id,
        oldData: {
          code: existing.code,
          name: existing.name,
          address: existing.address,
          pic: existing.pic,
          phone: existing.phone,
          isActive: existing.isActive,
        },
        newData: null,
        ipAddress: ip,
        userAgent,
      })

      return { message: "Gudang berhasil dihapus" }
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("[WAREHOUSE_DELETE]", error)

    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ message: "Gudang tidak ditemukan" }, { status: 404 })
    }

    if (error instanceof Error && error.message === "HAS_STOCK") {
      return NextResponse.json(
        { message: "Tidak dapat menghapus gudang yang masih memiliki stok" },
        { status: 400 },
      )
    }

    return NextResponse.json({ message: "Gagal menghapus gudang" }, { status: 500 })
  }
}
