import React, { useState, useMemo } from 'react'
import {
  ShoppingBag, Search, CheckCircle, Clock, Truck, FileText,
  ChevronDown, ChevronUp, Plus, Building, User, Calendar,
  ShieldCheck, AlertCircle, ArrowRight, Layers, Tag, IndianRupee,
  Package, MapPin, Check, SlidersHorizontal, RefreshCw, X, ArrowUpRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { TrackingStepper, StepHistoryItem } from '../../components/portal/TrackingStepper'
import { detectWorkflowType, getWorkflowProgression } from '../../utils/workflowUtils'
import { useAuth } from '../../context/AuthContext'
import { useFinanceData, PurchaseOrderItem, GoodsReceiptItem } from '../../context/ManagerDataContext'
import { apiClient } from '../../api/client'
import { formatDate } from '../../utils/formatDate'

export interface FinanceOrder {
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
  time: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'In Procurement' | 'Completed'
  currentStage: number // 0 to 9
  currentlyWith: string
  lastUpdated: string
  department: string
  requester: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  poNumber?: string
  grnNumber?: string
  history?: StepHistoryItem[]
  financeStatus?: string
  paymentStatus?: string
}

const mapRequestToFinanceOrder = (
  r: any,
  purchaseOrders: PurchaseOrderItem[] = [],
  receipts: GoodsReceiptItem[] = []
): FinanceOrder => {
  const rawCost = Number(r.amount ?? r.total_estimated_cost ?? r.estimated_cost ?? r.estimatedCost ?? 0) || 0

  // Look for real Purchase Order in DB relations
  const matchedPo = purchaseOrders.find(
    po => po.requestId === r.id || String(po.id) === String(r.poNumber) || po.requestId === r.request_id || (r.id && po.requestId?.includes(r.id))
  )
  const realPoNumber = r.poNumber || r.po_number || matchedPo?.poNumber || matchedPo?.id

  // Look for real Goods Receipt in DB relations
  const matchedReceipt = receipts.find(
    rec => (realPoNumber && rec.poNumber === realPoNumber) || rec.requestId === r.id
  )
  const realGrnNumber = r.grnNumber || r.grn_number || matchedReceipt?.grnNumber || matchedReceipt?.id

  // Status mapping
  const normalizedStatus = String(r.status || '').toLowerCase()
  const rawStatus = String(r.raw_status || '').toUpperCase()
  const isRecommendedToAdmin =
    normalizedStatus === 'recommended_to_admin' ||
    rawStatus === 'RECOMMENDED_TO_ADMIN' ||
    rawStatus === 'FINANCE_RECOMMENDED_TO_ADMIN' ||
    r.financeStatus === 'Recommended to Admin'
  let st: FinanceOrder['status'] = 'Pending'
  if (normalizedStatus === 'completed' || rawStatus === 'COMPLETED' || (!isRecommendedToAdmin && (r.currentStage ?? 1) >= 9)) st = 'Completed'
  else if (normalizedStatus === 'rejected' || normalizedStatus === 'finance_rejected' || rawStatus === 'REJECTED' || rawStatus === 'FINANCE_REJECTED') st = 'Rejected'
  else if (!isRecommendedToAdmin && (normalizedStatus === 'approved' || normalizedStatus === 'admin_approved' || normalizedStatus === 'quotes_received' || normalizedStatus === 'assigned_to_vendor' || normalizedStatus === 'delivered' || normalizedStatus === 'invoiced')) st = 'In Procurement'
  else if (!isRecommendedToAdmin && (normalizedStatus === 'finance_approved' || r.financeStatus === 'Approved')) st = 'Approved'
  else st = 'Pending'

  // Compute progression to get authoritative currentlyWith and stage details
  const progression = getWorkflowProgression({
    status: r.status,
    financeStatus: r.financeStatus,
    category: r.category,
    title: r.title,
    paymentStatus: r.paymentStatus,
    currentStage: r.currentStage,
    history: r.history,
  })

  // Format real last updated timestamp
  const latestHistoryDate = Array.isArray(r.history) && r.history.length > 0
    ? r.history[r.history.length - 1].date || r.history[r.history.length - 1].timestamp
    : undefined
  const rawLastUpdated = latestHistoryDate || r.updatedAt || r.updated_at || r.lastUpdated || r.createdAt || r.created_at || r.date
  const formattedLastUpdated = rawLastUpdated ? (rawLastUpdated.includes('T') ? rawLastUpdated.split('T')[0] : rawLastUpdated) : (r.date || '2026-09-11')

  const realVendor = matchedPo?.vendor || r.vendor || (r.preferred_vendor && r.preferred_vendor.toLowerCase() !== 'preferred vendor' ? r.preferred_vendor : '—')

  return {
    id: r.id,
    title: r.title,
    description: r.description || r.justification || 'Requisition submitted through Procurement OS.',
    category: r.category || 'General',
    quantity: r.quantity || 1,
    unit: 'Units',
    estCost: `₹${rawCost.toLocaleString('en-IN')}`,
    rawCost: rawCost,
    unitPrice: `₹${(r.quantity ? Math.round(rawCost / r.quantity) : rawCost).toLocaleString('en-IN')}`,
    vendor: realVendor,
    deliveryLocation: r.deliveryLocation || r.delivery_location || 'Pune HQ',
    budgetCode: r.costCenter || r.budgetCode || `CC-${(r.department || 'FIN').toUpperCase().slice(0, 3)}-2026`,
    date: r.date,
    createdAt: r.createdAt || r.created_at || r.date,
    time: '10:00 AM',
    status: st,
    currentStage: typeof r.currentStage === 'number' ? r.currentStage : progression.currentStageIndex,
    currentlyWith: r.currentlyWith || r.currently_with || progression.currentlyWith,
    lastUpdated: formattedLastUpdated,
    department: r.department || 'Finance',
    requester: r.requester || 'Mark Finance',
    priority: r.priority || 'Medium',
    poNumber: realPoNumber || undefined,
    grnNumber: realGrnNumber || undefined,
    financeStatus: r.financeStatus,
    paymentStatus: r.paymentStatus,
    history: Array.isArray(r.history) && r.history.length > 0 ? r.history.map((h: any, idx: number) => ({
      stageNumber: idx + 1,
      stageName: h.stageName || h.action || `Stage ${idx + 1}`,
      actor: h.actor ? (h.actor.includes('(') ? h.actor : `${h.actor} (${h.actorRole || 'Reviewer'})`) : `${h.actorName || 'User'} (${h.actorRole || 'Reviewer'})`,
      action: h.action || 'Updated',
      timestamp: h.timestamp || h.date || formattedLastUpdated,
      note: h.note || h.remark || '',
    })) : undefined
  }
}

export const FinanceMyRequestsPage: React.FC = () => {
  const { user } = useAuth()
  const { financeRequests, purchaseOrders, receipts } = useFinanceData()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'In Procurement' | 'Completed'>('All')

  // Real orders mapped dynamically from PostgreSQL backend financeRequests
  const orders = useMemo(() => {
    return financeRequests.map(r => mapRequestToFinanceOrder(r, purchaseOrders, receipts))
  }, [financeRequests, purchaseOrders, receipts])

  // Set of expanded order IDs
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Modal for creating new request
  const [showNewModal, setShowNewModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('IT Hardware & Infrastructure')
  const [newCost, setNewCost] = useState('')
  const [newQty, setNewQty] = useState('1')
  const [newDesc, setNewDesc] = useState('')

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


  // Filtered orders
  const filteredOrders = useMemo(() => {
    const q = (search || '').toLowerCase().trim()
    return orders.filter((ord) => {
      const matchesSearch =
        !q ||
        String(ord.id || '').toLowerCase().includes(q) ||
        String(ord.title || '').toLowerCase().includes(q) ||
        String(ord.category || '').toLowerCase().includes(q) ||
        String(ord.department || '').toLowerCase().includes(q) ||
        String(ord.vendor || '').toLowerCase().includes(q) ||
        String(ord.poNumber || '').toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'Pending'
          ? ord.status === 'Pending' || ord.status === 'Approved'
          : ord.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [orders, search, statusFilter])

  // Summary Metrics
  const metrics = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'Pending' || o.status === 'Approved').length,
      inProcurement: orders.filter((o) => o.status === 'In Procurement').length,
      completed: orders.filter((o) => o.status === 'Completed').length,
    }
  }, [orders])

  // Handle New Request Creation
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const newId = `REQ-${Date.now().toString().slice(-6)}`
    const costVal = parseInt(newCost || '0')
    const qtyVal = parseInt(newQty) || 1

    try {
      await apiClient.post('/requests/', {
        title: newTitle,
        category: newCategory,
        description: newDesc || 'Standard procurement order raised by finance.',
        quantity: qtyVal,
        required_by: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        delivery_location: 'Finance Headquarters, Corporate Tower',
        priority: 'Medium',
        justification: newDesc || 'Procurement request initiated from Finance portal.',
        total_estimated_cost: costVal,
      })
      window.dispatchEvent(new Event('kss_backend_updated'))
    } catch (err) {
      console.error('Failed to create finance request:', err)
    }

    setShowNewModal(false)
    setNewTitle('')
    setNewCost('')
    setNewDesc('')
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-wider">
              Finance Portal
            </span>
            <span className="text-xs text-slate-400">Created by {user?.first_name || 'Mark'} {user?.last_name || 'Finance'}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <ShoppingBag className="text-indigo-600" size={26} /> My Requests
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full record of all requests created by you. Expand any order to view its live 10-stage tracking workflow and approval timeline.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all"
          >
            <Plus size={16} /> New Request
          </button>
        </div>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <ShoppingBag size={20} />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{metrics.total}</p>
            <p className="text-xs text-slate-500 font-medium">My Total Requests</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{metrics.pending}</p>
            <p className="text-xs text-slate-500 font-medium">In Review / Approval</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Truck size={20} />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{metrics.inProcurement}</p>
            <p className="text-xs text-slate-500 font-medium">In Procurement / PO</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{metrics.completed}</p>
            <p className="text-xs text-slate-500 font-medium">Completed & Settled</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search my requests by ID, title, vendor, category, or PO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['All', 'Pending', 'In Procurement', 'Completed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'Pending' ? 'In Review / Pending' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests / Orders List — Rendered One by One as Individual Records */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-2xs">
          <ShoppingBag size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-bold text-slate-700">No Requests Found</p>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search query or status filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = expandedIds.has(order.id)

            // Status Styling
            let statusBadge = 'bg-slate-100 text-slate-700 border-slate-200'
            if (order.status === 'Pending') statusBadge = 'bg-amber-50 text-amber-700 border-amber-200'
            if (order.status === 'In Procurement') statusBadge = 'bg-blue-50 text-blue-700 border-blue-200'
            if (order.status === 'Completed') statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200'

            // Priority badge styling
            let priorityBadge = 'bg-blue-100 text-blue-900 border border-blue-300'
            if (order.priority === 'Critical') priorityBadge = 'bg-rose-100 text-rose-900 border border-rose-300'
            if (order.priority === 'High') priorityBadge = 'bg-amber-100 text-amber-900 border border-amber-300'
            if (order.priority === 'Low') priorityBadge = 'bg-emerald-100 text-emerald-900 border border-emerald-300'

            return (
              <div
                key={order.id}
                className="req-card-elevated rounded-2xl p-0 overflow-hidden"
              >
                {/* Record Summary Card Header */}
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      {/* Meta badges row */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                          {order.id}
                        </span>

                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                          <Calendar size={12} /> {formatDate(order.date)} at {order.time}
                        </span>

                        <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {order.category}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${priorityBadge}`}>
                          {order.priority} Priority
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h2 className="text-base font-bold text-slate-900 leading-snug">
                        {order.title}
                      </h2>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-4xl">
                        {order.description}
                      </p>
                    </div>

                    {/* Status Badge and EXPAND (^) Button */}
                    <div className="flex items-center gap-3 self-start">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusBadge}`}>
                        {order.status === 'Pending' ? 'Under Review' : order.status}
                      </span>

                      {/* Expand (^) Option */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(order.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isExpanded
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title={isExpanded ? 'Collapse Order Tracking' : 'Expand Order Tracking'}
                      >
                        <span>{isExpanded ? 'Hide Tracking' : 'Track Order'}</span>
                        {isExpanded ? <ChevronUp size={16} strokeWidth={2.5} /> : <ChevronDown size={16} strokeWidth={2.5} />}
                      </button>
                    </div>
                  </div>

                  {/* Complete Request/Order Information Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-4 mt-2 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Quantity & Unit
                      </span>
                      <span className="font-bold text-slate-800">
                        {order.quantity} {order.unit}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {order.unitPrice}
                      </span>
                    </div>

                    <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Total Estimated Cost
                      </span>
                      <span className="font-bold text-slate-900 text-sm text-indigo-600">
                        {order.estCost}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Budget: {order.budgetCode}
                      </span>
                    </div>

                    <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Preferred Vendor
                      </span>
                      <span className="font-semibold text-slate-800 truncate block" title={order.vendor}>
                        {order.vendor}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {order.poNumber ? `PO: ${order.poNumber}` : 'PO Pending'}
                      </span>
                    </div>

                    <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Currently Assigned To
                      </span>
                      <span className="font-semibold text-slate-800 truncate block" title={order.currentlyWith}>
                        {order.currentlyWith}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Updated {formatDate(order.lastUpdated)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* EXPANDED SECTION: Order Tracking & Workflow */}
                {/* ========================================================= */}
                {isExpanded && (
                  <div className="border-t-2 border-indigo-500/20 bg-gradient-to-b from-indigo-50/20 to-transparent p-5 sm:p-6 space-y-4 animate-fadeIn">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                        <h3 className="text-sm font-bold text-slate-900">
                          Order Tracking & Workflow Stage Progression
                        </h3>
                        <span className="text-xs text-slate-400">
                          (Stage {order.currentStage + 1} of {detectWorkflowType(order.category, order.title) === 'SOFTWARE' ? 6 : 10})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        {order.poNumber && (
                          <span className="font-mono bg-white px-2.5 py-1 rounded-md border border-slate-200 font-semibold text-slate-700">
                            PO: {order.poNumber}
                          </span>
                        )}
                        {order.grnNumber && (
                          <span className="font-mono bg-white px-2.5 py-1 rounded-md border border-slate-200 font-semibold text-slate-700">
                            GRN: {order.grnNumber}
                          </span>
                        )}
                        <Link
                          to="/portal/finance/raise-ticket"
                          className="font-bold text-indigo-600 hover:text-indigo-800 bg-white px-3 py-1 rounded-md border border-indigo-200 shadow-2xs hover:bg-indigo-50 transition-colors"
                        >
                          Raise Ticket &rarr;
                        </Link>
                      </div>
                    </div>

                    {/* Dynamic Workflow Tracking Stepper Component */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                      <TrackingStepper
                        category={order.category}
                        title={order.title}
                        currentStage={order.currentStage}
                        status={order.status}
                        currentlyWith={order.currentlyWith}
                        lastUpdated={order.lastUpdated}
                        history={order.history}
                        approval_steps={(order as any).approval_steps}
                        financeStatus={order.financeStatus}
                        paymentStatus={order.paymentStatus}
                        poNumber={order.poNumber}
                        grnNumber={order.grnNumber}
                        invoiceNumber={(order as any).invoiceNumber}
                        is_invoice_verified={(order as any).is_invoice_verified}
                        rfqId={(order as any).rfqId}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Create New Request */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Create New Procurement Request</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="py-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Request Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 15x Developer Workstations for New Hires"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="IT Hardware & Infrastructure">IT Hardware & Infrastructure</option>
                    <option value="Software & SaaS">Software & SaaS</option>
                    <option value="Furniture & Facilities">Furniture & Facilities</option>
                    <option value="Consulting & Professional Services">Consulting & Professional Services</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Estimated Total Cost (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 250000"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Justification / Business Need
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this equipment or service is needed..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
