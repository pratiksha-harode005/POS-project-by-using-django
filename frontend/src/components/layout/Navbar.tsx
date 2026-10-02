import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ShoppingCart, Menu, X, User } from 'lucide-react'

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
        className={`fixed top-0 left-0 right-0 z-50 bg-white transition-all duration-200 ${
          scrolled ? 'shadow-xs border-b border-slate-200/80' : 'border-b border-slate-100'
        }`}
      >
        <nav
          className="max-w-[1440px] 2xl:max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 h-[68px] flex items-center justify-between"
          aria-label="Main navigation"
        >
          {/* Logo (Centered vertically with exact 36px height) */}
          <Link
            to="/"
            className="flex items-center gap-2.5 h-9 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg group select-none"
            aria-label="Procurement OS home"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:bg-blue-700 transition-colors shrink-0">
              <ShoppingCart size={18} className="text-white" strokeWidth={2.4} />
            </div>
            <span className="font-bold text-[#0F172A] text-lg tracking-tight leading-none">
              Procurement OS
            </span>
          </Link>

          {/* Desktop Nav Links (Centered vertically in the 68px header) */}
          <ul className="hidden md:flex items-center gap-8 lg:gap-10 h-full" role="list">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to
              return (
                <li key={link.to} className="h-full flex items-center">
                  <Link
                    to={link.to}
                    className={`relative py-1 text-sm font-medium transition-colors flex items-center ${
                      isActive
                        ? 'text-blue-600 font-semibold'
                        : 'text-slate-600 hover:text-blue-600'
                    }`}
                  >
                    <span>{link.label}</span>
                    {isActive && (
                      <span className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-blue-600 rounded-full" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Desktop Login Button (Exact matching 36px height) */}
          <div className="hidden md:flex items-center h-9">
            <Link
              to="/login"
              className="h-9 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 hover:shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <User size={15} strokeWidth={2.4} />
              <span>Login</span>
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden w-9 h-9 rounded-lg text-[#0F172A] hover:bg-slate-100 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-x-0 top-[68px] bg-white border-b border-slate-200 shadow-xl z-40 p-5 md:hidden animate-fadeIn" role="navigation" aria-label="Mobile navigation">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
            <div className="pt-3 border-t border-slate-100 mt-1">
              <Link
                to="/login"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-colors"
              >
                <User size={16} strokeWidth={2.4} />
                <span>Login</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Spacer so content doesn't hide under fixed navbar */}
      <div className="h-[68px]" aria-hidden="true" />
    </>
  )
}
