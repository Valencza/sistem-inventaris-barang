import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Package,
  Warehouse,
  ArrowRightLeft,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"

const features = [
  {
    icon: Package,
    title: "Manajemen Produk",
    description:
      "Kelola produk dengan mudah. Tambah, edit, dan kategorisasi produk dalam hitungan detik.",
  },
  {
    icon: Warehouse,
    title: "Multi Gudang",
    description:
      "Dukungan multiple warehouse. Pantau stok di setiap lokasi gudang secara real-time.",
  },
  {
    icon: ArrowRightLeft,
    title: "Transfer Stok",
    description:
      "Transfer stok antar gudang dengan sistem draft dan posting yang aman.",
  },
  {
    icon: BarChart3,
    title: "Laporan & Audit",
    description:
      "Audit trail lengkap untuk setiap pergerakan stok. Lacak siapa melakukan apa.",
  },
  {
    icon: Shield,
    title: "Kontrol Akses (RBAC)",
    description:
      "Role-based access control. Atur hak akses user berdasarkan role dan permission.",
  },
  {
    icon: Zap,
    title: "Performa Tinggi",
    description:
      "Dibangun dengan teknologi modern untuk performa optimal dan pengalaman pengguna terbaik.",
  },
]

const benefits = [
  "Gratis untuk digunakan",
  "Tanpa batasan jumlah produk",
  "Dukungan multi gudang",
  "Export data ke Excel",
  "Akses dari mana saja",
  "Update berkala",
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-center">
          <div className="flex w-full max-w-5xl items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="rounded-lg bg-primary p-1.5">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Inventaris</span>
            </Link>
            <nav className="flex items-center gap-2">
              <Link href="/produk">
                <Button variant="ghost" size="sm">
                  Katalog
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm">Masuk</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-16 md:py-24">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Kelola Inventaris Bisnis Anda dengan{" "}
            <span className="text-primary">Mudah & Efisien</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            Sistem manajemen inventaris modern dengan dukungan multi gudang,
            transfer stok, dan kontrol akses berbasis role. Cocok untuk bisnis
            kecil hingga menengah.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login">
              <Button size="lg" className="gap-2">
                Mulai Sekarang
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/produk">
              <Button size="lg" variant="outline">
                Lihat Katalog
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t py-16">
        <div className="container flex justify-center">
          <div className="w-full max-w-5xl">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Fitur Lengkap untuk Bisnis Anda
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                Semua yang Anda butuhkan untuk mengelola inventaris dalam satu
                platform terintegrasi.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="border-2 transition-colors hover:border-primary/50"
                >
                  <CardHeader>
                    <div className="mb-2 w-fit rounded-lg bg-primary/10 p-2.5">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="border-t py-16">
        <div className="container flex justify-center">
          <div className="grid w-full max-w-5xl items-center gap-10 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight">
                Mengapa Memilih Sistem Inventaris Kami?
              </h2>
              <p className="mb-8 text-muted-foreground">
                Dibangun dengan teknologi terkini dan dirancang untuk kemudahan
                penggunaan. Cocok untuk semua kalangan, dari pemula hingga
                profesional.
              </p>
              <ul className="grid gap-3">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8">
              <div className="space-y-4 rounded-xl bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Produk
                  </span>
                  <span className="text-2xl font-bold">1,234</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Gudang Aktif
                  </span>
                  <span className="text-2xl font-bold">5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Transaksi Hari Ini
                  </span>
                  <span className="text-2xl font-bold">89</span>
                </div>
                <div className="flex h-24 items-center justify-center rounded-lg bg-muted">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t py-16">
        <div className="container flex justify-center">
          <div className="w-full max-w-4xl">
            <div className="rounded-2xl bg-primary p-8 text-center md:p-12">
              <h2 className="mb-4 text-3xl font-bold text-primary-foreground">
                Siap Mengelola Inventaris dengan Lebih Baik?
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-primary-foreground/80">
                Mulai gunakan sistem inventaris kami sekarang. Gratis, mudah,
                dan tanpa ribet.
              </p>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2"
                >
                  Masuk ke Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="container flex justify-center">
          <div className="flex w-full max-w-5xl flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary p-1.5">
                <Package className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Sistem Inventaris</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Dibangun dengan Next.js, TypeScript, dan Tailwind CSS.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
