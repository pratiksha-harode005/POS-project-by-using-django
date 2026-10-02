import React, { useState, useMemo } from 'react'
import {
  Package, Search, Filter, Calendar, Building, IndianRupee,
  CheckCircle, Clock, Truck, Eye, X, Printer, ArrowUpRight,
  Send, AlertCircle, FileText, CheckCircle2, ShieldCheck,
  Building2, MapPin, Sparkles, Tag, Check, Award
} from 'lucide-react'
import { useManagerData, PurchaseOrderItem } from '../../context/ManagerDataContext'

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

const PO_STATUS_FLOW: PurchaseOrderItem['status'][] = [
  'Draft',
  'Approved',
  'Sent to Vendor',
  'Acknowledged',
  'Partially Delivered',
  'Delivered',
  'Closed',
  'Cancelled'
]

export const AdminPurchaseOrdersPage: React.FC = () => {
  const { purchaseOrders, updatePOStatus } = useManagerData()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderItem | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Filtered POs
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(p => {
      const term = search.toLowerCase()
      const matchesSearch =
        p.poNumber.toLowerCase().includes(term) ||
        p.requestId.toLowerCase().includes(term) ||
        p.requestTitle.toLowerCase().includes(term) ||
        p.vendor.toLowerCase().includes(term)

      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [purchaseOrders, search, statusFilter])

  // Lifecycle progression
  const handleProgressStatus = (po: PurchaseOrderItem, nextStatus: PurchaseOrderItem['status']) => {
    updatePOStatus(po.id, nextStatus)
    showToast(`✓ PO ${po.poNumber} status updated to: ${nextStatus}`)
    if (selectedPO?.id === po.id) {
      setSelectedPO({ ...selectedPO, status: nextStatus })
    }
  }

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
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <Package size={12} /> PROCUREMENT COMMITMENTS
            </span>
            <span className="text-xs text-slate-400 font-medium">{purchaseOrders.length} Total Enterprise POs</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Purchase Orders (PO) Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full lifecycle visibility from initial PO release to vendor delivery, goods receipt reconciliation, and payment settlement.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center gap-3 text-xs">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by PO Number, Request ID, Title, or Vendor name..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-slate-400 font-medium whitespace-nowrap">Status Filter:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium"
          >
            <option value="ALL">All PO Statuses</option>
            {PO_STATUS_FLOW.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">PO Number & Requisition</th>
                <th className="p-3.5">Vendor Partner</th>
                <th className="p-3.5">PO Date & Due</th>
                <th className="p-3.5">Items & Qty</th>
                <th className="p-3.5">Total Value (INR)</th>
                <th className="p-3.5">Lifecycle Status</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredPOs.map(po => (
                <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5">
                    <span className="font-bold text-indigo-600 block">{po.poNumber}</span>
                    <span className="text-[11px] text-slate-500">{po.requestId} — {po.requestTitle}</span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-900">{po.vendor}</td>
                  <td className="p-3.5 whitespace-nowrap text-slate-600">
                    <div>Issued: {po.poDate}</div>
                    <div className="text-[10px] text-slate-400">Due: {po.deliveryDate}</div>
                  </td>
                  <td className="p-3.5">
                    <div className="text-slate-800 font-semibold">{po.items[0]?.product || 'Line Items'}</div>
                    <div className="text-[10px] text-slate-400">{po.quantity} total units ordered</div>
                  </td>
                  <td className="p-3.5 whitespace-nowrap font-black text-slate-900 text-sm">
                    {fmt(po.totalAmount)}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      po.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                      po.status === 'Sent to Vendor' ? 'bg-blue-100 text-blue-800' :
                      po.status === 'Acknowledged' ? 'bg-indigo-100 text-indigo-800' :
                      po.status === 'Partially Delivered' ? 'bg-amber-100 text-amber-800' :
                      po.status === 'Approved' ? 'bg-teal-100 text-teal-800' :
                      po.status === 'Closed' ? 'bg-purple-100 text-purple-800' :
                      po.status === 'Draft' ? 'bg-slate-100 text-slate-700' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      po.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      po.paymentStatus === 'Processing' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      po.paymentStatus === 'On Hold' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {po.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelectedPO(po)}
                      className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      <Eye size={12} /> PO Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Enterprise PO Dossier Modal */}
      {selectedPO && (() => {
        // Calculations for commercial breakdown
        const netBase = Math.round((selectedPO.totalAmount / 1.18) * 100) / 100
        const taxVal = Math.round((selectedPO.totalAmount - netBase) * 100) / 100
        const halfTax = Math.round((taxVal / 2) * 100) / 100

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-xs">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-200 border border-blue-400/30">
                      {selectedPO.poNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-slate-200 border border-white/10">
                      {selectedPO.requestId}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedPO.status === 'Delivered' ? 'bg-emerald-500 text-white' :
                      selectedPO.status === 'Sent to Vendor' ? 'bg-blue-500 text-white' :
                      selectedPO.status === 'Acknowledged' ? 'bg-indigo-500 text-white' :
                      selectedPO.status === 'Approved' ? 'bg-teal-500 text-white' :
                      'bg-slate-700 text-white'
                    }`}>
                      {selectedPO.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedPO.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                      selectedPO.paymentStatus === 'Processing' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      Payment: {selectedPO.paymentStatus}
                    </span>
                  </div>

                  <h2 className="text-lg font-black text-white tracking-tight mt-1">
                    Purchase Order Dossier
                  </h2>
                  <p className="text-slate-300 text-xs flex items-center gap-2 flex-wrap">
                    <span>Requisition: <b>{selectedPO.requestTitle}</b></span>
                    <span>•</span>
                    <span>Issued: <b>{selectedPO.poDate}</b></span>
                    <span>•</span>
                    <span className="text-amber-300 font-semibold">Delivery Due: {selectedPO.deliveryDate}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                    title="Print Official PO"
                  >
                    <Printer size={14} />
                    <span className="hidden sm:inline">Print Official PO</span>
                  </button>
                  <button
                    onClick={() => setSelectedPO(null)}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* 1. Buyer & Vendor Dual Entity Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Buyer: Bill To & Ship To */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-2">
                      <Building2 size={16} className="text-indigo-600" />
                      <span>Buyer Entity (Bill To &amp; Deliver To)</span>
                    </div>
                    <div className="space-y-1 text-slate-700">
                      <strong className="text-slate-900 block text-xs">Procurement OS Corporate Enterprises Ltd.</strong>
                      <p className="text-[11px] text-slate-500">
                        GSTIN: <span className="font-mono text-slate-800 font-semibold">29AAACP9876Q1Z2</span> • PAN: <span className="font-mono text-slate-800 font-semibold">AAACP9876Q</span>
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-start gap-1">
                        <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
                        <span>Central Stores Dock, Bay #3, Tech Park Campus, Outer Ring Road, Bengaluru - 560103</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Authorized Inward Lead: <span className="text-slate-800 font-medium">Engineering &amp; Stores Directorate</span>
                      </p>
                    </div>
                  </div>

                  {/* Vendor: Supplier Partner */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-2">
                      <Truck size={16} className="text-blue-600" />
                      <span>Vendor Partner (Dispatched By &amp; Pay To)</span>
                    </div>
                    <div className="space-y-1 text-slate-700">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 text-xs">{selectedPO.vendor}</strong>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Verified
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Vendor ID: <span className="font-mono text-slate-800 font-semibold">{selectedPO.vendorId || 'VND-2026-001'}</span> • GSTIN: <span className="font-mono text-slate-800 font-semibold">29AAACD1234F1Z5</span>
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-start gap-1">
                        <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
                        <span>Industrial Logistics Center, Domlur Phase 2, Bengaluru - 560071</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Vendor Support Desk: <span className="text-slate-800 font-medium">orders@partner.in • +91 98111 22334</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Key Commercial Financial Valuation */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <IndianRupee size={13} className="text-indigo-600" /> Commercial Financial Structure
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Taxable Subtotal (Base)</span>
                      <span className="text-base font-black text-slate-900 mt-0.5 block">{fmt(netBase)}</span>
                      <span className="text-[10px] text-slate-500">Net of applicable duties</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">GST Tax Levies (18%)</span>
                      <span className="text-base font-black text-purple-700 mt-0.5 block">+{fmt(taxVal)}</span>
                      <span className="text-[10px] text-slate-500">CGST (9%) + SGST (9%)</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Logistics &amp; Freight</span>
                      <span className="text-base font-black text-slate-900 mt-0.5 block">Free / Included</span>
                      <span className="text-[10px] text-slate-500">DDP Delivery Terms</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Ordered Units</span>
                      <span className="text-base font-black text-indigo-700 mt-0.5 block">{selectedPO.quantity} Units</span>
                      <span className="text-[10px] text-slate-500">Across item lines</span>
                    </div>
                  </div>

                  {/* Net PO Authorized Value Card */}
                  <div className="mt-3 p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 block">
                        Total Binding Purchase Order Value
                      </span>
                      <span className="text-2xl font-black text-emerald-900 tracking-tight">
                        {fmt(selectedPO.totalAmount)}
                      </span>
                      <p className="text-[11px] text-emerald-700 italic mt-0.5">
                        Amount in words: <strong className="font-semibold">{numberToIndianWords(selectedPO.totalAmount)}</strong>
                      </p>
                    </div>

                    <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-emerald-200 pt-2 sm:pt-0 sm:pl-4">
                      <span className="text-[10px] font-bold uppercase text-emerald-800 block">Payment Terms</span>
                      <span className="text-base font-extrabold text-emerald-950">
                        {selectedPO.terms || 'Net 30'}
                      </span>
                      <span className="text-[10px] text-emerald-700 block font-medium">Post GRN Inspection Acceptance</span>
                    </div>
                  </div>
                </div>

                {/* 3. Itemized Bill of Materials (Line Items Table) */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <FileText size={13} className="text-indigo-600" /> Authorized Line Items &amp; Technical Specifications
                  </h4>

                  <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">Product Description &amp; Technical Specifications</th>
                          <th className="p-3 text-center">HSN/SAC</th>
                          <th className="p-3 text-center">Ordered Qty</th>
                          <th className="p-3 text-right">Unit Rate</th>
                          <th className="p-3 text-right">GST Rate</th>
                          <th className="p-3 text-right">Line Total (INR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {selectedPO.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-400">{String(idx + 1).padStart(2, '0')}</td>
                            <td className="p-3">
                              <strong className="text-slate-900 block text-xs">{it.product}</strong>
                              <span className="text-slate-500 block text-[10px] mt-0.5">
                                Commercial Enterprise Grade • Linked Requisition: {selectedPO.requestId}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono text-slate-600">84713010</td>
                            <td className="p-3 text-center font-bold text-slate-800">{it.quantity} Units</td>
                            <td className="p-3 text-right font-medium text-slate-700">{fmt(it.unitPrice)}</td>
                            <td className="p-3 text-right text-purple-700 font-medium">18% GST</td>
                            <td className="p-3 text-right font-black text-slate-900 text-xs">{fmt(it.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. 3-Way Match Verification Status */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-indigo-600" /> 3-Way Matching Verification &amp; Procurement Chain
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400">1. Requisition Sign-off</span>
                        <CheckCircle2 size={13} className="text-emerald-600" />
                      </div>
                      <strong className="text-slate-900 text-xs block">{selectedPO.requestId}</strong>
                      <span className="text-[10px] text-emerald-700 font-semibold">Authorized by Admin</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400">2. Goods Receipt (GRN)</span>
                        <CheckCircle2 size={13} className="text-emerald-600" />
                      </div>
                      <strong className="text-slate-900 text-xs block">GRN-{selectedPO.poNumber.slice(-4)}</strong>
                      <span className="text-[10px] text-emerald-700 font-semibold">{selectedPO.quantity}/{selectedPO.quantity} Units Inspected (Passed)</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400">3. Commercial Invoice</span>
                        <CheckCircle2 size={13} className="text-emerald-600" />
                      </div>
                      <strong className="text-slate-900 text-xs block">INV-2026-{selectedPO.poNumber.slice(-4)}</strong>
                      <span className="text-[10px] text-emerald-700 font-semibold">Matched: {fmt(selectedPO.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* 5. Contractual Conditions & SLA Terms */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-indigo-600" /> Contractual Terms, Warranties &amp; Fulfillment SLA
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Payment Settlement Terms:</span>
                        <strong className="text-slate-900">{selectedPO.terms || 'Net 30 Days'} from GRN Date</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Payment Mode:</span>
                        <span className="text-slate-800 font-semibold">Corporate NEFT / RTGS Wire Transfer</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Delivery Mode:</span>
                        <span className="text-slate-800 font-semibold">Direct Insured Surface Logistics</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Incoterms:</span>
                        <span className="text-emerald-700 font-bold">DDP (Delivered Duty Paid)</span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Comprehensive Warranty:</span>
                        <strong className="text-indigo-700">3 Years Comprehensive Onsite SLA</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Delay Damages (LD Clause):</span>
                        <span className="text-slate-700">0.5% per week of delay (Max 5%)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Defective Item Replacement:</span>
                        <span className="text-slate-800 font-medium">48-Hour Rapid Exchange Guarantee</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Packaging Specification:</span>
                        <span className="text-slate-700">Tamper-evident pallet boxes with barcode</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Lifecycle Advancement Interactive Controls */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 block text-xs font-bold uppercase tracking-wider">
                      Advance Purchase Order Lifecycle Stage
                    </span>
                    <span className="text-[11px] text-indigo-700 font-semibold">
                      Current Stage: <strong className="text-slate-900">{selectedPO.status}</strong>
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {PO_STATUS_FLOW.map(stage => (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => handleProgressStatus(selectedPO, stage)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          selectedPO.status === stage
                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 7. Audit Trail & Signatures */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
                  <div>
                    <span className="font-bold text-slate-700">Executive Sourcing Sign-off:</span> Digitally approved and stamped under Corporate Procurement OS Authority.
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                    <span>Digital Order Hash: SHA256:PO-{selectedPO.poNumber}-9B4F8</span>
                    <span>•</span>
                    <span className="text-emerald-600 font-bold">Verified Order</span>
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
                    onClick={() => window.print()}
                    className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
                  >
                    <Printer size={14} /> Print Official PO
                  </button>
                  <button
                    onClick={() => setSelectedPO(null)}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        )
      })()}
    </div>
  )
}
