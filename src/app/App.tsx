import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './providers/AuthProvider'
import { BusinessProvider } from './providers/BusinessProvider'
import { SyncProvider } from './providers/SyncProvider'
import { AppRouter } from './Router'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BusinessProvider>
          <SyncProvider>
            <AppRouter />
          </SyncProvider>
        </BusinessProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
