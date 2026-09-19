import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ManagerDataProvider } from './context/ManagerDataContext'
import { ActivityProvider } from './context/ActivityContext'
import AppRoutes from './routes/AppRoutes'

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ManagerDataProvider>
          <ActivityProvider>
            <AppRoutes />
          </ActivityProvider>
        </ManagerDataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
