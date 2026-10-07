import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  CheckCircle,
  Search,
  Filter,
  Calendar,
  Building2,
  IndianRupee,
  AlertCircle,
  Clock,
  ShieldAlert,
  FileText,
  ChevronRight,
  X,
  Printer,
  ExternalLink,
  Tag,
  HelpCircle,
  TrendingUp,
  UserCheck,
  CheckSquare
} from 'lucide-react'
import { useManagerData, ProcurementRequest, ApprovalParameters } from '../../context/ManagerDataContext'
import { RequestApprovalModal } from '../../components/portal/RequestApprovalModal'
import { RequestTypeFilter } from '../../components/portal/RequestTypeFilter'
import { isSoftwareRequest, isHardwareRequest, sortRequestsNewestFirst } from '../../utils/workflowUtils'
import { useAuth } from '../../context/AuthContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

const priorityColors: Record<string, string> = {
  Critical: 'bg-rose-50 text-rose-700 border-rose-200',
  High: 'bg-orange-50 text-orange-700 border-orange-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low: 'bg-slate-50 text-slate-700 border-slate-200',
}

const isAdminApprovedRequest = (request: ProcurementRequest) => {
  const rawStatus = String((request as any).raw_status || '').toUpperCase()
  const extra = request.extra_fields || request.extraFields || {}
  return rawStatus === 'APPROVED' ||
    rawStatus === 'ADMIN_APPROVED' ||
    request.status === 'admin_approved' ||
    request.financeStatus === 'Admin Approved' ||
    Boolean(extra.admin_approved) ||
    extra.final_approval_by === 'ADMIN' ||
    (!rawStatus && request.status === 'approved' && request.approvalLevel === 'Admin Approved')
}

export const RecommendedToAdminPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { recommendedToAdmin, refreshData, adminApproveRequest } = useManagerData()

  useEffect(() => {
    refreshData?.()
  }, [refreshData])

  const actorName = user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Finance Officer'

  // State
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL')
  const [requestType, setRequestType] = useState<'all' | 'software' | 'hardware'>('all')
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [selectedPriority, setSelectedPriority] = useState('ALL')
  const [selectedReq, setSelectedReq] = useState<ProcurementRequest | null>(null)
  const [approveModalReq, setApproveModalReq] = useState<ProcurementRequest | null>(null)
  const [approvalNote, setApprovalNote] = useState('')
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null)

  // Show Toast Helper
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Department List
  const departments = useMemo(() => {
    const set = new Set<string>()
    recommendedToAdmin.forEach(r => {
      if (r.department) set.add(r.department)
    })
    return ['ALL', ...Array.from(set)]
  }, [recommendedToAdmin])

  // Segmented filter counts
  const softwareCount = useMemo(() => recommendedToAdmin.filter(r => isSoftwareRequest(r)).length, [recommendedToAdmin])
  const hardwareCount = useMemo(() => recommendedToAdmin.filter(r => isHardwareRequest(r)).length, [recommendedToAdmin])

  // KPIs
  const kpis = useMemo(() => {
    const total = recommendedToAdmin.length
    const totalAmount = recommendedToAdmin.reduce((sum, r) => sum + (r.amount || 0), 0)
    const pending = recommendedToAdmin.filter(
      r => r.status === 'recommended_to_admin' || r.financeStatus === 'Recommended to Admin'
    ).length
    const approved = recommendedToAdmin.filter(isAdminApprovedRequest).length

    return { total, totalAmount, pending, approved }
  }, [recommendedToAdmin])

  // Filtered List — sorted strictly newest first
  const filteredList = useMemo(() => {
    const matching = recommendedToAdmin.filter(r => {
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        String(r.id || '').toLowerCase().includes(q) ||
        String(r.title || '').toLowerCase().includes(q) ||
        String(r.requester || '').toLowerCase().includes(q) ||
        String(r.recommendationReason || '').toLowerCase().includes(q) ||
        String(r.department || '').toLowerCase().includes(q)

      const matchesDept = selectedDept === 'ALL' || r.department === selectedDept
      const matchesPriority = selectedPriority === 'ALL' || r.priority === selectedPriority

      const isApproved = isAdminApprovedRequest(r)
      const isPending = (r.status === 'recommended_to_admin' || r.financeStatus === 'Recommended to Admin') && !isApproved

      let matchesTab = true
      if (statusTab === 'PENDING') matchesTab = isPending
      if (statusTab === 'APPROVED') matchesTab = isApproved

      const matchesType = requestType === 'all'
        ? true
        : requestType === 'software'
        ? isSoftwareRequest(r)
        : isHardwareRequest(r)

      return matchesSearch && matchesDept && matchesPriority && matchesTab && matchesType
    })
    return sortRequestsNewestFirst(matching)
  }, [recommendedToAdmin, search, selectedDept, selectedPriority, statusTab, requestType])

  // Admin Approval Handler
  const handleConfirmFinancialDossier = async (params: ApprovalParameters) => {
    if (!approveModalReq) return
    try {
      await adminApproveRequest(
        approveModalReq.id,
        params.approvalComments || 'Ratified and approved by Executive Admin Committee.',
        actorName,
        params.approvedAmount
      )
    } catch (error: any) {
      showToast(error?.response?.data?.detail || error?.message || `Could not approve request ${approveModalReq.id}.`, 'error')
      return
    }
    showToast(`✓ Request ${approveModalReq.id} has been formally approved by Admin.`, 'success')
    if (selectedReq?.id === approveModalReq.id) {
      setSelectedReq({
        ...selectedReq,
        status: 'approved',
        financeStatus: 'Admin Approved',
        approvedBy: actorName,
        approvedDate: new Date().toISOString().split('T')[0],
      })
    }
    setApproveModalReq(null)
    setApprovalNote('')
  }

  const handleAdminApprove = async (req: ProcurementRequest, note?: string) => {
    try {
      await adminApproveRequest(req.id, note || 'Ratified and approved by Executive Admin Committee.', actorName)
    } catch (error: any) {
      showToast(error?.response?.data?.detail || error?.message || `Could not approve request ${req.id}.`, 'error')
      return
    }
    showToast(`✓ Request ${req.id} has been formally approved by Admin.`, 'success')
    if (selectedReq?.id === req.id) {
      setSelectedReq({
        ...selectedReq,
        status: 'approved',
        financeStatus: 'Admin Approved',
        approvedBy: actorName,
        approvedDate: new Date().toISOString().split('T')[0],
      })
    }
    setApproveModalReq(null)
    setApprovalNote('')
  }

  // Export CSV Handler
  const handleExportCSV = () => {
    if (recommendedToAdmin.length === 0) return
    const headers = ['Request ID', 'Title', 'Department', 'Amount', 'Escalation Reason', 'Recommended By', 'Date', 'Admin Status']
    const rows = recommendedToAdmin.map(r => [
      `"${r.id}"`,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.department}"`,
      r.amount,
      `"${(r.recommendationReason || '').replace(/"/g, '""')}"`,
      `"${r.recommendedBy || actorName}"`,
      `"${r.recommendedDate || r.date}"`,
      `"${r.financeStatus || 'Recommended to Admin'}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `recommend_to_admin_requests_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Escalation register downloaded successfully.', 'info')
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 text-white animate-fadeIn ${
            toastMessage.type === 'success' ? 'bg-emerald-600' : toastMessage.type === 'error' ? 'bg-rose-600' : 'bg-indigo-600'
          }`}
        >
          <CheckCircle size={16} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
              <ShieldAlert size={12} /> EXECUTIVE ESCALATIONS
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Governance & Threshold Governance Register
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <ArrowUpRight className="text-purple-600" size={26} />
            Recommend to Admin Requests
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Overview and real-time status of high-value requisitions and policy exceptions recommended by Finance to Admin / Executive Authority.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all"
            title="Download CSV report"
          >
            <Printer size={13} />
            Export CSV
          </button>
          <button
            onClick={() => navigate('/portal/finance/pending-approvals')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all"
          >
            <CheckSquare size={14} />
            Review Pending Approvals
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Escalated */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Escalated to Admin</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{kpis.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Threshold exceptions logged</p>
        </div>

        {/* Total Value */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Escalated Value</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{fmt(kpis.totalAmount)}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">High-capital enterprise commitments</p>
        </div>

        {/* Awaiting Admin */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Awaiting Admin Decision</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold text-amber-600">{kpis.pending}</p>
            {kpis.pending > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                Action Required
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Pending executive committee signature</p>
        </div>

        {/* Admin Approved */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Admin Approved</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{kpis.approved}</p>
          <p className="text-[11px] text-blue-600 font-medium mt-0.5">Ratified & cleared for execution</p>
        </div>
      </div>

      {/* Request Type Segmented Filter */}
      <div className="flex items-center justify-between">
        <RequestTypeFilter
          value={requestType}
          onChange={setRequestType}
          totalCount={recommendedToAdmin.length}
          softwareCount={softwareCount}
          hardwareCount={hardwareCount}
        />
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Requests ({kpis.total})
            </button>
            <button
              onClick={() => setStatusTab('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusTab === 'PENDING'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-300" />
              Awaiting Admin Action ({kpis.pending})
            </button>
            <button
              onClick={() => setStatusTab('APPROVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusTab === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              Admin Approved ({kpis.approved})
            </button>
          </div>

          <div className="text-xs text-slate-400">
            Showing <span className="font-bold text-slate-700">{filteredList.length}</span> of {recommendedToAdmin.length} escalations
          </div>
        </div>

        {/* Search & Select dropdowns */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Request ID, title, requester, reason, or department..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Department:</span>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
            >
              {departments.map(d => (
                <option key={d} value={d}>
                  {d === 'ALL' ? 'All Departments' : d}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Priority:</span>
            <select
              value={selectedPriority}
              onChange={e => setSelectedPriority(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden text-xs">
        {filteredList.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 text-purple-400 flex items-center justify-center mb-3">
              <CheckCircle size={28} />
            </div>
            <h3 className="font-bold text-slate-700 text-sm">No Escalations Found</h3>
            <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
              {search || selectedDept !== 'ALL' || selectedPriority !== 'ALL' || statusTab !== 'ALL'
                ? 'No requests match your selected filters. Try clearing or adjusting search parameters.'
                : 'There are currently no purchase requests recommended to Admin.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Request ID & Priority</th>
                  <th className="p-4">Title & Details</th>
                  <th className="p-4">Requisition Amount</th>
                  <th className="p-4">Escalation Trigger / Reason</th>
                  <th className="p-4">Recommended By</th>
                  <th className="p-4">Admin Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredList.map(req => {
                  const isApproved = isAdminApprovedRequest(req)
                  const isPending = (req.status === 'recommended_to_admin' || req.financeStatus === 'Recommended to Admin') && !isApproved

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Column 1: ID & Priority */}
                      <td className="p-4 align-top">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-bold text-indigo-600 hover:underline cursor-pointer" onClick={() => setSelectedReq(req)}>
                            {req.id}
                          </span>
                          <span
                            className={`inline-block w-fit px-2 py-0.5 rounded text-[10px] font-bold border ${
                              priorityColors[req.priority] || 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {req.priority}
                          </span>
                        </div>
                      </td>

                      {/* Column 2: Title & Details */}
                      <td className="p-4 align-top max-w-xs">
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight line-clamp-2">
                            {req.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 flex-wrap">
                            <span className="inline-flex items-center gap-1 font-medium bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              <Building2 size={11} /> {req.department}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span>{req.category}</span>
                            <span className="text-slate-400">•</span>
                            <span>By: {req.requester}</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Amount */}
                      <td className="p-4 align-top whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {fmt(req.amount)}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">Authorized pool</p>
                      </td>

                      {/* Column 4: Escalation Reason */}
                      <td className="p-4 align-top max-w-sm">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded-md text-[10px] leading-tight">
                            <AlertCircle size={11} className="flex-shrink-0" />
                            {req.recommendationReason || 'Exceeds standard finance limit'}
                          </span>
                          {req.financeComment && (
                            <p className="text-[11px] text-slate-500 italic line-clamp-2 pl-0.5">
                              "{req.financeComment}"
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Column 5: Recommended By & Date */}
                      <td className="p-4 align-top whitespace-nowrap">
                        <p className="font-semibold text-slate-700">
                          {req.recommendedBy || actorName}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <Calendar size={11} />
                          <span>{req.recommendedDate || req.date}</span>
                        </div>
                      </td>

                      {/* Column 6: Admin Status */}
                      <td className="p-4 align-top whitespace-nowrap">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                            <CheckCircle size={12} /> Admin Approved
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold">
                            <Clock size={12} className="animate-pulse" /> Awaiting Admin Sign-off
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                            {req.financeStatus || 'Under Review'}
                          </span>
                        )}
                        {req.approvedBy && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            By {req.approvedBy}
                          </p>
                        )}
                      </td>

                      {/* Column 7: Actions */}
                      <td className="p-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedReq(req)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                            title="View Escalation Dossier"
                          >
                            <FileText size={12} /> Dossier
                          </button>

                          {isPending && (
                            <button
                              onClick={() => {
                                setApproveModalReq(req)
                                setApprovalNote('')
                              }}
                              className="px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                              title="Simulate executive approval sign-off as Admin"
                            >
                              <UserCheck size={12} /> Admin Sign-Off
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Modal: Requisition Escalation Dossier */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <ArrowUpRight size={18} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600">{selectedReq.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        priorityColors[selectedReq.priority] || 'bg-slate-100'
                      }`}
                    >
                      {selectedReq.priority}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight mt-0.5">
                    Executive Escalation Dossier
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedReq(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto text-xs">
              {/* Request Info Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Requisition Subject</span>
                    <h4 className="text-sm font-bold text-slate-900">{selectedReq.title}</h4>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Escalated Value</span>
                    <p className="text-base font-extrabold text-slate-900">{fmt(selectedReq.amount)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Department</span>
                    <span className="font-semibold">{selectedReq.department}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Category</span>
                    <span className="font-semibold">{selectedReq.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Requester</span>
                    <span className="font-semibold">{selectedReq.requester}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Submitted Date</span>
                    <span className="font-semibold">{selectedReq.date}</span>
                  </div>
                </div>
              </div>

              {/* Escalation Policy Trigger & Justification */}
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 mb-1">
                    <ShieldAlert size={14} className="text-purple-600" />
                    Policy Escalation Trigger & Grounds
                  </h4>
                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-purple-950 font-medium leading-relaxed">
                    {selectedReq.recommendationReason || 'High-value requisition exceeding departmental authorization limit.'}
                  </div>
                </div>

                {selectedReq.financeComment && (
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 mb-1">
                      <FileText size={14} className="text-slate-600" />
                      Recommending Finance Officer Remarks
                    </h4>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 leading-relaxed italic">
                      "{selectedReq.financeComment}"
                    </div>
                  </div>
                )}

                {selectedReq.justification && (
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs mb-1 text-slate-700">
                      Department Business Justification:
                    </h4>
                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                      {selectedReq.justification}
                    </p>
                  </div>
                )}
              </div>

              {/* Status & Sign-off Details */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Admin State</span>
                    {isAdminApprovedRequest(selectedReq) ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                        <CheckCircle size={14} /> Approved by Admin ({selectedReq.approvedBy || 'Executive Committee'}) on {selectedReq.approvedDate || 'Today'}
                      </span>
                    ) : (
                      <span className="text-purple-700 font-bold flex items-center gap-1 mt-0.5">
                        <Clock size={14} className="animate-pulse" /> Pending Executive Administrative Ratification
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Recommending Officer</span>
                    <span className="font-semibold text-slate-700">
                      {selectedReq.recommendedBy || actorName}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    window.print()
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                >
                  <Printer size={13} /> Print Brief
                </button>

                {Boolean(
                  (selectedReq.status === 'recommended_to_admin' || selectedReq.financeStatus === 'Recommended to Admin') &&
                  !isAdminApprovedRequest(selectedReq)
                ) && (
                  <button
                    onClick={() => {
                      setApproveModalReq(selectedReq)
                      setApprovalNote('')
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle size={14} /> Ratify & Approve as Admin
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Structured Financial / Admin Request Approval Dossier Modal (Image 2) */}
      <RequestApprovalModal
        isOpen={!!approveModalReq}
        request={approveModalReq}
        portalType="ADMIN"
        approverName={actorName}
        onClose={() => setApproveModalReq(null)}
        onConfirm={handleConfirmFinancialDossier}
      />
    </div>
  )
}
