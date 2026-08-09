import { Outlet } from 'react-router-dom'
import { DesktopSidebar } from './DesktopSidebar'
import { MobileBottomNav, MobileTopBar } from './MobileNav'

export function AppShell() {
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
    </div>
  )
}
