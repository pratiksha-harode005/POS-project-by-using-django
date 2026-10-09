import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Sidebar } from './Sidebar'
import { NotificationDropdown } from './NotificationDropdown'
import { useAuth, UserRole } from '../../context/AuthContext'
import { LogOut, User, ChevronDown } from 'lucide-react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { getScopedVendorData } from '../../portals/vendor/VendorPortalPages'

interface PortalLayoutProps {
  children: React.ReactNode
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ children }) => {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()

  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  const derivedRoleFromPath = useMemo(() => {
    if (location.pathname.includes('/team_lead')) return 'TEAM_LEAD'
    if (location.pathname.includes('/manager')) return 'MANAGER'
    if (location.pathname.includes('/finance')) return 'FINANCE'
    if (location.pathname.includes('/admin')) return 'ADMIN'
    if (location.pathname.includes('/vendor')) return 'VENDOR'
    return null
  }, [location.pathname])

  const currentRole = role || derivedRoleFromPath || 'MANAGER'

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeVendorId = useMemo(() => {
    const vndMatch = location.pathname.match(/(VND-[A-Z0-9-]+)/i)
    if (vndMatch) return vndMatch[1].toUpperCase()

    const parts = location.pathname.split('/')
    const vIndex = parts.indexOf('vendor')
    if (vIndex !== -1 && parts.length > vIndex + 1) {
      const nextSeg = parts[vIndex + 1]
      if (nextSeg === 'vendor' && parts.length > vIndex + 2) {
        return parts[vIndex + 2]
      }
      if (!['categories', 'rfqs', 'dashboard', 'quotations', 'purchase-orders', 'deliveries', 'invoices', 'payments', 'documents'].includes(nextSeg)) {
        return nextSeg
      }
    }
    return null
  }, [location.pathname])

  const activeVendor = useMemo(() => {
    if (activeVendorId && currentRole === 'VENDOR') {
      return getScopedVendorData(activeVendorId).vendor
    }
    return null
  }, [activeVendorId, currentRole])

  // Get user details
  const firstName = activeVendor ? activeVendor.name : (user?.first_name || (currentRole === 'ADMIN' ? 'Priyanka' : 'Sachin'))
  const lastName = activeVendor ? '' : (user?.last_name || (currentRole === 'ADMIN' ? 'Sharma' : (user?.first_name ? '' : 'Kumar')))
  const initials = activeVendor
    ? activeVendor.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : `${firstName[0] || 'P'}${lastName[0] || 'S'}`.toUpperCase()
  const roleDisplay = activeVendor ? `${activeVendor.category} Vendor` : currentRole.replace('_', ' ').toLowerCase()

  return (
    <div className="w-screen h-screen flex bg-[#F8FAFC] overflow-hidden font-sans select-text">
      {/* Fixed Full-Height Role Sidebar */}
      <Sidebar role={currentRole} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar — Seamless, Clean, Perfectly Aligned, Stationary */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-end px-6 relative z-10 flex-shrink-0">
          {/* Right: Notifications & User Profile Chip */}
          <div className="flex items-center gap-5">
            {/* Topbar Notifications Dropdown */}
            <NotificationDropdown currentRole={currentRole} />

            {/* User Profile Chip */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
              >
                {/* Soft Lavender/Blue Initials Avatar */}
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                  {initials}
                </div>

                {/* Name & Role Text */}
                <div className="hidden sm:block text-left leading-tight">
                  <p className="text-xs font-bold text-slate-900 capitalize">
                    {firstName} {lastName}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium capitalize">
                    {roleDisplay}
                  </p>
                </div>

                <ChevronDown size={13} className="text-slate-400 hidden sm:block" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-scaleUp">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 capitalize">
                      {firstName} {lastName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {user?.email || `${firstName.toLowerCase()}@procurementos.com`}
                    </p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 capitalize">
                      {roleDisplay} Portal
                    </span>
                  </div>

                  {/* Links */}
                  <div className="py-1 text-xs text-slate-700">
                    <Link
                      to={`/portal/${currentRole.toLowerCase()}/profile`}
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 transition-colors"
                    >
                      <User size={15} className="text-slate-400" />
                      <span>My Profile & Settings</span>
                    </Link>
                  </div>

                  {/* Sign Out */}
                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false)
                        logout()
                        navigate('/login')
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content — Only this content area scrolls */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#F8FAFC] min-h-0 overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  )
}
