import type { Metadata } from "next"
import { DashboardOverview } from "./dashboard-overview"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview dashboard sistem inventaris",
}

export default function DashboardPage() {
  return <DashboardOverview />
}
