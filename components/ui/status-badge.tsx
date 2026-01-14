import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { TransferStatus, StockMovementType } from "@/lib/types"

interface StatusBadgeProps {
  status: TransferStatus | StockMovementType | "active" | "inactive" | "low"
  className?: string
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  POSTED: { label: "Posted", variant: "default" },
  CANCELLED: { label: "Dibatalkan", variant: "destructive" },
  IN: { label: "Masuk", variant: "default" },
  OUT: { label: "Keluar", variant: "destructive" },
  ADJUST: { label: "Penyesuaian", variant: "secondary" },
  TRANSFER_IN: { label: "Transfer Masuk", variant: "default" },
  TRANSFER_OUT: { label: "Transfer Keluar", variant: "outline" },
  active: { label: "Aktif", variant: "default" },
  inactive: { label: "Tidak Aktif", variant: "secondary" },
  low: { label: "Stok Rendah", variant: "destructive" },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "secondary" as const }

  return (
    <Badge variant={config.variant} className={cn("font-medium", className)}>
      {config.label}
    </Badge>
  )
}
