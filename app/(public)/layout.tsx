import type React from "react"
import Link from "next/link"
import { Package } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-1.5">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Inventaris</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/produk">
              <Button variant="ghost">Katalog</Button>
            </Link>
            <Link href="/login">
              <Button>Masuk</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary p-1.5">
                <Package className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Sistem Inventaris</span>
            </div>
            <p className="text-sm text-muted-foreground">Kelola inventaris bisnis Anda dengan mudah dan efisien.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
