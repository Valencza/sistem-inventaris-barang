import type { Metadata } from "next"
import { Suspense } from "react"
import { ProductCatalog } from "./product-catalog"
import { PageLoading } from "@/components/ui/loading"

export const metadata: Metadata = {
  title: "Katalog Produk",
  description:
    "Jelajahi katalog produk lengkap kami. Temukan berbagai produk berkualitas dari berbagai kategori dengan harga terbaik.",
  openGraph: {
    title: "Katalog Produk | Sistem Inventaris",
    description:
      "Jelajahi katalog produk lengkap kami dengan berbagai kategori dan pilihan gudang.",
  },
}

// Next 15: searchParams adalah Promise
interface PageProps {
  searchParams: Promise<{ gudang?: string; kategori?: string; q?: string }>
}

export default async function ProductCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams

  return (
    <div className="container flex justify-center py-10">
      {/* main content wrapper */}
      <div className="w-full max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Katalog Produk
          </h1>
          <p className="mt-2 text-sm text-pretty text-muted-foreground">
            Temukan berbagai produk berkualitas dengan stok tersedia di gudang
            pilihan Anda.
          </p>
        </div>

        <Suspense fallback={<PageLoading />}>
          <ProductCatalog
            warehouseCode={params.gudang}
            categorySlug={params.kategori}
            searchQuery={params.q}
          />
        </Suspense>
      </div>
    </div>
  )
}
