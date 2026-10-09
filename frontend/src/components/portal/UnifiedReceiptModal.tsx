import React, { useState, useEffect } from 'react'
import {
  X, Printer, FileText, CheckCircle2, DollarSign, Building2,
  Download, RefreshCw, Monitor, CreditCard, ChevronRight, Receipt
} from 'lucide-react'
import { PaymentRecord } from '../../context/ProcurementContext'
import { downloadSoftwareReceiptPdf } from '../../utils/softwareReceiptPdfGenerator'
import { apiClient } from '../../api/client'
import { isSoftwareRequest } from '../../utils/workflowUtils'
import { ModalPortal } from './ModalPortal'

interface UnifiedReceiptModalProps {
  payment: PaymentRecord
  onClose: () => void
  onDownload?: () => void
}

export const UnifiedReceiptModal: React.FC<UnifiedReceiptModalProps> = ({ payment, onClose, onDownload }) => {
  const [isExporting, setIsExporting] = useState(false)
  const [livePr, setLivePr] = useState<any | null>(null)

  const pr = payment.purchaseRequestDetail || (payment as any).purchase_request_detail || (payment as any).rawRequest || (payment as any).requestDetail || payment || {}
  const rawReqId = payment.requestId || pr.request_id || (pr as any).id || ''
  const cleanReqId = String(rawReqId).replace(/^REP-/, '')

  useEffect(() => {
    if (!cleanReqId || cleanReqId === 'Not available') return
    let isMounted = true
    apiClient.get(`/requests/${cleanReqId}/`)
      .then(res => {
        if (isMounted && res.data) {
          setLivePr(res.data)
        }
      })
      .catch(() => {
        // Fallback to local passed-in data
      })
    return () => { isMounted = false }
  }, [cleanReqId])

  const effectivePr = livePr || pr
  const extra = effectivePr.extra_fields || effectivePr.extraFields || pr.extra_fields || pr.extraFields || (payment as any).extra_fields || (payment as any).extraFields || {}
  const pj = effectivePr.payment_justification_detail || effectivePr.payment_justification || pr.payment_justification_detail || pr.payment_justification || (payment as any).payment_justification_detail || (payment as any).payment_justification || extra.payment_justification || {}
  const re = effectivePr.research_estimation || pr.research_estimation || {}

  const isSw = isSoftwareRequest(effectivePr) ||
    (effectivePr.category || '').toLowerCase().includes('software') ||
    (effectivePr.category || '').toLowerCase().includes('saas') ||
    Boolean(effectivePr.software_name) ||
    effectivePr.flow_type === 'B' ||
    effectivePr.flowType === 'B'

  const classification = isSw ? 'Software / SaaS' : 'Hardware / Procurement'
  const productOrSoftwareLabel = isSw ? 'Software / SaaS Name' : 'Product / Hardware Name'

  /* ── Currency Formatter ──────────────────────────────────── */
  const formatINR = (val: number | string | undefined | null) => {
    if (val === undefined || val === null || val === '') return 'Not available'
    const num = typeof val === 'string' ? parseFloat(val) : val
    if (isNaN(num)) return 'Not available'
    return `₹${num.toLocaleString('en-IN')}`
  }

  /* ── Date Formatter ──────────────────────────────────────── */
  const formatDate = (raw: string | undefined | null): string => {
    if (!raw || raw === 'Not available' || raw === 'None' || raw === 'null' || raw === '—') return 'Not available'
    try {
      const d = new Date(raw)
      if (isNaN(d.getTime())) return raw
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch { return raw }
  }

  /* ── 1. RECEIPT INFORMATION ──────────────────────────────── */
  const requestId     = cleanReqId || 'Not available'
  const receiptNumber = (
    extra.software_receipt_id ||
    extra.receipt_no ||
    (payment.receiptDetails?.fileName?.startsWith('RCP-') ? payment.receiptDetails.fileName : null) ||
    (payment.id?.startsWith('RCP-') ? payment.id : null) ||
    (requestId !== 'Not available' ? `RCP-SW-${requestId}` : 'Not available')
  )
  const paymentId     = (
    extra.payment_id ||
    (payment.id?.startsWith('PAY-') ? payment.id : null) ||
    payment.payment_id ||
    (payment.purchaseRequestDetail?.payment_id) ||
    pj.payment_reference ||
    extra.software_receipt_id ||
    'Not available'
  )
  const transactionRef = (
    extra.payment_reference ||
    payment.reference_number ||
    (payment as any).paymentReference ||
    pj.payment_reference ||
    (payment.id?.startsWith('TXN-') ? payment.id : null) ||
    paymentId ||
    'Not available'
  )
  const paymentDateRaw = (
    extra.receipt_generated_at ||
    extra.payment_date ||
    pj.payment_date ||
    payment.dueDate ||
    payment.payment_date ||
    (effectivePr as any).payment_date ||
    'Not available'
  )
  const paymentDate   = formatDate(paymentDateRaw)
  const paymentStatus = payment.status || effectivePr.payment_status || pj.payment_status || 'Paid'

  /* ── 2. SOFTWARE / SaaS DETAILS ──────────────────────────── */
  const softwareName    = pj.software_name || effectivePr.software_name || effectivePr.title || payment.receiptDetails?.itemName || (payment as any).title || 'Not available'
  const vendorName      = pj.vendor_name || effectivePr.vendor || effectivePr.preferred_vendor || payment.vendor || payment.vendor_name || 'Not available'

  // Exact Purchase Type entered/selected by Team Lead in Justification / Request
  const rawPt = (
    pj.purchase_type ||
    extra.payment_justification?.purchase_type ||
    extra.purchase_type ||
    extra.purchaseType ||
    effectivePr.request_operation ||
    effectivePr.request_type ||
    effectivePr.requestType ||
    pr.request_operation ||
    pr.request_type ||
    ''
  )
  const normalizePurchaseType = (val: string | undefined | null): string => {
    if (!val || val === 'Not available') return 'Not available'
    const s = String(val).trim().toUpperCase()
    if (s === 'RENEWAL' || s.includes('RENEW')) return 'Renewal'
    if (s === 'UPGRADE' || s.includes('UPGRADE')) return 'Upgrade'
    if (s === 'NEW' || s.includes('NEW')) return 'New Purchase'
    return String(val).trim()
  }
  const purchaseType = normalizePurchaseType(rawPt)

  // Real Subscription Start & End Dates entered by Team Lead in Justification / Request
  const rawStartDate    = pj.start_date || extra.payment_justification?.start_date || extra.start_date || extra.subscription_start || paymentDateRaw
  const rawEndDate      = pj.end_date || extra.payment_justification?.end_date || extra.end_date || extra.subscription_end || (effectivePr as any).end_date
  const startDate       = formatDate(rawStartDate)
  const endDate         = formatDate(rawEndDate)

  // Subscription Type (e.g. Annual, Monthly, One-Time) - accurately calculated from real request information & duration
  const resolveSubscriptionType = (): string => {
    // 1. Justification DB record / extra fields
    const rawVal = (
      pj.subscription_type ||
      extra.payment_justification?.subscription_type ||
      extra.subscription_type ||
      extra.subscription ||
      (effectivePr as any).subscription_type
    )
    if (rawVal && rawVal !== 'Not available') {
      const s = String(rawVal).trim().toLowerCase()
      if (s.includes('one') || s.includes('once')) return 'One-Time'
      if (s.includes('annual') || s.includes('year') || s.includes('1 year')) return 'Annual'
      if (s.includes('month')) return 'Monthly'
      return String(rawVal).trim()
    }
    // 2. Renewal cycle selected in Create Request
    const rc = extra.renewalCycle || extra.renewal_cycle || (effectivePr as any).renewalCycle || (pr as any).renewalCycle
    if (rc) {
      const s = String(rc).trim().toLowerCase()
      if (s.includes('one') || s.includes('once')) return 'One-Time'
      if (s.includes('annual') || s.includes('year') || s.includes('1 year')) return 'Annual'
      if (s.includes('month')) return 'Monthly'
    }
    // 3. Fallback: If start and end dates exist, calculate duration
    if (rawStartDate && rawEndDate) {
      try {
        const d1 = new Date(rawStartDate)
        const d2 = new Date(rawEndDate)
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays > 0 && diffDays <= 45) return 'Monthly'
        if (diffDays >= 300) return 'Annual'
      } catch {}
    }
    return 'Annual'
  }
  const subscriptionType = resolveSubscriptionType()

  const planEdition     = pj.plan_edition || extra.payment_justification?.subscription_plan || effectivePr.required_plan || effectivePr.current_plan || extra.plan_edition || extra.requiredPlan || extra.currentPlan || 'NA'
  const usersLicenses   = pj.users_licenses || extra.users_licenses || effectivePr.quantity || pr.quantity || '1'

  /* ── 3. FINANCIAL DETAILS (Strictly Distinguished) ───────── */
  // 1. Requested Amount: amount entered when Team Lead created request
  const requestedAmount = (
    effectivePr.requested_amount ??
    pj.requested_amount ??
    extra.requested_amount ??
    (effectivePr as any).estimatedCost ??
    effectivePr.total_estimated_cost ??
    pr.requested_amount ??
    pr.total_estimated_cost ??
    null
  )

  // 2. Approved Amount: amount approved through workflow
  const approvedAmount = (
    effectivePr.approved_amount ??
    effectivePr.finance_approved_amount ??
    pj.finance_approved_amount ??
    pj.manager_approved_amount ??
    extra.approved_amount ??
    pr.approved_amount ??
    pr.finance_approved_amount ??
    null
  )

  // 3. Actual Payment Amount: amount actually paid
  const actualPaymentAmount = (
    pj.actual_purchase_amount ??
    extra.actual_purchase_amount ??
    (payment.receiptDetails?.actualAmount) ??
    payment.amount ??
    approvedAmount ??
    null
  )

  // 4. Final Paid Amount: final payment amount
  const finalPaidAmount = (
    pj.final_payable_amount ??
    extra.final_payable_amount ??
    payment.amount ??
    effectivePr.finance_approved_amount ??
    actualPaymentAmount ??
    null
  )

  const gstTax             = pj.gst_tax ?? extra.gst_tax ?? re.tax_gst ?? re.tax_amount ?? null
  const discount           = pj.discount ?? extra.discount ?? re.discount ?? re.discount_amount ?? null

  /* ── 4. PAYMENT DETAILS ──────────────────────────────────── */
  const paymentMethod = payment.payment_method || payment.paymentMethod || pj.payment_method || effectivePr.payment_method || 'Not available'

  /* ── 5. VENDOR / INVOICE DETAILS ─────────────────────────── */
  const invoiceNumber  = pj.po_number || extra.invoice_number || extra.po_ref || effectivePr.payment_reference || 'Not available'
  const quoteNumber    = pj.quote_number || extra.quote_number || re.vendor_quotation_ref || 'Not available'
  const invoiceDoc       = effectivePr.documents?.find?.((d: any) => d.type === 'invoice')
  const quoteDoc         = effectivePr.documents?.find?.((d: any) => d.type === 'quote')
  const supportingDoc    = effectivePr.documents?.find?.((d: any) => d.type !== 'invoice' && d.type !== 'quote')

  const invoiceUrl     = pj.invoice_file_url || invoiceDoc?.url || effectivePr.attachments || extra.invoice_url
  const quoteUrl       = pj.quote_file_url || quoteDoc?.url || re.supporting_document || extra.quote_url
  const supportingDocUrl = pj.supporting_doc_url || supportingDoc?.url || effectivePr.attachments || extra.supporting_doc_url

  /* ── Requester ───────────────────────────────────────────── */
  const requesterObj  = effectivePr.created_by_detail || pr.created_by_detail
  const requesterName = requesterObj?.first_name ? `${requesterObj.first_name} ${requesterObj.last_name || ''}`.trim() : (effectivePr.created_by ? String(effectivePr.created_by) : 'Not available')

  /* ── PDF Download Handler ────────────────────────────────── */
  const handleDownloadPdf = async () => {
    if (onDownload) { onDownload(); return }
    try {
      setIsExporting(true)
      const reqObj = payment.purchaseRequestDetail || (payment as any).purchase_request_detail || (payment as any)
      await downloadSoftwareReceiptPdf({
        request: {
          ...reqObj,
          id: requestId,
          title: softwareName,
          software_name: softwareName,
          vendor: vendorName,
          requested_amount: Number(requestedAmount) || 0,
          approved_amount: Number(approvedAmount) || 0,
          request_type: purchaseType,
          payment_justification_detail: pj,
          extraFields: {
            ...extra,
            purchase_type: purchaseType,
            subscription_type: subscriptionType,
            start_date: rawStartDate,
            end_date: rawEndDate,
            requested_amount: requestedAmount,
            plan_edition: planEdition,
            no_of_users: usersLicenses,
            payment_justification: pj
          }
        } as any,
        receiptNo: receiptNumber,
        paymentId: paymentId,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        transactionRef: transactionRef,
        approvedAmount: Number(approvedAmount) || 0,
        actualPaidAmount: Number(finalPaidAmount) || 0,
        taxAmount: Number(gstTax) || 0,
        discountAmount: Number(discount) || 0,
        actorName: requesterName
      })
    } catch (err) {
      console.warn('Fallback to window.print()', err)
      window.print()
    } finally {
      setIsExporting(false)
    }
  }

  /* ── Paid badge helper ───────────────────────────────────── */
  const isPaid = ['Paid', 'PAID', 'SUCCESS', 'MOCK_SUCCESS', 'Successful', 'Verified'].includes(paymentStatus)

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-hidden animate-fadeIn">
        <div
          className="bg-[#f0f4f8] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[94vh] max-h-[94vh] my-auto"
          style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
        >

        {/* ════════════════════ TOP BAR ════════════════════ */}
        <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Receipt size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Payment Receipt</h2>
              <p className="text-xs text-slate-400 font-medium">{classification}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Printer size={14} /> Print
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              {isExporting ? 'Generating...' : 'Download PDF'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ════════════════════ SCROLLABLE BODY ════════════════════ */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* ──── STATUS BANNER ──── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              {/* Left: Status */}
              <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-50 to-emerald-50 sm:w-[44%]">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={22} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Payment Completed</p>
                  <p className="text-xl font-extrabold text-emerald-800 leading-tight">
                    {isPaid ? 'PAID' : paymentStatus.toUpperCase()}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    This receipt is generated from the approved payment transaction associated with the above Request ID.
                  </p>
                </div>
              </div>

              {/* Right: Meta pills */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 flex-1 border-t sm:border-t-0 sm:border-l border-slate-200/70">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Receipt Number</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{receiptNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Request ID</p>
                  <p className="text-sm font-bold text-blue-700 mt-0.5">{requestId}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Payment ID</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{paymentId}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Payment Date</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{paymentDate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ──── SOFTWARE / SaaS DETAILS ──── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <Monitor size={16} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">{isSw ? "Software / SaaS Details" : "Hardware / Procurement Details"}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 px-5 py-5">
              <FieldItem label={productOrSoftwareLabel} value={softwareName} bold />
              <FieldItem label={isSw ? "Plan / Edition" : "Model / Specs"} value={planEdition} bold />
              <FieldItem label="Vendor" value={vendorName} bold />
              <FieldItem label={isSw ? "Users / Licenses" : "Quantity / Units"} value={String(usersLicenses)} bold />
              <FieldItem label="Purchase Type" value={purchaseType} badge badgeColor="blue" />
              <FieldItem label={isSw ? "Subscription Start Date" : "Delivery / Start Date"} value={startDate} bold />
              <FieldItem label={isSw ? "Subscription" : "Warranty / Terms"} value={subscriptionType} badge badgeColor="blue" />
              <FieldItem label={isSw ? "Subscription End Date" : "Warranty End Date"} value={endDate} bold />
            </div>
          </div>

          {/* ──── FINANCIAL + PAYMENT DETAILS (side-by-side) ──── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Financial Details */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                <DollarSign size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Financial Details</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <FinanceRow label="Requested Amount" value={formatINR(requestedAmount)} />
                <FinanceRow label="Approved Amount" value={formatINR(approvedAmount)} />
                <FinanceRow label="Actual Payment Amount" value={formatINR(actualPaymentAmount)} />
                <FinanceRow label="GST / Tax" value={formatINR(gstTax)} />
                <FinanceRow label="Discount" value={discount !== null && discount !== undefined ? `-${formatINR(discount)}` : 'Not available'} />

                {/* Final Paid Highlight */}
                <div className="mt-2 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-4 py-3 border border-emerald-200">
                    <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
                      <DollarSign size={15} className="text-emerald-700" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Final Paid Amount</p>
                      <p className="text-lg font-extrabold text-emerald-800">{formatINR(finalPaidAmount)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                <CreditCard size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Payment Details</h3>
              </div>
              <div className="px-5 py-4 space-y-5">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider underline decoration-slate-200 underline-offset-4">Payment Method</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                      <CreditCard size={14} className="text-slate-500" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">{paymentMethod}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider underline decoration-slate-200 underline-offset-4">Payment Date</p>
                  <p className="text-sm font-bold text-slate-800 mt-2">{paymentDate}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider underline decoration-slate-200 underline-offset-4">Payment Status</p>
                  <span className={`inline-block mt-2 px-3 py-1 text-xs font-bold rounded-full border ${isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {isPaid ? 'Successful' : paymentStatus}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider underline decoration-slate-200 underline-offset-4">Transaction / Payment Reference</p>
                  <p className="text-sm font-bold text-slate-800 font-mono mt-2">{transactionRef}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ──── VENDOR / INVOICE DETAILS ──── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <Building2 size={16} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">Vendor / Invoice Details</h3>
            </div>
            <div className="flex flex-col sm:flex-row">
              {/* Left: Info */}
              <div className="px-5 py-5 space-y-4 sm:w-1/2">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Vendor Name</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{vendorName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Invoice Number</p>
                  <p className="text-sm font-bold text-slate-800 mt-1 font-mono">{invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Quote Number</p>
                  <p className="text-sm font-bold text-slate-800 mt-1 font-mono">{quoteNumber}</p>
                </div>
              </div>

              {/* Right: Document Links */}
              <div className="px-5 py-5 space-y-2.5 sm:w-1/2 border-t sm:border-t-0 sm:border-l border-slate-100">
                <DocLink href={invoiceUrl} label="View Invoice" color="emerald" />
                <DocLink href={quoteUrl} label="View Quote" color="blue" />
                <DocLink href={supportingDocUrl} label="View Supporting Documents" color="green" />
              </div>
            </div>
          </div>

          {/* ──── SUCCESS FOOTER BANNER ──── */}
          <div className="bg-gradient-to-r from-blue-50 via-emerald-50 to-blue-50 rounded-xl border border-emerald-200 px-6 py-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 size={20} className="text-emerald-600" />
              <p className="text-sm font-bold text-slate-800">Payment Completed Successfully</p>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-md mx-auto">
              This receipt is generated from the approved payment transaction associated with the above Request ID.
            </p>
          </div>

        </div>
      </div>
    </div>
  </ModalPortal>
)
}

/* ═══════════════════════════════════════════════════════════
   HELPER SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════ */

/** Renders a label + bold value, optionally as a pill badge */
function FieldItem({ label, value, bold, badge, badgeColor }: {
  label: string; value: string; bold?: boolean; badge?: boolean; badgeColor?: string
}) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{label}</p>
      {badge && value !== 'Not available' ? (
        <span className={`inline-block mt-1.5 px-3 py-1 text-xs font-bold rounded-md border ${
          badgeColor === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' :
          badgeColor === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
          'bg-slate-50 text-slate-700 border-slate-200'
        }`}>
          {value}
        </span>
      ) : (
        <p className={`mt-1.5 text-sm ${bold ? 'font-bold text-slate-800' : 'font-medium text-slate-600'} ${value === 'Not available' ? 'text-red-400 italic font-normal' : ''}`}>
          {value}
        </p>
      )}
    </div>
  )
}

/** Financial row: left-aligned label, right-aligned value */
function FinanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-semibold ${value === 'Not available' ? 'text-red-400 italic' : 'text-slate-800'}`}>{value}</span>
    </div>
  )
}

/** Document link row with icon and chevron */
function DocLink({ href, label, color }: { href: string | undefined; label: string; color: string }) {
  const colorMap: Record<string, { bg: string; text: string; icon: string; border: string }> = {
    emerald: { bg: 'bg-emerald-50 hover:bg-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-600', border: 'border-emerald-200' },
    blue: { bg: 'bg-blue-50 hover:bg-blue-100', text: 'text-blue-700', icon: 'text-blue-600', border: 'border-blue-200' },
    green: { bg: 'bg-teal-50 hover:bg-teal-100', text: 'text-teal-700', icon: 'text-teal-600', border: 'border-teal-200' },
  }
  const c = colorMap[color] || colorMap.blue

  if (!href) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200 opacity-60">
        <div className="flex items-center gap-2.5">
          <FileText size={16} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-400">{label}</span>
        </div>
        <span className="text-[10px] text-slate-400 italic">Not available</span>
      </div>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-between px-4 py-3 ${c.bg} rounded-lg border ${c.border} transition-colors group cursor-pointer`}
    >
      <div className="flex items-center gap-2.5">
        <FileText size={16} className={c.icon} />
        <span className={`text-xs font-bold ${c.text}`}>{label}</span>
      </div>
      <ChevronRight size={16} className={`${c.icon} group-hover:translate-x-0.5 transition-transform`} />
    </a>
  )
}
