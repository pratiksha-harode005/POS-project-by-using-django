import React, { useState } from 'react'
import { History, Search, Filter } from 'lucide-react'

export const RequestHistoryPage: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState('All')
  const [search, setSearch] = useState('')

  const history = [
    { id: 'REQ-DEMO-001', title: 'High Performance Laptops', category: 'IT Hardware', status: 'In Procurement', date: '2026-09-08', cost: '$35,000.00' },
    { id: 'REQ-DEMO-002', title: 'Cloud Infrastructure Renewal', category: 'SaaS & Cloud', status: 'Pending', date: '2026-09-10', cost: '$60,000.00' },
    { id: 'REQ-DEMO-003', title: 'Ergonomic Desk Chairs', category: 'Furniture', status: 'Returned', date: '2026-09-05', cost: '$2,500.00' },
    { id: 'REQ-DEMO-004', title: '4K Conference Room Displays', category: 'Office Technology', status: 'Completed', date: '2026-08-20', cost: '$4,200.00' },
    { id: 'REQ-DEMO-005', title: 'Legacy Server Rack Replacement', category: 'IT Hardware', status: 'Rejected', date: '2026-08-15', cost: '$80,000.00' },
  ]

  const filtered = history.filter((item) => {
    const matchesStatus = filterStatus === 'All' || item.status === filterStatus
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.id.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <History className="text-blue-600" /> Request History
        </h1>
        <p className="text-xs text-gray-500">Full audit log of all past procurement requests.</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border rounded-lg bg-gray-50 border-gray-300"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs font-semibold p-2 border rounded-lg bg-gray-50 border-gray-300 text-gray-700"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="In Procurement">In Procurement</option>
            <option value="Completed">Completed</option>
            <option value="Returned">Returned</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider">
            <tr>
              <th className="p-4">Request ID</th>
              <th className="p-4">Title</th>
              <th className="p-4">Category</th>
              <th className="p-4">Cost</th>
              <th className="p-4">Date</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {filtered.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50/50">
                <td className="p-4 font-bold text-blue-600">{row.id}</td>
                <td className="p-4 font-semibold text-gray-900">{row.title}</td>
                <td className="p-4 text-gray-600">{row.category}</td>
                <td className="p-4 font-bold text-gray-900">{row.cost}</td>
                <td className="p-4 text-gray-500">{row.date}</td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      row.status === 'Completed'
                        ? 'bg-green-100 text-green-800'
                        : row.status === 'Rejected'
                        ? 'bg-red-100 text-red-800'
                        : row.status === 'Returned'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {row.status}
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
