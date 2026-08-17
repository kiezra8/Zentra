import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useBusinessStore } from '@/stores/businessStore'
import { AppShell } from '@/components/layout/AppShell'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import CategorySelectPage from '@/pages/onboarding/CategorySelectPage'
import BusinessSetupPage from '@/pages/onboarding/BusinessSetupPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import SalesListPage from '@/pages/sales/SalesListPage'
import AddSalePage from '@/pages/sales/AddSalePage'
import ExpensesListPage from '@/pages/expenses/ExpensesListPage'
import AddExpensePage from '@/pages/expenses/AddExpensePage'
import CashbookPage from '@/pages/cashbook/CashbookPage'
import CustomersListPage from '@/pages/customers/CustomersListPage'
import CustomerDetailPage from '@/pages/customers/CustomerDetailPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import TransportPage from '@/modules/transport/TransportPage'
import HustlerPage from '@/modules/hustler/HustlerPage'
import MobileMoneyPage from '@/modules/mobile-money/MobileMoneyPage'
import BusinessSwitchPage from '@/pages/business/BusinessSwitchPage'
import ProductsPage from '@/pages/products/ProductsPage'
import LoadingScreen from '@/components/ui/LoadingScreen'
// Clinic module
import PatientsListPage from '@/modules/clinic/PatientsListPage'
import PatientDetailPage from '@/modules/clinic/PatientDetailPage'
import NewVisitPage from '@/modules/clinic/NewVisitPage'
import ClinicDispensaryPage from '@/modules/clinic/ClinicDispensaryPage'
// Restaurant module
import RestaurantOrdersPage from '@/modules/restaurant/RestaurantOrdersPage'
import NewOrderPage from '@/modules/restaurant/NewOrderPage'
import RestaurantMenuPage from '@/modules/restaurant/RestaurantMenuPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth/login" replace />
  return <>{children}</>
}

function RequireBusiness({ children }: { children: React.ReactNode }) {
  const { activeBusiness, isLoadingBusinesses } = useBusinessStore()
  // Show loading while BusinessProvider is fetching businesses from Supabase/Dexie
  if (isLoadingBusinesses) return <LoadingScreen />
  if (!activeBusiness) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

// Lighter guard for full-screen pages outside AppShell — waits for load, doesn't wrap in AppShell
function RequireBusinessLoaded({ children }: { children: React.ReactNode }) {
  const { isLoadingBusinesses } = useBusinessStore()
  if (isLoadingBusinesses) return <LoadingScreen />
  return <>{children}</>
}


export function AppRouter() {
  const { user, isLoading } = useAuthStore()

  if (isLoading) return <LoadingScreen />

  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />

      {/* Onboarding routes */}
      <Route path="/onboarding" element={<RequireAuth><CategorySelectPage /></RequireAuth>} />
      <Route path="/onboarding/setup" element={<RequireAuth><BusinessSetupPage /></RequireAuth>} />

      {/* Protected app routes */}
      <Route path="/" element={
        <RequireAuth>
          <RequireBusiness>
            <AppShell />
          </RequireBusiness>
        </RequireAuth>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="sales" element={<SalesListPage />} />
        <Route path="sales/add" element={<AddSalePage />} />
        <Route path="expenses" element={<ExpensesListPage />} />
        <Route path="expenses/add" element={<AddExpensePage />} />
        <Route path="cashbook" element={<CashbookPage />} />
        <Route path="customers" element={<CustomersListPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="businesses" element={<BusinessSwitchPage />} />
        {/* Module routes */}
        <Route path="transport" element={<TransportPage />} />
        <Route path="hustler" element={<HustlerPage />} />
        <Route path="mobile-money" element={<MobileMoneyPage />} />
        {/* Clinic routes */}
        <Route path="clinic/patients" element={<PatientsListPage />} />
        <Route path="clinic/patients/:id" element={<PatientDetailPage />} />
        <Route path="clinic/dispensary" element={<ClinicDispensaryPage />} />
        {/* Restaurant routes */}
        <Route path="restaurant/orders" element={<RestaurantOrdersPage />} />
        <Route path="restaurant/menu" element={<RestaurantMenuPage />} />
      </Route>

      {/* Full-screen pages outside AppShell (have their own header/layout) */}
      <Route path="/clinic/visit/new" element={<RequireAuth><RequireBusinessLoaded><NewVisitPage /></RequireBusinessLoaded></RequireAuth>} />
      <Route path="/restaurant/orders/new" element={<RequireAuth><RequireBusinessLoaded><NewOrderPage /></RequireBusinessLoaded></RequireAuth>} />

      {/* Default redirect */}
      <Route path="*" element={
        user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth/login" replace />
      } />
    </Routes>
  )
}
