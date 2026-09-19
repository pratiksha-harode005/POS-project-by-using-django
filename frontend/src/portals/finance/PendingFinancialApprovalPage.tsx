import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, XCircle, Clock, AlertTriangle,
  FileText, ArrowRight, ShieldCheck, User, Building, Calendar,
  Paperclip, DollarSign, X, Check, ArrowUpRight, Eye, Layers
} from 'lucide-react'
import { useFinanceData, ProcurementRequest, ApprovalParameters } from '../../context/ManagerDataContext'
import { useActivity, UnreadBadge } from '../../context/ActivityContext'
import { RequestDetailsModal } from '../../components/portal/RequestDetailsModal'
import { RequestApprovalModal } from '../../components/portal/RequestApprovalModal'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

type ActionType = 'APPROVE' | 'REJECT' | 'HOLD' | 'RECOMMEND_ADMIN'

const REJECTION_REASONS = [
  'Budget Limit Exceeded for Current Quarter',
  'Disallowed Expense Category under Austerity Policy',
  'Departmental Capex Quota Exhausted',
  'Duplicate or Redundant Requisition',
  'Disapproved Vendor Commercial Terms',
  'Insufficient Return On Investment (ROI)',
  'Other Statutory or Policy Non-Compliance',
]

const RECOMMEND_TO_ADMIN_REASONS = [
  'Value Exceeds Departmental Fiscal Delegation Limit',
  'Requires Executive / Director-Level Approval',
  'Strategic or Multi-Year Capital Expenditure',
  'Vendor Contract Policy Exception Required',
  'Budget Reallocation or Supplementary Allocation Required',
  'Cross-Departmental Commercial Initiative',
  'Board of Directors / Managing Director Sign-off Required',
  'Other Executive Review Needed',
]

export const PendingFinancialApprovalPage: React.FC = () => {
  const navigate = useNavigate()
  const { isUnread, markAsRead } = useActivity()
  const {
    allRequests,
    pendingFinancialApprovals,
    approvedFinanceRequests,
    rejectedFinanceRequests,
    budgets,
    approveFinanceRequest,
    rejectFinanceRequest,
    holdFinanceRequest,
    recommendToHigherAuthority,
  } = useFinanceData()

  // Tab Filter State: ALL | Pending | Approved | Rejected
  type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL')

  // Computed requests matching the active filter
  const displayedRequests = useMemo(() => {
    if (statusFilter === 'ALL') return allRequests
    if (statusFilter === 'PENDING') return pendingFinancialApprovals
    if (statusFilter === 'APPROVED') return approvedFinanceRequests
    if (statusFilter === 'REJECTED') return rejectedFinanceRequests
    return allRequests
  }, [statusFilter, allRequests, pendingFinancialApprovals, approvedFinanceRequests, rejectedFinanceRequests])

  // Modal State
  const [activeReq, setActiveReq] = useState<ProcurementRequest | null>(null)
  const [modalAction, setModalAction] = useState<ActionType | null>(null)
  const [showDossierModal, setShowDossierModal] = useState(false)
  const [reason, setReason] = useState(REJECTION_REASONS[0])
  const [comment, setComment] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [viewingRequest, setViewingRequest] = useState<ProcurementRequest | null>(null)

  const handleOpenViewDetails = (req: ProcurementRequest) => {
    markAsRead(req.id)
    setViewingRequest(req)
  }

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const openAction = (req: ProcurementRequest, act: ActionType) => {
    markAsRead(req.id)
    setActiveReq(req)
    if (act === 'APPROVE') {
      setShowDossierModal(true)
      setModalAction(null)
      return
    }
    setModalAction(act)
    setComment('')
    if (act === 'RECOMMEND_ADMIN') {
      setReason(RECOMMEND_TO_ADMIN_REASONS[0])
    } else {
      setReason(REJECTION_REASONS[0])
    }
  }

  const handleConfirmFinancialDossier = (params: ApprovalParameters) => {
    if (!activeReq) return
    approveFinanceRequest(activeReq.id, params.approvalComments, 'Mark Finance Officer')
    showToast(`✓ Request ${activeReq.id} approved successfully! Routed to PO generation.`)
    setShowDossierModal(false)
    setActiveReq(null)
  }

  const handleConfirmAction = () => {
    if (!activeReq || !modalAction) return

    if (modalAction === 'APPROVE') {
      approveFinanceRequest(activeReq.id, comment, 'Mark Finance Officer')
      showToast(`✓ Request ${activeReq.id} approved successfully! Routed to PO generation.`)
    } else if (modalAction === 'REJECT') {
      if (!reason) {
        showToast('Rejection reason is required', 'error')
        return
      }
      rejectFinanceRequest(activeReq.id, reason, comment, 'Mark Finance Officer')
      showToast(`✕ Request ${activeReq.id} rejected. Audit recorded.`, 'error')
    } else if (modalAction === 'HOLD') {
      if (!comment.trim()) {
        showToast('Hold reason/comment is required', 'error')
        return
      }
      holdFinanceRequest(activeReq.id, comment, 'Mark Finance Officer')
      showToast(`⏸ Request ${activeReq.id} placed on fiscal hold.`, 'info')
    } else if (modalAction === 'RECOMMEND_ADMIN') {
      if (!comment.trim()) {
        showToast('Please provide recommendation notes / justification for Admin', 'error')
        return
      }
      recommendToHigherAuthority(activeReq.id, reason, comment, 'Mark Finance Officer')
      showToast(`✓ Request ${activeReq.id} recommended to Higher Authority (Admin) for executive approval.`, 'success')
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
              : 'bg-indigo-600'
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
              FINANCE APPROVAL
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {statusFilter === 'ALL' && `${allRequests.length} Total Purchase Requests`}
              {statusFilter === 'PENDING' && `${pendingFinancialApprovals.length} Requests Awaiting Sign-off`}
              {statusFilter === 'APPROVED' && `${approvedFinanceRequests.length} Approved Requests`}
              {statusFilter === 'REJECTED' && `${rejectedFinanceRequests.length} Disapproved Requests`}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Finance Approval
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review escalated procurement requisitions, assess budget headroom, approve capital spend, or recommend to higher authority.
          </p>
        </div>

        {/* Status Filters: All Requests, Pending, Approved, Rejected */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200">
          <button
            onClick={() => setStatusFilter('ALL')}
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
            onClick={() => setStatusFilter('PENDING')}
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
              {pendingFinancialApprovals.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <CheckCircle size={14} />
            <span>Approved</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                statusFilter === 'APPROVED'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {approvedFinanceRequests.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <XCircle size={14} />
            <span>Rejected</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                statusFilter === 'REJECTED'
                  ? 'bg-rose-700 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {rejectedFinanceRequests.length}
            </span>
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {displayedRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-2xs">
            {statusFilter === 'ALL' && (
              <>
                <FileText size={48} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-base font-bold text-slate-800">No Purchase Requests Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  There are currently no purchase requisitions recorded in the system.
                </p>
              </>
            )}
            {statusFilter === 'PENDING' && (
              <>
                <CheckCircle size={48} className="mx-auto mb-3 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-800">All Financial Approvals Cleared</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  No requests currently require financial review. New requests forwarded by procurement managers will appear here in real time.
                </p>
              </>
            )}
            {statusFilter === 'APPROVED' && (
              <>
                <FileText size={48} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-base font-bold text-slate-800">No Approved Requests Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Requisitions approved by Finance or Admin will be archived here with full payment and audit status.
                </p>
              </>
            )}
            {statusFilter === 'REJECTED' && (
              <>
                <CheckCircle size={48} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-base font-bold text-slate-800">No Rejected Requests Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  No procurement requisitions have been disapproved by the Finance audit team.
                </p>
              </>
            )}
          </div>
        ) : (
          displayedRequests.map((req: ProcurementRequest) => {
            // Find category budget to check availability live
            const matchedBudget = budgets.find(
              (b) => b.department === req.department && b.category.includes(req.category)
            ) || budgets.find((b) => b.department === req.department)

            const budgetAvailable = matchedBudget ? matchedBudget.available : 950000
            const hasSufficientBudget = budgetAvailable >= req.amount

            const isApproved = req.status === 'approved' || req.status === 'finance_approved'
            const isRejected = req.status === 'rejected' || req.status === 'finance_rejected'
            const isPending = !isApproved && !isRejected
            const isNew = isUnread(req.id) && !isApproved && !isRejected

            return (
              <div
                key={req.id}
                onClick={() => { if (isNew) markAsRead(req.id) }}
                className={`rounded-2xl border p-6 transition-all space-y-4 ${
                  isNew
                    ? 'bg-blue-50/30 border-l-4 border-l-blue-600 border-slate-300 shadow-md'
                    : 'bg-white border border-slate-300/80 shadow-xs hover:border-indigo-400 hover:shadow-md'
                }`}
              >
                {/* Top Row: Meta Tags & Title & Cost */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <UnreadBadge isUnread={isNew} />
                      <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                        {req.id}
                      </span>
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
                          <CheckCircle size={11} /> {req.financeStatus || 'Finance Approved'}
                        </span>
                      ) : isRejected ? (
                        <span className="text-[10px] font-black text-rose-900 bg-rose-100 px-3 py-0.5 rounded-full border border-rose-300 shadow-2xs flex items-center gap-1">
                          <XCircle size={11} /> {req.financeStatus || 'Rejected'}
                        </span>
                      ) : req.status === 'recommended_to_admin' ? (
                        <span className="text-[10px] font-black text-purple-950 bg-purple-100 px-3 py-0.5 rounded-full border border-purple-300 shadow-2xs flex items-center gap-1">
                          <ArrowUpRight size={11} /> Recommended to Admin
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-amber-900 bg-amber-100 px-3 py-0.5 rounded-full border border-amber-300 shadow-2xs flex items-center gap-1">
                          {req.financeStatus || 'Awaiting Finance Review'}
                        </span>
                      )}
                      {req.recommendationReason && req.status !== 'recommended_to_admin' && !isApproved && !isRejected && (
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          Escalated by Manager
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

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                  {/* Column 1: Endorsement or Approval/Rejection Actor */}
                  <div className="space-y-1">
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">
                      {isApproved ? 'Authorized Sign-Off' : isRejected ? 'Disapproved By' : 'Manager Endorsement'}
                    </span>
                    <div className="flex items-center gap-1.5 font-bold">
                      {isApproved ? (
                        <span className="text-emerald-700 flex items-center gap-1 font-extrabold">
                          <CheckCircle size={14} /> {req.financeApprovedBy || req.approvedBy || 'Mark Finance Officer'}
                        </span>
                      ) : isRejected ? (
                        <span className="text-rose-700 flex items-center gap-1 font-extrabold">
                          <XCircle size={14} /> {req.rejectedBy || 'Finance Audit Team'}
                        </span>
                      ) : (
                        <span className="text-emerald-700 flex items-center gap-1 font-extrabold">
                          <CheckCircle size={14} /> {req.approvedBy || req.recommendedBy || 'Sarah Manager (Manager Sign-off)'}
                        </span>
                      )}
                    </div>
                    {req.recommendationReason && !isApproved && !isRejected && req.status !== 'recommended_to_admin' && (
                      <p className="text-[11px] text-purple-700 italic">
                        "{req.recommendationReason}"
                      </p>
                    )}
                    {isApproved && (
                      <p className="text-[11px] text-slate-500 font-medium">
                        Authorized: {req.financeApprovedDate || req.approvedDate || req.date}
                      </p>
                    )}
                    {isRejected && (
                      <p className="text-[11px] text-slate-500 font-medium">
                        Date: {req.rejectedDate || req.date}
                      </p>
                    )}
                  </div>

                  {/* Column 2: Budget Headroom or Status */}
                  <div className="space-y-1">
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">
                      {isApproved ? 'Payment / PO Status' : isRejected ? 'Audit Rationale' : 'Live Budget Verification'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isApproved ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                          Disbursement: {req.paymentStatus || 'Pending'}
                        </span>
                      ) : isRejected ? (
                        <span className="text-rose-700 font-bold flex items-center gap-1 truncate" title={req.rejectionReason}>
                          <AlertTriangle size={14} /> {req.rejectionReason || 'Policy Disapproval'}
                        </span>
                      ) : hasSufficientBudget ? (
                        <span className="text-emerald-900 bg-emerald-100 border border-emerald-300 font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs">
                          <Check size={14} className="text-emerald-700" /> Headroom: {fmt(budgetAvailable)}
                        </span>
                      ) : (
                        <span className="text-rose-900 bg-rose-100 border border-rose-300 font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs">
                          <AlertTriangle size={14} className="text-rose-700" /> Over Budget: Avail {fmt(budgetAvailable)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 font-semibold">
                      Budget Category: {req.department} • {req.category}
                    </p>
                  </div>

                  {/* Column 3: Date & Supporting Documents */}
                  <div className="space-y-1">
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">
                      Submission & Attachments
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                      <Calendar size={13} className="text-slate-500" />
                      <span>Submitted: {req.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-indigo-700 font-bold cursor-pointer hover:underline text-[11px]">
                      <Paperclip size={13} />
                      <span>{req.documents?.length || 2} Commercial Quotes & Specs Attached</span>
                    </div>
                  </div>
                </div>

                {/* Justification if present */}
                {req.justification && (
                  <p className="text-xs text-slate-600 bg-indigo-50/30 p-2.5 rounded-lg border border-indigo-50">
                    <span className="font-bold text-indigo-950">Business Justification:</span> {req.justification}
                  </p>
                )}

                {/* Approved Banner */}
                {isApproved && (
                  <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                        <CheckCircle size={18} />
                      </div>
                      <div>
                        <span className="font-bold text-emerald-950">Expenditure Authorized & Released</span>
                        <p className="text-[11px] text-emerald-700">
                          {req.financeComment || 'Budget headroom verified. Released for PO generation and invoice processing.'}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-200/80 text-emerald-900 text-[10px] font-extrabold uppercase tracking-wide">
                      PO Released
                    </span>
                  </div>
                )}

                {/* Rejected Banner */}
                {isRejected && (
                  <div className="bg-rose-50/90 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-900">
                    <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <XCircle size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-rose-950">Disapproval Audit Record</span>
                      <p className="text-[11px] text-rose-800 font-semibold mt-0.5">
                        Reason: {req.rejectionReason || 'Non-essential expenditure exceeding policy threshold'}
                      </p>
                      {req.financeComment && (
                        <p className="text-[11px] text-rose-700 italic mt-0.5">
                          Audit Note: "{req.financeComment}"
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Higher Authority Banner if recommended to admin */}
                {statusFilter === 'PENDING' && req.status === 'recommended_to_admin' && (
                  <div className="bg-purple-50/90 border border-purple-200 rounded-xl p-3 flex items-center justify-between text-xs text-purple-900">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                        <ArrowUpRight size={18} />
                      </div>
                      <div>
                        <span className="font-bold text-purple-950">Recommended to Higher Authority (Admin)</span>
                        <p className="text-[11px] text-purple-700">
                          {req.recommendationReason}
                          {req.financeComment ? ` • Notes: "${req.financeComment}"` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-purple-200/80 text-purple-900 text-[10px] font-extrabold uppercase tracking-wide">
                      Awaiting Admin Sign-off
                    </span>
                  </div>
                )}

                {/* Action Row — Matches Image 2 reference */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Left 1: View Request Details (Purple Pill Button) */}
                    <button
                      onClick={() => handleOpenViewDetails(req)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl border border-purple-300 shadow-2xs transition-all cursor-pointer"
                    >
                      <Eye size={14} className="text-purple-600" /> View Request Details
                    </button>

                    {/* Left 2: Stepper Tracking */}
                    <button
                      onClick={() => navigate(`/portal/finance/request-details?id=${req.id}`)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      <FileText size={14} className="text-slate-500" /> Stepper Tracking
                    </button>
                  </div>

                  {/* Actions for PENDING */}
                  {(statusFilter === 'PENDING' || (statusFilter === 'ALL' && isPending)) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Right 1: View */}
                      <button
                        onClick={() => handleOpenViewDetails(req)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                      >
                        <Eye size={14} /> View
                      </button>

                      {/* Right 2: Approve */}
                      <button
                        onClick={() => openAction(req, 'APPROVE')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                      >
                        <CheckCircle size={14} /> Approve
                      </button>

                      {/* Right 3: Reject */}
                      <button
                        onClick={() => openAction(req, 'REJECT')}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                      >
                        <XCircle size={14} /> Reject
                      </button>

                      {/* Right 4: Recommend to Higher Authority */}
                      <button
                        onClick={() => openAction(req, 'RECOMMEND_ADMIN')}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                        title="Forward request to Admin for higher authority review and approval"
                      >
                        <ArrowUpRight size={14} /> Recommend to Higher Authority
                      </button>
                    </div>
                  )}

                  {/* Actions for APPROVED */}
                  {(statusFilter === 'APPROVED' || (statusFilter === 'ALL' && isApproved)) && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenViewDetails(req)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                      >
                        <Eye size={13} /> View
                      </button>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl flex items-center gap-1">
                        <CheckCircle size={13} /> Authorized & Released
                      </span>
                      <button
                        onClick={() => navigate(`/portal/finance/request-details?id=${req.id}`)}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-xl transition-all cursor-pointer"
                      >
                        <span>Audit Details</span> <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {/* Actions for REJECTED */}
                  {(statusFilter === 'REJECTED' || (statusFilter === 'ALL' && isRejected)) && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenViewDetails(req)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                      >
                        <Eye size={13} /> View
                      </button>
                      <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl flex items-center gap-1">
                        <XCircle size={13} /> Disapproved & Archived
                      </span>
                      <button
                        onClick={() => navigate(`/portal/finance/request-details?id=${req.id}`)}
                        className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-xl transition-all cursor-pointer"
                      >
                        <span>Audit Details</span> <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Action Dialog Modal */}
      {modalAction && activeReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {modalAction === 'APPROVE' && <CheckCircle className="text-emerald-600" size={20} />}
                {modalAction === 'REJECT' && <XCircle className="text-rose-600" size={20} />}
                {modalAction === 'HOLD' && <Clock className="text-amber-500" size={20} />}
                {modalAction === 'RECOMMEND_ADMIN' && <ArrowUpRight className="text-purple-600" size={20} />}
                <h3 className="font-bold text-slate-900 text-sm">
                  {modalAction === 'APPROVE' && 'Confirm Financial Approval'}
                  {modalAction === 'REJECT' && 'Reject Procurement Request'}
                  {modalAction === 'HOLD' && 'Place Requisition on Hold'}
                  {modalAction === 'RECOMMEND_ADMIN' && 'Recommend to Higher Authority (Admin)'}
                </h3>
              </div>
              <button
                onClick={() => setModalAction(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{activeReq.id}: {activeReq.title}</span>
                <span>{fmt(activeReq.amount)}</span>
              </div>
              <p className="text-slate-500">
                Department: {activeReq.department} • Requester: {activeReq.requester}
              </p>
            </div>

            {/* Target Authority Destination Banner */}
            {modalAction === 'RECOMMEND_ADMIN' && (
              <div className="flex items-center justify-between text-xs bg-purple-50 text-purple-900 border border-purple-200 rounded-xl px-3.5 py-2.5">
                <span className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-purple-600" /> Forward Destination:
                </span>
                <span className="font-bold bg-purple-200/90 text-purple-950 px-2.5 py-0.5 rounded text-[11px]">
                  Admin / Executive Authority
                </span>
              </div>
            )}

            {/* Reason dropdown if rejecting or recommending to admin */}
            {(modalAction === 'REJECT' || modalAction === 'RECOMMEND_ADMIN') && (
              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-700 block">
                  {modalAction === 'REJECT' ? 'Mandatory Rejection Reason' : 'Reason for Higher Authority / Admin Escalation'}{' '}
                  <span className={modalAction === 'REJECT' ? 'text-rose-500' : 'text-purple-600'}>*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none ${
                    modalAction === 'REJECT' ? 'focus:border-rose-500' : 'focus:border-purple-600'
                  }`}
                >
                  {(modalAction === 'REJECT' ? REJECTION_REASONS : RECOMMEND_TO_ADMIN_REASONS).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Comment or Message input */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 block">
                {modalAction === 'APPROVE' && 'Approval Note (Optional)'}
                {modalAction === 'REJECT' && 'Additional Explanation for Manager & Requester'}
                {modalAction === 'HOLD' && 'Hold Justification / Pending Requirement'}
                {modalAction === 'RECOMMEND_ADMIN' && 'Recommendation Justification & Financial Notes for Admin *'}
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  modalAction === 'APPROVE'
                    ? 'e.g., Verified within Q3 budget cap. Authorized for PO release.'
                    : modalAction === 'REJECT'
                    ? 'Provide specific audit rationale for rejection...'
                    : modalAction === 'HOLD'
                    ? 'e.g., Pending revised tax declaration or CTO co-authorization...'
                    : 'Explain why this request requires higher authority approval, financial context, and specific recommendation for the Admin...'
                }
                className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 ${
                  modalAction === 'RECOMMEND_ADMIN'
                    ? 'focus:ring-purple-500/20 focus:border-purple-600'
                    : 'focus:ring-indigo-500/20 focus:border-indigo-600'
                }`}
              />
            </div>

            {/* Policy context badge for Recommend to Admin */}
            {modalAction === 'RECOMMEND_ADMIN' && (
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 flex items-start gap-2 text-[11px] text-purple-900">
                <AlertTriangle size={14} className="text-purple-600 flex-shrink-0 mt-0.5" />
                <span>
                  This requisition will be forwarded to the <b>Admin Portal</b> for higher review and executive approval. An official audit log record will be logged with your recommendation.
                </span>
              </div>
            )}

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setModalAction(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 ${
                  modalAction === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : modalAction === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : modalAction === 'HOLD'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {modalAction === 'APPROVE' && 'Confirm Approval'}
                {modalAction === 'REJECT' && 'Confirm Rejection'}
                {modalAction === 'HOLD' && 'Place on Hold'}
                {modalAction === 'RECOMMEND_ADMIN' && (
                  <>
                    <ArrowUpRight size={14} /> Confirm Recommendation to Admin
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Purchase Request Details Modal */}
      <RequestDetailsModal
        isOpen={!!viewingRequest}
        request={viewingRequest}
        onClose={() => setViewingRequest(null)}
        onApprove={(req) => {
          setViewingRequest(null)
          openAction(req, 'APPROVE')
        }}
        onReject={(req) => {
          setViewingRequest(null)
          openAction(req, 'REJECT')
        }}
        onRecommend={(req) => {
          setViewingRequest(null)
          openAction(req, 'RECOMMEND_ADMIN')
        }}
      />

      {/* Structured Financial Request Approval Dossier Modal (Image 2) */}
      <RequestApprovalModal
        isOpen={showDossierModal}
        request={activeReq}
        portalType="FINANCE"
        approverName="Mark Finance Officer"
        onClose={() => {
          setShowDossierModal(false)
          setActiveReq(null)
        }}
        onConfirm={handleConfirmFinancialDossier}
      />
    </div>
  )
}
