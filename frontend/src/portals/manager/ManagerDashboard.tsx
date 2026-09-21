import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle, XCircle, Landmark, IndianRupee,
  ArrowUpRight, Clock, AlertCircle, Check, X,
  ArrowRight, AlertTriangle
} from 'lucide-react'
import { useManagerData, ProcurementRequest } from '../../context/ManagerDataContext'
import { PaymentGraph } from '../../components/portal/PaymentGraph'

const fmt = (v: number) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`
  return `₹${v.toLocaleString('en-IN')}`
}

const REJECT_REASONS = [
  'Budget exceeded / unallocated department funds',
  'Insufficient technical specifications or documentation',
  'Duplicate purchase request',
  'Vendor quotation does not meet compliance standards',
  'Business justification missing or unclear',
]

const RECOMMEND_REASONS = [
  'High-value purchase — exceeds Manager sign-off threshold',
  'Capex budget reallocation required from Finance',
  'Non-standard vendor payment terms or contract terms',
  'Requires CFO / Finance Controller review',
  'Asset capitalization policy verification needed',
]

// Priority badge styles (Restrained, professional status system)
const priorityStyles: Record<string, { badge: string; dot: string }> = {
  Critical: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
    dot: 'bg-rose-600',
  },
  High: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
    dot: 'bg-amber-500',
  },
  Medium: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  Low: {
    badge: 'bg-slate-50 text-slate-600 border-slate-200/60',
    dot: 'bg-slate-300',
  },
}

type ModalType = 'reject' | 'recommend' | null

interface ActiveModalState {
  type: ModalType
  request: ProcurementRequest
  selectedReason: string
  notes: string
}

export const ManagerDashboard: React.FC = () => {
  const {
    dashboardStats,
    pendingApprovals,
    paymentData,
    rejectRequest,
    recommendToFinance,
    approveRequest,
  } = useManagerData()

  const [activeModal, setActiveModal] = useState<ActiveModalState | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'danger' | 'info' } | null>(null)

  const showToast = (message: string, type: 'success' | 'danger' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Handle Quick Approval from Pending table
  const handleQuickApprove = (req: ProcurementRequest) => {
    approveRequest(req.id, 'Direct approval from dashboard')
    showToast(`Request ${req.id} approved successfully`, 'success')
  }

  // Confirm Modal Actions
  const handleConfirmModal = () => {
    if (!activeModal || !activeModal.selectedReason) return

    if (activeModal.type === 'reject') {
      rejectRequest(activeModal.request.id, activeModal.selectedReason, activeModal.notes)
      showToast(`Request ${activeModal.request.id} rejected`, 'danger')
    } else if (activeModal.type === 'recommend') {
      recommendToFinance(activeModal.request.id, activeModal.selectedReason)
      showToast(`Request ${activeModal.request.id} recommended to Finance`, 'info')
    }

    setActiveModal(null)
  }

  // 5 KPI Cards configuration (Clean, restrained, white surface with subtle borders)
  const kpiCards = [
    {
      id: 'pending-approvals',
      label: 'Pending Approvals',
      count: dashboardStats.pendingApprovals,
      subtext: 'Awaiting your decision',
      badge: dashboardStats.pendingApprovals > 0 ? 'Requires Action' : 'All Clear',
      badgeColor: dashboardStats.pendingApprovals > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-600 bg-slate-100 border-slate-200',
      icon: Clock,
      path: '/portal/manager/pending-approvals?tab=pending',
    },
    {
      id: 'my-approvals',
      label: 'My Approvals',
      count: dashboardStats.myApprovals,
      subtext: 'Approved by you',
      badge: 'Processed',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      icon: CheckCircle,
      path: '/portal/manager/pending-approvals?tab=approved',
    },
    {
      id: 'rejected-requests',
      label: 'Rejected Requests',
      count: dashboardStats.rejectedRequests,
      subtext: 'This period',
      badge: 'Archived',
      badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
      icon: XCircle,
      path: '/portal/manager/pending-approvals?tab=rejected',
    },
    {
      id: 'finance-review',
      label: 'Finance Review',
      count: dashboardStats.financeReview,
      subtext: 'Awaiting finance action',
      badge: 'Escalated',
      badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      icon: Landmark,
      path: '/portal/manager/finance-review',
    },
    {
      id: 'total-request-value',
      label: 'Total Request Value',
      count: fmt(dashboardStats.totalRequestValue),
      subtext: 'Active requests',
      badge: 'Active Total',
      badgeColor: 'text-slate-700 bg-slate-100 border-slate-200',
      icon: IndianRupee,
      path: '/portal/manager/total-requests',
    },
  ]

  // Recent Activity Feed
  const recentActivities = [
    {
      id: 1,
      action: 'Approved request for 10x Engineering Laptops',
      ref: 'REQ-2026-001',
      actor: 'Sarah Manager',
      timestamp: '2 hours ago',
      type: 'approved',
    },
    {
      id: 2,
      action: 'Forwarded cloud renewal to Finance Review',
      ref: 'REQ-2026-012',
      actor: 'Sarah Manager',
      timestamp: 'Yesterday',
      type: 'finance',
    },
    {
      id: 3,
      action: 'Vendor purchase order PO-4582 generated',
      ref: 'PO-4582',
      actor: 'Procurement Desk',
      timestamp: 'Sep 10, 2026',
      type: 'po',
    },
    {
      id: 4,
      action: 'Rejected legacy server rack proposal',
      ref: 'REQ-2026-005',
      actor: 'Sarah Manager',
      timestamp: 'Sep 09, 2026',
      type: 'rejected',
    },
  ]

  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 animate-slideDown transition-all ${
            toast.type === 'success'
              ? 'bg-slate-900 text-white border-slate-800'
              : toast.type === 'danger'
              ? 'bg-rose-900 text-white border-rose-800'
              : 'bg-indigo-950 text-white border-indigo-900'
          }`}
        >
          {toast.type === 'success' ? (
            <Check size={16} className="text-emerald-400" />
          ) : toast.type === 'danger' ? (
            <X size={16} className="text-rose-400" />
          ) : (
            <AlertCircle size={16} className="text-indigo-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── 1. Page Header ── */}
      <div className="pb-2 border-b border-slate-200/60">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manager Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitor approvals, requests, finance activity and procurement performance.
        </p>
      </div>

      {/* ── 2. KPI Cards Row (5 Clean, Restrained Cards) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {kpiCards.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.id}
              to={c.path}
              className="group bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 group-hover:text-indigo-600 group-hover:border-indigo-100 group-hover:bg-indigo-50/50 transition-colors">
                    <Icon size={16} />
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.badgeColor}`}>
                    {c.badge}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{c.label}</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1 font-mono">{c.count}</p>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                <span className="text-slate-400">{c.subtext}</span>
                <ArrowUpRight size={13} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── 3. Centerpiece: Payment Analytics ── */}
      <PaymentGraph data={paymentData} />

      {/* ── 4. Main Two-Column Workflow Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns (66%): Pending Approvals Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Approvals Quick Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Pending Approvals</h2>
                <p className="text-xs text-slate-500">Requests requiring manager decision</p>
              </div>

              <Link
                to="/portal/manager/pending-approvals"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
              >
                View All ({pendingApprovals.length}) <ArrowRight size={12} />
              </Link>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <CheckCircle size={24} className="mx-auto mb-1.5 text-emerald-400 opacity-80" />
                <p className="font-semibold text-slate-700">No pending approvals</p>
                <p className="text-slate-400 text-[11px]">All assigned approval tasks are up to date.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100 text-[11px]">
                      <th className="px-4 py-2.5">Request ID</th>
                      <th className="px-4 py-2.5">Title</th>
                      <th className="px-4 py-2.5">Department</th>
                      <th className="px-4 py-2.5">Amount</th>
                      <th className="px-4 py-2.5">Priority</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingApprovals.slice(0, 6).map((req) => {
                      const pStyle = priorityStyles[req.priority] || priorityStyles.Medium

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">{req.id}</td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800 line-clamp-1 max-w-[200px]" title={req.title}>
                              {req.title}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">By {req.requester}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-medium">{req.department}</td>
                          <td className="px-4 py-3 font-bold text-slate-900 font-mono">{fmt(req.amount)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pStyle.badge}`}>
                              {req.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleQuickApprove(req)}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[11px] font-semibold transition-colors"
                            >
                              Approve
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column (33%): Recent Activity Feed */}
        <div className="space-y-6">

          {/* 4D. Recent Activity Audit Trail */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recent Activity</h2>
                <p className="text-xs text-slate-500">Live operational audit log</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Real-time listener active" />
            </div>

            <div className="space-y-4">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-medium leading-snug">
                      {act.action}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="font-mono text-slate-500">{act.ref}</span>
                      <span>•</span>
                      <span>{act.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Action Confirmation Modal (Reject & Recommend to Finance) ── */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeModal.type === 'reject'
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-indigo-50 text-indigo-600'
                  }`}
                >
                  {activeModal.type === 'reject' ? <XCircle size={18} /> : <Landmark size={18} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {activeModal.type === 'reject' ? 'Reject Purchase Request' : 'Recommend to Finance'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Request ID: <strong className="font-mono text-slate-800">{activeModal.request.id}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Request Overview snippet */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <p className="font-semibold text-slate-900 text-sm mb-1">{activeModal.request.title}</p>
                <div className="flex justify-between text-slate-500">
                  <span>Department: {activeModal.request.department}</span>
                  <span className="font-mono font-bold text-slate-900">{fmt(activeModal.request.amount)}</span>
                </div>
              </div>

              {/* Reason Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Select Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  value={activeModal.selectedReason}
                  onChange={(e) =>
                    setActiveModal((prev) => (prev ? { ...prev, selectedReason: e.target.value } : null))
                  }
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {(activeModal.type === 'reject' ? REJECT_REASONS : RECOMMEND_REASONS).map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide additional context or instructions..."
                  value={activeModal.notes}
                  onChange={(e) =>
                    setActiveModal((prev) => (prev ? { ...prev, notes: e.target.value } : null))
                  }
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Action notice */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-800 flex items-start gap-2 text-[11px]">
                <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  {activeModal.type === 'reject'
                    ? 'This action will reject the request and notify the requester with your reason.'
                    : 'This action will forward the request to Finance Review with your recommendation reason.'}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmModal}
                className={`px-4 py-2 text-white font-semibold rounded-lg shadow-sm transition-all ${
                  activeModal.type === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {activeModal.type === 'reject' ? 'Confirm Rejection' : 'Confirm Forward'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
