import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { StoreProvider } from "@/components/providers/store-provider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Sistem Inventaris - Manajemen Stok Multi Gudang",
    template: "%s | Sistem Inventaris",
  },
  description:
    "Sistem manajemen inventaris modern dengan dukungan multi gudang, transfer stok, dan kontrol akses berbasis role (RBAC).",
  keywords: ["inventaris", "stok", "gudang", "manajemen", "RBAC", "Indonesia"],
  authors: [{ name: "Inventory System" }],
  creator: "Inventory System",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Sistem Inventaris",
    title: "Sistem Inventaris - Manajemen Stok Multi Gudang",
    description:
      "Sistem manajemen inventaris modern dengan dukungan multi gudang, transfer stok, dan kontrol akses berbasis role.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sistem Inventaris - Manajemen Stok Multi Gudang",
    description: "Sistem manajemen inventaris modern dengan dukungan multi gudang.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  generator: "Sistem Inventaris",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d9488" },
    { media: "(prefers-color-scheme: dark)", color: "#14b8a6" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <StoreProvider>
          {children}
          <Toaster position="top-right" richColors />
        </StoreProvider>
        <Analytics />
      </body>
    </html>
  )
}
