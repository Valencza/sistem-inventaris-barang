import type { Metadata } from "next"
import { AuditLogList } from "./audit-log-list"

export const metadata: Metadata = {
  title: "Audit Log | Inventory System",
  description: "Lihat riwayat aktivitas sistem",
}

export default function AuditLogPage() {
  return <AuditLogList />
}
