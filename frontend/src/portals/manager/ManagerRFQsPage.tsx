import React from 'react'
import { FileSpreadsheet, Calendar, Truck, Clock } from 'lucide-react'

export const ManagerRFQsPage: React.FC = () => {
  const rfqs = [
    {
      id: 'RFQ-2026-001',
      title: 'RFQ - High Performance Engineering Laptops',
      reqId: 'REQ-DEMO-001',
      deadline: '2026-09-18',
      invitedVendors: ['Dell Technologies', 'HP Enterprise', 'Lenovo India'],
      terms: 'Net 30 payment terms, 3-year onsite warranty required.',
      status: 'Open',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileSpreadsheet className="text-blue-600" /> Requests for Quotation (RFQs)
        </h1>
        <p className="text-xs text-gray-500">Track invited vendors, bidding deadlines, terms, and quotation status.</p>
      </div>

      <div className="space-y-4">
        {rfqs.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  {r.id}
                </span>
                <span className="text-xs font-semibold text-gray-700">Request: {r.reqId}</span>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                {r.status}
              </span>
            </div>

            <h2 className="text-base font-bold text-gray-900 mb-2">{r.title}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200 mb-3">
              <div>
                <span className="text-gray-500 font-semibold block mb-1 flex items-center gap-1">
                  <Truck size={14} /> Invited Vendors
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {r.invitedVendors.map((v) => (
                    <span key={v} className="bg-white px-2 py-0.5 rounded border border-gray-300 font-bold text-gray-800">
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-gray-500 font-semibold block mb-1 flex items-center gap-1">
                  <Calendar size={14} /> Bidding Deadline
                </span>
                <span className="font-bold text-gray-900">{r.deadline}</span>
              </div>
            </div>

            <div className="text-xs">
              <span className="font-bold text-gray-700">Terms & Conditions: </span>
              <span className="text-gray-600">{r.terms}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
