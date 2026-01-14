import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
    })

    return NextResponse.json({ data: categories })
  } catch (error) {
    console.error("[PUBLIC_CATEGORIES]", error)
    return NextResponse.json(
      { message: "Gagal memuat kategori" },
      { status: 500 },
    )
  }
}
