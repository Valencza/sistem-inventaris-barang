import prisma from "@/lib/db"
import type { Prisma } from "@prisma/client"

export interface CreateAuditLogInput {
  action: string
  entity: string
  entityId?: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  userId: string
  ipAddress?: string
  userAgent?: string
}

export const auditService = {
  // Create audit log
  async create(input: CreateAuditLogInput) {
    return prisma.auditLog.create({
      data: {
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        oldData: input.oldData as Prisma.InputJsonValue,
        newData: input.newData as Prisma.InputJsonValue,
        userId: input.userId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    })
  },

  // Get audit logs with filters
  async getAll(
    filters: {
      action?: string
      entity?: string
      entityId?: string
      userId?: string
      startDate?: Date
      endDate?: Date
      page?: number
      limit?: number
    } = {},
  ) {
    const { action, entity, entityId, userId, startDate, endDate, page = 1, limit = 20 } = filters

    const where: Prisma.AuditLogWhereInput = {}

    if (action) where.action = action
    if (entity) where.entity = entity
    if (entityId) where.entityId = entityId
    if (userId) where.userId = userId
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  },

  // Log common actions helpers
  async logLogin(userId: string, ipAddress?: string, userAgent?: string) {
    return this.create({
      action: "LOGIN",
      entity: "auth",
      userId,
      ipAddress,
      userAgent,
    })
  },

  async logLogout(userId: string) {
    return this.create({
      action: "LOGOUT",
      entity: "auth",
      userId,
    })
  },

  async logCreate(entity: string, entityId: string, newData: Record<string, unknown>, userId: string) {
    return this.create({
      action: "CREATE",
      entity,
      entityId,
      newData,
      userId,
    })
  },

  async logUpdate(
    entity: string,
    entityId: string,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    userId: string,
  ) {
    return this.create({
      action: "UPDATE",
      entity,
      entityId,
      oldData,
      newData,
      userId,
    })
  },

  async logDelete(entity: string, entityId: string, oldData: Record<string, unknown>, userId: string) {
    return this.create({
      action: "DELETE",
      entity,
      entityId,
      oldData,
      userId,
    })
  },
}
