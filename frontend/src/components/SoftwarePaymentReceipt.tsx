import React, { useState } from 'react'
import {
  CheckCircle2, FileText, CreditCard, Download, Eye,
  Calendar, Users, Package, Building2, Hash, Receipt,
  ExternalLink, Printer, X, Loader2, Monitor
} from 'lucide-react'
import { ProcurementRequest } from '../context/ManagerDataContext'
import { downloadSoftwareReceiptPdf, getSoftwareReceiptBlobUrl, SoftwareReceiptOptions } from '../utils/softwareReceiptPdfGenerator'

// --- Props --------------------------------------------------------------------

interface SoftwarePaymentReceiptProps {
  request: ProcurementRequest
  receiptNo?: string
  paymentId?: string
  paymentDate?: string
  paymentMethod?: string
  transactionRef?: string
  approvedAmount?: number
  actualPaidAmount?: number
  taxAmount?: number
  discountAmount?: number
  actorName?: string
  entityName?: string
  onClose?: () => void
}

// --- Helpers ------------------------------------------------------------------

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)

// --- Component ----------------------------------------------------------------

export const SoftwarePaymentReceipt: React.FC<SoftwarePaymentReceiptProps> = ({
  request: req,
  receiptNo,
  paymentId,
  paymentDate,
  paymentMethod,
  transactionRef,
  approvedAmount,
  actualPaidAmount,
  taxAmount,
  discountAmount,
  actorName = 'Finance Officer',
  entityName = 'KSS ENTERPRISES GLOBAL INC.',
  onClose,
}) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Extra fields & Justification
  const ef           = req.extraFields ?? (req as any).extra_fields ?? {}
  const pj           = (req as any).payment_justification_detail ?? (req as any).payment_justification ?? ef.payment_justification ?? {}

  // Computed values
  const requestedAmt = (req as any).requested_amount ?? pj.requested_amount ?? ef.requested_amount ?? (req as any).total_estimated_cost ?? req.amount ?? 0
  const approvedAmt  = approvedAmount ?? (req.finance_approved_amount ?? req.approved_amount ?? pj.finance_approved_amount ?? pj.manager_approved_amount ?? requestedAmt)
  const taxAmt       = taxAmount ?? (pj.gst_tax ?? req.invoiceDetails?.taxAmount ?? Math.round(approvedAmt * 0.18))
  const discountAmt  = discountAmount ?? (pj.discount ?? 0)
  const finalPaid    = actualPaidAmount ?? (pj.final_payable_amount ?? pj.actual_purchase_amount ?? approvedAmt)

  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const receiptNum   = receiptNo  ?? `RCP-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')}`
  const paymentIdStr = paymentId  ?? `PAY-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')}`
  const txnRef       = transactionRef ?? req.payment_reference ?? `TXN-${Math.floor(100000000 + Math.random() * 899999999)}`
  const paidDate     = paymentDate ?? req.payment_date ?? req.paidDate ?? todayStr
  const method       = paymentMethod ?? req.payment_method ?? 'Corporate Card'

  const softwareName     = pj.software_name ?? req.software_name ?? ef.software_name ?? req.title
  const vendor           = pj.vendor_name ?? req.vendor ?? ef.vendor_name ?? ef.vendor ?? 'N/A'

  const rawPt = pj.purchase_type ?? ef.purchase_type ?? ef.purchaseType ?? ef.request_type ?? req.request_type ?? (req as any).request_operation ?? ''
  const normalizePt = (v: string): string => {
    const s = (v || '').trim().toUpperCase()
    if (s === 'RENEWAL' || s.includes('RENEW')) return 'Renewal'
    if (s === 'UPGRADE' || s.includes('UPGRADE')) return 'Upgrade'
    if (s === 'NEW' || s.includes('NEW')) return 'New Purchase'
    return v || 'N/A'
  }
  const purchaseType     = normalizePt(rawPt)

  const startDate        = pj.start_date ?? ef.start_date ?? ef.subscription_start ?? '—'
  const endDate          = pj.end_date   ?? ef.end_date   ?? ef.subscription_end   ?? '—'

  const resolveSubscriptionType = (): string => {
    const rawSub = pj.subscription_type ?? ef.subscription_type ?? ef.subscription ?? (req as any).subscription_type
    if (rawSub) {
      const s = String(rawSub).trim().toLowerCase()
      if (s.includes('one')) return 'One-Time'
      if (s.includes('annual') || s.includes('year')) return 'Annual'
      if (s.includes('month')) return 'Monthly'
      return rawSub
    }
    const rc = ef.renewalCycle || (req as any).renewalCycle
    if (rc) {
      const s = String(rc).trim().toLowerCase()
      if (s.includes('one')) return 'One-Time'
      if (s.includes('annual') || s.includes('year')) return 'Annual'
      if (s.includes('month')) return 'Monthly'
    }
    if (startDate !== '—' && endDate !== '—') {
      try {
        const d1 = new Date(startDate)
        const d2 = new Date(endDate)
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays > 0 && diffDays <= 45) return 'Monthly'
        if (diffDays >= 300) return 'Annual'
      } catch {}
    }
    return 'Annual'
  }
  const subscriptionType = resolveSubscriptionType()
  const planEdition      = pj.plan_edition ?? req.required_plan ?? ef.plan_edition ?? ef.plan ?? ef.requiredPlan ?? 'NA'
  const userLicenses     = pj.users_licenses ?? ef.no_of_users ?? ef.num_users ?? ef.licenses ?? req.quantity ?? '1'
  const invoiceNumber    = pj.po_number ?? req.invoiceDetails?.invoiceNumber ?? ef.invoice_number ?? 'N/A'
  const quoteNumber      = pj.quote_number ?? ef.quote_number ?? ef.rfq_number ?? 'N/A'
  const invoiceDoc       = req.documents?.find((d: { type: string; url?: string; name: string; size?: string }) => d.type === 'invoice')
  const quoteDoc         = req.documents?.find((d: { type: string; url?: string; name: string; size?: string }) => d.type === 'quote')

  const pdfOptions: SoftwareReceiptOptions = {
    request: req, receiptNo: receiptNum, paymentId: paymentIdStr,
    paymentDate: paidDate, paymentMethod: method, transactionRef: txnRef,
    approvedAmount: approvedAmt, actualPaidAmount: finalPaid,
    taxAmount: taxAmt, discountAmount: discountAmt,
    actorName, entityName,
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try { await downloadSoftwareReceiptPdf(pdfOptions) }
    catch (e) { console.error(e) }
    finally { setIsDownloading(false) }
  }

  const handlePreview = async () => {
    setIsPreviewing(true)
    try {
      const url = await getSoftwareReceiptBlobUrl(pdfOptions)
      setPreviewUrl(url)
    } catch (e) { console.error(e) }
    finally { setIsPreviewing(false) }
  }

  // -- JSX ----------------------------------------------------------------------
  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6">
      {/* PDF Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-600" />
                <span className="font-bold text-slate-800 text-sm">Software / SaaS Payment Receipt — {receiptNum}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleDownload} disabled={isDownloading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors">
                  <Download className="w-3.5 h-3.5" />Download
                </button>
                <button onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <iframe src={previewUrl} className="flex-1 w-full" title="Software Payment Receipt PDF" />
          </div>
        </div>
      )}

      {/* Main Receipt Card */}
      <div className="max-w-3xl mx-auto">

        {/* -- HEADER -- */}
        <div className="relative bg-slate-900 rounded-t-2xl overflow-hidden">
          <div className="px-7 pt-6 pb-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-1">{entityName}</p>
                <h1 className="text-white text-2xl font-black tracking-tight leading-tight">PAYMENT RECEIPT</h1>
                <p className="text-indigo-300 text-sm font-semibold mt-0.5">SOFTWARE / SaaS</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-black shadow-lg">
                  <CheckCircle2 className="w-4 h-4" />
                  PAID
                </span>
                {onClose && (
                  <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Indigo accent stripe */}
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
        </div>

        {/* -- META PILLS -- */}
        <div className="bg-white border-x border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-200 border-b border-slate-200">
            {[
              { label: 'Receipt No.',  value: receiptNum,   icon: Receipt },
              { label: 'Request ID',   value: req.id,       icon: Hash },
              { label: 'Payment ID',   value: paymentIdStr, icon: CreditCard },
              { label: 'Payment Date', value: paidDate,     icon: Calendar },
            ].map((pill) => (
              <div key={pill.label} className="px-4 py-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <pill.icon className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{pill.label}</span>
                </div>
                <p className="text-slate-900 text-xs font-bold truncate">{pill.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* -- SOFTWARE / SaaS DETAILS -- */}
        <div className="bg-white border-x border-b border-slate-200">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-teal-600">
            <Monitor className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-black tracking-widest uppercase">Software / SaaS Details</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-slate-100 border-t border-slate-100">
            {[
              { label: 'Software Name',    value: softwareName },
              { label: 'Vendor',           value: vendor },
              { label: 'Purchase Type',    value: purchaseType },
              { label: 'Subscription',     value: subscriptionType },
              { label: 'Plan / Edition',   value: planEdition },
              { label: 'Users / Licenses', value: String(userLicenses) },
              { label: 'Start Date',       value: startDate },
              { label: 'End Date',         value: endDate },
            ].map((item) => (
              <div key={item.label} className="px-4 py-3">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">{item.label}</p>
                <p className="text-slate-900 text-sm font-bold truncate" title={item.value}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* -- FINANCIAL DETAILS -- */}
        <div className="bg-white border-x border-b border-slate-200">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-teal-600">
            <CreditCard className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-black tracking-widest uppercase">Financial Details</span>
          </div>
          <div className="p-4 grid grid-cols-3 gap-3">
            {/* Row 1 */}
            <div className="rounded-xl p-3.5 bg-slate-50 border border-slate-200">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Requested Amount</p>
              <p className="text-slate-700 text-base font-bold">{fmt(requestedAmt)}</p>
            </div>
            <div className="rounded-xl p-3.5 bg-blue-50 border border-blue-200">
              <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider mb-1">Approved Amount</p>
              <p className="text-blue-700 text-base font-bold">{fmt(approvedAmt)}</p>
            </div>
            <div className="rounded-xl p-3.5 bg-emerald-50 border border-emerald-200">
              <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider mb-1">Actual Paid</p>
              <p className="text-emerald-700 text-base font-bold">{fmt(finalPaid)}</p>
            </div>
            {/* Row 2 */}
            <div className="rounded-xl p-3.5 bg-amber-50 border border-amber-200">
              <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider mb-1">GST / Tax</p>
              <p className="text-amber-700 text-base font-bold">{fmt(taxAmt)}</p>
            </div>
            <div className="rounded-xl p-3.5 bg-slate-50 border border-slate-200">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Discount</p>
              <p className="text-slate-700 text-base font-bold">{discountAmt > 0 ? `(${fmt(discountAmt)})` : '—'}</p>
            </div>
            <div className="rounded-xl p-4 bg-emerald-50 border-2 border-emerald-400 shadow-sm">
              <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wider mb-1">Final Paid Amount</p>
              <p className="text-emerald-700 text-xl font-black">{fmt(finalPaid)}</p>
            </div>
          </div>
        </div>

        {/* -- PAYMENT DETAILS -- */}
        <div className="bg-white border-x border-b border-slate-200">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-teal-600">
            <CreditCard className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-black tracking-widest uppercase">Payment Details</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 border-t border-slate-100">
            <div className="px-4 py-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Payment Method</p>
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                <p className="text-slate-900 text-sm font-bold">{method}</p>
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Payment Date</p>
              <p className="text-slate-900 text-sm font-bold">{paidDate}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Transaction Ref.</p>
              <p className="text-slate-900 text-xs font-bold truncate font-mono" title={txnRef}>{txnRef}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Payment Status</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Successful
              </span>
            </div>
          </div>
        </div>

        {/* -- VENDOR / INVOICE DETAILS -- */}
        <div className="bg-white border-x border-b border-slate-200 rounded-b-none">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-teal-600">
            <Building2 className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-black tracking-widest uppercase">Vendor / Invoice Details</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
            <div className="px-4 py-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Vendor</p>
              <p className="text-slate-900 text-sm font-bold">{vendor}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Invoice Number</p>
              <p className="text-slate-900 text-sm font-bold font-mono">{invoiceNumber}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Quote Number</p>
              <p className="text-slate-900 text-sm font-bold font-mono">{quoteNumber}</p>
            </div>
          </div>
          {/* Document action buttons */}
          <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-2">
            <a
              href={invoiceDoc?.url ?? '#'}
              target={invoiceDoc?.url ? '_blank' : undefined}
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">
              <FileText className="w-3.5 h-3.5" />
              View Invoice
              {invoiceDoc?.url && <ExternalLink className="w-3 h-3 opacity-60" />}
            </a>
            <a
              href={quoteDoc?.url ?? '#'}
              target={quoteDoc?.url ? '_blank' : undefined}
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">
              <FileText className="w-3.5 h-3.5" />
              View Quote
              {quoteDoc?.url && <ExternalLink className="w-3 h-3 opacity-60" />}
            </a>
            <button className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">
              <Package className="w-3.5 h-3.5" />
              View Supporting Documents
            </button>
          </div>
        </div>

        {/* -- SUCCESS BANNER -- */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-center border-x border-slate-200">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-white" />
            <p className="text-white font-black text-base tracking-wide">PAYMENT COMPLETED SUCCESSFULLY</p>
          </div>
          <p className="text-emerald-100 text-xs">
            This receipt is generated from the approved payment transaction associated with Request {req.id}.
          </p>
        </div>

        {/* -- ACTION BUTTONS -- */}
        <div className="bg-white border border-slate-200 rounded-b-2xl px-5 py-4 flex flex-wrap gap-3 justify-between items-center">
          <p className="text-slate-400 text-xs">
            Receipt issued by <span className="font-semibold text-slate-600">{actorName}</span> · {todayStr}
          </p>
          <div className="flex gap-2">
            <button
              id="software-receipt-preview-btn"
              onClick={handlePreview}
              disabled={isPreviewing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors disabled:opacity-60">
              {isPreviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
              Preview PDF
            </button>
            <button
              id="software-receipt-download-btn"
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors disabled:opacity-60 shadow-sm">
              {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default SoftwarePaymentReceipt
