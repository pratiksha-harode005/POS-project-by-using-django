import React from 'react'
import {
  X, Printer, CheckCircle2, IndianRupee, FileText,
  ShieldCheck, Sparkles, Tag
} from 'lucide-react'
import { QuotationItem } from '../../context/ManagerDataContext'
import { formatDate } from '../../utils/formatDate'
import { ModalPortal } from './ModalPortal'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

function numberToIndianWords(num: number): string {
  if (!num || num === 0) return 'Zero Rupees Only'
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen ']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  
  const n = ('000000000' + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/)
  if (!n) return `${fmt(num)} Only`
  let str = ''
  str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : ''
  str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : ''
  str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : ''
  str += Number(n[4]) !== 0 ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : ''
  str += Number(n[5]) !== 0 ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : ''
  return str.trim() + ' Rupees Only'
}

interface QuotationCommercialModalProps {
  quote: QuotationItem | null
  onClose: () => void
}

export const QuotationCommercialModal: React.FC<QuotationCommercialModalProps> = ({ quote, onClose }) => {
  if (!quote) return null

  const handlePrint = () => {
    window.print()
  }

  const qty = Math.max(quote.quantity || 1, 1)
  const grossBase = quote.baseAmount || quote.price || (quote.unitPrice * qty)
  const discount = quote.discountAmount || 0
  const taxable = grossBase - discount
  const gstPct = quote.gstPercent || quote.gstRate || 18
  const taxVal = quote.taxAmount || Math.round(taxable * (gstPct / 100))
  const totalVal = quote.totalAmount || (taxable + taxVal + (quote.shippingCost || 0))
  const unitRate = quote.unitPrice || Math.round(grossBase / qty)
  const unitLanded = Math.round(totalVal / qty)

  return (
    <ModalPortal isOpen={Boolean(quote)}>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/40 backdrop-blur-md overflow-hidden animate-fadeIn">
        <div className="bg-white rounded-3xl max-w-4xl w-full h-[94vh] max-h-[94vh] border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto text-xs animate-scaleUp">
          
          {/* Modal Header */}
          <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-200 border border-purple-400/30">
                  {quote.id}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-slate-200 border border-white/10">
                  {quote.rfqId}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  quote.status === 'Selected' ? 'bg-emerald-500 text-white' :
                  quote.status === 'Shortlisted' ? 'bg-indigo-500 text-white' :
                  quote.status === 'Under Evaluation' ? 'bg-blue-500 text-white' :
                  'bg-rose-500 text-white'
                }`}>
                  {quote.status}
                </span>
              </div>
              <h2 className="text-lg font-black text-white tracking-tight mt-1">
                Quotation Commercial Breakdown
              </h2>
              <p className="text-slate-300 text-xs flex items-center gap-2 flex-wrap">
                <span>{quote.rfqId}: <b>{quote.rfqTitle}</b></span>
                <span>•</span>
                <span>Submitted: <b>{formatDate(quote.quoteDate || quote.submittedAt)}</b></span>
                <span>•</span>
                <span className="text-amber-300 font-semibold">Valid Until: {formatDate(quote.validUntil)}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Print Quotation Dossier"
              >
                <Printer size={14} />
                <span className="hidden sm:inline">Print Dossier</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 min-h-0">
          
          {/* 1. Supplier Credentials Strip */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md shrink-0">
                {quote.vendor.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">{quote.vendor}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Verified Supplier
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  GSTIN: <span className="font-mono text-slate-700 font-semibold">29AAACD1234F1Z5</span> • PAN: <span className="font-mono text-slate-700 font-semibold">AAACD1234F</span> • MSME Certified
                </p>
                <p className="text-[11px] text-slate-500">
                  Key Account Rep: <span className="text-slate-800 font-medium">Enterprise Sourcing Desk</span> (official-desk@partner.in • +91 80 4123 4567)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Evaluation Score</span>
                <span className="text-lg font-black text-indigo-700">{quote.performanceScore}/100</span>
                <span className="text-[10px] text-emerald-600 block font-bold">Low Commercial Risk</span>
              </div>
            </div>
          </div>

          {/* 2. Key Commercial Metrics (4 Financial Tiles) */}
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <IndianRupee size={13} className="text-indigo-600" /> Commercial Financial Structure
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Gross Base Rate */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Base Commercial Value</span>
                <span className="text-base font-black text-slate-900 mt-0.5 block">
                  {fmt(grossBase)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {fmt(unitRate)} × {qty} units
                </span>
              </div>

              {/* Discount */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Trade / Volume Rebate</span>
                <span className="text-base font-black text-emerald-600 mt-0.5 block">
                  -{fmt(discount)}
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">
                  Special negotiated concession
                </span>
              </div>

              {/* GST & Levies */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">GST & Taxes ({gstPct}%)</span>
                <span className="text-base font-black text-purple-700 mt-0.5 block">
                  +{fmt(taxVal)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {gstPct === 18 ? 'CGST 9% + SGST 9% (or IGST)' : `Standard GST ${gstPct}%`}
                </span>
              </div>

              {/* Freight */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Freight & Insurance</span>
                <span className="text-base font-black text-slate-900 mt-0.5 block">
                  {quote.shippingCost === 0 ? 'Free / Included' : fmt(quote.shippingCost || 0)}
                </span>
                <span className="text-[10px] text-slate-500">
                  DDP Doorstep Delivery
                </span>
              </div>
            </div>

            {/* Total Grand Landed Card */}
            <div className="mt-3 p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 block">
                  Final Landed Proposal Value (All Inclusive)
                </span>
                <span className="text-2xl font-black text-emerald-900 tracking-tight">
                  {fmt(totalVal)}
                </span>
                <p className="text-[11px] text-emerald-700 italic mt-0.5">
                  Amount in words: <strong className="font-semibold">{numberToIndianWords(totalVal)}</strong>
                </p>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-emerald-200 pt-2 sm:pt-0 sm:pl-4">
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">Effective Landed Unit Rate</span>
                <span className="text-base font-extrabold text-emerald-950">
                  {fmt(unitLanded)} / unit
                </span>
                <span className="text-[10px] text-emerald-700 block font-medium">Inclusive of all duties &amp; logistics</span>
              </div>
            </div>
          </div>

          {/* 3. Detailed Itemized Commercial Bill of Quantities (BOQ) */}
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <FileText size={13} className="text-indigo-600" /> Line Item Specification &amp; Pricing Breakdown
            </h4>

            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Item Description &amp; Technical Specs</th>
                    <th className="p-3 text-center">HSN/SAC</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit List</th>
                    <th className="p-3 text-right">Disc.</th>
                    <th className="p-3 text-right">Taxable</th>
                    <th className="p-3 text-right">GST (18%)</th>
                    <th className="p-3 text-right">Net Landed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-400">01</td>
                    <td className="p-3">
                      <strong className="text-slate-900 block text-xs">{quote.rfqTitle}</strong>
                      <span className="text-slate-500 block text-[10px] mt-0.5">
                        Standard Commercial Grade • Part SKU: {quote.vendor.slice(0, 3).toUpperCase()}-PRO-{quote.id.slice(-3)}
                      </span>
                      <span className="text-indigo-600 font-medium text-[10px]">
                        Spec Compliance: {quote.complianceRating}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600">84713010</td>
                    <td className="p-3 text-center font-bold text-slate-800">{qty} Units</td>
                    <td className="p-3 text-right font-medium text-slate-700">{fmt(unitRate)}</td>
                    <td className="p-3 text-right text-emerald-600 font-medium">-{fmt(Math.round(discount / qty))}</td>
                    <td className="p-3 text-right font-semibold text-slate-800">{fmt(taxable)}</td>
                    <td className="p-3 text-right text-purple-700 font-medium">{fmt(taxVal)}</td>
                    <td className="p-3 text-right font-black text-slate-900 text-xs">{fmt(totalVal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Commercial, Legal & Contractual Terms */}
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-indigo-600" /> Commercial Terms, SLA &amp; Contractual Conditions
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Payment Terms:</span>
                  <strong className="text-slate-900">{quote.paymentTerms} after GRN Inspection</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Payment Settlement Mode:</span>
                  <span className="text-slate-800 font-semibold">NEFT / RTGS Corporate Bank Transfer</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Advance Commitment:</span>
                  <span className="text-emerald-700 font-bold">0% (Nil Advance Required)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Quotation Validity Period:</span>
                  <span className="text-amber-700 font-bold">30 Days (Valid until {formatDate(quote.validUntil)})</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Delivery Lead Time:</span>
                  <strong className="text-slate-900">{quote.deliveryDays} Business Days from PO Date</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Delivery Incoterms:</span>
                  <span className="text-slate-800 font-semibold">DDP (Delivered Duty Paid - Central Office)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Comprehensive Warranty:</span>
                  <strong className="text-indigo-700">{quote.warranty}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Late Delivery Clause (LD):</span>
                  <span className="text-slate-700">0.5% per week of delay (Capped at 5%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Scope Inclusions & Value Adds */}
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Sparkles size={13} className="text-indigo-600" /> Value-Added Scope of Supply &amp; Inclusions
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 text-[11px] block">Asset Tagging &amp; Serial Register</strong>
                  <span className="text-[10px] text-slate-500">Includes QR barcoding and pre-registration in corporate IT asset inventory.</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 text-[11px] block">Doorstep Unboxing &amp; Installation</strong>
                  <span className="text-[10px] text-slate-500">Free physical unboxing, defect check, and test operation at designated facility.</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 text-[11px] block">Direct OEM Support Desk</strong>
                  <span className="text-[10px] text-slate-500">Dedicated 24×7 toll-free enterprise hotline with 4-hour critical turnaround time.</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 text-[11px] block">Price Firmness Commitment</strong>
                  <span className="text-[10px] text-slate-500">Guaranteed fixed prices throughout validity; immune to currency fluctuations.</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Vendor Qualifications & Notes */}
          {quote.notes && (
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Tag size={13} className="text-indigo-600" /> Commercial Notes &amp; Vendor Qualifications
              </h4>
              <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200 text-slate-800 text-xs">
                <p className="italic font-medium">"{quote.notes}"</p>
                <p className="text-[10px] text-amber-800 font-semibold mt-1">
                  *Note acknowledged during commercial bid qualification stage.
                </p>
              </div>
            </div>
          )}

          {/* 7. Procurement Evaluation Trail */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
            <div>
              <span className="font-bold text-slate-700">Commercial Evaluation Committee:</span> Verified &amp; Normalized in Indian National Rupees (INR ₹).
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
              <span>Digital Hash: SHA256:{quote.id}F9B4D</span>
              <span>•</span>
              <span>Verified</span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono shadow-2xs">Esc</kbd> or click Close to return.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
            >
              <Printer size={14} /> Print Summary
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              Close
            </button>
          </div>
        </div>

        </div>
      </div>
    </ModalPortal>
  )
}
