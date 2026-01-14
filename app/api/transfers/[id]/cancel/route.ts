import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { MovementType, TransferStatus } from "@prisma/client"
import { createAuditLog } from "@/lib/audit"

// POST /api/transfers/[id]/cancel
export async function POST(
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

    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    })

    if (!transfer) {
      return NextResponse.json({ message: "Transfer tidak ditemukan" }, { status: 404 })
    }

    // Jika sudah CANCELLED, no-op tapi tetap bisa dikembalikan ke FE
    if (transfer.status === TransferStatus.CANCELLED) {
      return NextResponse.json({ data: { id: transfer.id, status: transfer.status } })
    }

    // Cancel DRAFT: tanpa stok bergerak
    if (transfer.status === TransferStatus.DRAFT) {
      const cancelled = await prisma.$transaction(async (tx) => {
        const updated = await tx.transfer.update({
          where: { id: transfer.id },
          data: {
            status: TransferStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        })

        await createAuditLog({
          tx,
          userId: user.id,
          action: "CANCEL_TRANSFER",
          entity: "transfer",
          entityId: transfer.id,
          oldData: {
            status: transfer.status,
            cancelledAt: transfer.cancelledAt,
          },
          newData: {
            status: updated.status,
            cancelledAt: updated.cancelledAt,
          },
          ipAddress: ip,
          userAgent,
        })

        return updated
      })

      return NextResponse.json({ data: cancelled })
    }

    // Cancel POSTED: rollback stok & hapus movement
    if (transfer.status === TransferStatus.POSTED) {
      const cancelled = await prisma.$transaction(async (tx) => {
        const movements = await tx.stockMovement.findMany({
          where: {
            transferId: transfer.id,
            type: { in: [MovementType.TRANSFER_OUT, MovementType.TRANSFER_IN] },
          },
          orderBy: { createdAt: "desc" },
        })

        // Rollback stok ke previousQty jika movement ada
        for (const mv of movements) {
          const stock = await tx.stock.findUnique({
            where: {
              productId_warehouseId: {
                productId: mv.productId,
                warehouseId: mv.warehouseId,
              },
            },
          })

          if (!stock) {
            await tx.stock.create({
              data: {
                productId: mv.productId,
                warehouseId: mv.warehouseId,
                quantity: mv.previousQty,
                minStock: 0,
              },
            })
          } else {
            await tx.stock.update({
              where: { id: stock.id },
              data: { quantity: mv.previousQty },
            })
          }
        }

        // Hapus movement transfer
        await tx.stockMovement.deleteMany({
          where: {
            transferId: transfer.id,
            type: { in: [MovementType.TRANSFER_OUT, MovementType.TRANSFER_IN] },
          },
        })

        const updated = await tx.transfer.update({
          where: { id: transfer.id },
          data: {
            status: TransferStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        })

        await createAuditLog({
          tx,
          userId: user.id,
          action: "CANCEL_TRANSFER",
          entity: "transfer",
          entityId: transfer.id,
          oldData: {
            status: transfer.status,
            cancelledAt: transfer.cancelledAt,
          },
          newData: {
            status: updated.status,
            cancelledAt: updated.cancelledAt,
          },
          ipAddress: ip,
          userAgent,
        })

        return updated
      })

      return NextResponse.json({ data: cancelled })
    }

    return NextResponse.json({ message: "Status transfer tidak dikenali" }, { status: 400 })
  } catch (error: any) {
    console.error("[TRANSFER_CANCEL_ACTION]", error)
    return NextResponse.json({ message: "Gagal membatalkan transfer" }, { status: 500 })
  }
}
