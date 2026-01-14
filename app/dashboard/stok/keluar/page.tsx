import type { Metadata } from "next"
import { StockMovementForm } from "../stock-movement-form"

export const metadata: Metadata = {
  title: "Stok Keluar",
  description: "Catat pengeluaran stok",
}

export default function StockOutPage() {
  return <StockMovementForm type="OUT" />
}
