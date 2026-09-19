import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProcurementProvider } from './context/ProcurementContext'
import { ManagerDataProvider } from './context/ManagerDataContext'
import { ActivityProvider } from './context/ActivityContext'
import AppRoutes from './routes/AppRoutes'

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ProcurementProvider>
          <ManagerDataProvider>
            <ActivityProvider>
              <AppRoutes />
            </ActivityProvider>
          </ManagerDataProvider>
        </ProcurementProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
