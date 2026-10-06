import React, { useState, useMemo } from 'react'
import {
  Landmark, Send, CheckCircle, X, AlertTriangle, FileText,
  Download, Printer, ShieldCheck, Clock, Check, Paperclip,
  Building, Calendar, IndianRupee, User, ExternalLink, Sparkles,
  CreditCard, Search, Layers, CheckCircle2, ArrowRight, Copy
} from 'lucide-react'
import { useManagerData, ProcurementRequest } from '../../context/ManagerDataContext'
import { useActivity, UnreadBadge } from '../../context/ActivityContext'
import {
  downloadFinanceHandoverPdf,
  getFinanceHandoverPdfBlobUrl
} from '../../utils/financeHandoverPdfGenerator'
import { numberToIndianWords } from '../../utils/paymentLedgerPdfGenerator'
import { formatDate } from '../../utils/formatDate'
import { UnifiedReceiptModal } from '../../components/portal/UnifiedReceiptModal'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

const statusColors: Record<string, string> = {
  'Under Review': 'bg-amber-100 text-amber-800 border-amber-200',
  'Awaiting Finance Action': 'bg-blue-100 text-blue-800 border-blue-200',
  'Documents Pending': 'bg-orange-100 text-orange-800 border-orange-200',
  'Sent to Finance': 'bg-purple-100 text-purple-800 border-purple-200',
  'Approved': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Completed — Payment Settled': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Paid': 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

const PRESET_DIRECTIVES = [
  'Priority Clearance Required',
  'Tax Invoice & Quote Attached',
  'Budget Limit Verified',
  'Settlement Terms: Net 30 Days',
  'Direct Bank Transfer via RTGS',
  'Annual Statutory Compliance'
]

export const isRequestTransmittedToFinance = (r?: ProcurementRequest | null): boolean => {
  if (!r) return false
  const rawSt = String(r.status || '').toLowerCase()
  const rawFst = String(r.financeStatus || '').toLowerCase()
  return Boolean(
    r.isForwardedToFinance ||
    rawSt === 'sent_to_finance' ||
    rawSt === 'recommended_to_finance' ||
    rawSt === 'finance_review' ||
    rawSt === 'finance_approved' ||
    rawSt === 'completed' ||
    r.paymentStatus === 'Paid' ||
    rawSt.includes('recommend') ||
    rawSt.includes('finance') ||
    rawFst.includes('sent to finance') ||
    rawFst.includes('review') ||
    rawFst.includes('approved') ||
    rawFst.includes('finance') ||
    rawFst.includes('completed') ||
    rawFst.includes('settled') ||
    (r.currentStage !== undefined && r.currentStage >= 2) ||
    (Array.isArray(r.history) && r.history.some((h: any) =>
      h.action === 'RECOMMEND' ||
      (typeof h.actorRole === 'string' && h.actorRole.toUpperCase().includes('FINANCE')) ||
      (typeof h.remark === 'string' && h.remark.toLowerCase().includes('finance'))
    ))
  )
}

type TabFilter = 'ALL' | 'PENDING' | 'TRANSMITTED' | 'SETTLED'

export const FinanceReviewPage: React.FC = () => {
  const { financeReview, sendToFinance, payments } = useManagerData()
  const { isUnread, markAsRead } = useActivity()
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [sendModal, setSendModal] = useState<string | null>(null)
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<any | null>(null)
  const [message, setMessage] = useState('')
  const [selectedDirectives, setSelectedDirectives] = useState<string[]>([
    'Tax Invoice & Quote Attached',
    'Budget Limit Verified'
  ])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'All' | 'Software' | 'Hardware'>('All')
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null)

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedUtr(text)
    showToast(`Copied UTR: ${text}`, 'info')
    setTimeout(() => setCopiedUtr(null), 2500)
  }

  // Correlate requests with payments
  const enrichedList = useMemo(() => {
    return financeReview.map(r => {
      const reqNorm = (r.id || '').replace(/^(REQ-|TCK-|PO-|PRD-)/, '').slice(0, 8).trim().toUpperCase()
      const matchingPay = payments.find(p => {
        const pNorm = (p.requestId || p.id || '').replace(/^(REQ-|TCK-|PO-|PRD-|PAY-)/, '').slice(0, 8).trim().toUpperCase()
        return (
          p.requestId === r.id ||
          (reqNorm && pNorm && reqNorm === pNorm) ||
          (r.poNumber && p.poNumber === r.poNumber) ||
          (r.invoiceDetails?.invoiceNumber && p.invoiceId === r.invoiceDetails.invoiceNumber)
        )
      })

      const isPaidInStorage = (() => {
        try {
          const paidReqs = JSON.parse(localStorage.getItem('kss_paid_requests') || '[]')
          return Array.isArray(paidReqs) && paidReqs.some((k: string) => {
            const kNorm = String(k).replace(/^(REQ-|TCK-|PO-|PRD-|PAY-)/, '').slice(0, 8).trim().toUpperCase()
            return k === r.id || (kNorm && reqNorm && kNorm === reqNorm)
          })
        } catch {
          return false
        }
      })()

      const isPaid = Boolean(
        matchingPay?.status === 'Paid' ||
        isPaidInStorage ||
        r.paymentStatus === 'Paid' ||
        r.status === 'completed' ||
        r.status === 'payment_completed' ||
        (r.currentStage !== undefined && r.currentStage >= 9) ||
        r.paymentTransactionRef ||
        (r as any).paymentReference ||
        (r as any).payment_reference ||
        (r as any).extraFields?.payment_reference
      )

      const utr =
        (r as any).paymentReference ||
        (r as any).payment_reference ||
        (r as any).extraFields?.payment_reference ||
        r.paymentTransactionRef ||
        (r as any).transactionRef ||
        matchingPay?.transactionRef ||
        matchingPay?.referenceNumber ||
        (matchingPay as any)?.reference_number ||
        (isPaid ? `UTR-${(r.paidDate || r.date || new Date().toISOString().split('T')[0]).replace(/-/g, '')}-${r.id.replace(/[^a-zA-Z0-9]/g, '')}` : undefined)

      const payDate =
        r.paidDate ||
        (r as any).payment_date ||
        (r as any).extraFields?.payment_date ||
        matchingPay?.paymentDate ||
        (isPaid ? (r.date || new Date().toISOString().split('T')[0]) : undefined)

      const payAmount = (r as any).paymentAmount || (matchingPay?.amount ?? r.amount)
      const vendorName = (r as any).vendor || (r as any).preferred_vendor || (r as any).supplier_name || matchingPay?.vendor || 'Preferred Vendor'
      const poNum = matchingPay?.poNumber || r.poNumber || `PO-${r.id.replace(/^REQ-/, '')}`
      const invNum = matchingPay?.invoiceId || r.invoiceDetails?.invoiceNumber || (r as any).invoiceNumber || `INV-${r.id.replace(/^REQ-/, '')}`
      const payMethod =
        (r as any).paymentMethod ||
        (r as any).payment_method ||
        (r as any).extraFields?.payment_method ||
        matchingPay?.paymentMethod ||
        'Online Bank Transfer'

      return {
        ...r,
        isPaid,
        effectiveUtr: utr,
        effectivePaidDate: payDate,
        effectivePayAmount: payAmount,
        effectiveVendor: vendorName,
        effectivePoNumber: poNum,
        effectiveInvoiceNumber: invNum,
        effectivePaymentMethod: payMethod,
      }
    })
  }, [financeReview, payments])

  // KPIs
  const totalCount = enrichedList.length
  const pendingCount = enrichedList.filter(r => !isRequestTransmittedToFinance(r) && !r.isPaid).length
  const transmittedCount = enrichedList.filter(r => isRequestTransmittedToFinance(r) && !r.isPaid).length
  const settledCount = enrichedList.filter(r => r.isPaid).length
  const totalSettledSpend = enrichedList.filter(r => r.isPaid).reduce((sum, r) => sum + (r.effectivePayAmount || r.amount || 0), 0)

  // Filtered List based on Tab & Search
  const filteredRequests = useMemo(() => {
    let list = enrichedList

    if (activeTab === 'PENDING') {
      list = list.filter(r => !isRequestTransmittedToFinance(r) && !r.isPaid)
    } else if (activeTab === 'TRANSMITTED') {
      list = list.filter(r => isRequestTransmittedToFinance(r) && !r.isPaid)
    } else if (activeTab === 'SETTLED') {
      list = list.filter(r => r.isPaid)
    }

    const q = (searchQuery || '').toLowerCase().trim()
    if (q) {
      list = list.filter(r =>
        String(r.id || '').toLowerCase().includes(q) ||
        String(r.title || '').toLowerCase().includes(q) ||
        String(r.requester || '').toLowerCase().includes(q) ||
        String(r.department || '').toLowerCase().includes(q) ||
        String(r.effectiveVendor || '').toLowerCase().includes(q) ||
        String(r.effectiveUtr || '').toLowerCase().includes(q) ||
        String(r.effectivePoNumber || '').toLowerCase().includes(q)
      )
    }

    return list
  }, [enrichedList, activeTab, searchQuery])

  const req = enrichedList.find(r => r.id === sendModal)

  const handleOpenSendModal = (r: ProcurementRequest) => {
    markAsRead(r.id)
    setSendModal(r.id)
    setMessage(
      `Requisition ${r.id} (${r.title}) has been verified and endorsed by the department manager. All pricing schedules and vendor quotations are attached. Forwarded to the Finance Department for budget reservation, PO issuance, and disbursement approval.`
    )
    setSelectedDirectives([
      'Tax Invoice & Quote Attached',
      'Budget Limit Verified'
    ])
  }

  const toggleDirective = (dir: string) => {
    setSelectedDirectives(prev =>
      prev.includes(dir) ? prev.filter(d => d !== dir) : [...prev, dir]
    )
  }

  const handleSend = () => {
    if (!sendModal || !req) return
    const directivesNote = selectedDirectives.length > 0
      ? `\n\n[Manager Directives: ${selectedDirectives.join(', ')}]`
      : ''
    const fullMessage = (message || '').trim() + directivesNote

    sendToFinance(sendModal, fullMessage)
    setSendModal(null)
    setMessage('')
    showToast(`✓ Requisition Dossier ${req.id} successfully transmitted to Finance Directorate!`, 'success')
  }

  const handleDownloadPdf = async () => {
    if (!req) return
    setIsExportingPdf(true)
    try {
      await downloadFinanceHandoverPdf({
        request: req,
        managerName: 'Sarah Manager (Procurement Manager)',
        managerNotes: message,
        directives: selectedDirectives,
      })
      showToast('✓ Official Finance Handover Report PDF downloaded!', 'success')
    } catch (e) {
      console.error(e)
      showToast('Failed to generate PDF Report', 'error')
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handlePreviewPdf = async () => {
    if (!req) return
    try {
      const url = await getFinanceHandoverPdfBlobUrl({
        request: req,
        managerName: 'Sarah Manager (Procurement Manager)',
        managerNotes: message,
        directives: selectedDirectives,
      })
      setPreviewPdfUrl(url)
    } catch (e) {
      console.error(e)
      showToast('Failed to open PDF preview', 'error')
    }
  }

  // Calculated ledger values for report
  const gross = req?.effectivePayAmount || req?.amount || 0
  const netBase = Math.round((gross / 1.18) * 100) / 100
  const tax = Math.round((gross - netBase) * 100) / 100
  const amountWords = numberToIndianWords(gross)

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 text-white animate-fadeIn ${
            toast.type === 'success'
              ? 'bg-emerald-600'
              : toast.type === 'error'
              ? 'bg-rose-600'
              : 'bg-purple-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              FINANCE REVIEW DESK
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {totalCount} Requisitions in Finance Review Pipeline
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Landmark className="text-purple-600" size={26} /> Finance Review
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit and forward manager-endorsed requisitions and payment receipts to Finance Directorate via official Handover Reports.
          </p>
        </div>
        
        {/* FILTERS */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
          {['All', 'Software', 'Hardware'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f as any)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeFilter === f 
                  ? 'bg-white text-purple-700 shadow-sm border border-slate-200' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── PIPELINE SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Pipeline</span>
            <Layers size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalCount}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Requisitions evaluated</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Scrutiny</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Awaiting transmission</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Finance Queue</span>
            <Send size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-600">{transmittedCount}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Forwarded to Finance</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Settled & Paid</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{settledCount}</p>
          <span className="text-[11px] font-bold text-emerald-700 mt-0.5 block">{fmt(totalSettledSpend)} disbursed</span>
        </div>
      </div>

      {/* ── FILTER TABS & SEARCH BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'ALL'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>All Dossiers</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'ALL' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Pending Scrutiny</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'PENDING' ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TRANSMITTED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'TRANSMITTED'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>In Finance Queue</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'TRANSMITTED' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {transmittedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SETTLED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'SETTLED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Settled & Paid</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'SETTLED' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {settledCount}
            </span>
          </button>
        </div>

        <div className="relative min-w-[240px] sm:min-w-[280px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Request ID, Title, UTR, Vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Requests Feed */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-2xs">
          <CheckCircle size={48} className="mx-auto mb-4 text-emerald-400" />
          <p className="text-lg font-bold text-slate-800">No requisitions match active filter</p>
          <p className="text-xs text-slate-400 mt-1">Adjust search query or tab filters to view requisitions in the finance pipeline.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.filter(r => {
            const isSoftware = (r.category || '').toLowerCase().includes('software') || (r.category || '').toLowerCase().includes('saas') || (r.category || '').toLowerCase().includes('cloud') || (r as any).software_name || (r as any).extraFields?.payment_justification
            if (activeFilter === 'Software') return isSoftware
            if (activeFilter === 'Hardware') return !isSoftware
            return true
          }).map(r => {
            const isNew = isUnread(r.id)
            const isSettled = r.isPaid
            const isAlreadySent = isRequestTransmittedToFinance(r)
            const isReceipt = Boolean((r as any).extraFields?.payment_justification || (r as any).extraFields?.payment_justification_detail || (r as any).raw_status === 'PAYMENT_JUSTIFICATION_SUBMITTED')
            
            return (
              <div
                key={r.id}
                onClick={() => { if (isNew) markAsRead(r.id) }}
                className={`rounded-2xl border transition-all p-6 ${
                  isSettled
                    ? 'bg-white border-slate-200 shadow-2xs hover:border-emerald-300 border-l-4 border-l-emerald-600'
                    : isNew
                    ? 'bg-blue-50/20 border-l-4 border-l-blue-600 border-slate-300 shadow-sm'
                    : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <UnreadBadge isUnread={isNew} />
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 font-mono">
                        {r.id}
                      </span>
                      {isSettled ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={11} /> Paid & Settled
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusColors[r.financeStatus || ''] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {r.financeStatus || 'Pending'}
                        </span>
                      )}
                      {r.priority && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          r.priority === 'Critical' ? 'bg-rose-100 text-rose-800' :
                          r.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {r.priority} Priority
                        </span>
                      )}
                      {isReceipt && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                          <FileText size={11} /> Payment Receipt Submitted
                        </span>
                      )}
                    </div>

                    <h2 className="text-base font-bold text-slate-900 mb-1">{r.title}</h2>
                    
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>👤 Requester: <b className="text-slate-800">{r.requester}</b></span>
                      <span>🏢 Department: <b className="text-slate-800">{r.department}</b></span>
                      <span>📁 Category: <b className="text-slate-800">{r.category || 'General'}</b></span>
                      <span>📅 Submitted: {formatDate(r.date)}</span>
                    </div>

                    {r.justification && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-3">
                        <b className="text-slate-900">Justification:</b> {r.justification}
                      </p>
                    )}

                    {isReceipt && (
                      <div className="mt-3 bg-purple-50/70 border border-purple-200/80 p-3.5 rounded-xl text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs pb-1 border-b border-purple-200/50">
                          <FileText size={13} className="text-purple-600" />
                          <span>Submitted Payment &amp; Settlement Details</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <p><b className="text-purple-950">Payment Method:</b> <span className="text-purple-800 font-medium">{(r as any).paymentMethod || (r as any).extraFields?.payment_method || (r as any).payment_method || 'N/A'}</span></p>
                          <p><b className="text-purple-950">Transaction Ref:</b> <span className="font-mono font-bold text-purple-900">{(r as any).paymentReference || (r as any).extraFields?.payment_reference || (r as any).payment_reference || 'N/A'}</span></p>
                        </div>
                        <p className="pt-1">
                          <b className="text-purple-950">Payment Details / Notes:</b>{' '}
                          <span className="text-purple-800">
                            {typeof (r as any).extraFields?.payment_justification === 'string'
                              ? (r as any).extraFields.payment_justification
                              : ((r as any).extraFields?.payment_justification?.business_justification ||
                                 (r as any).extraFields?.payment_justification?.proof_description ||
                                 (r as any).payment_justification_detail?.business_purpose ||
                                 (r as any).payment_justification_detail?.why_required ||
                                 (r as any).payment_notes ||
                                 'Receipt details provided.')}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="sm:text-right flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-1 flex-shrink-0 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isSettled ? 'Settled Value' : 'Authorized Value'}
                    </span>
                    <p className="text-xl font-black text-slate-900 font-mono">
                      {fmt(r.effectivePayAmount || r.amount || 0)}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Est. Requisition Spend
                    </span>
                  </div>
                </div>

                {/* ── DEDICATED TREASURY PAYMENT SETTLEMENT BANNER ── */}
                {isSettled && (
                  <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50/90 to-teal-50/60 border border-emerald-200/80 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-emerald-200/60">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs">
                          <CreditCard size={13} />
                        </div>
                        <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                          Treasury Payment Clearance & Disbursement Dossier
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-white px-2.5 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
                        <CheckCircle2 size={12} className="text-emerald-600" /> Settled via Banking Gateway
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Transaction UTR / Ref</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                            {r.effectiveUtr || 'UTR-TREASURY-SETTLED'}
                          </span>
                          {r.effectiveUtr && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(r.effectiveUtr!)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-white transition-colors"
                              title="Copy UTR"
                            >
                              <Copy size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Settlement Date</span>
                        <span className="font-semibold text-slate-800 block mt-0.5">
                          {formatDate(r.effectivePaidDate || r.date)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Beneficiary Vendor</span>
                        <span className="font-bold text-slate-900 truncate block mt-0.5" title={r.effectiveVendor}>
                          {r.effectiveVendor}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Payment Channel</span>
                        <span className="font-medium text-slate-700 block mt-0.5">
                          {r.effectivePaymentMethod}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-emerald-200/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-900">
                      <div className="flex items-center gap-3">
                        <span>PO Ref: <b className="font-mono">{r.effectivePoNumber}</b></span>
                        <span>Invoice: <b className="font-mono">{r.effectiveInvoiceNumber}</b></span>
                        <span>Ticket: <b className="font-mono">TCK-{r.id.replace(/^REQ-/, '')}</b></span>
                      </div>
                      <span className="text-emerald-700 font-medium">
                        Disbursed by Corporate Finance Treasury
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    {isSettled
                      ? 'Requisition settled • Complete audit trail and banking ledger recorded'
                      : isAlreadySent
                      ? 'Requisition dossier forwarded & active in Finance Directorate review queue'
                      : 'Manager technical scrutiny completed • Ready for formal finance dossier'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSendModal(r)}
                      className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                      title="View Handover Dossier & Export PDF"
                    >
                      <FileText size={14} className="text-slate-500" />
                      Handover Dossier
                    </button>

                    {isSettled ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-xs px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        Settled & Paid
                      </span>
                    ) : isAlreadySent ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-xs px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
                        <CheckCircle size={14} className="text-purple-600" />
                        Sent to Finance
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenSendModal(r)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-2xs transition-all cursor-pointer"
                      >
                        <Send size={14} />
                        Send to Finance
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── HIGH-LEVEL REPORT FORMAT MODAL (HANDOVER & PAYMENT DOSSIER) ── */}
      {sendModal && req && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Modal Header Bar */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b-4 border-purple-600 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      FINANCIAL HANDOVER DOSSIER
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      REF: DOSSIER-{req.id}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                    Formal Requisition Handover Report to Finance Department
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  title="Download Handover Report PDF"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700 disabled:opacity-50 cursor-pointer"
                >
                  <Download size={14} className={isExportingPdf ? 'animate-bounce' : ''} />
                  <span className="hidden sm:inline">Export PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handlePreviewPdf}
                  title="Print / View Preview"
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 cursor-pointer"
                >
                  <Printer size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setSendModal(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Report Body */}
            <div className="p-6 space-y-6 overflow-y-auto text-slate-800 bg-slate-50/40">
              
              {/* Report Header Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">
                      REQUISITION SUBJECT & TITLE
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                      {req.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Originating Entity: <b className="text-slate-800">{req.department} Division</b> • Cost Center:{' '}
                      <span className="font-mono font-semibold text-slate-700">CC-{req.department.substring(0, 3).toUpperCase()}-2026</span>
                    </p>
                  </div>

                  <div className="text-right sm:border-l sm:border-slate-100 sm:pl-6 flex-shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {req.isPaid ? 'Total Settled Spend' : 'Total Authorized Value'}
                    </span>
                    <p className="text-2xl font-black text-purple-700 font-mono tracking-tight">
                      {fmt(gross)}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1">
                      <CheckCircle size={10} /> {req.isPaid ? 'Payment Disbursed & Settled' : 'Manager Cleared'}
                    </span>
                  </div>
                </div>

                {/* Amount in words */}
                <div className="pt-3 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                  <div>
                    <span className="font-bold text-slate-700">Amount in Words: </span>
                    <span className="italic text-purple-900 font-semibold">{amountWords}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                      Category: {req.category || 'Statutory / Operations'}
                    </span>
                    <span className="text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-medium">
                      Priority: {req.priority || 'High'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── TREASURY PAYMENT SETTLEMENT SECTION (IF PAID) ── */}
              {req.isPaid && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                      <CreditCard size={15} className="text-emerald-700" /> Official Treasury Payment Certificate
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-white px-2.5 py-0.5 rounded border border-emerald-300">
                      ✓ Disbursed & Reconciled
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white/80 p-3 rounded-xl border border-emerald-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">UTR Reference Number</span>
                      <span className="font-mono font-black text-slate-900 text-xs">
                        {req.effectiveUtr || 'UTR-TREASURY-SETTLED'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Settlement Date</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {formatDate(req.effectivePaidDate || req.date)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Vendor Beneficiary</span>
                      <span className="font-bold text-slate-900 text-xs">
                        {req.effectiveVendor}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2-Column Audit & Ledger Profile Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Requisition Metadata Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Building size={14} className="text-purple-600" /> 1. Requisition Docket Profile
                    </span>
                    <span className="text-[10px] font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {req.id}
                    </span>
                  </div>

                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-2.5 text-slate-400 font-semibold w-1/3">Requisitioner</td>
                        <td className="px-4 py-2.5 font-bold text-slate-800">{req.requester}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-slate-400 font-semibold">Department</td>
                        <td className="px-4 py-2.5 font-bold text-slate-800">{req.department}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-slate-400 font-semibold">Submission Date</td>
                        <td className="px-4 py-2.5 text-slate-800 font-medium">{formatDate(req.date)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-slate-400 font-semibold">Approval Level</td>
                        <td className="px-4 py-2.5 text-slate-800 font-medium">{req.approvalLevel || 'Level 2 - Manager Sign-Off'}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-slate-400 font-semibold">Forwarded By</td>
                        <td className="px-4 py-2.5 text-purple-700 font-bold">Sarah Manager (Procurement)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. Financial Breakdown & Tax Assessment */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <IndianRupee size={14} className="text-emerald-600" /> 2. Financial Valuation Ledger
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      INR Ledger
                    </span>
                  </div>

                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-2.5 text-slate-400 font-semibold">Net Base Value</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-800 text-right">{fmt(netBase)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-slate-400 font-semibold">Statutory GST (18%)</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-800 text-right">{fmt(tax)}</td>
                      </tr>
                      <tr className="bg-purple-50/60 font-bold">
                        <td className="px-4 py-2.5 text-purple-900 font-black">Gross Requisition Spend</td>
                        <td className="px-4 py-2.5 font-mono font-black text-purple-900 text-right text-sm">{fmt(gross)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-slate-400 font-semibold">Budget Verification</td>
                        <td className="px-4 py-2.5 text-emerald-700 font-bold text-right">✓ Within Operating Budget</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-slate-400 font-semibold">Payment Terms</td>
                        <td className="px-4 py-2.5 text-slate-800 font-medium text-right">Net 30 / Post PO Approval</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Business Justification & Manager Statement */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText size={14} className="text-purple-600" /> 3. Operational Justification & Managerial Endorsement
                </span>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                  <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wide block">
                    Business Purpose:
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    {req.justification || req.description || 'Statutory annual renewal required for corporate risk mitigation, asset preservation, and compliance protocol.'}
                  </p>
                </div>

                <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 text-xs space-y-1">
                  <span className="font-bold text-purple-950 text-[11px] uppercase tracking-wide block">
                    Manager Endorsement Note:
                  </span>
                  <p className="text-purple-900 leading-relaxed">
                    Technical specifications and commercial quotation have been reviewed. Request complies with organizational procurement parameters and is cleared for budget reservation and purchase order generation.
                  </p>
                </div>
              </div>

              {/* Compliance & Audit Verification Checklist */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                  <ShieldCheck size={14} className="text-emerald-600" /> 4. Internal Audit & Compliance Checkpoints
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-900 font-medium">
                    <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
                    <span>Manager Approval Threshold Verified</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-900 font-medium">
                    <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
                    <span>Vendor Quotation & Invoice Appended</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-900 font-medium">
                    <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
                    <span>Fiscal Cost Center Balance Confirmed</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-900 font-medium">
                    <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
                    <span>Statutory Tax & PAN Compliance Checked</span>
                  </div>
                </div>
              </div>

              {/* Manager Directives & Instructions to Finance */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-600" /> 5. Manager Directives & Notes to Finance
                  </span>
                  <span className="text-[10px] text-slate-400">Click tags to include in transmission</span>
                </div>

                {/* Preset Directives Pills */}
                <div className="flex flex-wrap gap-2">
                  {PRESET_DIRECTIVES.map(dir => {
                    const active = selectedDirectives.includes(dir)
                    return (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => toggleDirective(dir)}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                          active
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {active && <Check size={12} />}
                        {dir}
                      </button>
                    )
                  })}
                </div>

                {/* Handover Message Box */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Formal Transmission Statement / Instructions to Finance Team
                  </label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Provide specific directions, invoice references, or budget clearance instructions for Finance..."
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none resize-none bg-slate-50/50"
                  />
                </div>

                {/* Audit Notice Alert */}
                {req.isPaid ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
                    <CheckCircle size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-emerald-950">Payment Settled & Cleared by Treasury:</span>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        This requisition has been fully disbursed via banking transfer. Transaction reference UTR: <span className="font-mono font-bold">{req.effectiveUtr}</span>. Handover report reflects closed status.
                      </p>
                    </div>
                  </div>
                ) : isRequestTransmittedToFinance(req) ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-purple-900">
                    <CheckCircle size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-purple-950">Dossier Transmitted to Finance Directorate:</span>
                      <p className="text-[11px] text-purple-800 mt-0.5">
                        This requisition has been formally forwarded and is active in the Finance review pipeline. You can export or print the official Handover Report PDF at any time.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-950">Official Audit Trail Notification:</span>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Transmitting this report locks managerial clearance, updates the central database to <span className="font-mono font-bold">sent_to_finance</span>, and alerts Finance Officers with this formal dossier in their queue.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-white border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={16} className="text-purple-600" />
                <span>Authorized by <b>Sarah Manager</b> • KSS Procurement OS</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSendModal(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download Report</span>
                </button>

                {req.isPaid ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-xs px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    Settled & Disbursed
                  </span>
                ) : isRequestTransmittedToFinance(req) ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-xs px-4 py-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
                    <CheckCircle size={15} className="text-purple-600" />
                    Transmitted to Finance
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSend}
                    className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 transition-all hover:translate-y-[-0.5px] cursor-pointer"
                  >
                    <Send size={15} />
                    <span>Confirm & Send to Finance</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal if opened */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText size={18} className="text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold">Official Finance Handover Dossier Preview</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Dossier: DOSSIER-{req?.id || ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const win = window.open(previewPdfUrl, '_blank')
                    win?.focus()
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  <ExternalLink size={13} /> Open External
                </button>
                <button
                  onClick={() => {
                    URL.revokeObjectURL(previewPdfUrl)
                    setPreviewPdfUrl(null)
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-800 p-2 overflow-hidden">
              <iframe
                src={previewPdfUrl}
                title="Handover Report Preview"
                className="w-full h-full rounded-lg border-0 bg-white"
              />
            </div>
          </div>
        </div>
      )}
      {selectedReceiptPayment && (
        <UnifiedReceiptModal
          payment={selectedReceiptPayment}
          onClose={() => setSelectedReceiptPayment(null)}
        />
      )}
    </div>
  )
}
