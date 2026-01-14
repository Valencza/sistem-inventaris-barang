import prisma from "@/lib/db"
import type { Prisma } from "@prisma/client"

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: true
    stocks: {
      include: {
        warehouse: true
      }
    }
  }
}>

export interface ProductFilters {
  search?: string
  categoryId?: string
  isActive?: boolean
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export const productService = {
  // Get all products with filters and pagination
  async getAll(filters: ProductFilters = {}, pagination: PaginationParams = {}) {
    const { search, categoryId, isActive } = filters
    const { page = 1, limit = 10 } = pagination

    const where: Prisma.ProductWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (typeof isActive === "boolean") {
      where.isActive = isActive
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          stocks: {
            include: {
              warehouse: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  },

  // Get single product by ID or slug
  async getOne(idOrSlug: string): Promise<ProductWithRelations | null> {
    return prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        category: true,
        stocks: {
          include: {
            warehouse: true,
          },
        },
      },
    })
  },

  // Create product
  async create(data: Prisma.ProductCreateInput) {
    return prisma.product.create({
      data,
      include: {
        category: true,
        stocks: true,
      },
    })
  },

  // Update product
  async update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        stocks: true,
      },
    })
  },

  // Delete product
  async delete(id: string) {
    return prisma.product.delete({
      where: { id },
    })
  },

  // Get products with low stock
  async getLowStock(warehouseId?: string) {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        stocks: {
          where: warehouseId ? { warehouseId } : undefined,
          include: {
            warehouse: true,
          },
        },
      },
    })

    return products.filter((product) => {
      const totalStock = product.stocks.reduce((sum, s) => sum + s.quantity, 0)
      return totalStock < product.minStock
    })
  },

  // Get total stock for a product
  async getTotalStock(productId: string) {
    const stocks = await prisma.stock.findMany({
      where: { productId },
    })
    return stocks.reduce((sum, s) => sum + s.quantity, 0)
  },
}
