import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { verifyAuthToken } from "@/lib/auth"

async function userHasPermission(userId: string, permissionCode: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            roles: {
                include: {
                    role: {
                        include: {
                            permissions: { include: { permission: true } },
                        },
                    },
                },
            },
        },
    })

    if (!user) return false

    const codes = user.roles.flatMap((ur) =>
        ur.role.permissions.map((rp) => rp.permission.code),
    )

    return codes.includes(permissionCode)
}

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get("access_token")?.value

        if (!token) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const payload = await verifyAuthToken(token)
        const userId = String(payload.sub)

        const allowed = await userHasPermission(userId, "audit.view")
        if (!allowed) {
            return NextResponse.json(
                { message: "Forbidden: tidak punya akses melihat audit log" },
                { status: 403 },
            )
        }

        const { searchParams } = new URL(req.url)
        const pageParam = searchParams.get("page")
        const pageSizeParam = searchParams.get("pageSize")
        const entity = searchParams.get("entity") || undefined
        const action = searchParams.get("action") || undefined
        const targetUserId = searchParams.get("userId") || undefined

        const page = Math.max(Number(searchParams.get("page")) || 1, 1)
        const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize")) || 10, 1), 200)

        const skip = (page - 1) * pageSize

        const where: any = {
            ...(entity ? { entity } : {}),
            ...(action ? { action } : {}),
            ...(targetUserId ? { userId: targetUserId } : {}),
        }

        const [total, logs] = await Promise.all([
            prisma.auditLog.count({ where }),
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: pageSize,
                include: {
                    user: {
                        select: { id: true, name: true, email: true },
                    },
                },
            }),
        ])

        const data = logs.map((log) => ({
            id: log.id,
            action: log.action,
            entity: log.entity,
            entityId: log.entityId ?? undefined,
            oldData: log.oldData ?? undefined,
            newData: log.newData ?? undefined,
            ipAddress: log.ipAddress ?? undefined,
            userAgent: log.userAgent ?? undefined,
            createdAt: log.createdAt,
            userId: log.userId,
            user: log.user || undefined,
        }))

        return NextResponse.json({
            data,
            meta: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        })
    } catch (error) {
        console.error("[AUDIT_LOGS_GET]", error)
        return NextResponse.json(
            { message: "Gagal memuat audit log" },
            { status: 500 },
        )
    }
}
