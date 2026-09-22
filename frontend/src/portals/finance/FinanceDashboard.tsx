import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Landmark, CreditCard, AlertCircle, CheckCircle, Clock, TrendingUp,
  FileCheck, ArrowUpRight, ChevronRight, PieChart as PieIcon, BarChart3,
  DollarSign, ShieldAlert, ArrowRight, Filter, RefreshCw
} from 'lucide-react'
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip, Legend, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { useFinanceData } from '../../context/ManagerDataContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export const FinanceDashboard: React.FC = () => {
  const navigate = useNavigate()
  const {
    budgets,
    financeKPIs,
    paymentData,
    payments,
    pendingFinancialApprovals,
    tickets,
    complaints,
  } = useFinanceData()

  // Payment Analytics Timeframe
  const [paymentPeriod, setPaymentPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly')
  // Budget Distribution Category/Department Selector
  const [distMode, setDistMode] = useState<'department' | 'category'>('department')

  // Prepare Budget Utilization Chart Data
  const budgetUtilizationData = budgets.map((b) => ({
    name: b.department + ' (' + b.category.split(' ')[0] + ')',
    Total: b.totalBudget,
    Allocated: b.allocated,
    Committed: b.committed,
    Spent: b.spent,
    Available: b.available,
  }))

  // Prepare Budget Distribution Pie Data
  const deptMap: Record<string, number> = {}
  const catMap: Record<string, number> = {}

  budgets.forEach((b) => {
    deptMap[b.department] = (deptMap[b.department] || 0) + b.totalBudget
    catMap[b.category] = (catMap[b.category] || 0) + b.totalBudget
  })

  const departmentPieData = Object.keys(deptMap).map((k, i) => {
    const palette = ['#1E293B', '#2563EB', '#4F46E5', '#0891B2', '#0D9488', '#D97706']
    return { name: k, value: deptMap[k], color: palette[i % palette.length] }
  })

  const categoryPieData = Object.keys(catMap).map((k, i) => {
    const palette = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B']
    return { name: k, value: catMap[k], color: palette[i % palette.length] }
  })

  const currentPieData = distMode === 'department' ? departmentPieData : categoryPieData

  // Payment analytics data from real state
  const currentPaymentData = paymentData[paymentPeriod]

  return (
    <div className="max-w-7xl mx-auto space-y-7 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              FINANCE OS
            </span>
            <span className="text-xs text-slate-400 font-medium">Fiscal Year 2026-27</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Financial Operations & Treasury Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time corporate budget tracking, payment disbursements, invoice verification & spend controls.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/portal/finance/budget')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-all"
          >
            <Landmark size={14} className="text-indigo-600" />
            Manage Budgets
          </button>
          <button
            onClick={() => navigate('/portal/finance/payments')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all"
          >
            <CreditCard size={14} />
            Disburse Payments
          </button>
        </div>
      </div>

      {/* 8 Top Enterprise KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Budget */}
        <div
          onClick={() => navigate('/portal/finance/budget')}
          className="group cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total Budget</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-indigo-50 text-slate-700 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
              <Landmark size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {fmt(financeKPIs.totalBudget)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>6 Departments</span>
            <span className="flex items-center gap-0.5 text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
              Overview <ArrowRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 2: Available Budget */}
        <div
          onClick={() => navigate('/portal/finance/budget')}
          className="group cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Available Budget</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 tracking-tight">
            {fmt(financeKPIs.availableBudget)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>
              {((financeKPIs.availableBudget / financeKPIs.totalBudget) * 100).toFixed(1)}% Uncommitted
            </span>
            <span className="flex items-center gap-0.5 text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform">
              Explore <ArrowRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 3: Committed */}
        <div
          onClick={() => navigate('/portal/finance/budget')}
          className="group cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Committed</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-indigo-950 tracking-tight">
            {fmt(financeKPIs.committedBudget)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>Active PO Commitments</span>
            <span className="flex items-center gap-0.5 text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
              View POs <ArrowRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 4: Spent */}
        <div
          onClick={() => navigate('/portal/finance/budget')}
          className="group cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Spent</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {fmt(financeKPIs.spentBudget)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>
              {((financeKPIs.spentBudget / financeKPIs.totalBudget) * 100).toFixed(1)}% Realized
            </span>
            <span className="flex items-center gap-0.5 text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform">
              Ledger <ArrowRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 5: Pending Invoice */}
        <div
          onClick={() => navigate('/portal/finance/raise-ticket')}
          className="group cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Pending Invoice</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileCheck size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-700 tracking-tight">
            {fmt(financeKPIs.pendingInvoicesAmount)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span className="font-semibold text-slate-700">{financeKPIs.pendingInvoicesCount} Invoices</span>
            <span className="flex items-center gap-0.5 text-amber-600 font-semibold group-hover:translate-x-0.5 transition-transform">
              Verify <ArrowRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 6: Invoice Exceptions */}
        <div
          onClick={() => navigate('/portal/finance/payments')}
          className="group cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 hover:border-rose-400 hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Invoice Exceptions</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-700 tracking-tight">
            {fmt(financeKPIs.invoiceExceptionsAmount)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span className="font-semibold text-rose-700">{financeKPIs.invoiceExceptionsCount} On Hold / Error</span>
            <span className="flex items-center gap-0.5 text-rose-600 font-semibold group-hover:translate-x-0.5 transition-transform">
              Resolve <ArrowRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 7: Pending Payments */}
        <div
          onClick={() => navigate('/portal/finance/payments')}
          className="group cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Pending Payments</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-indigo-900 tracking-tight">
            {fmt(financeKPIs.pendingPaymentsAmount)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span className="font-semibold text-slate-700">{financeKPIs.pendingPaymentsCount} In Queue</span>
            <span className="flex items-center gap-0.5 text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
              Disburse <ArrowRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 8: Paid Amount */}
        <div
          onClick={() => navigate('/portal/finance/payments')}
          className="group cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Paid Amount</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-800 tracking-tight">
            {fmt(financeKPIs.paidAmount)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>{financeKPIs.paidPaymentsCount} Settled Disbursals</span>
            <span className="flex items-center gap-0.5 text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform">
              History <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart A: Budget Utilization Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart3 size={17} className="text-indigo-600" />
                Departmental Budget Utilization
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Total Budget vs Allocated, Committed POs & Actual Spend across business units.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                INR (₹)
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetUtilizationData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" fontSize={11} stroke="#64748B" tickLine={false} />
                <YAxis
                  fontSize={11}
                  stroke="#64748B"
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                />
                <Tooltip
                  formatter={(value: any) => [`${fmt(Number(value))}`, '']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="Total" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Allocated" fill="#6366F1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Committed" fill="#D97706" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spent" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart C: Budget Distribution Donut (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <PieIcon size={17} className="text-indigo-600" />
                Budget Distribution
              </h2>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold text-slate-600">
                <button
                  onClick={() => setDistMode('department')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    distMode === 'department' ? 'bg-white text-indigo-700 shadow-2xs' : 'hover:text-slate-900'
                  }`}
                >
                  Dept
                </button>
                <button
                  onClick={() => setDistMode('category')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    distMode === 'category' ? 'bg-white text-indigo-700 shadow-2xs' : 'hover:text-slate-900'
                  }`}
                >
                  Category
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4">Capital allocation share by organizational domain.</p>

            <div className="h-52 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentPieData}
                    dataKey="value"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {currentPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${fmt(Number(value))}`, 'Total Budget']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
            {currentPieData.slice(0, 4).map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="truncate text-slate-600" title={d.name}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart B: Payment Analytics (Full width with Weekly / Monthly / Yearly selector) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp size={17} className="text-indigo-600" />
              Cash Flow & Payment Analytics
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical disbursements vs authorized invoice obligations.
            </p>
          </div>

          {/* Weekly / Monthly / Yearly Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['weekly', 'monthly', 'yearly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPaymentPeriod(p)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                  paymentPeriod === p
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={currentPaymentData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D97706" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="period" fontSize={11} stroke="#64748B" tickLine={false} />
              <YAxis
                fontSize={11}
                stroke="#64748B"
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
              />
              <Tooltip
                formatter={(value: any) => [`${fmt(Number(value))}`, '']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
              <Area type="monotone" dataKey="approved" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorApproved)" name="Approved Volume" />
              <Area type="monotone" dataKey="paid" stroke="#16A34A" strokeWidth={2} fillOpacity={1} fill="url(#colorPaid)" name="Paid Disbursals" />
              <Area type="monotone" dataKey="pending" stroke="#D97706" strokeWidth={2} fillOpacity={1} fill="url(#colorPending)" name="Pending Pipeline" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Action Tables Grid: Pending Approvals & Payments Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Financial Approvals Quick Queue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pending Financial Review</h3>
                <p className="text-xs text-slate-500 mt-0.5">Requests escalated by managers requiring fiscal sign-off</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {pendingFinancialApprovals.length} Action Needed
              </span>
            </div>

            {pendingFinancialApprovals.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle size={28} className="mx-auto mb-2 text-emerald-500" />
                All financial approval queues cleared!
              </div>
            ) : (
              <div className="space-y-3">
                {pendingFinancialApprovals.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    onClick={() => navigate('/portal/finance/pending-approvals')}
                    className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/60 transition-all cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {r.id}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">{r.department}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{r.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Requester: {r.requester}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-extrabold text-slate-900">{fmt(r.amount)}</p>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        Review
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/portal/finance/pending-approvals')}
            className="w-full mt-4 py-2.5 text-xs font-bold text-indigo-600 bg-indigo-50/70 hover:bg-indigo-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            Open Finance Approval ({pendingFinancialApprovals.length}) <ChevronRight size={14} />
          </button>
        </div>

        {/* Live Payments Queue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Disbursement & Settlement Queue</h3>
                <p className="text-xs text-slate-500 mt-0.5">3-way matched invoices awaiting bank release</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {payments.filter((p) => p.status === 'Pending' || p.status === 'Processing').length} Active
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle size={28} className="mx-auto mb-2 text-emerald-500" />
                No pending disbursements in the settlement queue.
              </div>
            ) : (
              <div className="space-y-3">
                {payments.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate('/portal/finance/payments')}
                    className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/60 transition-all cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {p.id}
                        </span>
                        <span className="text-[10px] text-slate-500">{p.vendor}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{p.requestTitle}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Due: {p.dueDate}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-extrabold text-slate-900">{fmt(p.amount)}</p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          p.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : p.status === 'Processing'
                            ? 'bg-blue-50 text-blue-700'
                            : p.status === 'On Hold'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/portal/finance/payments')}
            className="w-full mt-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            View All Payments ({payments.length}) <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
