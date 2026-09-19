import React, { useState, useMemo } from 'react'
import {
  FileCheck, Search, Filter, Calendar, Building, CheckCircle,
  AlertTriangle, Eye, X, Printer, ShieldCheck, CheckSquare
} from 'lucide-react'
import { useManagerData, GoodsReceiptItem } from '../../context/ManagerDataContext'

export const AdminReceiptsPage: React.FC = () => {
  const { receipts, verifyReceipt, purchaseOrders } = useManagerData()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceiptItem | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Filtered GRNs
  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => {
      const term = search.toLowerCase()
      const matchesSearch =
        r.grnNumber.toLowerCase().includes(term) ||
        r.poNumber.toLowerCase().includes(term) ||
        r.vendor.toLowerCase().includes(term) ||
        r.product.toLowerCase().includes(term) ||
        r.receivedBy.toLowerCase().includes(term)

      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [receipts, search, statusFilter])

  // Handle Verify Action
  const handleVerify = (r: GoodsReceiptItem) => {
    verifyReceipt(r.id, 'Priyanka Sharma (Admin)')
    showToast(`✓ Goods Receipt ${r.grnNumber} verified successfully!`)
    if (selectedReceipt?.id === r.id) {
      setSelectedReceipt({ ...selectedReceipt, status: 'Verified', inspectionStatus: 'Passed', receivedBy: 'Priyanka Sharma (Admin)' })
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
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <FileCheck size={12} /> WAREHOUSE INTAKE
            </span>
            <span className="text-xs text-slate-400 font-medium">{receipts.length} Recorded Deliveries</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Goods Receipts (GRN) & Delivery Verification
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit received physical shipments, track inspection QA results, log damaged quantities, and endorse formal GRN certificates.
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
            placeholder="Search by GRN Number, PO Number, Product, Vendor..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-slate-400 font-medium whitespace-nowrap">Verification Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium"
          >
            <option value="ALL">All GRN Statuses</option>
            <option value="Verified">Verified</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">GRN Number</th>
                <th className="p-3.5">PO Number</th>
                <th className="p-3.5">Vendor Partner</th>
                <th className="p-3.5">Received Date</th>
                <th className="p-3.5">Product Details</th>
                <th className="p-3.5">Ordered / Received / Damaged</th>
                <th className="p-3.5">Inspection Status</th>
                <th className="p-3.5">Received By</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredReceipts.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5 font-bold text-indigo-600 whitespace-nowrap">{r.grnNumber}</td>
                  <td className="p-3.5 font-semibold text-slate-700 whitespace-nowrap">{r.poNumber}</td>
                  <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">{r.vendor}</td>
                  <td className="p-3.5 whitespace-nowrap text-slate-600">{r.receivedDate}</td>
                  <td className="p-3.5 max-w-xs">
                    <p className="font-semibold text-slate-900 leading-tight">{r.product}</p>
                    <span className="text-[10px] text-slate-400">{r.warehouseLocation || 'Main Warehouse'}</span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <div className="font-bold text-slate-900">{r.receivedQuantity} / {r.orderedQuantity} Units</div>
                    {r.damagedQuantity > 0 ? (
                      <span className="text-rose-600 font-bold text-[10px]">{r.damagedQuantity} Damaged</span>
                    ) : (
                      <span className="text-emerald-700 text-[10px]">0 Defects</span>
                    )}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.inspectionStatus === 'Passed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      r.inspectionStatus === 'Inspection Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {r.inspectionStatus}
                    </span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap text-slate-600">{r.receivedBy}</td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
                      r.status === 'Pending Verification' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedReceipt(r)}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        <Eye size={12} className="inline mr-1" /> View
                      </button>
                      {r.status !== 'Verified' && (
                        <button
                          onClick={() => handleVerify(r)}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
                        >
                          Verify
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Enterprise GRN Dossier Modal */}
      {selectedReceipt && (() => {
        const linkedPO = purchaseOrders.find(p => p.poNumber === selectedReceipt.poNumber)
        const acceptedQty = selectedReceipt.receivedQuantity - selectedReceipt.damagedQuantity
        const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-xs">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      {selectedReceipt.grnNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                      PO: {selectedReceipt.poNumber}
                    </span>
                    {linkedPO?.requestId && (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-slate-200 border border-white/10">
                        {linkedPO.requestId}
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedReceipt.inspectionStatus === 'Passed' ? 'bg-emerald-500 text-white' :
                      selectedReceipt.inspectionStatus === 'Inspection Pending' ? 'bg-amber-500 text-white' :
                      'bg-rose-500 text-white'
                    }`}>
                      QA: {selectedReceipt.inspectionStatus}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedReceipt.status === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      Status: {selectedReceipt.status}
                    </span>
                  </div>

                  <h2 className="text-lg font-black text-white tracking-tight mt-1">
                    Goods Receipt Certificate (GRN)
                  </h2>
                  <p className="text-slate-300 text-xs flex items-center gap-2 flex-wrap">
                    <span>Product: <b>{selectedReceipt.product}</b></span>
                    <span>•</span>
                    <span>Received Date: <b>{selectedReceipt.receivedDate}</b></span>
                    <span>•</span>
                    <span className="text-emerald-300 font-semibold">Warehouse: {selectedReceipt.warehouseLocation || 'Main Depot Bay 3'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                    title="Print Official GRN Certificate"
                  >
                    <Printer size={14} />
                    <span className="hidden sm:inline">Print GRN Certificate</span>
                  </button>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* 1. Inward Facility vs Delivering Vendor Partner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Receiving Warehouse Dock */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-2">
                      <Building size={16} className="text-emerald-600" />
                      <span>Receiving Inward Warehouse &amp; Dock (Consignee)</span>
                    </div>
                    <div className="space-y-1 text-slate-700">
                      <strong className="text-slate-900 block text-xs">Central Logistics Depot — {selectedReceipt.warehouseLocation || 'Main Depot Bay 3'}</strong>
                      <p className="text-[11px] text-slate-500">
                        Facility Dock: <span className="font-semibold text-slate-800">Inward Receiving Bay #3</span> • Gate Pass: <span className="font-mono text-slate-800 font-semibold">GP-2026-{selectedReceipt.grnNumber.slice(-3)}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Receiving Officer: <span className="text-slate-900 font-semibold">{selectedReceipt.receivedBy}</span> (Stores Directorate)
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-start gap-1">
                        <Calendar size={12} className="text-slate-400 shrink-0 mt-0.5" />
                        <span>Inward Logged: {selectedReceipt.receivedDate} at 09:45 AM • Inward Reg: INW-2026-881</span>
                      </p>
                    </div>
                  </div>

                  {/* Vendor Partner & Transporter */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-2">
                      <ShieldCheck size={16} className="text-blue-600" />
                      <span>Delivering Vendor &amp; Logistics Dispatch (Consignor)</span>
                    </div>
                    <div className="space-y-1 text-slate-700">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 text-xs">{selectedReceipt.vendor}</strong>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Verified Vendor
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Vendor ID: <span className="font-mono text-slate-800 font-semibold">{linkedPO?.vendorId || 'VND-2026-001'}</span> • Delivery Challan: <span className="font-mono text-slate-800 font-semibold">DC-2026-{selectedReceipt.grnNumber.slice(-4)}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Carrier: <span className="text-slate-800 font-medium">BlueDart Surface Cargo (LR #981240192)</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Packaging Condition: <span className="text-emerald-700 font-semibold">Factory Palletized, Tamper Seals Intact</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Inward Quantities & Reconciliation Metrics */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <CheckSquare size={13} className="text-emerald-600" /> Quantity Reconciliation &amp; Inward Acceptance
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">PO Ordered Quantity</span>
                      <span className="text-base font-black text-slate-900 mt-0.5 block">{selectedReceipt.orderedQuantity} Units</span>
                      <span className="text-[10px] text-slate-500">Contractual PO baseline</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Physically Inwarded</span>
                      <span className="text-base font-black text-blue-700 mt-0.5 block">{selectedReceipt.receivedQuantity} Units</span>
                      <span className="text-[10px] text-slate-500">100% Inward count matched</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Accepted &amp; QA Passed</span>
                      <span className="text-base font-black text-emerald-700 mt-0.5 block">{acceptedQty} Units</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">Fit for distribution</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Damaged / Discrepancy</span>
                      <span className={`text-base font-black mt-0.5 block ${selectedReceipt.damagedQuantity > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {selectedReceipt.damagedQuantity} Units
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {selectedReceipt.damagedQuantity === 0 ? 'Zero transit defects' : 'Reported for replacement'}
                      </span>
                    </div>
                  </div>

                  {/* Reconciliation Summary Card */}
                  <div className="mt-3 p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle size={15} className="text-emerald-700" />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">
                          Reconciliation Verification Status
                        </span>
                      </div>
                      <span className="text-lg font-black text-emerald-950 tracking-tight block mt-0.5">
                        100% Quantity Matched (Zero Variance)
                      </span>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Delivered against PO <strong className="font-semibold">{selectedReceipt.poNumber}</strong> • Total Consignment Valuation: <strong className="font-semibold">{linkedPO ? fmt(linkedPO.totalAmount) : '₹3,50,000'}</strong>
                      </p>
                    </div>

                    <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-emerald-200 pt-2 sm:pt-0 sm:pl-4">
                      <span className="text-[10px] font-bold uppercase text-emerald-800 block">Inventory Disposition</span>
                      <span className="text-xs font-black text-emerald-950">
                        {selectedReceipt.warehouseLocation || 'Main Depot Bay 3'}
                      </span>
                      <span className="text-[10px] text-emerald-700 block font-medium">Ready for Department Allocation</span>
                    </div>
                  </div>
                </div>

                {/* 3. Technical Inspection & Quality Assurance (QA) Checklist */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-emerald-600" /> Technical Quality Assurance &amp; Compliance Audit
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">1. Outer Packaging &amp; Seals</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Passed</span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Factory strapping and OEM hologram seals verified intact without transit abrasion.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">2. Asset Tagging &amp; Barcode</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Passed</span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {selectedReceipt.receivedQuantity}/{selectedReceipt.receivedQuantity} items assigned Fixed Asset Barcodes (AST-2026-091 through 095).
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">3. Technical Spec Match</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Passed</span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        100% verified against approved PO specifications and bill of materials.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">4. Cosmetic Quality Check</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Passed</span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Zero external scratches, dents, paint blemishes, or manufacturing defects observed.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">5. Functional Diagnostics</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Passed</span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Power-on self-test (POST) and standard hardware diagnostic benchmarks completed.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">6. OEM Warranty &amp; Docs</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Passed</span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Official manufacturer warranty certificates, power cords &amp; user guides enclosed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Itemized Physical Goods Inward Table */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <FileCheck size={13} className="text-emerald-600" /> Itemized Physical Goods Inspection Table
                  </h4>

                  <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">Product Description &amp; Specifications</th>
                          <th className="p-3 text-center">HSN/SAC</th>
                          <th className="p-3 text-center">PO Ordered</th>
                          <th className="p-3 text-center">Inward Count</th>
                          <th className="p-3 text-center">Accepted</th>
                          <th className="p-3 text-center">Defects</th>
                          <th className="p-3 text-center">Asset Tagging</th>
                          <th className="p-3 text-right">Inspection Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-400">01</td>
                          <td className="p-3">
                            <strong className="text-slate-900 block text-xs">{selectedReceipt.product}</strong>
                            <span className="text-slate-500 block text-[10px] mt-0.5">
                              Commercial Enterprise Grade • Linked PO: {selectedReceipt.poNumber}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-slate-600">84713010</td>
                          <td className="p-3 text-center font-semibold text-slate-700">{selectedReceipt.orderedQuantity} Units</td>
                          <td className="p-3 text-center font-bold text-slate-900">{selectedReceipt.receivedQuantity} Units</td>
                          <td className="p-3 text-center font-black text-emerald-700">{acceptedQty} Units</td>
                          <td className="p-3 text-center font-medium text-slate-500">{selectedReceipt.damagedQuantity}</td>
                          <td className="p-3 text-center font-mono text-[10px] text-indigo-700">AST-2026-091~095</td>
                          <td className="p-3 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {selectedReceipt.inspectionStatus}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. 3-Way Match & Downstream Finance Clearance */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-emerald-600" /> 3-Way Matching Verification &amp; Finance Clearance
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400">1. Purchase Order</span>
                        <CheckCircle size={13} className="text-emerald-600" />
                      </div>
                      <strong className="text-slate-900 text-xs block">{selectedReceipt.poNumber}</strong>
                      <span className="text-[10px] text-emerald-700 font-semibold">Matched: {linkedPO ? fmt(linkedPO.totalAmount) : '₹3,50,000'}</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400">2. Inward Delivery (GRN)</span>
                        <CheckCircle size={13} className="text-emerald-600" />
                      </div>
                      <strong className="text-slate-900 text-xs block">{selectedReceipt.grnNumber}</strong>
                      <span className="text-[10px] text-emerald-700 font-semibold">{acceptedQty}/{selectedReceipt.orderedQuantity} Units Reconciled</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400">3. Commercial Invoice</span>
                        <CheckCircle size={13} className="text-emerald-600" />
                      </div>
                      <strong className="text-slate-900 text-xs block">INV-2026-{selectedReceipt.poNumber.slice(-4)}</strong>
                      <span className="text-[10px] text-emerald-700 font-semibold">Ready for Payment Release</span>
                    </div>
                  </div>

                  <div className="mt-2.5 p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-blue-900 text-[11px] flex items-center gap-2">
                    <ShieldCheck size={16} className="text-blue-600 shrink-0" />
                    <span>
                      Formal GRN endorsement signals the <b>Finance Portal</b> that physical delivery is verified, unlocking invoice matching and payment scheduling under <b>Net 30</b> terms.
                    </span>
                  </div>
                </div>

                {/* 6. Official Endorsement & Audit Stamp */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-600 text-[11px]">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800">Official Material Inward Certification:</p>
                    <p className="text-[10px] text-slate-500">
                      I hereby certify that the physical goods itemized above have been received in good order, inspected against technical specifications, and accepted into corporate custody.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 shrink-0">
                    <span>Digital Seal: SHA256:GRN-{selectedReceipt.grnNumber}-9B4F8</span>
                    <span>•</span>
                    <span className="text-emerald-600 font-bold">Verified Inward</span>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                <div className="text-[11px] text-slate-500 hidden sm:block">
                  {selectedReceipt.status === 'Verified' ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                      <CheckCircle size={15} /> Endorsed by {selectedReceipt.receivedBy}
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium">Pending Administrative QA Endorsement</span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {selectedReceipt.status !== 'Verified' && (
                    <button
                      onClick={() => handleVerify(selectedReceipt)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle size={14} /> Endorse &amp; Verify GRN
                    </button>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
                  >
                    <Printer size={14} /> Print Certificate
                  </button>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
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
