import { Outlet } from 'react-router-dom'
import { DesktopSidebar } from './DesktopSidebar'
import { MobileBottomNav, MobileTopBar } from './MobileNav'
import { useBusinessStore } from '@/stores/businessStore'
import SubscriptionModal from '@/components/subscription/SubscriptionModal'

export function AppShell() {
  const { activeBusiness } = useBusinessStore()

  const now = Date.now()
  const isExpired = activeBusiness
    ? activeBusiness.subscription_status === 'expired' ||
      (activeBusiness.subscription_expires_at ? activeBusiness.subscription_expires_at < now : false)
    : false

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--surface-3)' }}>
      {/* Desktop: sidebar on left */}
      <DesktopSidebar />

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Mobile top bar */}
        <MobileTopBar />

        {/* Page content */}
        <main className="main-content" style={{ flex: 1 }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div style={{ display: 'block' }} className="lg-hidden">
        <MobileBottomNav />
      </div>

      {/* Subscription Paywall Modal if subscription is expired */}
      {isExpired && (
        <SubscriptionModal isPaywall />
      )}
    </div>
  )
}
