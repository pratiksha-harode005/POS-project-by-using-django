import React from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, PlusCircle, History, Bell, CreditCard, User,
  CheckSquare, CheckCircle, GitCompare, Landmark, FileCheck, Layers, Users,
  ShieldAlert, Building, Sliders, Truck, FileSpreadsheet, Package, RefreshCw,
  FolderOpen, ShoppingCart, LogOut, Grid, LucideIcon
} from 'lucide-react'
import { UserRole, useAuth } from '../../context/AuthContext'

interface SidebarProps {
  role: UserRole
}

export interface MenuItem {
  label: string
  path: string
  icon: LucideIcon
}

export const getSidebarItems = (role: UserRole, activeVendorId?: string): MenuItem[] => {
  const basePath = `/portal/${role.toLowerCase()}`

  switch (role) {
    case 'TEAM_LEAD':
      return [
        { label: 'Dashboard', path: `${basePath}/dashboard`, icon: LayoutDashboard },
        { label: 'My Requests', path: `${basePath}/my-requests`, icon: FileText },
        { label: 'Create Request', path: `${basePath}/create-request`, icon: PlusCircle },
        { label: 'Request History', path: `${basePath}/request-history`, icon: History },
        { label: 'Notifications', path: `${basePath}/notifications`, icon: Bell },
        { label: 'Payment Status', path: `${basePath}/payment-status`, icon: CreditCard },
        { label: 'Profile', path: `${basePath}/profile`, icon: User },
      ]

    case 'MANAGER':
      return [
        { label: 'Dashboard', path: `${basePath}/dashboard`, icon: LayoutDashboard },
        { label: 'Request Details', path: `${basePath}/request-details`, icon: FileText },
        { label: 'My Approvals', path: `${basePath}/my-approvals`, icon: CheckSquare },
        { label: 'Approved/Rejected', path: `${basePath}/history`, icon: CheckCircle },
        { label: '3-Way Matching', path: `${basePath}/three-way-matching`, icon: GitCompare },
        { label: 'Recommended to Finance', path: `${basePath}/recommended-finance`, icon: Landmark },
        { label: 'Budgets', path: `${basePath}/budgets`, icon: CreditCard },
        { label: 'RFQs', path: `${basePath}/rfqs`, icon: FileSpreadsheet },
        { label: 'Notifications', path: `${basePath}/notifications`, icon: Bell },
        { label: 'Profile', path: `${basePath}/profile`, icon: User },
      ]

    case 'FINANCE':
      return [
        { label: 'Dashboard', path: `${basePath}/dashboard`, icon: LayoutDashboard },
        { label: 'Budget', path: `${basePath}/budget`, icon: CreditCard },
        { label: 'Purchase Requests', path: `${basePath}/purchase-requests`, icon: FileText },
        { label: 'Pending Financial Approval', path: `${basePath}/pending-approvals`, icon: CheckSquare },
        { label: 'Approved/Rejected', path: `${basePath}/history`, icon: CheckCircle },
        { label: '3-Way Matching', path: `${basePath}/three-way-matching`, icon: GitCompare },
        { label: 'Payments', path: `${basePath}/payments`, icon: CreditCard },
        { label: 'Request Details', path: `${basePath}/request-details`, icon: FileText },
        { label: 'Financial Reports', path: `${basePath}/financial-reports`, icon: FileCheck },
        { label: 'Notifications', path: `${basePath}/notifications`, icon: Bell },
        { label: 'Profile', path: `${basePath}/profile`, icon: User },
      ]

    case 'ADMIN':
      return [
        { label: 'Dashboard', path: `${basePath}/dashboard`, icon: LayoutDashboard },
        { label: 'Requests', path: `${basePath}/requests`, icon: FileText },
        { label: 'Vendors', path: `${basePath}/vendors`, icon: Truck },
        { label: 'RFQs', path: `${basePath}/rfqs`, icon: FileSpreadsheet },
        { label: 'Quotations', path: `${basePath}/quotations`, icon: Layers },
        { label: 'Vendor Comparison', path: `${basePath}/vendor-comparison`, icon: GitCompare },
        { label: 'Purchase Orders', path: `${basePath}/purchase-orders`, icon: Package },
        { label: 'Receipts', path: `${basePath}/receipts`, icon: FileCheck },
        { label: 'Contracts', path: `${basePath}/contracts`, icon: FolderOpen },
        { label: 'Users', path: `${basePath}/users`, icon: Users },
        { label: 'Roles & Permissions', path: `${basePath}/roles-permissions`, icon: ShieldAlert },
        { label: 'Departments', path: `${basePath}/departments`, icon: Building },
        { label: 'Approval Workflows', path: `${basePath}/workflows`, icon: Sliders },
        { label: 'Notifications', path: `${basePath}/notifications`, icon: Bell },
        { label: 'Profile', path: `${basePath}/profile`, icon: User },
      ]

    case 'VENDOR':
      const vPrefix = activeVendorId ? `${basePath}/vendor/${activeVendorId}` : `${basePath}/vendor/VND-HW-001`
      return [
        { label: 'Dashboard', path: `${vPrefix}/dashboard`, icon: LayoutDashboard },
        { label: 'Vendor Categories', path: `${basePath}/categories`, icon: Grid },
        { label: 'Documents', path: `${vPrefix}/documents`, icon: FolderOpen },
        { label: 'RFQs', path: `${vPrefix}/rfqs`, icon: FileSpreadsheet },
        { label: 'Quotations', path: `${vPrefix}/quotations`, icon: Layers },
        { label: 'Purchase Orders', path: `${vPrefix}/purchase-orders`, icon: Package },
        { label: 'Receipts', path: `${vPrefix}/receipts`, icon: FileCheck },
        { label: 'Invoices', path: `${vPrefix}/invoices`, icon: FileText },
        { label: 'Payment Status', path: `${vPrefix}/payment-status`, icon: CreditCard },
        { label: 'Notifications', path: `${vPrefix}/notifications`, icon: Bell },
        { label: 'Profile', path: `${vPrefix}/profile`, icon: User },
      ]
  }
}

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const vendorMatch = location.pathname.match(/\/portal\/vendor\/vendor\/([^\/]+)/)
  const activeVendorId = vendorMatch ? vendorMatch[1] : undefined

  const menuItems = getSidebarItems(role, activeVendorId)

  return (
    <aside className="w-64 bg-[#0F1B3D] text-gray-300 min-h-screen flex flex-col flex-shrink-0 shadow-lg">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-800 bg-[#0B132B]">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
          <ShoppingCart size={18} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="font-bold text-white text-base leading-tight">Procurement OS</h1>
          <p className="text-[10px] text-blue-300 font-semibold tracking-wider uppercase">
            {role.replace('_', ' ')} PORTAL
          </p>
        </div>
      </div>

      {/* Active Vendor Banner (for Vendor Portal) */}
      {role === 'VENDOR' && activeVendorId && (
        <div className="px-4 py-2 bg-blue-950/80 border-b border-blue-800/60 flex items-center justify-between text-[11px]">
          <span className="text-white font-bold truncate">Active: <span className="text-blue-200 font-extrabold">{activeVendorId}</span></span>
          <NavLink
            to="/portal/vendor/categories"
            className="text-[10px] text-blue-300 hover:text-white underline font-semibold flex-shrink-0"
          >
            Switch
          </NavLink>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Sidebar Footer with Logout Button */}
      <div className="p-3 border-t border-gray-800 bg-[#0B132B]">
        <button
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all cursor-pointer"
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
