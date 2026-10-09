import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CreditCard, Search, Filter, CheckCircle2, Clock, AlertTriangle,
  FileText, ArrowRight, Eye, ChevronRight, X, Send, Check, ShieldCheck,
  Building, Download, IndianRupee, RefreshCw, XCircle, Printer
} from 'lucide-react'
import { useFinanceData, PaymentRecord, PaymentStatus } from '../../context/ManagerDataContext'
import { useAuth } from '../../context/AuthContext'
import { useActivity, UnreadBadge } from '../../context/ActivityContext'
import {
  downloadPaymentLedgerPdf,
  getPaymentLedgerPdfBlobUrl,
  downloadPaymentBillPdf,
  getPaymentBillPdfBlobUrl,
  numberToIndianWords
} from '../../utils/paymentLedgerPdfGenerator'
import { formatDate } from '../../utils/formatDate'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export const FinancePaymentsPage: React.FC = () => {
  const navigate = useNavigate()
  const { isUnread, markAsRead } = useActivity()
  const { payments, disbursePayment, updatePaymentStatus, financeKPIs } = useFinanceData()
  const { user } = useAuth()

  // State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
  const [previewPdfTitle, setPreviewPdfTitle] = useState<string>('Audited Payment Ledger')
  const [previewPdfType, setPreviewPdfType] = useState<'ledger' | 'bill'>('ledger')
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const actorName = user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Finance Officer'

  const handleExportPdf = async () => {
    setIsExportingPdf(true)
    try {
      await downloadPaymentLedgerPdf({
        payments: filteredPayments.length > 0 ? filteredPayments : payments,
        actorName,
        statusFilter,
      })
      showToast('✓ Audited Payment Ledger PDF downloaded successfully!', 'success')
    } catch (err) {
      console.error(err)
      showToast('Failed to generate Payment Ledger PDF', 'error')
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
        statusFilter,
      })
      setPreviewPdfUrl(url)
      setPreviewPdfTitle('Audited Payment & Disbursement Ledger')
      setPreviewPdfType('ledger')
    } catch (err) {
      console.error(err)
      showToast('Failed to render PDF preview', 'error')
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleDownloadBill = async (p: PaymentRecord) => {
    try {
      await downloadPaymentBillPdf({
        payment: p,
        actorName,
      })
      showToast(`✓ Commercial Payment Bill for ${p.id} downloaded successfully!`, 'success')
    } catch (err) {
      console.error(err)
      showToast('Failed to generate Payment Bill PDF', 'error')
    }
  }

  const handlePreviewBill = async (p: PaymentRecord) => {
    setIsPreviewLoading(true)
    try {
      const url = await getPaymentBillPdfBlobUrl({
        payment: p,
        actorName,
      })
      setPreviewPdfUrl(url)
      setPreviewPdfTitle(`Payment Disbursement Bill — ${p.id} (${p.vendor})`)
      setPreviewPdfType('bill')
    } catch (err) {
      console.error(err)
      showToast('Failed to render Bill preview', 'error')
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

  // Summary Metrics calculated live from state
  const pendingCount = payments.filter((p) => p.status === 'Pending').length
  const processingCount = payments.filter((p) => p.status === 'Processing').length
  const completedCount = payments.filter((p) => p.status === 'Paid').length

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    const q = (search || '').toLowerCase().trim()
    return payments.filter((p) => {
      const matchSearch =
        !q ||
        String(p.id || '').toLowerCase().includes(q) ||
        String(p.requestId || '').toLowerCase().includes(q) ||
        String(p.vendor || '').toLowerCase().includes(q) ||
        String(p.invoiceId || '').toLowerCase().includes(q) ||
        String(p.requestTitle || '').toLowerCase().includes(q)
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [payments, search, statusFilter])

  // Sync selectedPayment with state
  const activePayment = useMemo(() => {
    if (!selectedPayment) return null
    return payments.find((p) => p.id === selectedPayment.id) || selectedPayment
  }, [payments, selectedPayment])

  const handleDisburse = async (id: string): Promise<boolean> => {
    try {
      await disbursePayment(id, actorName)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Payment was not saved by the server.', 'error')
      return false
    }
    showToast(`✓ Payment ${id} disbursed successfully via banking gateway`)
    navigate('/portal/finance/purchase-requests')
    return true
  }

  const handleStatusChange = async (id: string, newStatus: PaymentStatus, note?: string) => {
    try {
      await updatePaymentStatus(id, newStatus, actorName, note)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Payment status was not saved by the server.', 'error')
      return
    }
    showToast(`✓ Payment status updated to ${newStatus}`)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 text-white animate-fadeIn ${
            toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-rose-600' : 'bg-indigo-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              TREASURY & DISBURSEMENTS
            </span>
            <span className="text-xs text-slate-400 font-medium">Bank Batch Settlement Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Payments Queue & Commercial Disbursements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Process vendor settlements, disburse 3-way matched invoices, and review statutory tax breakdowns.
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

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Payments */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'ALL' : 'Pending')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
            statusFilter === 'Pending'
              ? 'bg-amber-50/40 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
          role="button"
          tabIndex={0}
          title="Click to filter Pending Payments"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Payments</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-700 tracking-tight">
            {pendingCount}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>Awaiting Authorization</span>
            <span className="font-bold text-slate-700">{fmt(financeKPIs.pendingPaymentsAmount)}</span>
          </div>
        </div>

        {/* Processing Payments */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'Processing' ? 'ALL' : 'Processing')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
            statusFilter === 'Processing'
              ? 'bg-blue-50/40 border-blue-400 ring-2 ring-blue-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
          role="button"
          tabIndex={0}
          title="Click to filter Processing Payments"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Processing Payments</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <RefreshCw size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-blue-700 tracking-tight">
            {processingCount}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>In Bank Batch Clearing</span>
            <span className="font-semibold text-blue-600">Active Wire</span>
          </div>
        </div>

        {/* Completed Payments */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'Paid' ? 'ALL' : 'Paid')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
            statusFilter === 'Paid'
              ? 'bg-emerald-50/40 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
          role="button"
          tabIndex={0}
          title="Click to filter Completed Payments"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed Payments</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 tracking-tight">
            {completedCount}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>Settled Invoices</span>
            <span className="font-semibold text-emerald-600">UTR Verified</span>
          </div>
        </div>

        {/* Total Paid Amount */}
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
            statusFilter === 'ALL'
              ? 'bg-indigo-50/40 border-indigo-400 ring-2 ring-indigo-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-indigo-300'
          }`}
          role="button"
          tabIndex={0}
          title="Click to view All Payments"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Paid Amount</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IndianRupee size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-indigo-950 tracking-tight">
            {fmt(financeKPIs.paidAmount)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>All Historical Outflows</span>
            <span className="font-bold text-slate-700">FY2026-27</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search payment ID, request, vendor, invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Filter size={14} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-indigo-600"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Paid">Paid</option>
            <option value="On Hold">On Hold</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Payment Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Payment ID</th>
                <th className="p-4">Request Ref</th>
                <th className="p-4">Vendor</th>
                <th className="p-4">Invoice</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4">Payment Date / Due</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 text-xs">
                    <CreditCard size={32} className="mx-auto mb-2 text-slate-300" />
                    No payments found matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isNew = p.status === 'Pending' && isUnread(p.id)
                  return (
                    <tr
                      key={p.id}
                      onClick={() => {
                        if (isNew) markAsRead(p.id)
                        setSelectedPayment(p)
                      }}
                      className={`transition-colors cursor-pointer ${
                        isNew
                          ? 'bg-blue-50/40 hover:bg-blue-50/70 font-semibold border-l-4 border-l-blue-600'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="p-4 font-bold text-indigo-600 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <UnreadBadge isUnread={isNew} />
                          <span>{p.id}</span>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{p.requestId || `REQ-${p.id}`}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[180px] block" title={p.requestTitle}>
                          {p.requestTitle || 'Procurement Order'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-900 whitespace-nowrap">
                        {p.vendor || 'Vendor Partner'}
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono">
                          {p.invoiceId || (p.requestId ? `INV-${p.requestId.replace(/^REQ-/, '')}` : 'INV-PENDING')}
                        </span>
                      </td>
                      <td className="p-4 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {fmt(Number(p.amount) || 0)}
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-600">
                        {p.status === 'Paid' ? (
                          <span className="text-emerald-700 font-semibold">
                            Paid: {formatDate(p.paymentDate || p.dueDate || '')}
                          </span>
                        ) : (
                          <span>Due: {formatDate(p.dueDate || p.paymentDate || '')}</span>
                        )}
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-600">
                        {p.paymentMethod || 'Bank Transfer'}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            p.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : p.status === 'Processing'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : p.status === 'On Hold'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : p.status === 'Failed'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            if (isNew) markAsRead(p.id)
                            setSelectedPayment(p)
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Eye size={12} />
                          Details
                        </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadBill(p)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-2.5 py-1.5 rounded-lg transition-colors"
                        title="Download Commercial Payment Bill / Voucher (PDF)"
                      >
                        <FileText size={12} className="text-indigo-600" />
                        Bill
                      </button>

                      {p.status !== 'Paid' && (
                        <button
                          type="button"
                          onClick={() => handleDisburse(p.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg shadow-2xs transition-all"
                        >
                          Disburse
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Details Modal */}
      {activePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="text-indigo-600" size={20} />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Payment Voucher {activePayment.id}
                  </h3>
                  <p className="text-xs text-slate-500">Ref: {activePayment.requestId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Requisition & Vendor Information */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{activePayment.requestTitle}</span>
                <span className="text-indigo-600">{activePayment.vendor}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>PO: {activePayment.poNumber}</span>
                <span>GRN: {activePayment.grnNumber}</span>
                <span>Invoice: {activePayment.invoiceId}</span>
              </div>
            </div>

            {/* Complete Financial Amount Breakdown */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Accounting & Tax Amount Breakdown
              </span>
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Taxable Base (Net)</span>
                  <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                    {fmt(Math.max(0, (Number(activePayment.amount) || 0) - (Number(activePayment.taxAmount) || 0)))}
                  </span>
                  <span className="text-[9px] text-slate-400">Pre-Tax Subtotal</span>
                </div>
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <span className="text-indigo-700 block text-[10px] uppercase font-bold">Statutory GST (18%)</span>
                  <span className="text-sm font-extrabold text-indigo-950 mt-0.5 block">
                    {fmt(Number(activePayment.taxAmount) || 0)}
                  </span>
                  <span className="text-[9px] text-indigo-500">CGST 9% + SGST 9%</span>
                </div>
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                  <span className="text-emerald-800 block text-[10px] uppercase font-bold">Total Gross Amount</span>
                  <span className="text-sm font-extrabold text-emerald-950 mt-0.5 block">
                    {fmt(Number(activePayment.amount) || 0)}
                  </span>
                  <span className="text-[9px] text-emerald-600 font-semibold">100% 3-Way Matched</span>
                </div>
              </div>
            </div>

            {/* Gross Amount in Words */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Amount in Words</span>
              <p className="font-semibold text-slate-800 text-xs italic">
                {numberToIndianWords(Number(activePayment.amount) || 0)}
              </p>
            </div>

            {/* Payment Audit History */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-700 block">Payment Audit & Processing Trail:</span>
              <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100 max-h-28 overflow-y-auto">
                {activePayment.history?.map((h, i) => (
                  <div key={i} className="flex items-start justify-between text-[11px] text-slate-600">
                    <div>
                      <span className="font-bold text-slate-800">{h.action}</span>
                      {h.note && <span className="text-slate-500 block text-[10px]">{h.note}</span>}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{h.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes if present */}
            {activePayment.notes && (
              <p className="text-xs text-slate-600 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200">
                <b className="text-amber-900">Commercial Note:</b> {activePayment.notes}
              </p>
            )}

            {/* Actions in Modal */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePreviewBill(activePayment)}
                  className="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors"
                  title="Preview Official Commercial Bill"
                >
                  <Eye size={13} className="text-slate-500" />
                  Preview Bill
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadBill(activePayment)}
                  className="px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors"
                  title="Download Commercial Payment Bill / Voucher as PDF"
                >
                  <Download size={13} />
                  Download Bill (PDF)
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activePayment.status !== 'On Hold' && activePayment.status !== 'Paid' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(activePayment.id, 'On Hold', 'Placed on hold by finance')}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg transition-colors"
                  >
                    Hold
                  </button>
                )}
                {activePayment.status === 'On Hold' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(activePayment.id, 'Pending', 'Released from hold')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
                  >
                    Release
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close
                </button>
                {activePayment.status !== 'Paid' && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (await handleDisburse(activePayment.id)) setSelectedPayment(null)
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Confirm Disbursement
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional PDF Preview Modal (Supports Master Ledger & Individual Bill) */}
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
                    {previewPdfTitle}
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                      Audited PDF
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {previewPdfType === 'bill'
                      ? 'Format: Official Commercial Remittance Voucher & Bill • Portrait A4'
                      : `Batch: FY26-DISB-BATCH • ${filteredPayments.length > 0 ? filteredPayments.length : payments.length} Transactions Included • Landscape A4`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (previewPdfType === 'bill' && activePayment) {
                      handleDownloadBill(activePayment)
                    } else {
                      handleExportPdf()
                    }
                  }}
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
                title="Payment Document PDF Preview"
                className="w-full h-full rounded-xl border border-slate-200 shadow-inner bg-white"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                {previewPdfType === 'bill'
                  ? 'Certified Commercial Payment Voucher & Remittance Bill (100% 3-Way Matched)'
                  : 'Official Audited Disbursement Sub-Ledger (100% 3-Way Matched & Certified)'}
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
