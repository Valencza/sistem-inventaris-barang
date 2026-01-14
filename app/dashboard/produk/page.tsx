import type { Metadata } from "next"
import { ProductList } from "./product-list"

export const metadata: Metadata = {
  title: "Produk",
  description: "Kelola daftar produk inventaris",
}

export default function ProductPage() {
  return <ProductList />
}
