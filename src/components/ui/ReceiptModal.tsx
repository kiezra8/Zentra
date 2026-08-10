import { useState } from 'react'
import { Printer, Share2, X, MessageSquare } from 'lucide-react'
import { formatCurrency } from '@/utils/currency'
import { formatDateTime } from '@/utils/date'
import type { Sale, SaleItem } from '@/types'
import type { Business } from '@/types/business'

interface ReceiptModalProps {
  sale: Sale
  saleItems?: SaleItem[]
  business: Business
  onClose: () => void
}

export default function ReceiptModal({ sale, saleItems, business, onClose }: ReceiptModalProps) {
  const [phone, setPhone] = useState('')

  function handlePrint() {
    window.print()
  }

  function handleSendWhatsApp() {
    if (!phone.trim()) {
      alert('Please enter a WhatsApp phone number')
      return
    }

    // Format phone number to international format (default Uganda country code 256)
    let cleanPhone = phone.replace(/[^0-9]/g, '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '256' + cleanPhone.slice(1)
    } else if (!cleanPhone.startsWith('256') && cleanPhone.length === 9) {
      cleanPhone = '256' + cleanPhone
    }

    // Build Receipt Text Message
    const receiptNo = sale.receipt_no || sale.id.slice(0, 8)
    let itemsText = ''

    if (saleItems && saleItems.length > 0) {
      itemsText = saleItems
        .map(i => `• ${i.name} (${i.quantity} x UGX ${i.unit_price.toLocaleString()}) = UGX ${i.total.toLocaleString()}`)
        .join('\n')
    } else {
      itemsText = `• General Sale`
    }

    const message =
      `🧾 *RECEIPT — ${business.name.toUpperCase()}*\n` +
      `${business.location ? `📍 ${business.location}\n` : ''}` +
      `Receipt #: *#${receiptNo}*\n` +
      `Date: ${formatDateTime(sale.created_at)}\n` +
      `Payment Method: ${sale.payment_method.replace(/_/g, ' ').toUpperCase()}\n\n` +
      `*ITEMS PURCHASED:*\n${itemsText}\n\n` +
      `Subtotal: UGX ${(sale.subtotal || sale.total).toLocaleString()}\n` +
      `${sale.discount > 0 ? `Discount: -UGX ${sale.discount.toLocaleString()}\n` : ''}` +
      `*TOTAL PAID: UGX ${sale.total.toLocaleString()}*\n\n` +
      `Thank you for your business! 🙏\n` +
      `_Sent via Zentra BMS_`

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    window.open(waUrl, '_blank')
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-handle" />

        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem' }}>Receipt & Sharing</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* WhatsApp Share Box */}
        <div className="card" style={{ background: '#F0FDF4', border: '1px solid #22C55E', marginBottom: '1.25rem', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#15803D', fontSize: '0.875rem', marginBottom: '0.625rem' }}>
            <MessageSquare size={18} /> Send Receipt via WhatsApp
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="tel"
              inputMode="numeric"
              className="input"
              placeholder="e.g. 0771234567 or 0701234567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={{ fontSize: '0.875rem', minHeight: 42 }}
            />
            <button
              onClick={handleSendWhatsApp}
              className="btn btn-sm"
              style={{ background: '#22C55E', color: 'white', fontWeight: 700, flexShrink: 0, padding: '0 1rem' }}
            >
              Share 📲
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div
          id="thermal-receipt"
          style={{
            background: '#FFFDF9',
            border: '1px dashed #CBD5E1',
            borderRadius: 12,
            padding: '1.25rem 1rem',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#0F172A',
            fontSize: '0.875rem',
            lineHeight: 1.4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            marginBottom: '1.25rem',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '0.875rem', borderBottom: '1px dashed #0F172A', paddingBottom: '0.75rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {business.name}
            </div>
            {business.location && <div style={{ fontSize: '0.75rem' }}>{business.location}</div>}
            {business.phone && <div style={{ fontSize: '0.75rem' }}>Tel: {business.phone}</div>}
          </div>

          {/* Transaction Metadata */}
          <div style={{ marginBottom: '0.875rem', fontSize: '0.75rem', borderBottom: '1px dashed #0F172A', paddingBottom: '0.5rem' }}>
            <div className="flex-between">
              <span>Receipt No:</span>
              <strong>#{sale.receipt_no || sale.id.slice(0, 8)}</strong>
            </div>
            <div className="flex-between">
              <span>Date:</span>
              <span>{formatDateTime(sale.created_at)}</span>
            </div>
            <div className="flex-between">
              <span>Payment Method:</span>
              <strong style={{ textTransform: 'uppercase' }}>{sale.payment_method.replace(/_/g, ' ')}</strong>
            </div>
          </div>

          {/* Items List */}
          {saleItems && saleItems.length > 0 ? (
            <div style={{ marginBottom: '0.875rem', borderBottom: '1px dashed #0F172A', paddingBottom: '0.75rem' }}>
              <div className="flex-between" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: 4 }}>
                <span>ITEM</span>
                <span>QTY x PRICE</span>
                <span>TOTAL</span>
              </div>
              {saleItems.map(item => (
                <div key={item.id} className="flex-between" style={{ fontSize: '0.8125rem', marginBottom: 3 }}>
                  <span style={{ maxWidth: '40%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </span>
                  <span>{item.quantity} x {item.unit_price}</span>
                  <strong>UGX {item.total.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginBottom: '0.875rem', borderBottom: '1px dashed #0F172A', paddingBottom: '0.5rem' }}>
              <div className="flex-between">
                <span>Sale Items:</span>
                <span>General Sale</span>
              </div>
            </div>
          )}

          {/* Financial Totals */}
          <div style={{ fontSize: '0.875rem', marginBottom: '0.875rem' }}>
            <div className="flex-between">
              <span>Subtotal:</span>
              <span>UGX {(sale.subtotal || sale.total).toLocaleString()}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex-between" style={{ color: '#DC2626' }}>
                <span>Discount:</span>
                <span>-UGX {sale.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex-between" style={{ fontWeight: 800, fontSize: '1.125rem', marginTop: 4, borderTop: '1px solid #0F172A', paddingTop: 4 }}>
              <span>TOTAL PAID:</span>
              <span>UGX {sale.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: '0.75rem', marginTop: '1rem', borderTop: '1px dashed #0F172A', paddingTop: '0.75rem' }}>
            <p style={{ fontWeight: 700 }}>Thank you for your business!</p>
            <p style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: 2 }}>Powered by Zentra BMS</p>
          </div>
        </div>

        {/* Print Action */}
        <button onClick={handlePrint} className="btn btn-primary btn-lg btn-full" style={{ gap: '0.5rem' }}>
          <Printer size={20} /> Print Thermal Receipt
        </button>
      </div>

      {/* Print Stylesheet injection for ESC/POS 58mm thermal printers */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #thermal-receipt, #thermal-receipt * { visibility: visible; }
          #thermal-receipt {
            position: absolute;
            left: 0; top: 0;
            width: 58mm;
            padding: 2mm;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  )
}
