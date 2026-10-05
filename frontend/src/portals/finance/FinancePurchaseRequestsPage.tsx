import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  FileText, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight,
  Eye, CheckCircle2, CheckCircle, Clock, AlertTriangle, ArrowUpRight, CheckSquare, XCircle, X
} from 'lucide-react'
import { useFinanceData, ProcurementRequest, ApprovalParameters } from '../../context/ManagerDataContext'
import { RequestApprovalModal } from '../../components/portal/RequestApprovalModal'
import { RequestTypeFilter } from '../../components/portal/RequestTypeFilter'
import { isSoftwareRequest, isHardwareRequest, sortRequestsNewestFirst } from '../../utils/workflowUtils'
import { useAuth } from '../../context/AuthContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export const FinancePurchaseRequestsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { allRequests, financeRequests, refreshData, approveFinanceRequest } = useFinanceData()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    refreshData?.()
  }, [refreshData])

  const actorName = user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Finance Officer'

  // State
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [deptFilter, setDeptFilter] = useState(searchParams.get('dept') || 'ALL')
  const [requestType, setRequestType] = useState<'all' | 'software' | 'hardware'>('all')

  // Approval modal state (Image 2)
  const [approveModalReq, setApproveModalReq] = useState<ProcurementRequest | null>(null)
  const [approvalNote, setApprovalNote] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleConfirmApproval = (params: ApprovalParameters) => {
    if (!approveModalReq) return
    const isAlreadyApp = Boolean(
      approveModalReq.financeStatus === 'Approved' ||
      approveModalReq.status === 'approved' ||
      approveModalReq.status === 'finance_approved' ||
      (approveModalReq.currentStage !== undefined && approveModalReq.currentStage >= 4) ||
      approveModalReq.status === 'quotes_received' ||
      approveModalReq.status === 'assigned_to_vendor' ||
      approveModalReq.status === 'delivered' ||
      approveModalReq.status === 'invoiced' ||
      approveModalReq.status === 'completed' ||
      approveModalReq.financeApprovedBy ||
      approveModalReq.financeApprovedDate
    )
    if (isAlreadyApp) {
      showToast(`Request ${approveModalReq.id} is already approved.`, 'error')
      setApproveModalReq(null)
      return
    }
    approveFinanceRequest(
      approveModalReq.id,
      params.approvalComments || 'Verified within budget allocation. Authorized for PO release.',
      actorName
    )
    showToast(`✓ Request ${approveModalReq.id} approved! Forwarded for PO release.`, 'success')
    setApproveModalReq(null)
    setApprovalNote('')
  }

  useEffect(() => {
    const s = searchParams.get('search')
    if (s !== null) setSearch(s)
    const d = searchParams.get('dept')
    if (d !== null) setDeptFilter(d)
  }, [searchParams])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [sortField, setSortField] = useState<'date' | 'amount'>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number | 'ALL'>('ALL')

  // Departments list for dropdown
  const departments: string[] = useMemo(() => {
    return Array.from(new Set(allRequests.map((r) => r.department || ''))).filter(Boolean)
  }, [allRequests])

  // Segmented filter counts
  const softwareCount = useMemo(() => allRequests.filter(r => isSoftwareRequest(r)).length, [allRequests])
  const hardwareCount = useMemo(() => allRequests.filter(r => isHardwareRequest(r)).length, [allRequests])

  // Filtered & Sorted List
  const filteredRequests = useMemo(() => {
    const q = (search || '').toLowerCase().trim()
    const matching = allRequests
      .filter((r) => {
        const matchesSearch =
          !q ||
          String(r.id || '').toLowerCase().includes(q) ||
          String(r.title || '').toLowerCase().includes(q) ||
          String(r.requester || '').toLowerCase().includes(q) ||
          String(r.department || '').toLowerCase().includes(q)

        const matchesDept = deptFilter === 'ALL' || r.department === deptFilter
        const matchesPriority = priorityFilter === 'ALL' || r.priority === priorityFilter
        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'Pending' && (r.status.includes('pending') || r.status.includes('finance_review') || r.status.includes('sent_to_finance') || r.financeStatus === 'Awaiting Finance Action')) ||
          (statusFilter === 'Approved' && (
            r.status === 'approved' ||
            r.status === 'finance_approved' ||
            r.status === 'payment_approved' ||
            r.status === 'payment_justification_submitted' ||
            r.status === 'payment_justified' ||
            r.status === 'payment_completed' ||
            r.status === 'completed' ||
            r.financeStatus === 'Approved' ||
            r.financeStatus === 'Paid' ||
            r.financeStatus === 'Completed' ||
            ['FINANCE_APPROVED', 'PAYMENT_APPROVED', 'PAYMENT_PROCESSED', 'PAYMENT_JUSTIFICATION_SUBMITTED', 'PAYMENT_JUSTIFIED', 'PAYMENT_COMPLETED', 'COMPLETED', 'TEAM_LEAD_CONFIRMED'].includes((r as any).raw_status || '')
          )) ||
          (statusFilter === 'Rejected' && (r.status === 'rejected' || r.status === 'finance_rejected' || r.financeStatus === 'Rejected'))

        const matchesType = requestType === 'all'
          ? true
          : requestType === 'software'
          ? isSoftwareRequest(r)
          : isHardwareRequest(r)

        return matchesSearch && matchesDept && matchesPriority && matchesStatus && matchesType
      })

    if (sortField === 'date' && !sortAsc) {
      return sortRequestsNewestFirst(matching)
    }

    return matching.sort((a, b) => {
      if (sortField === 'amount') {
        return sortAsc ? a.amount - b.amount : b.amount - a.amount
      } else {
        const timeA = new Date((a as any).createdAt || (a as any).created_at || a.date || 0).getTime()
        const timeB = new Date((b as any).createdAt || (b as any).created_at || b.date || 0).getTime()
        if (timeB !== timeA) return sortAsc ? timeA - timeB : timeB - timeA
        return String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
      }
    })
  }, [allRequests, search, deptFilter, priorityFilter, statusFilter, requestType, sortField, sortAsc])

  // Pagination slice — when pageSize is ALL, all records are displayed
  const actualPageSize = pageSize === 'ALL' ? (filteredRequests.length || 1) : pageSize
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / actualPageSize))
  const paginatedRequests = pageSize === 'ALL'
    ? filteredRequests
    : filteredRequests.slice((currentPage - 1) * actualPageSize, currentPage * actualPageSize)

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              LEDGER AUDIT
            </span>
            <span className="text-xs text-slate-400 font-medium">{financeRequests.length} Total Enterprise Requests</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Finance Purchase Requests
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full visibility into procurement requisitions across all departments, tracking manager endorsements and finance decisions.
          </p>
        </div>

        <button
          onClick={() => navigate('/portal/finance/pending-approvals')}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all w-fit"
        >
          <CheckSquare size={14} />
          Review Pending Approvals
        </button>
      </div>

      {/* Request Type Segmented Filter */}
      <div className="flex items-center justify-between">
        <RequestTypeFilter
          value={requestType}
          onChange={(newType) => {
            setRequestType(newType)
            setCurrentPage(1)
          }}
          totalCount={allRequests.length}
          softwareCount={softwareCount}
          hardwareCount={hardwareCount}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search by ID, title, requester, dept..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending / In Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Display Mode Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="font-semibold text-slate-700">Display:</span>
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setPageSize('ALL')
                  setCurrentPage(1)
                }}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  pageSize === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Display All Data ({filteredRequests.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setPageSize(8)
                  setCurrentPage(1)
                }}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  pageSize === 8
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paginate (8 / page)
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500">
            {pageSize === 'ALL' ? (
              <span className="text-emerald-700 font-bold">
                ✓ Showing all {filteredRequests.length} requests on a single page
              </span>
            ) : (
              <span>Showing {paginatedRequests.length} of {filteredRequests.length} requests</span>
            )}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Request ID</th>
                <th className="p-4">Request Title</th>
                <th className="p-4">Requester</th>
                <th className="p-4">Department</th>
                <th
                  onClick={() => toggleSort('amount')}
                  className="p-4 text-right cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="inline-flex items-center gap-1">
                    Amount
                    <ArrowUpDown size={12} className={sortField === 'amount' ? 'text-indigo-600' : 'text-slate-400'} />
                  </div>
                </th>
                <th className="p-4">Manager Status</th>
                <th className="p-4">Finance Status</th>
                <th className="p-4">Priority</th>
                <th
                  onClick={() => toggleSort('date')}
                  className="p-4 cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="inline-flex items-center gap-1">
                    Created Date
                    <ArrowUpDown size={12} className={sortField === 'date' ? 'text-indigo-600' : 'text-slate-400'} />
                  </div>
                </th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 text-xs">
                    <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                    No purchase requests match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((r) => {
                  const isFinanceApproved = Boolean(
                    r.financeStatus === 'Approved' ||
                    r.status === 'approved' ||
                    r.status === 'finance_approved' ||
                    (r.currentStage !== undefined && r.currentStage >= 4) ||
                    r.status === 'quotes_received' ||
                    r.status === 'assigned_to_vendor' ||
                    r.status === 'delivered' ||
                    r.status === 'invoiced' ||
                    r.status === 'completed' ||
                    r.financeApprovedBy ||
                    r.financeApprovedDate
                  )
                  const isFinanceRejected = Boolean(
                    r.financeStatus === 'Rejected' ||
                    r.status === 'rejected' ||
                    r.status === 'finance_rejected'
                  )
                  const isFinanceHold = Boolean(r.financeStatus === 'On Hold' || r.status === 'finance_on_hold')

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 whitespace-nowrap">
                        <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded shadow-2xs">
                          {r.id}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-900 max-w-xs truncate">
                        {r.title}
                      </td>
                      <td className="p-4 text-slate-700 font-medium whitespace-nowrap">
                        {r.requester}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-bold">
                          {r.department}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-slate-900 whitespace-nowrap">
                        {fmt(r.amount)}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shadow-2xs ${
                            r.status === 'approved' || r.approvedBy
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : r.status === 'rejected'
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          {r.approvedBy ? 'Manager Approved' : r.status === 'rejected' ? 'Manager Rejected' : 'Pending Manager'}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shadow-2xs ${
                            isFinanceApproved
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : isFinanceRejected
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : isFinanceHold
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-purple-100 text-purple-900 border-purple-300'
                          }`}
                        >
                          {r.financeStatus || (r.status.includes('finance') ? 'In Finance Review' : 'Not Escalated')}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black border shadow-2xs ${
                            r.priority === 'Critical'
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : r.priority === 'High'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : r.priority === 'Medium'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}
                        >
                          {r.priority}
                        </span>
                      </td>
                      <td className="p-4 text-slate-700 font-medium whitespace-nowrap">
                        {r.date}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {isFinanceApproved ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-xl shadow-2xs">
                              <CheckCircle2 size={12} className="text-emerald-700" />
                              Finance Approved
                            </span>
                          ) : !isFinanceRejected ? (
                            <button
                              onClick={() => {
                                setApproveModalReq(r)
                                setApprovalNote('')
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl shadow-2xs transition-all cursor-pointer"
                            >
                              <CheckCircle2 size={12} />
                              Approve
                            </button>
                          ) : null}
                          <button
                            onClick={() => navigate(`/portal/finance/request-details?id=${r.id}`)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-300 shadow-2xs transition-all cursor-pointer"
                          >
                            <Eye size={12} />
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Display Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              Showing <b className="text-slate-800">{paginatedRequests.length}</b> of{' '}
              <b className="text-slate-800">{filteredRequests.length}</b> requests
            </span>
            {pageSize === 'ALL' ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                All Data Displayed
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPageSize('ALL')
                  setCurrentPage(1)
                }}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline ml-1"
              >
                Display All ({filteredRequests.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Rows Per Page Toggle */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Rows:</span>
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                {[8, 20, 50, 'ALL'].map((size) => (
                  <button
                    key={String(size)}
                    type="button"
                    onClick={() => {
                      setPageSize(size as number | 'ALL')
                      setCurrentPage(1)
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      pageSize === size
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {size === 'ALL' ? 'All Data' : size}
                  </button>
                ))}
              </div>
            </div>

            {/* Pagination Controls when paginated */}
            {pageSize !== 'ALL' && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-semibold text-slate-700 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 text-white animate-fadeIn ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Structured Financial Request Approval Dossier Modal (Image 2) */}
      <RequestApprovalModal
        isOpen={!!approveModalReq}
        request={approveModalReq}
        portalType="FINANCE"
        approverName={actorName}
        onClose={() => setApproveModalReq(null)}
        onConfirm={handleConfirmApproval}
      />
    </div>
  )
}
