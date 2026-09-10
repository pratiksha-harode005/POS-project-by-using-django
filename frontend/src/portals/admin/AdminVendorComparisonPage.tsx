import React from 'react'
import { GitCompare, Award, CheckCircle } from 'lucide-react'

export const AdminVendorComparisonPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GitCompare className="text-blue-600" /> Vendor Quotation Comparison
        </h1>
        <p className="text-xs text-gray-500">Compare vendor proposals side-by-side on price, lead time, warranty, and terms.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Comparison Matrix for RFQ-2026-001 (Engineering Laptops)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Vendor A */}
          <div className="p-5 bg-blue-50/50 rounded-2xl border-2 border-blue-600 space-y-3 relative">
            <span className="absolute top-4 right-4 bg-blue-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
              <Award size={12} /> Recommended
            </span>
            <h3 className="font-bold text-gray-900 text-sm">Dell Technologies</h3>
            <div className="space-y-1 text-gray-700">
              <p>Quotation Price: <strong className="text-gray-900 text-base">$35,000.00</strong></p>
              <p>Delivery Days: <strong className="text-gray-900">7 Days</strong></p>
              <p>Warranty: <strong className="text-gray-900">36 Months Onsite</strong></p>
              <p>Payment Terms: <strong className="text-gray-900">Net 30</strong></p>
            </div>
            <button className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg shadow">
              Select Quotation & Generate PO
            </button>
          </div>

          {/* Vendor B */}
          <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">HP Enterprise</h3>
            <div className="space-y-1 text-gray-700">
              <p>Quotation Price: <strong className="text-gray-900 text-base">$38,500.00</strong></p>
              <p>Delivery Days: <strong className="text-gray-900">14 Days</strong></p>
              <p>Warranty: <strong className="text-gray-900">24 Months Onsite</strong></p>
              <p>Payment Terms: <strong className="text-gray-900">Net 15</strong></p>
            </div>
            <button className="w-full mt-2 bg-gray-200 text-gray-600 font-bold py-2 rounded-lg cursor-not-allowed">
              Alternative Option
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
