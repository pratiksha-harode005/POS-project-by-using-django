import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Features', to: '/features' },
  { label: 'Contact', to: '/contact' },
]

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#0F1B3D' }} aria-label="Site footer">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Left: Logo + tagline */}
          <div className="flex flex-col gap-2">
            <Link
              to="/"
              className="flex items-center gap-2 group focus-ring rounded-md"
              aria-label="Procurement OS home"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <ShoppingCart size={18} color="#ffffff" strokeWidth={2.5} />
              </div>
              <span className="text-white font-bold text-base tracking-tight">
                Procurement OS
              </span>
            </Link>
            <p style={{ color: '#C7D2FE', fontSize: '13px' }} className="pl-10 max-w-xs">
              Smarter Procurement. Stronger Business.
            </p>
          </div>

          {/* Right: Nav links */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-8 gap-y-3" role="list">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    style={{ color: '#C7D2FE', fontSize: '14px', fontWeight: 500 }}
                    className="hover:text-white transition-colors focus-ring rounded"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Divider */}
        <div
          className="mt-10 pt-6"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p
            className="text-center"
            style={{ color: '#C7D2FE', fontSize: '13px' }}
          >
            © 2026 Procurement OS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
