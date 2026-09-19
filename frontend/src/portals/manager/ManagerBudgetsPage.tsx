import React from 'react'
import { CreditCard, PieChart } from 'lucide-react'

export const ManagerBudgetsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="text-blue-600" /> Department Budgets & Spend Limits
        </h1>
        <p className="text-xs text-gray-500">Breakdown of allocated, committed, and remaining budget by department & category.</p>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Total Allocated Budget (FY2026)</p>
          <p className="text-2xl font-black text-gray-900 mt-1">RS 500,000.00</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Spent + Committed</p>
          <p className="text-2xl font-black text-purple-600 mt-1">RS 205,000.00</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Remaining Available Budget</p>
          <p className="text-2xl font-black text-green-600 mt-1">RS 295,000.00</p>
        </div>
      </div>

      {/* Department & Category Breakdown Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-4">Budget Breakdown by Category</h2>
        <div className="space-y-4 text-xs">
          {[
            { category: 'IT Hardware', total: 'RS 250,000.00', spent: 'RS 120,000.00', remaining: 'RS 130,000.00', pct: 48 },
            { category: 'SaaS & Cloud', total: 'RS 180,000.00', spent: 'RS 60,000.00', remaining: 'RS 120,000.00', pct: 33 },
            { category: 'Office Accessories & Ops', total: 'RS 70,000.00', spent: 'RS 25,000.00', remaining: 'RS 45,000.00', pct: 35 },
          ].map((b) => (
            <div key={b.category} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="flex justify-between font-bold text-gray-900">
                <span>{b.category}</span>
                <span>Spent: {b.spent} / Total: {b.total}</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${b.pct}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>{b.pct}% budget utilized</span>
                <span className="font-semibold text-green-700">Available: {b.remaining}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
