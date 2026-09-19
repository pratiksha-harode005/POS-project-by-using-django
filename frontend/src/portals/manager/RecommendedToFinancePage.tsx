import React from 'react'
import { Landmark, ArrowUpRight } from 'lucide-react'

export const RecommendedToFinancePage: React.FC = () => {
  const escalations = [
    {
      id: 'REQ-DEMO-002',
      title: 'Cloud Infrastructure Yearly Renewal',
      cost: 'RS 60,000.00',
      reason: 'Exceeds my approval budget',
      date: '2026-09-10',
      status: 'Awaiting Finance Action',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Landmark className="text-purple-600" /> Recommended to Finance History
        </h1>
        <p className="text-xs text-gray-500">History of high-value or threshold requests escalated to Finance portal with dropdown reasons.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
            <tr>
              <th className="p-4">Request ID</th>
              <th className="p-4">Title</th>
              <th className="p-4">Est. Cost</th>
              <th className="p-4">Escalation Reason</th>
              <th className="p-4">Date</th>
              <th className="p-4">Finance Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {escalations.map((e) => (
              <tr key={e.id}>
                <td className="p-4 font-bold text-blue-600">{e.id}</td>
                <td className="p-4 font-semibold text-gray-900">{e.title}</td>
                <td className="p-4 font-bold text-gray-900">{e.cost}</td>
                <td className="p-4 font-semibold text-purple-700 bg-purple-50">{e.reason}</td>
                <td className="p-4 text-gray-500">{e.date}</td>
                <td className="p-4 font-bold text-amber-600">{e.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
