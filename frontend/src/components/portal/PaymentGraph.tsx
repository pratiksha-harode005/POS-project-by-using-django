import React, { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import { TrendingUp, AlertCircle, ArrowUpRight } from 'lucide-react'

export type Period = 'weekly' | 'monthly' | 'yearly'

export interface PaymentDataPoint {
  period: string
  approved: number
  paid: number
  pending: number
}

export interface PaymentGraphProps {
  data: { weekly: PaymentDataPoint[]; monthly: PaymentDataPoint[]; yearly: PaymentDataPoint[] }
  loading?: boolean
}

const fmt = (v: number) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`
  return `₹${v.toLocaleString('en-IN')}`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null

  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0)

  return (
    <div className="bg-slate-900 text-white rounded-xl shadow-xl p-3 text-xs min-w-[190px] border border-slate-800">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <span className="font-semibold text-slate-200">{label}</span>
        <span className="text-[10px] text-slate-400 font-medium">Activity</span>
      </div>

      <div className="space-y-1.5">
        {payload.map((p: any) => (
          <div key={p.name} className="flex justify-between items-center gap-4">
            <span className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.fill }}
              />
              <span className="text-slate-300 capitalize text-[11px]">{p.name}</span>
            </span>
            <span className="font-bold text-white font-mono">{fmt(p.value)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-800 mt-2.5 pt-2 flex justify-between items-center text-[11px]">
        <span className="text-slate-400 font-medium">Total Volume</span>
        <span className="font-bold text-indigo-300 font-mono">{fmt(total)}</span>
      </div>
    </div>
  )
}

export const PaymentGraph: React.FC<PaymentGraphProps> = ({ data, loading }) => {
  const [period, setPeriod] = useState<Period>('monthly')
  const chartData = data ? data[period] || [] : []

  // Pre-calculated period sums for the summary row
  const totals = chartData.reduce(
    (acc, d) => ({
      approved: acc.approved + d.approved,
      paid: acc.paid + d.paid,
      pending: acc.pending + d.pending,
    }),
    { approved: 0, paid: 0, pending: 0 }
  )

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="flex justify-between">
            <div className="h-5 bg-slate-200 rounded w-48" />
            <div className="h-8 bg-slate-200 rounded-lg w-44" />
          </div>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="h-14 bg-slate-100 rounded-xl" />
            <div className="h-14 bg-slate-100 rounded-xl" />
            <div className="h-14 bg-slate-100 rounded-xl" />
          </div>
          <div className="h-56 bg-slate-50 rounded-xl mt-4" />
        </div>
      </div>
    )
  }

  const isEmpty = !chartData.length || chartData.every(d => d.approved === 0 && d.paid === 0 && d.pending === 0)

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:border-slate-300/80 transition-colors">
      {/* Header: Title, Subtitle, and Period Controls */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Payment Analytics</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Approved, paid and pending payment activity</p>
        </div>

        {/* Period Selector Tabs (Quiet, Linear-style segmented control) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/60">
          {(['weekly', 'monthly', 'yearly'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                period === p
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Top Metrics Row — Typography Hierarchy (No loud saturated cards) */}
      <div className="grid grid-cols-3 gap-4 pb-5 mb-5 border-b border-slate-100">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Approved</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight font-mono">
            {fmt(totals.approved)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5">Budget committed</span>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Paid</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight font-mono">
            {fmt(totals.paid)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5">Disbursed to vendors</span>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight font-mono">
            {fmt(totals.pending)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5">Under invoice review</span>
        </div>
      </div>

      {/* Chart Area */}
      {isEmpty ? (
        <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <AlertCircle size={24} className="text-slate-300 mb-1.5" />
          <p className="font-semibold text-slate-600">No payment data recorded</p>
          <p className="text-[11px] text-slate-400">Payment activities will appear as invoices are processed.</p>
        </div>
      ) : (
        <div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                barCategoryGap="28%"
                barGap={4}
              >
                <CartesianGrid strokeDasharray="2 4" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                  dy={4}
                />
                <YAxis
                  tickFormatter={fmt}
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(79, 70, 229, 0.03)' }}
                />
                <Bar
                  dataKey="approved"
                  name="approved"
                  fill="#4F46E5"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="paid"
                  name="paid"
                  fill="#10B981"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="pending"
                  name="pending"
                  fill="#F59E0B"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Clean minimalist Legend */}
          <div className="flex items-center justify-end gap-6 pt-3 mt-1 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
              <span className="text-slate-600 font-medium">Approved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span className="text-slate-600 font-medium">Paid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span className="text-slate-600 font-medium">Pending</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
