// Types untuk Inventory Management System

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface Warehouse {
  id: string
  code: string
  name: string
  address: string | null
  pic: string | null
  phone?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  name: string
  slug: string
  sku: string
  description?: string
  price: number
  categoryId: string
  category?: Category
  minStock: number
  image?: string
  isActive?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Stock {
  id: string
  productId: string
  product?: Product
  warehouseId: string
  warehouse?: Warehouse
  quantity: number
  minStock: number
  createdAt: Date
  updatedAt: Date
}

export type StockMovementType =
  | "IN"
  | "OUT"
  | "ADJUSTMENT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"

export interface StockMovement {
  id: string
  productId: string
  product?: Product
  warehouseId: string
  warehouse?: Warehouse
  type: StockMovementType
  quantity: number
  previousQty: number
  newQty: number
  notes?: string
  transferId?: string
  userId: string
  user?: User
  createdAt: Date
}

export type TransferStatus = "DRAFT" | "POSTED" | "CANCELLED"

export interface StockTransfer {
  id: string
  transferNumber: string
  fromWarehouseId: string
  fromWarehouse?: Warehouse
  toWarehouseId: string
  toWarehouse?: Warehouse
  status: TransferStatus
  notes?: string
  items: TransferItem[]
  createdById: string
  createdByUser?: User
  postedById?: string
  postedByUser?: User
  postedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface TransferItem {
  id: string
  transferId: string
  productId: string
  product?: Product
  quantity: number
}

// RBAC Types
export interface Permission {
  id: string
  name: string
  code: string
  description?: string
  module: string
}

export interface Role {
  id: string
  name: string
  description?: string
  permissions: Permission[]
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  email: string
  name: string
  password?: string
  roles: Role[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Audit Log
export interface AuditLog {
  id: string
  userId: string
  user?: {
    id: string
    name: string | null
    email: string | null
  }
  action: string
  entity: string
  entityId?: string | null
  oldData?: unknown | null
  newData?: unknown | null
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: Date
}

export interface AuthUser {
  id: string
  email: string
  name: string
  roles: string[]  
  permissions?: string[]
}

// Session/Auth
export interface Session {
  user: User | null
  isAuthenticated: boolean
}
