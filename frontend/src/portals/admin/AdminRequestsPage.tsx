import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ShieldCheck, CheckCircle, CheckCircle2, XCircle, RotateCcw, Clock,
  FileText, Check, X, AlertCircle, ArrowUpRight, Search,
  Filter, Calendar, Building, User, Layers, Printer,
  Eye, ChevronRight, HelpCircle, AlertTriangle, CheckSquare,
  DollarSign, TrendingUp, Sparkles, Tag, Shield
} from 'lucide-react'
import { useManagerData, ProcurementRequest, TicketProduct, ApprovalParameters } from '../../context/ManagerDataContext'
import { useActivity, UnreadBadge } from '../../context/ActivityContext'
import { TrackingStepper } from '../../components/portal/TrackingStepper'
import { RequestDetailsModal } from '../../components/portal/RequestDetailsModal'
import { RequestApprovalModal } from '../../components/portal/RequestApprovalModal'
import { DocumentPdfViewerModal } from '../../components/portal/DocumentPdfViewerModal'
import { getWorkflowProgression } from '../../utils/workflowUtils'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

const priorityColors: Record<string, string> = {
  Critical: 'bg-rose-100 text-rose-900 border-rose-300 font-black shadow-2xs',
  High: 'bg-amber-100 text-amber-900 border-amber-300 font-black shadow-2xs',
  Medium: 'bg-blue-100 text-blue-900 border-blue-300 font-black shadow-2xs',
  Low: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black shadow-2xs',
}

// 13 Procurement Stages
const PROCUREMENT_STAGES = [
  { id: 1, title: 'Create Request' },
  { id: 2, title: 'Manager Approval' },
  { id: 3, title: 'Finance Approval' },
  { id: 4, title: 'Admin Final Approval' },
  { id: 5, title: 'RFQ Sent' },
  { id: 6, title: 'Vendor Quotes Received' },
  { id: 7, title: 'Vendor Comparison' },
  { id: 8, title: 'Vendor Selection' },
  { id: 9, title: 'Purchase Order' },
  { id: 10, title: 'Delivery' },
  { id: 11, title: 'Goods Receipt (GRN)' },
  { id: 12, title: 'Invoice' },
  { id: 13, title: 'Payment & Completed' },
]

export type FilterStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'ALL'

export const AdminRequestsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { isUnread, markAsRead } = useActivity()
  const {
    allRequests,
    adminApproveRequest,
    adminRejectRequest,
    adminReturnRequest,
    purchaseOrders,
    payments,
    budgets,
    tickets
  } = useManagerData()

  // Tab Filter State: Pending | Approved | Rejected | Returned | All
  const initialTab = (searchParams.get('status') || searchParams.get('tab') || 'PENDING').toUpperCase() as FilterStatus
  const validInitialTab: FilterStatus = ['PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'ALL'].includes(initialTab)
    ? initialTab
    : 'PENDING'

  const [statusFilter, setStatusFilter] = useState<FilterStatus>(validInitialTab)

  // Secondary Filters
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')

  // Modals
  const [viewReq, setViewReq] = useState<ProcurementRequest | null>(null)
  const [trackingReq, setTrackingReq] = useState<ProcurementRequest | null>(null)
  const [viewModalDoc, setViewModalDoc] = useState<{
    docType: 'productOrder' | 'goodsReceipt' | 'invoice'
    product: TicketProduct
  } | null>(null)

  // Products belonging to the current tracking request
  const matchedTicketProducts = useMemo(() => {
    if (!trackingReq) return []
    const ticket = tickets?.find(t => t.requestId === trackingReq.id || t.id === trackingReq.id)
    return ticket?.products || []
  }, [trackingReq, tickets])
  const [rejectModalReq, setRejectModalReq] = useState<ProcurementRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [returnModalReq, setReturnModalReq] = useState<ProcurementRequest | null>(null)
  const [returnFeedback, setReturnFeedback] = useState('')

  // Approve Modal State (Confirm Financial Approval popup matching screenshot)
  const [approveModalReq, setApproveModalReq] = useState<ProcurementRequest | null>(null)
  const [approvalNote, setApprovalNote] = useState('')

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleFilterChange = (filter: FilterStatus) => {
    setStatusFilter(filter)
    setSearchParams({ status: filter.toLowerCase() })
  }

  // Segmented request lists - strictly single active stage for Admin
  const pendingRequests = useMemo(() => {
    return allRequests.filter(r => {
      return r.status === 'recommended_to_admin' || r.financeStatus === 'Recommended to Admin'
    })
  }, [allRequests])

  const approvedRequests = useMemo(() => {
    return allRequests.filter(r => {
      return (
        r.status === 'payment_pending' ||
        r.status === 'completed' ||
        r.financeStatus === 'Admin Approved' ||
        r.financeStatus === 'Admin Approved - Queued for Payment' ||
        r.financeStatus === 'Completed' ||
        (r.status === 'approved' && Boolean(r.approvedBy?.includes('Admin')))
      )
    })
  }, [allRequests])

  const rejectedRequests = useMemo(() => {
    return allRequests.filter(r => {
      return r.status.includes('rejected') || Boolean(r.financeStatus?.includes('Rejected'))
    })
  }, [allRequests])

  const returnedRequests = useMemo(() => {
    return allRequests.filter(r => {
      return r.status === 'clarification_requested' || Boolean(r.financeStatus?.includes('Returned'))
    })
  }, [allRequests])

  // Base list depending on statusFilter
  const baseList = useMemo(() => {
    if (statusFilter === 'PENDING') return pendingRequests
    if (statusFilter === 'APPROVED') return approvedRequests
    if (statusFilter === 'REJECTED') return rejectedRequests
    if (statusFilter === 'RETURNED') return returnedRequests
    return allRequests
  }, [statusFilter, pendingRequests, approvedRequests, rejectedRequests, returnedRequests, allRequests])

  // Department options
  const departments = useMemo(() => {
    const s = new Set<string>()
    allRequests.forEach(r => { if (r.department) s.add(r.department) })
    return ['ALL', ...Array.from(s)]
  }, [allRequests])

  // Filtered list with search, department, and priority filters
  const filteredRequests = useMemo(() => {
    return baseList.filter(r => {
      const q = search.toLowerCase()
      const matchesSearch =
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        (r.requester || '').toLowerCase().includes(q) ||
        (r.department || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q)

      const matchesDept = deptFilter === 'ALL' || r.department === deptFilter
      const matchesPriority = priorityFilter === 'ALL' || r.priority === priorityFilter

      return matchesSearch && matchesDept && matchesPriority
    })
  }, [baseList, search, deptFilter, priorityFilter])

  // Helper to determine stage number (1 to 13)
  const getStageNumber = (r: ProcurementRequest): number => {
    if (r.paymentStatus === 'Paid') return 13
    if (r.status === 'rejected' || r.financeStatus?.includes('Rejected')) return 4
    if (r.status === 'clarification_requested') return 3
    if (r.status === 'recommended_to_admin') return 4
    if (r.status === 'finance_approved' || r.financeStatus === 'Admin Approved') {
      const hasPO = purchaseOrders.some(p => p.requestId === r.id)
      if (!hasPO) return 5
      const po = purchaseOrders.find(p => p.requestId === r.id)
      if (po?.status === 'Delivered') return 11
      if (po?.status === 'Partially Delivered') return 10
      return 9
    }
    if (r.status === 'approved') return 3
    if (r.status === 'pending_approval') return 2
    return 1
  }

  // Action handlers
  const openApproveModal = (r: ProcurementRequest) => {
    setApproveModalReq(r)
    setApprovalNote('')
  }

  const handleConfirmApprovalDossier = (params: ApprovalParameters) => {
    if (!approveModalReq) return
    adminApproveRequest(
      approveModalReq.id,
      params.approvalComments || 'Verified within Q3 budget cap. Authorized for PO release.',
      'Executive Administrator'
    )
    showToast(`✓ Request ${approveModalReq.id} approved with executive authority!`, 'success')
    setApproveModalReq(null)
    setApprovalNote('')
  }

  const handleApprove = (r: ProcurementRequest) => {
    adminApproveRequest(r.id, approvalNote.trim() || 'Verified within Q3 budget cap. Authorized for PO release.', 'Executive Administrator')
    showToast(`✓ Request ${r.id} approved with executive authority!`, 'success')
    setApproveModalReq(null)
    setApprovalNote('')
  }

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectModalReq) return
    if (!rejectReason.trim()) {
      showToast('Rejection reason is required', 'error')
      return
    }
    adminRejectRequest(rejectModalReq.id, rejectReason)
    showToast(`✕ Request ${rejectModalReq.id} rejected by Admin.`, 'error')
    setRejectModalReq(null)
    setRejectReason('')
  }

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!returnModalReq) return
    if (!returnFeedback.trim()) {
      showToast('Feedback notes are required', 'error')
      return
    }
    adminReturnRequest(returnModalReq.id, returnFeedback)
    showToast(`↩ Request ${returnModalReq.id} returned for clarification.`, 'info')
    setReturnModalReq(null)
    setReturnFeedback('')
  }

  // Export CSV
  const handleExportCSV = () => {
    if (filteredRequests.length === 0) return
    const headers = ['Request ID', 'Title', 'Requester', 'Department', 'Date', 'Amount', 'Priority', 'Status']
    const rows = filteredRequests.map(r => [
      `"${r.id}"`,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.requester}"`,
      `"${r.department}"`,
      `"${r.date}"`,
      r.amount,
      `"${r.priority}"`,
      `"${r.financeStatus || r.status}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `admin_requests_${statusFilter.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Requests report exported successfully.', 'info')
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 text-white animate-fadeIn ${
            toast.type === 'success'
              ? 'bg-emerald-600'
              : toast.type === 'error'
              ? 'bg-rose-600'
              : 'bg-indigo-600'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header with Filters on the Right Side (Finance Portal Style) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
              <ShieldCheck size={12} /> ADMIN APPROVAL
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {statusFilter === 'PENDING' && `${pendingRequests.length} Requests Awaiting Admin Sign-off`}
              {statusFilter === 'APPROVED' && `${approvedRequests.length} Approved Requests`}
              {statusFilter === 'REJECTED' && `${rejectedRequests.length} Disapproved Requests`}
              {statusFilter === 'RETURNED' && `${returnedRequests.length} Clarification Requests`}
              {statusFilter === 'ALL' && `${allRequests.length} Total Enterprise Requisitions`}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Shield className="text-indigo-600" size={26} /> Admin Requests
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Executive oversight, authorization thresholds, multi-department requisitions, and 13-stage lifecycle tracking.
          </p>
        </div>

        {/* Right-Side Status Filters (All, Pending, Approval, Rejects, Returned) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 flex-wrap sm:flex-nowrap">
          {/* All — first */}
          <button
            onClick={() => handleFilterChange('ALL')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Layers size={14} />
            <span>All</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {allRequests.length}
            </span>
          </button>

          {/* Pending */}
          <button
            onClick={() => handleFilterChange('PENDING')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
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
              {pendingRequests.length}
            </span>
          </button>

          {/* Approval */}
          <button
            onClick={() => handleFilterChange('APPROVED')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
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
              {approvedRequests.length}
            </span>
          </button>

          {/* Rejects */}
          <button
            onClick={() => handleFilterChange('REJECTED')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <XCircle size={14} />
            <span>Rejects</span>
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

          {/* Returned */}
          <button
            onClick={() => handleFilterChange('RETURNED')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'RETURNED'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <RotateCcw size={14} />
            <span>Returned</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                statusFilter === 'RETURNED'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {returnedRequests.length}
            </span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by Request ID, Title, Requester, Department, Category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Building size={14} className="text-slate-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === 'ALL' ? 'All Departments' : d}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Filter size={14} className="text-slate-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Export Report */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all"
            title="Export CSV"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Requests Feed (Finance Portal Style) */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-2xs">
            {statusFilter === 'PENDING' && (
              <>
                <CheckCircle size={48} className="mx-auto mb-3 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-800">All Admin Approvals Cleared</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  No requests currently require Admin executive review. Incoming requests escalated by Finance or Department Managers will appear here in real time.
                </p>
              </>
            )}
            {statusFilter === 'APPROVED' && (
              <>
                <FileText size={48} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-base font-bold text-slate-800">No Approved Requests Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Procurement requests authorized by Super Admin or Finance will be archived here with full payment and audit status.
                </p>
              </>
            )}
            {statusFilter === 'REJECTED' && (
              <>
                <CheckCircle size={48} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-base font-bold text-slate-800">No Rejected Requests Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  No procurement requisitions have been disapproved by the Administrative leadership team.
                </p>
              </>
            )}
            {statusFilter === 'RETURNED' && (
              <>
                <RotateCcw size={48} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-base font-bold text-slate-800">No Clarification Requests</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  No requisitions are currently pending department clarification or revised documentation.
                </p>
              </>
            )}
            {statusFilter === 'ALL' && (
              <>
                <FileText size={48} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-base font-bold text-slate-800">No Requests Match Criteria</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Try adjusting your search terms, department selection, or priority filters.
                </p>
              </>
            )}
          </div>
        ) : (
          filteredRequests.map((req: ProcurementRequest) => {
            const prog = getWorkflowProgression({
              status: req.status,
              financeStatus: req.financeStatus,
              category: req.category,
              title: req.title,
              paymentStatus: req.paymentStatus,
            })
            const currentStage = prog.currentStageIndex + 1
            const totalStages = prog.totalStages
            const isApproved = statusFilter === 'APPROVED' || req.status === 'approved' || req.status === 'finance_approved' || req.financeStatus === 'Admin Approved'
            const isRejected = statusFilter === 'REJECTED' || req.status === 'rejected' || req.status === 'finance_rejected' || Boolean(req.financeStatus?.includes('Rejected'))
            const isReturned = statusFilter === 'RETURNED' || req.status === 'clarification_requested' || Boolean(req.financeStatus?.includes('Returned'))
            const isPendingFinal = req.status === 'recommended_to_admin' || req.financeStatus === 'Recommended to Admin'

            // Matched budget for live budget availability check
            const matchedBudget = budgets?.find(
              (b) => b.department === req.department && b.category.includes(req.category)
            ) || budgets?.find((b) => b.department === req.department)
            const budgetAvailable = matchedBudget ? matchedBudget.available : 1250000

            const isNew = isPendingFinal && isUnread(req.id)

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
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-md border ${
                          priorityColors[req.priority] || priorityColors.Low
                        }`}
                      >
                        {req.priority} Priority
                      </span>

                      {/* Status Tag */}
                      {isApproved ? (
                        <span className="text-[10px] font-black text-emerald-900 bg-emerald-100 px-3 py-0.5 rounded-full border border-emerald-300 shadow-2xs flex items-center gap-1">
                          <CheckCircle size={11} /> {req.financeStatus || 'Admin Approved'}
                        </span>
                      ) : isRejected ? (
                        <span className="text-[10px] font-black text-rose-900 bg-rose-100 px-3 py-0.5 rounded-full border border-rose-300 shadow-2xs flex items-center gap-1">
                          <XCircle size={11} /> {req.financeStatus || 'Rejected'}
                        </span>
                      ) : isReturned ? (
                        <span className="text-[10px] font-black text-orange-950 bg-orange-100 px-3 py-0.5 rounded-full border border-orange-300 shadow-2xs flex items-center gap-1">
                          <RotateCcw size={11} /> Returned for Clarification
                        </span>
                      ) : isPendingFinal ? (
                        <span className="text-[10px] font-black text-purple-950 bg-purple-100 px-3 py-0.5 rounded-full border border-purple-300 shadow-2xs flex items-center gap-1 animate-pulse">
                          <ArrowUpRight size={11} /> Recommended to Admin
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-amber-900 bg-amber-100 px-3 py-0.5 rounded-full border border-amber-300 shadow-2xs flex items-center gap-1">
                          <Clock size={11} /> Awaiting Sign-off
                        </span>
                      )}

                      {/* Capex / High-Value Indicator */}
                      {req.amount > 500000 && (
                        <span className="text-[10px] font-black text-indigo-900 bg-indigo-100 px-2.5 py-0.5 rounded-md border border-indigo-300 shadow-2xs flex items-center gap-1">
                          <Sparkles size={11} /> Capex &gt; ₹5L
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{req.title}</h3>
                    <p className="text-xs text-slate-600 font-medium">
                      Requester: <b className="text-slate-950 font-bold">{req.requester}</b> • Department:{' '}
                      <b className="text-slate-950 font-bold">{req.department}</b> • Category:{' '}
                      <b className="text-slate-950 font-bold">{req.category}</b> • Date: <b className="text-indigo-900 font-bold">{req.date}</b>
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0 bg-slate-50 border border-slate-200 p-3 sm:py-2.5 sm:px-4 rounded-xl shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">
                      Requested Amount
                    </span>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">{fmt(req.amount)}</p>
                  </div>
                </div>

                {/* Details Grid (Matching Finance Portal) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                  {/* Column 1: Approval Endorsement / Authority */}
                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold block uppercase text-[10px]">
                      {isApproved ? 'Executive Authorization' : isRejected ? 'Disapproved By' : isReturned ? 'Returned By' : 'Approval Chain'}
                    </span>
                    <div className="flex items-center gap-1.5 font-bold">
                      {isApproved ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle size={14} /> Executive Administrator (Signed off)
                        </span>
                      ) : isRejected ? (
                        <span className="text-rose-700 flex items-center gap-1">
                          <XCircle size={14} /> Disapproved with Audit Log
                        </span>
                      ) : isReturned ? (
                        <span className="text-orange-700 flex items-center gap-1">
                          <RotateCcw size={14} /> Returned to Department Requester
                        </span>
                      ) : isPendingFinal ? (
                        <span className="text-purple-700 flex items-center gap-1">
                          <ArrowUpRight size={14} /> Endorsed by Mark Finance Officer
                        </span>
                      ) : (
                        <span className="text-amber-700 flex items-center gap-1">
                          <Clock size={14} /> Operational Endorsement Pending
                        </span>
                      )}
                    </div>
                    {req.recommendationReason && (
                      <p className="text-[11px] text-purple-700 italic bg-purple-50 p-1.5 rounded border border-purple-100 mt-1">
                        "{req.recommendationReason}"
                      </p>
                    )}
                  </div>

                  {/* Column 2: Budget Headroom or Rationale */}
                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold block uppercase text-[10px]">
                      {isApproved ? 'Procurement Status' : isRejected ? 'Audit Rationale' : isReturned ? 'Feedback Note' : 'Live Budget Check'}
                    </span>
                    {isApproved ? (
                      <div className="text-slate-700">
                        <span className="font-semibold text-emerald-700">Clear for PO Issuance</span>
                        <p className="text-[11px] text-slate-500">Ready for vendor RFQ &amp; commercial dispatch</p>
                      </div>
                    ) : isRejected ? (
                      <p className="text-[11px] text-rose-700 italic">
                        {req.rejectionReason || 'Disapproved by administrative governance.'}
                      </p>
                    ) : isReturned ? (
                      <p className="text-[11px] text-orange-700 italic">
                        {req.clarificationMessage || 'Additional documentation and cost justification required.'}
                      </p>
                    ) : (
                      <div>
                        <span className="font-semibold text-slate-800">Available: {fmt(budgetAvailable)}</span>
                        <p className="text-[11px] text-emerald-600 font-medium">✓ Budget headroom verified</p>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Dynamic Lifecycle Progress */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold block uppercase text-[10px]">
                        Lifecycle Stage
                      </span>
                      <span className="text-[11px] font-bold text-indigo-700">
                        Stage {currentStage} / {totalStages} ({prog.workflowType === 'SOFTWARE' ? 'Software' : 'Hardware'})
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isRejected ? 'bg-rose-500' : isApproved ? 'bg-emerald-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.round((currentStage / totalStages) * 100))}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      {prog.currentStageName}
                    </p>
                  </div>
                </div>

                {/* Bottom Row: Actions Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-400">
                    ID: <span className="font-mono text-slate-600 font-bold">{req.id}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    {/* Actions for Pending Requests */}
                    {(!isApproved && !isRejected && !isReturned) && (
                      <>
                        <button
                          onClick={() => openApproveModal(req)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                        >
                          <CheckCircle size={14} /> Approve Request
                        </button>

                        <button
                          onClick={() => {
                            setRejectModalReq(req)
                            setRejectReason('')
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-all"
                        >
                          <XCircle size={14} /> Reject
                        </button>


                      </>
                    )}

                    {/* Dynamic Stage Lifecycle Tracker Modal Trigger */}
                    <button
                      onClick={() => setTrackingReq(req)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition-all"
                    >
                      <Eye size={14} /> Track ({totalStages}-Stage)
                    </button>

                    {/* View Details Drawer */}
                    <button
                      onClick={() => setViewReq(req)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal 1: Request Progress Tracking Stepper */}
      {trackingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-900 to-indigo-900 text-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-200 block">
                  Request Progress Tracking
                </span>
                <h3 className="text-base font-bold">
                  Tracking: {trackingReq.title} ({trackingReq.id})
                </h3>
              </div>
              <button
                onClick={() => setTrackingReq(null)}
                className="p-1 rounded-lg text-purple-200 hover:text-white hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Department / Requester</span>
                  <strong className="text-slate-800">{trackingReq.department} • {trackingReq.requester}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase">Requisition Value</span>
                  <strong className="text-slate-900 font-bold text-sm">{fmt(trackingReq.amount)}</strong>
                </div>
              </div>

              <TrackingStepper
                category={trackingReq.category}
                title={trackingReq.title}
                status={trackingReq.status}
                financeStatus={trackingReq.financeStatus}
                paymentStatus={trackingReq.paymentStatus}
                lastUpdated={trackingReq.date}
                history={trackingReq.history}
              />

              {/* Product-Level Tracking & Multi-Receipt Lifecycle */}
              {matchedTicketProducts && matchedTicketProducts.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Multi-Product Delivery & Receipt Audit
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {matchedTicketProducts.length} Products Tracked
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">
                        Procurement Products & Distinct Receipt Lifecycle
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Independent verification of distinct Purchase Orders, Goods Receipts (GRN), and Tax Invoices per product.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {matchedTicketProducts.map((prod, idx) => {
                      const grnVerified = prod.goodsReceipt.verified
                      const invVerified = prod.invoice.verified
                      const allDocsVerified = grnVerified && invVerified
                      const isPaid = prod.paymentSettled || trackingReq.paymentStatus === 'Paid' || trackingReq.status === 'completed'

                      return (
                        <div key={prod.id || idx} className="bg-slate-50/60 rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
                          {/* Product Info Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[11px] font-extrabold text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded shadow-2xs">
                                  {prod.id}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700">
                                  {prod.category || 'Hardware'}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                  Qty: <b className="text-slate-800 font-bold">{prod.quantity} {prod.unit}</b>
                                </span>
                              </div>
                              <h5 className="text-sm font-bold text-slate-900 mt-1">
                                {prod.name}
                              </h5>
                              <p className="text-[11px] text-slate-500">
                                Vendor: <b className="text-slate-800 font-semibold">{prod.vendor}</b> • Rate: {fmt(prod.pricePerUnit)}/unit
                              </p>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase">Product Total</span>
                              <p className="text-base font-black text-slate-900">{fmt(prod.totalAmount)}</p>
                            </div>
                          </div>

                          {/* Distinct 3-Way Receipts Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* 1. Purchase Order */}
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                  Purchase Order
                                </span>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  Issued
                                </span>
                              </div>
                              <div>
                                <p className="font-mono text-xs font-bold text-slate-900">{prod.productOrder.id}</p>
                                <p className="text-[10px] text-slate-500">Date: {prod.productOrder.date || trackingReq.date}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setViewModalDoc({ docType: 'productOrder', product: prod })}
                                className="w-full flex items-center justify-center gap-1 py-1.5 px-2.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                              >
                                <Eye size={12} /> View PO Document
                              </button>
                            </div>

                            {/* 2. Goods Receipt (GRN) */}
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                  Goods Receipt
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  grnVerified ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'
                                }`}>
                                  {grnVerified ? 'Verified' : 'Under Review'}
                                </span>
                              </div>
                              <div>
                                <p className="font-mono text-xs font-bold text-slate-900">{prod.goodsReceipt.id}</p>
                                <p className="text-[10px] text-slate-500">Received: {prod.goodsReceipt.receivedQty || prod.quantity} {prod.unit}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setViewModalDoc({ docType: 'goodsReceipt', product: prod })}
                                className="w-full flex items-center justify-center gap-1 py-1.5 px-2.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                              >
                                <Eye size={12} /> View GRN Receipt
                              </button>
                            </div>

                            {/* 3. Tax Invoice */}
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                                  Tax Invoice
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  invVerified ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'
                                }`}>
                                  {invVerified ? 'Verified' : 'Under Audit'}
                                </span>
                              </div>
                              <div>
                                <p className="font-mono text-xs font-bold text-slate-900">{prod.invoice.id}</p>
                                <p className="text-[10px] text-slate-500">Amount: {fmt(prod.invoice.invoiceAmount || prod.totalAmount)}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setViewModalDoc({ docType: 'invoice', product: prod })}
                                className="w-full flex items-center justify-center gap-1 py-1.5 px-2.5 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors cursor-pointer"
                              >
                                <Eye size={12} /> View Tax Invoice
                              </button>
                            </div>
                          </div>

                          {/* Verification & Settlement Status Banner (Exact Match to User Screenshot) */}
                          <div className={`rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
                            isPaid
                              ? 'bg-emerald-50/90 border-emerald-300'
                              : allDocsVerified
                              ? 'bg-emerald-50/60 border-emerald-200'
                              : 'bg-amber-50/70 border-amber-200'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl flex-shrink-0 ${
                                isPaid || allDocsVerified
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-700 border border-amber-300'
                              }`}>
                                <ShieldCheck size={18} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">
                                  {prod.name} Verification Status
                                </p>
                                <p className="text-[11px] text-slate-600 mt-0.5">
                                  {isPaid
                                    ? 'Both documents (Goods Receipt and Invoice) verified. You can now submit this product for treasury payment.'
                                    : allDocsVerified
                                    ? 'Both documents (Goods Receipt and Invoice) verified. You can now submit this product for treasury payment.'
                                    : `Goods Receipt = ${grnVerified ? 'Verified' : 'Pending'}, Invoice = ${invVerified ? 'Verified' : 'Pending'}`}
                                </p>
                              </div>
                            </div>

                            <div>
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                                  <CheckCircle2 size={13} className="text-emerald-700" /> Payment Settled (Paid)
                                </span>
                              ) : allDocsVerified ? (
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs">
                                  <CheckCircle2 size={13} className="text-blue-700" /> Verified — Ready for Payment
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                  <Clock size={13} className="text-amber-700" /> Pending Verification
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setTrackingReq(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-300 transition-all cursor-pointer"
              >
                Close Tracking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Full Create Purchase Request Form + Product Details */}
      <RequestDetailsModal
        isOpen={!!viewReq}
        request={viewReq}
        onClose={() => setViewReq(null)}
        onApprove={(req) => {
          const isPendingAdmin = req.status === 'recommended_to_admin' || req.financeStatus === 'Recommended to Admin'
          if (isPendingAdmin) {
            handleApprove(req)
          }
          setViewReq(null)
        }}
        onReject={(req) => {
          setViewReq(null)
          setRejectModalReq(req)
        }}
        recommendLabel="Approve & Finalize"
      />

      {/* Modal 3: Reject Modal */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 text-xs space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <XCircle size={20} /> Reject Request {rejectModalReq.id}
            </div>
            <p className="text-slate-600">
              Please provide a clear administrative rejection reason for the audit trail:
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Budget ceiling reached in FY2026 Capex pool or alternative vendor solution required..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-800"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalReq(null)}
                  className="px-4 py-2 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Return for Clarification */}
      {returnModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 text-xs space-y-4">
            <div className="flex items-center gap-2 text-orange-600 font-bold text-sm">
              <RotateCcw size={20} /> Return Request {returnModalReq.id} for Clarification
            </div>
            <p className="text-slate-600">
              Specify what additional documentation or cost justification is required:
            </p>
            <form onSubmit={handleReturnSubmit} className="space-y-3">
              <textarea
                required
                rows={3}
                value={returnFeedback}
                onChange={e => setReturnFeedback(e.target.value)}
                placeholder="e.g. Please attach updated 3rd party vendor quotation and SLA risk analysis before executive sign-off..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-slate-800"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnModalReq(null)}
                  className="px-4 py-2 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Return Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal 5: Document PDF Viewer */}
      {viewModalDoc && (
        <DocumentPdfViewerModal
          document={{
            key: viewModalDoc.docType,
            id: viewModalDoc.product[viewModalDoc.docType].id,
            title: viewModalDoc.product.name,
            subtitle: `${viewModalDoc.product.quantity} ${viewModalDoc.product.unit} • ${viewModalDoc.product.vendor}`,
            vendor: viewModalDoc.product.vendor,
            date: viewModalDoc.product[viewModalDoc.docType].date || viewModalDoc.product[viewModalDoc.docType].receivedDate || viewModalDoc.product[viewModalDoc.docType].invoiceDate || trackingReq?.date || '2026-09-18',
            amount: viewModalDoc.product.totalAmount,
            verified: viewModalDoc.product[viewModalDoc.docType].verified,
            verifiedBy: viewModalDoc.product[viewModalDoc.docType].verifiedBy,
            verifiedAt: viewModalDoc.product[viewModalDoc.docType].verifiedAt,
            gstNumber: viewModalDoc.product.invoice.gstNumber,
            taxAmount: viewModalDoc.product.invoice.taxAmount,
            receivedQty: viewModalDoc.product.goodsReceipt.receivedQty,
            acceptedQty: viewModalDoc.product.goodsReceipt.acceptedQty,
            unit: viewModalDoc.product.unit,
            productDetails: viewModalDoc.product[viewModalDoc.docType].productDetails || `${viewModalDoc.product.quantity}x ${viewModalDoc.product.name}`
          }}
          onClose={() => setViewModalDoc(null)}
        />
      )}
      {/* Structured Executive Request Approval Dossier Modal (Image 2) */}
      <RequestApprovalModal
        isOpen={!!approveModalReq}
        request={approveModalReq}
        portalType="ADMIN"
        approverName="Executive Administrator"
        onClose={() => setApproveModalReq(null)}
        onConfirm={handleConfirmApprovalDossier}
      />
    </div>
  )
}
