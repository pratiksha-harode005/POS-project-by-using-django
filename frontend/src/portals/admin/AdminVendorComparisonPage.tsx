import React, { useState, useEffect } from 'react'
import { GitCompare, Award, Download, Paperclip, FileSpreadsheet, CheckCircle2 } from 'lucide-react'
import { getAllStoredVendorQuotes, downloadGoodsReceiptDocument } from '../vendor/VendorPortalPages'

export const AdminVendorComparisonPage: React.FC = () => {
  const [storedQuotes, setStoredQuotes] = useState<any[]>([])
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)

  useEffect(() => {
    setStoredQuotes(getAllStoredVendorQuotes())
  }, [])

  // Default seed proposals if no dynamic quotes submitted yet
  const defaultProposals = [
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
      quoteValidUntil: '2026-10-12',
      notes: 'Includes 3-year OEM onsite warranty and Net 30 payment terms.',
      grnDocName: 'Goods_Receipt_GRN-2026-VNDHW001-001.pdf',
      isRecommended: true,
    },
    {
      id: 'QUO-SEED-002',
      vendorId: 'VND-HW-002',
      vendorName: 'HP Enterprise',
      rfqRef: 'RFQ-2026-001',
      grnDocNumber: 'GRN-2026-VNDHW002-002',
      receiptNumber: 'RCP-99410',
      issueDate: '2026-09-13',
      expiryDate: '2026-10-13',
      baseAmount: 32627,
      gstPercent: 18,
      gstAmount: 5873,
      totalAmount: 38500,
      quotedPrice: 38500,
      leadTime: '14 Days',
      quoteValidUntil: '2026-10-13',
      notes: 'Includes 2-year onsite warranty and Net 15 payment terms.',
      grnDocName: 'Goods_Receipt_GRN-2026-VNDHW002-002.pdf',
      isRecommended: false,
    },
  ]

  // Merge default proposals with dynamic proposals submitted by vendors
  const allProposals = [...storedQuotes, ...defaultProposals]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GitCompare className="text-blue-600" /> Vendor Quotation & Goods Receipt Comparison
        </h1>
        <p className="text-xs text-gray-500">
          Compare vendor proposals, financial GST breakdowns, and attached Goods Receipt (GRN) documents side-by-side.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-sm font-bold text-gray-900">
            Comparison Matrix for RFQ-2026-001 (High Performance Engineering Laptops)
          </h2>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            {allProposals.length} Proposals Submitted
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          {allProposals.map((quote, idx) => {
            const baseAmt = typeof quote.baseAmount === 'number' ? quote.baseAmount : (quote.quotedPrice || 0)
            const gstPct = typeof quote.gstPercent === 'number' ? quote.gstPercent : 18
            const gstAmt = typeof quote.gstAmount === 'number' ? quote.gstAmount : (baseAmt * gstPct / 100)
            const totalAmt = typeof quote.totalAmount === 'number' ? quote.totalAmount : (baseAmt + gstAmt)
            const isSelected = selectedQuoteId === quote.id

            return (
              <div
                key={quote.id || idx}
                className={`p-5 rounded-2xl border space-y-3 relative transition-all ${
                  quote.isRecommended || idx === 0
                    ? 'bg-blue-50/40 border-2 border-blue-600 shadow-md'
                    : 'bg-gray-50 border-gray-200 shadow-xs'
                }`}
              >
                {(quote.isRecommended || idx === 0) && (
                  <span className="absolute top-4 right-4 bg-blue-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <Award size={12} /> Recommended Option
                  </span>
                )}

                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{quote.vendorName || quote.vendorId}</h3>
                  <span className="text-[10px] text-gray-500 font-semibold block mt-0.5">Quote ID: {quote.id}</span>
                </div>

                {/* Goods Receipt Attachment Pill */}
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-blue-900 uppercase flex items-center gap-1">
                      <FileSpreadsheet size={12} className="text-blue-600" /> Goods Receipt (GRN)
                    </span>
                    <span className="font-semibold text-gray-500">{quote.grnDocNumber || 'GRN-ATTACHED'}</span>
                  </div>
                  <button
                    onClick={() => downloadGoodsReceiptDocument(quote)}
                    className="w-full px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-lg border border-blue-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Paperclip size={13} className="text-blue-600" />
                    Download GRN Document
                    <Download size={13} className="ml-0.5 opacity-70" />
                  </button>
                </div>

                {/* Financial Breakdown */}
                <div className="space-y-1.5 bg-white p-3 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Financial Breakdown</span>
                  <div className="flex justify-between items-center text-gray-700">
                    <span>Base Amount:</span>
                    <strong className="text-gray-900">RS {baseAmt.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-700">
                    <span>GST Rate ({gstPct}%):</span>
                    <strong className="text-amber-700">+RS {gstAmt.toLocaleString()}</strong>
                  </div>
                  <div className="pt-1.5 border-t border-gray-200 flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total Quoted Price:</span>
                    <strong className="text-blue-700 text-base font-black">RS {totalAmt.toLocaleString()}</strong>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1 text-gray-700 pt-1">
                  <p className="flex justify-between">
                    <span>Lead Time:</span> <strong className="text-gray-900">{quote.leadTime || '7 Days'}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Valid Until:</span> <strong className="text-gray-900">{quote.expiryDate || quote.quoteValidUntil || 'N/A'}</strong>
                  </p>
                  {quote.notes && (
                    <p className="text-[10px] text-gray-500 bg-gray-100/80 p-2 rounded-lg italic">
                      📝 {quote.notes}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setSelectedQuoteId(quote.id)}
                  className={`w-full mt-2 font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-green-600 text-white shadow-md'
                      : quote.isRecommended || idx === 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 size={14} /> Selected & PO Generated
                    </>
                  ) : (
                    'Select Quotation & Generate PO'
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
