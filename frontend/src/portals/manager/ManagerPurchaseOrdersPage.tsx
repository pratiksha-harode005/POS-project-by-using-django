import React, { useState, useMemo } from 'react'
import {
  FileText, CheckCircle2, XCircle, AlertTriangle, Search, Eye,
  Building, Receipt, ArrowRight, ShieldAlert,
  Clock, Check, X, AlertCircle, ShoppingCart, Info, Sparkles,
  Filter, RotateCcw, Calendar, User, Tag, Laptop, Cpu, CheckSquare,
  ExternalLink, FileCheck, Layers, ChevronRight
} from 'lucide-react'
import { useManagerData, PurchaseOrderItem, VendorInvoice } from '../../context/ManagerDataContext'
import { useAuth } from '../../context/AuthContext'
import { useActivity, UnreadBadge } from '../../context/ActivityContext'
import { detectWorkflowType } from '../../utils/workflowUtils'
import { formatDate } from '../../utils/formatDate'

const REJECTION_REASONS = [
  { value: 'Price Mismatch with PO', label: 'Price Mismatch with PO', desc: 'Billed rates or item totals differ from approved Purchase Order terms.' },
  { value: 'Tax / GST Calculation Error', label: 'Tax / GST Calculation Error', desc: 'Incorrect GSTIN, faulty tax rates, or mathematical discrepancy.' },
  { value: 'Damaged / Incomplete Delivery', label: 'Damaged / Incomplete Delivery', desc: 'Delivered goods do not match billed quantity or failed inspection.' },
  { value: 'Duplicate Invoice / Billing', label: 'Duplicate Invoice / Billing', desc: 'Invoice number or transaction charges were already submitted.' },
  { value: 'License / Scope Non-Compliance', label: 'License / Scope Non-Compliance', desc: 'Missing vendor license key, incorrect seat allocation, or unauthorized terms.' },
  { value: 'Policy Non-Compliance', label: 'Policy Non-Compliance', desc: 'Missing delivery challan, required warranty documentation, or unauthorized surcharges.' },
]

export const ManagerPurchaseOrdersPage: React.FC = () => {
  const { purchaseOrders, invoices, acceptVendorInvoice, rejectVendorInvoice } = useManagerData()
  const { user } = useAuth()
  const { isUnread, markAsRead } = useActivity()
  const managerName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
    : 'Sarah Manager'

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('')
  const [procurementTypeFilter, setProcurementTypeFilter] = useState<'ALL' | 'HARDWARE' | 'SOFTWARE'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED'>('ALL')
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('ALL')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [vendorFilter, setVendorFilter] = useState<string>('ALL')
  const [submittedByFilter, setSubmittedByFilter] = useState<string>('ALL')

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderItem | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const [rejectingInvoice, setRejectingInvoice] = useState<VendorInvoice | null>(null)
  const [rejectingPO, setRejectingPO] = useState<PurchaseOrderItem | null>(null)
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0].value)
  const [rejectionNotes, setRejectionNotes] = useState('')
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null)

  // Combined PO + Invoice records
  const combinedRecords = useMemo(() => {
    const records = purchaseOrders.map(po => {
      const matchedInvoice = invoices.find(inv =>
        inv.poId === po.id ||
        inv.poNumber === po.poNumber ||
        inv.requestId === po.requestId
      )

      // Auto-detect or use explicit procurement type
      const pType: 'HARDWARE' | 'SOFTWARE' = po.procurementType ||
        matchedInvoice?.procurementType ||
        (detectWorkflowType(po.category, po.requestTitle) === 'SOFTWARE' ? 'SOFTWARE' : 'HARDWARE')

      // Category derivation
      const category = po.category || (pType === 'SOFTWARE' ? 'Software & SaaS' : 'IT Hardware')

      // Submitted By derivation
      const submittedBy = pType === 'SOFTWARE'
        ? (matchedInvoice?.submittedBy || po.submittedBy || 'Team Lead Alex')
        : (po.vendor || 'Vendor Partner')

      const submissionRole = pType === 'SOFTWARE' ? 'Team Lead' : 'Vendor'

      // Document Type
      const docType = matchedInvoice?.documentType || (pType === 'SOFTWARE' ? 'Software License Agreement' : 'Tax Invoice')

      return {
        po,
        invoice: matchedInvoice || null,
        procurementType: pType,
        category,
        submittedBy,
        submissionRole,
        docType,
      }
    })

    records.sort((a, b) => {
      const dateA = (a.po as any)?.issueDate || (a.po as any)?.created_at || (a.po as any)?.date || ''
      const dateB = (b.po as any)?.issueDate || (b.po as any)?.created_at || (b.po as any)?.date || ''
      if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB)
      return (a.po?.id || '').localeCompare(b.po?.id || '')
    })

    return records
  }, [purchaseOrders, invoices])

  // Unique list of vendors and team leads for dynamic filter dropdowns
  const uniqueVendors = useMemo(() => {
    const list = combinedRecords
      .filter(r => r.procurementType === 'HARDWARE')
      .map(r => r.po.vendor)
      .filter(Boolean)
    return Array.from(new Set(list))
  }, [combinedRecords])

  const uniqueTeamLeads = useMemo(() => {
    const list = combinedRecords
      .filter(r => r.procurementType === 'SOFTWARE')
      .map(r => r.submittedBy)
      .filter(Boolean)
    return Array.from(new Set(list))
  }, [combinedRecords])

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalOrders = combinedRecords.length
    const hardwareCount = combinedRecords.filter(r => r.procurementType === 'HARDWARE').length
    const softwareCount = combinedRecords.filter(r => r.procurementType === 'SOFTWARE').length
    const pendingReview = combinedRecords.filter(r => r.invoice?.status === 'Pending Review').length
    const acceptedCount = combinedRecords.filter(r => r.invoice?.status === 'Accepted').length
    const rejectedCount = combinedRecords.filter(r => r.invoice?.status === 'Rejected').length

    return { totalOrders, hardwareCount, softwareCount, pendingReview, acceptedCount, rejectedCount }
  }, [combinedRecords])

  // Filtered List based on Search & all Right-Side Filters
  const filteredRecords = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    return combinedRecords.filter(({ po, invoice, procurementType, submittedBy }) => {
      // 1. Procurement Type Filter
      if (procurementTypeFilter !== 'ALL' && procurementType !== procurementTypeFilter) return false

      // 2. Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING' && invoice?.status !== 'Pending Review') return false
        if (statusFilter === 'ACCEPTED' && invoice?.status !== 'Accepted') return false
        if (statusFilter === 'REJECTED' && invoice?.status !== 'Rejected') return false
        if (statusFilter === 'IN_PROGRESS' && (po.status !== 'Approved' && po.status !== 'Sent to Vendor' && po.status !== 'Acknowledged')) return false
        if (statusFilter === 'COMPLETED' && (po.status !== 'Delivered' && po.status !== 'Closed')) return false
      }

      // 3. Date Filter
      const recordDate = po.poDate || invoice?.invoiceDate || ''
      if (dateFilter !== 'ALL' && recordDate) {
        const rDate = new Date(recordDate)
        if (dateFilter === 'TODAY' && recordDate !== todayStr) return false
        if (dateFilter === 'THIS_WEEK') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (rDate < sevenDaysAgo) return false
        }
        if (dateFilter === 'THIS_MONTH') {
          if (rDate.getMonth() !== now.getMonth() || rDate.getFullYear() !== now.getFullYear()) return false
        }
        if (dateFilter === 'THIS_YEAR') {
          if (rDate.getFullYear() !== now.getFullYear()) return false
        }
        if (dateFilter === 'CUSTOM') {
          if (customStartDate && recordDate < customStartDate) return false
          if (customEndDate && recordDate > customEndDate) return false
        }
      }

      // 4. Vendor Filter (for Hardware)
      if (vendorFilter !== 'ALL' && po.vendor !== vendorFilter) return false

      // 5. Submitted By Filter (for Software)
      if (submittedByFilter !== 'ALL') {
        if (submittedByFilter === 'ALL_TEAM_LEADS') {
          if (procurementType !== 'SOFTWARE') return false
        } else if (submittedBy !== submittedByFilter) {
          return false
        }
      }

      // 6. Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchPO = po.poNumber.toLowerCase().includes(q) ||
          po.requestId.toLowerCase().includes(q) ||
          po.requestTitle.toLowerCase().includes(q) ||
          po.vendor.toLowerCase().includes(q) ||
          (po.category && po.category.toLowerCase().includes(q))
        const matchInv = invoice ? (
          invoice.invoiceNumber.toLowerCase().includes(q) ||
          invoice.vendor.toLowerCase().includes(q) ||
          (invoice.gstNumber && invoice.gstNumber.toLowerCase().includes(q))
        ) : false
        const matchSubmitter = submittedBy.toLowerCase().includes(q)

        if (!matchPO && !matchInv && !matchSubmitter) return false
      }

      return true
    })
  }, [combinedRecords, procurementTypeFilter, statusFilter, dateFilter, customStartDate, customEndDate, vendorFilter, submittedByFilter, searchTerm])

  const handleResetFilters = () => {
    setSearchTerm('')
    setProcurementTypeFilter('ALL')
    setStatusFilter('ALL')
    setDateFilter('ALL')
    setCustomStartDate('')
    setCustomEndDate('')
    setVendorFilter('ALL')
    setSubmittedByFilter('ALL')
  }

  const handleOpenDetails = (po: PurchaseOrderItem, inv: VendorInvoice | null) => {
    if (inv) markAsRead(inv.id)
    markAsRead(po.id)
    setSelectedPO(po)
    setSelectedInvoice(inv)
    setIsDetailsModalOpen(true)
  }

  const handleOpenRejectModal = (po: PurchaseOrderItem, inv: VendorInvoice) => {
    markAsRead(inv.id)
    markAsRead(po.id)
    setRejectingPO(po)
    setRejectingInvoice(inv)
    setRejectionReason(REJECTION_REASONS[0].value)
    setRejectionNotes('')
  }

  const handleConfirmAccept = (invoiceId: string, poNumber: string, isSoftware: boolean) => {
    markAsRead(invoiceId)
    acceptVendorInvoice(invoiceId, managerName)
    setIsDetailsModalOpen(false)
    const stageDesc = isSoftware ? 'Software Stage 5: Payment Disbursement' : 'Hardware Stage 10: Payment Disbursement'
    setActionSuccessMsg(`Invoice for ${poNumber} accepted! Request advanced directly to ${stageDesc}.`)
    setTimeout(() => setActionSuccessMsg(null), 6000)
  }

  const handleConfirmReject = () => {
    if (!rejectingInvoice) return
    rejectVendorInvoice(rejectingInvoice.id, rejectionReason, rejectionNotes, managerName)
    const invNum = rejectingInvoice.invoiceNumber
    setRejectingInvoice(null)
    setRejectingPO(null)
    setIsDetailsModalOpen(false)
    setActionSuccessMsg(`Invoice / Document ${invNum} rejected: "${rejectionReason}". Order put on hold.`)
    setTimeout(() => setActionSuccessMsg(null), 6000)
  }

  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN')
  }

  const activeFiltersCount = (procurementTypeFilter !== 'ALL' ? 1 : 0) +
    (statusFilter !== 'ALL' ? 1 : 0) +
    (dateFilter !== 'ALL' ? 1 : 0) +
    (vendorFilter !== 'ALL' ? 1 : 0) +
    (submittedByFilter !== 'ALL' ? 1 : 0) +
    (searchTerm.trim() ? 1 : 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* ── 1. PROFESSIONAL EXECUTIVE PAGE HEADER ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5">
                <Receipt size={12} />
                PURCHASE ORDER &amp; INVOICE DESK
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center gap-1">
                <Cpu size={11} /> Hardware Workflow
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                <Laptop size={11} /> Software Workflow
              </span>
            </div>
            
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <ShoppingCart size={20} />
              </div>
              Purchase Orders &amp; Invoices
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Verify contracted purchase orders against submitted vendor tax invoices (Hardware) and team lead subscription receipts (Software). Accept to advance directly to Finance Payment, or reject with a formal audit reason.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900 flex items-center justify-end gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {managerName}
              </div>
              <span className="text-[11px] text-slate-400">Department Procurement Manager</span>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                title="Reset all active filters"
              >
                <RotateCcw size={13} />
                <span>Reset Filters ({activeFiltersCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── ACTION SUCCESS NOTIFICATION ── */}
      {actionSuccessMsg && (
        <div className="flex items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── 2. EXECUTIVE KPI OVERVIEW CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders Card */}
        <div
          onClick={() => { setProcurementTypeFilter('ALL'); setStatusFilter('ALL') }}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Purchase Orders</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center justify-center">
              <ShoppingCart size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{metrics.totalOrders}</div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
            <span className="font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">{metrics.hardwareCount} Hardware</span>
            <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{metrics.softwareCount} Software</span>
          </div>
        </div>

        {/* Awaiting Review Card */}
        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer group ${
            statusFilter === 'PENDING' ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20' : 'border-slate-200/90 hover:border-amber-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Awaiting Bill Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-all flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-900 tracking-tight">{metrics.pendingReview}</div>
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-amber-100 text-[11px] text-amber-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Action Required by Manager</span>
          </div>
        </div>

        {/* Accepted Bills Card */}
        <div
          onClick={() => setStatusFilter('ACCEPTED')}
          className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer group ${
            statusFilter === 'ACCEPTED' ? 'border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50/20' : 'border-slate-200/90 hover:border-emerald-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Accepted Bills</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-all flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-900 tracking-tight">{metrics.acceptedCount}</div>
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-emerald-100 text-[11px] text-emerald-700 font-semibold">
            <Check size={13} className="text-emerald-600" />
            <span>Advanced to Payment Queue</span>
          </div>
        </div>

        {/* Rejected Bills Card */}
        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer group ${
            statusFilter === 'REJECTED' ? 'border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/20' : 'border-slate-200/90 hover:border-rose-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Rejected Bills</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition-all flex items-center justify-center">
              <XCircle size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-900 tracking-tight">{metrics.rejectedCount}</div>
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-rose-100 text-[11px] text-rose-700 font-semibold">
            <AlertTriangle size={13} className="text-rose-600" />
            <span>On Hold &bull; Revision Requested</span>
          </div>
        </div>
      </div>

      {/* ── 3. FULL-WIDTH COMMAND BAR & ADVANCED FILTERS ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3.5">
        {/* Top Filter Tabs (Procurement Type & Quick Status Segments) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Segmented Procurement Type Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-bold">
            <button
              onClick={() => setProcurementTypeFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                procurementTypeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Types ({metrics.totalOrders})
            </button>
            <button
              onClick={() => setProcurementTypeFilter('HARDWARE')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                procurementTypeFilter === 'HARDWARE'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-cyan-700'
              }`}
            >
              <Cpu size={13} />
              Hardware ({metrics.hardwareCount})
            </button>
            <button
              onClick={() => setProcurementTypeFilter('SOFTWARE')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                procurementTypeFilter === 'SOFTWARE'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-purple-700'
              }`}
            >
              <Laptop size={13} />
              Software / Digital ({metrics.softwareCount})
            </button>
          </div>

          {/* Quick Status Pill Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase">Filter:</span>
            {[
              { id: 'ALL', label: 'All Statuses', count: metrics.totalOrders },
              { id: 'PENDING', label: 'Needs Review', count: metrics.pendingReview, color: 'amber' },
              { id: 'ACCEPTED', label: 'Accepted', count: metrics.acceptedCount, color: 'emerald' },
              { id: 'REJECTED', label: 'Rejected', count: metrics.rejectedCount, color: 'rose' },
            ].map((st) => {
              const active = statusFilter === st.id
              return (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? st.id === 'PENDING'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : st.id === 'ACCEPTED'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : st.id === 'REJECTED'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                  }`}
                >
                  <span>{st.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    active ? 'bg-black/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {st.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Secondary Filters Bar: Search & Compact Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Live Search */}
          <div className="lg:col-span-4 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search PO#, Invoice#, Vendor, Requester, or Product..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Vendor Filter */}
          <div className="lg:col-span-3">
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">🏢 All Hardware Vendors</option>
              {uniqueVendors.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Submitter Filter */}
          <div className="lg:col-span-3">
            <select
              value={submittedByFilter}
              onChange={(e) => setSubmittedByFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">👤 All Team Lead Submitters</option>
              {uniqueTeamLeads.map(lead => (
                <option key={lead} value={lead}>{lead}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="lg:col-span-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">📅 All Time</option>
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="THIS_YEAR">This Year (FY2026)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── 4. FULL-WIDTH PURCHASE ORDERS LIST ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            Showing <strong className="text-slate-800 font-bold">{filteredRecords.length}</strong> of {combinedRecords.length} orders
          </span>
          <span className="text-[11px] text-slate-400">Sorted by newest requisition date</span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-16 text-center shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ShoppingCart size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Purchase Orders Match Criteria</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try clearing your search term, switching the procurement type tab, or resetting the status filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-200 inline-flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              <span>Reset All Filters</span>
            </button>
          </div>
        ) : (
          filteredRecords.map(({ po, invoice, procurementType, category, submittedBy, submissionRole, docType }) => {
            const isHardware = procurementType === 'HARDWARE'
            const isSoftware = procurementType === 'SOFTWARE'
            const isPending = invoice?.status === 'Pending Review'
            const isAccepted = invoice?.status === 'Accepted'
            const isRejected = invoice?.status === 'Rejected'
            const isNew = isPending && (invoice ? isUnread(invoice.id) : isUnread(po.id))

            // Price calculations
            const subtotal = invoice?.subtotal || po.totalAmount
            const taxAmount = invoice?.taxAmount || Math.round(subtotal * 0.18)
            const grossAmount = invoice?.totalAmount || (subtotal + taxAmount)

            return (
              <div
                key={po.id}
                onClick={() => {
                  if (isNew) {
                    if (invoice) markAsRead(invoice.id)
                    markAsRead(po.id)
                  }
                }}
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  isNew
                    ? 'border-l-4 border-l-blue-600 border-slate-300 shadow-md ring-1 ring-blue-500/10'
                    : 'border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                {/* ── CARD HEADER: PO NUMBER, TYPE, STATUS PILLS & GROSS AMOUNT ── */}
                <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Unread / New Pulsing Badge */}
                    <UnreadBadge isUnread={isNew} />

                    {/* PO Number Badge */}
                    <span className="font-mono font-black text-xs text-indigo-950 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      {po.poNumber}
                    </span>

                    {/* Procurement Type Pill */}
                    {isHardware ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-300">
                        <Cpu size={12} /> Hardware Order
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-300">
                        <Laptop size={12} /> Software / Digital
                      </span>
                    )}

                    {/* Requisition ID Reference */}
                    <span className="text-xs text-slate-500 font-medium">
                      Requisition: <strong className="font-mono text-slate-700">{po.requestId}</strong>
                    </span>

                    {/* Category Tag */}
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                      {category}
                    </span>
                  </div>

                  {/* Right Header: Status Pills & Prominent Price */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${
                        po.status === 'Delivered'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : po.status === 'Sent to Vendor'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : po.status === 'Acknowledged'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        Order: {po.status}
                      </span>

                      <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${
                        po.paymentStatus === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : po.paymentStatus === 'Processing'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : po.paymentStatus === 'On Hold'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        Payment: {po.paymentStatus}
                      </span>
                    </div>

                    <div className="pl-3 border-l border-slate-200 text-right">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Gross Payable</span>
                      <span className="text-base font-black text-slate-900 font-mono">{formatCurrency(grossAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* ── CARD BODY: 3 BALANCED COLUMNS ── */}
                <div className="p-6">
                  {/* Requisition Title */}
                  <div className="mb-4">
                    <h2 className="text-base font-bold text-slate-900">{po.requestTitle}</h2>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>PO Authorized: <b>{po.poDate}</b></span>
                      <span>&bull;</span>
                      <span>Target Delivery / Fulfillment: <b>{po.deliveryDate || 'Completed'}</b></span>
                      <span>&bull;</span>
                      <span>Terms: <b>{po.terms || 'Net 30 Days'}</b></span>
                    </p>
                  </div>

                  {/* 3-Column Detailed Information Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    
                    {/* COLUMN 1 (4 cols): Contracting & Logistics Particulars */}
                    <div className="lg:col-span-4 bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                        <span>Contracting Party</span>
                        {isHardware ? (
                          <span className="text-cyan-700 flex items-center gap-1 font-semibold">
                            <Building size={12} /> Supplier
                          </span>
                        ) : (
                          <span className="text-purple-700 flex items-center gap-1 font-semibold">
                            <User size={12} /> Team Lead
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">
                          {isHardware ? 'Authorized Vendor Partner' : 'Requisition Submitter'}
                        </span>
                        <span className="font-bold text-slate-900 text-sm block mt-0.5 truncate">
                          {isHardware ? po.vendor : submittedBy}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {isHardware ? 'Contracted Equipment Supplier' : `${submissionRole} &bull; Internal Requisition`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Quantity Contracted</span>
                          <span className="font-bold text-slate-800 text-xs block mt-0.5">
                            {po.quantity} {isHardware ? 'Units' : 'Seats / License'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Fulfillment Date</span>
                          <span className="font-bold text-slate-800 text-xs block mt-0.5">
                            {po.deliveryDate || 'Completed'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* COLUMN 2 (4 cols): Line Items Breakdown */}
                    <div className="lg:col-span-4 bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                        <span>Billed Line Items</span>
                        <span className="font-mono text-slate-500 font-normal">{po.items.length} item(s)</span>
                      </div>

                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {po.items.map((it, idx) => (
                          <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs">
                            <div className="font-bold text-slate-800 truncate">{it.product}</div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-1">
                              <span>{it.quantity} &times; {formatCurrency(it.unitPrice)}</span>
                              <span className="font-bold text-slate-900">{formatCurrency(it.total)}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Base Total (Excl. Taxes):</span>
                        <span className="font-mono font-bold text-slate-900">{formatCurrency(subtotal)}</span>
                      </div>
                    </div>

                    {/* COLUMN 3 (4 cols): Commercial Invoice / Bill Reconciliation Box */}
                    <div className={`lg:col-span-4 rounded-xl border p-4 space-y-3 text-xs transition-all ${
                      isPending
                        ? 'bg-amber-50/60 border-amber-300 text-amber-950'
                        : isAccepted
                        ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                        : isRejected
                        ? 'bg-rose-50/60 border-rose-300 text-rose-950'
                        : 'bg-slate-50/80 border-slate-200 text-slate-800'
                    }`}>
                      <div className="flex items-center justify-between pb-2 border-b border-current/10">
                        <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider">
                          <Receipt size={14} className={isPending ? 'text-amber-600' : isAccepted ? 'text-emerald-600' : isRejected ? 'text-rose-600' : 'text-slate-500'} />
                          <span>{docType}</span>
                        </div>
                        {/* Status Badge */}
                        {isPending && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Awaiting Review
                          </span>
                        )}
                        {isAccepted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Accepted
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            Rejected
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] opacity-75">Document Ref:</span>
                          <span className="font-mono font-bold text-slate-900">{invoice?.invoiceNumber || 'Pending'}</span>
                        </div>
                        {invoice?.gstNumber && (
                          <div className="flex items-center justify-between text-[11px] opacity-75 mt-0.5">
                            <span>GSTIN / Tax ID:</span>
                            <span className="font-mono font-semibold">{invoice.gstNumber}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] opacity-75 mt-0.5">
                          <span>Dated:</span>
                          <span>{invoice?.invoiceDate || po.poDate}</span>
                        </div>
                      </div>

                      {/* Pricing Tally */}
                      <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-lg border border-current/10 space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="opacity-75">Net Subtotal:</span>
                          <span className="font-mono font-bold text-slate-800">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="opacity-75">GST Tax (18%):</span>
                          <span className="font-mono font-bold text-amber-700">+{formatCurrency(taxAmount)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-black pt-1 border-t border-current/10 text-slate-900">
                          <span>Total Payable:</span>
                          <span className="font-mono text-emerald-700 text-sm">{formatCurrency(grossAmount)}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* ── CARD FOOTER: ACTIONS & WORKFLOW PROGRESSION ── */}
                <div className="px-6 py-3.5 bg-slate-50/90 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => handleOpenDetails(po, invoice)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-all shadow-2xs"
                  >
                    <Eye size={14} className="text-slate-500" />
                    <span>View Full Invoice &amp; Reconcile (PDF)</span>
                  </button>

                  {/* Actions for Pending Invoices */}
                  {invoice && isPending && (
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleOpenRejectModal(po, invoice)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 transition-all shadow-2xs"
                      >
                        <XCircle size={14} className="text-rose-600" />
                        <span>Reject Bill</span>
                      </button>
                      <button
                        onClick={() => handleConfirmAccept(invoice.id, po.poNumber, isSoftware)}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs"
                      >
                        <CheckCircle2 size={15} />
                        <span>Accept &amp; Advance to Payment</span>
                      </button>
                    </div>
                  )}

                  {/* Completed / Disputed Status Note */}
                  {invoice && isAccepted && (
                    <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      <span>Invoice Accepted &bull; Routed directly to Finance Payment Queue</span>
                    </div>
                  )}

                  {invoice && isRejected && (
                    <div className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                      <AlertTriangle size={15} className="text-rose-600" />
                      <span>Bill Rejected: "{invoice.rejectionReason}" &bull; Order On Hold</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* FULL DETAILS & RECONCILIATION MODAL */}
      {isDetailsModalOpen && selectedPO && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt size={20} className="text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold">Purchase Order &amp; Document Reconciliation</h3>
                  <p className="text-xs text-slate-300">
                    {selectedPO.procurementType === 'SOFTWARE' ? 'Software License / Subscription Verification' : 'Hardware Delivery & Tax Invoice Verification'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Header Info Banner */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-indigo-500 block font-medium">Requisition Title</span>
                  <span className="text-sm font-bold text-indigo-950 block truncate">{selectedPO.requestTitle}</span>
                  <span className="text-indigo-600 block mt-0.5">Request ID: {selectedPO.requestId}</span>
                </div>
                <div>
                  <span className="text-indigo-500 block font-medium">
                    {selectedPO.procurementType === 'SOFTWARE' ? 'Software Vendor / Submitter' : 'Contracted Vendor'}
                  </span>
                  <span className="text-sm font-bold text-indigo-950 block truncate">{selectedPO.vendor}</span>
                  <span className="text-indigo-600 block mt-0.5">PO: {selectedPO.poNumber}</span>
                </div>
                <div>
                  <span className="text-indigo-500 block font-medium">Document Ref</span>
                  <span className="text-sm font-bold text-indigo-950 block">{selectedInvoice?.invoiceNumber || 'None'}</span>
                  <span className="text-indigo-600 block mt-0.5">Type: {selectedInvoice?.documentType || 'Tax Bill'}</span>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Purchase Order Record */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <ShoppingCart size={15} className="text-indigo-600" />
                      Authorized Purchase Order
                    </span>
                    <span className="font-mono text-indigo-700 bg-white px-2 py-0.5 rounded border">
                      {selectedPO.poNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 block text-[11px]">PO Date</span>
                      <span className="font-semibold text-slate-700">{selectedPO.poDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Terms</span>
                      <span className="font-semibold text-slate-700">{selectedPO.terms || 'Net 30'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">Items Contracted:</span>
                    <div className="space-y-1.5">
                      {selectedPO.items.map((it, idx) => (
                        <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200">
                          <div className="font-semibold text-slate-800">{it.product}</div>
                          <div className="flex justify-between text-slate-600 font-mono text-[11px] mt-1">
                            <span>Qty: {it.quantity} &times; {formatCurrency(it.unitPrice)}</span>
                            <span className="font-bold text-slate-900">{formatCurrency(it.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                    <span>Authorized Base Total:</span>
                    <span className="font-mono text-indigo-700">{formatCurrency(selectedPO.totalAmount)}</span>
                  </div>
                </div>

                {/* Right: Submitted Document / Invoice */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Receipt size={15} className="text-emerald-600" />
                      Submitted Bill / Document
                    </span>
                    {selectedInvoice ? (
                      <span className="font-mono text-emerald-700 bg-white px-2 py-0.5 rounded border">
                        {selectedInvoice.invoiceNumber}
                      </span>
                    ) : (
                      <span className="text-slate-400">Not Submitted</span>
                    )}
                  </div>

                  {selectedInvoice ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-500 block text-[11px]">Document Date</span>
                          <span className="font-semibold text-slate-700">{selectedInvoice.invoiceDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Due Date</span>
                          <span className="font-semibold text-slate-700">{formatDate(selectedInvoice.dueDate)}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[11px]">Submitted By</span>
                        <span className="font-semibold text-slate-700">
                          {selectedInvoice.submittedBy || selectedPO.vendor} ({selectedInvoice.submittedByRole || 'Partner'})
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[11px] mb-1">Billed Items:</span>
                        <div className="space-y-1.5">
                          {selectedInvoice.items.map((it, idx) => (
                            <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200">
                              <div className="font-semibold text-slate-800">{it.product}</div>
                              <div className="flex justify-between text-slate-600 font-mono text-[11px] mt-1">
                                <span>Qty: {it.quantity} &times; {formatCurrency(it.unitPrice)}</span>
                                <span className="font-bold text-slate-900">{formatCurrency(it.total)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal:</span>
                          <span className="font-mono">{formatCurrency(selectedInvoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>GST Tax (18%):</span>
                          <span className="font-mono text-amber-700">+{formatCurrency(selectedInvoice.taxAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1">
                          <span>Gross Total:</span>
                          <span className="font-mono text-indigo-700">{formatCurrency(selectedInvoice.totalAmount)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center text-slate-400">
                      <p>No document submitted yet for reconciliation.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Match Verification Banner */}
              {selectedInvoice && (
                <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                  selectedInvoice.subtotal === selectedPO.totalAmount
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  {selectedInvoice.subtotal === selectedPO.totalAmount ? (
                    <>
                      <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Reconciliation Complete: </span>
                        The base line items total of {formatCurrency(selectedInvoice.subtotal)} matches the purchase order allocation.
                        Tax amount ({formatCurrency(selectedInvoice.taxAmount)}) is properly verified.
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Variance Warning: </span>
                        Submitted subtotal differs from contracted PO by{' '}
                        {formatCurrency(Math.abs(selectedInvoice.subtotal - selectedPO.totalAmount))}. Review notes before approving.
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Close Preview
              </button>

              {selectedInvoice && selectedInvoice.status === 'Pending Review' && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setIsDetailsModalOpen(false)
                      handleOpenRejectModal(selectedPO, selectedInvoice)
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    <XCircle size={15} />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => handleConfirmAccept(selectedInvoice.id, selectedPO.poNumber, selectedPO.procurementType === 'SOFTWARE')}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <CheckCircle2 size={15} />
                    <span>Accept &amp; Advance to Payment</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert size={20} />
                <h3 className="text-base font-bold">Reject Document / Invoice</h3>
              </div>
              <button
                onClick={() => setRejectingInvoice(null)}
                className="p-1 rounded-lg text-rose-200 hover:text-white hover:bg-rose-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                <span className="font-bold">Rejecting {rejectingInvoice.documentType || 'Invoice'} {rejectingInvoice.invoiceNumber} </span>
                for PO <span className="font-bold font-mono">{rejectingInvoice.poNumber}</span>.
                The payment will be put on hold and the {rejectingInvoice.procurementType === 'SOFTWARE' ? 'Team Lead' : 'Vendor'} will be notified with your feedback.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Select Rejection Reason <span className="text-rose-600">*</span>
                </label>
                <div className="space-y-2">
                  {REJECTION_REASONS.map(r => (
                    <label
                      key={r.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        rejectionReason === r.value
                          ? 'bg-rose-50 border-rose-400 text-rose-950 font-medium'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rejectionReason"
                        value={r.value}
                        checked={rejectionReason === r.value}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">{r.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{r.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Additional Notes / Detailed Feedback (Optional)
                </label>
                <textarea
                  rows={3}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Specify specific line items, licensing discrepancies, or tax adjustments required..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setRejectingInvoice(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
              >
                <XCircle size={15} />
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
