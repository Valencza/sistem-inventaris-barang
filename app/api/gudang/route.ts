import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { verifyAuthToken } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"

// Helper: cek permission user
async function userHasPermission(userId: string, permissionCode: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            roles: {
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: {
                                    permission: true,
                                },
                            },
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

        const allowed = await userHasPermission(userId, "warehouse.view")
        if (!allowed) {
            return NextResponse.json(
                { message: "Forbidden: tidak punya akses melihat gudang" },
                { status: 403 },
            )
        }

        const { searchParams } = new URL(req.url)

        const pageParam = searchParams.get("page")
        const pageSizeParam = searchParams.get("pageSize")

        const page = Math.max(Number(pageParam) || 1, 1)
        const pageSize = Math.min(Math.max(Number(pageSizeParam) || 10, 1), 200)
        const skip = (page - 1) * pageSize

        const [total, warehouses] = await Promise.all([
            prisma.warehouse.count(),
            prisma.warehouse.findMany({
                orderBy: { createdAt: "desc" }, // terbaru di atas (opsional)
                skip,
                take: pageSize,
                include: {
                    stocks: {
                        select: { productId: true, quantity: true },
                    },
                },
            }),
        ])

        const data = warehouses.map((w) => {
            const totalStock = w.stocks.reduce((sum, s) => sum + s.quantity, 0)
            const totalProducts = new Set(w.stocks.map((s) => s.productId)).size

            return {
                id: w.id,
                code: w.code,
                name: w.name,
                address: w.address,
                pic: w.pic,
                phone: w.phone ?? undefined,
                isActive: w.isActive,
                createdAt: w.createdAt,
                updatedAt: w.updatedAt,
                totalStock,
                totalProducts,
            }
        })

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
        console.error("[WAREHOUSE_GET]", error)
        return NextResponse.json({ message: "Gagal memuat gudang" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get("access_token")?.value

        if (!token) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const payload = await verifyAuthToken(token)
        const userId = String(payload.sub)

        const allowed = await userHasPermission(userId, "warehouse.create")
        if (!allowed) {
            return NextResponse.json(
                { message: "Forbidden: tidak punya akses membuat gudang" },
                { status: 403 },
            )
        }

        const forwardedFor = req.headers.get("x-forwarded-for")
        const realIp = req.headers.get("x-real-ip")
        const ip =
            forwardedFor?.split(",")[0]?.trim() ??
            realIp ??
            null
        const userAgent = req.headers.get("user-agent") ?? null

        const body = await req.json()
        const { code, name, address, pic, phone, isActive } = body

        if (!code || !name || !address || !pic) {
            return NextResponse.json(
                { message: "Kode, nama, alamat, dan PIC wajib diisi" },
                { status: 400 },
            )
        }

        const warehouse = await prisma.$transaction(async (tx) => {
            const created = await tx.warehouse.create({
                data: {
                    code: String(code).toUpperCase(),
                    name,
                    address,
                    pic,
                    phone: phone || null,
                    isActive: typeof isActive === "boolean" ? isActive : true,
                },
            })

            await createAuditLog({
                tx,
                userId,
                action: "CREATE",
                entity: "warehouse",
                entityId: created.id,
                oldData: null,
                newData: {
                    code: created.code,
                    name: created.name,
                    address: created.address,
                    pic: created.pic,
                    phone: created.phone,
                    isActive: created.isActive,
                },
                ipAddress: ip,
                userAgent,
            })

            return created
        })

        return NextResponse.json({ data: warehouse }, { status: 201 })
    } catch (error: any) {
        console.error("[WAREHOUSE_POST]", error)

        if (error.code === "P2002") {
            return NextResponse.json(
                { message: "Kode gudang sudah digunakan" },
                { status: 400 },
            )
        }

        return NextResponse.json({ message: "Gagal membuat gudang" }, { status: 500 })
    }
}
