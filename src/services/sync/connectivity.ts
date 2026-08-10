// Connectivity detection — watchers for online/offline state
// Uses navigator.onLine + a lightweight HTTP ping for reliability

import { useSyncStore } from '@/stores/syncStore'

let _isOnline = navigator.onLine
const listeners = new Set<(online: boolean) => void>()

async function pingCheck(): Promise<boolean> {
  try {
    // Ping Supabase directly (avoids CORS issues with google.com on some networks)
    const res = await fetch('https://vqxksgnbsgwcmpyhwvtl.supabase.co/rest/v1/', {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    return res.status < 500
  } catch {
    // Fallback: try a simple fetch of a known reliable resource
    try {
      await fetch('https://www.cloudflare.com/cdn-cgi/trace', {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(4000),
      })
      return true
    } catch {
      return false
    }
  }
}

export function getIsOnline(): boolean {
  return _isOnline
}

export function onConnectivityChange(cb: (online: boolean) => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function notify(online: boolean) {
  const changed = online !== _isOnline
  _isOnline = online
  // Always update the sync store to reflect current truth
  const store = useSyncStore.getState()
  if (!online) {
    store.setStatus('offline')
  }
  // Only fire change listeners when state actually changed
  if (changed) {
    listeners.forEach(cb => cb(online))
  }
}

// Browser events
window.addEventListener('online',  () => { notify(true)  })
window.addEventListener('offline', () => { notify(false) })

// Immediate check on load (don't wait 30s for first ping)
;(async () => {
  if (navigator.onLine) {
    const ok = await pingCheck()
    notify(ok)
  } else {
    notify(false)
  }
})()

// Periodic ping every 30s (catches captive portals and DNS issues)
setInterval(async () => {
  if (navigator.onLine) {
    const ok = await pingCheck()
    notify(ok)
  } else {
    notify(false)
  }
}, 30_000)
