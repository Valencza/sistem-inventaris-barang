import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const stocks = await prisma.stock.findMany({
      select: {
        id: true,
        productId: true,
        warehouseId: true,
        quantity: true,
        minStock: true,      // minStock per gudang
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ data: stocks })
  } catch (error) {
    console.error("[PUBLIC_STOCKS]", error)
    return NextResponse.json(
      { message: "Gagal memuat stok" },
      { status: 500 },
    )
  }
}
