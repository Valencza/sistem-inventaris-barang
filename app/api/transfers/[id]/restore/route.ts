// app/api/transfers/[id]/restore/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { TransferStatus } from "@prisma/client"
import { createAuditLog } from "@/lib/audit"

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

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
        select: {
          id: true,
          transferNumber: true,
          status: true,
          cancelledAt: true,
          postedAt: true,
          postedById: true,
          fromWarehouseId: true,
          toWarehouseId: true,
          notes: true,
        },
      })

      if (!transfer) throw new Error("NOT_FOUND")

      if (transfer.status !== TransferStatus.CANCELLED) {
        throw new Error("ONLY_CANCELLED")
      }

      const updated = await tx.transfer.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.DRAFT,
          cancelledAt: null,
          postedAt: null,
          postedById: null,
        },
      })

      await createAuditLog({
        tx,
        userId: user.id,
        action: "RESTORE_TO_DRAFT", // atau "UPDATE"
        entity: "transfer",
        entityId: transfer.id,
        oldData: {
          transferNumber: transfer.transferNumber,
          status: transfer.status,
          cancelledAt: transfer.cancelledAt,
          postedAt: transfer.postedAt,
          postedById: transfer.postedById,
        },
        newData: {
          status: updated.status,
          cancelledAt: updated.cancelledAt,
          postedAt: updated.postedAt,
          postedById: updated.postedById,
        },
        ipAddress: ip,
        userAgent,
      })

      return updated
    })

    return NextResponse.json({ data: result })
  } catch (error: any) {
    console.error("[TRANSFER_RESTORE_DRAFT]", error)

    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ message: "Transfer tidak ditemukan" }, { status: 404 })
    }

    if (error instanceof Error && error.message === "ONLY_CANCELLED") {
      return NextResponse.json(
        { message: "Hanya transfer CANCELLED yang dapat dikembalikan ke draft" },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { message: "Gagal mengembalikan transfer ke draft" },
      { status: 500 },
    )
  }
}
