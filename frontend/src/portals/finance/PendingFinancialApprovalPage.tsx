import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, XCircle, Clock, AlertTriangle,
  FileText, ArrowRight, ShieldCheck, User, Building, Calendar,
  Paperclip, DollarSign, X, Check, ArrowUpRight, Eye, Layers, CreditCard
} from 'lucide-react'
import { useFinanceData, ProcurementRequest, ApprovalParameters } from '../../context/ManagerDataContext'
import { useActivity, UnreadBadge } from '../../context/ActivityContext'
import { useAuth } from '../../context/AuthContext'
import { RequestDetailsModal } from '../../components/portal/RequestDetailsModal'
import { RequestApprovalModal } from '../../components/portal/RequestApprovalModal'
import { ProcessPaymentModal } from '../../components/portal/ProcessPaymentModal'
import { RequestTypeFilter } from '../../components/portal/RequestTypeFilter'
import { isSoftwareRequest, isHardwareRequest, sortRequestsNewestFirst, getRecommendationStatus } from '../../utils/workflowUtils'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

const isAdminApprovedRequest = (request: ProcurementRequest) => {
  const rawStatus = String((request as any).raw_status || '').toUpperCase()
  const extra = request.extra_fields || request.extraFields || {}
  return rawStatus === 'APPROVED' ||
    rawStatus === 'ADMIN_APPROVED' ||
    request.status === 'admin_approved' ||
    request.financeStatus === 'Admin Approved' ||
    Boolean(extra.admin_approved) ||
    extra.final_approval_by === 'ADMIN'
}

const isFinanceApprovedRequest = (request: ProcurementRequest) => {
  const status = String(request.status || '').toLowerCase()
  const rawStatus = String((request as any).raw_status || '').toUpperCase()
  const extra = request.extra_fields || request.extraFields || {}
  return isAdminApprovedRequest(request) ||
    [
      'approved', 'finance_approved', 'payment_approved', 'payment_justification_submitted',
      'payment_justified', 'payment_completed', 'completed', 'quotes_received',
      'assigned_to_vendor', 'delivered', 'invoiced'
    ].includes(status) ||
    [
      'FINANCE_APPROVED', 'ADMIN_APPROVED', 'PAYMENT_APPROVED', 'PAYMENT_PROCESSED',
      'PAYMENT_JUSTIFICATION_SUBMITTED', 'PAYMENT_JUSTIFIED', 'PAYMENT_COMPLETED',
      'COMPLETED', 'TEAM_LEAD_CONFIRMED'
    ].includes(rawStatus) ||
    ['Approved', 'Paid', 'Completed', 'Admin Approved'].includes(request.financeStatus || '') ||
    Boolean(
      request.financeApprovedBy ||
      request.financeApprovedDate ||
      (request as any).finance_approved ||
      extra.finance_approved ||
      extra.final_approval_by === 'FINANCE'
    )
}

type ActionType = 'APPROVE' | 'REJECT' | 'HOLD' | 'RECOMMEND_ADMIN' | 'SEND_BACK'

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
  const { user } = useAuth()
  const { isUnread, markAsRead } = useActivity()
  const {
    pendingFinancialApprovals,
    approvedFinanceRequests,
    rejectedFinanceRequests,
    recommendedToAdmin,
    allRequests,
    refreshData,
    budgets,
    approveFinanceRequest,
    rejectFinanceRequest,
    sendBackFinanceRequest,
    holdFinanceRequest,
    recommendToHigherAuthority
  } = useFinanceData()

  useEffect(() => {
    refreshData?.()
  }, [refreshData])

  const actorName = user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Finance Officer'

  // Tab Filter State: ALL | Pending | Approved | Rejected
  type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL')
  const [requestType, setRequestType] = useState<'all' | 'software' | 'hardware'>('all')

  // Requests in the Finance approval lifecycle
  const allFinanceRequests = useMemo(() => {
    const list = [
      ...pendingFinancialApprovals,
      ...approvedFinanceRequests,
      ...recommendedToAdmin,
      ...rejectedFinanceRequests,
    ]
    return list.filter((item, idx, self) => idx === self.findIndex(t => t.id === item.id))
  }, [pendingFinancialApprovals, approvedFinanceRequests, recommendedToAdmin, rejectedFinanceRequests])

  // Active pool matching the status filter
  const rawList = useMemo(() => {
    if (statusFilter === 'ALL') return allFinanceRequests
    if (statusFilter === 'PENDING') return pendingFinancialApprovals
    if (statusFilter === 'APPROVED') return approvedFinanceRequests
    if (statusFilter === 'REJECTED') return rejectedFinanceRequests
    return allFinanceRequests
  }, [statusFilter, allFinanceRequests, pendingFinancialApprovals, approvedFinanceRequests, rejectedFinanceRequests])

  // Segmented filter counts
  const softwareCount = useMemo(() => rawList.filter(r => isSoftwareRequest(r)).length, [rawList])
  const hardwareCount = useMemo(() => rawList.filter(r => isHardwareRequest(r)).length, [rawList])

  // Computed requests matching active status & type filter, sorted strictly newest first
  const displayedRequests = useMemo(() => {
    const matching = rawList.filter(r => {
      if (requestType === 'all') return true
      if (requestType === 'software') return isSoftwareRequest(r)
      return isHardwareRequest(r)
    })
    return sortRequestsNewestFirst(matching)
  }, [rawList, requestType])

  // Modal State
  const [activeReq, setActiveReq] = useState<ProcurementRequest | null>(null)
  const [modalAction, setModalAction] = useState<ActionType | null>(null)
  const [showDossierModal, setShowDossierModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentReq, setPaymentReq] = useState<ProcurementRequest | null>(null)
  const [reason, setReason] = useState(REJECTION_REASONS[0])
  const [comment, setComment] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [viewingRequest, setViewingRequest] = useState<ProcurementRequest | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    if (isFinanceApprovedRequest(req)) {
      showToast(`Request ${req.id} has already been approved. Finance actions are no longer available.`, 'info')
      return
    }
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

  const handleConfirmFinancialDossier = async (params: ApprovalParameters) => {
    if (!activeReq || isSubmitting) return
    setIsSubmitting(true)
    try {
      await approveFinanceRequest(activeReq.id, params.approvalComments, actorName, params)
      showToast(`✓ Request ${activeReq.id} approved successfully! Approved Amount: ${fmt(params.approvedAmount)}. Routed to Payment.`, 'success')
      setShowDossierModal(false)
      setActiveReq(null)
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.response?.data?.error || err?.message || `Could not approve request ${activeReq.id}.`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!activeReq || !modalAction || isSubmitting) return
    setIsSubmitting(true)

    if (modalAction === 'APPROVE') {
      try {
        await approveFinanceRequest(activeReq.id, comment, actorName)
        showToast(`✓ Request ${activeReq.id} approved successfully! Routed to PO generation.`, 'success')
        setModalAction(null)
        setActiveReq(null)
      } catch (err: any) {
        showToast(err?.response?.data?.detail || err?.response?.data?.error || err?.message || `Could not approve request ${activeReq.id}.`, 'error')
      }
    } else if (modalAction === 'REJECT') {
      if (!reason) {
        showToast('Rejection reason is required', 'error')
        setIsSubmitting(false)
        return
      }
      try {
        await rejectFinanceRequest(activeReq.id, reason, comment, actorName)
        showToast(`✕ Request ${activeReq.id} rejected. Audit recorded.`, 'error')
        setModalAction(null)
        setActiveReq(null)
      } catch (err: any) {
        const detail = err?.response?.data?.detail || err?.response?.data?.error || err?.message
        showToast(detail || `Could not reject request ${activeReq.id}.`, 'error')
      }
    } else if (modalAction === 'HOLD') {
      if (!comment.trim()) {
        showToast('Hold reason/comment is required', 'error')
        setIsSubmitting(false)
        return
      }
      holdFinanceRequest(activeReq.id, comment, actorName)
      showToast(`⏸ Request ${activeReq.id} placed on fiscal hold.`, 'info')
      setModalAction(null)
      setActiveReq(null)
    } else if (modalAction === 'SEND_BACK') {
      if (!comment.trim()) {
        showToast('Please provide feedback comments for the send back action', 'error')
        setIsSubmitting(false)
        return
      }
      sendBackFinanceRequest(activeReq.id, comment, actorName)
      showToast(`⮌ Request ${activeReq.id} sent back for revision.`, 'info')
      setModalAction(null)
      setActiveReq(null)
    } else if (modalAction === 'RECOMMEND_ADMIN') {
      if (!comment.trim()) {
        showToast('Please provide recommendation notes / justification for Admin', 'error')
        setIsSubmitting(false)
        return
      }
      try {
        await recommendToHigherAuthority(activeReq.id, reason, comment, actorName)
        setModalAction(null)
        setActiveReq(null)
        setIsSubmitting(false)
      } catch (error: any) {
        const detail = error?.response?.data?.detail || error?.response?.data?.error || error?.message
        showToast(detail || `Could not recommend request ${activeReq.id} to Admin.`, 'error')
        setIsSubmitting(false)
        return
      }
      showToast(`✓ Request ${activeReq.id} recommended to Higher Authority (Admin) for executive approval.`, 'success')
    }
    setIsSubmitting(false)
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
              {statusFilter === 'ALL' && `${allFinanceRequests.length} Total Financial Requests`}
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
              {allFinanceRequests.length}
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

      {/* Request Type Segmented Filter */}
      <div className="flex items-center justify-between">
        <RequestTypeFilter
          value={requestType}
          onChange={setRequestType}
          totalCount={rawList.length}
          softwareCount={softwareCount}
          hardwareCount={hardwareCount}
        />
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

            const budgetAvailable = matchedBudget ? matchedBudget.available : 0
            const hasSufficientBudget = matchedBudget ? budgetAvailable >= req.amount : false

            const recInfo = getRecommendationStatus(req)
            const isAdminApproved = isAdminApprovedRequest(req)
            const isApproved = isFinanceApprovedRequest(req)

            const isRejected =
              req.status === 'rejected' ||
              req.status === 'finance_rejected' ||
              req.financeStatus === 'Rejected' ||
              ['REJECTED', 'FINANCE_REJECTED'].includes((req as any).raw_status || '')

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
                      {recInfo.isRecommendedToAdmin ? (
                        <span className="text-[10px] font-black text-purple-950 bg-purple-100 px-3 py-0.5 rounded-full border border-purple-300 shadow-2xs flex items-center gap-1">
                          <ArrowUpRight size={11} /> {recInfo.statusLabel}
                        </span>
                      ) : recInfo.isRecommendedToFinance && !isApproved && !isRejected ? (
                        <span className="text-[10px] font-black text-emerald-950 bg-emerald-100 px-3 py-0.5 rounded-full border border-emerald-300 shadow-2xs flex items-center gap-1">
                          <ArrowUpRight size={11} /> {recInfo.statusLabel}
                        </span>
                      ) : isAdminApproved ? (
                        <span className="text-[10px] font-black text-emerald-900 bg-emerald-100 px-3 py-0.5 rounded-full border border-emerald-300 shadow-2xs flex items-center gap-1">
                          <CheckCircle size={11} /> Admin Approved
                        </span>
                      ) : isApproved ? (
                        <span className="text-[10px] font-black text-emerald-900 bg-emerald-100 px-3 py-0.5 rounded-full border border-emerald-300 shadow-2xs flex items-center gap-1">
                          <CheckCircle size={11} /> {req.financeStatus || 'Finance Approved'}
                        </span>
                      ) : isRejected ? (
                        <span className="text-[10px] font-black text-rose-900 bg-rose-100 px-3 py-0.5 rounded-full border border-rose-300 shadow-2xs flex items-center gap-1">
                          <XCircle size={11} /> {req.financeStatus || 'Rejected'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-amber-900 bg-amber-100 px-3 py-0.5 rounded-full border border-amber-300 shadow-2xs flex items-center gap-1">
                          {req.financeStatus || 'Awaiting Finance Review'}
                        </span>
                      )}
                      {req.recommendationReason && !recInfo.isRecommended && !isApproved && !isRejected && (
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
                <div className={`grid grid-cols-1 ${isApproved || isRejected ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 text-xs bg-slate-50/70 p-4 rounded-xl border border-slate-200`}>
                  {/* Column 1: Endorsement or Approval/Rejection Actor */}
                  <div className="space-y-1">
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">
                      {isApproved
                        ? 'Authorized Sign-Off'
                        : isRejected
                        ? 'Disapproved By'
                        : recInfo.isRecommendedToAdmin
                        ? 'Approval Chain'
                        : 'Manager Endorsement'}
                    </span>
                    <div className="flex items-center gap-1.5 font-bold">
                      {isApproved ? (
                        <span className="text-emerald-700 flex items-center gap-1 font-extrabold">
                          <CheckCircle size={14} /> {req.financeApprovedBy || req.approvedBy || actorName}
                        </span>
                      ) : isRejected ? (
                        <span className="text-rose-700 flex items-center gap-1 font-extrabold">
                          <XCircle size={14} /> {req.rejectedBy || 'Finance Audit Team'}
                        </span>
                      ) : recInfo.isRecommendedToAdmin ? (
                        <span className="text-purple-700 flex items-center gap-1 font-extrabold">
                          <ArrowUpRight size={14} /> Endorsed by {recInfo.actorName || req.recommendedBy || 'Mark Finance Officer'}
                        </span>
                      ) : (
                        <span className="text-emerald-700 flex items-center gap-1 font-extrabold">
                          <CheckCircle size={14} /> {req.approvedBy || req.recommendedBy || 'Manager Verification'}
                        </span>
                      )}
                    </div>
                    {recInfo.isRecommendedToAdmin && (
                      <p className="text-[11px] text-purple-700 italic">
                        "{recInfo.reason}"
                      </p>
                    )}
                    {req.recommendationReason && !isApproved && !isRejected && !recInfo.isRecommendedToAdmin && (
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

                  {/* Column 2: Status for Approved or Rejected */}
                  {(isApproved || isRejected) && (
                    <div className="space-y-1">
                      <span className="text-slate-500 font-bold block uppercase text-[10px]">
                        {isApproved ? 'Payment / PO Status' : 'Audit Rationale'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isApproved ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                            Disbursement: {req.paymentStatus || 'Pending'}
                          </span>
                        ) : (
                          <span className="text-rose-700 font-bold flex items-center gap-1 truncate" title={req.rejectionReason}>
                            <AlertTriangle size={14} /> {req.rejectionReason || 'Policy Disapproval'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

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
                        <span className="font-bold text-emerald-950">Finance Approved</span>
                        <p className="text-[11px] text-emerald-700">
                          {req.financeComment || 'Budget headroom verified. Approved for PO generation or mock payment.'}
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

                {/* Recommended to Finance Banner */}
                {recInfo.isRecommendedToFinance && !isApproved && !isRejected && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-950 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                        <ArrowUpRight size={18} />
                      </div>
                      <div>
                        <span className="font-black text-emerald-950">Recommended to Finance — {recInfo.portalName}</span>
                        <p className="text-[11px] text-emerald-800 font-medium">
                          {recInfo.reason || 'Requisition forwarded by Manager for commercial review & financial approval.'}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-200 text-emerald-950 text-[10px] font-black uppercase tracking-wide border border-emerald-300">
                      Recommended to Finance
                    </span>
                  </div>
                )}

                {/* Recommended to Admin Banner */}
                {recInfo.isRecommendedToAdmin && (
                  <div className="bg-purple-50 border border-purple-300 rounded-xl p-3 flex items-center justify-between text-xs text-purple-950 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                        <ArrowUpRight size={18} />
                      </div>
                      <div>
                        <span className="font-black text-purple-950">Recommended to Admin — {recInfo.portalName}</span>
                        <p className="text-[11px] text-purple-800 font-medium">
                          {recInfo.reason || 'Requisition forwarded to Administrator for higher authority review and executive approval.'}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-purple-200 text-purple-950 text-[10px] font-black uppercase tracking-wide border border-purple-300">
                      Recommended to Admin
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
                  {isPending && (statusFilter === 'ALL' || statusFilter === 'PENDING') && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {recInfo.isRecommendedToAdmin ? (
                        <>
                          <button
                            onClick={() => handleOpenViewDetails(req)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                          >
                            <Eye size={14} /> View
                          </button>
                          <span className="text-xs font-bold text-purple-950 bg-purple-100 border border-purple-300 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs">
                            <ArrowUpRight size={14} /> {recInfo.statusLabel}
                          </span>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  )}

                  {/* Actions for APPROVED */}
                  {(statusFilter === 'APPROVED' || (statusFilter === 'ALL' && isApproved)) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleOpenViewDetails(req)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                      >
                        <Eye size={13} /> View
                      </button>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl flex items-center gap-1">
                        <CheckCircle size={13} /> Finance Approved
                      </span>

                      {/* Process Payment CTA if not yet paid */}
                      {req.paymentStatus !== 'Paid' && (req as any).raw_status !== 'PAYMENT_COMPLETED' && (req as any).raw_status !== 'PAYMENT_PROCESSED' && (req as any).raw_status !== 'PAYMENT_JUSTIFICATION_SUBMITTED' && (req as any).raw_status !== 'PAYMENT_JUSTIFIED' && (req as any).raw_status !== 'COMPLETED' && (req as any).raw_status !== 'TEAM_LEAD_CONFIRMED' ? (
                        req.category === 'Software & SaaS' ? (
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-xl flex items-center gap-1 shadow-2xs">
                            <Clock size={12} className="text-amber-700" /> Awaiting Team Lead Mock Payment
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentReq(req)
                              setShowPaymentModal(true)
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                          >
                            <CreditCard size={14} /> Process Payment
                          </button>
                        )
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-xl flex items-center gap-1 shadow-2xs">
                          <CheckCircle size={12} className="text-emerald-700" /> Payment Disbursed: {(req as any).payment_reference || 'Mock Paid'}
                        </span>
                      )}

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
                {modalAction === 'SEND_BACK' && <AlertTriangle className="text-amber-500" size={20} />}
                {modalAction === 'HOLD' && <Clock className="text-amber-500" size={20} />}
                {modalAction === 'RECOMMEND_ADMIN' && <ArrowUpRight className="text-purple-600" size={20} />}
                <h3 className="font-bold text-slate-900 text-sm">
                  {modalAction === 'APPROVE' && 'Confirm Financial Approval'}
                  {modalAction === 'REJECT' && 'Reject Procurement Request'}
                  {modalAction === 'SEND_BACK' && 'Send Back Request for Revision'}
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
                {modalAction === 'SEND_BACK' && 'Feedback / Instructions for Revision *'}
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
                    : modalAction === 'SEND_BACK'
                    ? 'Provide detailed feedback on what needs to be revised or corrected...'
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
                type="button"
                disabled={isSubmitting}
                onClick={() => setModalAction(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmAction}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                  modalAction === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : modalAction === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : modalAction === 'SEND_BACK'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : modalAction === 'HOLD'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {modalAction === 'APPROVE' && 'Confirm Approval'}
                {modalAction === 'REJECT' && 'Confirm Rejection'}
                {modalAction === 'SEND_BACK' && 'Confirm Send Back'}
                {modalAction === 'HOLD' && 'Place on Hold'}
                {modalAction === 'RECOMMEND_ADMIN' && (
                  <span className="flex items-center gap-1">
                    <ArrowUpRight size={14} /> Confirm Recommendation to Admin
                  </span>
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
        onApprove={(() => {
          if (!viewingRequest) return undefined
          const isApp = isFinanceApprovedRequest(viewingRequest)
          const isRej = Boolean(
            viewingRequest.status === 'rejected' ||
            viewingRequest.status === 'finance_rejected' ||
            viewingRequest.financeStatus === 'Rejected'
          )
          if (isApp || isRej) return undefined
          return (req) => {
            setViewingRequest(null)
            openAction(req, 'APPROVE')
          }
        })()}
        onReject={(() => {
          if (!viewingRequest) return undefined
          const isApp = isFinanceApprovedRequest(viewingRequest)
          const isRej = Boolean(
            viewingRequest.status === 'rejected' ||
            viewingRequest.status === 'finance_rejected' ||
            viewingRequest.financeStatus === 'Rejected'
          )
          if (isApp || isRej) return undefined
          return (req) => {
            setViewingRequest(null)
            openAction(req, 'REJECT')
          }
        })()}
        onRecommend={(() => {
          if (!viewingRequest) return undefined
          const isApp = isFinanceApprovedRequest(viewingRequest)
          const isRej = Boolean(
            viewingRequest.status === 'rejected' ||
            viewingRequest.status === 'finance_rejected' ||
            viewingRequest.financeStatus === 'Rejected'
          )
          if (isApp || isRej) return undefined
          return (req) => {
            setViewingRequest(null)
            openAction(req, 'RECOMMEND_ADMIN')
          }
        })()}
      />

      {/* Structured Financial Request Approval Dossier Modal (Image 2) */}
      <RequestApprovalModal
        isOpen={showDossierModal}
        request={activeReq}
        portalType="FINANCE"
        approverName={actorName}
        onClose={() => {
          setShowDossierModal(false)
          setActiveReq(null)
        }}
        onConfirm={handleConfirmFinancialDossier}
      />

      {/* Process Payment Settlement Modal (Stage 8) */}
      <ProcessPaymentModal
        isOpen={showPaymentModal}
        request={paymentReq}
        onClose={() => {
          setShowPaymentModal(false)
          setPaymentReq(null)
        }}
        onSuccess={(utr: string) => {
          showToast(`✓ Payment disbursed & recorded in treasury ledger! UTR: ${utr}`, 'success')
          setShowPaymentModal(false)
          setPaymentReq(null)
          navigate('/portal/finance/purchase-requests')
        }}
      />
    </div>
  )
}
