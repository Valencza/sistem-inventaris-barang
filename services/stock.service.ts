import prisma from "@/lib/db"
import { MovementType, type Prisma } from "@prisma/client"

export interface StockMovementInput {
  productId: string
  warehouseId: string
  quantity: number
  type: MovementType
  notes?: string
  userId: string
  transferId?: string
}

export const stockService = {
  // Get stock by product and warehouse
  async getStock(productId: string, warehouseId: string) {
    return prisma.stock.findUnique({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId,
        },
      },
    })
  },

  // Get all stocks with filters
  async getAllStocks(
    filters: {
      warehouseId?: string
      productId?: string
      lowStockOnly?: boolean
    } = {},
  ) {
    const { warehouseId, productId, lowStockOnly } = filters

    const where: Prisma.StockWhereInput = {}

    if (warehouseId) where.warehouseId = warehouseId
    if (productId) where.productId = productId

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        product: {
          include: { category: true },
        },
        warehouse: true,
      },
      orderBy: [{ product: { name: "asc" } }, { warehouse: { name: "asc" } }],
    })

    if (lowStockOnly) {
      return stocks.filter((s) => s.quantity < s.product.minStock)
    }

    return stocks
  },

  // Process stock movement (IN/OUT)
  async processMovement(input: StockMovementInput) {
    const { productId, warehouseId, quantity, type, notes, userId, transferId } = input

    return prisma.$transaction(async (tx) => {
      // Get or create stock record
      let stock = await tx.stock.findUnique({
        where: {
          productId_warehouseId: { productId, warehouseId },
        },
      })

      if (!stock) {
        stock = await tx.stock.create({
          data: {
            productId,
            warehouseId,
            quantity: 0,
          },
        })
      }

      // Calculate new quantity
      let newQuantity = stock.quantity
      if (type === MovementType.IN || type === MovementType.TRANSFER_IN) {
        newQuantity += quantity
      } else if (type === MovementType.OUT || type === MovementType.TRANSFER_OUT) {
        if (stock.quantity < quantity) {
          throw new Error(`Stok tidak mencukupi. Stok tersedia: ${stock.quantity}`)
        }
        newQuantity -= quantity
      } else if (type === MovementType.ADJUSTMENT) {
        newQuantity = quantity // Direct set for adjustment
      }

      // Update stock
      const updatedStock = await tx.stock.update({
        where: { id: stock.id },
        data: { quantity: newQuantity },
      })

      // Create movement record
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          warehouseId,
          userId,
          type,
          quantity,
          notes,
          transferId,
        },
        include: {
          product: true,
          warehouse: true,
          user: true,
        },
      })

      return { stock: updatedStock, movement }
    })
  },

  // Get stock movements history
  async getMovements(
    filters: {
      productId?: string
      warehouseId?: string
      type?: MovementType
      startDate?: Date
      endDate?: Date
      page?: number
      limit?: number
    } = {},
  ) {
    const { productId, warehouseId, type, startDate, endDate, page = 1, limit = 20 } = filters

    const where: Prisma.StockMovementWhereInput = {}

    if (productId) where.productId = productId
    if (warehouseId) where.warehouseId = warehouseId
    if (type) where.type = type
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: true,
          warehouse: true,
          user: { select: { id: true, name: true, email: true } },
          transfer: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ])

    return {
      data: movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  },
}
