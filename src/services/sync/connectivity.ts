// Connectivity detection — watchers for online/offline state
// Uses navigator.onLine + a lightweight HTTP ping for reliability

let _isOnline = navigator.onLine
const listeners = new Set<(online: boolean) => void>()

async function pingCheck(): Promise<boolean> {
  try {
    const res = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })
    return res.ok
  } catch {
    return false
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
  if (online !== _isOnline) {
    _isOnline = online
    listeners.forEach(cb => cb(online))
  }
}

// Browser events
window.addEventListener('online',  () => { _isOnline = true;  notify(true)  })
window.addEventListener('offline', () => { _isOnline = false; notify(false) })

// Periodic ping every 30 s (catches captive portals and DNS issues)
setInterval(async () => {
  if (navigator.onLine) {
    const ok = await pingCheck()
    notify(ok)
  } else {
    notify(false)
  }
}, 30_000)
