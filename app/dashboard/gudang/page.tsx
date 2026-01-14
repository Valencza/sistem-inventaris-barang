import type { Metadata } from "next"
import { WarehouseList } from "./warehouse-list"

export const metadata: Metadata = {
  title: "Gudang",
  description: "Kelola gudang penyimpanan",
}

export default function WarehousePage() {
  return <WarehouseList />
}
