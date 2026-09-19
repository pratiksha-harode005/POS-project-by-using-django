import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Landmark, CreditCard, AlertCircle, CheckCircle } from 'lucide-react'

export const FinanceDashboard: React.FC = () => {
  const budgetData = [
    { name: 'Spent', value: 85000, color: '#2563EB' },
    { name: 'Committed', value: 120000, color: '#7C3AED' },
    { name: 'Available', value: 295000, color: '#16A34A' },
  ]

  const invoiceData = [
    { name: 'Paid Amount', value: 42000, color: '#16A34A' },
    { name: 'Pending Invoice', value: 35000, color: '#D97706' },
    { name: 'Invoice Exceptions', value: 12000, color: '#DC2626' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Finance Overview Dashboard</h1>
        <p className="text-xs text-gray-500">Financial allocation, committed spend, 3-way matching exceptions & payments queue.</p>
      </div>

      {/* Graph/Pie Chart Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Budget Allocation Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Landmark size={20} className="text-blue-600" /> Budget Utilization Breakdown
          </h2>
          <p className="text-xs text-gray-500 mb-4">Total Budget: RS 500,000.00</p>

          <div className="h-52 w-full flex items-center justify-between">
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie data={budgetData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={4}>
                  {budgetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `RS {value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>

            <div className="w-[40%] space-y-2 text-xs">
              <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-gray-500 block">Spent</span>
                <span className="font-bold text-blue-700">RS 85,000.00</span>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                <span className="text-gray-500 block">Committed</span>
                <span className="font-bold text-purple-700">RS 120,000.00</span>
              </div>
              <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                <span className="text-gray-500 block">Available</span>
                <span className="font-bold text-green-700">RS 295,000.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Invoices & Payments Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
            <CreditCard size={20} className="text-green-600" /> Invoices & Payments Status
          </h2>
          <p className="text-xs text-gray-500 mb-4">Invoice Pipeline & Exceptions</p>

          <div className="h-52 w-full flex items-center justify-between">
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie data={invoiceData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={4}>
                  {invoiceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `RS {value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>

            <div className="w-[40%] space-y-2 text-xs">
              <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                <span className="text-gray-500 block">Paid Amount</span>
                <span className="font-bold text-green-700">RS 42,000.00</span>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-gray-500 block">Pending Invoice</span>
                <span className="font-bold text-amber-700">RS 35,000.00</span>
              </div>
              <div className="p-2 bg-red-50 rounded-lg border border-red-200">
                <span className="text-gray-500 block">Exceptions</span>
                <span className="font-bold text-red-700">RS 12,000.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
