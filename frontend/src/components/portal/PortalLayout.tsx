import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Sidebar } from './Sidebar'
import { NotificationDropdown } from './NotificationDropdown'
import { useAuth, UserRole } from '../../context/AuthContext'
import { useManagerData } from '../../context/ManagerDataContext'
import {
  LogOut, Search, User, ChevronDown, Building, FileText,
  CreditCard, ArrowRight, X, ExternalLink, TrendingUp, CheckCircle2
} from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

interface PortalLayoutProps {
  children: React.ReactNode
}

const DEPARTMENTS = [
  {
    id: 'IT',
    name: 'IT & Infrastructure',
    aliases: ['it', 'it department', 'tech', 'technology', 'hardware', 'software', 'cloud', 'infrastructure', 'engineering', 'developer', 'computers', 'laptops', 'saas'],
    costCenters: 'IT Hardware, SaaS & Cloud',
  },
  {
    id: 'Operations',
    name: 'Operations & Logistics',
    aliases: ['operations', 'ops', 'logistics', 'supply chain', 'furniture', 'equipment', 'packaging', 'warehouse'],
    costCenters: 'Furniture & Equipment, Facility Operations',
  },
  {
    id: 'Marketing',
    name: 'Marketing & Growth',
    aliases: ['marketing', 'mkt', 'growth', 'advertising', 'brand', 'campaign', 'pr'],
    costCenters: 'Software & Tools, Advertising Campaigns',
  },
  {
    id: 'HR',
    name: 'Human Resources',
    aliases: ['hr', 'human resources', 'people', 'talent', 'recruitment', 'training', 'development'],
    costCenters: 'Training & Development, Talent Programs',
  },
  {
    id: 'Admin',
    name: 'Corporate Administration',
    aliases: ['admin', 'administration', 'office', 'supplies', 'stationery', 'facilities'],
    costCenters: 'Office Supplies, General Facilities',
  },
]

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export const PortalLayout: React.FC<PortalLayoutProps> = ({ children }) => {
  const { user, role, logout, switchRolePortal } = useAuth()
  const { budgets, allRequests, payments } = useManagerData()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  const currentRole = role || 'MANAGER'

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetRole = e.target.value as UserRole
    switchRolePortal(targetRole)
    setProfileMenuOpen(false)
    navigate(`/portal/${targetRole.toLowerCase()}/dashboard`)
  }

  const roleColors: Record<UserRole, { bg: string; text: string; border: string }> = {
    TEAM_LEAD: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    MANAGER: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    FINANCE: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    ADMIN: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    VENDOR: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  }

  // Close profile and search dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false)
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Smart search matching
  const cleanQuery = searchQuery.trim().toLowerCase()

  const matchedDepartments = useMemo(() => {
    if (!cleanQuery) return []
    return DEPARTMENTS.filter((d) => {
      if (d.name.toLowerCase().includes(cleanQuery)) return true
      if (d.id.toLowerCase() === cleanQuery || cleanQuery.includes(d.id.toLowerCase())) return true
      return d.aliases.some((alias) => alias.includes(cleanQuery) || cleanQuery.includes(alias))
    }).map((d) => {
      const deptBudgets = budgets.filter(
        (b) => b.department.toLowerCase() === d.id.toLowerCase() || b.department.toLowerCase().includes(d.id.toLowerCase())
      )
      const totalBudget = deptBudgets.reduce((s, b) => s + b.totalBudget, 0)
      const allocated = deptBudgets.reduce((s, b) => s + b.allocated, 0)
      const spent = deptBudgets.reduce((s, b) => s + b.spent, 0)
      const available = deptBudgets.reduce((s, b) => s + b.available, 0)
      const reqCount = allRequests.filter(
        (r) => r.department.toLowerCase() === d.id.toLowerCase() || r.department.toLowerCase().includes(d.id.toLowerCase())
      ).length
      const pace = totalBudget > 0 ? ((spent / totalBudget) * 100).toFixed(1) : '0.0'
      return { ...d, totalBudget, allocated, spent, available, reqCount, pace }
    })
  }, [cleanQuery, budgets, allRequests])

  const matchedRequests = useMemo(() => {
    if (!cleanQuery || cleanQuery.length < 2) return []
    return allRequests.filter((r) =>
      r.title.toLowerCase().includes(cleanQuery) ||
      r.id.toLowerCase().includes(cleanQuery) ||
      r.requester.toLowerCase().includes(cleanQuery) ||
      r.department.toLowerCase().includes(cleanQuery)
    ).slice(0, 4)
  }, [cleanQuery, allRequests])

  const matchedVendors = useMemo(() => {
    if (!cleanQuery || cleanQuery.length < 2) return []
    const map = new Map<string, { totalSpend: number; count: number }>()
    payments.forEach((p) => {
      if (p.vendor.toLowerCase().includes(cleanQuery)) {
        const existing = map.get(p.vendor) || { totalSpend: 0, count: 0 }
        map.set(p.vendor, {
          totalSpend: existing.totalSpend + p.amount,
          count: existing.count + 1,
        })
      }
    })
    return Array.from(map.entries()).map(([vendor, stats]) => ({
      vendor,
      totalSpend: stats.totalSpend,
      count: stats.count,
    })).slice(0, 3)
  }, [cleanQuery, payments])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (matchedDepartments.length > 0) {
        const dept = matchedDepartments[0]
        setSearchOpen(false)
        if (currentRole === 'FINANCE') {
          navigate(`/portal/finance/financial-reports?dept=${encodeURIComponent(dept.id)}`)
        } else {
          navigate(`/portal/manager/total-requests?dept=${encodeURIComponent(dept.id)}`)
        }
      } else if (matchedRequests.length > 0) {
        const req = matchedRequests[0]
        setSearchOpen(false)
        if (currentRole === 'FINANCE') {
          navigate(`/portal/finance/purchase-requests?search=${encodeURIComponent(req.id)}`)
        } else {
          navigate(`/portal/manager/total-requests?search=${encodeURIComponent(req.id)}`)
        }
      }
    } else if (e.key === 'Escape') {
      setSearchOpen(false)
    }
  }

  // Navigation helpers from dropdown
  const handleSelectDepartment = (deptId: string, target: 'reports' | 'budgets' | 'requests') => {
    setSearchOpen(false)
    if (target === 'reports') {
      navigate(`/portal/finance/financial-reports?dept=${encodeURIComponent(deptId)}`)
    } else if (target === 'budgets') {
      if (currentRole === 'FINANCE') {
        navigate(`/portal/finance/budget?dept=${encodeURIComponent(deptId)}`)
      } else {
        navigate(`/portal/manager/budgets?dept=${encodeURIComponent(deptId)}`)
      }
    } else {
      if (currentRole === 'FINANCE') {
        navigate(`/portal/finance/purchase-requests?dept=${encodeURIComponent(deptId)}`)
      } else {
        navigate(`/portal/manager/total-requests?dept=${encodeURIComponent(deptId)}`)
      }
    }
  }

  // Get user details
  const firstName = user?.first_name || (currentRole === 'ADMIN' ? 'Priyanka' : 'Sachin')
  const lastName = user?.last_name || (currentRole === 'ADMIN' ? 'Sharma' : (user?.first_name ? '' : 'Kumar'))
  const initials = `${firstName[0] || 'P'}${lastName[0] || 'S'}`.toUpperCase()
  const roleDisplay = currentRole.replace('_', ' ').toLowerCase()

  return (
    <div className="fixed inset-0 w-screen h-screen flex bg-[#F8FAFC] overflow-hidden font-sans select-text">
      {/* Fixed Full-Height Role Sidebar */}
      <Sidebar role={currentRole} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar — Seamless, Clean, Perfectly Aligned, Stationary */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 z-20 flex-shrink-0">
          {/* Left: Global Search with real-time department intelligence */}
          <div className="flex items-center gap-3.5">
            <div className="relative w-80 lg:w-96" ref={searchContainerRef}>
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search requests, IT department, vendors, products..."
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSearchOpen(true)
                }}
                onKeyDown={handleKeyDown}
                className="w-full h-9 pl-9 pr-8 bg-[#F1F5F9] hover:bg-slate-200/60 focus:bg-white rounded-lg border-0 text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-indigo-300 outline-none transition-all shadow-2xs"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSearchOpen(false)
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={13} />
                </button>
              )}

              {/* Real-time Global Search Dropdown Popover */}
              {searchOpen && cleanQuery && (
                <div className="absolute left-0 top-full mt-2 w-[520px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-3 px-4 z-50 animate-scaleUp text-xs space-y-3.5 max-h-[80vh] overflow-y-auto">
                  {/* Department Results Section */}
                  {matchedDepartments.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                          <Building size={11} /> Department Directory Match
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Press Enter for Financial Report</span>
                      </div>

                      <div className="space-y-2">
                        {matchedDepartments.map((dept) => (
                          <div
                            key={dept.id}
                            className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2.5">
                              <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                  {dept.name}
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-normal">
                                    {dept.id}
                                  </span>
                                </h4>
                                <p className="text-[11px] text-slate-300 mt-0.5">
                                  Cost Centers: {dept.costCenters}
                                </p>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Burn Pace: {dept.pace}%
                              </span>
                            </div>

                            {/* 3-Col Department Financial Snapshot */}
                            <div className="grid grid-cols-3 gap-2 bg-white/10 rounded-lg p-2.5 text-center border border-white/5 my-2.5">
                              <div>
                                <span className="text-[9px] text-indigo-200 uppercase font-bold block">Total Budget</span>
                                <span className="text-xs font-bold text-white font-mono">{fmt(dept.totalBudget)}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-blue-200 uppercase font-bold block">Spent</span>
                                <span className="text-xs font-bold text-blue-300 font-mono">{fmt(dept.spent)}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-emerald-200 uppercase font-bold block">Available</span>
                                <span className="text-xs font-bold text-emerald-400 font-mono">{fmt(dept.available)}</span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10 text-[11px]">
                              <button
                                onClick={() => handleSelectDepartment(dept.id, 'reports')}
                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow-xs cursor-pointer"
                              >
                                <span>Financial Reports</span>
                                <ArrowRight size={12} />
                              </button>
                              <button
                                onClick={() => handleSelectDepartment(dept.id, 'budgets')}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg font-medium transition-all cursor-pointer"
                              >
                                <span>Budget Ledger</span>
                              </button>
                              <button
                                onClick={() => handleSelectDepartment(dept.id, 'requests')}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg font-medium transition-all cursor-pointer"
                              >
                                <span>Requests ({dept.reqCount})</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Requests Results */}
                  {matchedRequests.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Procurement Requisitions ({matchedRequests.length})
                      </span>
                      <div className="divide-y divide-slate-100">
                        {matchedRequests.map((r) => (
                          <div
                            key={r.id}
                            onClick={() => {
                              setSearchOpen(false)
                              if (currentRole === 'FINANCE') {
                                navigate(`/portal/finance/purchase-requests?search=${encodeURIComponent(r.id)}`)
                              } else {
                                navigate(`/portal/manager/total-requests?search=${encodeURIComponent(r.id)}`)
                              }
                            }}
                            className="py-2 px-2 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center justify-between group transition-colors"
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="font-mono text-[10px] font-bold text-indigo-600">{r.id}</span>
                                <span className="text-[10px] text-slate-400">•</span>
                                <span className="text-[10px] font-semibold text-slate-600">{r.department}</span>
                              </div>
                              <p className="font-bold text-slate-800 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                {r.title}
                              </p>
                              <p className="text-[10px] text-slate-400">By {r.requester}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold text-slate-900 block">{fmt(r.amount)}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-semibold">
                                {r.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vendors Results */}
                  {matchedVendors.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Matched Vendors
                      </span>
                      <div className="space-y-1">
                        {matchedVendors.map((v) => (
                          <div
                            key={v.vendor}
                            onClick={() => {
                              setSearchOpen(false)
                              navigate(`/portal/finance/financial-reports?dept=ALL`)
                            }}
                            className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <p className="font-bold text-slate-900">{v.vendor}</p>
                              <p className="text-[10px] text-slate-400">{v.count} Audited Settlements</p>
                            </div>
                            <span className="font-mono font-bold text-indigo-600">{fmt(v.totalSpend)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {matchedDepartments.length === 0 && matchedRequests.length === 0 && matchedVendors.length === 0 && (
                    <div className="py-6 text-center text-slate-500">
                      <p className="font-medium text-xs">No direct match found for "{searchQuery}"</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Try searching for <span className="font-bold text-indigo-600">"IT department"</span>, <span className="font-bold text-indigo-600">"Operations"</span>, or vendor name.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

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

                  {/* Switch Portal */}
                  <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Switch Portal
                    </label>
                    <select
                      value={currentRole}
                      onChange={handleRoleChange}
                      className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none cursor-pointer"
                    >
                      <option value="TEAM_LEAD">Team Lead Portal</option>
                      <option value="MANAGER">Manager Portal</option>
                      <option value="FINANCE">Finance Portal</option>
                      <option value="ADMIN">Admin Portal</option>
                      <option value="VENDOR">Vendor Portal</option>
                    </select>
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
