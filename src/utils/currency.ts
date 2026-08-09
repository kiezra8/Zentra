export const DEFAULT_CURRENCY = 'UGX'
export const DEFAULT_CURRENCY_SYMBOL = 'UGX'

export const CURRENCIES: { code: string; symbol: string; name: string; position: 'before' | 'after' }[] = [
  { code: 'UGX', symbol: 'UGX', name: 'Ugandan Shilling', position: 'before' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', position: 'before' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', position: 'before' },
  { code: 'RWF', symbol: 'RF', name: 'Rwandan Franc', position: 'before' },
  { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' },
]

export function formatCurrency(
  amount: number,
  currency = DEFAULT_CURRENCY,
  symbol = DEFAULT_CURRENCY_SYMBOL,
  position: 'before' | 'after' = 'before'
): string {
  const formatted = Math.abs(amount).toLocaleString('en-UG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  const sign = amount < 0 ? '-' : ''
  return position === 'before'
    ? `${sign}${symbol} ${formatted}`
    : `${sign}${formatted} ${symbol}`
}

export function formatCompact(amount: number, symbol = DEFAULT_CURRENCY_SYMBOL): string {
  if (amount >= 1_000_000) return `${symbol} ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000)     return `${symbol} ${(amount / 1_000).toFixed(0)}K`
  return formatCurrency(amount)
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0
}
