import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

type AuditPayload = {
  userId: string
  action: string
  entity: string
  entityId?: string | null
  oldData?: any
  newData?: any
  ipAddress?: string | null
  userAgent?: string | null
  tx?: Prisma.TransactionClient
}

export async function createAuditLog({
  userId,
  action,
  entity,
  entityId,
  oldData,
  newData,
  ipAddress,
  userAgent,
  tx,
}: AuditPayload) {
  const client = tx ?? prisma

  await client.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId: entityId ?? null,
      oldData: oldData ?? null,
      newData: newData ?? null,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
  })
}
