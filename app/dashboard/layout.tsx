import type React from "react"
import type { Metadata } from "next"
import { DashboardShell } from "./dashboard-shell"

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | Dashboard - Sistem Inventaris",
  },
  description: "Dashboard manajemen inventaris",
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
