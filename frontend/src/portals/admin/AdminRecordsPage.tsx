import React from 'react'
import { Package, FileCheck, FolderOpen } from 'lucide-react'

export const AdminRecordsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders, Goods Receipts & Contracts</h1>
        <p className="text-xs text-gray-500">Centralized document & order record management screens.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 font-bold text-blue-600">
            <Package size={18} /> Purchase Orders
          </div>
          <p className="text-gray-500">Total Issued POs: <strong>14</strong></p>
          <p className="text-gray-500">Active Procurement Value: <strong>RS 185,000.00</strong></p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 font-bold text-green-600">
            <FileCheck size={18} /> Goods Receipts
          </div>
          <p className="text-gray-500">Verified Deliveries: <strong>12</strong></p>
          <p className="text-gray-500">Pending Deliveries: <strong>2</strong></p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 font-bold text-purple-600">
            <FolderOpen size={18} /> Active Vendor Contracts
          </div>
          <p className="text-gray-500">Active Contracts: <strong>8</strong></p>
          <p className="text-gray-500">Expiring in 30 Days: <strong>1</strong></p>
        </div>
      </div>
    </div>
  )
}
