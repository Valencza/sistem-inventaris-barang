import type { Metadata } from "next"
import { TransferForm } from "../transfer-form"

export const metadata: Metadata = {
  title: "Buat Transfer",
  description: "Buat transfer stok antar gudang",
}

export default function AddTransferPage() {
  return <TransferForm />
}
