import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { MovementType, TransferStatus } from "@prisma/client"
import { createAuditLog } from "@/lib/audit"

// GET /api/transfers/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const { id } = await params

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        items: true,
        fromWarehouse: true,
        toWarehouse: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        postedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!transfer) {
      return NextResponse.json({ message: "Transfer tidak ditemukan" }, { status: 404 })
    }

    const result = {
      id: transfer.id,
      transferNumber: transfer.transferNumber,
      status: transfer.status,
      notes: transfer.notes ?? undefined,
      fromWarehouseId: transfer.fromWarehouseId,
      toWarehouseId: transfer.toWarehouseId,
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt,
      postedAt: transfer.postedAt ?? undefined,
      createdById: transfer.createdById,
      postedById: transfer.postedById ?? undefined,
      items: transfer.items.map((it) => ({
        id: it.id,
        transferId: it.transferId,
        productId: it.productId,
        quantity: it.quantity,
      })),
      fromWarehouse: transfer.fromWarehouse || undefined,
      toWarehouse: transfer.toWarehouse || undefined,
      createdByUser: transfer.createdBy || undefined,
      postedByUser: transfer.postedBy || undefined,
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error("[TRANSFER_DETAIL_GET]", error)
    return NextResponse.json(
      { message: "Gagal memuat detail transfer" },
      { status: 500 },
    )
  }
}

// DELETE /api/transfers/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })

    const { id: transferId } = await params

    const forwardedFor = req.headers.get("x-forwarded-for")
    const realIp = req.headers.get("x-real-ip")
    const ip =
      forwardedFor?.split(",")[0]?.trim() ??
      realIp ??
      null
    const userAgent = req.headers.get("user-agent") ?? null

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
        include: {
          items: true,
          fromWarehouse: true,
          toWarehouse: true,
        },
      })

      if (!transfer) {
        throw new Error("NOT_FOUND")
      }

      if (transfer.status !== TransferStatus.CANCELLED) {
        throw new Error("ONLY_CANCELLED")
      }

      // Hapus semua movement transfer terkait
      await tx.stockMovement.deleteMany({
        where: {
          transferId: transfer.id,
          type: { in: [MovementType.TRANSFER_OUT, MovementType.TRANSFER_IN] },
        },
      })

      // Hapus transfer (items ikut terhapus via cascade)
      await tx.transfer.delete({
        where: { id: transfer.id },
      })

      // AUDIT DELETE TRANSFER
      await createAuditLog({
        tx,
        userId: user.id,
        action: "DELETE",
        entity: "transfer",
        entityId: transfer.id,
        oldData: {
          transferNumber: transfer.transferNumber,
          status: transfer.status,
          fromWarehouseId: transfer.fromWarehouseId,
          toWarehouseId: transfer.toWarehouseId,
          notes: transfer.notes,
          items: transfer.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
          })),
        },
        newData: null,
        ipAddress: ip,
        userAgent,
      })

      return { id: transfer.id, deleted: true }
    })

    return NextResponse.json({ data: result })
  } catch (error: any) {
    console.error("[TRANSFER_DELETE]", error)

    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ message: "Transfer tidak ditemukan" }, { status: 404 })
    }

    if (error instanceof Error && error.message === "ONLY_CANCELLED") {
      return NextResponse.json(
        { message: "Hanya transfer CANCELLED yang dapat dihapus" },
        { status: 400 },
      )
    }

    return NextResponse.json({ message: "Gagal menghapus transfer" }, { status: 500 })
  }
}
