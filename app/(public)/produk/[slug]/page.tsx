import type { Metadata } from "next"
import { ProductDetail } from "./product-detail"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const title = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

  return {
    title,
    description: `Detail produk ${title}. Lihat harga, stok, dan informasi lengkap produk ini.`,
    openGraph: {
      title: `${title} | Sistem Inventaris`,
      description: `Detail produk ${title}. Lihat harga, stok, dan informasi lengkap.`,
    },
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params
  return <ProductDetail slug={slug} />
}
