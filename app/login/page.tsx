import type { Metadata } from "next"
import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke dashboard untuk mengelola inventaris bisnis Anda.",
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <LoginForm />
    </div>
  )
}
