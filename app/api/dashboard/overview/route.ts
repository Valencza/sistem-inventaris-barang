// app/api/dashboard/overview/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import type { TransferStatus } from "@prisma/client"

// GET /api/dashboard/overview
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    // ambil data utama paralel
    const [products, warehouses, stocks, movements, transfers] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          minStock: true,
          price: true,
        },
      }),
      prisma.warehouse.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
        },
      }),
      prisma.stock.findMany({
        select: {
          id: true,
          productId: true,
          warehouseId: true,
          quantity: true,
        },
      }),
      prisma.stockMovement.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          productId: true,
          warehouseId: true,
          type: true,
          quantity: true,
          previousQty: true,
          newQty: true,
          notes: true,
          createdAt: true,
        },
      }),
      prisma.transfer.findMany({
        where: { status: "DRAFT" as TransferStatus },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          transferNumber: true,
          fromWarehouseId: true,
          toWarehouseId: true,
          status: true,
          notes: true,
          createdAt: true,
        },
      }),
    ])

    // total stok semua gudang
    const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0)

    // total nilai stok (harga * qty)
    let totalValue = 0
    stocks.forEach((stock) => {
      const product = products.find((p) => p.id === stock.productId)
      if (product) {
        totalValue += Number(product.price) * stock.quantity
      }
    })

    // produk stok rendah
    const lowStockProducts = products
      .map((product) => {
        const total = stocks
          .filter((s) => s.productId === product.id)
          .reduce((sum, s) => sum + s.quantity, 0)
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          minStock: product.minStock,
          totalStock: total,
        }
      })
      .filter((p) => p.totalStock <= p.minStock)
      .slice(0, 5)

    // stok per gudang
    const stockByWarehouse = warehouses.map((wh) => ({
      id: wh.id,
      name: wh.name,
      code: wh.code,
      stock: stocks
        .filter((s) => s.warehouseId === wh.id)
        .reduce((sum, s) => sum + s.quantity, 0),
    }))

    const data = {
      totalProducts: products.length,
      totalWarehouses: warehouses.length,
      totalStock,
      totalValue,
      lowStockProducts,
      recentMovements: movements,
      pendingTransfers: transfers,
      stockByWarehouse,
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error("[DASHBOARD_OVERVIEW]", error)
    return NextResponse.json(
      { message: "Gagal memuat data dashboard" },
      { status: 500 },
    )
  }
}
