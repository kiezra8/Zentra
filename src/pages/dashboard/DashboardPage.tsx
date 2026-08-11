// DashboardPage.tsx — routes to the correct business-specific dashboard
import { lazy, Suspense } from 'react'
import { useBusinessStore } from '@/stores/businessStore'
import LoadingScreen from '@/components/ui/LoadingScreen'

const RetailDashboard     = lazy(() => import('./dashboards/RetailDashboard'))
const RestaurantDashboard = lazy(() => import('./dashboards/RestaurantDashboard'))
const ClinicDashboard     = lazy(() => import('./dashboards/ClinicDashboard'))
const MobileMoneyDashboard= lazy(() => import('./dashboards/MobileMoneyDashboard'))
const TransportDashboard  = lazy(() => import('./dashboards/TransportDashboard'))
const ServiceDashboard    = lazy(() => import('./dashboards/ServiceDashboard'))
const FarmDashboard       = lazy(() => import('./dashboards/FarmDashboard'))
const HustlerDashboard    = lazy(() => import('./dashboards/HustlerDashboard'))

export default function DashboardPage() {
  const { activeBusiness } = useBusinessStore()
  if (!activeBusiness) return null

  const cat = activeBusiness.category

  let Dashboard
  if (cat === 'restaurant') Dashboard = RestaurantDashboard
  else if (cat === 'clinic') Dashboard = ClinicDashboard
  else if (cat === 'mobile_money' || cat === 'bank_agent') Dashboard = MobileMoneyDashboard
  else if (cat === 'boda_boda' || cat === 'taxi') Dashboard = TransportDashboard
  else if (cat === 'beauty' || cat === 'service') Dashboard = ServiceDashboard
  else if (cat === 'farm') Dashboard = FarmDashboard
  else if (cat === 'hustler') Dashboard = HustlerDashboard
  else Dashboard = RetailDashboard // retail, wholesale, general, custom

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Dashboard />
    </Suspense>
  )
}
