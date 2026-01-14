import type { Metadata } from "next"
import { ProductForm } from "../product-form"

export const metadata: Metadata = {
  title: "Tambah Produk",
  description: "Tambah produk baru ke inventaris",
}

export default function AddProductPage() {
  return <ProductForm />
}
