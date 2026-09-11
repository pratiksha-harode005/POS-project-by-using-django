import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Shield, FileText, Users, Building, Sliders, Truck, DollarSign } from 'lucide-react'

export const AdminDashboard: React.FC = () => {
  const requestStats = [
    { label: 'Total Requests', count: 18, color: 'bg-blue-500' },
    { label: 'Pending Requests', count: 4, color: 'bg-amber-500' },
    { label: 'Approval Requests', count: 3, color: 'bg-indigo-500' },
    { label: 'Rejected Requests', count: 2, color: 'bg-red-500' },
    { label: 'Returned Requests', count: 1, color: 'bg-orange-500' },
    { label: 'In Procurement', count: 6, color: 'bg-purple-500' },
    { label: 'Completed', count: 2, color: 'bg-green-500' },
  ]

  const budgetLevelData = [
    { name: 'Manager Level', value: 50000, color: '#3B82F6' },
    { name: 'Finance Level', value: 250000, color: '#8B5CF6' },
    { name: 'Admin Level', value: 1000000, color: '#10B981' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="text-amber-500" /> Admin System Overview Dashboard
        </h1>
        <p className="text-xs text-gray-500">Global system metrics, role budget approval limits & system-wide procurement status.</p>
      </div>

      {/* 7 Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {requestStats.map((s) => (
          <div key={s.label} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className={`w-3 h-10 rounded-full ${s.color}`} />
            <div>
              <p className="text-xl font-bold text-gray-900">{s.count}</p>
              <p className="text-xs font-medium text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Budget Breakdown by Manager / Finance / Admin level */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
          <DollarSign size={20} className="text-emerald-600" /> Approval Threshold Limits by Role Level
        </h2>
        <p className="text-xs text-gray-500 mb-4">Max approval limit configured for Manager, Finance, and Admin tiers.</p>

        <div className="h-56 w-full flex items-center justify-between">
          <ResponsiveContainer width="50%" height="100%">
            <PieChart>
              <Pie data={budgetLevelData} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={4}>
                {budgetLevelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(val: any) => `$${val.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>

          <div className="w-[45%] space-y-3 text-xs">
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <span className="text-gray-500 font-semibold block">Manager Approval Limit</span>
              <span className="text-base font-extrabold text-blue-700">$50,000.00 / request</span>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
              <span className="text-gray-500 font-semibold block">Finance Approval Limit</span>
              <span className="text-base font-extrabold text-purple-700">$250,000.00 / request</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-gray-500 font-semibold block">Admin Approval Limit</span>
              <span className="text-base font-extrabold text-emerald-700">$1,000,000.00+ / request</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
