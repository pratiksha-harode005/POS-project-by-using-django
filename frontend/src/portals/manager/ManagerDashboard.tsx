import React from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, CheckCircle, XCircle, Landmark, IndianRupee, CreditCard } from 'lucide-react'

export const ManagerDashboard: React.FC = () => {
  const cards = [
    { label: 'Pending Approvals', count: 4, icon: CheckSquare, bg: 'bg-amber-50 text-amber-600 border border-amber-200' },
    { label: 'Approvals This Month', count: 18, icon: CheckCircle, bg: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
    { label: 'Rejected Requests', count: 2, icon: XCircle, bg: 'bg-rose-50 text-rose-600 border border-rose-200' },
    { label: 'Finance Review', count: 5, icon: Landmark, bg: 'bg-purple-50 text-purple-600 border border-purple-200', note: 'Sent to Finance' },
    { label: 'Total Request Value', count: 'RS 145,000.00', icon: IndianRupee, bg: 'bg-blue-50 text-blue-600 border border-blue-200' },
    { label: 'Budget Amount Remaining', count: 'RS 355,000.00', icon: CreditCard, bg: 'bg-indigo-50 text-indigo-600 border border-indigo-200' },
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
              <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900 leading-none mb-1">{c.count}</p>
                <p className="text-xs font-semibold text-gray-500">{c.label}</p>
                {c.note && <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded mt-1 inline-block border border-purple-200">{c.note}</span>}
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
