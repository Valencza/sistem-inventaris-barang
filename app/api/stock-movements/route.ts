import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { MovementType } from "@prisma/client"
import { createAuditLog } from "@/lib/audit"

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)

    const { searchParams } = new URL(req.url)

    const productId = searchParams.get("productId") || undefined
    const warehouseId = searchParams.get("warehouseId") || undefined
    const type = (searchParams.get("type") as MovementType | null) || undefined
    const search = searchParams.get("search") || undefined

    const pageParam = searchParams.get("page")
    const pageSizeParam = searchParams.get("pageSize")

    const page = Math.max(Number(pageParam) || 1, 1)
    const pageSize = Math.min(Math.max(Number(pageSizeParam) || 10, 1), 200)
    const skip = (page - 1) * pageSize

    const where: any = {}

    if (productId) where.productId = productId
    if (warehouseId && warehouseId !== "all") where.warehouseId = warehouseId
    if (type) where.type = type
    if (search) {
      where.OR = [
        {
          product: {
            name: { contains: search, mode: "insensitive" },
          },
        },
        {
          product: {
            sku: { contains: search, mode: "insensitive" },
          },
        },
        {
          notes: { contains: search, mode: "insensitive" },
        },
      ]
    }

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        include: {
          product: true,
          warehouse: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
    ])

    const data = movements.map((m) => ({
      id: m.id,
      productId: m.productId,
      warehouseId: m.warehouseId,
      type: m.type,
      quantity: m.quantity,
      notes: m.notes ?? undefined,
      userId: m.userId,
      createdAt: m.createdAt,
      product: m.product || undefined,
      warehouse: m.warehouse || undefined,
      user: m.user
        ? { id: m.user.id, name: m.user.name, email: m.user.email }
        : undefined,
      previousQty: m.previousQty,
      newQty: m.newQty,
      referenceId: m.transferId ?? undefined,
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
    console.error("[STOCK_MOVEMENT_GET]", error)
    return NextResponse.json(
      { message: "Gagal memuat pergerakan stok" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)

    const body = await req.json()
    const { productId, warehouseId, type, quantity, notes } = body as {
      productId?: string
      warehouseId?: string
      type?: MovementType
      quantity?: number
      notes?: string
    }

    if (!productId || !warehouseId || !type || !quantity || quantity <= 0) {
      return NextResponse.json(
        { message: "Produk, gudang, tipe, dan quantity (> 0) wajib diisi" },
        { status: 400 },
      )
    }

    if (!["IN", "OUT", "ADJUSTMENT"].includes(type)) {
      return NextResponse.json(
        { message: "Tipe movement tidak valid" },
        { status: 400 },
      )
    }

    const forwardedFor = req.headers.get("x-forwarded-for")
    const realIp = req.headers.get("x-real-ip")
    const ip = forwardedFor?.split(",")[0]?.trim() ?? realIp ?? null
    const userAgent = req.headers.get("user-agent") ?? null

    const result = await prisma.$transaction(async (tx) => {
      let stock = await tx.stock.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
      })

      if (!stock) {
        stock = await tx.stock.create({
          data: {
            productId,
            warehouseId,
            quantity: 0,
            minStock: 0,
          },
        })
      }

      const previousQty = stock.quantity
      let newQty = previousQty

      switch (type) {
        case "IN":
          newQty = previousQty + quantity
          break
        case "OUT":
          newQty = previousQty - quantity
          if (newQty < 0) {
            throw new Error("Quantity tidak boleh membuat stok menjadi negatif")
          }
          break
        case "ADJUSTMENT":
          newQty = quantity
          break
      }

      const updatedStock = await tx.stock.update({
        where: { id: stock.id },
        data: { quantity: newQty },
      })

      const movement = await tx.stockMovement.create({
        data: {
          type,
          quantity,
          notes: notes || null,
          productId,
          warehouseId,
          userId: user.id,
          previousQty,
          newQty: updatedStock.quantity,
        },
        include: {
          product: true,
          warehouse: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      await createAuditLog({
        tx,
        userId: user.id,
        action: "CREATE",
        entity: "stockMovement",
        entityId: movement.id,
        oldData: {
          stock: {
            id: stock.id,
            quantity: previousQty,
          },
        },
        newData: {
          stock: {
            id: stock.id,
            quantity: movement.newQty,
          },
          movement: {
            id: movement.id,
            type,
            quantity,
            notes: notes || null,
            productId,
            warehouseId,
          },
        },
        ipAddress: ip,
        userAgent,
      })

      return {
        id: movement.id,
        productId: movement.productId,
        warehouseId: movement.warehouseId,
        type: movement.type,
        quantity: movement.quantity,
        notes: movement.notes ?? undefined,
        userId: movement.userId,
        createdAt: movement.createdAt,
        product: movement.product || undefined,
        warehouse: movement.warehouse || undefined,
        user: movement.user
          ? { id: movement.user.id, name: movement.user.name, email: movement.user.email }
          : undefined,
        previousQty: movement.previousQty,
        newQty: movement.newQty,
        referenceId: movement.transferId ?? undefined,
      }
    })

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error: any) {
    console.error("[STOCK_MOVEMENT_POST]", error)

    if (error instanceof Error && error.message.includes("stok menjadi negatif")) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { message: "Gagal membuat pergerakan stok" },
      { status: 500 },
    )
  }
}
