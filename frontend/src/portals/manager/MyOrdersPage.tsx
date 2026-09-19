import React, { useState, useMemo } from 'react'
import {
  ShoppingBag, Search, CheckCircle, Clock, Truck, FileText,
  ChevronDown, ChevronUp, Plus, Building, User, Calendar,
  ShieldCheck, AlertCircle, ArrowRight, Layers, Tag, DollarSign,
  Package, MapPin, Check, SlidersHorizontal, RefreshCw, X,
  Laptop, Cpu, CheckCircle2, Sparkles, TrendingUp, ExternalLink,
  ArrowUpRight, RotateCcw, AlertTriangle, HelpCircle, Filter
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { TrackingStepper, StepHistoryItem } from '../../components/portal/TrackingStepper'
import { detectWorkflowType } from '../../utils/workflowUtils'
import { useAuth } from '../../context/AuthContext'
import { useManagerData } from '../../context/ManagerDataContext'

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
}

const INITIAL_ORDERS: ManagerOrder[] = [
  {
    id: 'REQ-2026-001',
    title: 'High Performance Laptops for Engineering Team',
    description: '10x high-spec 14-inch mobile workstations with 32GB RAM for local LLM compilation, machine learning model prototyping, and developer productivity.',
    category: 'IT Hardware & Infrastructure',
    quantity: 10,
    unit: 'Units',
    estCost: '₹3,50,000',
    rawCost: 350000,
    unitPrice: '₹35,000 / unit',
    vendor: 'Dell Technologies Enterprise',
    deliveryLocation: 'Bangalore Campus, Innovation Tower, Floor 4',
    budgetCode: 'CAPEX-ENG-2026-Q3',
    date: '2026-09-10',
    time: '10:14 AM',
    status: 'In Procurement',
    currentStage: 6, // Stage 7: Delivery
    currentlyWith: 'Logistics & Receiving Dock',
    lastUpdated: '2026-09-11 10:45 AM',
    department: 'Engineering',
    requester: 'Sarah Manager',
    priority: 'High',
    poNumber: 'PO-2026-4582',
    grnNumber: 'GRN-2026-2214',
    history: [
      {
        stageNumber: 1,
        stageName: 'Create Request',
        actor: 'Sarah Manager (Manager)',
        action: 'Created & Submitted Request',
        timestamp: '2026-09-10 10:14 AM',
        note: '10x high-spec laptops requested for machine learning builds and compiler workloads.',
      },
      {
        stageNumber: 2,
        stageName: 'Manager Approval',
        actor: 'Sarah Manager (Self-Verified)',
        action: 'Department Need Approved',
        timestamp: '2026-09-10 11:30 AM',
        note: 'Verified against team headcount growth and technical specs.',
      },
      {
        stageNumber: 3,
        stageName: 'Finance Approval',
        actor: 'Mark Finance (Finance Controller)',
        action: 'Capex Certified & Approved',
        timestamp: '2026-09-10 03:20 PM',
        note: 'Budget allocation verified under CAPEX-ENG-2026-Q3.',
      },
      {
        stageNumber: 4,
        stageName: 'Admin Approval',
        actor: 'David Admin (Head of Operations)',
        action: 'Executive Sign-off Granted',
        timestamp: '2026-09-10 05:00 PM',
      },
      {
        stageNumber: 5,
        stageName: 'RFQ Sent',
        actor: 'Procurement Desk',
        action: 'RFQ #982 Issued to Approved Vendors',
        timestamp: '2026-09-11 09:00 AM',
      },
      {
        stageNumber: 6,
        stageName: 'Vendor Quotes Received',
        actor: 'Dell Technologies Enterprise',
        action: 'Quotation QUO-4582 ($35,000) Ingested',
        timestamp: '2026-09-11 10:00 AM',
        note: 'Best price-to-warranty ratio selected among 3 supplier bids.',
      },
      {
        stageNumber: 7,
        stageName: 'Delivery',
        actor: 'Logistics & Receiving Dock',
        action: 'Goods Received & Inspected at Central Dock',
        timestamp: '2026-09-11 10:45 AM',
        note: 'Dock intake verified against packing slip and serial numbers.',
      },
    ],
  },
  {
    id: 'REQ-2026-012',
    title: 'Cloud Infrastructure Yearly Enterprise Renewal (AWS & GCP)',
    description: 'Annual compute and object storage reservation contract extension for core microservices, multi-region Kubernetes clusters, and database backups.',
    category: 'Software & SaaS',
    quantity: 1,
    unit: 'Annual Contract',
    estCost: '₹5,80,000',
    rawCost: 580000,
    unitPrice: '₹5,80,000 / year',
    vendor: 'Amazon Web Services India Pvt Ltd',
    deliveryLocation: 'Virtual Cloud Enterprise Tenant',
    budgetCode: 'OPEX-CLOUD-2026-ANNUAL',
    date: '2026-09-08',
    time: '09:30 AM',
    status: 'Pending',
    currentStage: 2, // Stage 3: Finance Approval
    currentlyWith: 'Finance Review — Mark Finance',
    lastUpdated: '2026-09-11 09:15 AM',
    department: 'DevOps & IT',
    requester: 'Sarah Manager',
    priority: 'Critical',
    poNumber: 'PO-2026-4190',
    history: [
      {
        stageNumber: 1,
        stageName: 'Create Request',
        actor: 'Sarah Manager (Manager)',
        action: 'Submitted Renewal Contract Request',
        timestamp: '2026-09-08 09:30 AM',
        note: '32% discount commitment secured for upfront yearly reservation.',
      },
      {
        stageNumber: 2,
        stageName: 'Manager Approval',
        actor: 'Sarah Manager (Manager)',
        action: 'Approved & Recommended to Finance',
        timestamp: '2026-09-08 02:15 PM',
        note: 'Approved. Forwarded for high-value OPEX verification.',
      },
      {
        stageNumber: 3,
        stageName: 'Finance Approval',
        actor: 'Mark Finance (Finance Controller)',
        action: 'Under Financial Review',
        timestamp: '2026-09-11 09:15 AM',
        note: 'Verifying quarterly cashflow allocation for upfront annual payment.',
      },
    ],
  },
  {
    id: 'REQ-2026-018',
    title: 'Standing Desks & Ergonomic Accessories for Operations Floor',
    description: '20x motorized dual-motor height-adjustable desks with cable management and monitor arm mounts for ergonomic workplace standard compliance.',
    category: 'Furniture & Facilities',
    quantity: 20,
    unit: 'Sets',
    estCost: '₹2,85,000',
    rawCost: 285000,
    unitPrice: '₹14,250 / set',
    vendor: 'Featherlite Commercial Furniture',
    deliveryLocation: 'Operations Wing, 2nd Floor, Facility Central',
    budgetCode: 'FAC-FURN-2026-Q3',
    date: '2026-09-07',
    time: '11:20 AM',
    status: 'Pending',
    currentStage: 1, // Stage 2: Manager Approval
    currentlyWith: 'Manager — Sarah Manager (Self-Review)',
    lastUpdated: '2026-09-11 08:30 AM',
    department: 'Operations',
    requester: 'Sarah Manager',
    priority: 'Medium',
    history: [
      {
        stageNumber: 1,
        stageName: 'Create Request',
        actor: 'Sarah Manager (Manager)',
        action: 'Request Drafted & Submitted',
        timestamp: '2026-09-07 11:20 AM',
        note: 'Ergonomic audit recommendation for operations desk setup.',
      },
      {
        stageNumber: 2,
        stageName: 'Manager Approval',
        actor: 'Sarah Manager (Manager)',
        action: 'In Progress — Verifying Space Plan',
        timestamp: '2026-09-11 08:30 AM',
      },
    ],
  },
  {
    id: 'REQ-2026-003',
    title: 'Enterprise CRM Software Annual License (50 Seats)',
    description: '50x enterprise sales CRM user licenses with sales pipeline automation, custom reporting dashboards, and Slack integration add-on.',
    category: 'Software & SaaS',
    quantity: 50,
    unit: 'User Seats',
    estCost: '₹1,20,000',
    rawCost: 120000,
    unitPrice: '₹2,400 / seat / year',
    vendor: 'Salesforce Enterprise Solutions',
    deliveryLocation: 'Corporate Digital Workspace',
    budgetCode: 'SAAS-SUBS-2026',
    date: '2026-09-01',
    time: '09:00 AM',
    status: 'Completed',
    currentStage: 9, // Stage 10: Payment Settled
    currentlyWith: 'Finance Accounts — Complete',
    lastUpdated: '2026-09-09 04:00 PM',
    department: 'Sales & BD',
    requester: 'Sarah Manager',
    priority: 'Medium',
    poNumber: 'PO-2026-3980',
    grnNumber: 'GRN-2026-1940',
    history: [
      {
        stageNumber: 1,
        stageName: 'Create Request',
        actor: 'Sarah Manager',
        action: 'Created Request',
        timestamp: '2026-09-01 09:00 AM',
      },
      {
        stageNumber: 2,
        stageName: 'Manager Approval',
        actor: 'Sarah Manager',
        action: 'Approved',
        timestamp: '2026-09-02 11:30 AM',
      },
      {
        stageNumber: 3,
        stageName: 'Finance Approval',
        actor: 'Mark Finance',
        action: 'Approved',
        timestamp: '2026-09-03 02:15 PM',
      },
      {
        stageNumber: 7,
        stageName: 'Delivery',
        actor: 'IT Systems Admin',
        action: 'License Keys Provisioned & Validated',
        timestamp: '2026-09-04 10:00 AM',
      },
      {
        stageNumber: 8,
        stageName: 'Invoice',
        actor: 'Finance Accounts',
        action: 'Invoice Reconciled & Validated',
        timestamp: '2026-09-05 02:00 PM',
      },
      {
        stageNumber: 9,
        stageName: 'Verification and Order Complete',
        actor: 'Procurement Audit Desk',
        action: 'Order Reconciled & Certified',
        timestamp: '2026-09-06 03:00 PM',
        note: 'Order verified and operational compliance achieved.',
      },
      {
        stageNumber: 10,
        stageName: 'Payment',
        actor: 'Finance Treasury',
        action: 'Final Payment Disbursed & Settled',
        timestamp: '2026-09-09 04:00 PM',
        note: 'Payment processed and disbursed. Requisition fully settled.',
      },
    ],
  },
  {
    id: 'REQ-2026-024',
    title: 'Server Room Precision Cooling Units & Annual Maintenance',
    description: '2x 5.5-ton precision split air conditioning units with continuous humidity control and automatic failover switch for primary datacenter rack array.',
    category: 'Facilities & Hardware',
    quantity: 2,
    unit: 'Units',
    estCost: '₹4,10,000',
    rawCost: 410000,
    unitPrice: '₹2,05,000 / unit',
    vendor: 'Daikin Commercial HVAC Systems',
    deliveryLocation: 'Central Server Room B, Basement Level',
    budgetCode: 'CAPEX-DC-2026',
    date: '2026-09-05',
    time: '02:40 PM',
    status: 'In Procurement',
    currentStage: 4, // Stage 5: RFQ Sent
    currentlyWith: 'Procurement — Vendor RFQ Desk',
    lastUpdated: '2026-09-10 03:15 PM',
    department: 'Infrastructure',
    requester: 'Sarah Manager',
    priority: 'High',
    history: [
      {
        stageNumber: 1,
        stageName: 'Create Request',
        actor: 'Sarah Manager',
        action: 'Submitted Request',
        timestamp: '2026-09-05 02:40 PM',
      },
      {
        stageNumber: 2,
        stageName: 'Manager Approval',
        actor: 'Sarah Manager',
        action: 'Approved & Justified',
        timestamp: '2026-09-06 10:00 AM',
      },
      {
        stageNumber: 3,
        stageName: 'Finance Approval',
        actor: 'Mark Finance',
        action: 'Capex Approved',
        timestamp: '2026-09-08 04:30 PM',
      },
      {
        stageNumber: 5,
        stageName: 'RFQ Sent',
        actor: 'Procurement Desk',
        action: 'RFQ #994 Active with 3 HVAC Vendors',
        timestamp: '2026-09-10 03:15 PM',
        note: 'Awaiting vendor sealed technical proposals.',
      },
    ],
  },
]

export const MyOrdersPage: React.FC = () => {
  const { user } = useAuth()
  const { allRequests } = useManagerData()

  const liveOrders = useMemo<ManagerOrder[]>(() => {
    if (!allRequests || allRequests.length === 0) return []
    return allRequests.map((req) => {
      const isCompleted = (req.status as string) === 'completed' || req.status === 'delivered'
      const isInProcurement = req.status === 'assigned_to_vendor' || req.status === 'vendor_accepted'
      const isRejected = req.status === 'rejected' || req.status === 'finance_rejected' || req.status === 'vendor_rejected'
      
      let status: 'Pending' | 'Approved' | 'Rejected' | 'In Procurement' | 'Completed' = 'Pending'
      if (isCompleted) status = 'Completed'
      else if (isInProcurement) status = 'In Procurement'
      else if (isRejected) status = 'Rejected'
      else if (req.status === 'approved' || req.status === 'finance_review' || req.status === 'recommended_to_finance' || req.status === 'finance_approved') status = 'Approved'
      else status = 'Pending'

      const qty = req.quantity || 1
      const totalCost = req.amount || req.approvalParams?.approvedAmount || 0
      const unitPriceVal = qty > 0 ? Math.round(totalCost / qty) : totalCost
      const deptClean = (req.department || 'IT').toUpperCase().replace(/\s+/g, '')

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
        time: '10:00 AM',
        status: status,
        currentStage: status === 'Approved' ? 3 : (req.currentStage ? req.currentStage : (isCompleted ? 9 : 2)),
        currentlyWith: status === 'Approved' ? 'Finance Department' : req.status === 'pending_approval' ? 'Manager Sign-off' : 'Procurement Team',
        lastUpdated: req.date,
        department: req.department,
        requester: req.requester,
        priority: (req.priority as any) || 'Medium',
      }
    })
  }, [allRequests])

  const orders = liveOrders
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'In Procurement' | 'Completed'>('All')
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Hardware' | 'Software'>('All')

  // Set of expanded order IDs
  // By default, open the first order so the user immediately sees the tracking workflow
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['REQ-2026-001']))

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
          ? ord.status === 'Pending' || ord.status === 'Approved'
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
      pending: orders.filter((o) => o.status === 'Pending' || o.status === 'Approved').length,
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
                <Cpu size={11} /> Hardware (10 Stages)
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                <Laptop size={11} /> Software (6 Stages)
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

      {/* ── 2. INTERACTIVE KPI METRIC STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              Stages 1-3
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

        {/* Card 3: In Procurement / PO */}
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

        {/* Card 4: Completed & Settled */}
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
          {(['All', 'Pending', 'In Procurement', 'Completed'] as const).map((st) => {
            const count =
              st === 'All'
                ? metrics.total
                : st === 'Pending'
                ? metrics.pending
                : st === 'In Procurement'
                ? metrics.inProcurement
                : metrics.completed

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
                <span>{st === 'Pending' ? 'In Review' : st}</span>
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
            const totalStages = isSoftware ? 6 : 10

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
                          {order.date} <span className="text-slate-300">•</span> {order.time}
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
                      </div>

                      {/* Title & Description */}
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                        {order.title}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-4xl">
                        {order.description}
                      </p>
                    </div>

                    {/* Status Badge and EXPAND (^) Button */}
                    <div className="flex items-center gap-2.5 self-start">
                      {/* Status Pill */}
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-2xs ${statusBadge}`}>
                        <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                        {order.status === 'Pending' ? 'Under Review' : order.status}
                      </span>

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
                          Stage {order.currentStage + 1}/{totalStages}
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
                        <DollarSign size={13} className="text-blue-600" />
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
                        Updated {order.lastUpdated}
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
                          Stage {order.currentStage + 1} of {totalStages} ({isSoftware ? 'Software 6-Stage' : 'Hardware 10-Stage'})
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
                        status={order.status}
                        currentlyWith={order.currentlyWith}
                        lastUpdated={order.lastUpdated}
                        history={order.history}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
