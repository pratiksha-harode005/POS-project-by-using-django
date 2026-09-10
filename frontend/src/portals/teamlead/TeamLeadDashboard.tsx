import React from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, FileText, Clock, CheckCircle, XCircle, RotateCcw, Truck, Award } from 'lucide-react'

export const TeamLeadDashboard: React.FC = () => {
  const cards = [
    { label: 'Total Requests', count: 12, icon: FileText, color: 'bg-blue-500' },
    { label: 'Pending Requests', count: 3, icon: Clock, color: 'bg-amber-500' },
    { label: 'Approval Requests', count: 2, icon: CheckCircle, color: 'bg-indigo-500' },
    { label: 'Rejected Requests', count: 1, icon: XCircle, color: 'bg-red-500' },
    { label: 'Returned Requests', count: 1, icon: RotateCcw, color: 'bg-orange-500' },
    { label: 'In Procurement', count: 4, icon: Truck, color: 'bg-purple-500' },
    { label: 'Completed', count: 1, icon: Award, color: 'bg-green-500' },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Lead Dashboard</h1>
          <p className="text-xs text-gray-500">Track and manage your team's IT procurement requests.</p>
        </div>
        <Link
          to="/portal/team_lead/create-request"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-md transition-all"
        >
          <PlusCircle size={18} /> Create Request
        </Link>
      </div>

      {/* 7 Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg ${c.color} text-white flex items-center justify-center`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{c.count}</p>
                <p className="text-xs font-medium text-gray-500">{c.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Need new IT Hardware or Subscriptions?</h2>
          <p className="text-xs text-blue-100 mt-1">Submit purchase requests and track multi-level approvals in real-time.</p>
        </div>
        <Link
          to="/portal/team_lead/create-request"
          className="bg-white text-blue-700 px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-50 transition-colors"
        >
          New Purchase Request
        </Link>
      </div>
    </div>
  )
}
