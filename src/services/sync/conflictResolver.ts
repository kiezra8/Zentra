// Conflict resolution strategy:
// - Simple records: last-write-wins on updated_at + version
// - Financial transactions (sales, expenses): IMMUTABLE — no overwrite
//   Corrections must create adjustment records, not mutate originals

type ConflictRecord = {
  updated_at: number
  version: number
  id: string
}

export type ConflictTable = 'sales' | 'expenses' | 'cash_transactions' | 'mobile_money_transactions' | string

/**
 * Determine which version should win when a local and remote record conflict.
 * Returns 'local' or 'remote'.
 */
export function resolveConflict(
  local: ConflictRecord,
  remote: ConflictRecord,
  table: ConflictTable
): 'local' | 'remote' {
  // Financial tables: local always wins — we never silently overwrite financial records
  const immutableTables: ConflictTable[] = ['sales', 'expenses', 'cash_transactions', 'mobile_money_transactions']
  if (immutableTables.includes(table)) {
    // If remote is strictly newer and local was just synced (version === 1), take remote
    if (remote.updated_at > local.updated_at && local.version <= 1) return 'remote'
    // Otherwise keep local — corrections should be explicit adjustment records
    return 'local'
  }

  // For non-financial records: last-write-wins by updated_at
  if (remote.updated_at > local.updated_at) return 'remote'
  if (local.version > remote.version)        return 'local'
  return 'local' // tie-break: local wins
}
