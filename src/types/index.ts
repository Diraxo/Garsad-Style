export type Role = 'admin' | 'seller'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  status: 'active' | 'disabled'
  createdAt: string
}

export interface Category {
  id: string
  name: string
  createdAt: string
}

export interface Product {
  id: string
  name: string
  brand: string
  categoryId: string
  sku: string
  size?: string
  color?: string
  purchaseCost: number
  sellingPrice: number
  quantity: number
  initialQuantity: number
  description?: string
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export type MovementType = 'INITIAL_STOCK' | 'SALE' | 'RESTOCK' | 'ADJUSTMENT'

export interface InventoryMovement {
  id: string
  productId: string
  type: MovementType
  quantityChange: number
  resultingStock: number
  userId: string
  userName: string
  note?: string
  createdAt: string
}

export interface PaymentMethod {
  id: string
  name: string
  active: boolean
  createdAt: string
}

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  productName: string
  sku: string
  quantity: number
  originalPrice: number
  actualPrice: number
  purchaseCost: number
  profit: number
}

export interface Sale {
  id: string
  sellerId: string
  sellerName: string
  paymentMethodId: string
  paymentMethodName: string
  items: SaleItem[]
  totalAmount: number
  totalProfit: number
  createdAt: string
}

export interface ShopSettings {
  shopName: string
  logoInitial: string
  phone: string
  address: string
  currency: string
  lowStockThreshold: number
}

export type StockStatus = 'normal' | 'warning' | 'critical' | 'sold_out'

export function getStockStatus(quantity: number, threshold = 5): StockStatus {
  if (quantity <= 0) return 'sold_out'
  if (quantity === 1) return 'critical'
  if (quantity <= threshold) return 'warning'
  return 'normal'
}
