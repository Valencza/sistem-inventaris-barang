import prisma from "@/lib/db"
import { TransferStatus, MovementType, type Prisma } from "@prisma/client"
import { stockService } from "./stock.service"

export interface CreateTransferInput {
  fromWarehouseId: string
  toWarehouseId: string
  notes?: string
  createdById: string
  items: {
    productId: string
    quantity: number
  }[]
}

export const transferService = {
  // Generate transfer number
  async generateTransferNumber() {
    const year = new Date().getFullYear()
    const lastTransfer = await prisma.transfer.findFirst({
      where: {
        transferNumber: { startsWith: `TRF-${year}` },
      },
      orderBy: { createdAt: "desc" },
    })

    let sequence = 1
    if (lastTransfer) {
      const lastSequence = Number.parseInt(lastTransfer.transferNumber.split("-")[2])
      sequence = lastSequence + 1
    }

    return `TRF-${year}-${sequence.toString().padStart(4, "0")}`
  },

  // Get all transfers
  async getAll(
    filters: {
      status?: TransferStatus
      fromWarehouseId?: string
      toWarehouseId?: string
      page?: number
      limit?: number
    } = {},
  ) {
    const { status, fromWarehouseId, toWarehouseId, page = 1, limit = 10 } = filters

    const where: Prisma.TransferWhereInput = {}
    if (status) where.status = status
    if (fromWarehouseId) where.fromWarehouseId = fromWarehouseId
    if (toWarehouseId) where.toWarehouseId = toWarehouseId

    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        where,
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          createdBy: { select: { id: true, name: true, email: true } },
          postedBy: { select: { id: true, name: true, email: true } },
          items: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transfer.count({ where }),
    ])

    return {
      data: transfers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  },

  // Get single transfer
  async getOne(id: string) {
    return prisma.transfer.findUnique({
      where: { id },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        createdBy: { select: { id: true, name: true, email: true } },
        postedBy: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: true },
        },
        stockMovements: {
          include: { product: true, warehouse: true },
        },
      },
    })
  },

  // Create transfer (draft)
  async create(input: CreateTransferInput) {
    const transferNumber = await this.generateTransferNumber()

    return prisma.transfer.create({
      data: {
        transferNumber,
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        notes: input.notes,
        createdById: input.createdById,
        status: TransferStatus.DRAFT,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: { include: { product: true } },
      },
    })
  },

  // Post transfer (execute)
  async post(id: string, userId: string) {
    const transfer = await this.getOne(id)

    if (!transfer) {
      throw new Error("Transfer tidak ditemukan")
    }

    if (transfer.status !== TransferStatus.DRAFT) {
      throw new Error("Transfer sudah diposting atau dibatalkan")
    }

    // Validate stock availability
    for (const item of transfer.items) {
      const stock = await stockService.getStock(item.productId, transfer.fromWarehouseId)
      if (!stock || stock.quantity < item.quantity) {
        throw new Error(`Stok ${item.product.name} tidak mencukupi di gudang asal`)
      }
    }

    // Execute transfer in transaction
    return prisma.$transaction(async (tx) => {
      // Process stock movements
      for (const item of transfer.items) {
        // OUT from source warehouse
        await stockService.processMovement({
          productId: item.productId,
          warehouseId: transfer.fromWarehouseId,
          quantity: item.quantity,
          type: MovementType.TRANSFER_OUT,
          userId,
          transferId: id,
          notes: `Transfer ke ${transfer.toWarehouse.name}`,
        })

        // IN to destination warehouse
        await stockService.processMovement({
          productId: item.productId,
          warehouseId: transfer.toWarehouseId,
          quantity: item.quantity,
          type: MovementType.TRANSFER_IN,
          userId,
          transferId: id,
          notes: `Transfer dari ${transfer.fromWarehouse.name}`,
        })
      }

      // Update transfer status
      return tx.transfer.update({
        where: { id },
        data: {
          status: TransferStatus.POSTED,
          postedById: userId,
          postedAt: new Date(),
        },
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          items: { include: { product: true } },
        },
      })
    })
  },

  // Cancel transfer
  async cancel(id: string) {
    const transfer = await this.getOne(id)

    if (!transfer) {
      throw new Error("Transfer tidak ditemukan")
    }

    if (transfer.status !== TransferStatus.DRAFT) {
      throw new Error("Hanya transfer draft yang dapat dibatalkan")
    }

    return prisma.transfer.update({
      where: { id },
      data: { status: TransferStatus.CANCELLED },
    })
  },
}
