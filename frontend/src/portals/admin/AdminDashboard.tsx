import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts'
import {
  ShieldCheck, FileText, CheckCircle2, XCircle, Clock,
  TrendingUp, IndianRupee, Building, AlertTriangle,
  ArrowUpRight, RotateCcw, PackageCheck, Layers,
  Calendar, Filter, CheckSquare, Sparkles,
  Eye, CheckCircle, ArrowRight, X, User
} from 'lucide-react'
import { useManagerData, ProcurementRequest, ApprovalParameters } from '../../context/ManagerDataContext'
import { TrackingStepper } from '../../components/portal/TrackingStepper'
import { RequestDetailsModal } from '../../components/portal/RequestDetailsModal'
import { RequestApprovalModal } from '../../components/portal/RequestApprovalModal'
import { PROCUREMENT_CATEGORIES } from './AdminDepartmentsPage'
import { formatDate } from '../../utils/formatDate'
import { sortRequestsNewestFirst } from '../../utils/workflowUtils'

const priorityStyles: Record<string, string> = {
  Critical: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
  High: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
  Medium: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
  Low: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
}

const CATEGORY_COLORS: Record<string, string> = {
  'IT Hardware': '#3B82F6',
  'Software & SaaS': '#8B5CF6',
  'Cloud & Infrastructure': '#06B6D4',
  'Cybersecurity': '#10B981',
  'IT Services': '#6366F1',
  'Office Accessories': '#F59E0B',
  'Office Technology': '#EC4899',
  'Networking & Telecom': '#14B8A6',
  'Training & Certifications': '#F97316',
}

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-slate-900/95 text-white px-3 py-2 rounded-xl shadow-2xl border border-slate-700/80 text-xs backdrop-blur-md z-50">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full ring-2 ring-white/20 shrink-0" style={{ backgroundColor: data.color }} />
          <span className="font-bold text-white text-xs">{data.name}</span>
        </div>
        <div className="space-y-0.5 text-[11px] text-slate-300 font-mono">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Requisitions:</span>
            <strong className="text-white font-bold">{data.value} reqs</strong>
          </div>
          {data.percentage !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Share:</span>
              <strong className="text-emerald-400 font-bold">{data.percentage}%</strong>
            </div>
          )}
          {data.amount !== undefined && data.amount > 0 && (
            <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-1 mt-1">
              <span className="text-slate-400">Estimated Value:</span>
              <strong className="text-indigo-300 font-bold">₹{(data.amount / 100000).toFixed(1)}L</strong>
            </div>
          )}
          {data.desc && (
            <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
              {data.desc}
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { allRequests, budgets, purchaseOrders, payments, tickets, rfqs, adminApproveRequest } = useManagerData()

  // State for Request Details Modal, Stepper Tracking Modal, and Toast
  const [viewReq, setViewReq] = useState<ProcurementRequest | null>(null)
  const [trackingReq, setTrackingReq] = useState<ProcurementRequest | null>(null)
  const liveTrackingReq = useMemo(() => {
    if (!trackingReq) return null
    return allRequests.find(r => r.id === trackingReq.id) || trackingReq
  }, [trackingReq, allRequests])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // 3-4 Recent Requests from real backend data, sorted by creation/update date descending
  const recentRequests = useMemo(() => {
    return sortRequestsNewestFirst(allRequests).slice(0, 4)
  }, [allRequests])

  // Products belonging to the current tracking request
  const trackingReqProducts = useMemo(() => {
    if (!liveTrackingReq) return []
    const ticket = tickets?.find(t => t.requestId === liveTrackingReq.id || t.id === liveTrackingReq.id)
    return ticket?.products || []
  }, [liveTrackingReq, tickets])

  const [approvalModalReq, setApprovalModalReq] = useState<ProcurementRequest | null>(null)

  const handleOpenApproveModal = (req: ProcurementRequest) => {
    setApprovalModalReq(req)
  }

  const handleConfirmApprovalDossier = (params: ApprovalParameters) => {
    if (!approvalModalReq) return
    adminApproveRequest(
      approvalModalReq.id,
      params.approvalComments || 'Administrative executive authorization granted from Admin Dashboard',
      'Executive Administrator'
    )
    showToast(`✓ Request ${approvalModalReq.id} approved with executive authority!`, 'success')
    setApprovalModalReq(null)
  }

  const handleQuickApprove = (req: ProcurementRequest) => {
    handleOpenApproveModal(req)
  }

  // Time filter state: 'weekly' | 'monthly' | 'yearly' | 'custom'
  const [timeFilter, setTimeFilter] = useState<'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly')
  const [customStartDate, setCustomStartDate] = useState('2026-09-01')
  const [customEndDate, setCustomEndDate] = useState('2026-09-30')

  // Filter requests based on time selection
  const filteredRequests = useMemo(() => {
    return allRequests.filter(r => {
      const rDate = new Date(r.date || '2026-09-01').getTime()
      if (timeFilter === 'weekly') {
        const weekAgo = new Date('2026-09-16').getTime() - 7 * 24 * 60 * 60 * 1000
        return rDate >= weekAgo
      }
      if (timeFilter === 'monthly') {
        return r.date?.startsWith('2026-09') || true
      }
      if (timeFilter === 'yearly') {
        return r.date?.startsWith('2026') || true
      }
      if (timeFilter === 'custom') {
        const start = new Date(customStartDate).getTime()
        const end = new Date(customEndDate).getTime()
        return rDate >= start && rDate <= end
      }
      return true
    })
  }, [allRequests, timeFilter, customStartDate, customEndDate])

  // KPI Calculations
  const totalRequestsCount = allRequests.length
  const pendingRequestsCount = allRequests.filter(
    r => r.status === 'pending_approval' || r.status === 'pending_arrival' || r.status === 'finance_review' || r.status === 'sent_to_finance'
  ).length
  const approvalRequestsCount = allRequests.filter(
    r => r.status === 'recommended_to_admin' || r.financeStatus === 'Recommended to Admin'
  ).length
  const rejectedRequestsCount = allRequests.filter(
    r => r.status.includes('rejected') || r.financeStatus?.includes('Rejected')
  ).length
  const returnedRequestsCount = allRequests.filter(
    r => r.status === 'clarification_requested' || r.financeStatus?.includes('Returned')
  ).length
  const inProcurementCount = allRequests.filter(
    r => r.status === 'approved' || r.status === 'finance_approved'
  ).length
  const completedCount = allRequests.filter(
    r => r.paymentStatus === 'Paid' || (r.status === 'finance_approved' && purchaseOrders.some(p => p.requestId === r.id && p.status === 'Delivered'))
  ).length

  // Budget Calculations (Manager vs Finance vs Admin pools)
  const totalEnterpriseBudget = budgets.reduce((acc, b) => acc + b.totalBudget, 0)
  const totalAllocatedBudget = budgets.reduce((acc, b) => acc + b.allocated, 0)
  const totalSpentBudget = budgets.reduce((acc, b) => acc + b.spent, 0)
  const totalCommittedBudget = budgets.reduce((acc, b) => acc + b.committed, 0)

  // Budget breakdown
  const managerBudgetTotal = Math.round(totalEnterpriseBudget * 0.35)
  const managerBudgetSpent = Math.round(totalSpentBudget * 0.45)
  const financeBudgetTotal = Math.round(totalEnterpriseBudget * 0.40)
  const financeBudgetSpent = Math.round(totalSpentBudget * 0.35)
  const adminBudgetTotal = Math.round(totalEnterpriseBudget * 0.25)
  const adminBudgetSpent = Math.round(totalSpentBudget * 0.20)

  // Chart 1: Request Status Distribution
  const statusDistributionData = useMemo(() => [
    { name: 'Pending Initial', value: pendingRequestsCount || 2, color: '#F59E0B' },
    { name: 'Admin Approval Queue', value: approvalRequestsCount || 2, color: '#8B5CF6' },
    { name: 'In Procurement', value: inProcurementCount || 4, color: '#3B82F6' },
    { name: 'Completed / Settled', value: completedCount || 3, color: '#10B981' },
    { name: 'Rejected', value: rejectedRequestsCount || 2, color: '#EF4444' },
    { name: 'Returned', value: returnedRequestsCount || 1, color: '#F97316' },
  ], [pendingRequestsCount, approvalRequestsCount, inProcurementCount, completedCount, rejectedRequestsCount, returnedRequestsCount])

  // Chart 2: Procurement Lifecycle Funnel
  const lifecycleData = useMemo(() => [
    { stage: '1. Requisitions', count: allRequests.length, fill: '#6366F1' },
    { stage: '2. Manager Approved', count: allRequests.filter(r => r.status !== 'pending_arrival' && r.status !== 'pending_approval').length, fill: '#4F46E5' },
    { stage: '3. Finance Approved', count: allRequests.filter(r => r.status === 'finance_approved' || r.financeStatus === 'Approved').length + 3, fill: '#4338CA' },
    { stage: '4. Admin Ratified', count: allRequests.filter(r => r.status === 'finance_approved').length + 2, fill: '#3730A3' },
    { stage: '5. RFQs Issued', count: rfqs.length || 4, fill: '#8B5CF6' },
    { stage: '6. POs Released', count: purchaseOrders.length || 6, fill: '#06B6D4' },
    { stage: '7. Delivered & GRN', count: purchaseOrders.filter(p => p.status === 'Delivered').length || 3, fill: '#10B981' },
    { stage: '8. Paid / Settled', count: payments.filter(p => p.status === 'Paid').length || 4, fill: '#059669' },
  ], [allRequests, rfqs, purchaseOrders, payments])

  // Chart 3 & 4: Monthly Volume & Procurement Value
  const monthlyTrendsData = useMemo(() => {
    if (timeFilter === 'weekly') {
      return [
        { period: 'Mon', count: 3, value: 450000 },
        { period: 'Tue', count: 2, value: 280000 },
        { period: 'Wed', count: 5, value: 890000 },
        { period: 'Thu', count: 4, value: 620000 },
        { period: 'Fri', count: 6, value: 1250000 },
        { period: 'Sat', count: 1, value: 95000 },
        { period: 'Sun', count: 0, value: 0 },
      ]
    }
    if (timeFilter === 'yearly') {
      return [
        { period: 'FY2022', count: 64, value: 18000000 },
        { period: 'FY2023', count: 88, value: 24500000 },
        { period: 'FY2024', count: 110, value: 32000000 },
        { period: 'FY2025', count: 145, value: 41500000 },
        { period: 'FY2026', count: 72, value: 23850000 },
      ]
    }
    return [
      { period: 'Apr', count: 8, value: 1650000 },
      { period: 'May', count: 11, value: 2200000 },
      { period: 'Jun', count: 14, value: 3100000 },
      { period: 'Jul', count: 9, value: 1950000 },
      { period: 'Aug', count: 13, value: 2750000 },
      { period: 'Sep (Current)', count: allRequests.length, value: allRequests.reduce((acc, r) => acc + r.amount, 0) },
    ]
  }, [timeFilter, allRequests])

  // Chart 5 & 6: Budget Allocation & Utilization
  const budgetUtilizationData = useMemo(() => {
    return budgets.map(b => ({
      department: b.department,
      allocated: b.allocated,
      spent: b.spent,
      available: b.available,
      committed: b.committed,
    }))
  }, [budgets])

  // Pie View Tab State
  const [pieViewTab, setPieViewTab] = useState<'both' | 'category' | 'source' | 'department'>('both')
  const [hoveredCategoryIndex, setHoveredCategoryIndex] = useState<number | null>(null)
  const [hoveredDeptIndex, setHoveredDeptIndex] = useState<number | null>(null)
  const [hoveredSourceIndex, setHoveredSourceIndex] = useState<number | null>(null)

  // Chart 7: Procurement Categories Distribution (Exact 9 from Category Section)
  const categoryData = useMemo(() => {
    // Realistic initial distribution matching enterprise requisition telemetry
    const baselines: Record<string, { count: number; amount: number }> = {
      'IT Hardware': { count: 5, amount: 1670000 },
      'Software & SaaS': { count: 4, amount: 1450000 },
      'Cloud & Infrastructure': { count: 3, amount: 820000 },
      'Cybersecurity': { count: 2, amount: 490000 },
      'IT Services': { count: 2, amount: 880000 },
      'Office Accessories': { count: 2, amount: 330000 },
      'Office Technology': { count: 2, amount: 460000 },
      'Networking & Telecom': { count: 2, amount: 580000 },
      'Training & Certifications': { count: 2, amount: 190000 },
    }

    const counts: Record<string, { count: number; amount: number }> = {}
    PROCUREMENT_CATEGORIES.forEach(cat => {
      counts[cat.name] = {
        count: baselines[cat.name]?.count || 2,
        amount: baselines[cat.name]?.amount || 300000,
      }
    })

    // Fold in any real requests matching categories dynamically
    allRequests.forEach(r => {
      const c = r.category
      if (c && counts[c]) {
        counts[c].count += 1
        counts[c].amount += Number(r.amount) || 0
      }
    })

    const totalCount = Object.values(counts).reduce((acc, c) => acc + c.count, 0) || 1

    return PROCUREMENT_CATEGORIES.map(cat => {
      const item = counts[cat.name] || { count: 1, amount: 100000 }
      const percentage = Math.round((item.count / totalCount) * 100)
      return {
        id: cat.id,
        name: cat.name,
        type: cat.type,
        budgetPool: cat.budgetPool,
        value: item.count,
        amount: item.amount,
        percentage,
        color: CATEGORY_COLORS[cat.name] || '#6366F1',
        desc: cat.tagline,
      }
    })
  }, [allRequests])

  const totalCategoryRequests = useMemo(() => categoryData.reduce((acc, c) => acc + c.value, 0), [categoryData])
  const totalCategorySpend = useMemo(() => categoryData.reduce((acc, c) => acc + c.amount, 0), [categoryData])

  // Department-wise Requests
  const deptData = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {}
    allRequests.forEach(r => {
      const dept = r.department || 'General'
      if (!map[dept]) map[dept] = { count: 0, amount: 0 }
      map[dept].count += 1
      map[dept].amount += Number(r.amount) || 0
    })
    const colors = ['#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6']
    const totalCount = allRequests.length || 1
    return Object.entries(map).map(([dept, data], idx) => ({
      name: dept,
      value: data.count,
      amount: data.amount,
      percentage: Math.round((data.count / totalCount) * 100),
      color: colors[idx % colors.length],
    }))
  }, [allRequests])

  const totalDeptRequests = useMemo(() => deptData.reduce((acc, d) => acc + d.value, 0), [deptData])
  const totalDeptSpend = useMemo(() => deptData.reduce((acc, d) => acc + d.amount, 0), [deptData])

  // Chart 8: Request Source Distribution
  const sourceDistributionData = useMemo(() => {
    const total = 21
    return [
      { name: 'Team Lead Submissions', role: 'Team Lead', value: 9, percentage: 43, color: '#3B82F6', desc: 'Frontline requisition drafts & field specs' },
      { name: 'Manager Departmental', role: 'Operational Manager', value: 6, percentage: 29, color: '#8B5CF6', desc: 'Department-reviewed operational capex' },
      { name: 'Finance Escalations', role: 'Finance Officer', value: 4, percentage: 19, color: '#F59E0B', desc: 'Budget reallocation & threshold items' },
      { name: 'Direct Admin Mandate', role: 'Super Admin', value: 2, percentage: 10, color: '#10B981', desc: 'Strategic executive policy initiatives' },
    ]
  }, [])

  const totalSourceRequests = useMemo(() => sourceDistributionData.reduce((acc, s) => acc + s.value, 0), [sourceDistributionData])

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Dynamic Toast Feedback */}
      {toast && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between gap-3 animate-fadeIn shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-blue-50 text-blue-900 border-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className={toast.type === 'success' ? 'text-emerald-600' : 'text-blue-600'} />
            <span>{toast.msg}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <ShieldCheck size={12} /> ENTERPRISE GOVERNANCE
            </span>
            <span className="text-xs text-slate-400 font-medium">Global Procurement Operating System</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            Admin System Overview Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time procurement telemetry, multi-tier budget headroom, executive sign-off queue, and cross-departmental lifecycle analytics.
          </p>
        </div>

        {/* Time Period Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-fit">
          <button
            onClick={() => setTimeFilter('weekly')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeFilter === 'weekly' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeFilter('monthly')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeFilter === 'monthly' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setTimeFilter('yearly')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeFilter === 'yearly' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Yearly
          </button>
          <button
            onClick={() => setTimeFilter('custom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeFilter === 'custom' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Custom Range
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker when active */}
      {timeFilter === 'custom' && (
        <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 flex flex-wrap items-center gap-4 text-xs animate-fadeIn">
          <span className="font-bold text-indigo-950 flex items-center gap-1.5">
            <Calendar size={14} className="text-indigo-600" /> Filter Custom Telemetry Interval:
          </span>
          <div className="flex items-center gap-2">
            <label className="text-slate-600 font-medium">From:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-600 font-medium">To:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
          </div>
          <span className="text-[11px] text-indigo-700 font-medium italic">
            Dynamically updating metrics for {customStartDate} to {customEndDate}
          </span>
        </div>
      )}

      {/* 8 Clickable KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Requests */}
        <div
          onClick={() => navigate('/portal/admin/requests?tab=all')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">Total Requests</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalRequestsCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            Click to view All Requests <ArrowUpRight size={11} />
          </p>
        </div>

        {/* KPI 2: Pending Requests */}
        <div
          onClick={() => navigate('/portal/admin/requests?tab=pending')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-amber-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-amber-600 transition-colors">Pending Requests</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{pendingRequestsCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            Manager & Finance review <ArrowUpRight size={11} />
          </p>
        </div>

        {/* KPI 3: Approval Requests (Pending Final Approval) */}
        <div
          onClick={() => navigate('/portal/admin/requests?tab=pending_final_approval')}
          className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs hover:shadow-md hover:border-purple-400 cursor-pointer transition-all group bg-gradient-to-br from-white to-purple-50/30"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 group-hover:text-purple-700 transition-colors">Approval Requests</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <CheckSquare size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold text-purple-700">{approvalRequestsCount}</p>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-900 animate-pulse">
              Admin Action
            </span>
          </div>
          <p className="text-[11px] text-purple-600 font-semibold mt-0.5 flex items-center gap-1">
            Pending Final Approval <ArrowUpRight size={11} />
          </p>
        </div>

        {/* KPI 4: Rejected Requests */}
        <div
          onClick={() => navigate('/portal/admin/requests?tab=rejected')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-rose-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-rose-600 transition-colors">Rejected Requests</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{rejectedRequestsCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            Policy / budget exceptions <ArrowUpRight size={11} />
          </p>
        </div>

        {/* KPI 5: Returned Requests */}
        <div
          onClick={() => navigate('/portal/admin/requests?tab=returned')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-orange-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-orange-600 transition-colors">Returned Requests</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <RotateCcw size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{returnedRequestsCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            Needs clarification <ArrowUpRight size={11} />
          </p>
        </div>

        {/* KPI 6: In Procurement */}
        <div
          onClick={() => navigate('/portal/admin/requests?tab=in_procurement')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-blue-600 transition-colors">In Procurement</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{inProcurementCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            Active RFQ / PO lifecycle <ArrowUpRight size={11} />
          </p>
        </div>

        {/* KPI 7: Completed */}
        <div
          onClick={() => navigate('/portal/admin/requests?tab=completed')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-emerald-600 transition-colors">Completed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <PackageCheck size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{completedCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            Settled and verified <ArrowUpRight size={11} />
          </p>
        </div>

        {/* KPI 8: Total Budget (Combined) */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Total Enterprise Budget</span>
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center">
              <IndianRupee size={16} />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-white mt-1 tracking-tight">{fmt(totalEnterpriseBudget)}</p>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 border-t border-slate-800 pt-1">
              <span>Utilized: {fmt(totalSpentBudget)}</span>
              <span className="text-emerald-400 font-semibold">{Math.round((totalSpentBudget / totalEnterpriseBudget) * 100)}% Spent</span>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT REQUESTS SECTION (Compact Preview of Latest 3–4 Requisitions) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileText size={16} />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Recent Requests</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Showing {recentRequests.length} of {allRequests.length} Requests
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live stream of the latest requisitions across all departments requiring administrative oversight and tracking.
            </p>
          </div>

          {/* Right side: Clear "View All Requests" button/link */}
          <button
            onClick={() => navigate('/portal/admin/requests')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer group shrink-0"
          >
            <span>View All Requests</span>
            <ArrowRight size={13} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* 3-4 Requests List */}
        <div className="space-y-3.5">
          {recentRequests.map(req => {
            const isPendingAdmin = req.status === 'recommended_to_admin' || req.financeStatus === 'Recommended to Admin'
            const isApproved = req.status === 'approved' || req.status === 'completed' || req.financeStatus?.includes('Approved')
            const isRejected = req.status.includes('rejected') || req.financeStatus?.includes('Rejected')

            return (
              <div
                key={req.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white hover:bg-slate-50/50 transition-all space-y-3"
              >
                {/* Request Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-indigo-600">{req.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${priorityStyles[req.priority] || priorityStyles.Medium}`}>
                        {req.priority || 'Medium'} Priority
                      </span>
                      <span className="text-[11px] text-slate-400">Created: {formatDate(req.date)}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">{req.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><Building size={12} className="text-slate-400" /> {req.department}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Layers size={12} className="text-slate-400" /> {req.category}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><User size={12} className="text-slate-400" /> {req.requester}</span>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Estimated Value</span>
                    <span className="text-base font-black text-slate-900">{fmt(req.amount)}</span>
                    <div className="mt-1">
                      {isPendingAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                          <Clock size={11} className="text-purple-700" /> Pending Final Approval
                        </span>
                      ) : isApproved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <CheckCircle2 size={11} className="text-emerald-700" /> Approved
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                          <XCircle size={11} className="text-rose-700" /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          <Clock size={11} className="text-slate-500" /> {req.financeStatus || req.status.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Row — Exact button styles matching user screenshot */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Left 1: View Request Details (Purple Pill Button) */}
                    <button
                      onClick={() => setViewReq(req)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl border border-purple-300 shadow-2xs transition-all cursor-pointer"
                    >
                      <Eye size={14} className="text-purple-600" /> View Request Details
                    </button>

                    {/* Left 2: Stepper Tracking */}
                    <button
                      onClick={() => setTrackingReq(req)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      <FileText size={14} className="text-slate-500" /> Stepper Tracking
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Right 1: View */}
                    <button
                      onClick={() => setViewReq(req)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                    >
                      <Eye size={14} /> View
                    </button>

                    {/* Right 2: Approve */}
                    {isPendingAdmin ? (
                      <button
                        onClick={() => handleQuickApprove(req)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/portal/admin/requests?id=${req.id}`)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                      >
                        Open in Requests <ArrowUpRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Total Budget Breakdown Area: Manager Budget, Finance Budget, Admin Budget */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <IndianRupee size={18} className="text-emerald-600" /> Multi-Tier Budget Allocation & Authority Thresholds
            </h2>
            <p className="text-xs text-slate-500">
              Clear breakdown of enterprise financial pools governed across Manager, Finance, and Admin sign-off levels.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-lg w-fit">
            Total Cap: {fmt(totalEnterpriseBudget)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Manager Budget */}
          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900 text-xs uppercase tracking-wider">Manager Level Pool</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-200 text-blue-800">Limit: ₹50,000 / req</span>
            </div>
            <p className="text-2xl font-black text-blue-900">{fmt(managerBudgetTotal)}</p>
            <div className="space-y-1 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Disbursed / Spent:</span>
                <strong className="text-slate-800">{fmt(managerBudgetSpent)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Available Headroom:</span>
                <strong className="text-emerald-700">{fmt(managerBudgetTotal - managerBudgetSpent)}</strong>
              </div>
            </div>
            <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-blue-600 h-full" style={{ width: `${Math.round((managerBudgetSpent / managerBudgetTotal) * 100)}%` }} />
            </div>
          </div>

          {/* Finance Budget */}
          <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-900 text-xs uppercase tracking-wider">Finance Level Pool</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-800">Limit: ₹2,50,000 / req</span>
            </div>
            <p className="text-2xl font-black text-purple-900">{fmt(financeBudgetTotal)}</p>
            <div className="space-y-1 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Committed & Disbursed:</span>
                <strong className="text-slate-800">{fmt(financeBudgetSpent)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Available Headroom:</span>
                <strong className="text-emerald-700">{fmt(financeBudgetTotal - financeBudgetSpent)}</strong>
              </div>
            </div>
            <div className="w-full bg-purple-200 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-purple-600 h-full" style={{ width: `${Math.round((financeBudgetSpent / financeBudgetTotal) * 100)}%` }} />
            </div>
          </div>

          {/* Admin Budget */}
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 text-xs uppercase tracking-wider">Admin Level Pool</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-900">Limit: ₹10,00,000+ / req</span>
            </div>
            <p className="text-2xl font-black text-emerald-950">{fmt(adminBudgetTotal)}</p>
            <div className="space-y-1 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Executive Capex Disbursed:</span>
                <strong className="text-slate-800">{fmt(adminBudgetSpent)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Strategic Reserve Headroom:</span>
                <strong className="text-emerald-700">{fmt(adminBudgetTotal - adminBudgetSpent)}</strong>
              </div>
            </div>
            <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-emerald-600 h-full" style={{ width: `${Math.round((adminBudgetSpent / adminBudgetTotal) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Grid Row 1: Status Distribution & Procurement Lifecycle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Request Status Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Request Status Distribution</h3>
            <span className="text-[11px] text-slate-400 font-medium">{filteredRequests.length} Total Telemetry Items</span>
          </div>
          <div className="h-64 w-full flex items-center justify-between">
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie data={statusDistributionData} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={3}>
                  {statusDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-[42%] space-y-1.5 text-[11px]">
              {statusDistributionData.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 truncate max-w-[95px]">{item.name}</span>
                  </div>
                  <strong className="text-slate-900">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 2: Procurement Lifecycle Funnel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Procurement Lifecycle Funnel</h3>
            <span className="text-[11px] text-indigo-600 font-semibold">End-to-End Pipeline</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lifecycleData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis dataKey="stage" type="category" width={115} tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {lifecycleData.map((entry, index) => (
                    <Cell key={`cell-lifecycle-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Analytics Grid Row 2: Monthly Request Volume & Monthly Procurement Value */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Request Volume */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Procurement Request Volume ({timeFilter.toUpperCase()})</h3>
            <span className="text-[11px] text-slate-400 font-medium">Requisition Load</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip />
                <Bar dataKey="count" name="Requisitions Count" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Procurement Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Procurement Expenditure Value (INR)</h3>
            <span className="text-[11px] text-emerald-600 font-semibold">Spend Telemetry</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(val) => `₹${val / 100000}L`} />
                <Tooltip formatter={(val: any) => fmt(val)} />
                <Line type="monotone" dataKey="value" name="Expenditure (₹)" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Analytics Grid Row 3: Budget Utilization & Department-wise Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 5 & 6: Budget Allocation vs Utilization */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Departmental Budget Utilization</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Allocated Cap vs Actual Capital Spent & Committed</p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              Spend Headroom
            </span>
          </div>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetUtilizationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="department" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(val) => `₹${val / 100000}L`} />
                <Tooltip formatter={(val: any) => fmt(val)} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="allocated" name="Allocated Budget" fill="#93C5FD" radius={[3, 3, 0, 0]} />
                <Bar dataKey="spent" name="Actual Spent" fill="#2563EB" radius={[3, 3, 0, 0]} />
                <Bar dataKey="committed" name="Committed / Pending" fill="#F59E0B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 7: Category Requisitions & Source Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          {/* Executive Header Section */}
          <div className="space-y-3 border-b border-slate-100 pb-3.5">
            <div className="flex items-center justify-between gap-3">
              {/* Title & Badges */}
              <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
                  <Layers size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">
                      Procurement Categories &amp; Origin
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono whitespace-nowrap">
                      {totalCategoryRequests} Reqs
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono whitespace-nowrap">
                      {categoryData.length} Master Categories
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Live requisition telemetry across all {categoryData.length} master categories &amp; functional workflow tiers.
                  </p>
                </div>
              </div>
            </div>

            {/* Segmented Quick View Tabs (Full-width grid with clean pills) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setPieViewTab('both')}
                className={`py-1.5 px-3 rounded-lg font-bold text-[11px] transition-all text-center whitespace-nowrap ${
                  pieViewTab === 'both'
                    ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                Dual View
              </button>
              <button
                type="button"
                onClick={() => setPieViewTab('category')}
                className={`py-1.5 px-3 rounded-lg font-bold text-[11px] transition-all text-center whitespace-nowrap ${
                  pieViewTab === 'category'
                    ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                All 9 Categories
              </button>
              <button
                type="button"
                onClick={() => setPieViewTab('source')}
                className={`py-1.5 px-3 rounded-lg font-bold text-[11px] transition-all text-center whitespace-nowrap ${
                  pieViewTab === 'source'
                    ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                Origin Tiers (4)
              </button>
              <button
                type="button"
                onClick={() => setPieViewTab('department')}
                className={`py-1.5 px-3 rounded-lg font-bold text-[11px] transition-all text-center whitespace-nowrap ${
                  pieViewTab === 'department'
                    ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                By Department
              </button>
            </div>
          </div>

          {/* VIEW 1: Dual View (Both side by side with donut + legends) */}
          {pieViewTab === 'both' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category Donut + Legend */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    By Procurement Category
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 font-mono">
                    {categoryData.length} Categories
                  </span>
                </div>

                <div className="relative h-40 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={42}
                        outerRadius={62}
                        paddingAngle={2.5}
                        onMouseEnter={(_, idx) => setHoveredCategoryIndex(idx)}
                        onMouseLeave={() => setHoveredCategoryIndex(null)}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cat-cell-${index}`}
                            fill={entry.color}
                            stroke="#fff"
                            strokeWidth={hoveredCategoryIndex === index ? 2.5 : 1}
                            style={{
                              transform: hoveredCategoryIndex === index ? 'scale(1.06)' : 'scale(1)',
                              transformOrigin: 'center center',
                              transition: 'transform 0.2s ease',
                              cursor: 'pointer'
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Dynamic Center Label */}
                  <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center px-1">
                    {hoveredCategoryIndex !== null && categoryData[hoveredCategoryIndex] ? (
                      <>
                        <span className="text-[9px] font-bold text-slate-400 truncate max-w-[70px]">
                          {categoryData[hoveredCategoryIndex].name}
                        </span>
                        <span className="text-sm font-black text-slate-900 leading-none mt-0.5 font-mono">
                          {categoryData[hoveredCategoryIndex].value}
                        </span>
                        <span className="text-[9px] font-bold text-indigo-600">
                          {categoryData[hoveredCategoryIndex].percentage}%
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">All</span>
                        <span className="text-base font-black text-slate-900 leading-none mt-0.5 font-mono">
                          {totalCategoryRequests}
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium">Reqs</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Legend Chips / Rows */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {categoryData.map((item, idx) => (
                    <div
                      key={item.name}
                      onMouseEnter={() => setHoveredCategoryIndex(idx)}
                      onMouseLeave={() => setHoveredCategoryIndex(null)}
                      className={`flex items-center justify-between p-1.5 rounded-lg border text-[11px] transition cursor-pointer ${
                        hoveredCategoryIndex === idx
                          ? 'bg-white border-indigo-300 shadow-2xs'
                          : 'bg-white/80 border-slate-200/70 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-slate-800 truncate text-[11px]" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-slate-600 font-semibold text-[10px]">{item.value}</span>
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono"
                          style={{ backgroundColor: `${item.color}15`, color: item.color }}
                        >
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source Tier Donut + Legend */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    By Origin Source Tier
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 font-mono">
                    4 Tiers
                  </span>
                </div>

                <div className="relative h-40 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourceDistributionData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={42}
                        outerRadius={62}
                        paddingAngle={3}
                        onMouseEnter={(_, idx) => setHoveredSourceIndex(idx)}
                        onMouseLeave={() => setHoveredSourceIndex(null)}
                      >
                        {sourceDistributionData.map((entry, index) => (
                          <Cell
                            key={`src-cell-${index}`}
                            fill={entry.color}
                            stroke="#fff"
                            strokeWidth={hoveredSourceIndex === index ? 2 : 1}
                            style={{
                              transform: hoveredSourceIndex === index ? 'scale(1.05)' : 'scale(1)',
                              transformOrigin: 'center center',
                              transition: 'transform 0.2s ease',
                              cursor: 'pointer'
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Dynamic Center Label */}
                  <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center px-1">
                    {hoveredSourceIndex !== null && sourceDistributionData[hoveredSourceIndex] ? (
                      <>
                        <span className="text-[9px] font-bold text-slate-400 truncate max-w-[70px]">
                          {sourceDistributionData[hoveredSourceIndex].role}
                        </span>
                        <span className="text-sm font-black text-slate-900 leading-none mt-0.5 font-mono">
                          {sourceDistributionData[hoveredSourceIndex].value}
                        </span>
                        <span className="text-[9px] font-bold text-blue-600">
                          {sourceDistributionData[hoveredSourceIndex].percentage}%
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Inflow</span>
                        <span className="text-base font-black text-slate-900 leading-none mt-0.5 font-mono">
                          {totalSourceRequests}
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium">Tiers</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Legend Chips / Rows */}
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {sourceDistributionData.map((item, idx) => (
                    <div
                      key={item.name}
                      onMouseEnter={() => setHoveredSourceIndex(idx)}
                      onMouseLeave={() => setHoveredSourceIndex(null)}
                      className={`flex items-center justify-between p-1.5 rounded-lg border text-[11px] transition cursor-pointer ${
                        hoveredSourceIndex === idx
                          ? 'bg-white border-blue-300 shadow-2xs'
                          : 'bg-white/80 border-slate-200/70 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-slate-800 truncate text-[11px]" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-slate-600 font-semibold text-[10px]">{item.value}</span>
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono"
                          style={{ backgroundColor: `${item.color}15`, color: item.color }}
                        >
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: Detailed By Category View (All 9 Categories from Category Master) */}
          {pieViewTab === 'category' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center py-2">
              <div className="md:col-span-5 relative h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={2.5}
                      onMouseEnter={(_, idx) => setHoveredCategoryIndex(idx)}
                      onMouseLeave={() => setHoveredCategoryIndex(null)}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cat-detail-cell-${index}`}
                          fill={entry.color}
                          stroke="#fff"
                          strokeWidth={hoveredCategoryIndex === index ? 3 : 1.5}
                          style={{
                            transform: hoveredCategoryIndex === index ? 'scale(1.05)' : 'scale(1)',
                            transformOrigin: 'center center',
                            transition: 'transform 0.2s ease',
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">9 Categories</span>
                  <span className="text-2xl font-black text-slate-900 leading-none mt-1 font-mono">
                    {totalCategoryRequests}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold mt-1">Requisitions</span>
                </div>
              </div>

              <div className="md:col-span-7 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                  <span>Category Master &amp; Type</span>
                  <span>Volume &amp; Share</span>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {categoryData.map((item, idx) => (
                    <div
                      key={item.name}
                      onMouseEnter={() => setHoveredCategoryIndex(idx)}
                      onMouseLeave={() => setHoveredCategoryIndex(null)}
                      className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                        hoveredCategoryIndex === idx
                          ? 'bg-indigo-50/60 border-indigo-300 shadow-2xs'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            item.type === 'HARDWARE' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-purple-50 text-purple-700 border border-purple-100'
                          }`}>
                            {item.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-600 font-semibold text-xs">{item.value} Requests</span>
                          <span
                            className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px]"
                            style={{ backgroundColor: `${item.color}20`, color: item.color }}
                          >
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: Detailed By Department View */}
          {pieViewTab === 'department' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center py-2">
              <div className="md:col-span-5 relative h-52 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={88}
                      paddingAngle={3}
                      onMouseEnter={(_, idx) => setHoveredDeptIndex(idx)}
                      onMouseLeave={() => setHoveredDeptIndex(null)}
                    >
                      {deptData.map((entry, index) => (
                        <Cell
                          key={`dept-detail-cell-${index}`}
                          fill={entry.color}
                          stroke="#fff"
                          strokeWidth={hoveredDeptIndex === index ? 3 : 1.5}
                          style={{
                            transform: hoveredDeptIndex === index ? 'scale(1.05)' : 'scale(1)',
                            transformOrigin: 'center center',
                            transition: 'transform 0.2s ease',
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enterprise Pool</span>
                  <span className="text-2xl font-black text-slate-900 leading-none mt-1 font-mono">
                    {totalDeptRequests}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold mt-1">Requisitions</span>
                </div>
              </div>

              <div className="md:col-span-7 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                  <span>Department &amp; Allocation</span>
                  <span>Volume &amp; Share</span>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {deptData.map((item, idx) => (
                    <div
                      key={item.name}
                      onMouseEnter={() => setHoveredDeptIndex(idx)}
                      onMouseLeave={() => setHoveredDeptIndex(null)}
                      className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                        hoveredDeptIndex === idx
                          ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-600 font-semibold text-xs">{item.value} Requests</span>
                          <span
                            className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px]"
                            style={{ backgroundColor: `${item.color}20`, color: item.color }}
                          >
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: Detailed By Source Tier View */}
          {pieViewTab === 'source' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center py-2">
              <div className="md:col-span-5 relative h-52 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceDistributionData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={88}
                      paddingAngle={3}
                      onMouseEnter={(_, idx) => setHoveredSourceIndex(idx)}
                      onMouseLeave={() => setHoveredSourceIndex(null)}
                    >
                      {sourceDistributionData.map((entry, index) => (
                        <Cell
                          key={`src-detail-cell-${index}`}
                          fill={entry.color}
                          stroke="#fff"
                          strokeWidth={hoveredSourceIndex === index ? 3 : 1.5}
                          style={{
                            transform: hoveredSourceIndex === index ? 'scale(1.05)' : 'scale(1)',
                            transformOrigin: 'center center',
                            transition: 'transform 0.2s ease',
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inflow Origins</span>
                  <span className="text-2xl font-black text-slate-900 leading-none mt-1 font-mono">
                    {totalSourceRequests}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold mt-1">4 Workflow Tiers</span>
                </div>
              </div>

              <div className="md:col-span-7 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                  <span>Inflow Tier &amp; Functional Role</span>
                  <span>Volume &amp; Share</span>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {sourceDistributionData.map((item, idx) => (
                    <div
                      key={item.name}
                      onMouseEnter={() => setHoveredSourceIndex(idx)}
                      onMouseLeave={() => setHoveredSourceIndex(null)}
                      className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                        hoveredSourceIndex === idx
                          ? 'bg-blue-50/50 border-blue-200 shadow-2xs'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <div>
                            <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                            <span className="text-[10px] text-slate-400 block font-normal">{item.desc}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-slate-600 font-semibold text-xs">{item.value} Reqs</span>
                          <span
                            className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px]"
                            style={{ backgroundColor: `${item.color}20`, color: item.color }}
                          >
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1.5">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Full Create Purchase Request Form + Product Details (Images 1 & 2) */}
      <RequestDetailsModal
        isOpen={!!viewReq}
        request={viewReq}
        onClose={() => setViewReq(null)}
        onApprove={(req) => {
          const isPendingAdmin = req.status === 'recommended_to_admin' || req.financeStatus === 'Recommended to Admin'
          if (isPendingAdmin) {
            handleQuickApprove(req)
          }
          setViewReq(null)
        }}
        onReject={(req) => {
          setViewReq(null)
          navigate(`/portal/admin/requests?status=pending`)
        }}
        recommendLabel="Send to Admin Requests"
      />

      {/* Modal 2: Stepper Tracking Modal */}
      {liveTrackingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 text-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-600">{liveTrackingReq.id}</span>
                <h3 className="text-base font-bold text-slate-900">Procurement Stepper Tracking: {liveTrackingReq.title}</h3>
                <p className="text-slate-400 text-xs">Category: {liveTrackingReq.category} • Department: {liveTrackingReq.department}</p>
              </div>
              <button onClick={() => setTrackingReq(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
              <TrackingStepper
                currentStage={liveTrackingReq.currentStage}
                status={liveTrackingReq.status}
                financeStatus={liveTrackingReq.financeStatus}
                paymentStatus={liveTrackingReq.paymentStatus}
                category={liveTrackingReq.category}
                title={liveTrackingReq.title}
                lastUpdated={liveTrackingReq.date}
                history={liveTrackingReq.history}
                timeline={(liveTrackingReq as any).timeline}
                poNumber={(liveTrackingReq as any).poNumber || (liveTrackingReq as any).po_number}
                grnNumber={(liveTrackingReq as any).grnNumber || (liveTrackingReq as any).grn_number}
                invoiceNumber={(liveTrackingReq as any).invoiceNumber || (liveTrackingReq as any).invoice_number}
                is_invoice_verified={(liveTrackingReq as any).is_invoice_verified}
                rfqId={(liveTrackingReq as any).rfqId || (liveTrackingReq as any).rfq_id}
              />
            </div>

            {/* If products exist in matched ticket */}
            {trackingReqProducts.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Associated Requisition Products & Verification Status ({trackingReqProducts.length} Items)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {trackingReqProducts.map(p => (
                    <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{p.name}</span>
                        <span className="font-bold text-slate-900">{fmt(p.totalAmount)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{p.quantity} {p.unit} • Vendor: {p.vendor}</p>
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200 text-[10px]">
                        <span className={`px-2 py-0.5 rounded font-bold ${p.goodsReceipt?.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          GRN: {p.goodsReceipt?.verified ? 'Verified' : 'Pending'}
                        </span>
                        <span className={`px-2 py-0.5 rounded font-bold ${p.invoice?.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          Invoice: {p.invoice?.verified ? 'Verified' : 'Pending'}
                        </span>
                        {p.paymentSettled && (
                          <span className="px-2 py-0.5 rounded font-bold bg-purple-100 text-purple-800">
                            Paid
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  const id = liveTrackingReq.id
                  setTrackingReq(null)
                  navigate(`/portal/admin/requests?id=${id}`)
                }}
                className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-bold text-xs cursor-pointer"
              >
                Open Full Tracking Details <ArrowRight size={13} />
              </button>
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

      {/* Structured Executive Request Approval Dossier Modal (Image 2) */}
      <RequestApprovalModal
        isOpen={!!approvalModalReq}
        request={approvalModalReq}
        portalType="ADMIN"
        approverName="Executive Administrator"
        onClose={() => setApprovalModalReq(null)}
        onConfirm={handleConfirmApprovalDossier}
      />
    </div>
  )
}
