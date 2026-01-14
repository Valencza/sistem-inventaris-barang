import type { Metadata } from "next"
import { TransferList } from "./transfer-list"

export const metadata: Metadata = {
  title: "Transfer Stok",
  description: "Kelola transfer stok antar gudang",
}

export default function TransferPage() {
  return <TransferList />
}
