import React, { useState } from 'react'
import { XCircle, Search, Eye } from 'lucide-react'
import { useManagerData } from '../../context/ManagerDataContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export const RejectedRequestsPage: React.FC = () => {
  const { rejectedRequests } = useManagerData()
  const [search, setSearch] = useState('')

  const filtered = rejectedRequests.filter(r =>
    !search ||
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase()) ||
    r.requester.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <XCircle className="text-red-500" size={24} /> Rejected Requests
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {rejectedRequests.length} request{rejectedRequests.length !== 1 ? 's' : ''} rejected. All rejections are recorded with reasons.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search rejected requests…"
            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <XCircle size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="font-semibold text-gray-600">No rejected requests</p>
            <p className="text-xs mt-1">
              {search ? 'No results match your search.' : 'No requests have been rejected yet.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-gray-600 font-bold uppercase tracking-wide text-[10px]">
                <th className="text-left px-4 py-3">Request ID</th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Requester</th>
                <th className="text-left px-4 py-3">Department</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Rejection Reason</th>
                <th className="text-left px-4 py-3">Rejected By</th>
                <th className="text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-red-50/40 transition-colors">
                  <td className="px-4 py-3 font-bold text-blue-600">{r.id}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 max-w-[180px]">
                    <div className="truncate">{r.title}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.requester}</td>
                  <td className="px-4 py-3 text-gray-600">{r.department}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{fmt(r.amount)}</td>
                  <td className="px-4 py-3">
                    <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-lg text-[10px] font-semibold">
                      {r.rejectionReason || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.rejectedBy || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.rejectedDate || r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
