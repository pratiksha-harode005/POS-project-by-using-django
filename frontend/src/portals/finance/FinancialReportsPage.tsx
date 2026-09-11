import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FileCheck } from 'lucide-react'

export const FinancialReportsPage: React.FC = () => {
  const trendData = [
    { month: 'Apr', spend: 32000 },
    { month: 'May', spend: 45000 },
    { month: 'Jun', spend: 28000 },
    { month: 'Jul', spend: 62000 },
    { month: 'Aug', spend: 54000 },
    { month: 'Sep', spend: 85000 },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileCheck className="text-blue-600" /> Financial Reports & Analytics
        </h1>
        <p className="text-xs text-gray-500">Spend by category/department, budget utilization & procurement trends.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-4">Monthly Spend Trend (USD)</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
              <Bar dataKey="spend" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
