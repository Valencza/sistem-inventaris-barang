import type { Metadata } from "next"
import { ProfileForm } from "./profile-form"

export const metadata: Metadata = {
  title: "Profil Saya | Inventory System",
  description: "Kelola profil dan pengaturan akun",
}

export default function ProfilePage() {
  return <ProfileForm />
}
