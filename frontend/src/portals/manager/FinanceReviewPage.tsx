import React, { useState } from 'react'
import {
  Landmark, Send, CheckCircle, X, AlertTriangle, FileText,
  Download, Printer, ShieldCheck, Clock, Check, Paperclip,
  Building, Calendar, IndianRupee, User, ExternalLink, Sparkles
} from 'lucide-react'
import { useManagerData, ProcurementRequest } from '../../context/ManagerDataContext'
import { useActivity, UnreadBadge } from '../../context/ActivityContext'
import {
  downloadFinanceHandoverPdf,
  getFinanceHandoverPdfBlobUrl
} from '../../utils/financeHandoverPdfGenerator'
import { numberToIndianWords } from '../../utils/paymentLedgerPdfGenerator'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

const statusColors: Record<string, string> = {
  'Under Review': 'bg-amber-100 text-amber-800 border-amber-200',
  'Awaiting Finance Action': 'bg-blue-100 text-blue-800 border-blue-200',
  'Documents Pending': 'bg-orange-100 text-orange-800 border-orange-200',
  'Sent to Finance': 'bg-purple-100 text-purple-800 border-purple-200',
  'Approved': 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

const PRESET_DIRECTIVES = [
  'Priority Clearance Required',
  'Tax Invoice & Quote Attached',
  'Budget Limit Verified',
  'Settlement Terms: Net 30 Days',
  'Direct Bank Transfer via RTGS',
  'Annual Statutory Compliance'
]

export const FinanceReviewPage: React.FC = () => {
  const { financeReview, sendToFinance } = useManagerData()
  const { isUnread, markAsRead } = useActivity()
  const [sendModal, setSendModal] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [selectedDirectives, setSelectedDirectives] = useState<string[]>([
    'Tax Invoice & Quote Attached',
    'Budget Limit Verified'
  ])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const req = financeReview.find(r => r.id === sendModal)

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
  const gross = req?.amount || 0
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
              {financeReview.length} Requisitions In Pipeline
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Landmark className="text-purple-600" size={26} /> Finance Review
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit and forward manager-endorsed requisitions to Finance Directorate via official Handover Reports.
          </p>
        </div>
      </div>

      {/* Requests Feed */}
      {financeReview.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-2xs">
          <CheckCircle size={48} className="mx-auto mb-4 text-emerald-400" />
          <p className="text-lg font-bold text-slate-800">No requests pending finance review</p>
          <p className="text-xs text-slate-400 mt-1">All requisitions have been processed or forwarded to the finance queue.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {financeReview.map(r => {
            const isNew = isUnread(r.id)
            return (
              <div
                key={r.id}
                onClick={() => { if (isNew) markAsRead(r.id) }}
                className={`rounded-2xl border transition-all p-6 ${
                  isNew
                    ? 'bg-blue-50/20 border-l-4 border-l-blue-600 border-slate-300 shadow-sm'
                    : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <UnreadBadge isUnread={isNew} />
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        {r.id}
                      </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusColors[r.financeStatus || ''] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {r.financeStatus || 'Pending'}
                    </span>
                    {r.priority && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        r.priority === 'Critical' ? 'bg-rose-100 text-rose-800' :
                        r.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.priority} Priority
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mb-1">{r.title}</h2>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>👤 Requester: <b className="text-slate-800">{r.requester}</b></span>
                    <span>🏢 Department: <b className="text-slate-800">{r.department}</b></span>
                    <span>📁 Category: <b className="text-slate-800">{r.category || 'General'}</b></span>
                    <span>📅 Submitted: {r.date}</span>
                  </div>
                  {r.justification && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-3">
                      <b className="text-slate-900">Justification:</b> {r.justification}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                  <p className="text-2xl font-black text-slate-900 tracking-tight">{fmt(r.amount)}</p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Authorized Spend</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  Manager technical scrutiny completed • Ready for formal finance dossier
                </span>
                <button
                  onClick={() => handleOpenSendModal(r)}
                  disabled={r.financeStatus === 'Sent to Finance'}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xs transition-all"
                >
                  <Send size={14} />
                  {r.financeStatus === 'Sent to Finance' ? 'Already Sent to Finance' : 'Send to Finance (Handover Report)'}
                </button>
              </div>
            </div>
          )
        })}
        </div>
      )}

      {/* ── HIGH-LEVEL REPORT FORMAT MODAL (SEND TO FINANCE) ── */}
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700 disabled:opacity-50"
                >
                  <Download size={14} className={isExportingPdf ? 'animate-bounce' : ''} />
                  <span className="hidden sm:inline">Export PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handlePreviewPdf}
                  title="Print / View Preview"
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
                >
                  <Printer size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setSendModal(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors ml-1"
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
                      Total Authorized Value
                    </span>
                    <p className="text-2xl font-black text-purple-700 font-mono tracking-tight">
                      {fmt(gross)}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1">
                      <CheckCircle size={10} /> Manager Cleared
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
                        <td className="px-4 py-2.5 text-slate-800 font-medium">{req.date}</td>
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
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
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
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-950">Official Audit Trail Notification:</span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Transmitting this report locks managerial clearance, updates the central database to <span className="font-mono font-bold">sent_to_finance</span>, and alerts Finance Officers with this formal dossier in their queue.
                    </p>
                  </div>
                </div>
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
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  <Download size={14} />
                  <span>Download Report</span>
                </button>

                <button
                  type="button"
                  onClick={handleSend}
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 transition-all hover:translate-y-[-0.5px]"
                >
                  <Send size={15} />
                  <span>Confirm & Send to Finance</span>
                </button>
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  <ExternalLink size={13} /> Open External
                </button>
                <button
                  onClick={() => {
                    URL.revokeObjectURL(previewPdfUrl)
                    setPreviewPdfUrl(null)
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
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
    </div>
  )
}
