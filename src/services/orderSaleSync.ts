// Order to Sales Synchronization Service
// Ensures that every restaurant order is accurately recorded in db.sales and db.saleItems,
// appearing in the Sales list, Dashboard revenue/income, Cashbook, and Financial Reports.

import { db, buildSyncMeta } from '@/database/dexie'
import { generateId } from '@/utils/deviceId'
import type { Order, OrderStatus, Sale, SaleItem } from '@/types'
import type { PaymentMethod } from '@/types/business'

export function getOrderReceiptNo(orderId: string): string {
  return `ORD-${orderId.slice(-6).toUpperCase()}`
}

export function formatOrderNotes(order: Pick<Order, 'id' | 'table_no' | 'customer_name'>): string {
  const label = order.table_no
    ? `Table ${order.table_no}`
    : order.customer_name
    ? order.customer_name
    : 'Takeaway'
  return `Restaurant Order — ${label} [order:${order.id}]`
}

/**
 * Creates or updates a Sale record for a given Restaurant Order
 */
export async function recordOrderAsSale(
  order: Order,
  items?: { name: string; price: number; qty: number }[]
): Promise<string> {
  const receiptNo = getOrderReceiptNo(order.id)
  const notes = formatOrderNotes(order)
  const paymentMethod: PaymentMethod = order.payment_method || 'cash'

  // Check if a sale already exists for this order
  const existingSale = await db.sales
    .where('business_id').equals(order.business_id)
    .filter(s => s.receipt_no === receiptNo || (s.notes ?? '').includes(`[order:${order.id}]`))
    .first()

  const now = Date.now()

  if (existingSale) {
    // If order was cancelled, soft delete the sale
    if (order.status === 'cancelled' || order.deleted_at) {
      await db.sales.update(existingSale.id, {
        deleted_at: now,
        updated_at: now,
        sync_status: 'pending',
      })
      return existingSale.id
    }

    // Update existing sale
    await db.sales.update(existingSale.id, {
      total: order.total,
      subtotal: order.subtotal,
      discount: order.discount || 0,
      payment_method: paymentMethod,
      notes,
      deleted_at: undefined,
      updated_at: now,
      sync_status: 'pending',
    })

    return existingSale.id
  }

  // If order is cancelled and no sale exists, skip
  if (order.status === 'cancelled' || order.deleted_at) {
    return ''
  }

  // Create new Sale
  const saleId = generateId()
  const newSale: Sale = {
    id: saleId,
    business_id: order.business_id,
    total: order.total,
    subtotal: order.subtotal,
    discount: order.discount || 0,
    tax: 0,
    payment_method: paymentMethod,
    receipt_no: receiptNo,
    notes,
    created_at: order.created_at || now,
    updated_at: now,
    ...buildSyncMeta(),
  }

  await db.sales.add(newSale)

  // Save Sale Items
  if (items && items.length > 0) {
    for (const it of items) {
      const saleItem: SaleItem = {
        id: generateId(),
        sale_id: saleId,
        name: it.name,
        quantity: it.qty,
        unit_price: it.price,
        discount: 0,
        total: it.price * it.qty,
      }
      await db.saleItems.add(saleItem)
    }
  } else {
    // Look up items from db.orderItems
    const orderItems = await db.orderItems.where('order_id').equals(order.id).toArray()
    for (const it of orderItems) {
      const saleItem: SaleItem = {
        id: generateId(),
        sale_id: saleId,
        name: it.name,
        quantity: it.quantity,
        unit_price: it.price,
        discount: 0,
        total: it.total,
      }
      await db.saleItems.add(saleItem)
    }
  }

  return saleId
}

/**
 * Updates the sale status when an order status changes
 */
export async function updateOrderSaleStatus(
  orderId: string,
  status: OrderStatus,
  paymentMethod?: PaymentMethod
): Promise<void> {
  const receiptNo = getOrderReceiptNo(orderId)
  const existingSale = await db.sales
    .filter(s => s.receipt_no === receiptNo || (s.notes ?? '').includes(`[order:${orderId}]`))
    .first()

  if (!existingSale) {
    const order = await db.orders.get(orderId)
    if (order) {
      order.status = status
      if (paymentMethod) order.payment_method = paymentMethod
      await recordOrderAsSale(order)
    }
    return
  }

  const now = Date.now()
  if (status === 'cancelled') {
    await db.sales.update(existingSale.id, {
      deleted_at: now,
      updated_at: now,
      sync_status: 'pending',
    })
  } else {
    await db.sales.update(existingSale.id, {
      payment_method: paymentMethod || existingSale.payment_method || 'cash',
      deleted_at: undefined,
      updated_at: now,
      sync_status: 'pending',
    })
  }
}

/**
 * Scans all orders in database and backfills/syncs missing sales records.
 * Run automatically on business load to guarantee all orders exist in sales & income.
 */
export async function syncAllOrdersToSales(businessId?: string): Promise<number> {
  let ordersQuery = db.orders.toCollection()
  if (businessId) {
    ordersQuery = db.orders.where('business_id').equals(businessId)
  }

  const orders = await ordersQuery.filter(o => !o.deleted_at && o.status !== 'cancelled').toArray()
  let syncedCount = 0

  for (const order of orders) {
    const receiptNo = getOrderReceiptNo(order.id)
    const existing = await db.sales
      .where('business_id').equals(order.business_id)
      .filter(s => s.receipt_no === receiptNo || (s.notes ?? '').includes(`[order:${order.id}]`))
      .first()

    if (!existing) {
      await recordOrderAsSale(order)
      syncedCount++
    }
  }

  return syncedCount
}
