import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        pic: true,
        phone: true,
        isActive: true,
      },
    })

    return NextResponse.json({ data: warehouses })
  } catch (error) {
    console.error("[PUBLIC_WAREHOUSES]", error)
    return NextResponse.json(
      { message: "Gagal memuat gudang" },
      { status: 500 },
    )
  }
}
