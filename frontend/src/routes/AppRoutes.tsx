import { Routes, Route } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import AboutPage from '../pages/AboutPage'
import FeaturesPage from '../pages/FeaturesPage'
import ContactPage from '../pages/ContactPage'
import LoginPage from '../features/auth/loginPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/login" element={<LoginPage />} />
      {/* Fallback */}
      <Route path="*" element={<HomePage />} />
    </Routes>
  )
}
