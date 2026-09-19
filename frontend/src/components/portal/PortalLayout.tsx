import React from 'react'
import { Sidebar } from './Sidebar'
import { useAuth, UserRole } from '../../context/AuthContext'
import { LogOut, Bell, ChevronDown, Shield, RefreshCw } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

interface PortalLayoutProps {
  children: React.ReactNode
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ children }) => {
  const { user, role, logout, switchRolePortal } = useAuth()
  const navigate = useNavigate()

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetRole = e.target.value as UserRole
    switchRolePortal(targetRole)
    navigate(`/portal/${targetRole.toLowerCase()}/dashboard`)
  }

  const roleColors: Record<UserRole, { bg: string; text: string; border: string }> = {
    TEAM_LEAD: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    MANAGER: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    FINANCE: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    ADMIN: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    VENDOR: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  }

  const currentRole = role || 'TEAM_LEAD'
  const style = roleColors[currentRole]

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Role Sidebar */}
      <Sidebar role={currentRole} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full border ${style.bg} ${style.text} ${style.border} flex items-center gap-1.5`}
            >
              <Shield size={14} />
              {currentRole.replace('_', ' ')} PORTAL
            </span>

            {/* Quick Role Switcher for seamless testing */}
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">
              <RefreshCw size={13} className="text-gray-500" />
              <span className="text-[11px] text-gray-500 font-semibold uppercase">Switch Portal:</span>
              <select
                value={currentRole}
                onChange={handleRoleChange}
                className="bg-transparent text-xs font-bold text-gray-800 border-none outline-none cursor-pointer"
              >
                <option value="TEAM_LEAD">Team Lead Portal</option>
                <option value="MANAGER">Manager Portal</option>
                <option value="FINANCE">Finance Portal</option>
                <option value="ADMIN">Admin Portal</option>
                <option value="VENDOR">Vendor Portal</option>
              </select>
            </div>
          </div>

          {/* User & Actions */}
          <div className="flex items-center gap-5">
            <Link
              to={`/portal/${currentRole.toLowerCase()}/notifications`}
              className="relative text-gray-500 hover:text-blue-600 transition-colors"
              title="Notifications"
            >
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                2
              </span>
            </Link>

            <div className="h-6 w-[1px] bg-gray-200" />

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                {user?.first_name ? user.first_name[0] : 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-gray-900 leading-tight">
                  {user?.first_name} {user?.last_name || user?.username}
                </p>
                <p className="text-[10px] text-gray-500 font-medium">
                  {user?.email || 'user@procurementos.com'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-200"
              title="Logout"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
