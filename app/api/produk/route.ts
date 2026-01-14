import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { verifyAuthToken } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"

/**
 * Helper: cek apakah user memiliki permission tertentu.
 * Menggunakan relasi user -> userRole -> role -> rolePermission -> permission.
 */
async function userHasPermission(userId: string, permissionCode: string) {
    // Ambil user beserta roles dan permissions
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
    });

    if (!user) return false;

    // Flatten semua permission code dari semua role user
    const codes = user.roles.flatMap((ur) =>
        ur.role.permissions.map((rp) => rp.permission.code),
    );

    return codes.includes(permissionCode);
}

/**
 * GET /api/produk
 *
 * Mengembalikan daftar produk aktif dari database.
 * Hanya boleh diakses user yang:
 * - sudah login (JWT valid), dan
 * - memiliki permission "product.view".
 */
export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get("access_token")?.value

        if (!token) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const payload = await verifyAuthToken(token)
        const userId = String(payload.sub)
        if (!userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const allowed = await userHasPermission(userId, "product.view")
        if (!allowed) {
            return NextResponse.json(
                { message: "Forbidden: tidak punya akses melihat produk" },
                { status: 403 },
            )
        }

        const { searchParams } = new URL(req.url)
        const pageParam = searchParams.get("page")
        const pageSizeParam = searchParams.get("pageSize")
        const categoryId = searchParams.get("categoryId") || undefined

        const page = Math.max(Number(pageParam) || 1, 1)
        const pageSize = Math.min(Math.max(Number(pageSizeParam) || 10, 1), 200)
        const skip = (page - 1) * pageSize

        const where: any = {
            isActive: true,
            ...(categoryId ? { categoryId } : {}),
        }

        const [total, products] = await Promise.all([
            prisma.product.count({ where }),
            prisma.product.findMany({
                where,
                include: {
                    category: true,
                    stocks: true,
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: pageSize,
            }),
        ])

        const data = products.map((p) => {
            const totalStock = p.stocks.reduce((sum, s) => sum + s.quantity, 0)

            return {
                id: p.id,
                sku: p.sku,
                name: p.name,
                slug: p.slug,
                description: p.description,
                price: p.price,
                unit: p.unit,
                image: p.imageUrl,
                imageUrl: p.imageUrl,
                isActive: p.isActive,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
                categoryId: p.categoryId,
                category: p.category,
                totalStock,
                minStock: p.minStock,
            }
        })

        const ipAddress =
            req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip")
        const userAgent = req.headers.get("user-agent")

        await createAuditLog({
            userId,
            action: "PRODUCT_LIST_VIEW",
            entity: "product",
            entityId: null,
            oldData: null,
            newData: { count: data.length, page, pageSize },
            ipAddress,
            userAgent,
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
        console.error("GET /api/produk error", error)
        return NextResponse.json(
            { message: "Gagal mengambil data produk" },
            { status: 500 },
        )
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

        const allowed = await userHasPermission(userId, "product.create")
        if (!allowed) {
            return NextResponse.json(
                { message: "Forbidden: tidak punya akses membuat produk" },
                { status: 403 },
            )
        }

        const body = await req.json()

        const created = await prisma.product.create({
            data: {
                name: body.name,
                slug: body.slug,
                sku: body.sku,
                description: body.description,
                price: body.price,
                categoryId: body.categoryId,
                minStock: body.minStock,
                isActive: body.isActive,
                unit: body.unit ?? "pcs",
                imageUrl: body.imageUrl ?? null,
            },
        })

        const ipAddress = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip")
        const userAgent = req.headers.get("user-agent")

        await createAuditLog({
            userId,
            action: "PRODUCT_CREATE",
            entity: "product",
            entityId: created.id,
            oldData: null,
            newData: {
                id: created.id,
                sku: created.sku,
                name: created.name,
                price: created.price,
                categoryId: created.categoryId,
                minStock: created.minStock,
                isActive: created.isActive,
            },
            ipAddress,
            userAgent,
        })

        return NextResponse.json(
            { message: "Produk berhasil dibuat", product: created },
            { status: 201 },
        )
    } catch (error) {
        console.error("POST /api/produk error", error)
        return NextResponse.json(
            { message: "Gagal membuat produk" },
            { status: 500 },
        )
    }
}