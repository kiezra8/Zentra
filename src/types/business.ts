export type BusinessCategory =
  | 'retail'
  | 'wholesale'
  | 'restaurant'
  | 'mobile_money'
  | 'bank_agent'
  | 'boda_boda'
  | 'taxi'
  | 'hustler'
  | 'clinic'
  | 'beauty'
  | 'service'
  | 'farm'
  | 'general'
  | 'custom'

export interface BusinessCategoryConfig {
  id: BusinessCategory
  emoji: string
  name: string
  description: string
  modules: string[]
  color: string
}

export const BUSINESS_CATEGORIES: BusinessCategoryConfig[] = [
  { id: 'retail',       emoji: '🏪', name: 'Retail Business',        description: 'Shop, kiosk, or store selling products', modules: ['pos','products','inventory','sales','expenses','customers','reports'], color: '#0066FF' },
  { id: 'wholesale',    emoji: '📦', name: 'Wholesale Business',      description: 'Bulk selling to retailers & businesses',   modules: ['products','inventory','sales','customers','suppliers','invoices','expenses','reports'], color: '#7C3AED' },
  { id: 'restaurant',   emoji: '🍽️',  name: 'Restaurant / Food',       description: 'Restaurant, café, or food business',       modules: ['menu','orders','tables','sales','expenses','inventory','reports'], color: '#DC2626' },
  { id: 'mobile_money', emoji: '💰', name: 'Mobile Money Agent',      description: 'MTN, Airtel, or bank float agent',          modules: ['mobile_money','sales','expenses','reports'], color: '#059669' },
  { id: 'bank_agent',   emoji: '🏦', name: 'Bank / Cash Agent',       description: 'Bank agency or cash deposit business',      modules: ['mobile_money','sales','expenses','reports'], color: '#0891B2' },
  { id: 'boda_boda',    emoji: '🛵', name: 'Boda Boda / Motorcycle',  description: 'Motorcycle taxi or delivery',                modules: ['transport','expenses','reports'], color: '#D97706' },
  { id: 'taxi',         emoji: '🚕', name: 'Taxi / Transport',         description: 'Taxi cab or transport business',            modules: ['transport','expenses','reports'], color: '#F59E0B' },
  { id: 'hustler',      emoji: '🧑‍💼', name: 'Muyilibi / Hustler',      description: 'Personal income & side hustle tracking',    modules: ['income','expenses','reports'], color: '#8B5CF6' },
  { id: 'clinic',       emoji: '🏥', name: 'Clinic / Health',          description: 'Small clinic or health business',           modules: ['sales','expenses','customers','reports'], color: '#10B981' },
  { id: 'beauty',       emoji: '💇', name: 'Beauty / Salon / Barber',  description: 'Hair salon, barber, or beauty parlour',     modules: ['sales','expenses','customers','reports'], color: '#EC4899' },
  { id: 'service',      emoji: '🛠️', name: 'Service Business',         description: 'Repairs, cleaning, or service provider',    modules: ['sales','expenses','customers','reports'], color: '#6366F1' },
  { id: 'farm',         emoji: '🌾', name: 'Farm / Agriculture',       description: 'Farming or agricultural business',          modules: ['sales','expenses','inventory','reports'], color: '#16A34A' },
  { id: 'general',      emoji: '🏢', name: 'General Business',         description: 'Any other type of business',                modules: ['sales','expenses','customers','inventory','reports'], color: '#374151' },
  { id: 'custom',       emoji: '✨', name: 'Custom Business',           description: 'Build your own module setup',               modules: ['sales','expenses','reports'], color: '#6B7280' },
]

export interface Business {
  id: string
  owner_id: string
  name: string
  category: BusinessCategory
  currency: string
  location?: string
  phone?: string
  email?: string
  logo_url?: string
  has_employees: boolean
  settings: BusinessSettings
  created_at: number
  updated_at: number
  sync_status: SyncStatus
  synced_at?: number
  device_id: string
  version: number
}

export interface BusinessSettings {
  currency: string
  currency_symbol: string
  currency_position: 'before' | 'after'
  low_stock_threshold: number
  tax_rate: number
  receipt_footer?: string
  theme: 'light' | 'dark' | 'system'
}

export interface BusinessMember {
  id: string
  business_id: string
  user_id: string
  role: UserRole
  invited_at: number
  joined_at?: number
}

export type UserRole = 'owner' | 'manager' | 'cashier' | 'employee' | 'accountant' | 'viewer'

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'

export type PaymentMethod = 'cash' | 'mtn_mobile_money' | 'airtel_money' | 'bank' | 'credit' | 'other'

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; emoji: string }[] = [
  { value: 'cash', label: 'Cash', emoji: '💵' },
  { value: 'mtn_mobile_money', label: 'MTN Mobile Money', emoji: '📱' },
  { value: 'airtel_money', label: 'Airtel Money', emoji: '📲' },
  { value: 'bank', label: 'Bank Transfer', emoji: '🏦' },
  { value: 'credit', label: 'Credit / Debt', emoji: '📋' },
  { value: 'other', label: 'Other', emoji: '💳' },
]
