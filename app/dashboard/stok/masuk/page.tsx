import type { Metadata } from "next"
import { StockMovementForm } from "../stock-movement-form"

export const metadata: Metadata = {
  title: "Stok Masuk",
  description: "Catat penerimaan stok",
}

export default function StockInPage() {
  return <StockMovementForm type="IN" />
}
