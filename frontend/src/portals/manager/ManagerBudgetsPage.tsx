import React from 'react'
import { CreditCard, TrendingDown, AlertCircle } from 'lucide-react'
import { useManagerData } from '../../context/ManagerDataContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export const ManagerBudgetsPage: React.FC = () => {
  const { budgets } = useManagerData()

  const totalBudget = budgets.reduce((s, b) => s + b.totalBudget, 0)
  const totalAllocated = budgets.reduce((s, b) => s + b.allocated, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const totalPending = budgets.reduce((s, b) => s + b.pending, 0)
  const totalRemaining = totalBudget - totalSpent - totalPending

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="text-blue-600" size={24} /> Department Budgets & Spend Limits
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">Breakdown of allocated, committed, and remaining budget by department & category.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Budget (FY2026)', value: fmt(totalBudget), color: 'text-gray-900', bg: 'bg-white', border: 'border-gray-200' },
          { label: 'Total Allocated', value: fmt(totalAllocated), color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'Spent + Committed', value: fmt(totalSpent), color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
          { label: 'Remaining Available', value: fmt(totalRemaining), color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
        ].map(c => (
          <div key={c.label} className={`p-5 rounded-2xl border ${c.border} ${c.bg} shadow-sm`}>
            <p className="text-xs font-semibold text-gray-500">{c.label}</p>
            <p className={`text-xl font-black mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Budget Breakdown Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-4">Budget by Department & Category</h2>
        <div className="space-y-4">
          {budgets.map(b => {
            const utilPct = Math.round((b.spent / b.totalBudget) * 100)
            const pendingPct = Math.round((b.pending / b.totalBudget) * 100)
            const isHigh = utilPct + pendingPct > 80
            return (
              <div key={`${b.department}-${b.category}`} className={`p-4 rounded-xl border text-xs space-y-2.5 ${isHigh ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <span className="font-bold text-gray-900">{b.department}</span>
                    <span className="text-gray-500 ml-2">· {b.category}</span>
                    {isHigh && (
                      <span className="ml-2 text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200 flex items-center gap-1 inline-flex">
                        <AlertCircle size={9} /> High Utilization
                      </span>
                    )}
                  </div>
                  <div className="text-right text-[11px] space-x-4">
                    <span className="text-gray-500">Budget: <b className="text-gray-900">{fmt(b.totalBudget)}</b></span>
                    <span className="text-red-600">Spent: <b>{fmt(b.spent)}</b></span>
                    <span className="text-amber-600">Pending: <b>{fmt(b.pending)}</b></span>
                    <span className="text-green-700">Available: <b>{fmt(b.totalBudget - b.spent - b.pending)}</b></span>
                  </div>
                </div>

                {/* Progress Bar: Spent + Pending + Available */}
                <div className="w-full h-2 rounded-full overflow-hidden bg-gray-200 flex">
                  <div className="bg-blue-600 h-full transition-all" style={{ width: `${utilPct}%` }} />
                  <div className="bg-amber-400 h-full transition-all" style={{ width: `${pendingPct}%` }} />
                </div>
                <div className="flex gap-4 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" /> Spent {utilPct}%</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Pending {pendingPct}%</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-200 inline-block" /> Available {100 - utilPct - pendingPct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
