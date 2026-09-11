import React from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, CheckCircle, XCircle, Landmark, DollarSign, CreditCard } from 'lucide-react'

export const ManagerDashboard: React.FC = () => {
  const cards = [
    { label: 'Pending Approvals', count: 4, icon: CheckSquare, color: 'bg-amber-500' },
    { label: 'Approvals This Month', count: 18, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Rejected Requests', count: 2, icon: XCircle, color: 'bg-red-500' },
    { label: 'Finance Review', count: 5, icon: Landmark, color: 'bg-purple-500', note: 'Sent to Finance' },
    { label: 'Total Request Value', count: '$145,000.00', icon: DollarSign, color: 'bg-blue-600' },
    { label: 'Budget Amount Remaining', count: '$355,000.00', icon: CreditCard, color: 'bg-indigo-600' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Overview Dashboard</h1>
        <p className="text-xs text-gray-500">Department approval workflow, financial thresholds & escalation queues.</p>
      </div>

      {/* 6 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${c.color} text-white flex items-center justify-center shadow-md`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900 leading-none mb-1">{c.count}</p>
                <p className="text-xs font-semibold text-gray-500">{c.label}</p>
                {c.note && <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded mt-1 inline-block">{c.note}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Action shortcuts */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">4 Requests Awaiting Your Decision</h2>
          <p className="text-xs text-gray-500">Approve directly, reject with dropdown reason, or recommend/escalate to Finance.</p>
        </div>
        <Link
          to="/portal/manager/my-approvals"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition-all"
        >
          Review Pending Approvals
        </Link>
      </div>
    </div>
  )
}
