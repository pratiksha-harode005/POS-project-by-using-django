import React, { useState, useMemo } from 'react'
import {
  GitCompare, Award, CheckCircle, ShieldCheck, IndianRupee,
  Clock, Check, X, AlertTriangle, ArrowRight, Layers
} from 'lucide-react'
import { useManagerData, QuotationItem } from '../../context/ManagerDataContext'
import { QuotationCommercialModal } from '../../components/portal/QuotationCommercialModal'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export const AdminVendorComparisonPage: React.FC = () => {
  const { quotations, rfqs } = useManagerData()

  // Select active RFQ to compare
  const [selectedRfqId, setSelectedRfqId] = useState<string>('RFQ-2026-028')
  const [toast, setToast] = useState<string | null>(null)
  const [inspectQuote, setInspectQuote] = useState<QuotationItem | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // RFQ List
  const rfqList = useMemo(() => {
    return [
      { id: 'RFQ-2026-028', title: 'Office Laptop Procurement' },
      { id: 'RFQ-2026-027', title: 'Raw Material Supply' },
      { id: 'RFQ-2026-025', title: 'Office Furniture' },
    ]
  }, [])

  // Relevant quotes for selected RFQ
  const activeQuotes = useMemo(() => {
    return quotations.filter(q => q.rfqId === selectedRfqId)
  }, [quotations, selectedRfqId])

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <GitCompare size={12} /> COMPETITIVE EVALUATION
            </span>
            <span className="text-xs text-slate-400 font-medium">Multi-Vendor Commercial Matrix</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Side-by-Side Vendor Quotation Comparison
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Objective commercial evaluation comparing unit rates, discounts, freight, warranties, compliance, and vendor ratings.
          </p>
        </div>

        {/* RFQ Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Select Tender / RFQ:</span>
          <select
            value={selectedRfqId}
            onChange={e => setSelectedRfqId(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
          >
            {rfqList.map(r => (
              <option key={r.id} value={r.id}>{r.id} — {r.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Matrix Table */}
      {activeQuotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400 text-xs shadow-2xs">
          <Layers size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="font-bold text-slate-700">No proposals available for {selectedRfqId}</p>
          <p className="text-slate-400 mt-1">Select an alternative RFQ from the dropdown above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden text-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div>
              <span className="font-bold text-indigo-600 text-xs">{selectedRfqId}</span>
              <h3 className="font-bold text-slate-900 text-sm">Evaluating {activeQuotes.length} Vendor Proposals</h3>
            </div>
            <span className="text-[11px] text-slate-500 italic">
              *All financial metrics normalized in Indian National Rupees (INR)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold text-xs">
                  <th className="p-4 w-52 bg-slate-100 font-bold">Evaluation Parameter</th>
                  {activeQuotes.map(q => (
                    <th key={q.id} className="p-4 min-w-[220px]">
                      <div className="font-extrabold text-slate-900 text-sm">{q.vendor}</div>
                      <button
                        type="button"
                        onClick={() => setInspectQuote(q)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold underline decoration-indigo-300 flex items-center gap-1 mt-0.5 text-left"
                      >
                        {q.id} — View Breakdown
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {/* Row 1: Unit Price & Quantity */}
                <tr>
                  <td className="p-3.5 bg-slate-50 font-bold text-slate-700">Base Unit Price</td>
                  {activeQuotes.map(q => (
                    <td key={q.id} className="p-3.5">
                      <strong className="text-slate-900">{fmt(q.unitPrice)}</strong>
                      <span className="text-[11px] text-slate-400 block">Qty: {q.quantity} units</span>
                    </td>
                  ))}
                </tr>

                {/* Row 2: Discount & Tax */}
                <tr>
                  <td className="p-3.5 bg-slate-50 font-bold text-slate-700">Discount & Taxes</td>
                  {activeQuotes.map(q => (
                    <td key={q.id} className="p-3.5">
                      <div className="text-emerald-700 font-semibold">Discount: -{fmt(q.discountAmount)}</div>
                      <div className="text-slate-500 text-[11px]">GST: +{fmt(q.taxAmount)}</div>
                    </td>
                  ))}
                </tr>

                {/* Row 3: Shipping & Logistics */}
                <tr>
                  <td className="p-3.5 bg-slate-50 font-bold text-slate-700">Freight / Shipping</td>
                  {activeQuotes.map(q => (
                    <td key={q.id} className="p-3.5 font-semibold">
                      {q.shippingCost === 0 ? (
                        <span className="text-emerald-700 font-bold">Free Shipping (Included)</span>
                      ) : (
                        fmt(q.shippingCost)
                      )}
                    </td>
                  ))}
                </tr>

                {/* Row 4: Total Commercial Offer */}
                <tr className="bg-indigo-50/30 font-bold">
                  <td className="p-3.5 bg-indigo-50/70 font-extrabold text-indigo-950">Total Quotation Value</td>
                  {activeQuotes.map(q => (
                    <td key={q.id} className="p-3.5">
                      <span className="text-base font-black text-indigo-950 block">{fmt(q.totalAmount)}</span>
                      <span className="text-[10px] text-slate-500">All taxes & freight included</span>
                    </td>
                  ))}
                </tr>

                {/* Row 5: Delivery Time */}
                <tr>
                  <td className="p-3.5 bg-slate-50 font-bold text-slate-700">Delivery Lead Time</td>
                  {activeQuotes.map(q => (
                    <td key={q.id} className="p-3.5">
                      <strong className="text-slate-900">{q.deliveryDays} Business Days</strong>
                      <span className="text-[10px] text-slate-400 block">From PO issuance</span>
                    </td>
                  ))}
                </tr>

                {/* Row 6: Warranty */}
                <tr>
                  <td className="p-3.5 bg-slate-50 font-bold text-slate-700">Warranty Terms</td>
                  {activeQuotes.map(q => (
                    <td key={q.id} className="p-3.5 text-slate-800">
                      {q.warranty}
                    </td>
                  ))}
                </tr>

                {/* Row 7: Payment Terms */}
                <tr>
                  <td className="p-3.5 bg-slate-50 font-bold text-slate-700">Payment Terms</td>
                  {activeQuotes.map(q => (
                    <td key={q.id} className="p-3.5 font-semibold text-slate-800">
                      {q.paymentTerms}
                    </td>
                  ))}
                </tr>

                {/* Row 8: Quote Validity */}
                <tr>
                  <td className="p-3.5 bg-slate-50 font-bold text-slate-700">Proposal Validity</td>
                  {activeQuotes.map(q => (
                    <td key={q.id} className="p-3.5 text-slate-600">
                      Until {q.validUntil}
                    </td>
                  ))}
                </tr>

                {/* Row 9: Technical Compliance */}
                <tr>
                  <td className="p-3.5 bg-slate-50 font-bold text-slate-700">Technical Compliance</td>
                  {activeQuotes.map(q => (
                    <td key={q.id} className="p-3.5">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                        <Check size={12} /> {q.complianceRating}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Row 10: Vendor Performance Score */}
                <tr>
                  <td className="p-3.5 bg-slate-50 font-bold text-slate-700">Vendor Historical Score</td>
                  {activeQuotes.map(q => (
                    <td key={q.id} className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-600 h-full" style={{ width: `${q.performanceScore}%` }} />
                        </div>
                        <strong className="text-slate-900">{q.performanceScore}%</strong>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Row 11: Action Row (No auto-selection) */}
                <tr className="bg-slate-50">
                  <td className="p-4 bg-slate-100 font-bold text-slate-700">Admin Procurement Action</td>
                  {activeQuotes.map(q => (
                    <td key={q.id} className="p-4">
                      <button
                        onClick={() => showToast(`Quotation ${q.id} from ${q.vendor} earmarked for PO Generation workflow.`)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1 text-xs"
                      >
                        <Award size={13} /> Select Quote for PO
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reusable Quotation Commercial Breakdown Modal */}
      <QuotationCommercialModal quote={inspectQuote} onClose={() => setInspectQuote(null)} />
    </div>
  )
}
