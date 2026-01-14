# 📦 Inventory Management System

### Next.js 15+ • Multi Gudang • RBAC • SEO Ready

**inventory-nextjs-multigudang** adalah aplikasi **Sistem Inventaris modern berbasis web** untuk mengelola **stok produk multi gudang**, **transfer stok**, serta **kontrol akses berbasis role (RBAC)**.

Project ini dirancang sebagai:

* 📚 Project pembelajaran serius
* 🏗️ Fondasi siap produksi
* 🌐 Katalog publik SEO-friendly

Dibangun menggunakan **Next.js App Router**, **TypeScript**, **Prisma**, dan **PostgreSQL**.

---

## ✨ Fitur Utama

### 🌍 Publik (SEO Friendly)

* Landing page marketing dengan CTA ke login & katalog
* Katalog produk publik (`/produk`)

  * Search (nama, SKU, deskripsi)
  * Filter kategori
  * Filter gudang (`?gudang=KODE`)
  * Hanya menampilkan produk dengan stok > 0
* Detail produk SEO-friendly (`/produk/[slug]`)

  * Total stok semua gudang
  * Stok per gudang aktif
  * Informasi gudang (alamat, PIC, telepon)
  * Produk sejenis (kategori sama)
* Metadata dinamis (`generateMetadata`)
* OpenGraph & SEO sharing
* `robots.ts` & `sitemap.ts`

---

### 🔐 Dashboard Internal (Login Required)

#### 📦 Produk

* CRUD Produk
* SKU unik
* Slug SEO
* Harga
* Minimum stok (low stock detection)

#### 🗂️ Kategori

* CRUD kategori
* Slug kategori

#### 🏭 Gudang

* CRUD gudang
* Kode unik
* Alamat
* PIC
* Status aktif / non-aktif

#### 📊 Stok & Movement

* Stok tersimpan **per gudang**
* Movement otomatis:

  * IN
  * OUT
  * ADJUSTMENT
  * TRANSFER_IN
  * TRANSFER_OUT
* Audit trail lengkap:

  * `previousQty → newQty`
  * Timestamp
  * User pelaku

#### 🔁 Transfer Stok

| Status    | Deskripsi                          |
| --------- | ---------------------------------- |
| Draft     | Data tersimpan, stok belum berubah |
| Posted    | Validasi stok + mutasi + audit log |
| Cancelled | Transfer dibatalkan                |

Transfer menggunakan **document-based flow**.

#### 🛡️ RBAC (Role Based Access Control)

* Multi-role per user
* Permission-based action
* Validasi dilakukan **di server**
* Struktur tabel:

  * User
  * Role
  * Permission
  * UserRole
  * RolePermission
* Cocok untuk:

  * Admin
  * Staff Gudang
  * Supervisor

---

## 🏗️ Arsitektur (Standar 2026)

* **Unified Fullstack**

  * Next.js sebagai UI + Backend
  * Server Actions & Route Handlers
* **Hybrid Rendering**

  * Server Components → katalog & list
  * Client Components → form & interaksi
* **Type Safety**

  * TypeScript end-to-end
  * Prisma ORM
  * Zod validation
* **Database Consistency**

  * PostgreSQL (Docker / Cloud)
* **Observability**

  * Vercel Analytics (opsional)

---

## 🧰 Tech Stack

* Next.js 15 (App Router)
* React 18 (Server & Client Components)
* TypeScript
* Prisma ORM
* PostgreSQL 15+
* Tailwind CSS
* shadcn/ui
* lucide-react
* Zod
* Auth.js / NextAuth (Credentials + JWT)
* Docker Compose

---

## 📂 Struktur Folder

```text
├── prisma/
│   ├── schema.prisma        # Model database
│   └── seed.ts              # Seed admin, gudang, dll
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── produk/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   └── page.tsx
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   │   ├── produk/
│   │   │   │   ├── kategori/
│   │   │   │   ├── gudang/
│   │   │   │   ├── stok/
│   │   │   │   ├── transfer/
│   │   │   │   └── page.tsx
│   │   ├── api/
│   │   │   ├── public/
│   │   │   │   ├── produk/
│   │   │   │   ├── kategori/
│   │   │   │   ├── gudang/
│   │   │   │   └── stok/
│   │   │   ├── stok/
│   │   │   └── stock-movements/
│   │   ├── robots.ts
│   │   └── sitemap.ts
│   ├── components/
│   ├── lib/
│   ├── services/
├── docker-compose.yml
├── .env
└── README.md
```

---

## ✅ Prasyarat

Pastikan environment berikut sudah terpasang:

* Node.js **20+**
* Docker Desktop
* PostgreSQL (via Docker atau Cloud)
* Git

---

## 🚀 Instalasi & Menjalankan Aplikasi

### 1️⃣ Clone & Install Dependency

```bash
git clone https://github.com/Valencza/sistem-inventaris-barang.git
cd sistem-inventaris-barang
npm install
```

---

### 2️⃣ Konfigurasi Environment (.env)

```env
# Database
DB_USER=usermu
DB_PASSWORD=passwordmu
DB_NAME=databasemu
DB_PORT=5432

DATABASE_URL="postgresql://usermu:passowrdmu@localhost:5432/databasemu?schema=public"
DIRECT_URL="postgresql://usermu:passwordmu@localhost:5432/databasemu?schema=public"

REDIS_PASSWORD=password_redismu
REDIS_PORT=6379

# Auth
JWT_SECRET=super-secret-jwt-key-anda
JWT_EXPIRES_IN=3600
```

> Password admin akan di-hash otomatis saat proses seeding.

---

### 3️⃣ Jalankan Database (Docker)

```bash
docker-compose up -d
```

---

### 4️⃣ Migrasi & Seed Database

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

---

### 5️⃣ Jalankan Aplikasi

```bash
npm run dev
```

---

## 🌐 Akses Aplikasi

* `/` → Landing page publik
* `/produk` → Katalog produk publik
* `/login` → Login dashboard
* `/dashboard/stok` → Manajemen stok (login required)

---

## 🔁 Alur Data Publik

### 📦 Katalog Produk

Endpoint publik:

* `GET /api/public/produk`
* `GET /api/public/kategori`
* `GET /api/public/gudang`
* `GET /api/public/stok`

Filtering dilakukan di frontend berdasarkan:

* Search (nama / SKU / deskripsi)
* Kategori
* Gudang + stok > 0

---

### 🧾 Detail Produk

Endpoint:

* `GET /api/public/produk/[slug]`

Fungsi:

* Menghitung total stok (agregat semua gudang)
* Menampilkan stok per gudang
* Deteksi low stock berdasarkan `minStock`

---

## 🧪 Perintah Development

```bash
npx prisma studio         # GUI database
npx prisma generate       # Regenerate Prisma Client
npx prisma migrate reset  # Reset database
docker-compose stop       # Stop database
```

---

## 🗺️ Roadmap Pengembangan

* Export laporan Excel / PDF
* Notifikasi stok rendah (email / dashboard)
* Barcode scanner (SKU)
* Integrasi POS
* Multi-tenant (multi perusahaan)
* Advanced audit log UI
* Full Text Search PostgreSQL

---

## 📄 Lisensi

Project ini menggunakan **dual-license**:

* **MIT License** → Personal, edukasi, dan non-komersial
* **Commercial License** → Wajib untuk penggunaan komersial

Detail lisensi komersial tersedia di:
**[COMMERCIAL_LICENSE.md](./COMMERCIAL_LICENSE.md)**

---

© 2026 **Garcia Fernanda Valenca Archadea**
All rights reserved.

---