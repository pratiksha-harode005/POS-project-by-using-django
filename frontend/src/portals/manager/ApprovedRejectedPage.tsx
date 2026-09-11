import React from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

export const ApprovedRejectedPage: React.FC = () => {
  const history = [
    { id: 'REQ-DEMO-001', title: 'High Performance Laptops', decision: 'APPROVED', date: '2026-09-08', reason: 'Approved within department threshold.' },
    { id: 'REQ-DEMO-005', title: 'Legacy Server Rack Replacement', decision: 'REJECTED', date: '2026-08-15', reason: 'Not aligned with department priorities' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approved & Rejected History</h1>
        <p className="text-xs text-gray-500">History of your past approval and rejection decisions.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
            <tr>
              <th className="p-4">Request ID</th>
              <th className="p-4">Title</th>
              <th className="p-4">Decision</th>
              <th className="p-4">Date</th>
              <th className="p-4">Recorded Reason / Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {history.map((h) => (
              <tr key={h.id}>
                <td className="p-4 font-bold text-blue-600">{h.id}</td>
                <td className="p-4 font-semibold text-gray-900">{h.title}</td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-fit ${
                      h.decision === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {h.decision === 'APPROVED' ? <CheckCircle size={13} /> : <XCircle size={13} />}
                    {h.decision}
                  </span>
                </td>
                <td className="p-4 text-gray-500">{h.date}</td>
                <td className="p-4 text-gray-600">{h.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
