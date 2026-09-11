import React, { useState } from 'react'
import { CreditCard, CheckCircle, Clock } from 'lucide-react'

export const FinancePaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState([
    {
      id: 'PAY-2026-001',
      reqId: 'REQ-DEMO-001',
      invId: 'INV-2026-001',
      vendor: 'Dell Technologies',
      amount: '$35,000.00',
      dueDate: '2026-09-20',
      status: 'Pending',
    },
  ])

  const handleDisburse = (id: string) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'Paid' } : p))
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="text-blue-600" /> Payments Queue & Processing
        </h1>
        <p className="text-xs text-gray-500">Record payments, manage payment due dates, and disburse verified invoices.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
            <tr>
              <th className="p-4">Payment Ref</th>
              <th className="p-4">Invoice Ref</th>
              <th className="p-4">Vendor</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Due Date</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="p-4 font-bold text-blue-600">{p.id}</td>
                <td className="p-4 text-gray-600">{p.invId}</td>
                <td className="p-4 font-semibold text-gray-900">{p.vendor}</td>
                <td className="p-4 font-extrabold text-gray-900">{p.amount}</td>
                <td className="p-4 text-gray-500">{p.dueDate}</td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      p.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {p.status !== 'Paid' && (
                    <button
                      onClick={() => handleDisburse(p.id)}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow"
                    >
                      Disburse Payment
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
