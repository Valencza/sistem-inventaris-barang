import type { Metadata } from "next"
import { UserList } from "./user-list"

export const metadata: Metadata = {
  title: "Manajemen Pengguna | Inventory System",
  description: "Kelola pengguna sistem inventaris",
}

export default function UsersPage() {
  return <UserList />
}
