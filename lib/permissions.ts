// Permission codes untuk RBAC
export const PERMISSIONS = {
  // Products
  PRODUCT_VIEW: "product.view",
  PRODUCT_CREATE: "product.create",
  PRODUCT_EDIT: "product.edit",
  PRODUCT_DELETE: "product.delete",

  // Categories
  CATEGORY_VIEW: "category.view",
  CATEGORY_CREATE: "category.create",
  CATEGORY_EDIT: "category.edit",
  CATEGORY_DELETE: "category.delete",

  // Warehouses
  WAREHOUSE_VIEW: "warehouse.view",
  WAREHOUSE_CREATE: "warehouse.create",
  WAREHOUSE_EDIT: "warehouse.edit",
  WAREHOUSE_DELETE: "warehouse.delete",

  // Stock
  STOCK_VIEW: "stock.view",
  STOCK_IN: "stock.in",
  STOCK_OUT: "stock.out",
  STOCK_ADJUST: "stock.adjust",

  // Transfers
  TRANSFER_VIEW: "transfer.view",
  TRANSFER_CREATE: "transfer.create",
  TRANSFER_POST: "transfer.post",
  TRANSFER_CANCEL: "transfer.cancel",

  // Users
  USER_VIEW: "user.view",
  USER_CREATE: "user.create",
  USER_EDIT: "user.edit",
  USER_DELETE: "user.delete",

  // Roles
  ROLE_VIEW: "role.view",
  ROLE_CREATE: "role.create",
  ROLE_EDIT: "role.edit",
  ROLE_DELETE: "role.delete",

  // Reports
  REPORT_VIEW: "report.view",
  AUDIT_VIEW: "audit.view",
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const PERMISSION_MODULES = [
  { code: "product", name: "Produk" },
  { code: "category", name: "Kategori" },
  { code: "warehouse", name: "Gudang" },
  { code: "stock", name: "Stok" },
  { code: "transfer", name: "Transfer" },
  { code: "user", name: "Pengguna" },
  { code: "role", name: "Role" },
  { code: "report", name: "Laporan" },
  { code: "audit", name: "Audit" },
] as const

export const PERMISSION_GROUPS = [
  {
    name: "Produk",
    permissions: [
      { code: PERMISSIONS.PRODUCT_VIEW, name: "Lihat Produk" },
      { code: PERMISSIONS.PRODUCT_CREATE, name: "Tambah Produk" },
      { code: PERMISSIONS.PRODUCT_EDIT, name: "Edit Produk" },
      { code: PERMISSIONS.PRODUCT_DELETE, name: "Hapus Produk" },
    ],
  },
  {
    name: "Kategori",
    permissions: [
      { code: PERMISSIONS.CATEGORY_VIEW, name: "Lihat Kategori" },
      { code: PERMISSIONS.CATEGORY_CREATE, name: "Tambah Kategori" },
      { code: PERMISSIONS.CATEGORY_EDIT, name: "Edit Kategori" },
      { code: PERMISSIONS.CATEGORY_DELETE, name: "Hapus Kategori" },
    ],
  },
  {
    name: "Gudang",
    permissions: [
      { code: PERMISSIONS.WAREHOUSE_VIEW, name: "Lihat Gudang" },
      { code: PERMISSIONS.WAREHOUSE_CREATE, name: "Tambah Gudang" },
      { code: PERMISSIONS.WAREHOUSE_EDIT, name: "Edit Gudang" },
      { code: PERMISSIONS.WAREHOUSE_DELETE, name: "Hapus Gudang" },
    ],
  },
  {
    name: "Stok",
    permissions: [
      { code: PERMISSIONS.STOCK_VIEW, name: "Lihat Stok" },
      { code: PERMISSIONS.STOCK_IN, name: "Stok Masuk" },
      { code: PERMISSIONS.STOCK_OUT, name: "Stok Keluar" },
      { code: PERMISSIONS.STOCK_ADJUST, name: "Penyesuaian Stok" },
    ],
  },
  {
    name: "Transfer",
    permissions: [
      { code: PERMISSIONS.TRANSFER_VIEW, name: "Lihat Transfer" },
      { code: PERMISSIONS.TRANSFER_CREATE, name: "Buat Transfer" },
      { code: PERMISSIONS.TRANSFER_POST, name: "Posting Transfer" },
      { code: PERMISSIONS.TRANSFER_CANCEL, name: "Batalkan Transfer" },
    ],
  },
  {
    name: "Pengguna",
    permissions: [
      { code: PERMISSIONS.USER_VIEW, name: "Lihat Pengguna" },
      { code: PERMISSIONS.USER_CREATE, name: "Tambah Pengguna" },
      { code: PERMISSIONS.USER_EDIT, name: "Edit Pengguna" },
      { code: PERMISSIONS.USER_DELETE, name: "Hapus Pengguna" },
    ],
  },
  {
    name: "Role",
    permissions: [
      { code: PERMISSIONS.ROLE_VIEW, name: "Lihat Role" },
      { code: PERMISSIONS.ROLE_CREATE, name: "Tambah Role" },
      { code: PERMISSIONS.ROLE_EDIT, name: "Edit Role" },
      { code: PERMISSIONS.ROLE_DELETE, name: "Hapus Role" },
    ],
  },
  {
    name: "Laporan & Audit",
    permissions: [
      { code: PERMISSIONS.REPORT_VIEW, name: "Lihat Laporan" },
      { code: PERMISSIONS.AUDIT_VIEW, name: "Lihat Audit Log" },
    ],
  },
]
