import React from 'react'
import { ArrowUpRight, CheckCircle } from 'lucide-react'
import { useManagerData } from '../../context/ManagerDataContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

const financeStatusColor: Record<string, string> = {
  'Awaiting Finance Action': 'text-amber-600',
  'Under Review': 'text-blue-600',
  'Documents Pending': 'text-orange-600',
  'Sent to Finance': 'text-purple-600',
  'Approved': 'text-green-700',
}

export const RecommendedToFinancePage: React.FC = () => {
  const { recommendedToFinance } = useManagerData()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ArrowUpRight className="text-blue-600" size={24} /> Recommended to Finance
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {recommendedToFinance.length} request{recommendedToFinance.length !== 1 ? 's' : ''} recommended to Finance with reasons. Tracking Finance response status below.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        {recommendedToFinance.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle size={40} className="mx-auto mb-3 text-green-200" />
            <p className="font-semibold text-gray-600">No recommendations yet</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-4">Request ID</th>
                <th className="p-4">Title</th>
                <th className="p-4">Est. Cost</th>
                <th className="p-4">Escalation Reason</th>
                <th className="p-4">Recommended By</th>
                <th className="p-4">Date</th>
                <th className="p-4">Finance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {recommendedToFinance.map(e => (
                <tr key={e.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4 font-bold text-blue-600">{e.id}</td>
                  <td className="p-4 font-semibold text-gray-900 max-w-[200px]"><div className="truncate">{e.title}</div></td>
                  <td className="p-4 font-bold text-gray-900">{fmt(e.amount)}</td>
                  <td className="p-4">
                    <span className="font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-1 rounded text-[10px]">
                      {e.recommendationReason || '—'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">{e.recommendedBy || '—'}</td>
                  <td className="p-4 text-gray-500">{e.recommendedDate || e.date}</td>
                  <td className="p-4">
                    <span className={`font-bold text-xs ${financeStatusColor[e.financeStatus || ''] || 'text-gray-500'}`}>
                      {e.financeStatus || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
