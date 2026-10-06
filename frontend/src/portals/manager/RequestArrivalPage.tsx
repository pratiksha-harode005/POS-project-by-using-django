import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Inbox, CheckCircle, XCircle, ArrowUpRight, Search,
  Clock, FileText, Calendar, AlertTriangle, Check, Layers
} from 'lucide-react'
import { useManagerData } from '../../context/ManagerDataContext'
import { ActionModal, ModalActionType } from '../../components/portal/ActionModal'
import { RequestApprovalModal } from '../../components/portal/RequestApprovalModal'
import { RequestTypeFilter } from '../../components/portal/RequestTypeFilter'
import { isSoftwareRequest, isHardwareRequest, sortRequestsNewestFirst } from '../../utils/workflowUtils'
import type { ProcurementRequest, ApprovalParameters } from '../../context/ManagerDataContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

const PAGE_SIZE = 8

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

export const RequestArrivalPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    arrivedRequests,
    myApprovals,
    rejectedRequests,
    refreshData,
    acceptRequest,
    approveRequest,
    rejectRequest,
    recommendToFinance
  } = useManagerData()

  useEffect(() => {
    refreshData?.()
  }, [refreshData])

  // Tab synchronization from URL query param
  const tabFromUrl = searchParams.get('tab')?.toUpperCase()
  const initial = (tabFromUrl === 'ALL' || tabFromUrl === 'PENDING' || tabFromUrl === 'APPROVED' || tabFromUrl === 'REJECTED')
    ? (tabFromUrl as FilterStatus)
    : 'PENDING'

  const [statusFilter, setStatusFilter] = useState<FilterStatus>(initial)
  const [requestType, setRequestType] = useState<'all' | 'software' | 'hardware'>('all')
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [activeReq, setActiveReq] = useState<ProcurementRequest | null>(null)
  const [modalAction, setModalAction] = useState<ModalActionType | null>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
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

  // Combine all requests safely without duplicates, sorted newest first
  const allRequests = useMemo(() => {
    const map = new Map<string, ProcurementRequest>()
    arrivedRequests.forEach(r => map.set(r.id, r))
    myApprovals.forEach(r => map.set(r.id, r))
    rejectedRequests.forEach(r => map.set(r.id, r))
    const list = Array.from(map.values())
    return sortRequestsNewestFirst(list)
  }, [arrivedRequests, myApprovals, rejectedRequests])

  // Active pool based on tab
  const activeList = useMemo(() => {
    if (statusFilter === 'ALL') return allRequests
    if (statusFilter === 'PENDING') return arrivedRequests
    if (statusFilter === 'APPROVED') return myApprovals
    if (statusFilter === 'REJECTED') return rejectedRequests
    return allRequests
  }, [statusFilter, allRequests, arrivedRequests, myApprovals, rejectedRequests])

  // Type counts for segmented filter
  const softwareCount = useMemo(() => activeList.filter(r => isSoftwareRequest(r)).length, [activeList])
  const hardwareCount = useMemo(() => activeList.filter(r => isHardwareRequest(r)).length, [activeList])

  // Departments for dropdown
  const departments = useMemo(() => {
    return ['All', ...Array.from(new Set(activeList.map(r => r.department)))]
  }, [activeList])
  const priorities = ['All', 'Critical', 'High', 'Medium', 'Low']

  // Search, dropdown, and type filtered — strictly newest first
  const filtered = useMemo(() => {
    const matching = activeList.filter(r => {
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

  const handleOpenApprovalModal = (req: ProcurementRequest) => {
    setActiveReq(req)
    setShowApprovalModal(true)
  }

  const handleConfirmApprovalDossier = (params: ApprovalParameters) => {
    if (!activeReq) return
    acceptRequest(activeReq.id)
    approveRequest(activeReq.id, params.approvalComments, params)
    showToast(`✓ Request ${activeReq.id} reviewed & approved! Forwarded for procurement.`, 'success')
    setActiveReq(null)
    setShowApprovalModal(false)
  }

  const handleAccept = (req: ProcurementRequest) => {
    handleOpenApprovalModal(req)
  }

  const handleDirectApprove = (req: ProcurementRequest) => {
    handleOpenApprovalModal(req)
  }

  const openModal = (req: ProcurementRequest, action: ModalActionType) => {
    setActiveReq(req)
    setModalAction(action)
  }

  const handleConfirmModal = (data: { action: ModalActionType; reason?: string; notes?: string }) => {
    if (!activeReq) return
    if (data.action === 'REJECT') {
      rejectRequest(activeReq.id, data.reason || 'Arrival screening disapproval', data.notes)
      showToast(`✕ Request ${activeReq.id} rejected. Disapproval audit recorded.`, 'error')
    } else if (data.action === 'RECOMMEND') {
      recommendToFinance(activeReq.id, data.reason || 'Arrival escalation')
      showToast(`↑ Request ${activeReq.id} recommended directly to Finance.`, 'info')
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
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              REQUEST ARRIVAL DESK
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {statusFilter === 'ALL' && `${allRequests.length} Total Incoming Requests`}
              {statusFilter === 'PENDING' && `${arrivedRequests.length} Incoming Requests Awaiting Intake`}
              {statusFilter === 'APPROVED' && `${myApprovals.length} Approved Requests`}
              {statusFilter === 'REJECTED' && `${rejectedRequests.length} Disapproved Requests`}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Inbox className="text-amber-500" size={26} /> Request Arrival
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review incoming requisitions upon intake. Accept into approval workflow, grant direct approval, record rejection, or recommend to Finance.
          </p>
        </div>

        {/* Status Filter Pills: All Requests, Pending, Approval, Rejection */}
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
              {arrivedRequests.length}
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
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => { setDeptFilter(e.target.value); setPage(1) }}
          className="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none bg-white text-slate-700"
        >
          {departments.map(d => <option key={d}>{d}</option>)}
        </select>
        <select
          value={priorityFilter}
          onChange={e => { setPriorityFilter(e.target.value); setPage(1) }}
          className="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none bg-white text-slate-700"
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
                <h3 className="text-base font-bold text-slate-800">No Incoming Requests Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  No purchase requisitions matching your search or department filter were found.
                </p>
              </>
            )}
            {statusFilter === 'PENDING' && (
              <>
                <CheckCircle size={48} className="mx-auto mb-3 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-800">No Arrived Requests Pending</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  All incoming requisitions from team leads have been screened and processed. New arrivals will appear here automatically.
                </p>
              </>
            )}
            {statusFilter === 'APPROVED' && (
              <>
                <FileText size={48} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-base font-bold text-slate-800">No Approved Requests Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Requisitions approved or accepted by manager will be displayed here.
                </p>
              </>
            )}
            {statusFilter === 'REJECTED' && (
              <>
                <CheckCircle size={48} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-base font-bold text-slate-800">No Rejected Requests Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  No incoming requisitions have been disapproved.
                </p>
              </>
            )}
          </div>
        ) : (
          paged.map((req) => {
            const rawSt = ((req as any).raw_status || req.status || '').toUpperCase()
            const st = (req.status || '').toLowerCase()
            const isApproved = statusFilter === 'APPROVED' || st === 'approved' || st === 'finance_review' || rawSt === 'FINANCE_REVIEW' || st === 'finance_approved' || rawSt === 'FINANCE_APPROVED' || rawSt === 'MANAGER_APPROVED' || (req.status as string) === 'payment_approved' || (req.status as string) === 'payment_justification_submitted' || (req.status as string) === 'payment_justified' || (req.status as string) === 'payment_completed' || (req.status as string) === 'completed' || Boolean(req.approvedBy) || Boolean(req.approvalParams)
            const isRejected = statusFilter === 'REJECTED' || st === 'rejected' || rawSt === 'REJECTED' || st === 'finance_rejected' || rawSt === 'FINANCE_REJECTED'
            const isPending = !isApproved && !isRejected

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                        {req.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          req.priority === 'Critical'
                            ? 'bg-rose-100 text-rose-800'
                            : req.priority === 'High'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {req.priority} Priority
                      </span>

                      {isApproved ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle size={11} /> Approved
                        </span>
                      ) : isRejected ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                          <XCircle size={11} /> Rejected
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <Clock size={11} /> Incoming Arrival
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{req.title}</h3>
                    <p className="text-xs text-slate-500">
                      Requester: <b className="text-slate-800">{req.requester}</b> • Department:{' '}
                      <b className="text-slate-800">{req.department}</b> • Category:{' '}
                      <b className="text-slate-800">{req.category}</b> • Date:{' '}
                      <b className="text-slate-800">{req.date}</b>
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Estimated Spend
                    </span>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">{fmt(req.amount)}</p>
                  </div>
                </div>

                {/* Justification if present */}
                {req.justification && (
                  <p className="text-xs text-slate-600 bg-amber-50/40 p-2.5 rounded-lg border border-amber-100">
                    <span className="font-bold text-amber-950">Business Justification:</span> {req.justification}
                  </p>
                )}

                {/* Action Row */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => navigate(`/portal/manager/request-details?id=${req.id}`)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    <FileText size={13} /> View Specifications & Timeline
                  </button>

                  {(statusFilter === 'PENDING' || (statusFilter === 'ALL' && isPending)) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleAccept(req)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                      >
                        <Check size={14} /> Accept Request
                      </button>
                      <button
                        onClick={() => handleDirectApprove(req)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                      >
                        <CheckCircle size={14} /> Quick Approve
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
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <CheckCircle size={14} /> Request Approved & Active
                    </span>
                  )}

                  {(statusFilter === 'REJECTED' || (statusFilter === 'ALL' && isRejected)) && (
                    <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <XCircle size={14} /> Disapproved & Recorded
                    </span>
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
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
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

      {/* Action Modal for Reject & Recommend */}
      <ActionModal
        isOpen={!!modalAction}
        actionType={modalAction}
        requestId={activeReq?.id || ''}
        requestTitle={activeReq?.title || ''}
        onClose={() => setModalAction(null)}
        onConfirm={handleConfirmModal}
      />

      {/* Structured Manager Request Approval Dossier Modal (Image 2) */}
      <RequestApprovalModal
        isOpen={showApprovalModal}
        request={activeReq}
        onClose={() => {
          setShowApprovalModal(false)
          setActiveReq(null)
        }}
        onConfirm={handleConfirmApprovalDossier}
      />
    </div>
  )
}
