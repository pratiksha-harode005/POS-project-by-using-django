import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ShoppingCart, Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Features', to: '/features' },
  { label: 'Contact', to: '/contact' },
]

export default function Navbar() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled ? 'bg-white shadow-md' : 'bg-white border-b border-gray-100'
        }`}
      >
        <nav
          className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 focus-ring rounded-md"
            aria-label="Procurement OS home"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <ShoppingCart size={18} color="#2563EB" strokeWidth={2.5} />
            </div>
            <span
              className="font-bold text-[#0F172A] tracking-tight"
              style={{ fontSize: '16px', letterSpacing: '-0.01em' }}
            >
              Procurement OS
            </span>
          </Link>

          {/* Desktop nav links */}
          <ul className="hidden md:flex items-center gap-8" role="list">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`nav-link focus-ring ${
                    location.pathname === link.to ? 'active' : ''
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop Login button */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="btn-primary text-sm focus-ring"
              style={{ padding: '8px 20px', fontSize: '14px' }}
            >
              Login
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-[#0F172A] hover:bg-gray-100 focus-ring transition-colors"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>
      </header>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="mobile-menu md:hidden" role="navigation" aria-label="Mobile navigation">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? 'bg-blue-50 text-[#2563EB]'
                  : 'text-[#0F172A] hover:bg-gray-50 hover:text-[#2563EB]'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-4 border-t border-gray-100 mt-2">
            <Link
              to="/login"
              className="btn-primary w-full justify-center"
              style={{ fontSize: '14px', padding: '10px 20px' }}
            >
              Login
            </Link>
          </div>
        </div>
      )}

      {/* Spacer so content doesn't hide under fixed navbar */}
      <div className="h-16" aria-hidden="true" />
    </>
  )
}
