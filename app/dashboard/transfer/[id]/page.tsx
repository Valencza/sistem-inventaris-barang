import type { Metadata } from "next"
import { TransferDetail } from "./transfer-detail"

export const metadata: Metadata = {
  title: "Detail Transfer",
  description: "Lihat detail transfer stok",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TransferDetailPage({ params }: PageProps) {
  const { id } = await params
  return <TransferDetail transferId={id} />
}
