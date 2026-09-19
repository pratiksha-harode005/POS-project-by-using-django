import React, { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CheckSquare, CheckCircle, XCircle, ArrowUpRight, Search,
  Clock, FileText, Calendar, AlertTriangle, Eye, Layers
} from 'lucide-react'
import { useManagerData } from '../../context/ManagerDataContext'
import { useActivity, UnreadBadge } from '../../context/ActivityContext'
import { ActionModal, ModalActionType } from '../../components/portal/ActionModal'
import { RequestApprovalModal } from '../../components/portal/RequestApprovalModal'
import { RequestDetailsModal } from '../../components/portal/RequestDetailsModal'
import type { ProcurementRequest, ApprovalParameters } from '../../context/ManagerDataContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

const PAGE_SIZE = 8

export interface PendingApprovalsPageProps {
  initialTab?: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
}

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

export const PendingApprovalsPage: React.FC<PendingApprovalsPageProps> = ({ initialTab }) => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    pendingApprovals,
    myApprovals,
    rejectedRequests,
    approveRequest,
    rejectRequest,
    recommendToFinance
  } = useManagerData()

  const { isUnread, markAsRead } = useActivity()

  // Determine active tab from URL param or initial prop or default to PENDING
  const tabFromUrl = searchParams.get('tab')?.toUpperCase()
  const initial = (tabFromUrl === 'ALL' || tabFromUrl === 'PENDING' || tabFromUrl === 'APPROVED' || tabFromUrl === 'REJECTED')
    ? (tabFromUrl as FilterStatus)
    : initialTab || 'PENDING'

  const [statusFilter, setStatusFilter] = useState<FilterStatus>(initial)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [activeReq, setActiveReq] = useState<ProcurementRequest | null>(null)
  const [modalAction, setModalAction] = useState<ModalActionType | null>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [viewingRequest, setViewingRequest] = useState<ProcurementRequest | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleTabChange = (tab: FilterStatus) => {
    setStatusFilter(tab)
    setPage(1)
    setSearchParams(prev => {
      prev.set('tab', tab.toLowerCase())
      return prev
    }, { replace: true })
  }

  const pendingUnreadCount = useMemo(() => {
    return pendingApprovals.filter(r => isUnread(r.id)).length
  }, [pendingApprovals, isUnread])

  // Combine all requests safely without duplicates
  const allRequests = useMemo(() => {
    const map = new Map<string, ProcurementRequest>()
    pendingApprovals.forEach(r => map.set(r.id, r))
    myApprovals.forEach(r => map.set(r.id, r))
    rejectedRequests.forEach(r => map.set(r.id, r))
    return Array.from(map.values())
  }, [pendingApprovals, myApprovals, rejectedRequests])

  // Active pool based on tab
  const activeList = useMemo(() => {
    if (statusFilter === 'ALL') return allRequests
    if (statusFilter === 'PENDING') return pendingApprovals
    if (statusFilter === 'APPROVED') return myApprovals
    if (statusFilter === 'REJECTED') return rejectedRequests
    return allRequests
  }, [statusFilter, allRequests, pendingApprovals, myApprovals, rejectedRequests])

  // Filter options
  const departments = useMemo(() => {
    return ['All', ...Array.from(new Set(activeList.map(r => r.department)))]
  }, [activeList])
  const priorities = ['All', 'Critical', 'High', 'Medium', 'Low']

  // Search and dropdown filtered
  const filtered = useMemo(() => {
    return activeList.filter(r => {
      const matchSearch =
        !search ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.requester.toLowerCase().includes(search.toLowerCase())
      const matchDept = deptFilter === 'All' || r.department === deptFilter
      const matchPriority = priorityFilter === 'All' || r.priority === priorityFilter
      return matchSearch && matchDept && matchPriority
    })
  }, [activeList, search, deptFilter, priorityFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openModal = (req: ProcurementRequest, action: ModalActionType) => {
    markAsRead(req.id)
    setActiveReq(req)
    setModalAction(action)
  }

  const handleOpenViewDetails = (req: ProcurementRequest) => {
    markAsRead(req.id)
    setViewingRequest(req)
  }

  const openApprovalModal = (req: ProcurementRequest) => {
    markAsRead(req.id)
    setActiveReq(req)
    setShowApprovalModal(true)
  }

  const handleConfirmApproval = (params: ApprovalParameters) => {
    if (!activeReq) return
    approveRequest(activeReq.id, params.approvalComments, params)
    showToast(`✓ Request ${activeReq.id} approved successfully! Forwarded for procurement.`, 'success')
    setActiveReq(null)
    setShowApprovalModal(false)
  }

  const handleConfirm = (data: { action: ModalActionType; reason?: string; notes?: string }) => {
    if (!activeReq) return
    if (data.action === 'APPROVE') {
      approveRequest(activeReq.id, data.notes)
      showToast(`✓ Request ${activeReq.id} approved successfully! Forwarded for procurement.`, 'success')
    } else if (data.action === 'REJECT') {
      rejectRequest(activeReq.id, data.reason || '', data.notes)
      showToast(`✕ Request ${activeReq.id} rejected. Audit recorded.`, 'error')
    } else if (data.action === 'RECOMMEND') {
      recommendToFinance(activeReq.id, data.reason || '')
      showToast(`↑ Request ${activeReq.id} recommended to Finance.`, 'info')
    }
    setActiveReq(null)
    setModalAction(null)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 text-white animate-fadeIn ${
            toast.type === 'success'
              ? 'bg-emerald-600'
              : toast.type === 'error'
              ? 'bg-rose-600'
              : 'bg-purple-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              MANAGER APPROVAL
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {statusFilter === 'ALL' && `${allRequests.length} Total Purchase Requests`}
              {statusFilter === 'PENDING' && `${pendingApprovals.length} Requests Awaiting Sign-off`}
              {statusFilter === 'APPROVED' && `${myApprovals.length} Approved Requests`}
              {statusFilter === 'REJECTED' && `${rejectedRequests.length} Disapproved Requests`}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <CheckSquare className="text-purple-600" size={26} /> Manager Approval
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review incoming purchase requests, grant manager sign-off, record rejection rationale, or recommend to Finance.
          </p>
        </div>

        {/* Status Filters: All Requests, Pending, Approval, Rejection */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200">
          <button
            onClick={() => handleTabChange('ALL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Layers size={14} />
            <span>All Requests</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                statusFilter === 'ALL'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {allRequests.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('PENDING')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Clock size={14} />
            <span>Pending</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {pendingApprovals.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('APPROVED')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <CheckCircle size={14} />
            <span>Approval</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                statusFilter === 'APPROVED'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {myApprovals.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('REJECTED')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <XCircle size={14} />
            <span>Rejection</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                statusFilter === 'REJECTED'
                  ? 'bg-rose-700 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {rejectedRequests.length}
            </span>
          </button>
        </div>
      </div>

      {/* Search & Secondary Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by ID, title, requester or department…"
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => { setDeptFilter(e.target.value); setPage(1) }}
          className="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none bg-white text-slate-700"
        >
          {departments.map(d => <option key={d}>{d}</option>)}
        </select>
        <select
          value={priorityFilter}
          onChange={e => { setPriorityFilter(e.target.value); setPage(1) }}
          className="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none bg-white text-slate-700"
        >
          {priorities.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {paged.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-2xs">
            {statusFilter === 'ALL' && (
              <>
                <FileText size={48} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-base font-bold text-slate-800">No Purchase Requests Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  No purchase requisitions matching your search or department filter were found.
                </p>
              </>
            )}
            {statusFilter === 'PENDING' && (
              <>
                <CheckCircle size={48} className="mx-auto mb-3 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-800">All Manager Approvals Cleared</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  No requests currently require your sign-off. Incoming requisitions from team members will appear here in real time.
                </p>
              </>
            )}
            {statusFilter === 'APPROVED' && (
              <>
                <FileText size={48} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-base font-bold text-slate-800">No Approved Requests Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Requisitions approved by you will be archived here with tracking status.
                </p>
              </>
            )}
            {statusFilter === 'REJECTED' && (
              <>
                <CheckCircle size={48} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-base font-bold text-slate-800">No Rejected Requests Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  No purchase requests have been disapproved.
                </p>
              </>
            )}
          </div>
        ) : (
          paged.map((req) => {
            const isApproved = statusFilter === 'APPROVED' || req.status === 'approved' || req.status === 'finance_approved'
            const isRejected = statusFilter === 'REJECTED' || req.status === 'rejected' || req.status === 'finance_rejected'
            const isPending = !isApproved && !isRejected
            const isNew = isUnread(req.id) && (statusFilter === 'PENDING' || isPending)

            return (
              <div
                key={req.id}
                onClick={() => isNew && markAsRead(req.id)}
                className={`rounded-2xl border p-6 transition-all space-y-4 ${
                  isNew
                    ? 'bg-blue-50/30 border-l-4 border-l-blue-600 border-slate-300 shadow-md'
                    : 'bg-white border-slate-300/80 shadow-xs hover:border-indigo-400 hover:shadow-md'
                }`}
              >
                {/* Top Row: Meta Tags & Title & Cost */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                        {req.id}
                      </span>
                      <UnreadBadge isUnread={isNew} />
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-md border shadow-2xs ${
                          req.priority === 'Critical'
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : req.priority === 'High'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : req.priority === 'Medium'
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        {req.priority} Priority
                      </span>

                      {isApproved ? (
                        <span className="text-[10px] font-black text-emerald-900 bg-emerald-100 px-3 py-0.5 rounded-full border border-emerald-300 shadow-2xs flex items-center gap-1">
                          <CheckCircle size={11} /> Manager Approved
                        </span>
                      ) : isRejected ? (
                        <span className="text-[10px] font-black text-rose-900 bg-rose-100 px-3 py-0.5 rounded-full border border-rose-300 shadow-2xs flex items-center gap-1">
                          <XCircle size={11} /> Manager Rejected
                        </span>
                      ) : req.status === 'recommended_to_finance' ? (
                        <span className="text-[10px] font-black text-blue-900 bg-blue-100 px-3 py-0.5 rounded-full border border-blue-300 shadow-2xs flex items-center gap-1">
                          <ArrowUpRight size={11} /> Recommended to Finance
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-amber-900 bg-amber-100 px-3 py-0.5 rounded-full border border-amber-300 shadow-2xs flex items-center gap-1">
                          <Clock size={11} /> Pending Manager Review
                        </span>
                      )}

                      {req.approvalLevel && (
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {req.approvalLevel}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{req.title}</h3>
                    <p className="text-xs text-slate-600 font-medium">
                      Requester: <b className="text-slate-950 font-bold">{req.requester}</b> • Department:{' '}
                      <b className="text-slate-950 font-bold">{req.department}</b> • Category:{' '}
                      <b className="text-slate-950 font-bold">{req.category}</b> • Date:{' '}
                      <b className="text-indigo-900 font-bold">{req.date}</b>
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0 bg-slate-50 border border-slate-200 p-3 sm:py-2.5 sm:px-4 rounded-xl shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">
                      Requested Amount
                    </span>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">{fmt(req.amount)}</p>
                  </div>
                </div>

                {/* Justification if present */}
                {req.justification && (
                  <p className="text-xs text-purple-950 bg-purple-50/80 p-3 rounded-xl border border-purple-200 font-medium shadow-2xs">
                    <span className="font-extrabold text-purple-950">Business Justification:</span> {req.justification}
                  </p>
                )}

                {/* Approved Banner */}
                {isApproved && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-950 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                        <CheckCircle size={18} />
                      </div>
                      <div>
                        <span className="font-black text-emerald-950">Requisition Approved by Manager</span>
                        <p className="text-[11px] text-emerald-800 font-medium">
                          Authorized spend released for PO generation and finance verification.
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-200 text-emerald-950 text-[10px] font-black uppercase tracking-wide border border-emerald-300">
                      Approved
                    </span>
                  </div>
                )}

                {/* Rejected Banner */}
                {isRejected && (
                  <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-950 shadow-2xs">
                    <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <XCircle size={18} />
                    </div>
                    <div>
                      <span className="font-black text-rose-950">Disapproval Record</span>
                      <p className="text-[11px] text-rose-900 font-semibold mt-0.5">
                        Reason: {req.rejectionReason || 'Not aligned with department priorities'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Row — Matches Image 2 reference */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleOpenViewDetails(req)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl border border-purple-300 shadow-2xs transition-all cursor-pointer"
                    >
                      <Eye size={14} className="text-purple-600" /> View Request Details
                    </button>
                    <button
                      onClick={() => navigate(`/portal/manager/request-details?id=${req.id}`)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      <FileText size={14} className="text-slate-500" /> Stepper Tracking
                    </button>
                  </div>

                  {(statusFilter === 'PENDING' || (statusFilter === 'ALL' && isPending)) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleOpenViewDetails(req)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                      >
                        <Eye size={14} /> View
                      </button>
                      <button
                        onClick={() => openApprovalModal(req)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button
                        onClick={() => openModal(req, 'REJECT')}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                      <button
                        onClick={() => openModal(req, 'RECOMMEND')}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                      >
                        <ArrowUpRight size={14} /> Recommend to Finance
                      </button>
                    </div>
                  )}

                  {(statusFilter === 'APPROVED' || (statusFilter === 'ALL' && isApproved)) && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <button
                        onClick={() => handleOpenViewDetails(req)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer"
                      >
                        <Eye size={13} /> View Request
                      </button>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <CheckCircle size={14} /> Manager Sign-Off Completed
                      </span>
                      {req.approvalParams && (
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          Approved: {fmt(req.approvalParams.approvedAmount)} • {req.approvalParams.costCenter}
                        </span>
                      )}
                    </div>
                  )}

                  {(statusFilter === 'REJECTED' || (statusFilter === 'ALL' && isRejected)) && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenViewDetails(req)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer"
                      >
                        <Eye size={13} /> View Request
                      </button>
                      <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <XCircle size={14} /> Disapproved & Archived
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>Page {page} of {totalPages} ({filtered.length} total)</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i))
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1.5 rounded-xl border font-medium ${
                    page === p
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Structured Request Approval Modal (10 Validation Parameters) */}
      <RequestApprovalModal
        isOpen={showApprovalModal}
        request={activeReq}
        onClose={() => {
          setShowApprovalModal(false)
          setActiveReq(null)
        }}
        onConfirm={handleConfirmApproval}
      />

      {/* Action Modal for Reject & Recommend */}
      <ActionModal
        isOpen={!!modalAction}
        actionType={modalAction}
        requestId={activeReq?.id || ''}
        requestTitle={activeReq?.title || ''}
        onClose={() => setModalAction(null)}
        onConfirm={handleConfirm}
      />

      {/* Complete Purchase Request Details Modal */}
      <RequestDetailsModal
        isOpen={!!viewingRequest}
        request={viewingRequest}
        onClose={() => setViewingRequest(null)}
        onApprove={(req) => {
          setViewingRequest(null)
          openApprovalModal(req)
        }}
        onReject={(req) => {
          setViewingRequest(null)
          openModal(req, 'REJECT')
        }}
        onRecommend={(req) => {
          setViewingRequest(null)
          openModal(req, 'RECOMMEND')
        }}
      />
    </div>
  )
}
