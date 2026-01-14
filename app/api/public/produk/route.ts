import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        slug: true,
        description: true,
        price: true,
        minStock: true,
        imageUrl: true,
        unit: true,
        categoryId: true,
      },
    })

    return NextResponse.json({ data: products })
  } catch (error) {
    console.error("[PUBLIC_PRODUCTS]", error)
    return NextResponse.json(
      { message: "Gagal memuat produk" },
      { status: 500 },
    )
  }
}
