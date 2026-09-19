import React, { useState, useEffect } from 'react'
import { CreditCard, CheckCircle, Clock, ShieldCheck, FileText, Lock, FileCheck, ArrowRight } from 'lucide-react'
import { useProcurement } from '../../context/ProcurementContext'
import { isPaymentPaidForPO, markPaymentPaidForPO, isPODelivered, getStoredDeliveryDocs } from '../vendor/VendorPortalPages'

export const FinancePaymentsPage: React.FC = () => {
  const { payments: contextPayments, releaseFinancePayment } = useProcurement()

  const defaultPayments = [
    {
      id: 'PAY-2026-001',
      poRef: 'PO-VNDHW001-76',
      reqId: 'REQ-DEMO-001',
      invId: 'INV-2026-001',
      vendor: 'Dell Technologies',
      amount: 'RS 35,000.00',
      dueDate: '2026-09-20',
      status: 'Pending',
    },
    {
      id: 'PAY-2026-002',
      poRef: 'PO-VNDHW002-88',
      reqId: 'REQ-DEMO-002',
      invId: 'INV-2026-002',
      vendor: 'HP Enterprise',
      amount: 'RS 38,500.00',
      dueDate: '2026-09-25',
      status: 'Pending',
    },
  ]

  const [paymentList, setPaymentList] = useState(defaultPayments)
  const [toastMsg, setToastMsg] = useState('')

  useEffect(() => {
    // Sync status from local storage or context
    setPaymentList((prev) =>
      prev.map((p) => {
        if (isPaymentPaidForPO(p.poRef) || isPaymentPaidForPO(p.id)) {
          return { ...p, status: 'Paid' }
        }
        return p
      })
    )
  }, [])

  const handleReleasePayment = (p: typeof defaultPayments[0]) => {
    setPaymentList((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, status: 'Paid' } : item))
    )
    markPaymentPaidForPO(p.poRef)
    markPaymentPaidForPO(p.id)
    releaseFinancePayment(p.id)

    setToastMsg(`✅ Payment released for ${p.poRef} (${p.vendor})! Vendor can now mark delivery and upload Delivery Challan.`)
    setTimeout(() => setToastMsg(''), 5000)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toastMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle size={18} className="text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="text-blue-600" /> Finance Payment Release & 3-Way Matching Queue
        </h1>
        <p className="text-xs text-gray-500">
          Reversed Order Flow: Vendor Advances Order Stages (Processing → Shipped → Delivered) → Vendor Submits Invoice & Goods Receipt → Post-Delivery Payment Completed.
        </p>
      </div>

      {/* STEP 1 & 2: PAYMENTS QUEUE TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs space-y-3 p-5">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="text-blue-600" size={16} /> Post-Delivery Payment Release Queue
            </h2>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
              Order stage advances first without payment. Payment status updates to "Paid" upon delivery confirmation & invoice submission.
            </p>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase text-[11px]">
            <tr>
              <th className="p-3.5">Payment Ref</th>
              <th className="p-3.5">PO / Request Ref</th>
              <th className="p-3.5">Vendor</th>
              <th className="p-3.5">Total Amount</th>
              <th className="p-3.5">Payment Status</th>
              <th className="p-3.5 text-right">Finance Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {paymentList.map((p) => {
              const isPaid = p.status === 'Paid' || isPaymentPaidForPO(p.poRef)

              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-3.5 font-bold text-blue-600">{p.id}</td>
                  <td className="p-3.5 text-gray-700 font-semibold">{p.poRef}</td>
                  <td className="p-3.5 font-bold text-gray-900">{p.vendor}</td>
                  <td className="p-3.5 font-black text-gray-900">{p.amount}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        isPaid
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {isPaid ? 'Paid (Payment Released)' : 'Pending'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    {isPaid ? (
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 inline-flex items-center gap-1">
                        <CheckCircle size={14} /> Released
                      </span>
                    ) : (
                      <button
                        onClick={() => handleReleasePayment(p)}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5 ml-auto"
                      >
                        <CreditCard size={14} /> Release Payment
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* STEP 4: 3-WAY MATCHING & RECORD-KEEPING MATRIX */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4 text-xs">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" size={18} /> 3-Way Matching & Audit Verification Matrix (Step 4)
            </h2>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
              Verified records matching PO, Payment Release, Delivery Challan, and Tax Invoice for record-keeping.
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[10px] rounded-full flex items-center gap-1">
            <CheckCircle size={12} /> Audit Compliant
          </span>
        </div>

        <div className="space-y-4">
          {paymentList.map((p) => {
            const isPaid = p.status === 'Paid' || isPaymentPaidForPO(p.poRef)
            const delivered = isPODelivered(p.poRef)

            return (
              <div key={p.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{p.poRef}</span>
                    <span className="text-gray-500">• {p.vendor}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">{p.amount}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Item 1: PO Status */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">1. PO Status</span>
                    <span className="font-bold text-blue-700 block">Confirmed</span>
                    <span className="text-[10px] text-gray-500">Issued by Procurement</span>
                  </div>

                  {/* Item 2: Payment Status */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">2. Payment Release</span>
                    <span className={`font-bold block ${isPaid ? 'text-green-700' : 'text-amber-700'}`}>
                      {isPaid ? 'Paid (Disbursed)' : 'Pending'}
                    </span>
                    <span className="text-[10px] text-gray-500">Finance Disbursal</span>
                  </div>

                  {/* Item 3: Delivery Challan */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">3. Delivery Challan</span>
                    <span className={`font-bold block ${delivered ? 'text-green-700' : 'text-gray-400'}`}>
                      {delivered ? 'Delivered & Uploaded' : 'Pending Delivery'}
                    </span>
                    <span className="text-[10px] text-gray-500">Dispatch Proof</span>
                  </div>

                  {/* Item 4: Commercial Invoice */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">4. Commercial Invoice</span>
                    <span className={`font-bold block ${delivered ? 'text-blue-700' : 'text-gray-400'}`}>
                      {delivered ? 'Submitted (Record)' : 'Pending Delivery'}
                    </span>
                    <span className="text-[10px] text-gray-500">Record-Keeping Only</span>
                  </div>
                </div>

                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-900 font-medium flex items-center justify-between">
                  <span>
                    💡 <strong>3-Way Match Rule:</strong> Vendor advances order stages and submits delivery confirmation & tax invoice first, after which Payment Status is marked <strong>Paid</strong> (Post-Delivery Disbursal).
                  </span>
                  <span className="font-bold text-blue-700 uppercase tracking-wider text-[10px]">VERIFIED</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
