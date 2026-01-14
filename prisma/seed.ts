import "dotenv/config";
import { PrismaClient, MovementType, TransferStatus, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

// Pool Postgres pakai DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Adapter Prisma untuk Postgres
const adapter = new PrismaPg(pool);

// PrismaClient dengan adapter (wajib di Prisma 7)
const prisma = new PrismaClient({ adapter });

async function upsertPermission(code: string, name: string, module: string) {
  return prisma.permission.upsert({
    where: { code },
    update: { name, module },
    create: { code, name, module },
  });
}

async function grantRolePermissions(roleId: string, permissionIds: string[]) {
  // pakai upsert agar idempotent (seed bisa di-run ulang)
  await Promise.all(
    permissionIds.map((permissionId) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      }),
    ),
  );
}

async function attachUserRole(userId: string, roleId: string) {
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: {},
    create: { userId, roleId },
  });
}

// Helper: buat movement IN/OUT/ADJUSTMENT + update stok + isi previousQty/newQty
async function createStockMovementWithBalance(params: {
  productId: string;
  warehouseId: string;
  type: MovementType;
  quantity: number;
  userId: string;
  notes?: string | null;
  transferId?: string | null;
}) {
  const { productId, warehouseId, type, quantity, userId, notes, transferId } = params;

  return prisma.$transaction(async (tx) => {
    // pastikan row stok ada
    let stock = await tx.stock.findUnique({
      where: {
        productId_warehouseId: { productId, warehouseId },
      },
    });

    if (!stock) {
      stock = await tx.stock.create({
        data: {
          productId,
          warehouseId,
          quantity: 0,
          minStock: 0,
        },
      });
    }

    const previousQty = stock.quantity;
    let newQty = previousQty;

    switch (type) {
      case MovementType.IN:
        newQty = previousQty + quantity;
        break;
      case MovementType.OUT:
        newQty = previousQty - quantity;
        if (newQty < 0) {
          throw new Error("Seed: stok tidak boleh negatif");
        }
        break;
      case MovementType.ADJUSTMENT:
        newQty = quantity;
        break;
      default:
        throw new Error(`Unsupported movement type in seed: ${type}`);
    }

    // update stok
    await tx.stock.update({
      where: { id: stock.id },
      data: { quantity: newQty },
    });

    const movement = await tx.stockMovement.create({
      data: {
        type,
        quantity,
        notes: notes ?? null,
        productId,
        warehouseId,
        userId,
        transferId: transferId ?? null,
        previousQty,
        newQty,
      },
    });

    return movement;
  });
}

// Helper transfer: update stok from/to dan kembalikan previous/new per sisi
async function applyTransferToStock(transfer: {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  items: { productId: string; quantity: number }[];
}) {
  type Balance = {
    productId: string;
    from: { previousQty: number; newQty: number };
    to: { previousQty: number; newQty: number };
  };

  const balances: Balance[] = [];

  await prisma.$transaction(async (tx) => {
    for (const it of transfer.items) {
      // FROM
      let fromStock = await tx.stock.findUnique({
        where: {
          productId_warehouseId: {
            productId: it.productId,
            warehouseId: transfer.fromWarehouseId,
          },
        },
      });

      if (!fromStock) {
        fromStock = await tx.stock.create({
          data: {
            productId: it.productId,
            warehouseId: transfer.fromWarehouseId,
            quantity: 0,
            minStock: 0,
          },
        });
      }

      const fromPrevious = fromStock.quantity;
      const fromNew = fromPrevious - it.quantity;

      if (fromNew < 0) {
        throw new Error("Seed transfer: stok asal tidak boleh negatif");
      }

      const updatedFrom = await tx.stock.update({
        where: { id: fromStock.id },
        data: {
          quantity: fromNew,
        },
      });

      // TO
      let toStock = await tx.stock.findUnique({
        where: {
          productId_warehouseId: {
            productId: it.productId,
            warehouseId: transfer.toWarehouseId,
          },
        },
      });

      if (!toStock) {
        toStock = await tx.stock.create({
          data: {
            productId: it.productId,
            warehouseId: transfer.toWarehouseId,
            quantity: 0,
            minStock: 0,
          },
        });
      }

      const toPrevious = toStock.quantity;
      const toNew = toPrevious + it.quantity;

      const updatedTo = await tx.stock.update({
        where: { id: toStock.id },
        data: {
          quantity: toNew,
        },
      });

      balances.push({
        productId: it.productId,
        from: { previousQty: fromPrevious, newQty: updatedFrom.quantity },
        to: { previousQty: toPrevious, newQty: updatedTo.quantity },
      });
    }
  });

  return balances;
}

async function main() {
  console.log("🌱 Starting seed...");

  // ==========================================
  // 0) ENV
  // ==========================================
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@inventory.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "password123";
  const adminName = process.env.ADMIN_NAME ?? "Administrator";

  const gudangEmail = process.env.WAREHOUSE_EMAIL ?? "gudang@inventory.com";
  const staffEmail = process.env.STAFF_EMAIL ?? "staff@inventory.com";

  // ==========================================
  // 1) CREATE PERMISSIONS
  // ==========================================
  console.log("Creating permissions...");

  const permissionsData = [
    // Dashboard
    { code: "dashboard.view", name: "Lihat Dashboard", module: "dashboard" },

    // Products
    { code: "product.view", name: "Lihat Produk", module: "product" },
    { code: "product.create", name: "Tambah Produk", module: "product" },
    { code: "product.update", name: "Edit Produk", module: "product" },
    { code: "product.delete", name: "Hapus Produk", module: "product" },

    // Categories
    { code: "category.view", name: "Lihat Kategori", module: "category" },
    { code: "category.create", name: "Tambah Kategori", module: "category" },
    { code: "category.update", name: "Edit Kategori", module: "category" },
    { code: "category.delete", name: "Hapus Kategori", module: "category" },

    // Warehouses
    { code: "warehouse.view", name: "Lihat Gudang", module: "warehouse" },
    { code: "warehouse.create", name: "Tambah Gudang", module: "warehouse" },
    { code: "warehouse.update", name: "Edit Gudang", module: "warehouse" },
    { code: "warehouse.delete", name: "Hapus Gudang", module: "warehouse" },

    // Stock
    { code: "stock.view", name: "Lihat Stok", module: "stock" },
    { code: "stock.in", name: "Stok Masuk", module: "stock" },
    { code: "stock.out", name: "Stok Keluar", module: "stock" },
    { code: "stock.adjust", name: "Adjustment Stok", module: "stock" },

    // Transfer
    { code: "transfer.view", name: "Lihat Transfer", module: "transfer" },
    { code: "transfer.create", name: "Buat Transfer", module: "transfer" },
    { code: "transfer.post", name: "Posting Transfer", module: "transfer" },
    { code: "transfer.cancel", name: "Batalkan Transfer", module: "transfer" },

    // Users
    { code: "user.view", name: "Lihat Pengguna", module: "user" },
    { code: "user.create", name: "Tambah Pengguna", module: "user" },
    { code: "user.update", name: "Edit Pengguna", module: "user" },
    { code: "user.delete", name: "Hapus Pengguna", module: "user" },
    { code: "user.assignRole", name: "Atur Role Pengguna", module: "user" },

    // Roles
    { code: "role.view", name: "Lihat Role", module: "role" },
    { code: "role.create", name: "Tambah Role", module: "role" },
    { code: "role.update", name: "Edit Role", module: "role" },
    { code: "role.delete", name: "Hapus Role", module: "role" },
    { code: "role.assignPermission", name: "Atur Hak Akses Role", module: "role" },

    // Audit
    { code: "audit.view", name: "Lihat Audit Log", module: "audit" },

    // Reports
    { code: "report.view", name: "Lihat Laporan", module: "report" },
    { code: "report.export", name: "Export Laporan", module: "report" },
  ];

  const permissions = await Promise.all(
    permissionsData.map((p) => upsertPermission(p.code, p.name, p.module)),
  );

  console.log(`Created/updated ${permissions.length} permissions`);

  const permIdByCode = new Map(permissions.map((p) => [p.code, p.id]));

  // ==========================================
  // 2) CREATE ROLES
  // ==========================================
  console.log("Creating roles...");

  const superAdminRole = await prisma.role.upsert({
    where: { name: "Super Admin" },
    update: {
      description: "Akses penuh ke semua fitur sistem",
      isSystem: true,
    },
    create: {
      name: "Super Admin",
      description: "Akses penuh ke semua fitur sistem",
      isSystem: true,
    },
  });

  const warehouseAdminRole = await prisma.role.upsert({
    where: { name: "Admin Gudang" },
    update: {
      description: "Mengelola stok dan transfer gudang",
      isSystem: false,
    },
    create: {
      name: "Admin Gudang",
      description: "Mengelola stok dan transfer gudang",
      isSystem: false,
    },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: "Staff" },
    update: {
      description: "Akses terbatas untuk melihat data",
      isSystem: false,
    },
    create: {
      name: "Staff",
      description: "Akses terbatas untuk melihat data",
      isSystem: false,
    },
  });

  // Helper: convert permission codes -> permissionIds
  const toIds = (codes: string[]) =>
    codes.map((c) => permIdByCode.get(c)).filter((v): v is string => Boolean(v));

  // Assign permissions
  await grantRolePermissions(
    superAdminRole.id,
    toIds(permissions.map((p) => p.code)),
  );

  await grantRolePermissions(
    warehouseAdminRole.id,
    toIds([
      "dashboard.view",
      "product.view",
      "category.view",
      "warehouse.view",
      "stock.view",
      "stock.in",
      "stock.out",
      "stock.adjust",
      "transfer.view",
      "transfer.create",
      "transfer.post",
      "transfer.cancel",
      "audit.view",
    ]),
  );

  await grantRolePermissions(
    staffRole.id,
    toIds([
      "dashboard.view",
      "product.view",
      "category.view",
      "warehouse.view",
      "stock.view",
      "transfer.view",
    ]),
  );

  console.log("Created 3 roles with permissions");

  // ==========================================
  // 3) CREATE USERS (bcrypt + multi-role)
  // ==========================================
  console.log("Creating users...");

  const hashedPassword = await bcrypt.hash(adminPassword, 10); // async hash

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: adminName, passwordHash: hashedPassword, isActive: true },
    create: { email: adminEmail, name: adminName, passwordHash: hashedPassword, isActive: true },
  });

  const warehouseUser = await prisma.user.upsert({
    where: { email: gudangEmail },
    update: { name: "Admin Gudang", passwordHash: hashedPassword, isActive: true },
    create: { email: gudangEmail, name: "Admin Gudang", passwordHash: hashedPassword, isActive: true },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: staffEmail },
    update: { name: "Staff", passwordHash: hashedPassword, isActive: true },
    create: { email: staffEmail, name: "Staff", passwordHash: hashedPassword, isActive: true },
  });

  await attachUserRole(adminUser.id, superAdminRole.id);
  await attachUserRole(warehouseUser.id, warehouseAdminRole.id);
  await attachUserRole(staffUser.id, staffRole.id);

  console.log("Created 3 users + attached roles");

  // ==========================================
  // 4) CREATE CATEGORIES
  // ==========================================
  console.log("Creating categories...");

  const categoriesData = [
    { name: "Elektronik", slug: "elektronik", description: "Peralatan elektronik dan gadget" },
    { name: "Pakaian", slug: "pakaian", description: "Pakaian pria, wanita, dan anak" },
    { name: "Makanan & Minuman", slug: "makanan-minuman", description: "Produk makanan dan minuman" },
    { name: "Peralatan Rumah Tangga", slug: "peralatan-rumah-tangga", description: "Peralatan untuk kebutuhan rumah" },
    { name: "Kesehatan", slug: "kesehatan", description: "Produk kesehatan dan obat-obatan" },
  ];

  const categories = await Promise.all(
    categoriesData.map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        update: { name: c.name, description: c.description },
        create: c,
      }),
    ),
  );

  console.log(`Created/updated ${categories.length} categories`);

  // ==========================================
  // 5) CREATE WAREHOUSES
  // ==========================================
  console.log("Creating warehouses...");

  const warehousesData = [
    { code: "GDG-JKT", name: "Gudang Jakarta", address: "Jl. Industri No. 123, Jakarta Utara", pic: "PIC Jakarta" },
    { code: "GDG-SBY", name: "Gudang Surabaya", address: "Jl. Raya Rungkut No. 456, Surabaya", pic: "PIC Surabaya" },
    { code: "GDG-BDG", name: "Gudang Bandung", address: "Jl. Soekarno Hatta No. 789, Bandung", pic: "PIC Bandung" },
  ];

  const warehouses = await Promise.all(
    warehousesData.map((w) =>
      prisma.warehouse.upsert({
        where: { code: w.code },
        update: { name: w.name, address: w.address, pic: w.pic, isActive: true },
        create: w,
      }),
    ),
  );

  console.log(`Created/updated ${warehouses.length} warehouses`);

  // ==========================================
  // 6) CREATE PRODUCTS (with Decimal price)
  // ==========================================
  console.log("Creating products...");

  const productsData: Array<{
    sku: string;
    name: string;
    slug: string;
    description: string;
    unit: string;
    price: string; // simpan string, lalu convert ke Decimal
    categoryId: string;
  }> = [
    // Elektronik
    { sku: "ELK-001", name: "Laptop ASUS ROG", slug: "laptop-asus-rog", description: "Laptop gaming high performance", unit: "pcs", price: "25000000.00", categoryId: categories[0].id },
    { sku: "ELK-002", name: "iPhone 15 Pro Max", slug: "iphone-15-pro-max", description: "Smartphone flagship Apple", unit: "pcs", price: "23000000.00", categoryId: categories[0].id },
    { sku: "ELK-003", name: "Samsung Galaxy S24", slug: "samsung-galaxy-s24", description: "Smartphone Android premium", unit: "pcs", price: "18000000.00", categoryId: categories[0].id },
    { sku: "ELK-004", name: "Wireless Mouse Logitech", slug: "wireless-mouse-logitech", description: "Mouse wireless ergonomis", unit: "pcs", price: "250000.00", categoryId: categories[0].id },

    // Pakaian
    { sku: "PKN-001", name: "Kaos Polos Cotton", slug: "kaos-polos-cotton", description: "Kaos cotton combed 30s", unit: "pcs", price: "65000.00", categoryId: categories[1].id },
    { sku: "PKN-002", name: "Celana Jeans Slim Fit", slug: "celana-jeans-slim-fit", description: "Celana jeans stretch premium", unit: "pcs", price: "199000.00", categoryId: categories[1].id },
    { sku: "PKN-003", name: "Kemeja Formal Pria", slug: "kemeja-formal-pria", description: "Kemeja katun premium", unit: "pcs", price: "159000.00", categoryId: categories[1].id },

    // Makanan & Minuman
    { sku: "MKN-001", name: "Kopi Arabica Gayo", slug: "kopi-arabica-gayo", description: "Kopi arabica premium dari Aceh", unit: "kg", price: "180000.00", categoryId: categories[2].id },
    { sku: "MKN-002", name: "Teh Hijau Organik", slug: "teh-hijau-organik", description: "Teh hijau organik 25 sachet", unit: "box", price: "45000.00", categoryId: categories[2].id },
    { sku: "MKN-003", name: "Madu Hutan Asli", slug: "madu-hutan-asli", description: "Madu murni dari hutan Kalimantan", unit: "botol", price: "120000.00", categoryId: categories[2].id },

    // Peralatan Rumah Tangga
    { sku: "PRT-001", name: "Blender Philips", slug: "blender-philips", description: "Blender 2 liter 350 watt", unit: "pcs", price: "499000.00", categoryId: categories[3].id },
    { sku: "PRT-002", name: "Rice Cooker Miyako", slug: "rice-cooker-miyako", description: "Rice cooker 1.8 liter", unit: "pcs", price: "289000.00", categoryId: categories[3].id },
    { sku: "PRT-003", name: "Setrika Panasonic", slug: "setrika-panasonic", description: "Setrika uap 1000 watt", unit: "pcs", price: "279000.00", categoryId: categories[3].id },

    // Kesehatan
    { sku: "KES-001", name: "Masker Medis 3 Ply", slug: "masker-medis-3-ply", description: "Masker medis isi 50 pcs", unit: "box", price: "25000.00", categoryId: categories[4].id },
    { sku: "KES-002", name: "Hand Sanitizer 500ml", slug: "hand-sanitizer-500ml", description: "Hand sanitizer gel 70% alcohol", unit: "botol", price: "35000.00", categoryId: categories[4].id },
    { sku: "KES-003", name: "Vitamin C 1000mg", slug: "vitamin-c-1000mg", description: "Vitamin C tablet isi 30", unit: "botol", price: "55000.00", categoryId: categories[4].id },
  ];

  const products = await Promise.all(
    productsData.map((p) =>
      prisma.product.upsert({
        where: { sku: p.sku },
        update: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          unit: p.unit,
          price: new Prisma.Decimal(p.price),
          categoryId: p.categoryId,
          isActive: true,
        },
        create: {
          sku: p.sku,
          name: p.name,
          slug: p.slug,
          description: p.description,
          unit: p.unit,
          price: new Prisma.Decimal(p.price),
          categoryId: p.categoryId,
          isActive: true,
        },
      }),
    ),
  );

  console.log(`Created/updated ${products.length} products`);

  // ==========================================
  // 7) CREATE INITIAL STOCK (per gudang) + minStock per gudang
  // ==========================================
  console.log("Creating initial stock...");

  const stockUpserts: Promise<any>[] = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    for (let w = 0; w < warehouses.length; w++) {
      const warehouse = warehouses[w];

      const baseQty = (i + 1) * 10;
      const variance = w * 5;
      const quantity = baseQty + variance + Math.floor(Math.random() * 20);

      const minStock = Math.max(5, Math.floor((i % 5) * 5));

      stockUpserts.push(
        prisma.stock.upsert({
          where: {
            productId_warehouseId: {
              productId: product.id,
              warehouseId: warehouse.id,
            },
          },
          update: { quantity, minStock },
          create: { productId: product.id, warehouseId: warehouse.id, quantity, minStock },
        }),
      );
    }
  }

  await Promise.all(stockUpserts);

  console.log(`Created/updated ${products.length * warehouses.length} stock records`);

  // ==========================================
  // 8) SAMPLE STOCK MOVEMENTS (pakai helper supaya previous/new keisi)
  // ==========================================
  console.log("Creating sample stock movements...");

  const movementsData = [
    {
      type: MovementType.IN,
      quantity: 50,
      productId: products[0].id,
      warehouseId: warehouses[0].id,
      userId: adminUser.id,
      notes: "Pembelian awal",
    },
    {
      type: MovementType.IN,
      quantity: 100,
      productId: products[4].id,
      warehouseId: warehouses[0].id,
      userId: adminUser.id,
      notes: "Restok dari supplier",
    },
    {
      type: MovementType.OUT,
      quantity: 10,
      productId: products[0].id,
      warehouseId: warehouses[0].id,
      userId: warehouseUser.id,
      notes: "Penjualan online",
    },
  ];

  await Promise.all(movementsData.map((m) => createStockMovementWithBalance(m)));

  console.log(`Created ${movementsData.length} stock movements`);

  // ==========================================
  // 9) SAMPLE TRANSFER (POSTED) + transfer movements
  // ==========================================
  console.log("Creating sample transfer...");

  const transfer = await prisma.transfer.upsert({
    where: { transferNumber: "TRF-2026-0001" },
    update: {},
    create: {
      transferNumber: "TRF-2026-0001",
      status: TransferStatus.POSTED,
      notes: "Transfer stok rutin bulanan",
      fromWarehouseId: warehouses[0].id,
      toWarehouseId: warehouses[1].id,
      createdById: adminUser.id,
      postedById: adminUser.id,
      postedAt: new Date(),
      items: {
        create: [
          { productId: products[0].id, quantity: 5 },
          { productId: products[4].id, quantity: 20 },
        ],
      },
    },
    include: { items: true },
  });

  // Terapkan perubahan stok saldo (asal -qty, tujuan +qty) dan ambil previous/new
  const balances = await applyTransferToStock(transfer);

  // buat 2 movement per item (OUT & IN) dengan previousQty/newQty sesuai saldo
  await Promise.all(
    transfer.items.flatMap((it) => {
      const bal = balances.find((b) => b.productId === it.productId);
      if (!bal) return [];

      return [
        prisma.stockMovement.create({
          data: {
            type: MovementType.TRANSFER_OUT,
            quantity: it.quantity,
            productId: it.productId,
            warehouseId: transfer.fromWarehouseId,
            userId: adminUser.id,
            transferId: transfer.id,
            notes: `Transfer OUT: ${transfer.transferNumber}`,
            previousQty: bal.from.previousQty,
            newQty: bal.from.newQty,
          },
        }),
        prisma.stockMovement.create({
          data: {
            type: MovementType.TRANSFER_IN,
            quantity: it.quantity,
            productId: it.productId,
            warehouseId: transfer.toWarehouseId,
            userId: adminUser.id,
            transferId: transfer.id,
            notes: `Transfer IN: ${transfer.transferNumber}`,
            previousQty: bal.to.previousQty,
            newQty: bal.to.newQty,
          },
        }),
      ];
    }),
  );

  console.log("Created/updated 1 transfer + movements");

  // ==========================================
  // 10) SAMPLE AUDIT LOGS
  // ==========================================
  console.log("Creating sample audit logs...");

  const auditLogsData = [
    { action: "LOGIN", entity: "auth", userId: adminUser.id },
    {
      action: "CREATE",
      entity: "product",
      entityId: products[0].id,
      userId: adminUser.id,
      newData: { name: products[0].name },
    },
    {
      action: "CREATE",
      entity: "warehouse",
      entityId: warehouses[0].id,
      userId: adminUser.id,
      newData: { name: warehouses[0].name },
    },
    {
      action: "CREATE",
      entity: "transfer",
      entityId: transfer.id,
      userId: adminUser.id,
      newData: { transferNumber: transfer.transferNumber },
    },
  ];

  await Promise.all(auditLogsData.map((a) => prisma.auditLog.create({ data: a })));

  console.log(`Created ${auditLogsData.length} audit logs`);

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
