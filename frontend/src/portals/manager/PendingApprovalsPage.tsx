import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CheckSquare, CheckCircle, XCircle, ArrowUpRight, Search,
  Clock, FileText, Calendar, AlertTriangle, Eye, Layers, ShieldCheck, X
} from 'lucide-react'
import { useManagerData } from '../../context/ManagerDataContext'
import { useAuth } from '../../context/AuthContext'
import { useActivity, UnreadBadge } from '../../context/ActivityContext'
import { ActionModal, ModalActionType } from '../../components/portal/ActionModal'
import { RequestApprovalModal } from '../../components/portal/RequestApprovalModal'
import { RequestDetailsModal } from '../../components/portal/RequestDetailsModal'
import { RequestTypeFilter } from '../../components/portal/RequestTypeFilter'
import { isSoftwareRequest, isHardwareRequest, sortRequestsNewestFirst, getRecommendationStatus } from '../../utils/workflowUtils'
import type { ProcurementRequest, ApprovalParameters } from '../../context/ManagerDataContext'
import { PaymentJustificationDetailsDisplay } from '../teamlead/MyRequestsPage'
import { verifyPaymentJustificationApi, sendBackRequestApi } from '../../api/managerApi'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

const PAGE_SIZE = 8

export interface PendingApprovalsPageProps {
  initialTab?: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
}

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

export const PendingApprovalsPage: React.FC<PendingApprovalsPageProps> = ({ initialTab }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    pendingApprovals,
    myApprovals,
    rejectedRequests,
    allRequests: contextAllRequests,
    refreshData,
    approveRequest,
    rejectRequest,
    recommendToFinance
  } = useManagerData()

  useEffect(() => {
    refreshData?.()
  }, [refreshData])

  const { isUnread, markAsRead } = useActivity()

  // Determine active tab from URL param or initial prop or default to PENDING
  const tabFromUrl = searchParams.get('tab')?.toUpperCase()
  const initial = (tabFromUrl === 'ALL' || tabFromUrl === 'PENDING' || tabFromUrl === 'APPROVED' || tabFromUrl === 'REJECTED')
    ? (tabFromUrl as FilterStatus)
    : initialTab || 'PENDING'

  const [statusFilter, setStatusFilter] = useState<FilterStatus>(initial)
  const [requestType, setRequestType] = useState<'all' | 'software' | 'hardware'>('all')
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [activeReq, setActiveReq] = useState<ProcurementRequest | null>(null)
  const [modalAction, setModalAction] = useState<ModalActionType | null>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [viewingRequest, setViewingRequest] = useState<ProcurementRequest | null>(null)
  const [justificationModalReq, setJustificationModalReq] = useState<ProcurementRequest | null>(null)
  const [justificationNotes, setJustificationNotes] = useState('')
  const [verifyingJustification, setVerifyingJustification] = useState(false)
  const [sendingBack, setSendingBack] = useState(false)
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

  // Combine all requests safely without duplicates, sorted newest first
  const allRequests = useMemo(() => {
    if (contextAllRequests && contextAllRequests.length > 0) {
      return sortRequestsNewestFirst(contextAllRequests)
    }
    const map = new Map<string, ProcurementRequest>()
    pendingApprovals.forEach(r => map.set(r.id, r))
    myApprovals.forEach(r => map.set(r.id, r))
    rejectedRequests.forEach(r => map.set(r.id, r))
    const list = Array.from(map.values())
    return sortRequestsNewestFirst(list)
  }, [contextAllRequests, pendingApprovals, myApprovals, rejectedRequests])

  // Active pool based on tab
  const activeList = useMemo(() => {
    if (statusFilter === 'ALL') return allRequests
    if (statusFilter === 'PENDING') return pendingApprovals
    if (statusFilter === 'APPROVED') return myApprovals
    if (statusFilter === 'REJECTED') return rejectedRequests
    return allRequests
  }, [statusFilter, allRequests, pendingApprovals, myApprovals, rejectedRequests])

  // Type counts for segmented filter
  const softwareCount = useMemo(() => activeList.filter(r => isSoftwareRequest(r)).length, [activeList])
  const hardwareCount = useMemo(() => activeList.filter(r => isHardwareRequest(r)).length, [activeList])

  // Filter options
  const departments = useMemo(() => {
    return ['All', ...Array.from(new Set(activeList.map(r => r.department)))]
  }, [activeList])
  const priorities = ['All', 'Critical', 'High', 'Medium', 'Low']

  // Search, dropdown, and type filtered — strictly newest first
  const filtered = useMemo(() => {
    const matching = activeList
      .filter(r => {
        const matchSearch =
          !search ||
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.id.toLowerCase().includes(search.toLowerCase()) ||
          r.requester.toLowerCase().includes(search.toLowerCase())
        const matchDept = deptFilter === 'All' || r.department === deptFilter
        const matchPriority = priorityFilter === 'All' || r.priority === priorityFilter
        const matchType = requestType === 'all'
          ? true
          : requestType === 'software'
          ? isSoftwareRequest(r)
          : isHardwareRequest(r)
        return matchSearch && matchDept && matchPriority && matchType
      })
    return sortRequestsNewestFirst(matching)
  }, [activeList, search, deptFilter, priorityFilter, requestType])

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

  const handleConfirmApproval = async (params: ApprovalParameters) => {
    if (!activeReq) return
    try {
      await approveRequest(activeReq.id, params.approvalComments, params)
      showToast(`✓ Request ${activeReq.id} approved successfully! Forwarded for procurement.`, 'success')
      setActiveReq(null)
      setShowApprovalModal(false)
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data?.error || err?.message
      showToast(detail || `Could not approve request ${activeReq.id}.`, 'error')
    }
  }

  const handleConfirm = async (data: { action: ModalActionType; reason?: string; notes?: string }) => {
    if (!activeReq) return
    if (data.action === 'APPROVE') {
      try {
        await approveRequest(activeReq.id, data.notes)
        showToast(`✓ Request ${activeReq.id} approved successfully! Forwarded for procurement.`, 'success')
      } catch (err: any) {
        const detail = err?.response?.data?.detail || err?.response?.data?.error || err?.message
        showToast(detail || `Could not approve request ${activeReq.id}.`, 'error')
      }
    } else if (data.action === 'REJECT') {
      try {
        await rejectRequest(activeReq.id, data.reason || '', data.notes)
        showToast(`✕ Request ${activeReq.id} rejected. Audit recorded.`, 'error')
      } catch (err: any) {
        const detail = err?.response?.data?.detail || err?.response?.data?.error || err?.message
        showToast(detail || `Could not reject request ${activeReq.id}.`, 'error')
      }
    } else if (data.action === 'RECOMMEND') {
      try {
        await recommendToFinance(activeReq.id, data.reason || '')
        showToast(`↑ Request ${activeReq.id} recommended to Higher Authority.`, 'info')
      } catch (err: any) {
        const detail = err?.response?.data?.detail || err?.response?.data?.error || err?.message
        showToast(detail || `Could not recommend request ${activeReq.id}.`, 'error')
      }
    }
    setActiveReq(null)
    setModalAction(null)
  }

  const handleVerifyJustification = async () => {
    if (!justificationModalReq) return
    if (!window.confirm(`Verify Payment Justification for "${justificationModalReq.title}"? This will enable Team Lead to acknowledge and complete the request.`)) return
    setVerifyingJustification(true)
    try {
      await verifyPaymentJustificationApi(justificationModalReq.id, justificationNotes || 'Payment justification verified by Manager.')
      showToast('✓ Payment Justification verified! Team Lead can now acknowledge and complete the request.', 'success')
      
      const nowIso = new Date().toISOString()
      const verifiedBy = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : 'Manager'

      setJustificationModalReq((prev: any) => {
        if (!prev) return null
        return {
          ...prev,
          status: 'Manager Verified - Pending Team Lead Acknowledgement',
          raw_status: 'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT',
          extra_fields: {
            ...(prev.extra_fields || {}),
            justification_verified_at: nowIso,
            justification_verified_by: verifiedBy,
            justification_manager_notes: justificationNotes || 'Payment justification verified by Manager.',
          },
          payment_justification_detail: {
            ...(prev.payment_justification_detail || {}),
            verified_at: nowIso,
            manager_notes: justificationNotes || 'Payment justification verified by Manager.',
          }
        }
      })

      window.dispatchEvent(new Event('kss_backend_updated'))
      refreshData?.()
      setJustificationNotes('')
    } catch (e: any) {
      showToast(e?.response?.data?.error || 'Verification failed.', 'error')
    } finally {
      setVerifyingJustification(false)
    }
  }

  const handleSendBackJustification = async () => {
    if (!justificationModalReq) return
    if (!justificationNotes.trim()) {
      showToast('Please provide notes explaining why you are sending back for correction.', 'error')
      return
    }
    if (!window.confirm(`Send back Payment Justification for "${justificationModalReq.title}" for correction?`)) return
    setSendingBack(true)
    try {
      await sendBackRequestApi(justificationModalReq.id, justificationNotes)
      showToast('✓ Request sent back to Team Lead for correction.', 'success')
      window.dispatchEvent(new Event('kss_backend_updated'))
      refreshData?.()
      setJustificationModalReq(null)
      setJustificationNotes('')
    } catch (e: any) {
      showToast(e?.response?.data?.error || 'Send back failed.', 'error')
    } finally {
      setSendingBack(false)
    }
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
            Review incoming purchase requests, grant manager sign-off, record rejection rationale, or recommend to Higher Authority.
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

      {/* Request Type Segmented Filter */}
      <div className="flex items-center justify-between">
        <RequestTypeFilter
          value={requestType}
          onChange={(newType) => {
            setRequestType(newType)
            setPage(1)
          }}
          totalCount={activeList.length}
          softwareCount={softwareCount}
          hardwareCount={hardwareCount}
        />
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
            const recInfo = getRecommendationStatus(req)
            const rawSt = ((req as any).raw_status || req.status || '').toUpperCase()
            const st = (req.status || '').toLowerCase()

            const isApproved =
              statusFilter === 'APPROVED' ||
              st === 'approved' ||
              st === 'finance_review' ||
              rawSt === 'FINANCE_REVIEW' ||
              st === 'finance_approved' ||
              rawSt === 'FINANCE_APPROVED' ||
              rawSt === 'MANAGER_APPROVED' ||
              rawSt.includes('APPROVED') ||
              st === 'payment_approved' ||
              st === 'payment_justified' ||
              st === 'manager_verified' ||
              st === 'manager_verified_pending_team_lead_acknowledgement' ||
              st === 'payment_completed' ||
              st === 'completed' ||
              st === 'assigned_to_vendor' ||
              Boolean(req.approvalParams) ||
              Boolean(req.approvedBy) ||
              Boolean(req.approvedDate)
            const isRejected = statusFilter === 'REJECTED' || st === 'rejected' || rawSt === 'REJECTED' || st === 'finance_rejected' || rawSt === 'FINANCE_REJECTED'
            const isPending = !isApproved && !isRejected && !recInfo.isRecommended
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

                      {recInfo.isRecommended ? (
                        <>
                          <span className="text-[10px] font-black text-purple-950 bg-purple-100 px-3 py-0.5 rounded-full border border-purple-300 shadow-2xs flex items-center gap-1">
                            <ArrowUpRight size={11} /> Recommended to Higher Authority
                          </span>
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            {req.financeStatus || 'Awaiting Finance Action'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                            Escalated by Manager
                          </span>
                        </>
                      ) : isApproved ? (
                        <>
                          <span className="text-[10px] font-black text-emerald-900 bg-emerald-100 px-3 py-0.5 rounded-full border border-emerald-300 shadow-2xs flex items-center gap-1">
                            <CheckCircle size={11} /> Manager Approved
                          </span>
                          {(st === 'finance_review' || rawSt === 'FINANCE_REVIEW') && (
                            <span className="text-[10px] font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                              Finance Review
                            </span>
                          )}
                        </>
                      ) : isRejected ? (
                        <span className="text-[10px] font-black text-rose-900 bg-rose-100 px-3 py-0.5 rounded-full border border-rose-300 shadow-2xs flex items-center gap-1">
                          <XCircle size={11} /> Manager Rejected
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

                {/* Software / SaaS Payment Justification Banner */}
                {(() => {
                  const reqRawSt = ((req as any).raw_status || req.status || '').toUpperCase()
                  const st = (req.status || '').toLowerCase()

                  // Never show payment justification banner for pre-approval / initial stages
                  const isPreApproval = (
                    reqRawSt === 'PENDING' ||
                    reqRawSt === 'MANAGER_REVIEW' ||
                    reqRawSt === 'SUBMITTED' ||
                    reqRawSt === 'CREATED' ||
                    reqRawSt === 'MANAGER_RESEARCHING' ||
                    st === 'pending' ||
                    st === 'pending_approval' ||
                    st === 'pending_arrival' ||
                    st === 'manager_researching'
                  )
                  if (isPreApproval) return null

                  const isJustificationVerified = 
                    reqRawSt === 'PAYMENT_JUSTIFIED' ||
                    reqRawSt === 'MANAGER_VERIFIED' ||
                    reqRawSt === 'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT' ||
                    reqRawSt === 'TEAM_LEAD_ACKNOWLEDGED' ||
                    reqRawSt === 'REQUEST_COMPLETED' ||
                    reqRawSt === 'COMPLETED' ||
                    Boolean((req as any).extra_fields?.justification_verified_at) ||
                    Boolean((req as any).payment_justification_detail?.verified_at)

                  const isAwaitingJustificationVerification = (
                    !isJustificationVerified &&
                    (reqRawSt === 'PAYMENT_JUSTIFICATION_SUBMITTED' ||
                     st === 'payment_justification_submitted' ||
                     (Boolean((req as any).extra_fields?.payment_justification || (req as any).payment_justification_detail) &&
                      reqRawSt !== 'COMPLETED' &&
                      reqRawSt !== 'REQUEST_COMPLETED'))
                  )

                  if (!isJustificationVerified && !isAwaitingJustificationVerification) return null

                  return (
                    <div className="bg-gradient-to-r from-violet-50 via-purple-50 to-indigo-50 border-2 border-violet-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-violet-950 shadow-2xs animate-fadeIn">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg ${isAwaitingJustificationVerification ? 'bg-violet-600' : 'bg-emerald-600'} text-white flex items-center justify-center flex-shrink-0 shadow-xs`}>
                          {isAwaitingJustificationVerification ? <ShieldCheck size={18} /> : <CheckCircle size={18} />}
                        </div>
                        <div>
                          <span className="font-black text-violet-950 text-sm">
                            {isAwaitingJustificationVerification ? 'Payment Justification Pending Verification' : 'Payment Justification Verified'}
                          </span>
                          <p className="text-[11px] text-violet-800 font-medium">
                            {isAwaitingJustificationVerification
                              ? 'Team Lead submitted SaaS details & payment proof. Click View/Verify Justification to review.'
                              : 'Payment justification has been reviewed and verified by Manager.'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          markAsRead(req.id)
                          setJustificationModalReq(req)
                        }}
                        className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all ${
                          isAwaitingJustificationVerification
                            ? 'bg-violet-600 hover:bg-violet-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {isAwaitingJustificationVerification ? (
                          <>
                            <ShieldCheck size={14} /> View/Verify Justification
                          </>
                        ) : (
                          <>
                            <CheckCircle size={14} /> View Justification (Verified)
                          </>
                        )}
                      </button>
                    </div>
                  )
                })()}

                {/* Recommended to Higher Authority Details Section */}
                {recInfo.isRecommended && (
                  <div className="bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-purple-50/90 border-2 border-purple-200/90 rounded-2xl p-4 space-y-3 shadow-2xs animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                          <ArrowUpRight size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-purple-950 text-sm">
                              Recommended to Higher Authority
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-purple-200 text-purple-900 text-[10px] font-black uppercase tracking-wide border border-purple-300">
                              Active Recommendation
                            </span>
                          </div>
                          <p className="text-[11px] text-purple-800 font-medium">
                            Requisition forwarded to Higher Authority for review, budget headroom assessment, and executive sign-off.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                      <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100 shadow-2xs">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-purple-700 block">
                          Recommendation Source
                        </span>
                        <p className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                          <ShieldCheck size={13} className="text-purple-600 flex-shrink-0" />
                          <span>{recInfo.portalName || (req as any).extra_fields?.recommended_portal || 'Manager Portal'}</span>
                          <span className="text-slate-500 font-normal">
                            ({recInfo.actorName || (req as any).extra_fields?.recommended_by || 'Procurement Manager'})
                          </span>
                        </p>
                      </div>

                      <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100 shadow-2xs">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-purple-700 block">
                          Recommendation Date
                        </span>
                        <p className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                          <Calendar size={13} className="text-purple-600 flex-shrink-0" />
                          <span>{recInfo.date || (req as any).extra_fields?.recommended_date?.split('T')[0] || req.date}</span>
                        </p>
                      </div>

                      <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100 shadow-2xs">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-purple-700 block">
                          Endorsement / Reason
                        </span>
                        <p className="font-semibold text-purple-900 mt-0.5 italic truncate" title={recInfo.reason || (req as any).extra_fields?.recommendation_reason || 'Exceeds my approval budget'}>
                          "{recInfo.reason || (req as any).extra_fields?.recommendation_reason || 'Exceeds my approval budget'}"
                        </p>
                      </div>
                    </div>
                  </div>
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

                  {/* Action Buttons: Show ONLY View/Verify Justification when in post-payment justification stage */}
                  {(() => {
                    const reqRawSt = ((req as any).raw_status || req.status || '').toUpperCase()
                    const st = (req.status || '').toLowerCase()

                    const isPreApproval = (
                      reqRawSt === 'PENDING' ||
                      reqRawSt === 'MANAGER_REVIEW' ||
                      reqRawSt === 'SUBMITTED' ||
                      reqRawSt === 'CREATED' ||
                      reqRawSt === 'MANAGER_RESEARCHING' ||
                      st === 'pending' ||
                      st === 'pending_approval' ||
                      st === 'pending_arrival' ||
                      st === 'manager_researching'
                    )

                    const isPostPaymentJustificationStage = !isPreApproval && (
                      reqRawSt === 'PAYMENT_JUSTIFICATION_SUBMITTED' ||
                      st === 'payment_justification_submitted' ||
                      reqRawSt === 'PAYMENT_JUSTIFIED' ||
                      reqRawSt === 'MANAGER_VERIFIED' ||
                      reqRawSt === 'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT'
                    )

                    const isAwaitingJustificationVerification = (
                      reqRawSt === 'PAYMENT_JUSTIFICATION_SUBMITTED' ||
                      st === 'payment_justification_submitted' ||
                      (Boolean((req as any).extra_fields?.payment_justification || (req as any).payment_justification_detail) &&
                       !(req as any).extra_fields?.justification_verified_at &&
                       reqRawSt !== 'PAYMENT_JUSTIFIED' &&
                       reqRawSt !== 'MANAGER_VERIFIED' &&
                       reqRawSt !== 'COMPLETED' &&
                       reqRawSt !== 'REQUEST_COMPLETED')
                    )

                    if (isPostPaymentJustificationStage) {
                      return (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              markAsRead(req.id)
                              setJustificationModalReq(req)
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                          >
                            <ShieldCheck size={14} /> View/Verify Justification
                          </button>
                          {isAwaitingJustificationVerification ? (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold animate-pulse">
                              ⏳ Awaiting Verification
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-bold">
                              ✓ Justification Verified
                            </span>
                          )}
                        </div>
                      )
                    }

                    if (recInfo.isRecommended) {
                      return (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleOpenViewDetails(req)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                          >
                            <Eye size={14} /> View
                          </button>
                          <span className="text-xs font-bold text-purple-950 bg-purple-100 border border-purple-300 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs">
                            <ArrowUpRight size={14} /> Recommended to Higher Authority
                          </span>
                        </div>
                      )
                    }

                    return (
                      <>
                        {isPending && (
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
                              <ArrowUpRight size={14} /> Recommend to Higher Authority
                            </button>
                          </div>
                        )}

                        {isApproved && (
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

                        {isRejected && (
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
                      </>
                    )
                  })()}
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
            {(() => {
              const maxButtons = 5
              let startPage = Math.max(1, page - 2)
              let endPage = Math.min(totalPages, startPage + maxButtons - 1)
              if (endPage - startPage + 1 < maxButtons) {
                startPage = Math.max(1, endPage - maxButtons + 1)
              }
              const pageNumbers: number[] = []
              for (let p = startPage; p <= endPage; p++) {
                pageNumbers.push(p)
              }
              return pageNumbers.map((p) => (
                <button
                  key={`page-${p}`}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1.5 rounded-xl border font-medium ${
                    page === p
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))
            })()}
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

      {/* View / Verify Justification Modal (Software & SaaS) */}
      {justificationModalReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-violet-200 overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 border-b border-violet-100 flex items-center justify-between bg-gradient-to-r from-violet-50 via-purple-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-md">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Payment Justification Verification
                    </h3>
                    <span className="font-mono text-xs font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-md border border-violet-200">
                      {justificationModalReq.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {justificationModalReq.title} • {justificationModalReq.department}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setJustificationModalReq(null)
                  setJustificationNotes('')
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Status Notice */}
              {(() => {
                const reqRawSt = ((justificationModalReq as any).raw_status || justificationModalReq.status || '').toUpperCase()
                const isVerified = 
                  reqRawSt === 'PAYMENT_JUSTIFIED' ||
                  reqRawSt === 'MANAGER_VERIFIED' ||
                  reqRawSt === 'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT' ||
                  reqRawSt === 'TEAM_LEAD_ACKNOWLEDGED' ||
                  reqRawSt === 'REQUEST_COMPLETED' ||
                  reqRawSt === 'COMPLETED' ||
                  Boolean((justificationModalReq as any).extra_fields?.justification_verified_at) ||
                  Boolean((justificationModalReq as any).payment_justification_detail?.verified_at)

                return (
                  <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                    isVerified ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {isVerified ? <CheckCircle size={18} className="text-emerald-600" /> : <Clock size={18} className="text-amber-600" />}
                      <span className="font-semibold">
                        {isVerified
                          ? `Payment Justification has been verified by ${(justificationModalReq as any).extra_fields?.justification_verified_by || 'Manager'}. Team Lead can now acknowledge and complete the request.`
                          : 'Payment Justification is awaiting Manager verification. Review submitted details below.'}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                      isVerified ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900 animate-pulse'
                    }`}>
                      {isVerified ? 'Verified' : 'Awaiting Review'}
                    </span>
                  </div>
                )
              })()}

              {/* Complete 7-Section Justification Dossier with real data */}
              <PaymentJustificationDetailsDisplay req={justificationModalReq as any} />

              {/* Manager Notes (if already verified) */}
              {(justificationModalReq as any).extra_fields?.justification_manager_notes && (
                <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 text-xs">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">Manager Verification Notes</span>
                  <p className="text-emerald-950 font-medium">{(justificationModalReq as any).extra_fields?.justification_manager_notes}</p>
                </div>
              )}

              {/* Verification Controls (if awaiting verification) */}
              {(() => {
                const rawSt = ((justificationModalReq as any).raw_status || justificationModalReq.status || '').toUpperCase()
                const isVerified = 
                  rawSt === 'PAYMENT_JUSTIFIED' ||
                  rawSt === 'MANAGER_VERIFIED' ||
                  rawSt === 'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT' ||
                  rawSt === 'TEAM_LEAD_ACKNOWLEDGED' ||
                  rawSt === 'REQUEST_COMPLETED' ||
                  rawSt === 'COMPLETED' ||
                  Boolean((justificationModalReq as any).extra_fields?.justification_verified_at) ||
                  Boolean((justificationModalReq as any).payment_justification_detail?.verified_at)

                if (isVerified) return null

                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <label className="text-xs font-bold text-slate-800 block">
                      Manager Verification Notes (Optional for approval, required for send back)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white resize-none focus:outline-none focus:border-violet-500 shadow-2xs"
                      placeholder="Add verification notes or explanation for Team Lead..."
                      value={justificationNotes}
                      onChange={e => setJustificationNotes(e.target.value)}
                    />
                  </div>
                )
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setJustificationModalReq(null)
                  setJustificationNotes('')
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition-all cursor-pointer"
              >
                Close
              </button>

              {(() => {
                const rawSt = ((justificationModalReq as any).raw_status || justificationModalReq.status || '').toUpperCase()
                const isVerified = 
                  rawSt === 'PAYMENT_JUSTIFIED' ||
                  rawSt === 'MANAGER_VERIFIED' ||
                  rawSt === 'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT' ||
                  rawSt === 'TEAM_LEAD_ACKNOWLEDGED' ||
                  rawSt === 'REQUEST_COMPLETED' ||
                  rawSt === 'COMPLETED' ||
                  Boolean((justificationModalReq as any).extra_fields?.justification_verified_at) ||
                  Boolean((justificationModalReq as any).payment_justification_detail?.verified_at)

                if (isVerified) return null

                return (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={sendingBack || verifyingJustification}
                      onClick={handleSendBackJustification}
                      className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Clock size={14} />
                      {sendingBack ? 'Sending Back...' : 'Send Back for Correction'}
                    </button>
                    <button
                      type="button"
                      disabled={verifyingJustification || sendingBack}
                      onClick={handleVerifyJustification}
                      className="bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ShieldCheck size={14} />
                      {verifyingJustification ? 'Verifying...' : 'Verify & Approve Justification'}
                    </button>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
