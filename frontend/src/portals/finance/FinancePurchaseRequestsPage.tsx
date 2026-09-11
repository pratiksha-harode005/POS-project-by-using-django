import React from 'react'
import { FileText } from 'lucide-react'

export const FinancePurchaseRequestsPage: React.FC = () => {
  const requests = [
    { id: 'REQ-DEMO-001', title: 'High Performance Laptops', stage: 'Stage 6 (Product Order)', cost: '$35,000.00', status: 'In Procurement' },
    { id: 'REQ-DEMO-002', title: 'Cloud Infrastructure Renewal', stage: 'Stage 2 (Finance Approval)', cost: '$60,000.00', status: 'Pending' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="text-blue-600" /> Finance Purchase Requests
        </h1>
        <p className="text-xs text-gray-500">All requests currently at or past the Finance approval stage.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
            <tr>
              <th className="p-4">Request ID</th>
              <th className="p-4">Title</th>
              <th className="p-4">Current Stage</th>
              <th className="p-4">Est. Cost</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="p-4 font-bold text-blue-600">{r.id}</td>
                <td className="p-4 font-semibold text-gray-900">{r.title}</td>
                <td className="p-4 text-purple-700 font-semibold">{r.stage}</td>
                <td className="p-4 font-black text-gray-900">{r.cost}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full">
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
