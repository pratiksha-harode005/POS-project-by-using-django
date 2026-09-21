import { Link } from 'react-router-dom'
import { ShoppingCart, Mail, Phone, Linkedin, Twitter, Facebook } from 'lucide-react'

const categoryLinks = [
  { label: 'IT Hardware', to: '/features#it-hardware' },
  { label: 'Software & SaaS', to: '/features#software-saas' },
  { label: 'Cloud & Infrastructure', to: '/features#cloud-infrastructure' },
  { label: 'Cybersecurity', to: '/features#cybersecurity' },
  { label: 'Office Accessories', to: '/features#office-accessories' },
]

const quickLinks = [
  { label: 'Privacy Policy', to: '#' },
  { label: 'Terms of Service', to: '#' },
  { label: 'Careers', to: '#' },
]

const navigateLinks = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Features', to: '/features' },
  { label: 'Contact', to: '/contact' },
]

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#0F1B3D' }} aria-label="Site footer">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Column 1: Company Info (Logo + Tagline + Contact Info + Socials) */}
          <div className="flex flex-col gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 group focus-ring rounded-md w-fit"
              aria-label="Procurement OS home"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <ShoppingCart size={18} color="#ffffff" strokeWidth={2.5} />
              </div>
              <span className="text-white font-bold text-base tracking-tight">
                Procurement OS
              </span>
            </Link>
            <p style={{ color: '#C7D2FE', fontSize: '13.5px' }} className="max-w-xs leading-relaxed">
              Smarter Procurement. Stronger Business.
            </p>
            <div className="mt-2 flex flex-col gap-2" style={{ color: '#C7D2FE', fontSize: '13.5px' }}>
              <a href="mailto:support@procurementos.com" className="flex items-center gap-2.5 hover:text-white transition-colors">
                <Mail size={15} className="shrink-0 text-indigo-300" />
                <span>support@procurementos.com</span>
              </a>
              <a href="tel:+919876543210" className="flex items-center gap-2.5 hover:text-white transition-colors">
                <Phone size={15} className="shrink-0 text-indigo-300" />
                <span>+91 98765 43210</span>
              </a>
            </div>

            {/* Social Media Icons */}
            <div className="mt-3 flex items-center gap-3">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-indigo-200 hover:text-white hover:bg-white/20 transition-all focus-ring"
              >
                <Linkedin size={16} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-indigo-200 hover:text-white hover:bg-white/20 transition-all focus-ring"
              >
                <Twitter size={16} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-indigo-200 hover:text-white hover:bg-white/20 transition-all focus-ring"
              >
                <Facebook size={16} />
              </a>
            </div>
          </div>

          {/* Column 2: Categories */}
          <div className="flex flex-col gap-3">
            <h3 className="text-white font-semibold tracking-wider uppercase text-xs text-indigo-200">
              Categories
            </h3>
            <ul className="flex flex-col gap-2.5" role="list">
              {categoryLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    style={{ color: '#C7D2FE', fontSize: '14px' }}
                    className="hover:text-white transition-colors focus-ring rounded"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Quick Links */}
          <div className="flex flex-col gap-3">
            <h3 className="text-white font-semibold tracking-wider uppercase text-xs text-indigo-200">
              Quick Links
            </h3>
            <ul className="flex flex-col gap-2.5" role="list">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    style={{ color: '#C7D2FE', fontSize: '14px' }}
                    className="hover:text-white transition-colors focus-ring rounded"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Navigate */}
          <div className="flex flex-col gap-3">
            <h3 className="text-white font-semibold tracking-wider uppercase text-xs text-indigo-200">
              Navigate
            </h3>
            <nav aria-label="Footer navigation">
              <ul className="flex flex-col gap-2.5" role="list">
                {navigateLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      style={{ color: '#C7D2FE', fontSize: '14px' }}
                      className="hover:text-white transition-colors focus-ring rounded"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* Bottom Divider & Copyright */}
        <div
          className="mt-12 pt-6"
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
