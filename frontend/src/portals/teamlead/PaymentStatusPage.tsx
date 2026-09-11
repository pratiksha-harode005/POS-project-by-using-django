import React from 'react'
import { CreditCard, CheckCircle, Clock } from 'lucide-react'

export const PaymentStatusPage: React.FC = () => {
  const payments = [
    {
      id: 'PAY-2026-001',
      requestId: 'REQ-DEMO-001',
      title: 'High Performance Laptops for Engineering Team',
      vendor: 'Dell Technologies',
      amount: '$35,000.00',
      status: 'Processing',
      dueDate: '2026-09-20',
      paymentStage: 'Invoice Verified (Stage 8/10)',
    },
    {
      id: 'PAY-2026-000',
      requestId: 'REQ-DEMO-004',
      title: '4K Conference Room Displays',
      vendor: 'Samsung Display Systems',
      amount: '$4,200.00',
      status: 'Paid',
      dueDate: '2026-08-25',
      paymentStage: 'Payment Disbursed (Stage 9/10)',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="text-blue-600" /> Payment Status
        </h1>
        <p className="text-xs text-gray-500">
          Tracking disbursement and invoice status for your approved procurement requests.
        </p>
      </div>

      <div className="space-y-4">
        {payments.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {p.requestId}
                </span>
                <span className="text-xs text-gray-400 font-medium">Ref: {p.id}</span>
              </div>
              <h2 className="text-sm font-bold text-gray-900">{p.title}</h2>
              <p className="text-xs text-gray-500 mt-1">
                Vendor: <span className="font-semibold text-gray-800">{p.vendor}</span> • Due Date: <span className="font-semibold text-gray-700">{p.dueDate}</span>
              </p>
            </div>

            <div className="text-right">
              <p className="text-lg font-extrabold text-gray-900">{p.amount}</p>
              <div className="flex items-center gap-2 mt-1 justify-end">
                <span className="text-xs font-semibold text-blue-600">{p.paymentStage}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                    p.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {p.status === 'Paid' ? <CheckCircle size={12} /> : <Clock size={12} />}
                  {p.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
