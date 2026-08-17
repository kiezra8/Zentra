import type { BusinessCategory } from '@/types/business'

export interface StockPresetItem {
  name: string
  category: string
  buying_price: number
  selling_price: number
  stock_qty: number
  min_stock: number
  unit: string
  sku?: string
}

export interface BusinessStockPreset {
  category: BusinessCategory
  title: string
  description: string
  items: StockPresetItem[]
}

export const STOCK_CATALOG_PRESETS: Record<string, BusinessStockPreset> = {
  retail: {
    category: 'retail',
    title: 'Retail Shop / Kiosk / Supermarket',
    description: 'Fast-moving consumer goods, groceries, beverages, and daily essentials',
    items: [
      { name: 'Sugar 1kg', category: 'Groceries', buying_price: 3800, selling_price: 4500, stock_qty: 25, min_stock: 5, unit: 'kg', sku: 'RET-SUG-1K' },
      { name: 'Fresh Milk 500ml', category: 'Dairy', buying_price: 1800, selling_price: 2200, stock_qty: 30, min_stock: 8, unit: 'pkts', sku: 'RET-MLK-500' },
      { name: 'Sliced Bread 500g', category: 'Bakery', buying_price: 3500, selling_price: 4200, stock_qty: 15, min_stock: 4, unit: 'loaves', sku: 'RET-BRD-500' },
      { name: 'Cooking Oil 1L', category: 'Groceries', buying_price: 7500, selling_price: 9000, stock_qty: 20, min_stock: 5, unit: 'bottles', sku: 'RET-OIL-1L' },
      { name: 'Super Rice 1kg', category: 'Grains', buying_price: 4200, selling_price: 5000, stock_qty: 30, min_stock: 6, unit: 'kg', sku: 'RET-RCE-1K' },
      { name: 'Maize Flour 1kg', category: 'Grains', buying_price: 2600, selling_price: 3200, stock_qty: 25, min_stock: 5, unit: 'kg', sku: 'RET-MZE-1K' },
      { name: 'Laundry Bar Soap 1pc', category: 'Toiletries', buying_price: 3200, selling_price: 4000, stock_qty: 40, min_stock: 10, unit: 'bars', sku: 'RET-SOP-BAR' },
      { name: 'Mineral Water 500ml', category: 'Beverages', buying_price: 800, selling_price: 1000, stock_qty: 48, min_stock: 12, unit: 'bottles', sku: 'RET-WTR-500' },
      { name: 'Soda 300ml Glass', category: 'Beverages', buying_price: 1000, selling_price: 1500, stock_qty: 36, min_stock: 10, unit: 'bottles', sku: 'RET-SDA-300' },
      { name: 'Table Salt 500g', category: 'Groceries', buying_price: 1000, selling_price: 1500, stock_qty: 20, min_stock: 5, unit: 'pkts', sku: 'RET-SLT-500' },
      { name: 'Eggs (Tray of 30)', category: 'Poultry', buying_price: 12000, selling_price: 15000, stock_qty: 10, min_stock: 2, unit: 'trays', sku: 'RET-EGG-TRY' },
      { name: 'Safety Matches 1 Box', category: 'General', buying_price: 200, selling_price: 500, stock_qty: 50, min_stock: 15, unit: 'boxes', sku: 'RET-MTC-BX' },
    ],
  },
  wholesale: {
    category: 'wholesale',
    title: 'Wholesale / Bulk Distributor',
    description: 'Bulk bags, cartons, jerrycans, and bulk packages for retail re-sellers',
    items: [
      { name: 'Sugar 50kg Bag (Kakira)', category: 'Bulk Grains', buying_price: 185000, selling_price: 210000, stock_qty: 15, min_stock: 3, unit: 'bags', sku: 'WS-SUG-50' },
      { name: 'Super Rice 25kg Bag', category: 'Bulk Grains', buying_price: 95000, selling_price: 110000, stock_qty: 20, min_stock: 4, unit: 'bags', sku: 'WS-RCE-25' },
      { name: 'Wheat Flour 50kg Bag', category: 'Bulk Grains', buying_price: 145000, selling_price: 165000, stock_qty: 12, min_stock: 2, unit: 'bags', sku: 'WS-WHT-50' },
      { name: 'Cooking Oil 20L Jerrycan', category: 'Bulk Oils', buying_price: 140000, selling_price: 160000, stock_qty: 18, min_stock: 4, unit: 'jerrycans', sku: 'WS-OIL-20L' },
      { name: 'Bar Soap (Carton of 25)', category: 'Bulk Toiletries', buying_price: 75000, selling_price: 88000, stock_qty: 25, min_stock: 5, unit: 'cartons', sku: 'WS-SOP-CTN' },
      { name: 'Mineral Water (Carton of 24)', category: 'Bulk Beverages', buying_price: 16000, selling_price: 20000, stock_qty: 40, min_stock: 8, unit: 'cartons', sku: 'WS-WTR-CTN' },
      { name: 'Table Salt (Sack of 20 x 1kg)', category: 'Bulk Groceries', buying_price: 28000, selling_price: 35000, stock_qty: 15, min_stock: 3, unit: 'sacks', sku: 'WS-SLT-SCK' },
      { name: 'Matches (Carton of 100)', category: 'Bulk General', buying_price: 18000, selling_price: 24000, stock_qty: 20, min_stock: 5, unit: 'cartons', sku: 'WS-MTC-CTN' },
    ],
  },
  restaurant: {
    category: 'restaurant',
    title: 'Restaurant Kitchen Stock & Supplies',
    description: 'Raw kitchen ingredients, cooking supplies, spices, and stocked beverages',
    items: [
      { name: 'Fresh Beef 1kg', category: 'Meat & Poultry', buying_price: 14000, selling_price: 18000, stock_qty: 20, min_stock: 5, unit: 'kg', sku: 'REST-BF-1K' },
      { name: 'Fresh Chicken (Dressed)', category: 'Meat & Poultry', buying_price: 16000, selling_price: 22000, stock_qty: 15, min_stock: 4, unit: 'pcs', sku: 'REST-CHK-PC' },
      { name: 'Basmati Rice 25kg Bag', category: 'Kitchen Staples', buying_price: 115000, selling_price: 135000, stock_qty: 4, min_stock: 1, unit: 'bags', sku: 'REST-RCE-25' },
      { name: 'Irish Potatoes (1 Sack)', category: 'Fresh Produce', buying_price: 90000, selling_price: 110000, stock_qty: 5, min_stock: 1, unit: 'sacks', sku: 'REST-POT-SCK' },
      { name: 'Cooking Oil 20L', category: 'Kitchen Supplies', buying_price: 140000, selling_price: 160000, stock_qty: 3, min_stock: 1, unit: 'jerrycans', sku: 'REST-OIL-20L' },
      { name: 'Onions (1 Sack 50kg)', category: 'Fresh Produce', buying_price: 70000, selling_price: 85000, stock_qty: 3, min_stock: 1, unit: 'sacks', sku: 'REST-ONN-SCK' },
      { name: 'Fresh Tomatoes (1 Crate)', category: 'Fresh Produce', buying_price: 55000, selling_price: 70000, stock_qty: 4, min_stock: 1, unit: 'crates', sku: 'REST-TOM-CRT' },
      { name: 'Mineral Water 500ml (Ctn 24)', category: 'Beverages', buying_price: 16000, selling_price: 24000, stock_qty: 10, min_stock: 2, unit: 'cartons', sku: 'REST-WTR-CTN' },
      { name: 'Assorted Soft Drinks (Crate 24)', category: 'Beverages', buying_price: 24000, selling_price: 36000, stock_qty: 8, min_stock: 2, unit: 'crates', sku: 'REST-SDA-CRT' },
    ],
  },
  clinic: {
    category: 'clinic',
    title: 'Clinic / Pharmacy Stock',
    description: 'Essential medicines, analgesics, antibiotics, and clinical consumables',
    items: [
      { name: 'Paracetamol 500mg (100 Tabs)', category: 'Analgesics', buying_price: 4500, selling_price: 8000, stock_qty: 20, min_stock: 5, unit: 'packs', sku: 'CLN-PARA-500' },
      { name: 'Amoxicillin 500mg (100 Caps)', category: 'Antibiotics', buying_price: 12000, selling_price: 20000, stock_qty: 15, min_stock: 4, unit: 'packs', sku: 'CLN-AMOX-500' },
      { name: 'Ibuprofen 400mg (100 Tabs)', category: 'Analgesics', buying_price: 6000, selling_price: 10000, stock_qty: 15, min_stock: 4, unit: 'packs', sku: 'CLN-IBU-400' },
      { name: 'Metronidazole 200mg (100 Tabs)', category: 'Antibiotics', buying_price: 5500, selling_price: 9000, stock_qty: 12, min_stock: 3, unit: 'packs', sku: 'CLN-MET-200' },
      { name: 'ORS Oral Rehydration Salts (50 pkts)', category: 'Supplements', buying_price: 15000, selling_price: 25000, stock_qty: 10, min_stock: 2, unit: 'boxes', sku: 'CLN-ORS-50' },
      { name: 'Disposable Syringes 5ml (Box of 100)', category: 'Medical Supplies', buying_price: 18000, selling_price: 28000, stock_qty: 8, min_stock: 2, unit: 'boxes', sku: 'CLN-SYR-5ML' },
      { name: 'Surgical Gauze Roll 1pc', category: 'Medical Supplies', buying_price: 8000, selling_price: 14000, stock_qty: 15, min_stock: 3, unit: 'rolls', sku: 'CLN-GAU-ROL' },
      { name: 'Cotton Wool 500g', category: 'Medical Supplies', buying_price: 9000, selling_price: 15000, stock_qty: 12, min_stock: 3, unit: 'rolls', sku: 'CLN-CTN-500' },
      { name: 'Examination Gloves (Box of 100)', category: 'Medical Supplies', buying_price: 22000, selling_price: 32000, stock_qty: 10, min_stock: 2, unit: 'boxes', sku: 'CLN-GLV-100' },
      { name: 'Cough Syrup 100ml Bottle', category: 'Syrups', buying_price: 4000, selling_price: 7500, stock_qty: 25, min_stock: 5, unit: 'bottles', sku: 'CLN-CGH-100' },
    ],
  },
  beauty: {
    category: 'beauty',
    title: 'Beauty / Salon / Barber Stock',
    description: 'Hair cosmetics, treatment kits, shampoos, sanitizers, and salon essentials',
    items: [
      { name: 'Professional Hair Shampoo 5L', category: 'Hair Care', buying_price: 28000, selling_price: 45000, stock_qty: 4, min_stock: 1, unit: 'jerrycans', sku: 'SAL-SHP-5L' },
      { name: 'Deep Hair Conditioner 1L', category: 'Hair Care', buying_price: 18000, selling_price: 28000, stock_qty: 8, min_stock: 2, unit: 'bottles', sku: 'SAL-CND-1L' },
      { name: 'Hair Relaxer Kit (Regular)', category: 'Chemicals', buying_price: 12000, selling_price: 18000, stock_qty: 15, min_stock: 3, unit: 'tubs', sku: 'SAL-RLX-REG' },
      { name: 'Herbal Hair Food 250g', category: 'Hair Food', buying_price: 4500, selling_price: 7000, stock_qty: 20, min_stock: 4, unit: 'jars', sku: 'SAL-HFD-250' },
      { name: 'Clipper Blade Sanitizer & Oil 500ml', category: 'Barber Supplies', buying_price: 15000, selling_price: 22000, stock_qty: 6, min_stock: 2, unit: 'bottles', sku: 'SAL-SAN-500' },
      { name: 'Aftershave Cologne 500ml', category: 'Barber Supplies', buying_price: 10000, selling_price: 16000, stock_qty: 10, min_stock: 2, unit: 'bottles', sku: 'SAL-AFT-500' },
      { name: 'Disposable Hair Cap Nets (Pack of 100)', category: 'Accessories', buying_price: 12000, selling_price: 18000, stock_qty: 8, min_stock: 2, unit: 'packs', sku: 'SAL-CAP-100' },
      { name: 'Braiding Synthetic Hair (Pack)', category: 'Braids', buying_price: 3500, selling_price: 5500, stock_qty: 30, min_stock: 5, unit: 'packs', sku: 'SAL-BRD-PC' },
    ],
  },
  service: {
    category: 'service',
    title: 'Service / Hardware / Auto Stock',
    description: 'Lubricants, spare parts, repair materials, and cleaning fluids',
    items: [
      { name: '4-Stroke Engine Oil 1L (20W-50)', category: 'Lubricants', buying_price: 18000, selling_price: 25000, stock_qty: 24, min_stock: 5, unit: 'bottles', sku: 'SRV-OIL-1L' },
      { name: 'Standard Spark Plug (NGK)', category: 'Spare Parts', buying_price: 6000, selling_price: 10000, stock_qty: 20, min_stock: 4, unit: 'pcs', sku: 'SRV-SPK-NGK' },
      { name: 'Brake Fluid DOT 3 500ml', category: 'Fluids', buying_price: 9000, selling_price: 14000, stock_qty: 15, min_stock: 3, unit: 'bottles', sku: 'SRV-BRK-500' },
      { name: 'WD-40 Multi-Use Spray 400ml', category: 'Maintenance', buying_price: 22000, selling_price: 30000, stock_qty: 8, min_stock: 2, unit: 'cans', sku: 'SRV-WD4-400' },
      { name: 'PVC Insulation Tape (Roll of 10)', category: 'Electrical', buying_price: 8000, selling_price: 13000, stock_qty: 12, min_stock: 3, unit: 'packs', sku: 'SRV-TAP-10' },
      { name: 'Heavy Duty Degreaser 5L', category: 'Cleaning', buying_price: 25000, selling_price: 35000, stock_qty: 5, min_stock: 1, unit: 'jerrycans', sku: 'SRV-DEG-5L' },
    ],
  },
  general: {
    category: 'general',
    title: 'General Commercial Stock',
    description: 'Standard retail and commercial starter merchandise inventory',
    items: [
      { name: 'General Merchandise Item A', category: 'General', buying_price: 5000, selling_price: 7500, stock_qty: 20, min_stock: 5, unit: 'pcs', sku: 'GEN-ITM-A' },
      { name: 'General Merchandise Item B', category: 'General', buying_price: 10000, selling_price: 15000, stock_qty: 15, min_stock: 3, unit: 'pcs', sku: 'GEN-ITM-B' },
      { name: 'Packaged Goods Pack', category: 'Groceries', buying_price: 8000, selling_price: 11000, stock_qty: 25, min_stock: 5, unit: 'packs', sku: 'GEN-PKG-01' },
      { name: 'Bottled Beverages 500ml', category: 'Beverages', buying_price: 1000, selling_price: 1500, stock_qty: 36, min_stock: 6, unit: 'bottles', sku: 'GEN-BEV-01' },
    ],
  },
}

export function getPresetForCategory(category?: string): BusinessStockPreset {
  if (!category) return STOCK_CATALOG_PRESETS.general
  return STOCK_CATALOG_PRESETS[category] || STOCK_CATALOG_PRESETS.general
}
