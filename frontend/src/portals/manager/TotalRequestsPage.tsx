import React from 'react'
import { DollarSign, TrendingUp, Search } from 'lucide-react'
import { useState } from 'react'
import { useManagerData } from '../../context/ManagerDataContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

const statusColors: Record<string, string> = {
  pending_arrival: 'bg-amber-100 text-amber-900 border border-amber-300',
  pending_approval: 'bg-yellow-100 text-yellow-900 border border-yellow-300',
  approved: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
  rejected: 'bg-rose-100 text-rose-900 border border-rose-300',
  recommended_to_finance: 'bg-blue-100 text-blue-900 border border-blue-300',
  finance_review: 'bg-purple-100 text-purple-900 border border-purple-300',
  sent_to_finance: 'bg-indigo-100 text-indigo-900 border border-indigo-300',
  payment_pending: 'bg-orange-100 text-orange-900 border border-orange-300',
  completed: 'bg-slate-100 text-slate-800 border border-slate-300',
}

const statusLabel: Record<string, string> = {
  pending_arrival: 'Pending Arrival',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  recommended_to_finance: 'Rec. to Finance',
  finance_review: 'Finance Review',
  sent_to_finance: 'Sent to Finance',
  payment_pending: 'Payment Pending',
  completed: 'Completed',
}

export const TotalRequestsPage: React.FC = () => {
  const { allRequests } = useManagerData()
  const [search, setSearch] = useState('')

  const filtered = allRequests.filter(r =>
    !search ||
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase()) ||
    r.department.toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = filtered.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="text-blue-600" size={24} /> Total Request Value
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">All procurement requests and their combined value.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-600 text-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold opacity-80">Total Value</p>
          <p className="text-3xl font-black mt-1">{fmt(allRequests.reduce((s, r) => s + r.amount, 0))}</p>
          <p className="text-xs opacity-70 mt-1">{allRequests.length} requests across all statuses</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Filtered Value</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{fmt(totalValue)}</p>
          <p className="text-xs text-gray-400 mt-1">{filtered.length} matching requests</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Average Request</p>
          <p className="text-2xl font-black text-gray-900 mt-1">
            {allRequests.length ? fmt(Math.round(allRequests.reduce((s, r) => s + r.amount, 0) / allRequests.length)) : '₹0'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Per request average</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search requests…"
            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-100/90 border-b border-slate-200">
            <tr className="text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <th className="text-left px-4 py-3">Request ID</th>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Department</th>
              <th className="text-left px-4 py-3">Requester</th>
              <th className="text-right px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(r => (
              <tr key={r.id + r.status} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {r.id}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold text-slate-900 max-w-[220px]">
                  <div className="truncate">{r.title}</div>
                </td>
                <td className="px-4 py-3 text-slate-700 font-semibold">{r.department}</td>
                <td className="px-4 py-3 text-slate-700">{r.requester}</td>
                <td className="px-4 py-3 font-extrabold text-slate-900 text-right">{fmt(r.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${statusColors[r.status]}`}>
                    {statusLabel[r.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 font-medium">{r.date}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-blue-50 border-t-2 border-blue-200">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-xs font-bold text-blue-900">
                TOTAL ({filtered.length} requests)
              </td>
              <td className="px-4 py-3 text-right font-black text-blue-900 text-sm">{fmt(totalValue)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
