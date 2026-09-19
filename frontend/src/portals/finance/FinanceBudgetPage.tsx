import React, { useState, useMemo, useEffect } from 'react'
import {
  CreditCard, Landmark, TrendingUp, Clock, CheckCircle2, AlertTriangle,
  Search, Filter, ArrowRight, Download, Eye, ChevronRight, X, Layers
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useFinanceData, BudgetDepartment } from '../../context/ManagerDataContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export const FinanceBudgetPage: React.FC = () => {
  const { budgets, financeKPIs } = useFinanceData()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryDept = searchParams.get('dept') || 'ALL'

  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState(queryDept)
  const [selectedBudget, setSelectedBudget] = useState<BudgetDepartment | null>(null)

  useEffect(() => {
    const d = searchParams.get('dept')
    if (d) setDeptFilter(d)
  }, [searchParams])

  const handleDeptChange = (newDept: string) => {
    setDeptFilter(newDept)
    if (newDept === 'ALL') {
      searchParams.delete('dept')
      setSearchParams(searchParams)
    } else {
      setSearchParams({ ...Object.fromEntries(searchParams.entries()), dept: newDept })
    }
  }

  // Filtered budgets
  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      const matchSearch =
        b.department.toLowerCase().includes(search.toLowerCase()) ||
        b.category.toLowerCase().includes(search.toLowerCase())
      const matchDept = deptFilter === 'ALL' || b.department === deptFilter
      return matchSearch && matchDept
    })
  }, [budgets, search, deptFilter])

  const departments = useMemo(() => {
    return Array.from(new Set(budgets.map((b) => b.department)))
  }, [budgets])

  const utilizationRate = (
    (financeKPIs.spentBudget / (financeKPIs.totalBudget || 1)) *
    100
  ).toFixed(1)

  return (
    <div className="max-w-7xl mx-auto space-y-7 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              FISCAL CONTROL
            </span>
            <span className="text-xs text-slate-400 font-medium">FY2026-2027 Corporate Allocation</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Budget Overview & Spend Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor allocated budgets, active purchase commitments, settled expenditures, and net available capital.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const rows = [
                ['Department', 'Category', 'Total Budget', 'Allocated', 'Committed', 'Spent', 'Available', 'Utilization %'],
                ...budgets.map((b) => [
                  b.department,
                  b.category,
                  b.totalBudget,
                  b.allocated,
                  b.committed,
                  b.spent,
                  b.available,
                  `${((b.spent / b.totalBudget) * 100).toFixed(1)}%`,
                ]),
              ]
              const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
              const encodedUri = encodeURI(csvContent)
              const link = document.createElement('a')
              link.setAttribute('href', encodedUri)
              link.setAttribute('download', 'budget_overview_report.csv')
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-all"
          >
            <Download size={14} className="text-slate-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Top 6 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 block uppercase">Total Budget</span>
          <p className="text-lg font-black text-slate-900 mt-1">{fmt(financeKPIs.totalBudget)}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Full Board Cap</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-indigo-600 block uppercase">Allocated</span>
          <p className="text-lg font-black text-indigo-950 mt-1">{fmt(financeKPIs.allocatedBudget)}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Assigned to Depts</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-amber-600 block uppercase">Committed</span>
          <p className="text-lg font-black text-amber-700 mt-1">{fmt(financeKPIs.committedBudget)}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">In Flight POs</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-blue-600 block uppercase">Spent</span>
          <p className="text-lg font-black text-blue-700 mt-1">{fmt(financeKPIs.spentBudget)}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Invoices Cleared</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-emerald-600 block uppercase">Available</span>
          <p className="text-lg font-black text-emerald-700 mt-1">{fmt(financeKPIs.availableBudget)}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Net Liquidity</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-purple-600 block uppercase">Utilization %</span>
          <p className="text-lg font-black text-purple-700 mt-1">{utilizationRate}%</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Pace Target: &lt;75%</span>
        </div>
      </div>

      {/* Budget Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Filter / Search Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search department or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500 font-semibold">Department:</span>
            <select
              value={deptFilter}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Table based on SubTab */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Department</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Total Budget</th>
                <th className="p-4 text-right">Allocated</th>
                <th className="p-4 text-right">Committed</th>
                <th className="p-4 text-right">Spent</th>
                <th className="p-4 text-right">Available</th>
                <th className="p-4">Utilization</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredBudgets.map((b, idx) => {
                const util = Math.min(100, Math.round((b.spent / b.totalBudget) * 100))
                const isOver = util > 80
                const isCaution = util > 65

                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{b.department}</td>
                    <td className="p-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                        {b.category}
                      </span>
                    </td>
                    <td className="p-4 text-right font-extrabold text-slate-900">{fmt(b.totalBudget)}</td>
                    <td className="p-4 text-right font-semibold text-indigo-700">{fmt(b.allocated)}</td>
                    <td className="p-4 text-right font-semibold text-amber-700">{fmt(b.committed)}</td>
                    <td className="p-4 text-right font-semibold text-blue-700">{fmt(b.spent)}</td>
                    <td className="p-4 text-right font-black text-emerald-700">{fmt(b.available)}</td>
                    <td className="p-4 w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOver ? 'bg-rose-500' : isCaution ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${util}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 w-8 text-right">
                          {util}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isOver
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isCaution
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isOver ? 'Critical' : isCaution ? 'Caution' : 'Optimal'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedBudget(b)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Eye size={12} />
                        Details
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drilldown Modal */}
      {selectedBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Landmark className="text-indigo-600" size={20} />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {selectedBudget.department} — {selectedBudget.category}
                  </h3>
                  <p className="text-[11px] text-slate-500">Full Fiscal Allocation Drilldown</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBudget(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Budget Cap</span>
                <span className="text-base font-extrabold text-slate-900 mt-1 block">
                  {fmt(selectedBudget.totalBudget)}
                </span>
              </div>
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <span className="text-indigo-600 block text-[10px] uppercase font-bold">Allocated Funds</span>
                <span className="text-base font-extrabold text-indigo-900 mt-1 block">
                  {fmt(selectedBudget.allocated)}
                </span>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                <span className="text-amber-700 block text-[10px] uppercase font-bold">Active PO Commitments</span>
                <span className="text-base font-extrabold text-amber-900 mt-1 block">
                  {fmt(selectedBudget.committed)}
                </span>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <span className="text-blue-700 block text-[10px] uppercase font-bold">Realized Expenditures</span>
                <span className="text-base font-extrabold text-blue-900 mt-1 block">
                  {fmt(selectedBudget.spent)}
                </span>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Available Liquidity</span>
                <p className="text-xs text-emerald-700 mt-0.5">Ready for new PO authorisations</p>
              </div>
              <span className="text-xl font-black text-emerald-800">{fmt(selectedBudget.available)}</span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedBudget(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all"
              >
                Close Drilldown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
