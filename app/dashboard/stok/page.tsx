import type { Metadata } from "next"
import { StockList } from "./stock-list"

export const metadata: Metadata = {
  title: "Stok",
  description: "Kelola stok produk per gudang",
}

export default function StockPage() {
  return <StockList />
}
