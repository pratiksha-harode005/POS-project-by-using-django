import React, { useState, useMemo } from 'react'
import {
  ShoppingBag, Search, CheckCircle, Clock, Truck, FileText,
  ChevronDown, ChevronUp, Plus, Building, User, Calendar,
  ShieldCheck, AlertCircle, ArrowRight, Layers, Tag, IndianRupee,
  Package, MapPin, Check, SlidersHorizontal, RefreshCw, X,
  Laptop, Cpu, CheckCircle2, Sparkles, TrendingUp, ExternalLink,
  ArrowUpRight, RotateCcw, AlertTriangle, HelpCircle, Filter
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { TrackingStepper, StepHistoryItem } from '../../components/portal/TrackingStepper'
import { detectWorkflowType, getWorkflowProgression } from '../../utils/workflowUtils'
import { useAuth } from '../../context/AuthContext'
import { useManagerData } from '../../context/ManagerDataContext'
import { formatDate } from '../../utils/formatDate'

import { Send } from 'lucide-react'
import { recommendToFinanceApi, sendToFinanceApi } from '../../api/managerApi'

export interface ManagerOrder {
  id: string
  title: string
  description: string
  category: string
  quantity: number
  unit: string
  estCost: string
  rawCost: number
  unitPrice: string
  vendor: string
  deliveryLocation: string
  budgetCode: string
  date: string
  createdAt?: string
  created_at?: string
  time: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'In Procurement' | 'Completed'
  raw_status?: string
  currentStage: number // 0 to 9
  currentlyWith: string
  lastUpdated: string
  department: string
  requester: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  poNumber?: string
  grnNumber?: string
  invoiceNumber?: string
  documentsVerified?: boolean
  history?: StepHistoryItem[]
  financeStatus?: string
  paymentStatus?: string
  timeline?: any[]
  isForwardedToFinance?: boolean
  rawRequest?: any
}

export const MyOrdersPage: React.FC = () => {
  const { user } = useAuth()
  const { allRequests, recommendToFinance, sendToFinance } = useManagerData()

  // Track forwarded requests locally for immediate reactivity
  const [forwardedOrderIds, setForwardedOrderIds] = useState<Set<string>>(new Set())
  const [forwardModalOrder, setForwardModalOrder] = useState<ManagerOrder | null>(null)
  const [forwardReason, setForwardReason] = useState('')
  const [selectedDirectives, setSelectedDirectives] = useState<string[]>([
    'Priority Capex Clearance',
    'Budget Allocation Verified'
  ])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // In Manager "My Requests", show all requests across the lifecycle
  const approvedRequests = useMemo(() => {
    return allRequests || []
  }, [allRequests])

  const liveOrders = useMemo<ManagerOrder[]>(() => {
    if (!approvedRequests || approvedRequests.length === 0) return []
    const mappedOrders: ManagerOrder[] = approvedRequests.map((req) => {
      const isCompleted = (req.status as string) === 'completed' || (req as any).paymentStatus === 'paid' || (req as any).financeStatus === 'completed'
      const isInProcurement = req.status === 'assigned_to_vendor' || req.status === 'vendor_accepted' || req.status === 'delivered'
      const isRejected = req.status === 'rejected' || req.status === 'finance_rejected' || req.status === 'vendor_rejected'
      const isSoftware = req.category?.toLowerCase().includes('software') || req.category?.toLowerCase().includes('saas') || req.request_type === 'software'
      const isApproved =
        req.status === 'approved' ||
        (req.status as string) === 'payment_approved' ||
        (req.status as string) === 'payment_justification_submitted' ||
        (req.status as string) === 'payment_justified' ||
        req.status === 'finance_review' ||
        req.status === 'recommended_to_finance' ||
        req.status === 'finance_approved' ||
        req.raw_status === 'MANAGER_APPROVED' ||
        req.raw_status === 'PAYMENT_APPROVED'
      
      const isForwarded =
        req.status === 'recommended_to_finance' ||
        req.status === 'sent_to_finance' ||
        req.status === 'finance_review' ||
        req.status === 'finance_approved' ||
        Boolean((req as any).isRecommendedToFinance) ||
        Boolean((req as any).recommendationReason) ||
        (req as any).financeStatus === 'Sent to Finance' ||
        (req as any).financeStatus === 'Under Review' ||
        (req as any).financeStatus === 'Awaiting Finance Action' ||
        (req as any).financeStatus === 'Pending Finance Approval' ||
        forwardedOrderIds.has(req.id)

      let status: 'Pending' | 'Approved' | 'Rejected' | 'In Procurement' | 'Completed' = 'Pending'
      if (isCompleted) status = 'Completed'
      else if (isInProcurement) status = 'In Procurement'
      else if (isRejected) status = 'Rejected'
      else if (isApproved) status = 'Approved'
      else status = 'Pending'

      const qty = req.quantity || 1
      const totalCost = Number(req.amount ?? (req as any).total_estimated_cost ?? (req as any).estimated_cost ?? (req as any).estimatedCost ?? req.approvalParams?.approvedAmount ?? 0) || 0
      const unitPriceVal = qty > 0 ? Math.round(totalCost / qty) : totalCost
      const deptClean = (req.department || 'IT').toUpperCase().replace(/\s+/g, '')

      const effectiveCurrentlyWith = req.currentlyWith || (req as any).currently_with || (
        isSoftware
          ? (req.status === 'approved' || req.raw_status === 'MANAGER_APPROVED' ? 'Team Lead — Mock Payment Required' :
             (req.status as string) === 'payment_approved' || req.raw_status === 'PAYMENT_APPROVED' ? 'Team Lead — Awaiting Payment Justification' :
             (req.status as string) === 'payment_justification_submitted' || req.raw_status === 'PAYMENT_JUSTIFICATION_SUBMITTED' ? 'Manager — Verifying Justification' :
             (req.status as string) === 'payment_justified' || req.raw_status === 'PAYMENT_JUSTIFIED' ? 'Team Lead — Awaiting Final Acknowledgment' :
             isCompleted ? 'Completed & Archived' : 'Manager Sign-off')
          : (status === 'Approved' || status === 'In Procurement' ? 'Procurement Sourcing Desk' : req.status === 'pending_approval' ? 'Manager Sign-off' : 'Procurement Team')
      )

      return {
        id: req.id,
        title: req.title,
        description: req.description || req.justification || 'Purchase requisition',
        category: req.category,
        quantity: qty,
        unit: 'Units',
        estCost: `₹${totalCost.toLocaleString('en-IN')}`,
        rawCost: totalCost,
        unitPrice: qty > 1 ? `₹${unitPriceVal.toLocaleString('en-IN')} / unit` : `₹${totalCost.toLocaleString('en-IN')}`,
        vendor: req.vendor || 'Approved Vendor',
        deliveryLocation: 'Pune HQ',
        budgetCode: req.costCenter || `CC-${deptClean}-2026-Q3`,
        date: req.date,
        createdAt: req.createdAt || req.created_at || req.date,
        created_at: req.created_at || req.createdAt || req.date,
        time: '10:00 AM',
        status: status,
        raw_status: req.raw_status,
        financeStatus: req.financeStatus,
        paymentStatus: req.paymentStatus,
        currentStage: req.currentStage || (status === 'Approved' || status === 'In Procurement' ? 4 : (isCompleted ? 9 : 1)),
        currentlyWith: effectiveCurrentlyWith,
        lastUpdated: req.date,
        department: req.department,
        requester: req.requester,
        priority: (req.priority as any) || 'Medium',
        timeline: req.timeline || [],
        history: req.history || [],
        isForwardedToFinance: isForwarded,
        rawRequest: req,
      }
    })

    return mappedOrders.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.date ? new Date(a.date).getTime() : 0)
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.date ? new Date(b.date).getTime() : 0)
      return timeB - timeA
    })
  }, [approvedRequests, forwardedOrderIds])

  const orders = liveOrders
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Forwarded' | 'In Procurement' | 'Completed'>('All')
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Hardware' | 'Software'>('All')

  // Set of expanded order IDs
  // By default, open the first order so the user immediately sees the tracking workflow
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Toggle single order expand
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleOpenForwardModal = (order: ManagerOrder) => {
    setForwardModalOrder(order)
    setForwardReason(
      `Requisition ${order.id} (${order.title}) verified and endorsed by Department Manager. Forwarded to Finance for Capex budget reservation, PO issuance, and disbursement approval.`
    )
    setSelectedDirectives([
      'Priority Capex Clearance',
      'Budget Allocation Verified'
    ])
  }

  const toggleDirective = (dir: string) => {
    setSelectedDirectives(prev =>
      prev.includes(dir) ? prev.filter(d => d !== dir) : [...prev, dir]
    )
  }

  const handleConfirmForward = async () => {
    if (!forwardModalOrder) return
    const orderId = forwardModalOrder.id
    const directivesNote = selectedDirectives.length > 0
      ? `\n\n[Manager Directives: ${selectedDirectives.join(', ')}]`
      : ''
    const fullNote = (forwardReason || '').trim() + directivesNote

    setForwardedOrderIds(prev => new Set(prev).add(orderId))

    if (recommendToFinance) {
      recommendToFinance(orderId, fullNote)
    } else {
      try {
        await recommendToFinanceApi(orderId, 1, fullNote)
      } catch (e) {
        console.warn('API forward error:', e)
      }
    }

    setForwardModalOrder(null)
    setForwardReason('')
    showToast(`✓ Requisition ${orderId} successfully forwarded to Finance Portal!`, 'success')
  }

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        ord.id.toLowerCase().includes(q) ||
        ord.title.toLowerCase().includes(q) ||
        ord.category.toLowerCase().includes(q) ||
        ord.department.toLowerCase().includes(q) ||
        ord.vendor.toLowerCase().includes(q) ||
        (ord.poNumber && ord.poNumber.toLowerCase().includes(q))

      const matchesStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'Pending'
          ? (ord.status === 'Pending' || ord.status === 'Approved') && !ord.isForwardedToFinance
          : statusFilter === 'Forwarded'
          ? ord.isForwardedToFinance
          : ord.status === statusFilter

      const matchesCategory =
        categoryFilter === 'All'
          ? true
          : categoryFilter === 'Hardware'
          ? ord.category.includes('Hardware') || ord.category.includes('Facilities')
          : categoryFilter === 'Software'
          ? ord.category.includes('Software') || ord.category.includes('SaaS')
          : true

      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [orders, search, statusFilter, categoryFilter])

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalRaw = orders.reduce((sum, o) => sum + (o.rawCost || 0), 0)
    return {
      total: orders.length,
      pending: orders.filter((o) => (o.status === 'Pending' || o.status === 'Approved') && !o.isForwardedToFinance).length,
      forwarded: orders.filter((o) => o.isForwardedToFinance).length,
      inProcurement: orders.filter((o) => o.status === 'In Procurement').length,
      completed: orders.filter((o) => o.status === 'Completed').length,
      totalVolume: totalRaw,
    }
  }, [orders])

  const formatCurrencyLakhs = (amt: number) => {
    if (amt >= 100000) {
      return `₹${(amt / 100000).toFixed(1)}L`
    }
    return `₹${amt.toLocaleString('en-IN')}`
  }

  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setCategoryFilter('All')
  }

  const isFilteringActive = search !== '' || statusFilter !== 'All' || categoryFilter !== 'All'

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-xs font-bold transition-all animate-bounce ${
            toast.type === 'success' ? 'bg-purple-600' : 'bg-blue-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* ── 1. PROFESSIONAL EXECUTIVE PAGE HEADER ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                <ShoppingBag size={12} />
                MANAGER REQUISITION DESK
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center gap-1">
                <Cpu size={11} /> Hardware Workflow
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                <Laptop size={11} /> Software Workflow
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                FY 2026-Q3 Cycle
              </span>
            </div>
            
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Package size={22} />
              </div>
              My Requests &amp; Procurement Tracking
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Comprehensive live ledger of all requisitions created by you. Expand any order to inspect real-time stage-by-stage progression, approval sign-offs, purchase order dispatch, and delivery fulfillment.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900 flex items-center justify-end gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {user?.first_name || 'Sarah'} {user?.last_name || 'Manager'}
              </div>
              <span className="text-[11px] text-slate-400">Department Procurement Manager</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. INTERACTIVE KPI METRIC STAT CARDS (5 CARDS) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Requests */}
        <div
          onClick={() => setStatusFilter('All')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs group ${
            statusFilter === 'All'
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-gradient-to-b from-blue-50/20 to-white'
              : 'border-slate-200/90 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Package size={20} />
            </div>
            <span className="text-[11px] font-bold text-slate-400 group-hover:text-blue-600 transition-colors flex items-center gap-0.5">
              {formatCurrencyLakhs(metrics.totalVolume)} Vol
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.total}</p>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs font-semibold text-slate-500">My Total Requests</p>
            {statusFilter === 'All' && (
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Active</span>
            )}
          </div>
        </div>

        {/* Card 2: In Review / Approval */}
        <div
          onClick={() => setStatusFilter('Pending')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs group ${
            statusFilter === 'Pending'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-gradient-to-b from-amber-50/20 to-white'
              : 'border-slate-200/90 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Clock size={20} />
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              Stages 1-2
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.pending}</p>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs font-semibold text-slate-500">In Review / Approval</p>
            {statusFilter === 'Pending' && (
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Active</span>
            )}
          </div>
        </div>

        {/* Card 3: Forwarded to Finance (NEW) */}
        <div
          onClick={() => setStatusFilter('Forwarded')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs group ${
            statusFilter === 'Forwarded'
              ? 'border-purple-500 ring-2 ring-purple-500/20 bg-gradient-to-b from-purple-50/20 to-white'
              : 'border-slate-200/90 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <ArrowUpRight size={20} />
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
              Finance Review
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.forwarded}</p>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs font-semibold text-slate-500">Forwarded to Finance</p>
            {statusFilter === 'Forwarded' && (
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Active</span>
            )}
          </div>
        </div>

        {/* Card 4: In Procurement / PO */}
        <div
          onClick={() => setStatusFilter('In Procurement')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs group ${
            statusFilter === 'In Procurement'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-gradient-to-b from-indigo-50/20 to-white'
              : 'border-slate-200/90 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Truck size={20} />
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Stages 4-8
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.inProcurement}</p>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs font-semibold text-slate-500">In Procurement / PO</p>
            {statusFilter === 'In Procurement' && (
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Active</span>
            )}
          </div>
        </div>

        {/* Card 5: Completed & Settled */}
        <div
          onClick={() => setStatusFilter('Completed')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs group ${
            statusFilter === 'Completed'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-gradient-to-b from-emerald-50/20 to-white'
              : 'border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Fulfilled
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.completed}</p>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs font-semibold text-slate-500">Completed &amp; Settled</p>
            {statusFilter === 'Completed' && (
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Active</span>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. COMMAND FILTER & SEARCH BAR ── */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Input with Clear Button */}
        <div className="relative flex-1 min-w-[260px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Request ID, title, preferred vendor, budget code, or PO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setCategoryFilter('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              categoryFilter === 'All'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setCategoryFilter('Hardware')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              categoryFilter === 'Hardware'
                ? 'bg-white text-cyan-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu size={12} />
            Hardware
          </button>
          <button
            onClick={() => setCategoryFilter('Software')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              categoryFilter === 'Software'
                ? 'bg-white text-purple-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Laptop size={12} />
            Software &amp; SaaS
          </button>
        </div>

        {/* Status Segmented Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['All', 'Pending', 'Forwarded', 'In Procurement', 'Completed'] as const).map((st) => {
            const count =
              st === 'All'
                ? metrics.total
                : st === 'Pending'
                ? metrics.pending
                : st === 'Forwarded'
                ? metrics.forwarded
                : st === 'In Procurement'
                ? metrics.inProcurement
                : metrics.completed

            const label =
              st === 'All'
                ? 'All'
                : st === 'Pending'
                ? 'In Review'
                : st === 'Forwarded'
                ? 'Forwarded to Finance'
                : st === 'In Procurement'
                ? 'In Procurement'
                : 'Completed'

            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    statusFilter === st ? 'bg-slate-800 text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}

          {isFilteringActive && (
            <button
              onClick={handleResetFilters}
              title="Reset search and filters"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── 4. REQUISITIONS RECORD CARDS LIST ── */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <ShoppingBag size={28} />
          </div>
          <p className="text-base font-bold text-slate-800">No Matching Requisitions Found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No procurement requests match your current search criteria or active status filter.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredOrders.length} of {orders.length} requisitions
            </span>
            <span className="text-xs text-slate-400">
              Click <span className="font-semibold text-slate-600">Track Order</span> to inspect real-time progression
            </span>
          </div>

          {filteredOrders.map((order) => {
            const isExpanded = expandedIds.has(order.id)
            const isSoftware = detectWorkflowType(order.category, order.title) === 'SOFTWARE'

            const progression = getWorkflowProgression({
              status: order.status,
              financeStatus: (order as any).financeStatus,
              paymentStatus: (order as any).paymentStatus,
              category: order.category,
              title: order.title,
              currentStage: order.currentStage,
              history: (order as any).history
            })
            const totalStages = progression.totalStages

            // Status Styling
            let statusBadge = 'bg-slate-100 text-slate-700 border-slate-200'
            let statusDot = 'bg-slate-400'
            if (order.status === 'Pending') {
              statusBadge = 'bg-amber-50 text-amber-800 border-amber-200'
              statusDot = 'bg-amber-500 animate-pulse'
            } else if (order.status === 'In Procurement') {
              statusBadge = 'bg-blue-50 text-blue-800 border-blue-200'
              statusDot = 'bg-blue-500 animate-pulse'
            } else if (order.status === 'Completed') {
              statusBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200'
              statusDot = 'bg-emerald-500'
            }

            return (
              <div
                key={order.id}
                className="group bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all overflow-hidden"
              >
                {/* Record Summary Card Header */}
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      {/* Meta badges row */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {/* Monospace Request ID */}
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50/80 px-2.5 py-0.5 rounded-lg border border-blue-200/70 shadow-2xs flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          {order.id}
                        </span>

                        {/* Date and Time */}
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                          <Calendar size={12} className="text-slate-400" />
                          {formatDate(order.date)} <span className="text-slate-300">•</span> {order.time}
                        </span>

                        {/* Category Pill with Icon */}
                        {isSoftware ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 bg-purple-50/80 px-2.5 py-0.5 rounded-lg border border-purple-200/70">
                            <Laptop size={11} className="text-purple-600" />
                            {order.category}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-800 bg-cyan-50/80 px-2.5 py-0.5 rounded-lg border border-cyan-200/70">
                            <Cpu size={11} className="text-cyan-600" />
                            {order.category}
                          </span>
                        )}

                        {/* Priority Pill */}
                        {order.priority === 'Critical' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/80 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            Critical Priority
                          </span>
                        )}
                        {order.priority === 'High' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            High Priority
                          </span>
                        )}
                        {order.priority === 'Medium' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/80">
                            Medium Priority
                          </span>
                        )}

                        {order.isForwardedToFinance && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                            <ArrowUpRight size={11} className="text-purple-600" />
                            Transmitted to Finance
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                        {order.title}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-4xl">
                        {order.description}
                      </p>
                    </div>

                    {/* Status Badge, Forward Button and EXPAND (^) Button */}
                    <div className="flex items-center gap-2 self-start flex-wrap">
                      {/* Status Pill */}
                      {order.isForwardedToFinance ? (
                        <span className="text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-2xs bg-purple-50 text-purple-700 border-purple-200">
                          <ArrowUpRight size={13} className="text-purple-600" />
                          Forwarded to Finance
                        </span>
                      ) : (
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-2xs ${statusBadge}`}>
                          <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                          {order.status === 'Pending' ? 'Under Review' : order.status}
                        </span>
                      )}

                      {/* Option for Forward to Finance */}
                      {order.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() => handleOpenForwardModal(order)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
                            order.isForwardedToFinance
                              ? 'bg-purple-100/60 text-purple-800 border-purple-300 hover:bg-purple-100'
                              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 hover:border-purple-300'
                          }`}
                          title="Forward / Endorse Requisition to Finance Portal"
                        >
                          <Send size={12} className={order.isForwardedToFinance ? 'text-purple-700' : 'text-purple-600'} />
                          <span>{order.isForwardedToFinance ? 'Re-Forward' : 'Forward to Finance'}</span>
                        </button>
                      )}

                      {/* Expand / Track Order Button */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(order.id)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs ${
                          isExpanded
                            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                        title={isExpanded ? 'Collapse Workflow Tracking' : 'Expand Workflow Tracking'}
                      >
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            isExpanded ? 'bg-blue-700 text-blue-100' : 'bg-slate-200/80 text-slate-700'
                          }`}
                        >
                          Stage {progression.currentStageIndex + 1}/{totalStages}
                        </span>
                        <span>{isExpanded ? 'Hide Tracking' : 'Track Order'}</span>
                        {isExpanded ? (
                          <ChevronUp size={15} strokeWidth={2.5} />
                        ) : (
                          <ChevronDown size={15} strokeWidth={2.5} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 4-Column Structured Request Metrics Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 mt-2 border-t border-slate-100 text-xs">
                    {/* Quantity & Unit */}
                    <div className="bg-slate-50/70 hover:bg-slate-50 p-3 rounded-xl border border-slate-100/90 transition-colors">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Package size={13} className="text-slate-500" />
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                          Quantity &amp; Spec
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-sm">
                        {order.quantity} {order.unit}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        {order.unitPrice}
                      </div>
                    </div>

                    {/* Total Estimated Cost */}
                    <div className="bg-slate-50/70 hover:bg-slate-50 p-3 rounded-xl border border-slate-100/90 transition-colors">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <IndianRupee size={13} className="text-blue-600" />
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                          Total Estimated Value
                        </span>
                      </div>
                      <div className="font-bold text-blue-600 text-sm">
                        {order.estCost}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate bg-white/70 px-1.5 py-0.5 rounded border border-slate-200/60 inline-block">
                        {order.budgetCode}
                      </div>
                    </div>

                    {/* Preferred Vendor */}
                    <div className="bg-slate-50/70 hover:bg-slate-50 p-3 rounded-xl border border-slate-100/90 transition-colors">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Building size={13} className="text-slate-500" />
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                          Preferred Vendor
                        </span>
                      </div>
                      <div className="font-semibold text-slate-900 truncate" title={order.vendor}>
                        {order.vendor}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                        {order.poNumber ? (
                          <span className="text-indigo-600 font-semibold">{order.poNumber}</span>
                        ) : (
                          <span className="text-slate-400 italic">PO Pending</span>
                        )}
                      </div>
                    </div>

                    {/* Currently Assigned To */}
                    <div className="bg-slate-50/70 hover:bg-slate-50 p-3 rounded-xl border border-slate-100/90 transition-colors">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <ShieldCheck size={13} className="text-slate-500" />
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                          Currently Assigned To
                        </span>
                      </div>
                      <div className="font-semibold text-slate-900 truncate" title={order.currentlyWith}>
                        {order.currentlyWith}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        Updated {formatDate(order.lastUpdated)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── EXPANDED SECTION: Order Tracking & Stage Progression Stepper ── */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/40 p-5 sm:p-6 space-y-4 animate-fadeIn">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          Order Tracking &amp; Workflow Stage Progression
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                          Stage {progression.currentStageIndex + 1} of {totalStages} ({isSoftware ? `Software ${totalStages}-Stage` : `Hardware ${totalStages}-Stage`})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        {order.poNumber && (
                          <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-semibold text-slate-700 shadow-2xs">
                            PO: {order.poNumber}
                          </span>
                        )}
                        {order.grnNumber && (
                          <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-semibold text-slate-700 shadow-2xs">
                            GRN: {order.grnNumber}
                          </span>
                        )}
                        <Link
                          to="/portal/manager/recommended-finance"
                          className="inline-flex items-center gap-1.5 font-bold text-purple-600 hover:text-purple-800 bg-white px-3 py-1.5 rounded-lg border border-purple-200 shadow-2xs hover:bg-purple-50 transition-colors"
                        >
                          <ArrowUpRight size={13} />
                          <span>Finance Review Queue</span>
                        </Link>
                        <Link
                          to="/portal/manager/raise-ticket"
                          className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-800 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-2xs hover:bg-blue-50 transition-colors"
                        >
                          <span>Raise Support Ticket</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>

                    {/* Dynamic Workflow Tracking Stepper Component */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs">
                      <TrackingStepper
                        category={order.category}
                        title={order.title}
                        currentStage={order.currentStage}
                        status={order.raw_status || order.status}
                        currentlyWith={order.currentlyWith}
                        financeStatus={order.financeStatus || order.rawRequest?.financeStatus}
                        paymentStatus={order.paymentStatus || order.rawRequest?.paymentStatus}
                        lastUpdated={order.lastUpdated}
                        history={order.history || order.rawRequest?.history}
                        approval_steps={order.rawRequest?.approval_steps || (order as any).approval_steps}
                        poNumber={order.poNumber || order.rawRequest?.po_number || order.rawRequest?.poNumber}
                        grnNumber={order.grnNumber || order.rawRequest?.grn_number || order.rawRequest?.grnNumber}
                        invoiceNumber={order.invoiceNumber || order.rawRequest?.invoice_number || order.rawRequest?.invoiceNumber}
                        documentsVerified={order.documentsVerified}
                        isVerified={order.documentsVerified}
                        is_invoice_verified={order.documentsVerified || order.rawRequest?.is_invoice_verified}
                        rfqId={(order as any).rfqId || order.rawRequest?.rfq_id || order.rawRequest?.rfqId}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── FORWARD TO FINANCE MODAL ── */}
      {forwardModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <Send size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Forward to Finance Portal</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Transmit requisition dossier to Finance for Capex clearance &amp; disbursement
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForwardModalOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Requisition Briefing Card */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-mono font-bold text-blue-700">
                <span>{forwardModalOrder.id}</span>
                <span className="text-slate-900 font-sans font-black">{forwardModalOrder.estCost}</span>
              </div>
              <p className="font-bold text-slate-800">{forwardModalOrder.title}</p>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                <span>Dept: <b>{forwardModalOrder.department}</b></span>
                <span>Vendor: <b>{forwardModalOrder.vendor}</b></span>
                <span>Qty: <b>{forwardModalOrder.quantity} {forwardModalOrder.unit}</b></span>
              </div>
            </div>

            {/* Manager Directives Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Preset Directives &amp; Compliance Tags:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Priority Capex Clearance',
                  'Budget Allocation Verified',
                  'Tax Invoice & Quote Attached',
                  'Settlement Terms: Net 30 Days',
                  'Direct RTGS Bank Transfer'
                ].map(tag => {
                  const isSelected = selectedDirectives.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleDirective(tag)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}{tag}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Manager Reason / Notes Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Endorsement Message &amp; Escalation Justification:
              </label>
              <textarea
                value={forwardReason}
                onChange={e => setForwardReason(e.target.value)}
                rows={3}
                placeholder="Specify recommendation notes for the Finance Controller..."
                className="w-full p-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setForwardModalOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmForward}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Send size={13} />
                <span>Confirm &amp; Forward to Finance</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
