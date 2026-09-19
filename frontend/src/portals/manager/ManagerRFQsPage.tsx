import React, { useState, useEffect } from 'react'
import { FileSpreadsheet, Calendar, Truck, Clock, Download, Paperclip, CheckCircle } from 'lucide-react'
import { getAllStoredVendorQuotes, downloadGoodsReceiptDocument } from '../vendor/VendorPortalPages'

export const ManagerRFQsPage: React.FC = () => {
  const [storedQuotes, setStoredQuotes] = useState<any[]>([])

  useEffect(() => {
    setStoredQuotes(getAllStoredVendorQuotes())
  }, [])

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

  const seedProposals = [
    {
      id: 'QUO-SEED-001',
      vendorId: 'VND-HW-001',
      vendorName: 'Dell Technologies',
      rfqRef: 'RFQ-2026-001',
      grnDocNumber: 'GRN-2026-VNDHW001-001',
      receiptNumber: 'RCP-88392',
      issueDate: '2026-09-12',
      expiryDate: '2026-10-12',
      baseAmount: 29661,
      gstPercent: 18,
      gstAmount: 5339,
      totalAmount: 35000,
      quotedPrice: 35000,
      leadTime: '7 Days',
      expectedDeliveryDate: '2026-09-25',
      notes: 'Includes 3-year OEM onsite warranty.',
      grnDocName: 'Goods_Receipt_GRN-2026-VNDHW001-001.pdf',
      status: 'Submitted',
    },
  ]

  const allQuotes = [...storedQuotes, ...seedProposals]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileSpreadsheet className="text-blue-600" /> Requests for Quotation (RFQs) & Goods Receipts
        </h1>
        <p className="text-xs text-gray-500">
          Track invited vendors, bidding deadlines, terms, and received Goods Receipt (GRN) proposals.
        </p>
      </div>

      <div className="space-y-6">
        {rfqs.map((r) => {
          const rfqQuotes = allQuotes.filter((q) => q.rfqRef === r.id || !q.rfqRef)

          return (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
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

              <h2 className="text-base font-bold text-gray-900">{r.title}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
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

              {/* RECEIVED GOODS RECEIPTS & QUOTATION PROPOSALS SECTION */}
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet size={15} className="text-blue-600" /> Received Goods Receipts & Proposals ({rfqQuotes.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rfqQuotes.map((quote, idx) => {
                    const baseAmt = typeof quote.baseAmount === 'number' ? quote.baseAmount : (quote.quotedPrice || 0)
                    const gstPct = typeof quote.gstPercent === 'number' ? quote.gstPercent : 18
                    const gstAmt = typeof quote.gstAmount === 'number' ? quote.gstAmount : (baseAmt * gstPct / 100)
                    const totalAmt = typeof quote.totalAmount === 'number' ? quote.totalAmount : (baseAmt + gstAmt)

                    return (
                      <div key={quote.id || idx} className="bg-blue-50/40 rounded-xl border border-blue-200 p-4 space-y-3 text-xs">
                        <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                          <div>
                            <span className="font-bold text-gray-900 text-xs block">{quote.vendorName || quote.vendorId}</span>
                            <span className="text-[10px] text-gray-500 font-medium">Ref: {quote.id}</span>
                          </div>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                            {quote.status || 'Submitted'}
                          </span>
                        </div>

                        {/* Financial & GRN breakdown */}
                        <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-gray-200 text-[11px]">
                          <div>
                            <span className="text-gray-400 font-semibold block text-[9px] uppercase">Base Amount</span>
                            <span className="font-bold text-gray-900">RS {baseAmt.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 font-semibold block text-[9px] uppercase">GST ({gstPct}%)</span>
                            <span className="font-bold text-amber-700">RS {gstAmt.toLocaleString()}</span>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-gray-100 flex justify-between items-center">
                            <span className="font-bold text-blue-900">Total Quoted Price:</span>
                            <span className="font-black text-blue-700 text-sm">RS {totalAmt.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Attached Goods Receipt File Download */}
                        <div className="bg-white p-2 rounded-lg border border-blue-200 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-blue-900">Attached GRN Document</span>
                            <span className="text-gray-500">{quote.grnDocNumber || 'GRN-ATTACHED'}</span>
                          </div>
                          <button
                            onClick={() => downloadGoodsReceiptDocument(quote)}
                            className="w-full px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded border border-blue-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                          >
                            <Paperclip size={12} className="text-blue-600" />
                            {quote.grnDocName || `Goods_Receipt_${quote.grnDocNumber || quote.id}.pdf`}
                            <Download size={12} className="ml-1 opacity-70" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
