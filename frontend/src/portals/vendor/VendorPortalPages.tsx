import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Truck, FileSpreadsheet, Layers, Package, FileCheck, FileText, CreditCard, FolderOpen, AlertCircle } from 'lucide-react'

export const VendorDashboard: React.FC = () => {
  const { user } = useAuth()
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-pink-600 to-rose-700 text-white rounded-2xl p-6 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">
              VENDOR PORTAL • ISOLATED ACCESS
            </span>
            <h1 className="text-2xl font-black mt-2">Welcome, {user?.first_name || 'Vendor Partner'}</h1>
            <p className="text-xs text-pink-100 mt-1">
              Vendor ID: <strong>{user?.vendor_id_code || 'VND-HW-001'}</strong> • Dell Technologies
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl text-center border border-white/20">
            <span className="text-[10px] uppercase font-bold block text-pink-100">Performance Score</span>
            <span className="text-2xl font-black text-white">95.5%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 font-semibold block">Open RFQs</span>
          <span className="text-xl font-bold text-gray-900">2 Pending Quotes</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 font-semibold block">Submitted Quotes</span>
          <span className="text-xl font-bold text-purple-600">5 Submitted</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 font-semibold block">Confirmed POs</span>
          <span className="text-xl font-bold text-blue-600">3 Active POs</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 font-semibold block">Payment Disbursed</span>
          <span className="text-xl font-bold text-green-600">$42,000.00</span>
        </div>
      </div>
    </div>
  )
}

export const VendorRFQsPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'new' | 'open' | 'expired'>('open')

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileSpreadsheet className="text-pink-600" /> Bidding RFQs (Isolated View)
        </h1>
        <p className="text-xs text-gray-500">Only RFQs where your Vendor ID (VND-HW-001) is invited are listed here.</p>
      </div>

      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2">
        {[
          { id: 'new', label: 'New RFQs' },
          { id: 'open', label: 'Open RFQs' },
          { id: 'expired', label: 'Expired RFQs' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${
              subTab === t.id
                ? 'border-pink-600 text-pink-600 bg-pink-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-b-2xl border border-gray-200 shadow-sm text-xs space-y-4">
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              RFQ-2026-001
            </span>
            <h3 className="text-sm font-bold text-gray-900 mt-1">10 High Performance Developer Laptops</h3>
            <p className="text-gray-500 mt-0.5">Deadline: 2026-09-18 • Delivery: Pune HQ</p>
          </div>
          <button className="bg-pink-600 hover:bg-pink-700 text-white font-bold px-4 py-2 rounded-lg shadow">
            Submit Quotation Proposal
          </button>
        </div>
      </div>
    </div>
  )
}

export const VendorQuotationsPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'draft' | 'submitted' | 'selected' | 'rejected'>('submitted')

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Layers className="text-pink-600" /> Quotations History
        </h1>
        <p className="text-xs text-gray-500">Track status of your submitted bids.</p>
      </div>

      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2">
        {[
          { id: 'draft', label: 'Draft' },
          { id: 'submitted', label: 'Submitted' },
          { id: 'selected', label: 'Selected' },
          { id: 'rejected', label: 'Rejected' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${
              subTab === t.id
                ? 'border-pink-600 text-pink-600 bg-pink-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-b-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
            <tr>
              <th className="p-4">Quotation ID</th>
              <th className="p-4">RFQ Ref</th>
              <th className="p-4">Quoted Price</th>
              <th className="p-4">Lead Time</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            <tr>
              <td className="p-4 font-bold text-pink-600">QUO-2026-001</td>
              <td className="p-4 text-gray-600">RFQ-2026-001</td>
              <td className="p-4 font-black text-gray-900">$35,000.00</td>
              <td className="p-4 text-gray-700">7 Days</td>
              <td className="p-4 font-bold text-green-600">Selected</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
