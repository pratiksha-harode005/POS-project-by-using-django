import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  PlusCircle,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Truck,
  Award,
  AlertTriangle,
  Bell,
  ArrowRight,
  CreditCard,
  ListFilter,
  Tag,
  Wallet,
  RefreshCw,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useProcurement } from '../../context/ProcurementContext'
import { useAuth } from '../../context/AuthContext'
import { getNotifications, markNotificationRead, BackendNotification } from '../../api/notificationApi'
import { formatDate } from '../../utils/formatDate'

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b',
  Approved: '#6366f1',
  Rejected: '#ef4444',
  Returned: '#f97316',
  'In Procurement': '#a855f7',
  Completed: '#22c55e',
  Draft: '#94a3b8',
}

export const TeamLeadDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const { requests, notifications: contextNotifications } = useProcurement()
  const [liveNotifications, setLiveNotifications] = useState<any[]>([])

  const fetchLiveNotifications = useCallback(async () => {
    try {
      const activeRole = (role || 'TEAM_LEAD').toUpperCase()
      let params: { role?: string; user?: string } = { role: activeRole }
      if (user?.username) {
        params = { user: user.username, role: activeRole }
      }
      const data: BackendNotification[] = await getNotifications(params)
      if (Array.isArray(data) && data.length > 0) {
        setLiveNotifications(
          data.map((n) => ({
            id: n.id,
            title: n.title || 'System Notification',
            message: n.message || '',
            timestamp: n.timestamp || 'Just now',
            isRead: n.is_read !== undefined ? Boolean(n.is_read) : Boolean(n.isRead),
            requestId: n.request_id || n.requestId || (n.purchase_request ? `REQ-${n.purchase_request}` : undefined),
            category: n.category || 'Approval',
            targetRole: activeRole,
          }))
        )
      }
    } catch (err) {
      console.warn('Failed to fetch live notifications for TeamLeadDashboard:', err)
    }
  }, [user?.username, role])

  useEffect(() => {
    fetchLiveNotifications()
    const handleUpdate = () => fetchLiveNotifications()
    window.addEventListener('kss_backend_updated', handleUpdate)
    window.addEventListener('focus', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    const interval = setInterval(fetchLiveNotifications, 3000)
    return () => {
      window.removeEventListener('kss_backend_updated', handleUpdate)
      window.removeEventListener('focus', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
      clearInterval(interval)
    }
  }, [fetchLiveNotifications])

  const returnedRequests = requests.filter((r) => r.status === 'Returned')
  const returnedCount = returnedRequests.length

  const pendingCount = requests.filter((r) => r.status === 'Pending').length
  const approvedCount = requests.filter((r) => r.status === 'Approved').length
  const rejectedCount = requests.filter((r) => r.status === 'Rejected').length
  const inProcurementCount = requests.filter((r) => r.status === 'In Procurement').length
  const completedCount = requests.filter((r) => r.status === 'Completed').length
  const totalCount = requests.length

  const handleQuickCreate = (category?: string, subcategory?: string) => {
    if (category) {
      navigate('/portal/team_lead/create-request', {
        state: { category, subcategory },
      })
    } else {
      navigate('/portal/team_lead/create-request')
    }
  }

  const cards = [
    { label: 'Total Requests', count: totalCount, icon: FileText, bg: 'bg-blue-50 text-blue-600 border border-blue-200', statusFilter: 'All' },
    { label: 'Pending Requests', count: pendingCount, icon: Clock, bg: 'bg-amber-50 text-amber-600 border border-amber-200', statusFilter: 'Pending' },
    { label: 'Approval Requests', count: approvedCount, icon: CheckCircle, bg: 'bg-indigo-50 text-indigo-600 border border-indigo-200', statusFilter: 'Approved' },
    { label: 'Rejected Requests', count: rejectedCount, icon: XCircle, bg: 'bg-rose-50 text-rose-600 border border-rose-200', statusFilter: 'Rejected' },
    { label: 'Returned Requests', count: returnedCount, icon: RotateCcw, bg: 'bg-amber-50 text-amber-700 border border-amber-300', statusFilter: 'Returned' },
    { label: 'In Procurement', count: inProcurementCount, icon: Truck, bg: 'bg-purple-50 text-purple-600 border border-purple-200', statusFilter: 'In Procurement' },
    { label: 'Completed', count: completedCount, icon: Award, bg: 'bg-emerald-50 text-emerald-600 border border-emerald-200', statusFilter: 'Completed' },
  ]

  const chartData = [
    { name: 'Pending', value: pendingCount, color: STATUS_COLORS.Pending },
    { name: 'Approved', value: approvedCount, color: STATUS_COLORS.Approved },
    { name: 'In Procurement', value: inProcurementCount, color: STATUS_COLORS['In Procurement'] },
    { name: 'Completed', value: completedCount, color: STATUS_COLORS.Completed },
    { name: 'Returned', value: returnedCount, color: STATUS_COLORS.Returned },
    { name: 'Rejected', value: rejectedCount, color: STATUS_COLORS.Rejected },
  ].filter((d) => d.value > 0)

  const recentRequests = requests.slice(0, 5)

  // Role-aware notifications for Team Lead with fallback
  const recentNotifications = (
    liveNotifications.length > 0
      ? liveNotifications
      : contextNotifications.filter((n) => n.targetRole === 'TEAM_LEAD' || !n.targetRole)
  ).slice(0, 5)

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      setLiveNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      )
      try {
        await markNotificationRead(notif.id)
      } catch (err) {
        console.warn('Failed to mark notification read:', err)
      }
    }
    navigate('/portal/team_lead/notifications', {
      state: {
        selectedNotificationId: notif.id,
        requestId: notif.requestId,
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Team Lead Dashboard
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Create procurement requests, track approvals & real-time delivery timelines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/portal/team_lead/create-request')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={16} /> Create Request
          </button>
        </div>
      </div>

      {/* "Needs your attention" Banner - Shown ONLY when returnedCount >= 1 */}
      {returnedCount > 0 && (
        <div className="bg-amber-50 p-4 rounded-2xl shadow-xs flex items-center justify-between gap-4 border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={22} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-950">Action Required: {returnedCount} Returned Request(s)</h2>
              <p className="text-xs text-amber-800 mt-0.5">
                {returnedCount === 1
                  ? 'Request REQ-DEMO-003 requires specification updates before resubmission.'
                  : `${returnedCount} requests have been returned for revision by your Approving Manager.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/portal/team_lead/my-requests', { state: { filterStatus: 'Returned' } })}
            className="bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-amber-700 transition-colors flex items-center gap-1.5 flex-shrink-0 shadow-xs cursor-pointer"
          >
            <RotateCcw size={14} /> Edit & Resubmit
          </button>
        </div>
      )}

      {/* 7 Stat Cards Grid - Fully Clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div
              key={c.label}
              onClick={() => navigate('/portal/team_lead/my-requests', { state: { filterStatus: c.statusFilter } })}
              className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all hover:-translate-y-0.5"
              title={`Click to view ${c.label}`}
            >
              <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-gray-900 leading-none">{c.count}</p>
                <p className="text-[10px] font-medium text-gray-500 truncate mt-0.5">{c.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Banner (Quick Create Widget) & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Banner / Quick Create Widget */}
        <div className="lg:col-span-2 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Quick Create
            </span>
            <h2 className="text-xl font-extrabold text-white mt-3 leading-snug">
              You've submitted {totalCount} requests this quarter — {pendingCount} pending
            </h2>

            {/* 4 Shortcut buttons */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickCreate('IT Hardware', 'Laptops')}
                className="bg-white text-blue-900 hover:bg-blue-50 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <span>💻 Request laptop</span>
                <ArrowRight size={13} className="text-blue-600 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => handleQuickCreate('Software & SaaS', 'Software License')}
                className="bg-white text-blue-900 hover:bg-blue-50 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <span>🔑 Request software license</span>
                <ArrowRight size={13} className="text-blue-600 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => handleQuickCreate('Office Technology', 'Office Equipment')}
                className="bg-white text-blue-900 hover:bg-blue-50 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <span>🖥️ Request office equipment</span>
                <ArrowRight size={13} className="text-blue-600 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => handleQuickCreate()}
                className="bg-white text-blue-900 hover:bg-blue-50 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <span>✨ Something else</span>
                <ArrowRight size={13} className="text-blue-600 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/portal/team_lead/create-request')}
              className="bg-white text-blue-700 px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-50 transition-colors shadow-sm cursor-pointer"
            >
              Create New Request
            </button>
            <button
              type="button"
              onClick={() => navigate('/portal/team_lead/my-requests')}
              className="text-white hover:text-blue-100 text-xs font-semibold px-4 py-2.5 flex items-center gap-1 cursor-pointer"
            >
              View Active Workflow <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Donut Chart Widget */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Requests Breakdown</h3>
            <span className="text-[10px] font-semibold text-gray-500">{totalCount} Total</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} Request(s)`, name]}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-1 text-[10px] pt-2 border-t border-gray-100">
            {chartData.map((d) => (
              <div key={d.name} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-gray-600 truncate">{d.name}: <strong>{d.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Requests & Recent Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Recent Requests ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" /> Recent Requests
            </h3>
            <button
              type="button"
              onClick={() => navigate('/portal/team_lead/my-requests')}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              View all →
            </button>
          </div>

          <div className="px-4 py-3 space-y-2 flex-1">
            {recentRequests.map((req) => {
              const borderColor =
                req.status === 'Pending' ? 'border-l-blue-500'
                : req.status === 'In Procurement' ? 'border-l-purple-500'
                : req.status === 'Completed' ? 'border-l-green-500'
                : req.status === 'Returned' ? 'border-l-amber-500'
                : req.status === 'Rejected' ? 'border-l-red-500'
                : 'border-l-gray-300'

              const catColor =
                req.category === 'IT Hardware' ? 'bg-blue-50 text-blue-700 border-blue-200'
                : req.category === 'Software & SaaS' || req.category === 'Cloud & Infrastructure' ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : req.category === 'Office Accessories' ? 'bg-orange-50 text-orange-700 border-orange-200'
                : req.category === 'Cybersecurity' ? 'bg-red-50 text-red-700 border-red-200'
                : req.category === 'Networking & Telecom' ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                : 'bg-gray-50 text-gray-600 border-gray-200'

              const statusPill =
                req.status === 'Completed' ? 'bg-green-100 text-green-800'
                : req.status === 'Rejected' ? 'bg-red-100 text-red-800'
                : req.status === 'Returned' ? 'bg-amber-100 text-amber-800'
                : req.status === 'In Procurement' ? 'bg-purple-100 text-purple-800'
                : req.status === 'Draft' ? 'bg-gray-100 text-gray-600'
                : 'bg-blue-100 text-blue-800'

              return (
                <div
                  key={req.id}
                  onClick={() => navigate('/portal/team_lead/my-requests')}
                  className={`pl-3 pr-3 py-2.5 bg-gray-50/70 hover:bg-white rounded-xl border border-gray-200 border-l-4 ${borderColor} transition-all flex items-center justify-between gap-3 cursor-pointer`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {req.id}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${catColor}`}>
                        {req.category}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">{formatDate(req.lastUpdated)}</span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-900 truncate leading-snug">
                      {req.title?.trim() || (req.status === 'Draft' ? '📝 Untitled draft' : '—')}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Est. Cost: <strong className="text-gray-800">RS {req.estimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${statusPill}`}>
                    {req.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Recent Notifications ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Bell size={16} className="text-blue-600" /> Recent Notifications
              </h3>
              {recentNotifications.filter(n => !n.isRead).length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                  {recentNotifications.filter(n => !n.isRead).length} New
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate('/portal/team_lead/notifications')}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              View all →
            </button>
          </div>

          <div className="px-4 py-3 space-y-2 flex-1">
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center h-48">
                <CheckCircle size={28} className="text-emerald-500 opacity-80 mb-2" />
                <p className="font-bold text-gray-700">No notifications right now</p>
                <p className="text-[11px] text-gray-400 mt-0.5">You are completely up to date!</p>
              </div>
            ) : (
              recentNotifications.map((notif) => {
                const displayTitle =
                  notif.title.includes('Approval Required')
                    ? `Your request ${notif.requestId || ''} is now awaiting Manager approval.`
                    : notif.title

                const iconCfg: Record<string, { icon: React.ReactNode; bg: string; ring: string }> = {
                  'Approvals': { icon: <CheckCircle size={14} />, bg: 'bg-blue-600', ring: 'ring-2 ring-blue-200' },
                  'Approval': { icon: <CheckCircle size={14} />, bg: 'bg-blue-600', ring: 'ring-2 ring-blue-200' },
                  'Vendor activity': { icon: <Tag size={14} />, bg: 'bg-purple-600', ring: 'ring-2 ring-purple-200' },
                  'RFQ': { icon: <Tag size={14} />, bg: 'bg-purple-600', ring: 'ring-2 ring-purple-200' },
                  'Payments': { icon: <Wallet size={14} />, bg: 'bg-emerald-600', ring: 'ring-2 ring-emerald-200' },
                  'Payment': { icon: <Wallet size={14} />, bg: 'bg-emerald-600', ring: 'ring-2 ring-emerald-200' },
                  'Status updates': { icon: <RefreshCw size={14} />, bg: 'bg-amber-600', ring: 'ring-2 ring-amber-200' },
                  'Logistics': { icon: <Truck size={14} />, bg: 'bg-cyan-600', ring: 'ring-2 ring-cyan-200' },
                  'Budget': { icon: <Wallet size={14} />, bg: 'bg-indigo-600', ring: 'ring-2 ring-indigo-200' },
                  'Compliance': { icon: <AlertTriangle size={14} />, bg: 'bg-rose-600', ring: 'ring-2 ring-rose-200' },
                }
                const cfg = iconCfg[notif.category] || iconCfg[notif.type] || { icon: <Bell size={14} />, bg: 'bg-blue-500', ring: 'ring-2 ring-blue-100' }

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`px-3 py-2.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                      notif.isRead
                        ? 'bg-white hover:bg-gray-50 border-gray-200'
                        : 'bg-blue-50/40 hover:bg-blue-50/70 border-blue-200 shadow-2xs'
                    }`}
                  >
                    <div className={`relative w-8 h-8 rounded-full ${cfg.bg} text-white flex items-center justify-center flex-shrink-0 mt-0.5 ${!notif.isRead ? cfg.ring : ''}`}>
                      {cfg.icon}
                      {!notif.isRead && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {notif.category && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 flex-shrink-0">
                              {notif.category}
                            </span>
                          )}
                          <h4 className={`text-xs truncate leading-snug ${notif.isRead ? 'font-semibold text-gray-700' : 'font-bold text-gray-900'}`}>
                            {displayTitle}
                          </h4>
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 font-medium">{notif.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{notif.message}</p>
                      {notif.requestId && (
                        <div className="mt-1">
                          <span className="inline-block text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            {notif.requestId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
