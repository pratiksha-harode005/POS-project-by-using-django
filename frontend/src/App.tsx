import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProcurementProvider } from './context/ProcurementContext'
import AppRoutes from './routes/AppRoutes'

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ProcurementProvider>
          <AppRoutes />
        </ProcurementProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
