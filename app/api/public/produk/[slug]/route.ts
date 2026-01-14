import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function GET(
  _req: Request,
  context: RouteContext,
) {
  try {
    const { slug } = await context.params

    // 1. Ambil produk utama + kategori
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
      },
    })

    if (!product || !product.isActive) {
      return NextResponse.json(
        { message: "Produk tidak ditemukan" },
        { status: 404 },
      )
    }

    // 2. Ambil semua gudang aktif
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    })

    // 3. Ambil stok untuk produk ini di semua gudang
    const stocks = await prisma.stock.findMany({
      where: { productId: product.id },
      select: {
        id: true,
        productId: true,
        warehouseId: true,
        quantity: true,
        minStock: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // 4. Ambil produk sejenis (kategori sama), maksimal 4
    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        isActive: true,
        NOT: { id: product.id },
      },
      orderBy: { name: "asc" },
      take: 4,
      select: {
        id: true,
        name: true,
        sku: true,
        slug: true,
        description: true,
        price: true,
        minStock: true,
        imageUrl: true,
        categoryId: true,
        isActive: true,
      },
    })

    // 5. Bentuk payload sesuai yang dipakai di ProductDetail
    return NextResponse.json({
      data: {
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          slug: product.slug,
          description: product.description ?? undefined,
          price: Number(product.price), // Decimal -> number
          categoryId: product.categoryId,
          minStock: product.minStock,
          image: product.imageUrl ?? null, // mapping imageUrl -> image
          isActive: product.isActive,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        },
        category: product.category
          ? {
              id: product.category.id,
              name: product.category.name,
              slug: product.category.slug,
              description: product.category.description ?? undefined,
              createdAt: product.category.createdAt,
              updatedAt: product.category.updatedAt,
            }
          : null,
        warehouses,
        stocks,
        relatedProducts,
      },
    })
  } catch (error) {
    console.error("[PUBLIC_PRODUCT_DETAIL_API]", error)
    return NextResponse.json(
      { message: "Gagal memuat detail produk" },
      { status: 500 },
    )
  }
}
