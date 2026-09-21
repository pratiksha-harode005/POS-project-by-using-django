import React, { useState } from 'react'
import { CreditCard, CheckCircle, Clock, Upload, Download, AlertTriangle, FileText, X, Eye, Sparkles } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useProcurement, PaymentRecord } from '../../context/ProcurementContext'
import { TrackingStepper } from '../../components/portal/TrackingStepper'

export const PaymentStatusPage: React.FC = () => {
  const { payments, requests, uploadReceipt } = useProcurement()

  // Unified filter across both sections
  const [activeFilter, setActiveFilter] = useState('All')

  // Requirement 4: Receipt Modal State (Mode: 'upload' | 'generate')
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<PaymentRecord | null>(null)
  const [receiptMode, setReceiptMode] = useState<'upload' | 'generate'>('upload')
  const [itemName, setItemName] = useState('')
  const [actualAmount, setActualAmount] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('')

  // Tracking Stepper Modal State (Flow A 10-stage or Flow B 7-stage)
  const [stepperModalRequest, setStepperModalRequest] = useState<{
    id: string
    title: string
    currentStage: number
    status: any
    category?: string
    flowType?: 'A' | 'B'
  } | null>(null)

  // Flow A (Vendor-paid) & Flow B (Direct funds to Team Lead)
  const flowAPayments = payments.filter((p) => p.flowType === 'A' || !p.flowType)
  const flowBPayments = payments.filter((p) => p.flowType === 'B')

  // Requirement 2: Combined Top Bar Totals (Flow A + Flow B)
  const totalPaidCombined = payments
    .filter((p) => p.status === 'Paid')
    .reduce((acc, curr) => acc + curr.amount, 0)
  const processingCombinedCount = payments.filter((p) => p.status === 'Processing').length
  const awaitingReceiptCombinedCount = payments.filter((p) => p.status === 'Awaiting Receipt').length

  // Requirement 1: Flow B Mini Stat Cards ALWAYS compute from full flowBPayments array (unaffected by list filter)
  const totalFlowBDisbursed = flowBPayments.reduce((acc, curr) => acc + curr.amount, 0)
  const flowBAwaitingCount = flowBPayments.filter((p) => p.status === 'Awaiting Receipt').length

  // Unified filter: maps filter option to section and status
  const applyFilter = (list: PaymentRecord[], flowType: 'A' | 'B') => {
    if (activeFilter === 'All') return list
    if (activeFilter === 'Vendor Payments') return flowType === 'A' ? list : []
    if (activeFilter === 'Funds Disbursed') return flowType === 'B' ? list : []
    // Status-based filters apply across both flows
    return list.filter((p) => p.status === activeFilter)
  }

  const filteredFlowA = applyFilter(flowAPayments, 'A')
  const filteredFlowB = applyFilter(flowBPayments, 'B')

  // Section 3: Receipts the Team Lead has already submitted to another portal
  const submittedReceipts = payments.filter(
    (p) => p.receiptUploaded === true && p.receiptDetails
  )
  // Show in Receipts Submitted section only when filter is All or Receipts Submitted
  const showReceiptsSection =
    activeFilter === 'All' || activeFilter === 'Receipts Submitted'

  const handleOpenReceiptModal = (p: PaymentRecord, mode: 'upload' | 'generate' = 'upload') => {
    setSelectedPaymentForReceipt(p)
    setReceiptMode(mode)
    setItemName(p.title)
    setActualAmount(p.amount.toString())
    setPurchaseDate(new Date().toISOString().split('T')[0])
    setReceiptFile(null)
    setNotes('')
    setUploadSuccessMsg('')
  }

  // Requirement 4: PDF Receipt Generation helper using jsPDF
  const createReceiptPdfFile = (
    payment: PaymentRecord,
    itemStr: string,
    amtNum: number,
    dateStr: string,
    notesStr?: string
  ): File => {
    const doc = new jsPDF()

    // Header band
    doc.setFillColor(30, 58, 138)
    doc.rect(0, 0, 210, 32, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('OFFICIAL EXPENSE RECEIPT', 14, 20)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('PROCUREMENT OS AUDIT PROOF', 142, 20)

    // Document metadata
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(10)

    doc.setFont('helvetica', 'bold')
    doc.text('Receipt Reference:', 14, 44)
    doc.setFont('helvetica', 'normal')
    doc.text(`REC-${payment.id}`, 55, 44)

    doc.setFont('helvetica', 'bold')
    doc.text('Request ID:', 14, 52)
    doc.setFont('helvetica', 'normal')
    doc.text(payment.requestId, 55, 52)

    doc.setFont('helvetica', 'bold')
    doc.text('Generated Date:', 14, 60)
    doc.setFont('helvetica', 'normal')
    doc.text(new Date().toISOString().split('T')[0], 55, 60)

    // Line separator
    doc.setDrawColor(226, 232, 240)
    doc.line(14, 66, 196, 66)

    // Expense summary table header
    doc.setFillColor(241, 245, 249)
    doc.rect(14, 72, 182, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.text('Item / Service Description', 18, 78.5)
    doc.text('Purchase Date', 120, 78.5)
    doc.text('Amount (RS)', 162, 78.5)

    // Expense summary table row
    doc.setFont('helvetica', 'normal')
    doc.text(itemStr.length > 45 ? itemStr.substring(0, 42) + '...' : itemStr, 18, 90)
    doc.text(dateStr, 120, 90)
    doc.text(`RS {amtNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 162, 90)

    doc.line(14, 98, 196, 98)

    // Disbursement details
    doc.setFont('helvetica', 'bold')
    doc.text('Disbursement Authorization:', 14, 110)
    doc.setFont('helvetica', 'normal')
    const releasedByStr = payment.releasedBy ? `${payment.releasedBy.role} — ${payment.releasedBy.name}` : 'Manager — Sarah Manager'
    doc.text(`Released by: ${releasedByStr}`, 14, 118)
    doc.text(`Release Basis: ${payment.releaseReason || 'Approved under department CapEx/OpEx budget'}`, 14, 126)

    if (notesStr) {
      doc.setFont('helvetica', 'bold')
      doc.text('Notes / Rationale:', 14, 138)
      doc.setFont('helvetica', 'normal')
      doc.text(notesStr, 14, 146)
    }

    // Seal box
    doc.setFillColor(240, 253, 244)
    doc.setDrawColor(187, 247, 208)
    doc.rect(14, 165, 182, 22, 'DF')
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(22, 101, 52)
    doc.text('✓ VERIFIED AUTOMATED PDF RECEIPT', 20, 178)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Electronically signed & linked to Procurement OS Request Record.', 20, 183)

    const blob = doc.output('blob')
    return new File([blob], `Receipt_${payment.requestId}.pdf`, { type: 'application/pdf' })
  }

  const handleReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPaymentForReceipt || !itemName || !actualAmount || !purchaseDate) return

    let fileToSubmit = receiptFile

    if (receiptMode === 'generate') {
      fileToSubmit = createReceiptPdfFile(
        selectedPaymentForReceipt,
        itemName,
        parseFloat(actualAmount),
        purchaseDate,
        notes
      )
    }

    if (!fileToSubmit) return

    uploadReceipt(selectedPaymentForReceipt.id, {
      itemName,
      actualAmount: parseFloat(actualAmount),
      purchaseDate,
      file: fileToSubmit,
      notes: notes || undefined,
    })

    const targetRole = selectedPaymentForReceipt.releasedBy?.role || 'Finance'
    const successMsgText =
      receiptMode === 'generate'
        ? `PDF Receipt auto-generated & attached! Stage updated & ${targetRole} notified.`
        : `Receipt file "${fileToSubmit.name}" submitted! Stage updated & ${targetRole} notified.`

    setUploadSuccessMsg(successMsgText)
    setTimeout(() => {
      setSelectedPaymentForReceipt(null)
      setUploadSuccessMsg('')
    }, 1500)
  }

  const handleOpenStepperModal = (requestId: string) => {
    const req = requests.find((r) => r.id === requestId)
    if (req) {
      setStepperModalRequest({
        id: req.id,
        title: req.title,
        currentStage: req.currentStage,
        status: req.status,
        category: req.category,
        flowType: req.flowType,
      })
    } else {
      setStepperModalRequest({
        id: requestId,
        title: 'Procurement Request',
        currentStage: 4,
        status: 'In Procurement',
        flowType: 'A',
      })
    }
  }

  const isOverdue = (dueDateStr: string, status: string) => {
    if (status !== 'Processing' && status !== 'Awaiting Receipt') return false
    const due = new Date(dueDateStr)
    const today = new Date()
    return due < today
  }

  const handleDownloadDoc = (p: PaymentRecord) => {
    const item = p.receiptDetails?.itemName || p.title
    const amount = p.receiptDetails?.actualAmount || p.amount
    const date = p.receiptDetails?.purchaseDate || p.releaseDate || new Date().toISOString().split('T')[0]
    const notesStr = p.receiptDetails?.notes || p.releaseReason

    const file = createReceiptPdfFile(p, item, amount, date, notesStr)
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header & Top Summary Bar (Requirement 2: Combined totals Flow A + B) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="text-blue-600" /> Payment & Disbursement Status
          </h1>
          <p className="text-xs text-gray-500">
            Tracking vendor payments (Flow A) & direct advance funds released to Team Lead (Flow B).
          </p>
        </div>

        {/* Top Summary Line - Combined Overview */}
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2 rounded-xl text-xs font-bold shadow-xs">
          💳 Combined Overview: RS {totalPaidCombined.toLocaleString('en-US', { minimumFractionDigits: 2 })} Total Completed ·{' '}
          {processingCombinedCount} Vendor Processing · {awaitingReceiptCombinedCount} Awaiting Receipt
        </div>
      </div>

      {/* Unified Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-gray-500 mr-1">Filter:</span>
        {[
          { label: 'All Payments', value: 'All' },
          { label: '🏢 Vendor Payments', value: 'Vendor Payments' },
          { label: '💸 Funds Disbursed', value: 'Funds Disbursed' },
          { label: '⏳ Processing', value: 'Processing' },
          { label: '✅ Paid', value: 'Paid' },
          { label: '🧾 Awaiting Receipt', value: 'Awaiting Receipt' },
          { label: '📨 Receipts Submitted', value: 'Receipts Submitted' },
        ].map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setActiveFilter(value)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              activeFilter === value
                ? 'bg-blue-600 text-white border-blue-600 shadow'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* SECTION 1: Vendor Payments (Flow A) — hidden when no matching cards */}
      {filteredFlowA.length > 0 && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              🏢 Vendor Direct Payments (Flow A)
            </h2>
          </div>
          {filteredFlowA.map((p) => {
            const overdue = isOverdue(p.dueDate, p.status)

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4 transition-all ${
                  overdue
                    ? 'border-2 border-red-500 bg-red-50/10'
                    : 'border border-gray-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {p.requestId}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">Ref: {p.id}</span>
                    {overdue && (
                      <span className="text-[10px] font-extrabold text-white bg-red-600 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <AlertTriangle size={11} /> OVERDUE
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">{p.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Vendor: <span className="font-semibold text-gray-800">{p.vendor}</span> • Due Date:{' '}
                    <span className={`font-semibold ${overdue ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                      {p.dueDate}
                    </span>
                  </p>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <p className="text-lg font-extrabold text-gray-900">
                    ${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>

                  <div className="flex items-center gap-2">
                    {/* Stepper Link opening Modal */}
                    <button
                      onClick={() => handleOpenStepperModal(p.requestId)}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Eye size={13} /> {p.paymentStage}
                    </button>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                        p.status === 'Paid'
                          ? 'bg-green-100 text-green-800'
                          : overdue
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {p.status === 'Paid' ? <CheckCircle size={12} /> : <Clock size={12} />}
                      {p.status}
                    </span>

                    {/* Download PDF Receipt */}
                    <button
                      onClick={() => handleDownloadDoc(p)}
                      title="Download Official Receipt PDF"
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* SECTION 2: Funds Released to You (Flow B) — hidden when no matching cards */}
      {filteredFlowB.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200">
            <h2 className="text-sm font-bold text-purple-950 uppercase tracking-wider flex items-center gap-2">
              💸 Funds Released to You (Flow B — Subscriptions &amp; Direct Advances)
            </h2>
          </div>

          {/* Flow B Mini Stat Cards — always use unfiltered totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
                  Total Direct Funds Disbursed (Flow B)
                </p>
                <p className="text-2xl font-extrabold text-purple-950 mt-1">
                  ${totalFlowBDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-purple-100/80 rounded-xl text-purple-700 font-bold text-xl">💰</div>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                  Awaiting Your Receipt (Flow B)
                </p>
                <p className="text-2xl font-extrabold text-amber-950 mt-1">
                  {flowBAwaitingCount} {flowBAwaitingCount === 1 ? 'Request' : 'Requests'}
                </p>
              </div>
              <div className="p-3 bg-amber-100/80 rounded-xl text-amber-700 font-bold text-xl">⏳</div>
            </div>
          </div>

          {filteredFlowB.map((p) => {
            const overdue = isOverdue(p.dueDate, p.status)
            const releasedByRole = p.releasedBy?.role || 'Manager'
            const releasedByName = p.releasedBy?.name || 'Sarah Manager'
            const releaseReason = p.releaseReason || 'Approved by Manager under department CapEx/OpEx allocation'

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl p-6 shadow-sm space-y-4 transition-all ${
                  p.status === 'Awaiting Receipt'
                    ? 'border-2 border-amber-400 bg-amber-50/10'
                    : 'border border-gray-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
                        Flow B • {p.requestId}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">Release Date: {p.releaseDate || '2026-09-11'}</span>
                      {overdue && (
                        <span className="text-[10px] font-extrabold text-white bg-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{p.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Disbursement Type: <span className="font-semibold text-gray-800">Team Lead Account Advance</span> • Receipt Due:{' '}
                      <span className="font-semibold text-gray-700">{p.dueDate}</span>
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="text-lg font-extrabold text-gray-900">
                      ${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {/* Stepper Link opening Modal */}
                      <button
                        onClick={() => handleOpenStepperModal(p.requestId)}
                        className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1"
                      >
                        <Eye size={13} /> {p.paymentStage}
                      </button>

                      {/* Single Submit Receipt Action Button (Modal contains tabs for PDF generation or file upload) */}
                      {p.status === 'Awaiting Receipt' ? (
                        <button
                          onClick={() => handleOpenReceiptModal(p, 'generate')}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow transition-all"
                        >
                          <Upload size={13} /> Submit Receipt
                        </button>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800 flex items-center gap-1">
                          <CheckCircle size={12} /> Receipt Submitted
                        </span>
                      )}

                      {/* Download PDF Link */}
                      <button
                        onClick={() => handleDownloadDoc(p)}
                        title="Download PDF Receipt Document"
                        className="p-1.5 text-gray-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors border border-gray-200"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Release Details Banner */}
                <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 text-xs space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-purple-900">
                      👤 Released by: <strong className="text-purple-950">{releasedByRole} — {releasedByName}</strong>
                    </span>
                    <span className="text-[11px] text-purple-700 font-medium">Request Ref: {p.requestId}</span>
                  </div>
                  <p className="text-purple-800 text-[11px]">
                    💬 <span className="font-semibold">Release Basis:</span> {releaseReason}
                  </p>
                </div>

                {/* Submitted Receipt Record Display */}
                {p.receiptDetails && (
                  <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-emerald-900">
                      <span className="flex items-center gap-1">🧾 Submitted Receipt Details</span>
                      <span className="text-[11px] text-emerald-700 font-normal">Date: {p.receiptDetails.submittedAt}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-emerald-800 pt-1">
                      <div>
                        <span className="font-semibold">Item Purchased:</span> {p.receiptDetails.itemName}
                      </div>
                      <div>
                        <span className="font-semibold">Actual Amount Spent:</span> ${p.receiptDetails.actualAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div>
                        <span className="font-semibold">Purchase Date:</span> {p.receiptDetails.purchaseDate}
                      </div>
                    </div>
                    {p.receiptDetails.notes && (
                      <p className="text-[11px] text-emerald-800 pt-0.5">
                        <span className="font-semibold">Notes:</span> {p.receiptDetails.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* SECTION 3: Receipts Submitted to Other Portals */}
      {showReceiptsSection && submittedReceipts.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div className="bg-green-50 p-3 rounded-xl border border-green-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-green-900 uppercase tracking-wider flex items-center gap-2">
              📨 Receipts Submitted to Portal
            </h2>
            <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full border border-green-200">
              {submittedReceipts.length} Receipt{submittedReceipts.length !== 1 ? 's' : ''} Submitted
            </span>
          </div>

          {/* Summary mini-stat */}
          <div className="bg-green-50/60 border border-green-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-semibold text-green-800 uppercase tracking-wider">
                Total Amount Covered by Submitted Receipts
              </p>
              <p className="text-2xl font-extrabold text-green-950 mt-1">
                ${submittedReceipts
                  .reduce((acc, p) => acc + (p.receiptDetails?.actualAmount ?? p.amount), 0)
                  .toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-green-700 mt-0.5">
                Across {submittedReceipts.length} request{submittedReceipts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl text-green-700 font-bold text-xl">🧾</div>
          </div>

          {/* Receipt cards */}
          {submittedReceipts.map((p) => {
            const rd = p.receiptDetails!
            const sentTo = p.releasedBy?.role || 'Manager'
            const sentToName = p.releasedBy?.name || ''
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-5 border border-green-200 shadow-sm space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded border border-green-200">
                        {p.requestId}
                      </span>
                      <span className="text-xs text-gray-400">Ref: {p.id}</span>
                      <span className="text-[10px] font-extrabold text-white bg-green-600 px-2 py-0.5 rounded-full">
                        ✓ SUBMITTED
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{p.title}</h3>
                  </div>
                  {/* Submitted-to badge */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      📤 Sent to: {sentTo}{sentToName ? ` (${sentToName})` : ''}
                    </span>
                    <span className="text-xs text-gray-500">
                      Submitted on {rd.submittedAt ? new Date(rd.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                </div>

                {/* Receipt details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs">
                  <div>
                    <p className="text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Item / Service</p>
                    <p className="font-bold text-gray-900">{rd.itemName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Amount Spent</p>
                    <p className="font-extrabold text-green-800">
                      ${rd.actualAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Purchase Date</p>
                    <p className="font-bold text-gray-900">{rd.purchaseDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Bill / Invoice</p>
                    <p className="font-bold text-blue-700 flex items-center gap-1 truncate">
                      <FileText size={12} /> {rd.fileName || 'Attached'}
                    </p>
                  </div>
                </div>

                {/* Notes if any */}
                {rd.notes && (
                  <p className="text-xs text-gray-600 bg-amber-50/60 border border-amber-100 rounded-lg px-3 py-2">
                    📝 <span className="font-semibold">Notes:</span> {rd.notes}
                  </p>
                )}

                {/* Re-download button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleDownloadDoc(p)}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
                  >
                    <Download size={13} /> Re-download Receipt PDF
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Requirement 4: Submit / Generate Receipt Modal Form */}
      {selectedPaymentForReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                {receiptMode === 'generate' ? (
                  <>
                    <Sparkles className="text-purple-600" size={20} /> Auto-Generate PDF Receipt
                  </>
                ) : (
                  <>
                    <Upload className="text-blue-600" size={20} /> Upload Payment Receipt File
                  </>
                )}
              </h3>
              <button onClick={() => setSelectedPaymentForReceipt(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Mode Switch Tabs inside Modal */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setReceiptMode('generate')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  receiptMode === 'generate'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Sparkles size={13} /> Auto-Generate PDF
              </button>
              <button
                type="button"
                onClick={() => setReceiptMode('upload')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  receiptMode === 'upload'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Upload size={13} /> Manual Upload File
              </button>
            </div>

            {uploadSuccessMsg ? (
              <div className="p-4 bg-green-50 text-green-800 rounded-xl text-xs font-bold text-center border border-green-200 space-y-2">
                <CheckCircle size={32} className="mx-auto text-green-600" />
                <p>{uploadSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleReceiptSubmit} className="space-y-4 text-xs">
                {/* Releasing Role Information Banner */}
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-gray-700 space-y-1">
                  <p className="font-bold text-gray-900">{selectedPaymentForReceipt.title}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600 mt-0.5">
                    <span>
                      Request ID: <strong>{selectedPaymentForReceipt.requestId}</strong> | Amount Released: <strong>RS {selectedPaymentForReceipt.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                    </span>
                    <span className="font-semibold text-purple-900 bg-purple-100/70 px-2 py-0.5 rounded">
                      👤 Released by: {selectedPaymentForReceipt.releasedBy?.role || 'Manager'} ({selectedPaymentForReceipt.releasedBy?.name || 'Sarah Manager'})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Item / Service Purchased *</label>
                    <input
                      type="text"
                      required
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g. Figma Enterprise License"
                      className="w-full p-2.5 border rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Actual Amount Spent (RS) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={actualAmount}
                      onChange={(e) => setActualAmount(e.target.value)}
                      className="w-full p-2.5 border rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full p-2.5 border rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {receiptMode === 'upload' ? (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Upload Bill / Invoice File *</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                      <FileText className="mx-auto text-gray-400 mb-1" size={24} />
                      <input
                        type="file"
                        required={receiptMode === 'upload'}
                        id="receipt-upload-input"
                        className="hidden"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      />
                      <label htmlFor="receipt-upload-input" className="text-xs text-blue-600 font-bold cursor-pointer hover:underline">
                        Choose PDF / JPG File
                      </label>
                      <p className="text-[10px] text-gray-400 mt-1">Supported formats: PDF, JPG, PNG (Max 10MB)</p>
                      {receiptFile && (
                        <p className="text-[11px] text-emerald-700 font-bold mt-2 bg-emerald-50 py-1 px-2 rounded">
                          Selected: {receiptFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-purple-900 text-[11px] space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <Sparkles size={14} className="text-purple-600" /> Automated PDF Generation
                    </p>
                    <p className="text-purple-800">
                      Submitting will automatically construct an official PDF expense receipt with your item details, date, amount, and request reference attached.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Notes / Remarks (Optional)</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional details or invoice reference numbers..."
                    className="w-full p-2.5 border rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentForReceipt(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      !itemName ||
                      !actualAmount ||
                      !purchaseDate ||
                      (receiptMode === 'upload' && !receiptFile)
                    }
                    className={`px-5 py-2 font-bold text-white rounded-lg shadow disabled:opacity-50 transition-all ${
                      receiptMode === 'generate'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    Submit Receipt to {selectedPaymentForReceipt.releasedBy?.role || (selectedPaymentForReceipt.flowType === 'B' ? 'Manager' : 'Finance')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 10-Step / 7-Step Tracking Stepper Modal */}
      {stepperModalRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {stepperModalRequest.id}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">{stepperModalRequest.title}</h3>
              </div>
              <button onClick={() => setStepperModalRequest(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <TrackingStepper
              currentStage={stepperModalRequest.currentStage}
              status={stepperModalRequest.status}
              category={stepperModalRequest.category}
              title={stepperModalRequest.title}
              flowType={stepperModalRequest.flowType}
              history={(stepperModalRequest as any).history}
            />

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={() => setStepperModalRequest(null)}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs shadow hover:bg-blue-700"
              >
                Close Tracking View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
