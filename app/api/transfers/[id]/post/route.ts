import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { MovementType, TransferStatus } from "@prisma/client"
import { createAuditLog } from "@/lib/audit"

// POST /api/transfers/[id]/post
// - DRAFT -> POSTED
// - CANCELLED -> POSTED
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

    if (
      transfer.status !== TransferStatus.DRAFT &&
      transfer.status !== TransferStatus.CANCELLED
    ) {
      return NextResponse.json(
        { message: "Hanya transfer DRAFT/CANCELLED yang bisa diposting" },
        { status: 400 },
      )
    }

    if (!transfer.items.length) {
      return NextResponse.json({ message: "Transfer tidak memiliki item" }, { status: 400 })
    }

    const posted = await prisma.$transaction(async (tx) => {
      const oldStatus = transfer.status

      // Safety: hapus movement transfer lama
      await tx.stockMovement.deleteMany({
        where: {
          transferId: transfer.id,
          type: { in: [MovementType.TRANSFER_OUT, MovementType.TRANSFER_IN] },
        },
      })

      // Validasi stok cukup di gudang asal untuk semua item
      for (const it of transfer.items) {
        const stockFrom = await tx.stock.findUnique({
          where: {
            productId_warehouseId: {
              productId: it.productId,
              warehouseId: transfer.fromWarehouseId,
            },
          },
        })
        const available = stockFrom?.quantity ?? 0
        if (it.quantity > available) {
          throw new Error(
            `Stok tidak cukup untuk produk ${it.productId} di gudang asal (tersedia ${available})`,
          )
        }
      }

      // Ubah status jadi POSTED
      const updatedTransfer = await tx.transfer.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.POSTED,
          postedById: user.id,
          postedAt: new Date(),
          cancelledAt: null,
        },
        include: { items: true },
      })

      // Apply stok + movement per item
      for (const it of updatedTransfer.items) {
        // FROM
        let fromStock = await tx.stock.findUnique({
          where: {
            productId_warehouseId: {
              productId: it.productId,
              warehouseId: updatedTransfer.fromWarehouseId,
            },
          },
        })
        if (!fromStock) {
          fromStock = await tx.stock.create({
            data: {
              productId: it.productId,
              warehouseId: updatedTransfer.fromWarehouseId,
              quantity: 0,
              minStock: 0,
            },
          })
        }

        const fromPrevious = fromStock.quantity
        const fromNew = fromPrevious - it.quantity
        if (fromNew < 0) {
          throw new Error(
            `Stok tidak cukup untuk produk ${it.productId} di gudang asal (tersedia ${fromPrevious})`,
          )
        }

        const updatedFrom = await tx.stock.update({
          where: { id: fromStock.id },
          data: { quantity: fromNew },
        })

        await tx.stockMovement.create({
          data: {
            type: MovementType.TRANSFER_OUT,
            quantity: it.quantity,
            productId: it.productId,
            warehouseId: updatedTransfer.fromWarehouseId,
            userId: user.id,
            transferId: updatedTransfer.id,
            notes: `Transfer OUT: ${updatedTransfer.transferNumber}`,
            previousQty: fromPrevious,
            newQty: updatedFrom.quantity,
          },
        })

        // TO
        let toStock = await tx.stock.findUnique({
          where: {
            productId_warehouseId: {
              productId: it.productId,
              warehouseId: updatedTransfer.toWarehouseId,
            },
          },
        })
        if (!toStock) {
          toStock = await tx.stock.create({
            data: {
              productId: it.productId,
              warehouseId: updatedTransfer.toWarehouseId,
              quantity: 0,
              minStock: 0,
            },
          })
        }

        const toPrevious = toStock.quantity
        const toNew = toPrevious + it.quantity

        const updatedTo = await tx.stock.update({
          where: { id: toStock.id },
          data: { quantity: toNew },
        })

        await tx.stockMovement.create({
          data: {
            type: MovementType.TRANSFER_IN,
            quantity: it.quantity,
            productId: it.productId,
            warehouseId: updatedTransfer.toWarehouseId,
            userId: user.id,
            transferId: updatedTransfer.id,
            notes: `Transfer IN: ${updatedTransfer.transferNumber}`,
            previousQty: toPrevious,
            newQty: updatedTo.quantity,
          },
        })
      }

      // AUDIT: status change -> POSTED
      await createAuditLog({
        tx,
        userId: user.id,
        action: "POST_TRANSFER", // atau "TRANSFER_POSTED"
        entity: "transfer",
        entityId: updatedTransfer.id,
        oldData: {
          status: oldStatus,
          postedById: transfer.postedById,
          postedAt: transfer.postedAt,
        },
        newData: {
          status: updatedTransfer.status,
          postedById: updatedTransfer.postedById,
          postedAt: updatedTransfer.postedAt,
        },
        ipAddress: ip,
        userAgent,
      })

      return updatedTransfer
    })

    return NextResponse.json({ data: posted })
  } catch (error: any) {
    console.error("[TRANSFER_POST_ACTION]", error)
    if (error instanceof Error && error.message.includes("Stok tidak cukup")) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    return NextResponse.json({ message: "Gagal memposting transfer" }, { status: 500 })
  }
}
