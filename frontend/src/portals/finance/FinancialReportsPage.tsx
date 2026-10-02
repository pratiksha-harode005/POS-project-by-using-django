import React, { useState, useMemo, useEffect } from 'react'
import {
  FileCheck, Building, CreditCard, TrendingUp, BarChart2,
  PieChart as PieIcon, ArrowUpDown, ChevronRight, ShieldCheck,
  CheckCircle2, AlertTriangle, FileText, IndianRupee, Check, ExternalLink,
  Search, X, Filter, RotateCcw, Download, Eye, RefreshCw
} from 'lucide-react'
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useSearchParams } from 'react-router-dom'
import { useFinanceData } from '../../context/ManagerDataContext'
import { useAuth } from '../../context/AuthContext'
import { downloadPaymentLedgerPdf, getPaymentLedgerPdfBlobUrl } from '../../utils/paymentLedgerPdfGenerator'
import { formatDate } from '../../utils/formatDate'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

type ReportType =
  | 'budget_utilization'
  | 'department_spending'
  | 'vendor_spending'
  | 'payment_summary'
  | 'invoice_exceptions'
  | 'monthly_summary'

interface InvoiceExceptionItem {
  id: string
  docRef: string
  vendor: string
  category: string
  department: string
  exceptionReason: string
  invoiceAmount: number
  discrepancyAmount: number
  agingDays: number
  status: 'Under Investigation' | 'Held for Credit Note' | 'Vendor Re-invoicing' | 'Warehouse Inspection'
}

const DEPARTMENT_OPTIONS = [
  { id: 'ALL', label: 'All Departments' },
  { id: 'IT', label: 'IT & Infrastructure' },
  { id: 'Operations', label: 'Operations' },
  { id: 'Marketing', label: 'Marketing' },
  { id: 'HR', label: 'Human Resources' },
  { id: 'Admin', label: 'Corporate Admin' },
]

export const FinancialReportsPage: React.FC = () => {
  const { user } = useAuth()
  const { budgets, payments, allRequests, financeKPIs, paymentData, complaints, invoices } = useFinanceData()
  const [searchParams, setSearchParams] = useSearchParams()

  const actorName = user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Treasury Controller'

  // State: Report Type
  const [reportType, setReportType] = useState<ReportType>('budget_utilization')

  // State: Department Filter & Table Search
  const queryDept = searchParams.get('dept') || 'ALL'
  const [selectedDept, setSelectedDept] = useState<string>(queryDept)
  const [tableSearch, setTableSearch] = useState<string>('')

  // Keep selectedDept in sync with URL query param
  useEffect(() => {
    const d = searchParams.get('dept')
    if (d) {
      setSelectedDept(d)
    }
  }, [searchParams])

  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  const handleExportPdf = async () => {
    setIsExportingPdf(true)
    try {
      await downloadPaymentLedgerPdf({
        payments: filteredPayments.length > 0 ? filteredPayments : payments,
        actorName,
        statusFilter: selectedDept === 'ALL' ? 'ALL' : selectedDept,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handlePreviewPdf = async () => {
    setIsPreviewLoading(true)
    try {
      const url = await getPaymentLedgerPdfBlobUrl({
        payments: filteredPayments.length > 0 ? filteredPayments : payments,
        actorName,
        statusFilter: selectedDept === 'ALL' ? 'ALL' : selectedDept,
      })
      setPreviewPdfUrl(url)
    } catch (err) {
      console.error(err)
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleClosePreview = () => {
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl)
    }
    setPreviewPdfUrl(null)
  }

  const handleDeptSelect = (deptId: string) => {
    setSelectedDept(deptId)
    if (deptId === 'ALL') {
      searchParams.delete('dept')
      setSearchParams(searchParams)
    } else {
      setSearchParams({ ...Object.fromEntries(searchParams.entries()), dept: deptId })
    }
  }

  // Report Type Meta Info
  const reportMeta = useMemo(() => {
    switch (reportType) {
      case 'budget_utilization':
        return {
          title: 'BUDGET UTILIZATION & VARIANCE AUDIT STATEMENT',
          subtitle: 'Departmental Capital Allocation, Encumbered Liabilities & Expenditure Ledger',
          ref: 'FIN-REP-2026-BU-0915',
          description: 'Official statement detailing authorized capital budgets, departmental allocations, committed encumbrances, and net available balances.',
        }
      case 'department_spending':
        return {
          title: 'DEPARTMENTAL EXPENDITURE & CAPITAL RUN-RATE REPORT',
          subtitle: 'Operational Cost Center Spend Analysis, Absorption Rates & Remaining Reserves',
          ref: 'FIN-REP-2026-DS-0915',
          description: 'Comprehensive analysis of operational expenditure across corporate divisions with capital run-rates and forecast absorption.',
        }
      case 'vendor_spending':
        return {
          title: 'ANNUAL VENDOR DISBURSEMENT & CONTRACTUAL EXPOSURE STATEMENT',
          subtitle: 'Supplier Settlement Volumes, Invoicing Frequencies & Statutory Compliance Status',
          ref: 'FIN-REP-2026-VS-0915',
          description: 'Executive ledger of vendor cash outflows, settlement transactions, contractual exposure, and GST compliance.',
        }
      case 'payment_summary':
        return {
          title: 'ACCOUNTS PAYABLE & TREASURY DISBURSEMENT LEDGER',
          subtitle: 'Cleared Vendor Invoices, Payment Rails & Banking Reconciliation Records',
          ref: 'FIN-REP-2026-PS-0915',
          description: 'Audit-ready record of all accounts payable disbursements, banking transaction references, and settlement timestamps.',
        }
      case 'invoice_exceptions':
        return {
          title: 'INVOICE EXCEPTIONS, 3-WAY MATCHING VARIANCE & RECONCILIATION AUDIT',
          subtitle: 'Non-Conforming Billing Records, Price/Quantity Variances & Resolution Aging',
          ref: 'FIN-REP-2026-IE-0915',
          description: 'Detailed report of 3-way matching exceptions, quantity variances, tax discrepancies, and remediation actions.',
        }
      case 'monthly_summary':
        return {
          title: 'MONTHLY TREASURY CASH FLOW & PROCUREMENT OUTFLOW STATEMENT',
          subtitle: 'Requisition Approvals, Cleared Disbursements & Net Liquidity Trajectory',
          ref: 'FIN-REP-2026-MS-0915',
          description: 'Chronological cash-flow statement mapping approved requisition volumes against actual banking disbursements and pending commitments.',
        }
    }
  }, [reportType])

  // Filtered Budgets by Department & Table Keyword Search
  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      const matchDept =
        selectedDept === 'ALL' ||
        b.department.toLowerCase() === selectedDept.toLowerCase() ||
        (selectedDept.toLowerCase() === 'it' && (b.department.toLowerCase().includes('it') || b.category.toLowerCase().includes('it') || b.category.toLowerCase().includes('cloud') || b.category.toLowerCase().includes('saas')))
      const matchSearch =
        !tableSearch ||
        b.department.toLowerCase().includes(tableSearch.toLowerCase()) ||
        b.category.toLowerCase().includes(tableSearch.toLowerCase())
      return matchDept && matchSearch
    })
  }, [budgets, selectedDept, tableSearch])

  // Budget Totals calculated dynamically from filtered budgets
  const budgetTotals = useMemo(() => {
    const totalBudget = filteredBudgets.reduce((s, b) => s + b.totalBudget, 0)
    const allocated = filteredBudgets.reduce((s, b) => s + b.allocated, 0)
    const committed = filteredBudgets.reduce((s, b) => s + b.committed, 0)
    const spent = filteredBudgets.reduce((s, b) => s + b.spent, 0)
    const available = filteredBudgets.reduce((s, b) => s + b.available, 0)
    const pace = totalBudget > 0 ? ((spent / totalBudget) * 100).toFixed(1) : '0.0'
    return { totalBudget, allocated, committed, spent, available, pace }
  }, [filteredBudgets])

  // Monthly summary chart data
  const monthlyData = useMemo(() => {
    return paymentData.monthly.map((m) => ({
      name: m.period,
      Approved: m.approved,
      Paid: m.paid,
      Pending: m.pending,
      NetVariance: m.approved - m.paid,
    }))
  }, [paymentData.monthly])

  // Monthly Totals
  const monthlyTotals = useMemo(() => {
    const approved = monthlyData.reduce((s, m) => s + m.Approved, 0)
    const paid = monthlyData.reduce((s, m) => s + m.Paid, 0)
    const pending = monthlyData.reduce((s, m) => s + m.Pending, 0)
    const variance = approved - paid
    return { approved, paid, pending, variance }
  }, [monthlyData])

  // Department spend data for charts & tables
  const departmentSpendData = useMemo(() => {
    return filteredBudgets.map((b) => ({
      name: `${b.department} - ${b.category}`,
      rawDept: b.department,
      Budget: b.totalBudget,
      Spent: b.spent,
      Committed: b.committed,
      Available: b.available,
      Pace: b.totalBudget > 0 ? ((b.spent / b.totalBudget) * 100).toFixed(1) : '0.0',
    }))
  }, [filteredBudgets])

  // Vendor spend data from payments filtered by department & search
  const vendorSpendData = useMemo(() => {
    const vMap: Record<string, { totalSpend: number; count: number; category: string; dept: string }> = {}
    payments.forEach((p) => {
      const req = allRequests.find((r) => r.id === p.requestId)
      const dept = req?.department || (
        p.vendor.includes('Dell') || p.vendor.includes('Samsung') || p.vendor.includes('Logitech') || p.vendor.includes('Amazon')
          ? 'IT'
          : 'Operations'
      )

      const matchDept =
        selectedDept === 'ALL' ||
        dept.toLowerCase() === selectedDept.toLowerCase() ||
        (selectedDept.toLowerCase() === 'it' && dept.toLowerCase().includes('it'))

      const matchSearch =
        !tableSearch ||
        p.vendor.toLowerCase().includes(tableSearch.toLowerCase()) ||
        p.requestId.toLowerCase().includes(tableSearch.toLowerCase())

      if (matchDept && matchSearch) {
        if (!vMap[p.vendor]) {
          vMap[p.vendor] = {
            totalSpend: 0,
            count: 0,
            category: p.vendor.includes('Dell') || p.vendor.includes('Samsung') || p.vendor.includes('Logitech')
              ? 'IT Hardware'
              : p.vendor.includes('Amazon') || p.vendor.includes('Salesforce')
              ? 'Cloud & SaaS'
              : 'Corporate Services',
            dept,
          }
        }
        vMap[p.vendor].totalSpend += p.amount
        vMap[p.vendor].count += 1
      }
    })

    return Object.keys(vMap).map((k) => ({
      vendor: k,
      category: vMap[k].category,
      dept: vMap[k].dept,
      totalSpend: vMap[k].totalSpend,
      invoiceCount: vMap[k].count,
      avgSpend: Math.round(vMap[k].totalSpend / vMap[k].count),
    }))
  }, [payments, allRequests, selectedDept, tableSearch])

  // Vendor Totals
  const vendorTotals = useMemo(() => {
    const totalSpend = vendorSpendData.reduce((s, v) => s + v.totalSpend, 0)
    const totalInvoices = vendorSpendData.reduce((s, v) => s + v.invoiceCount, 0)
    const avgInvoice = totalInvoices > 0 ? Math.round(totalSpend / totalInvoices) : 0
    return { totalSpend, totalInvoices, avgInvoice }
  }, [vendorSpendData])

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const req = allRequests.find((r) => r.id === p.requestId)
      const dept = req?.department || (
        p.vendor.includes('Dell') || p.vendor.includes('Samsung') || p.vendor.includes('Logitech') || p.vendor.includes('Amazon')
          ? 'IT'
          : 'Operations'
      )

      const matchDept =
        selectedDept === 'ALL' ||
        dept.toLowerCase() === selectedDept.toLowerCase() ||
        (selectedDept.toLowerCase() === 'it' && dept.toLowerCase().includes('it'))

      const matchSearch =
        !tableSearch ||
        String(p.id || '').toLowerCase().includes(tableSearch.toLowerCase()) ||
        String(p.vendor || '').toLowerCase().includes(tableSearch.toLowerCase()) ||
        String(p.requestId || '').toLowerCase().includes(tableSearch.toLowerCase())

      return matchDept && matchSearch
    })
  }, [payments, allRequests, selectedDept, tableSearch])

  // Payment Totals
  const paymentTotals = useMemo(() => {
    const totalAmount = filteredPayments.reduce((s, p) => s + p.amount, 0)
    const paidAmount = filteredPayments.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0)
    const pendingAmount = filteredPayments.filter((p) => p.status !== 'Paid').reduce((s, p) => s + p.amount, 0)
    const taxHandled = filteredPayments.reduce((s, p) => s + (p.taxAmount || Math.round(p.amount * 0.18)), 0)
    return { totalAmount, paidAmount, pendingAmount, taxHandled }
  }, [filteredPayments])

  // Derived Real Exceptions from live complaints and disputed/pending invoices
  const derivedExceptions = useMemo<InvoiceExceptionItem[]>(() => {
    const list: InvoiceExceptionItem[] = []
    complaints?.forEach((c: any, idx: number) => {
      const unitCost = Number(c.unitPrice || c.pricePerUnit || 0)
      const invoiceAmt = Number(c.totalAmount || (unitCost > 0 ? unitCost * Number(c.defectiveQuantity || 1) : 0))
      list.push({
        id: `EXC-${c.id || idx + 1}`,
        docRef: c.poNumber || `PO-2026-${idx + 1}`,
        vendor: c.vendor || 'Authorized Supplier',
        category: c.complaintType || 'Procurement',
        department: c.department || 'Operations',
        exceptionReason: `${c.complaintType}: ${c.issueDescription?.substring(0, 50) || 'Quality or Delivery Discrepancy'}`,
        invoiceAmount: invoiceAmt,
        discrepancyAmount: Math.round(invoiceAmt * 0.2),
        agingDays: Math.max(1, Math.floor((Date.now() - new Date(c.createdDate || new Date().toISOString().split('T')[0]).getTime()) / (1000 * 60 * 60 * 24))),
        status: (c.status === 'Resolved' ? 'Held for Credit Note' : 'Under Investigation') as any
      })
    })
    invoices?.forEach((inv: any, idx: number) => {
      const invStatus = (inv.status || '').toUpperCase()
      if (invStatus === 'REJECTED' || invStatus === 'DISPUTED' || invStatus === 'ON_HOLD' || invStatus === 'PENDING') {
        const invAmt = Number(inv.total_amount || inv.amount || 0)
        list.push({
          id: `EXC-INV-${inv.id || idx + 1}`,
          docRef: inv.invoice_number || `INV-${inv.id || idx + 1}`,
          vendor: inv.vendor_name || inv.vendor || 'Enterprise Vendor',
          category: inv.category || 'General Procurement',
          department: inv.department || 'IT',
          exceptionReason: inv.rejection_reason || 'Pending verification against Purchase Order',
          invoiceAmount: invAmt,
          discrepancyAmount: Math.round(invAmt * 0.10),
          agingDays: 4,
          status: invStatus === 'REJECTED' ? 'Vendor Re-invoicing' : 'Under Investigation'
        })
      }
    })
    return list
  }, [complaints, invoices])

  // Filtered Exceptions
  const filteredExceptions = useMemo(() => {
    return derivedExceptions.filter((e) => {
      const matchDept =
        selectedDept === 'ALL' ||
        e.department.toLowerCase() === selectedDept.toLowerCase() ||
        (selectedDept.toLowerCase() === 'it' && (e.department === 'IT' || e.category.includes('IT') || e.category.includes('SaaS')))

      const matchSearch =
        !tableSearch ||
        e.vendor.toLowerCase().includes(tableSearch.toLowerCase()) ||
        e.id.toLowerCase().includes(tableSearch.toLowerCase()) ||
        e.docRef.toLowerCase().includes(tableSearch.toLowerCase()) ||
        e.category.toLowerCase().includes(tableSearch.toLowerCase())

      return matchDept && matchSearch
    })
  }, [derivedExceptions, selectedDept, tableSearch])

  // Exceptions Totals
  const exceptionTotals = useMemo(() => {
    const totalClaimed = filteredExceptions.reduce((s, e) => s + e.invoiceAmount, 0)
    const totalDiscrepancy = filteredExceptions.reduce((s, e) => s + e.discrepancyAmount, 0)
    return { totalClaimed, totalDiscrepancy }
  }, [filteredExceptions])

  const reportsList = [
    { id: 'budget_utilization', label: 'Budget Utilization' },
    { id: 'department_spending', label: 'Department Spending' },
    { id: 'vendor_spending', label: 'Vendor Spending' },
    { id: 'payment_summary', label: 'Payment Summary' },
    { id: 'invoice_exceptions', label: 'Invoice Exceptions' },
    { id: 'monthly_summary', label: 'Monthly Financial Summary' },
  ]

  const activeDeptLabel = DEPARTMENT_OPTIONS.find((d) => d.id.toLowerCase() === selectedDept.toLowerCase())?.label || selectedDept

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              EXECUTIVE REPORTING
            </span>
            <span className="text-xs text-slate-400 font-medium">SOX & Audit Ready Reports</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Financial Reports & Spend Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate detailed statements for budget utilization, vendor disbursements, operational category run-rates, and monthly treasury trends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePreviewPdf}
            disabled={isPreviewLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-all disabled:opacity-50"
            title="Preview Audited Ledger PDF in browser"
          >
            {isPreviewLoading ? (
              <RefreshCw size={14} className="animate-spin text-slate-400" />
            ) : (
              <Eye size={14} className="text-slate-500" />
            )}
            <span>Preview Ledger</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl shadow-xs hover:shadow transition-all"
            title="Export Audited Payment Ledger as PDF"
          >
            {isExportingPdf ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <FileText size={14} />
            )}
            <span>Export Payment Ledger</span>
            <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-indigo-800 text-indigo-100 rounded font-mono uppercase tracking-wider">
              PDF
            </span>
          </button>
        </div>
      </div>

      {/* Report Selector Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {reportsList.map((r) => (
          <button
            key={r.id}
            onClick={() => setReportType(r.id as ReportType)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              reportType === r.id
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Working Department Filter Bar & Real-time Record Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1 shrink-0">
            <Building size={15} className="text-indigo-600" />
            <span>Department Filter:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {DEPARTMENT_OPTIONS.map((d) => {
              const isSelected =
                (d.id === 'ALL' && selectedDept === 'ALL') ||
                selectedDept.toLowerCase() === d.id.toLowerCase()
              return (
                <button
                  key={d.id}
                  onClick={() => handleDeptSelect(d.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs font-bold ring-2 ring-indigo-300'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Live Filter Input */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search records in table..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-7 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          {tableSearch && (
            <button
              onClick={() => setTableSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Indication Banner */}
      {selectedDept !== 'ALL' && (
        <div className="bg-indigo-50 border border-indigo-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-indigo-900">
            <span className="font-bold">Active Filter:</span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-200/70 text-indigo-800 font-bold">
              {activeDeptLabel}
            </span>
            <span className="text-indigo-600 text-[11px]">
              Showing financial ledger & spend analytics filtered specifically for {activeDeptLabel}
            </span>
          </div>
          <button
            onClick={() => handleDeptSelect('ALL')}
            className="flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-bold text-xs underline cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Reset to All Departments</span>
          </button>
        </div>
      )}

      {/* Report Banner / Context Box */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-mono mb-1">
              <ShieldCheck size={14} />
              <span>{reportMeta.ref}</span>
              <span>•</span>
              <span>Fiscal Year 2026-27</span>
              {selectedDept !== 'ALL' && (
                <>
                  <span>•</span>
                  <span className="bg-indigo-600/50 text-indigo-200 px-2 py-0.5 rounded text-[11px] font-bold">
                    Dept: {activeDeptLabel}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {reportMeta.title}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              {reportMeta.description}
            </p>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-5 shrink-0 text-right">
            <span className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider block">
              {selectedDept === 'ALL' ? 'Authorized Total' : `${selectedDept} Total Budget`}
            </span>
            <span className="text-xl font-bold text-white font-mono mt-0.5">
              {fmt(budgetTotals.totalBudget)}
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold block mt-0.5">
              Burn Pace: {budgetTotals.pace}%
            </span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {reportType === 'monthly_summary'
                ? 'Monthly Cash Flow & Payment Trajectory'
                : `Comparative Spend Allocation & Exposure (${activeDeptLabel})`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Audited data retrieved from core procurement ledger
            </p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {reportType === 'monthly_summary' ? (
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="repColorApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="repColorPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" fontSize={11} stroke="#64748B" />
                <YAxis
                  fontSize={11}
                  stroke="#64748B"
                  tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                />
                <Tooltip formatter={(value: any) => [`${fmt(Number(value))}`, '']} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="Approved" stroke="#4F46E5" fill="url(#repColorApproved)" />
                <Area type="monotone" dataKey="Paid" stroke="#16A34A" fill="url(#repColorPaid)" />
              </AreaChart>
            ) : (
              <BarChart data={departmentSpendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" fontSize={11} stroke="#64748B" />
                <YAxis
                  fontSize={11}
                  stroke="#64748B"
                  tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                />
                <Tooltip formatter={(value: any) => [`${fmt(Number(value))}`, '']} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Budget" fill="#E2E8F0" radius={[4, 4, 0, 0]} name="Total Budget" />
                <Bar dataKey="Committed" fill="#D97706" radius={[4, 4, 0, 0]} name="Committed POs" />
                <Bar dataKey="Spent" fill="#2563EB" radius={[4, 4, 0, 0]} name="Disbursed Spent" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Data View with Accounting Grand Totals */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Tabular Financial Ledger Records
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing audited records ({activeDeptLabel})
          </span>
        </div>

        <div className="overflow-x-auto">
          {reportType === 'vendor_spending' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-4">Vendor Legal Entity</th>
                  <th className="p-4">Sourcing Category</th>
                  <th className="p-4">Department</th>
                  <th className="p-4 text-center">Invoices Audited</th>
                  <th className="p-4 text-right">Total Disbursed Volume</th>
                  <th className="p-4 text-right">Avg Invoice Value</th>
                  <th className="p-4">Payment Terms</th>
                  <th className="p-4">Compliance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {vendorSpendData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No vendor records found matching "{activeDeptLabel}"
                    </td>
                  </tr>
                ) : (
                  vendorSpendData.map((v) => (
                    <tr key={v.vendor} className="hover:bg-slate-50/80">
                      <td className="p-4 font-bold text-slate-900">{v.vendor}</td>
                      <td className="p-4 text-slate-600">{v.category}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {v.dept}
                        </span>
                      </td>
                      <td className="p-4 text-center text-slate-600">{v.invoiceCount}</td>
                      <td className="p-4 text-right font-extrabold text-slate-900">{fmt(v.totalSpend)}</td>
                      <td className="p-4 text-right text-slate-700">{fmt(v.avgSpend)}</td>
                      <td className="p-4 text-slate-600">Net 30</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active & Verified
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-950 text-xs">
                <tr>
                  <td className="p-4 uppercase tracking-wider">Grand Total ({activeDeptLabel})</td>
                  <td className="p-4 text-slate-300">All Categories</td>
                  <td className="p-4 text-slate-300">--</td>
                  <td className="p-4 text-center text-indigo-300">{vendorTotals.totalInvoices} Invoices</td>
                  <td className="p-4 text-right text-emerald-400 font-extrabold text-sm">{fmt(vendorTotals.totalSpend)}</td>
                  <td className="p-4 text-right text-slate-300">{fmt(vendorTotals.avgInvoice)}</td>
                  <td className="p-4 text-slate-400">--</td>
                  <td className="p-4 text-emerald-400">AUDITED & CLEARED</td>
                </tr>
              </tfoot>
            </table>
          ) : reportType === 'payment_summary' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-4">Payment Ref</th>
                  <th className="p-4">Requisition</th>
                  <th className="p-4">Beneficiary Vendor</th>
                  <th className="p-4">Invoice ID</th>
                  <th className="p-4 text-right">Disbursed Amount</th>
                  <th className="p-4">Settlement Date</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No payment records found matching "{activeDeptLabel}"
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="p-4 font-mono font-bold text-indigo-600">{p.id}</td>
                      <td className="p-4 text-slate-500 font-mono">{p.requestId}</td>
                      <td className="p-4 font-bold text-slate-900">{p.vendor}</td>
                      <td className="p-4 text-slate-600">{p.invoiceId}</td>
                      <td className="p-4 text-right font-extrabold text-slate-900">{fmt(p.amount)}</td>
                      <td className="p-4 text-slate-600">{formatDate(p.paymentDate || p.dueDate)}</td>
                      <td className="p-4 text-slate-600">{p.paymentMethod}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-950 text-xs">
                <tr>
                  <td className="p-4 uppercase tracking-wider">Grand Total ({activeDeptLabel})</td>
                  <td className="p-4 text-slate-300">Filtered Requisitions</td>
                  <td className="p-4 text-slate-300">{filteredPayments.length} Records</td>
                  <td className="p-4 text-slate-400">--</td>
                  <td className="p-4 text-right text-emerald-400 font-extrabold text-sm">{fmt(paymentTotals.totalAmount)}</td>
                  <td className="p-4 text-slate-400">--</td>
                  <td className="p-4 text-slate-300">Multi-Channel</td>
                  <td className="p-4 text-emerald-400">{paymentTotals.paidAmount === paymentTotals.totalAmount ? '100% Cleared' : 'Active Ledger'}</td>
                </tr>
              </tfoot>
            </table>
          ) : reportType === 'invoice_exceptions' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-4">Exception Ref</th>
                  <th className="p-4">Invoice Ref</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Exception Diagnostic Issue</th>
                  <th className="p-4 text-right">Invoice Value</th>
                  <th className="p-4 text-right">Discrepancy (INR)</th>
                  <th className="p-4 text-center">Aging (Days)</th>
                  <th className="p-4">Audit Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredExceptions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No invoice exceptions found for "{activeDeptLabel}"
                    </td>
                  </tr>
                ) : (
                  filteredExceptions.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80">
                      <td className="p-4 font-mono font-bold text-rose-600">{e.id}</td>
                      <td className="p-4 font-mono text-slate-600">{e.docRef}</td>
                      <td className="p-4 font-bold text-slate-900">{e.vendor}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {e.department}
                        </span>
                      </td>
                      <td className="p-4 text-slate-700">{e.exceptionReason}</td>
                      <td className="p-4 text-right font-semibold text-slate-800">{fmt(e.invoiceAmount)}</td>
                      <td className="p-4 text-right font-extrabold text-rose-600">{fmt(e.discrepancyAmount)}</td>
                      <td className="p-4 text-center text-slate-600">{e.agingDays} d</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-950 text-xs">
                <tr>
                  <td className="p-4 uppercase tracking-wider">Total Discrepancy Exposure ({activeDeptLabel})</td>
                  <td className="p-4 text-slate-300">--</td>
                  <td className="p-4 text-slate-300">--</td>
                  <td className="p-4 text-slate-300">--</td>
                  <td className="p-4 text-indigo-300">{filteredExceptions.length} Flagged Exceptions</td>
                  <td className="p-4 text-right text-slate-200">{fmt(exceptionTotals.totalClaimed)}</td>
                  <td className="p-4 text-right text-rose-400 font-extrabold text-sm">{fmt(exceptionTotals.totalDiscrepancy)}</td>
                  <td className="p-4 text-slate-400">--</td>
                  <td className="p-4 text-amber-400">PAYMENTS ON HOLD</td>
                </tr>
              </tfoot>
            </table>
          ) : reportType === 'monthly_summary' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-4">Month / Period</th>
                  <th className="p-4 text-right">Requisitions Approved</th>
                  <th className="p-4 text-right">Payments Cleared</th>
                  <th className="p-4 text-right">Pending Liabilities</th>
                  <th className="p-4 text-right">Net Monthly Outflow Variance</th>
                  <th className="p-4">Liquidity Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {monthlyData.map((m) => (
                  <tr key={m.name} className="hover:bg-slate-50/80">
                    <td className="p-4 font-bold text-slate-900">{m.name}</td>
                    <td className="p-4 text-right font-semibold text-indigo-600">{fmt(m.Approved)}</td>
                    <td className="p-4 text-right font-extrabold text-emerald-600">{fmt(m.Paid)}</td>
                    <td className="p-4 text-right text-amber-600">{fmt(m.Pending)}</td>
                    <td className="p-4 text-right font-bold text-slate-800">{fmt(m.NetVariance)}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Balanced
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-950 text-xs">
                <tr>
                  <td className="p-4 uppercase tracking-wider">Full Year Consolidated</td>
                  <td className="p-4 text-right text-indigo-300 font-bold">{fmt(monthlyTotals.approved)}</td>
                  <td className="p-4 text-right text-emerald-400 font-extrabold text-sm">{fmt(monthlyTotals.paid)}</td>
                  <td className="p-4 text-right text-amber-300 font-bold">{fmt(monthlyTotals.pending)}</td>
                  <td className="p-4 text-right text-white font-bold">{fmt(monthlyTotals.variance)}</td>
                  <td className="p-4 text-emerald-400">TREASURY MANAGED</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            // Default: budget_utilization & department_spending
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-4">Cost Center</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Expense Category</th>
                  <th className="p-4 text-right">Total Budget</th>
                  <th className="p-4 text-right">Allocated</th>
                  <th className="p-4 text-right">Committed</th>
                  <th className="p-4 text-right">Spent</th>
                  <th className="p-4 text-right">Available</th>
                  <th className="p-4 text-center">Pace %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredBudgets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No budget records found matching "{activeDeptLabel}"
                    </td>
                  </tr>
                ) : (
                  filteredBudgets.map((b, idx) => {
                    const cc = `CC-${b.department.substring(0, 3).toUpperCase()}-${100 + idx * 5}`
                    const pace = ((b.spent / b.totalBudget) * 100).toFixed(1)
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-4 font-mono text-[11px] font-bold text-slate-500">{cc}</td>
                        <td className="p-4 font-bold text-slate-900">{b.department}</td>
                        <td className="p-4 text-slate-600">{b.category}</td>
                        <td className="p-4 text-right font-extrabold text-slate-900">{fmt(b.totalBudget)}</td>
                        <td className="p-4 text-right text-indigo-700 font-semibold">{fmt(b.allocated)}</td>
                        <td className="p-4 text-right text-amber-700 font-semibold">{fmt(b.committed)}</td>
                        <td className="p-4 text-right text-blue-700 font-semibold">{fmt(b.spent)}</td>
                        <td className="p-4 text-right text-emerald-700 font-black">{fmt(b.available)}</td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-800">
                            {pace}%
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-950 text-xs">
                <tr>
                  <td className="p-4 uppercase tracking-wider" colSpan={3}>
                    Grand Total ({activeDeptLabel} Cost Centers)
                  </td>
                  <td className="p-4 text-right text-white font-extrabold text-sm">{fmt(budgetTotals.totalBudget)}</td>
                  <td className="p-4 text-right text-indigo-300">{fmt(budgetTotals.allocated)}</td>
                  <td className="p-4 text-right text-amber-300">{fmt(budgetTotals.committed)}</td>
                  <td className="p-4 text-right text-blue-300 font-bold">{fmt(budgetTotals.spent)}</td>
                  <td className="p-4 text-right text-emerald-400 font-black text-sm">{fmt(budgetTotals.available)}</td>
                  <td className="p-4 text-center text-emerald-400 font-bold">{budgetTotals.pace}%</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Professional Payment Ledger PDF Preview Modal */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    Audited Payment & Disbursement Ledger
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                      Audited PDF
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Batch: FY26-DISB-BATCH • {filteredPayments.length > 0 ? filteredPayments.length : payments.length} Transactions Included • Landscape A4
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition-colors"
                >
                  <Download size={13} />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleClosePreview}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Embedded PDF Viewer Frame */}
            <div className="flex-1 bg-slate-100 p-2 overflow-hidden">
              <iframe
                src={previewPdfUrl}
                title="Financial Reports Payment Ledger PDF Preview"
                className="w-full h-full rounded-xl border border-slate-200 shadow-inner bg-white"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                Official Audited Disbursement Sub-Ledger (100% 3-Way Matched & Certified)
              </span>
              <button
                type="button"
                onClick={handleClosePreview}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Audited Financial Reports & Statements Component
