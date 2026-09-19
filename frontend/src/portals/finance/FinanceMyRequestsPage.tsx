import React, { useState, useMemo } from 'react'
import {
  ShoppingBag, Search, CheckCircle, Clock, Truck, FileText,
  ChevronDown, ChevronUp, Plus, Building, User, Calendar,
  ShieldCheck, AlertCircle, ArrowRight, Layers, Tag, DollarSign,
  Package, MapPin, Check, SlidersHorizontal, RefreshCw, X, ArrowUpRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { TrackingStepper, StepHistoryItem } from '../../components/portal/TrackingStepper'
import { detectWorkflowType } from '../../utils/workflowUtils'
import { useAuth } from '../../context/AuthContext'
import { useFinanceData } from '../../context/ManagerDataContext'

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

const INITIAL_FINANCE_ORDERS: FinanceOrder[] = [
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
    requester: 'Mark Finance',
    priority: 'Critical',
    poNumber: 'PO-2026-4190',
    history: [
      {
        stageNumber: 1,
        stageName: 'Create Request',
        actor: 'Mark Finance (Finance Controller)',
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
    currentlyWith: 'Manager — Sarah Manager (Review)',
    lastUpdated: '2026-09-11 08:30 AM',
    department: 'Operations',
    requester: 'Sarah Manager',
    priority: 'Medium',
    history: [
      {
        stageNumber: 1,
        stageName: 'Create Request',
        actor: 'Operations Lead',
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
    requester: 'Mark Finance',
    priority: 'Medium',
    poNumber: 'PO-2026-3980',
    grnNumber: 'GRN-2026-1940',
    history: [
      {
        stageNumber: 1,
        stageName: 'Create Request',
        actor: 'Sales Operations',
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
    requester: 'Mark Finance',
    priority: 'High',
    history: [
      {
        stageNumber: 1,
        stageName: 'Create Request',
        actor: 'Facilities Desk',
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

export const FinanceMyRequestsPage: React.FC = () => {
  const { user } = useAuth()
  const { allRequests } = useFinanceData()
  const [orders, setOrders] = useState<FinanceOrder[]>(INITIAL_FINANCE_ORDERS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'In Procurement' | 'Completed'>('All')

  // Set of expanded order IDs
  // By default, open the first order so the user immediately sees the tracking workflow
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['REQ-2026-001']))

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
    return orders.filter((ord) => {
      const q = search.toLowerCase()
      const matchesSearch =
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
  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const newId = `REQ-2026-0${orders.length + 10}`
    const costVal = parseInt(newCost || '0')
    const createdOrder: FinanceOrder = {
      id: newId,
      title: newTitle,
      description: newDesc || 'Standard procurement order raised by finance.',
      category: newCategory,
      quantity: parseInt(newQty) || 1,
      unit: 'Units',
      estCost: `₹${costVal.toLocaleString('en-IN')}`,
      rawCost: costVal,
      unitPrice: `₹${costVal.toLocaleString('en-IN')}`,
      vendor: 'Vendor Pending Assignment',
      deliveryLocation: 'Finance Headquarters, Corporate Tower',
      budgetCode: 'OPEX-FIN-2026',
      date: new Date().toISOString().split('T')[0],
      time: 'Just now',
      status: 'Pending',
      currentStage: 1, // Manager / Finance Review
      currentlyWith: 'Finance Review (Self-Review)',
      lastUpdated: 'Just now',
      department: String(user?.department || 'Finance'),
      requester: `${user?.first_name || 'Mark'} ${user?.last_name || 'Finance'}`,
      priority: 'Medium',
      history: [
        {
          stageNumber: 1,
          stageName: 'Create Request',
          actor: `${user?.first_name || 'Mark'} ${user?.last_name || 'Finance'}`,
          action: 'Created Request',
          timestamp: 'Today, Just now',
          note: newDesc || 'Initial procurement request created by finance officer.',
        },
      ],
    }

    setOrders([createdOrder, ...orders])
    setExpandedIds(new Set([newId, ...Array.from(expandedIds)]))
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
                          <Calendar size={12} /> {order.date} at {order.time}
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
                        Updated {order.lastUpdated}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* EXPANDED SECTION: Order Tracking & 10-Stage Workflow */}
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
