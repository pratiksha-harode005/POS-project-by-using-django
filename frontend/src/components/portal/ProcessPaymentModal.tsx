import React, { useState, useEffect } from 'react'
import { X, CreditCard, DollarSign, CheckCircle2, AlertCircle, Building2, Calendar, Hash } from 'lucide-react'
import type { ProcurementRequest } from '../../context/ManagerDataContext'
import { processPaymentApi } from '../../api/financeApi'

const fmt = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN')}`

interface ProcessPaymentModalProps {
  isOpen: boolean
  request: ProcurementRequest | null
  onClose: () => void
  onSuccess: (paymentRef: string) => void
}

export const ProcessPaymentModal: React.FC<ProcessPaymentModalProps> = ({
  isOpen,
  request,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !request) return null

  const effectiveAmount =
    (request as any).finance_approved_amount ||
    (request as any).approved_amount ||
    request.amount ||
    48500

  const [payableAmount, setPayableAmount] = useState<number | string>(effectiveAmount)
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer (NEFT / RTGS)')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [remarks, setRemarks] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (request) {
      const amt = (request as any).finance_approved_amount || (request as any).approved_amount || request.amount || 48500
      setPayableAmount(amt)
      setPaymentMethod('Bank Transfer (NEFT / RTGS)')
      setPaymentReference(`UTR-KSS-${Date.now().toString().slice(-8)}`)
      setPaymentDate(new Date().toISOString().split('T')[0])
      setRemarks(`Payment settled for ${request.title}. Requisition cleared.`)
      setError('')
    }
  }, [request?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = Number(payableAmount)
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid payable amount greater than 0.')
      return
    }
    if (!paymentReference.trim()) {
      setError('Payment Reference / UTR Number is required for statutory banking reconciliation.')
      return
    }
    if (paymentReference.trim().length > 15) {
      setError('Payment Reference / UTR Number must have a maximum limit of 15 characters.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await processPaymentApi(request.id, {
        approved_amount: effectiveAmount,
        final_payable_amount: numAmount,
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim(),
        payment_date: paymentDate,
        payment_status: 'Paid',
        payment_remarks: remarks.trim(),
      })

      window.dispatchEvent(new Event('kss_backend_updated'))
      onSuccess(paymentReference.trim())
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to process payment. Please verify network and backend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-700 to-teal-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <CreditCard size={20} className="text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Process Treasury Payment</h3>
              <p className="text-xs text-emerald-100">Disburse funds & record banking UTR settlement (Stage 8)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Request Quick Summary */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-indigo-700">{request.id}</span>
              <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300">
                Finance Approved: {fmt(effectiveAmount)}
              </span>
            </div>
            <p className="font-bold text-slate-800">{request.title}</p>
            <p className="text-[11px] text-slate-500">Department: <b>{request.department}</b> • Requester: <b>{request.requester}</b></p>
          </div>

          {/* Payable Amount & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Final Payable Amount (INR) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={payableAmount}
                  onChange={(e) => setPayableAmount(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-emerald-50/40 border-emerald-300 font-black text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                  placeholder="48500"
                  required
                />
                <DollarSign size={14} className="absolute right-3 top-3 text-emerald-700" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-semibold text-slate-800 focus:bg-white focus:border-indigo-600 outline-none cursor-pointer"
              >
                <option value="Bank Transfer (NEFT / RTGS)">Bank Transfer (NEFT / RTGS)</option>
                <option value="Direct Debit / IMPS">Direct Debit / IMPS</option>
                <option value="Corporate Credit Card">Corporate Credit Card</option>
                <option value="Cheque / Demand Draft">Cheque / Demand Draft</option>
                <option value="Treasury Wire">Treasury Wire</option>
              </select>
            </div>
          </div>

          {/* Payment Reference & Payment Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Payment Reference / UTR # *
                </label>
                <span className="text-[10px] text-slate-400 font-mono">{paymentReference.length}/15</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  maxLength={15}
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value.replace(/[^A-Za-z0-9\-_]/g, '').slice(0, 15))}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-mono font-bold text-indigo-700 focus:bg-white focus:border-indigo-600 outline-none"
                  placeholder="e.g. UTR-HDFC-98234"
                  required
                />
                <Hash size={14} className="absolute right-3 top-3 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Payment Settlement Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-semibold text-slate-800 focus:bg-white focus:border-indigo-600 outline-none"
                  required
                />
                <Calendar size={14} className="absolute right-3 top-3 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Treasury / Disbursement Remarks
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Commercial transaction notes, bank clearance confirmation..."
              className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-medium text-slate-800 focus:bg-white focus:border-indigo-600 outline-none resize-none"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle2 size={16} />
              {loading ? 'Disbursing...' : 'Confirm & Disburse Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
