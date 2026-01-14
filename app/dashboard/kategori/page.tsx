import type { Metadata } from "next"
import { CategoryList } from "./category-list"

export const metadata: Metadata = {
  title: "Kategori",
  description: "Kelola kategori produk",
}

export default function CategoryPage() {
  return <CategoryList />
}
