import React from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, PlusCircle, History, Bell, CreditCard, User,
  CheckSquare, CheckCircle, Landmark, FileCheck, Layers, Users,
  ShieldAlert, Building, Sliders, Truck, FileSpreadsheet, Package,
  FolderOpen, ShoppingCart, LucideIcon, XCircle, Inbox, Ticket, ArrowUpRight,
  BarChart2, GitCompare, ShoppingBag, AlertTriangle, HelpCircle, Tag, Scale,
  LogOut, Grid, RefreshCw, FileEdit
} from 'lucide-react'
import { UserRole, useAuth } from '../../context/AuthContext'
import { useProcurement } from '../../context/ProcurementContext'

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
        { label: 'Saved Drafts', path: `${basePath}/drafts`, icon: FileEdit },
        { label: 'Renewals & Upgrades', path: `${basePath}/renewals`, icon: RefreshCw },
        { label: 'Request History', path: `${basePath}/request-history`, icon: History },
        { label: 'Notifications', path: `${basePath}/notifications`, icon: Bell },
        { label: 'Payment Status', path: `${basePath}/payment-status`, icon: CreditCard },
        { label: 'Profile', path: `${basePath}/profile`, icon: User },
      ]

    case 'MANAGER':
      return [
        { label: 'Dashboard', path: `${basePath}/dashboard`, icon: LayoutDashboard },
        { label: 'Purchase Requests', path: `${basePath}/purchase-requests`, icon: Layers },
        { label: 'Purchase Orders', path: `${basePath}/purchase-orders`, icon: Package },
        { label: 'Manager Approval', path: `${basePath}/pending-approvals`, icon: CheckSquare },
        { label: 'Finance Review', path: `${basePath}/finance-review`, icon: Landmark },
        { label: 'Raise Ticket', path: `${basePath}/raise-ticket`, icon: Ticket },
        { label: 'Raise Complaint', path: `${basePath}/raise-complaint`, icon: AlertTriangle },
        { label: 'Recommended to Finance', path: `${basePath}/recommended-finance`, icon: ArrowUpRight },
        { label: 'Payment', path: `${basePath}/payments`, icon: CreditCard },
        { label: 'Received Reports', path: `${basePath}/received-reports`, icon: FileCheck },
        { label: 'RFQs', path: `${basePath}/rfqs`, icon: FileSpreadsheet },
        { label: 'Vendor Quotations', path: `${basePath}/vendor-quotations`, icon: Scale },
        { label: 'Notifications', path: `${basePath}/notifications`, icon: Bell },
        { label: 'Profile', path: `${basePath}/profile`, icon: User },
      ]

    case 'FINANCE':
      return [
        { label: 'Dashboard', path: `${basePath}/dashboard`, icon: LayoutDashboard },
        { label: 'Budget', path: `${basePath}/budget`, icon: CreditCard },
        { label: 'Purchase Requests', path: `${basePath}/purchase-requests`, icon: Layers },
        { label: 'RFQs', path: `${basePath}/rfqs`, icon: FileSpreadsheet },
        { label: 'Vendor Quotations', path: `${basePath}/vendor-quotations`, icon: Scale },
        { label: 'Finance Approval', path: `${basePath}/pending-approvals`, icon: CheckSquare },
        { label: 'Recommend to Admin', path: `${basePath}/recommended-admin`, icon: ArrowUpRight },
        { label: 'Raise Ticket', path: `${basePath}/raise-ticket`, icon: Ticket },
        { label: 'Raise Complaint', path: `${basePath}/raise-complaint`, icon: AlertTriangle },
        { label: 'Payments', path: `${basePath}/payments`, icon: CreditCard },
        { label: 'Received Reports', path: `${basePath}/received-reports`, icon: FileCheck },
        { label: 'Financial Reports', path: `${basePath}/financial-reports`, icon: FileSpreadsheet },
        { label: 'Notifications', path: `${basePath}/notifications`, icon: Bell },
        { label: 'Profile', path: `${basePath}/profile`, icon: User },
      ]

    case 'ADMIN':
      return [
        { label: 'Dashboard', path: `${basePath}/dashboard`, icon: LayoutDashboard },
        { label: 'Requests', path: `${basePath}/requests`, icon: FileText },
        { label: 'Vendors', path: `${basePath}/vendors`, icon: Truck },
        { label: 'Raise Ticket', path: `${basePath}/raise-ticket`, icon: Ticket },
        { label: 'Raise Complaint', path: `${basePath}/raise-complaint`, icon: AlertTriangle },
        { label: 'RFQs', path: `${basePath}/rfqs`, icon: FileSpreadsheet },
        { label: 'Vendor Quotations', path: `${basePath}/vendor-quotations`, icon: Scale },
        { label: 'Purchase Orders', path: `${basePath}/purchase-orders`, icon: Package },
        { label: 'Receipts', path: `${basePath}/receipts`, icon: FileCheck },
        { label: 'Contracts', path: `${basePath}/contracts`, icon: FolderOpen },
        { label: 'Users', path: `${basePath}/users`, icon: Users },
        { label: 'Roles & Permissions', path: `${basePath}/roles-permissions`, icon: ShieldAlert },
        { label: 'Categories', path: `${basePath}/departments`, icon: Tag },
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
        { label: 'Invoices', path: `${vPrefix}/invoices`, icon: FileText },
        { label: 'Payment Status', path: `${vPrefix}/payment-status`, icon: CreditCard },
        { label: 'Notifications', path: `${vPrefix}/notifications`, icon: Bell },
        { label: 'Profile', path: `${vPrefix}/profile`, icon: User },
      ]
  }
}

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { logout } = useAuth()
  const { requests } = useProcurement()
  const navigate = useNavigate()
  const location = useLocation()

  const vendorMatch = location.pathname.match(/\/portal\/vendor\/vendor\/([^\/]+)/)
  const activeVendorId = vendorMatch ? vendorMatch[1] : undefined

  const menuItems = getSidebarItems(role, activeVendorId)

  const draftCount = React.useMemo(() => {
    if (role !== 'TEAM_LEAD') return 0
    return requests.filter((r) => r.status === 'Draft' || r.currentStage === 0 || r.raw_status === 'DRAFT').length
  }, [requests, role])

  return (
    <aside className="w-64 bg-[#0A1128] text-slate-300 h-full flex flex-col flex-shrink-0 shadow-lg border-r border-slate-900 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800/80 bg-[#070D1E] flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
          <Package size={18} strokeWidth={2.2} />
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
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto min-h-0 [scrollbar-width:thin] [scrollbar-color:#334155_transparent]">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isDraftItem = item.path.includes('/drafts')

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={16} className="flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isDraftItem && draftCount > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white text-blue-700' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {draftCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Need Help? Box at bottom (hidden in Team Lead Portal) */}
      {role !== 'TEAM_LEAD' && !location.pathname.includes('/team_lead') && (
        <div className="p-3.5 m-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex-shrink-0">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <HelpCircle size={15} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white text-xs">Need Help?</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                Contact Procurement Support
              </p>
              <Link
                to={`/portal/${role.toLowerCase()}/raise-complaint`}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 mt-1.5 transition-colors"
              >
                Get Support &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
