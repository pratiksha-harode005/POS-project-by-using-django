import React, { useState } from 'react'
import { CreditCard, IndianRupee, CheckCircle } from 'lucide-react'

export const FinanceBudgetPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'overview' | 'allocated' | 'committed' | 'available'>('overview')

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Finance Budget Management</h1>
        <p className="text-xs text-gray-500">Corporate budget allocation, committed purchase orders & available funds.</p>
      </div>

      {/* 4 Sub-Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2">
        {[
          { id: 'overview', label: 'Budget Overview' },
          { id: 'allocated', label: 'Allocated' },
          { id: 'committed', label: 'Committed' },
          { id: 'available', label: 'Available' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${
              subTab === t.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-Tab Content */}
      <div className="bg-white p-6 rounded-b-2xl border border-gray-200 shadow-sm text-xs">
        {subTab === 'overview' && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-sm">FY2026 Fiscal Year Budget Overview</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-gray-500 block">Total Allocated</span>
                <span className="text-lg font-black text-gray-900">RS 500,000.00</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-gray-500 block">Total Committed</span>
                <span className="text-lg font-black text-purple-600">RS 120,000.00</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-gray-500 block">Total Available</span>
                <span className="text-lg font-black text-green-600">RS 295,000.00</span>
              </div>
            </div>
          </div>
        )}

        {subTab === 'allocated' && (
          <div>
            <h2 className="font-bold text-gray-900 text-sm mb-3">Allocated Budgets by Department</h2>
            <p className="text-gray-500 mb-4">IT & Infrastructure: RS 500,000.00 • Operations: RS 200,000.00 • HR: RS 100,000.00</p>
          </div>
        )}

        {subTab === 'committed' && (
          <div>
            <h2 className="font-bold text-gray-900 text-sm mb-3">Committed PO Funds</h2>
            <p className="text-gray-500 mb-4">RS 120,000.00 tied to active POs awaiting delivery and 3-way match.</p>
          </div>
        )}

        {subTab === 'available' && (
          <div>
            <h2 className="font-bold text-gray-900 text-sm mb-3">Uncommitted Available Balance</h2>
            <p className="text-gray-500 mb-4">RS 295,000.00 ready for new purchase request approvals.</p>
          </div>
        )}
      </div>
    </div>
  )
}
