import React from 'react'
import { GitCompare, CheckCircle, AlertTriangle, FileText, Package, Receipt } from 'lucide-react'

export const ManagerThreeWayMatchingPage: React.FC = () => {
  const matches = [
    {
      id: '3WM-2026-001',
      reqId: 'REQ-DEMO-001',
      poId: 'PO-2026-001',
      poAmount: '$35,000.00',
      receiptId: 'REC-2026-001',
      receiptQty: '10 Laptops (Verified)',
      invId: 'INV-2026-001',
      invAmount: '$35,000.00',
      status: 'Matched',
      variance: 'None ($0.00 variance)',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GitCompare className="text-blue-600" /> 3-Way Matching Verification
        </h1>
        <p className="text-xs text-gray-500">
          Comparing Purchase Order, Goods Receipt, and Vendor Invoice for requests under your management.
        </p>
      </div>

      <div className="space-y-6">
        {matches.map((m) => (
          <div key={m.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                  {m.id}
                </span>
                <span className="text-xs font-semibold text-gray-700">Request: {m.reqId}</span>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full flex items-center gap-1">
                <CheckCircle size={14} /> {m.status}
              </span>
            </div>

            {/* 3-Column Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* PO */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 font-bold text-gray-900 mb-2">
                  <Package size={16} className="text-blue-600" /> 1. Purchase Order
                </div>
                <p className="text-gray-500">PO ID: <span className="font-semibold text-gray-800">{m.poId}</span></p>
                <p className="text-gray-500 mt-1">PO Amount: <span className="font-bold text-gray-900">{m.poAmount}</span></p>
              </div>

              {/* Receipt */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 font-bold text-gray-900 mb-2">
                  <Receipt size={16} className="text-green-600" /> 2. Goods Receipt
                </div>
                <p className="text-gray-500">Receipt ID: <span className="font-semibold text-gray-800">{m.receiptId}</span></p>
                <p className="text-gray-500 mt-1">Status: <span className="font-bold text-green-700">{m.receiptQty}</span></p>
              </div>

              {/* Invoice */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 font-bold text-gray-900 mb-2">
                  <FileText size={16} className="text-purple-600" /> 3. Vendor Invoice
                </div>
                <p className="text-gray-500">Invoice ID: <span className="font-semibold text-gray-800">{m.invId}</span></p>
                <p className="text-gray-500 mt-1">Invoice Amount: <span className="font-bold text-gray-900">{m.invAmount}</span></p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500">Variance Analysis: <strong className="text-gray-800">{m.variance}</strong></span>
              <span className="text-green-600 font-bold">100% 3-Way Match Verified</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
