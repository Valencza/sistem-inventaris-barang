import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { MovementType, TransferStatus } from "@prisma/client"
import { createAuditLog } from "@/lib/audit"

// Helper: hitung dan update stok + buat movement transfer untuk SATU produk
async function applySingleTransferItem(params: {
  productId: string
  quantity: number
  fromWarehouseId: string
  toWarehouseId: string
  userId: string
  transferId: string
}) {
  const { productId, quantity, fromWarehouseId, toWarehouseId, userId, transferId } = params

  return prisma.$transaction(async (tx) => {
    // FROM (gudang asal)
    let fromStock = await tx.stock.findUnique({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId: fromWarehouseId,
        },
      },
    })

    if (!fromStock) {
      fromStock = await tx.stock.create({
        data: {
          productId,
          warehouseId: fromWarehouseId,
          quantity: 0,
          minStock: 0,
        },
      })
    }

    const fromPrevious = fromStock.quantity
    const fromNew = fromPrevious - quantity

    if (fromNew < 0) {
      throw new Error("Stok gudang asal tidak mencukupi untuk transfer")
    }

    const updatedFrom = await tx.stock.update({
      where: { id: fromStock.id },
      data: { quantity: fromNew },
    })

    const transferOutMovement = await tx.stockMovement.create({
      data: {
        type: MovementType.TRANSFER_OUT,
        quantity,
        productId,
        warehouseId: fromWarehouseId,
        userId,
        transferId,
        notes: `Transfer OUT dari ${fromWarehouseId}`,
        previousQty: fromPrevious,
        newQty: updatedFrom.quantity,
      },
    })

    // TO (gudang tujuan)
    let toStock = await tx.stock.findUnique({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId: toWarehouseId,
        },
      },
    })

    if (!toStock) {
      toStock = await tx.stock.create({
        data: {
          productId,
          warehouseId: toWarehouseId,
          quantity: 0,
          minStock: 0,
        },
      })
    }

    const toPrevious = toStock.quantity
    const toNew = toPrevious + quantity

    const updatedTo = await tx.stock.update({
      where: { id: toStock.id },
      data: { quantity: toNew },
    })

    const transferInMovement = await tx.stockMovement.create({
      data: {
        type: MovementType.TRANSFER_IN,
        quantity,
        productId,
        warehouseId: toWarehouseId,
        userId,
        transferId,
        notes: `Transfer IN ke ${toWarehouseId}`,
        previousQty: toPrevious,
        newQty: updatedTo.quantity,
      },
    })

    return { transferOutMovement, transferInMovement }
  })
}

// Helper: generate nomor transfer sederhana
async function generateTransferNumber() {
  const year = new Date().getFullYear()
  const count = await prisma.transfer.count({
    where: {
      transferNumber: {
        startsWith: `TRF-${year}-`,
      },
    },
  })

  const seq = String(count + 1).padStart(4, "0")
  return `TRF-${year}-${seq}`
}

// GET /api/transfers (tidak perlu audit, hanya read)
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get("status") as TransferStatus | "all" | null
    const fromWarehouseId = searchParams.get("fromWarehouseId") || undefined
    const toWarehouseId = searchParams.get("toWarehouseId") || undefined

    const pageParam = searchParams.get("page")
    const pageSizeParam = searchParams.get("pageSize")

    const page = Math.max(Number(pageParam) || 1, 1)
    const pageSize = Math.min(Math.max(Number(pageSizeParam) || 10, 1), 200)
    const skip = (page - 1) * pageSize

    const where: any = {
      ...(statusParam && statusParam !== "all" ? { status: statusParam } : {}),
      ...(fromWarehouseId ? { fromWarehouseId } : {}),
      ...(toWarehouseId ? { toWarehouseId } : {}),
    }

    const [total, transfers] = await Promise.all([
      prisma.transfer.count({ where }),
      prisma.transfer.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
        skip,
        take: pageSize,
      }),
    ])

    const data = transfers.map((t) => ({
      id: t.id,
      transferNumber: t.transferNumber,
      status: t.status,
      notes: t.notes ?? undefined,
      fromWarehouseId: t.fromWarehouseId,
      toWarehouseId: t.toWarehouseId,
      createdAt: t.createdAt,
      postedAt: t.postedAt ?? undefined,
      createdById: t.createdById,
      postedById: t.postedById ?? undefined,
      items: t.items.map((it) => ({
        id: it.id,
        transferId: it.transferId,
        productId: it.productId,
        quantity: it.quantity,
      })),
      fromWarehouse: t.fromWarehouse || undefined,
      toWarehouse: t.toWarehouse || undefined,
      createdBy: t.createdBy || undefined,
      postedBy: t.postedBy || undefined,
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
    console.error("[TRANSFERS_GET]", error)
    return NextResponse.json(
      { message: "Gagal memuat data transfer" },
      { status: 500 },
    )
  }
}

// POST /api/transfers
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const forwardedFor = req.headers.get("x-forwarded-for")
    const realIp = req.headers.get("x-real-ip")
    const ip =
      forwardedFor?.split(",")[0]?.trim() ??
      realIp ??
      null
    const userAgent = req.headers.get("user-agent") ?? null

    const body = await req.json()
    const {
      fromWarehouseId,
      toWarehouseId,
      notes,
      items,
      postImmediately,
    } = body as {
      fromWarehouseId?: string
      toWarehouseId?: string
      notes?: string
      items?: { productId: string; quantity: number }[]
      postImmediately?: boolean
    }

    if (!fromWarehouseId || !toWarehouseId) {
      return NextResponse.json(
        { message: "Gudang asal dan tujuan wajib diisi" },
        { status: 400 },
      )
    }

    if (fromWarehouseId === toWarehouseId) {
      return NextResponse.json(
        { message: "Gudang asal dan tujuan tidak boleh sama" },
        { status: 400 },
      )
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { message: "Minimal 1 item transfer wajib diisi" },
        { status: 400 },
      )
    }

    const validItems = items.filter(
      (it) => it.productId && typeof it.quantity === "number" && it.quantity > 0,
    )
    if (validItems.length === 0) {
      return NextResponse.json(
        { message: "Semua item transfer tidak valid" },
        { status: 400 },
      )
    }

    const transferNumber = await generateTransferNumber()

    // 1) Simpan sebagai DRAFT (tanpa update stok)
    if (!postImmediately) {
      const transfer = await prisma.$transaction(async (tx) => {
        const created = await tx.transfer.create({
          data: {
            transferNumber,
            status: TransferStatus.DRAFT,
            notes: notes || null,
            fromWarehouseId,
            toWarehouseId,
            createdById: user.id,
            items: {
              create: validItems.map((it) => ({
                productId: it.productId,
                quantity: it.quantity,
              })),
            },
          },
          include: {
            items: true,
            fromWarehouse: true,
            toWarehouse: true,
          },
        })

        await createAuditLog({
          tx,
          userId: user.id,
          action: "CREATE",
          entity: "transfer",
          entityId: created.id,
          oldData: null,
          newData: {
            transferNumber: created.transferNumber,
            status: created.status,
            fromWarehouseId: created.fromWarehouseId,
            toWarehouseId: created.toWarehouseId,
            notes: created.notes,
            items: created.items.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
            })),
          },
          ipAddress: ip,
          userAgent,
        })

        return created
      })

      const result = {
        id: transfer.id,
        transferNumber: transfer.transferNumber,
        status: transfer.status,
        notes: transfer.notes ?? undefined,
        fromWarehouseId: transfer.fromWarehouseId,
        toWarehouseId: transfer.toWarehouseId,
        createdAt: transfer.createdAt,
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
      }

      return NextResponse.json({ data: result }, { status: 201 })
    }

    // 2) postImmediately: true → buat + langsung POSTED (update stok + movement)
    const transfer = await prisma.$transaction(async (tx) => {
      const created = await tx.transfer.create({
        data: {
          transferNumber,
          status: TransferStatus.POSTED,
          notes: notes || null,
          fromWarehouseId,
          toWarehouseId,
          createdById: user.id,
          postedById: user.id,
          postedAt: new Date(),
          items: {
            create: validItems.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      })

      // Validasi stok untuk semua item di gudang asal
      for (const it of created.items) {
        const stockFrom = await tx.stock.findUnique({
          where: {
            productId_warehouseId: {
              productId: it.productId,
              warehouseId: created.fromWarehouseId,
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

      await createAuditLog({
        tx,
        userId: user.id,
        action: "CREATE_POSTED",
        entity: "transfer",
        entityId: created.id,
        oldData: null,
        newData: {
          transferNumber: created.transferNumber,
          status: created.status,
          fromWarehouseId: created.fromWarehouseId,
          toWarehouseId: created.toWarehouseId,
          notes,
          items: created.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
          })),
        },
        ipAddress: ip,
        userAgent,
      })

      return created
    })

    // Setelah transfer POSTED tercatat, jalankan update stok + movement per item
    for (const it of transfer.items) {
      await applySingleTransferItem({
        productId: it.productId,
        quantity: it.quantity,
        fromWarehouseId: transfer.fromWarehouseId,
        toWarehouseId: transfer.toWarehouseId,
        userId: user.id,
        transferId: transfer.id,
      })
    }

    const fullTransfer = await prisma.transfer.findUnique({
      where: { id: transfer.id },
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

    if (!fullTransfer) {
      return NextResponse.json(
        { message: "Transfer tidak ditemukan setelah posting" },
        { status: 500 },
      )
    }

    const result = {
      id: fullTransfer.id,
      transferNumber: fullTransfer.transferNumber,
      status: fullTransfer.status,
      notes: fullTransfer.notes ?? undefined,
      fromWarehouseId: fullTransfer.fromWarehouseId,
      toWarehouseId: fullTransfer.toWarehouseId,
      createdAt: fullTransfer.createdAt,
      postedAt: fullTransfer.postedAt ?? undefined,
      createdById: fullTransfer.createdById,
      postedById: fullTransfer.postedById ?? undefined,
      items: fullTransfer.items.map((it) => ({
        id: it.id,
        transferId: it.transferId,
        productId: it.productId,
        quantity: it.quantity,
      })),
      fromWarehouse: fullTransfer.fromWarehouse || undefined,
      toWarehouse: fullTransfer.toWarehouse || undefined,
      createdBy: fullTransfer.createdBy || undefined,
      postedBy: fullTransfer.postedBy || undefined,
    }

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error: any) {
    console.error("[TRANSFERS_POST]", error)

    if (error instanceof Error && error.message.includes("Stok tidak cukup")) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { message: "Gagal menyimpan transfer" },
      { status: 500 },
    )
  }
}
