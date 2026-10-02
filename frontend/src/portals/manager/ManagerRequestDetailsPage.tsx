import React, { useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { TrackingStepper } from '../../components/portal/TrackingStepper'
import {
  FileText, User, Calendar, Building, ArrowLeft,
  CheckCircle2, CheckCircle, ShieldCheck, Clock, Layers, Eye
} from 'lucide-react'
import { useManagerData, ApprovalParameters } from '../../context/ManagerDataContext'
import { RequestApprovalModal } from '../../components/portal/RequestApprovalModal'
import { formatDate } from '../../utils/formatDate'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export const ManagerRequestDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { allRequests, tickets, approveRequest } = useManagerData()
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const reqId = searchParams.get('id') || allRequests[0]?.id || 'REQ-2026-001'

  const req = useMemo(() => {
    return allRequests.find((r) => r.id === reqId) || allRequests[0]
  }, [allRequests, reqId])

  const matchedTicket = useMemo(() => {
    if (!req) return null
    return tickets.find(t => t.requestId === req.id || t.id === req.id) || null
  }, [tickets, req])

  const handleConfirmApproval = (params: ApprovalParameters) => {
    if (!req) return
    approveRequest(req.id, params.approvalComments, params)
    showToast(`✓ Request ${req.id} approved successfully! Forwarded for procurement.`, 'success')
    setShowApprovalModal(false)
  }

  if (!req) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center text-slate-500">
        <p>No request found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
          Go Back
        </button>
      </div>
    )
  }

  const isApproved = req.approvedBy || req.status === 'approved' || req.status === 'finance_approved'

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 text-white animate-fadeIn ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft size={14} /> Back to Requests
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Request Details & Lifecycle Tracking</h1>
          <p className="text-xs text-slate-500">Comprehensive procurement request lifecycle, approval trail, and multi-product receipts.</p>
        </div>

        <div className="flex items-center gap-3">
          {isApproved ? (
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-xl shadow-2xs">
              <CheckCircle size={14} className="text-emerald-700" />
              Approved by {req.approvedBy || 'Manager'}
            </span>
          ) : (
            <button
              onClick={() => setShowApprovalModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <CheckCircle size={15} />
              Approve Request
            </button>
          )}

          <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl shadow-2xs">
            {req.id}
          </span>
        </div>
      </div>

      {/* Dynamic Workflow Progress Stepper */}
      <TrackingStepper
        currentStage={req.currentStage}
        category={req.category}
        title={req.title}
        status={req.status}
        approval_steps={(req as any).approval_steps}
        financeStatus={req.financeStatus}
        paymentStatus={req.paymentStatus}
        rfqId={(req as any).rfqId || (req as any).rfq_id}
        poNumber={(req as any).poNumber || (req as any).po_number || (req as any).po_id}
        grnNumber={(req as any).grnNumber || (req as any).grn_number || (req as any).receipt_id}
        invoiceNumber={(req as any).invoiceNumber || (req as any).invoice_number || (req as any).invoice_id}
        isVerified={(req as any).isVerified || (req as any).documentsVerified || (req.currentStage !== undefined && req.currentStage >= 8)}
        documentsVerified={(req as any).documentsVerified || (req.currentStage !== undefined && req.currentStage >= 8)}
        lastUpdated={req.date}
        history={req.history}
      />

      {/* Request Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">
                {req.id}
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                req.priority === 'Critical'
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : req.priority === 'High'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-blue-100 text-blue-900 border-blue-300'
              }`}>
                {req.priority} Priority
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                req.status === 'approved' || req.paymentStatus === 'Paid'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : req.status === 'rejected'
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                {req.approvedBy ? 'Manager Approved' : req.status === 'rejected' ? 'Manager Rejected' : 'Pending Manager'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-2">{req.title}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Requester: <b className="text-slate-800 font-semibold">{req.requester}</b> • Department:{' '}
              <b className="text-slate-800 font-semibold">{req.department}</b> • Created: {formatDate(req.date)}
            </p>
          </div>
          <div className="text-right flex-shrink-0 bg-slate-50 border border-slate-200 p-3 sm:py-2.5 sm:px-4 rounded-xl">
            <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Total Amount</span>
            <span className="text-2xl font-black text-slate-900">{fmt(req.amount)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Category</span>
            <span className="font-bold text-slate-900">{req.category}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Department</span>
            <span className="font-bold text-slate-900">{req.department}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Manager Status</span>
            <span className="font-bold text-slate-900">{req.status}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Finance Status</span>
            <span className="font-bold text-purple-900">{req.financeStatus || 'Not Escalated'}</span>
          </div>
        </div>

        {req.description && (
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">Description</h4>
            <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">{req.description}</p>
          </div>
        )}

        {/* Multi-Product Receipts Breakdown if Available */}
        {matchedTicket?.products && matchedTicket.products.length > 0 && (
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Procurement Products & Distinct Receipts</h3>
                <p className="text-[11px] text-slate-500">Each product has its distinct Purchase Order, Goods Receipt (GRN), and Tax Invoice.</p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                {matchedTicket.products.length} Products
              </span>
            </div>

            <div className="space-y-3">
              {matchedTicket.products.map((prod) => {
                const grnVerified = prod.goodsReceipt.verified
                const invVerified = prod.invoice.verified
                const all2Verified = grnVerified && invVerified
                const isPaid = prod.paymentSettled || req.paymentStatus === 'Paid' || req.status === 'completed'

                return (
                  <div key={prod.id} className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded shadow-2xs">
                            {prod.id}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{prod.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Vendor: <b className="text-slate-700 font-semibold">{prod.vendor}</b> • Qty: {prod.quantity} {prod.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900">{fmt(prod.totalAmount)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">PO Number</span>
                        <span className="font-mono font-bold text-indigo-700">{prod.productOrder.id}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">GRN Number</span>
                        <span className="font-mono font-bold text-emerald-700">{prod.goodsReceipt.id}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Tax Invoice</span>
                        <span className="font-mono font-bold text-purple-700">{prod.invoice.id}</span>
                      </div>
                    </div>

                    <div className={`rounded-xl p-3 flex items-center justify-between gap-3 border ${
                      isPaid
                        ? 'bg-emerald-50 border-emerald-200'
                        : all2Verified
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-amber-50/50 border-amber-200'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck size={16} className={isPaid || all2Verified ? 'text-emerald-600' : 'text-amber-600'} />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{prod.name} Status</p>
                          <p className="text-[10px] text-slate-500">
                            {isPaid
                              ? 'Both documents verified. Payment settled.'
                              : all2Verified
                              ? 'Both documents (GRN and Invoice) verified. Ready for payment.'
                              : 'Documents pending verification.'}
                          </p>
                        </div>
                      </div>

                      {isPaid ? (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 size={12} /> Payment Settled (Paid)
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                          <Clock size={12} /> Pending Treasury Payment
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Structured Manager Request Approval Dossier Modal (Image 2) */}
      <RequestApprovalModal
        isOpen={showApprovalModal}
        request={req}
        onClose={() => setShowApprovalModal(false)}
        onConfirm={handleConfirmApproval}
      />
    </div>
  )
}
