import type { Metadata } from "next";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "Edit Produk",
  description: "Edit data produk",
};

// params sekarang Promise, jadi tipe-nya begini
interface PageProps {
  params: Promise<{ id: string }>;
}

// fungsi page harus async dan params di-await
export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;

  return <ProductForm productId={id} />;
}
