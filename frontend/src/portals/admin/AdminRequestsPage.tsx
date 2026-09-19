import React, { useState } from 'react'

export const AdminRequestsPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'returned'>('all')

  const requests = [
    { id: 'REQ-DEMO-001', title: 'High Performance Laptops', category: 'IT Hardware', status: 'In Procurement', cost: 'RS 35,000.00' },
    { id: 'REQ-DEMO-002', title: 'Cloud Infrastructure Renewal', category: 'SaaS & Cloud', status: 'Pending', cost: 'RS 60,000.00' },
    { id: 'REQ-DEMO-003', title: 'Ergonomic Desk Chairs', category: 'Office Accessories', status: 'Returned', cost: 'RS 2,500.00' },
    { id: 'REQ-DEMO-005', title: 'Legacy Server Replacement', category: 'IT Hardware', status: 'Rejected', cost: 'RS 80,000.00' },
  ]

  const filtered = requests.filter((r) => {
    if (subTab === 'all') return true
    if (subTab === 'pending') return r.status === 'Pending'
    if (subTab === 'approved') return r.status === 'In Procurement' || r.status === 'Completed'
    if (subTab === 'rejected') return r.status === 'Rejected'
    if (subTab === 'returned') return r.status === 'Returned'
    return true
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Request Management</h1>
        <p className="text-xs text-gray-500">System-wide purchase requests across all departments.</p>
      </div>

      {/* 5 Sub-Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2">
        {[
          { id: 'all', label: 'All Requests' },
          { id: 'pending', label: 'Pending Final Approval' },
          { id: 'approved', label: 'Approved' },
          { id: 'rejected', label: 'Rejected' },
          { id: 'returned', label: 'Returned' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              subTab === t.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-b-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
            <tr>
              <th className="p-4">Request ID</th>
              <th className="p-4">Title</th>
              <th className="p-4">Category</th>
              <th className="p-4">Cost</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="p-4 font-bold text-blue-600">{r.id}</td>
                <td className="p-4 font-semibold text-gray-900">{r.title}</td>
                <td className="p-4 text-gray-600">{r.category}</td>
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
