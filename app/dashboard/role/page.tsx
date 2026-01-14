import type { Metadata } from "next"
import { RoleList } from "./role-list"

export const metadata: Metadata = {
  title: "Manajemen Role | Inventory System",
  description: "Kelola role dan permission sistem",
}

export default function RolesPage() {
  return <RoleList />
}
