# 📦 Inventory Management System  
### Next.js 15+ • Multi Gudang • RBAC • SEO Ready

**inventory-nextjs-multigudang** adalah aplikasi **Sistem Inventaris modern** berbasis **Next.js App Router** yang dirancang untuk pembelajaran serius sekaligus fondasi project produksi.

Aplikasi ini mendukung:
- Manajemen **stok per gudang**
- **Transfer stok** dengan status Draft → Posted
- **Audit log** semua mutasi stok
- **RBAC (Role Based Access Control)**
- **Katalog publik SEO-friendly**

---

## ✨ Fitur Utama

### 🌍 Publik (SEO Friendly)
- Katalog produk publik (`/produk`)
- Filter gudang (`?gudang=KODE`) untuk melihat stok per gudang
- Detail produk SEO-friendly (`/produk/[slug]`)
- Rekomendasi *barang sejenis* (kategori sama)
- Metadata dinamis menggunakan `generateMetadata`
- Dukungan OpenGraph & SEO sharing

### 🔐 Dashboard (Login Required)
- **Produk**: CRUD (SKU, slug, harga, minimum stok)
- **Kategori**: CRUD + slug
- **Gudang**: CRUD (kode, nama, alamat, PIC)
- **Stok**:
  - IN
  - OUT
  - ADJUST
  - Audit trail otomatis
- **Transfer Stok**:
  - Draft
  - Posted (validasi stok + journal log)
- **RBAC**:
  - Multi-role per user
  - Permission-based action (divalidasi di server)

---

## 🏗️ Arsitektur (Standar 2026)

- **Unified Fullstack**
  - Next.js sebagai UI + Backend Logic
  - Server Actions sebagai mutation layer
- **Hybrid Rendering**
  - Server Components → katalog & list
  - Client Components → form & interaksi
- **Type Safety**
  - Prisma ORM
  - Zod validation
- **Database Consistency**
  - PostgreSQL via Docker Compose

---

## 🧰 Tech Stack

- Next.js 15+ (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL 15+
- Docker Compose
- Tailwind CSS
- shadcn/ui
- Zod
- Auth.js / NextAuth (Credentials + JWT)

---

## 📂 Struktur Folder

```text
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── produk/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   └── page.tsx
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── dashboard/
│   │   │   ├── _actions/
│   │   │   ├── _components/
│   │   │   ├── produk/
│   │   │   ├── kategori/
│   │   │   ├── gudang/
│   │   │   ├── stok/
│   │   │   ├── transfer/
│   │   │   └── page.tsx
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   ├── robots.ts
│   │   └── sitemap.ts
│   ├── components/
│   ├── lib/
│   └── services/
├── docker-compose.yml
├── .env
└── README.md
````

---

## ✅ Prasyarat

* Node.js **20+**
* Docker Desktop
* Git

---

## 🚀 Instalasi & Menjalankan

### 1️⃣ Clone & Install

```bash
git clone https://github.com/Valencza/sistem-inventaris-barang.git
cd sistem-inventaris-barang
npm install
```

---

### 2️⃣ Konfigurasi `.env`

Buat file `.env` di root project:

```env
# Database
DATABASE_URL="postgresql://USERNAMEMU:PASSWORDMU@localhost:5432/inventory_db?schema=public"
DIRECT_URL="postgresql://USERNAMEMU:PASSWORDMU@localhost:5432/inventory_db?schema=public"

DB_USER=admin
DB_PASSWORD=password
DB_NAME=inventory_db

# Auth
NEXTAUTH_SECRET="random-secret-string"

# Seed admin pertama
ADMIN_EMAIL="admin@local.test"
ADMIN_PASSWORD="password-kuat"
ADMIN_NAME="Administrator"
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

Buka: **[http://localhost:3000](http://localhost:3000)**

---

## 🔐 Login Dashboard

* URL: `/login`
* Gunakan akun **admin** dari hasil `prisma db seed`
* Credential diambil dari file `.env`

---

## 🧭 Alur Penggunaan

### Publik

1. Buka `/produk`
2. Pilih gudang
3. Cari produk
4. Buka detail produk

### Dashboard

1. Buat gudang
2. Buat kategori
3. Buat produk
4. Input stok awal
5. Transfer stok antar gudang

---

## 🔁 Transfer Stok

| Status | Deskripsi                                 |
| ------ | ----------------------------------------- |
| Draft  | Data tersimpan, stok belum berubah        |
| Posted | Stok divalidasi & dipindahkan + audit log |

---

## 🛡️ RBAC (Role & Permission)

* Multi-role per user
* Permission divalidasi **di server**
* Cocok untuk:

  * Admin
  * Staff Gudang
  * Supervisor

---

## 🔍 SEO & Metadata

* Metadata dinamis via `generateMetadata`
* OpenGraph image support
* `robots.ts` & `sitemap.ts`
* Dashboard otomatis non-indexable

---

## 🧪 Perintah Development

```bash
npx prisma studio         # GUI database
docker-compose stop       # Stop database
npx prisma generate       # Regenerate Prisma Client
npx prisma migrate reset  # Reset DB
```

---

## 🧱 Catatan Desain Data

* Stok disimpan **per gudang**
* Semua mutasi dicatat ke **audit log**
* Transfer menggunakan **document-based flow**

---

## 🗺️ Roadmap

* Export laporan PDF / Excel
* Barcode scanner (SKU)
* Multi-tenant (per perusahaan)
* Advanced audit log UI
* Full Text Search (PostgreSQL)

---

## 📄 Lisensi

This project is dual-licensed:

- **MIT License** for personal, educational, and non-commercial use
- **Commercial License** required for commercial use

For commercial licensing inquiries, please see  
[COMMERCIAL_LICENSE.md](./COMMERCIAL_LICENSE.md).

Copyright © 2026 Garcia Fernanda Valenca Archadea


```