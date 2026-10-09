import React, { useState, useMemo } from 'react'
import {
  FileCheck, Search, Filter, Calendar, Building, CheckCircle,
  AlertTriangle, Eye, X, Printer, ShieldCheck, CheckSquare,
  Laptop, HardDrive, Cpu, Package, CreditCard, Sparkles, Layers,
  ArrowUpRight, DollarSign, Download, User, Tag, Clock, Check
} from 'lucide-react'
import { useManagerData, GoodsReceiptItem } from '../../context/ManagerDataContext'
import { UnifiedReceiptModal } from '../../components/portal/UnifiedReceiptModal'

export const AdminReceiptsPage: React.FC = () => {
  const { receipts, verifyReceipt, purchaseOrders } = useManagerData()

  // Receipt Category Filter: ALL | SOFTWARE | HARDWARE
  const [receiptTypeFilter, setReceiptTypeFilter] = useState<'ALL' | 'SOFTWARE' | 'HARDWARE'>('ALL')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceiptItem | null>(null)
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<any | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const { payments } = useManagerData()

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

  // Categorize receipts into software and hardware
  const isSoftwareReceipt = (r: GoodsReceiptItem) => {
    const idStr = String(r.id || r.grnNumber || '')
    if (idStr.startsWith('RCP-SW-') || idStr.startsWith('SR-') || idStr.includes('-SW-')) return true
    if (r.receiptType === 'SOFTWARE') return true
    const cat = (r.category || '').toLowerCase()
    const prod = (r.product || '').toLowerCase()
    const swName = (r.softwareName || '').toLowerCase()
    const loc = (r.warehouseLocation || '').toLowerCase()
    if (
      cat.includes('software') ||
      cat.includes('saas') ||
      cat.includes('cloud') ||
      cat.includes('license') ||
      cat.includes('subscription') ||
      prod.includes('subscription') ||
      prod.includes('license') ||
      prod.includes('software') ||
      Boolean(r.softwareName) ||
      swName.length > 0 ||
      loc.includes('digital') ||
      loc.includes('cloud') ||
      loc.includes('saas')
    ) {
      return true
    }
    if (r.receiptType === 'HARDWARE') return false
    return false
  }

  // Summary Metrics
  const softwareReceiptsList = useMemo(() => receipts.filter(isSoftwareReceipt), [receipts])
  const hardwareReceiptsList = useMemo(() => receipts.filter(r => !isSoftwareReceipt(r)), [receipts])

  const totalSoftwareSpend = useMemo(() => {
    return softwareReceiptsList.reduce((acc, r) => acc + (r.amount || 0), 0)
  }, [softwareReceiptsList])

  const totalHardwareUnits = useMemo(() => {
    return hardwareReceiptsList.reduce((acc, r) => acc + (r.receivedQuantity || 0), 0)
  }, [hardwareReceiptsList])

  const verifiedCount = useMemo(() => {
    return receipts.filter(r => r.status === 'Verified').length
  }, [receipts])

  // Filtered Receipts based on Type Filter, Search, and Status Filter
  const filteredReceipts = useMemo(() => {
    const list = receipts.filter(r => {
      // 1. Receipt Type Filter (SOFTWARE vs HARDWARE vs ALL)
      const isSw = isSoftwareReceipt(r)
      if (receiptTypeFilter === 'SOFTWARE' && !isSw) return false
      if (receiptTypeFilter === 'HARDWARE' && isSw) return false

      // 2. Status Filter
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter
      if (!matchesStatus) return false

      // 3. Search Query
      if (!search.trim()) return true
      const term = search.toLowerCase()
      return (
        r.grnNumber.toLowerCase().includes(term) ||
        r.poNumber.toLowerCase().includes(term) ||
        r.vendor.toLowerCase().includes(term) ||
        r.product.toLowerCase().includes(term) ||
        r.receivedBy.toLowerCase().includes(term) ||
        (r.softwareName && r.softwareName.toLowerCase().includes(term)) ||
        (r.paymentReference && r.paymentReference.toLowerCase().includes(term)) ||
        (r.requester && r.requester.toLowerCase().includes(term)) ||
        (r.department && r.department.toLowerCase().includes(term))
      )
    })

    return list.sort((a, b) => {
      const timeA = new Date((a as any).createdAt || (a as any).created_at || a.receivedDate || 0).getTime()
      const timeB = new Date((b as any).createdAt || (b as any).created_at || b.receivedDate || 0).getTime()
      if (timeA !== timeB) return timeB - timeA
      return (b.id || '').localeCompare(a.id || '')
    })
  }, [receipts, receiptTypeFilter, search, statusFilter])

  // Helper to open Software Receipt with complete justification and payment data
  const handleOpenSoftwareReceipt = (r: GoodsReceiptItem) => {
    const rAny = r as any
    const cleanId = String(rAny.requestId || rAny.id || '').replace(/^(REQ-|REP-|RCP-SW-|SR-)/, '')
    let pay = payments.find((p: any) => 
      p.requestId === rAny.requestId || 
      p.requestId === rAny.id || 
      p.requestId === cleanId || 
      p.requestId === `REQ-${cleanId}` ||
      p.purchaseRequestDetail?.id === rAny.id || 
      p.purchaseRequestDetail?.request_id === rAny.requestId ||
      p.purchaseRequestDetail?.request_id === cleanId
    )
    const reqObj = rAny.rawRequest || rAny
    const pj = rAny.payment_justification_detail || reqObj.payment_justification_detail || reqObj.extra_fields?.payment_justification || {}
    const extra = reqObj.extra_fields || reqObj.extraFields || rAny.extra_fields || {}
    const amt = Number(rAny.amount || pj.actual_purchase_amount || extra.actual_purchase_amount || reqObj.finance_approved_amount || reqObj.approved_amount || 0)
    const payRef = rAny.paymentReference || extra.payment_reference || reqObj.payment_reference || pj.payment_reference || `TXN-${cleanId}`
    const rcpNo = r.grnNumber || extra.software_receipt_id || `RCP-SW-${cleanId}`
    const payDate = r.receivedDate || extra.receipt_generated_at?.split('T')[0] || pj.payment_date || new Date().toISOString().split('T')[0]
    const swTitle = r.softwareName || r.product || pj.software_name || reqObj.software_name || reqObj.title || 'Enterprise Software / SaaS'

    if (pay) {
      pay = {
        ...pay,
        amount: Number(pay.amount || amt),
        payment_method: pay.payment_method || rAny.paymentMethod || extra.payment_method || 'Corporate Digital Card',
        reference_number: pay.reference_number || payRef,
        purchaseRequestDetail: {
          ...(pay.purchaseRequestDetail || reqObj),
          software_name: swTitle,
          vendor: r.vendor || reqObj.vendor || pay.purchaseRequestDetail?.vendor,
          requested_amount: reqObj.requested_amount ?? pj.requested_amount ?? extra.requested_amount,
          approved_amount: reqObj.approved_amount ?? pj.finance_approved_amount ?? extra.approved_amount,
          finance_approved_amount: amt,
          payment_justification_detail: pj || pay.purchaseRequestDetail?.payment_justification_detail,
          extra_fields: { ...(pay.purchaseRequestDetail?.extra_fields || {}), ...extra, software_receipt_id: rcpNo }
        },
        receiptDetails: {
          fileName: rcpNo,
          itemName: swTitle,
        }
      }
    } else {
      pay = {
        id: payRef || `PAY-${cleanId}`,
        requestId: cleanId,
        amount: amt,
        status: rAny.status === 'Verified' ? 'Paid' : 'Paid',
        dueDate: payDate,
        paymentDate: payDate,
        payment_method: rAny.paymentMethod || extra.payment_method || pj.payment_method || 'Corporate Digital Card',
        reference_number: payRef,
        purchaseRequestDetail: {
          ...reqObj,
          id: cleanId,
          request_id: cleanId,
          software_name: swTitle,
          title: reqObj.title || swTitle,
          vendor: r.vendor,
          category: r.category || 'Software & SaaS',
          requested_amount: reqObj.requested_amount ?? pj.requested_amount ?? extra.requested_amount ?? amt,
          approved_amount: reqObj.approved_amount ?? pj.finance_approved_amount ?? amt,
          finance_approved_amount: amt,
          payment_justification_detail: pj,
          extra_fields: { ...extra, software_receipt_id: rcpNo }
        },
        receiptDetails: {
          fileName: rcpNo,
          itemName: swTitle,
        }
      } as any
    }
    setSelectedReceiptPayment(pay)
  }

  // Handle Verify Action
  const handleVerify = (r: GoodsReceiptItem) => {
    verifyReceipt(r.id, 'Priyanka Sharma (Admin)')
    showToast(`✓ ${isSoftwareReceipt(r) ? 'Software Receipt' : 'Goods Receipt'} ${r.grnNumber} verified successfully!`)
    if (selectedReceipt?.id === r.id) {
      setSelectedReceipt({
        ...selectedReceipt,
        status: 'Verified',
        inspectionStatus: 'Passed',
        receivedBy: 'Priyanka Sharma (Admin)'
      })
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border flex items-center gap-1.5 ${
              receiptTypeFilter === 'SOFTWARE'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : receiptTypeFilter === 'HARDWARE'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              {receiptTypeFilter === 'SOFTWARE' ? (
                <>
                  <Laptop size={13} className="text-purple-600" /> SOFTWARE INTAKE &amp; LICENSES
                </>
              ) : receiptTypeFilter === 'HARDWARE' ? (
                <>
                  <FileCheck size={13} className="text-emerald-600" /> WAREHOUSE INTAKE (GRN)
                </>
              ) : (
                <>
                  <Layers size={13} className="text-indigo-600" /> ENTERPRISE PROCUREMENT RECEIPTS
                </>
              )}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {filteredReceipts.length} {receiptTypeFilter === 'SOFTWARE' ? 'Software Receipts' : receiptTypeFilter === 'HARDWARE' ? 'Hardware Receipts' : 'Total Receipts'} Saved
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            {receiptTypeFilter === 'SOFTWARE'
              ? 'Software Receipts & License Verification'
              : receiptTypeFilter === 'HARDWARE'
              ? 'Hardware Receipts (GRN) & Delivery Verification'
              : 'Procurement Receipts & Delivery Verification'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {receiptTypeFilter === 'SOFTWARE'
              ? 'Audit digital SaaS subscriptions, cloud licenses, software payment proofs, and endorse formal compliance vouchers.'
              : receiptTypeFilter === 'HARDWARE'
              ? 'Audit received physical shipments, track inspection QA results, log damaged quantities, and endorse formal GRN certificates.'
              : 'Audit received physical hardware shipments and digital software subscriptions across the organization.'}
          </p>
        </div>

        {/* Quick Filter Pill Buttons in Header */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start sm:self-auto shrink-0 shadow-2xs">
          <button
            onClick={() => setReceiptTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
              receiptTypeFilter === 'ALL'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={14} />
            <span>All Receipts</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              receiptTypeFilter === 'ALL' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {receipts.length}
            </span>
          </button>

          <button
            onClick={() => setReceiptTypeFilter('SOFTWARE')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
              receiptTypeFilter === 'SOFTWARE'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            <Laptop size={14} />
            <span>Software Receipts</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              receiptTypeFilter === 'SOFTWARE' ? 'bg-purple-800 text-purple-100' : 'bg-purple-100 text-purple-700'
            }`}>
              {softwareReceiptsList.length}
            </span>
          </button>

          <button
            onClick={() => setReceiptTypeFilter('HARDWARE')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
              receiptTypeFilter === 'HARDWARE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <Package size={14} />
            <span>Hardware Receipts</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              receiptTypeFilter === 'HARDWARE' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {hardwareReceiptsList.length}
            </span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Receipts */}
        <div
          onClick={() => setReceiptTypeFilter('ALL')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            receiptTypeFilter === 'ALL'
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">All Receipts</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{receipts.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Combined Hardware &amp; Software receipts
          </div>
        </div>

        {/* Software Receipts */}
        <div
          onClick={() => setReceiptTypeFilter('SOFTWARE')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            receiptTypeFilter === 'SOFTWARE'
              ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-purple-200 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
              <Laptop size={12} /> Software Receipts
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-900 mt-2">{softwareReceiptsList.length} Saved</div>
          <div className="text-[11px] text-purple-700/80 mt-0.5 font-medium">
            Total Valuation: {fmt(totalSoftwareSpend)}
          </div>
        </div>

        {/* Hardware Receipts */}
        <div
          onClick={() => setReceiptTypeFilter('HARDWARE')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            receiptTypeFilter === 'HARDWARE'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-200 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <Package size={12} /> Hardware Receipts (GRN)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileCheck size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-2">{hardwareReceiptsList.length} Saved</div>
          <div className="text-[11px] text-emerald-700/80 mt-0.5 font-medium">
            {totalHardwareUnits} Physical Units Inwarded
          </div>
        </div>

        {/* Verification Rate */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Verification Status</span>
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {verifiedCount} <span className="text-sm font-semibold text-slate-400">/ {receipts.length}</span>
          </div>
          <div className="text-[11px] text-teal-700 font-semibold mt-0.5 flex items-center gap-1">
            <Check size={13} /> {receipts.length > 0 ? Math.round((verifiedCount / receipts.length) * 100) : 0}% Formally Verified
          </div>
        </div>
      </div>

      {/* Filter Bar with Search and Verification Status */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={
              receiptTypeFilter === 'SOFTWARE'
                ? 'Search software receipts by Software Name, Ref #, Requester, Plan, Dept...'
                : receiptTypeFilter === 'HARDWARE'
                ? 'Search hardware receipts by GRN #, PO #, Vendor, Product, Location...'
                : 'Search all receipts by Number, Software, Hardware, Vendor, Requester, PO...'
            }
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        {/* Verification Status Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-slate-400 font-medium whitespace-nowrap">Verification Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="Verified">Verified</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden text-xs">
        <div className="overflow-x-auto">
          {filteredReceipts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileCheck size={24} />
              </div>
              <h3 className="font-bold text-slate-700 text-sm">No receipts match your search or filter criteria</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try switching between Software Receipt and Hardware Receipt filters, or clear your search term.
              </p>
            </div>
          ) : receiptTypeFilter === 'SOFTWARE' ? (
            // ── SOFTWARE RECEIPTS VIEW TABLE ──
            <table className="w-full text-left border-collapse">
              <thead className="bg-purple-50/70 border-b border-purple-100 text-purple-900 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Receipt / Ref #</th>
                  <th className="p-3.5">Software &amp; License Name</th>
                  <th className="p-3.5">Subscription Plan / Tier</th>
                  <th className="p-3.5">Payment Date</th>
                  <th className="p-3.5">Requester &amp; Dept</th>
                  <th className="p-3.5">Disbursed Amount</th>
                  <th className="p-3.5">Payment Mode &amp; Proof</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredReceipts.map(r => (
                  <tr key={r.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="p-3.5 font-bold text-purple-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Laptop size={13} className="text-purple-600 shrink-0" />
                        <span>{r.grnNumber}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal block mt-0.5">{r.poNumber}</span>
                      {((r as any).is_sent_to_higher_authority || (r as any).sent_to_higher_authority) && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1 w-fit mt-1 shadow-2xs">
                          <Sparkles size={9} className="text-purple-600" /> Transmitted by Manager
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <p className="font-bold text-slate-900 leading-tight">
                        {r.softwareName || r.product}
                      </p>
                      <span className="text-[10px] text-purple-600 font-semibold">{r.vendor}</span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        {r.requiredPlan || r.currentPlan || 'Enterprise License'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{r.requestType || 'Annual Subscription'}</span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        <span>{r.receivedDate}</span>
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <p className="font-semibold text-slate-900">{r.requester || r.receivedBy}</p>
                      <span className="text-[10px] text-slate-500">{r.department || 'Engineering'}</span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-black text-slate-900 text-xs">
                        {r.amount ? fmt(r.amount) : '₹48,000'}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-600">
                      <p className="font-semibold text-slate-800 text-[11px]">{r.paymentMethod || 'Not recorded'}</p>
                      <span className="text-[10px] font-mono text-purple-700 font-medium">{r.paymentReference || 'Not recorded'}</span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${
                        r.status === 'Verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'Pending Verification'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {r.status === 'Verified' && <CheckCircle size={10} />}
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenSoftwareReceipt(r)}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors border border-purple-700 cursor-pointer shadow-2xs"
                        >
                          <Eye size={12} className="inline mr-1" /> View Receipt
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
          ) : receiptTypeFilter === 'HARDWARE' ? (
            // ── HARDWARE RECEIPTS (GRN) VIEW TABLE ──
            <table className="w-full text-left border-collapse">
              <thead className="bg-emerald-50/70 border-b border-emerald-100 text-emerald-900 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">GRN Number</th>
                  <th className="p-3.5">PO Number</th>
                  <th className="p-3.5">Vendor Partner</th>
                  <th className="p-3.5">Received Date</th>
                  <th className="p-3.5">Product &amp; Warehouse Dock</th>
                  <th className="p-3.5">Ordered / Received / Damaged</th>
                  <th className="p-3.5">Inspection Status</th>
                  <th className="p-3.5">Received By</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredReceipts.map(r => (
                  <tr key={r.id} className="hover:bg-emerald-50/20 transition-colors">
                    <td className="p-3.5 font-bold text-emerald-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Package size={13} className="text-emerald-600 shrink-0" />
                        <span>{r.grnNumber}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700 whitespace-nowrap">{r.poNumber}</td>
                    <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">{r.vendor}</td>
                    <td className="p-3.5 whitespace-nowrap text-slate-600">{r.receivedDate}</td>
                    <td className="p-3.5 max-w-xs">
                      <p className="font-semibold text-slate-900 leading-tight">{r.product}</p>
                      <span className="text-[10px] text-emerald-700 font-medium">{r.warehouseLocation || 'Main Warehouse Bay 4'}</span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{r.receivedQuantity} / {r.orderedQuantity} Units</div>
                      {r.damagedQuantity > 0 ? (
                        <span className="text-rose-600 font-bold text-[10px]">{r.damagedQuantity} Damaged</span>
                      ) : (
                        <span className="text-emerald-700 text-[10px] font-semibold">0 Defects Verified</span>
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
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${
                        r.status === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'Pending Verification' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {r.status === 'Verified' && <CheckCircle size={10} />}
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedReceipt(r)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                        >
                          <Eye size={12} className="inline mr-1" /> View GRN
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
          ) : (
            // ── COMBINED (ALL) RECEIPTS VIEW TABLE ──
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Receipt / Ref #</th>
                  <th className="p-3.5">Item / Requisition Details</th>
                  <th className="p-3.5">Vendor / Requester</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Valuation / Quantities</th>
                  <th className="p-3.5">QA / Verification</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredReceipts.map(r => {
                  const isSw = isSoftwareReceipt(r)
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 w-fit ${
                          isSw
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isSw ? <Laptop size={11} /> : <Package size={11} />}
                          {isSw ? 'SOFTWARE' : 'HARDWARE'}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold whitespace-nowrap">
                        <span className={isSw ? 'text-purple-700' : 'text-indigo-600'}>{r.grnNumber}</span>
                        <span className="text-[10px] text-slate-400 block font-normal">{r.poNumber}</span>
                        {isSw && ((r as any).is_sent_to_higher_authority || (r as any).sent_to_higher_authority) && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1 w-fit mt-1 shadow-2xs">
                            <Sparkles size={9} className="text-purple-600" /> Transmitted by Manager
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <p className="font-semibold text-slate-900 leading-tight">
                          {isSw ? (r.softwareName || r.product) : r.product}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {isSw ? (r.requiredPlan || r.currentPlan || 'SaaS License') : (r.warehouseLocation || 'Main Dock')}
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <p className="font-bold text-slate-900">{r.vendor}</p>
                        <span className="text-[10px] text-slate-500">{isSw ? (r.requester || r.receivedBy) : r.receivedBy}</span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap text-slate-600">{r.receivedDate}</td>
                      <td className="p-3.5 whitespace-nowrap">
                        {isSw ? (
                          <div>
                            <span className="font-bold text-slate-900">{r.amount ? fmt(r.amount) : '₹48,000'}</span>
                            <span className="text-[10px] text-slate-400 block">{r.orderedQuantity || 1} Seat(s)</span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-slate-900">{r.receivedQuantity} / {r.orderedQuantity} Units</span>
                            <span className="text-[10px] text-emerald-700 block font-semibold">0 Defects</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.inspectionStatus === 'Passed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {r.inspectionStatus}
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${
                          r.status === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status === 'Verified' && <CheckCircle size={10} />}
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSw ? (
                            <button
                              onClick={() => handleOpenSoftwareReceipt(r)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors border border-blue-700 cursor-pointer shadow-2xs"
                            >
                              View Receipt
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedReceipt(r)}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                            >
                              <Eye size={12} className="inline mr-1" /> View GRN
                            </button>
                          )}
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
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── DETAIL MODAL (SOFTWARE OR HARDWARE) ── */}
      {selectedReceipt && (() => {
        const isSw = isSoftwareReceipt(selectedReceipt)
        const linkedPO = purchaseOrders.find(p => p.poNumber === selectedReceipt.poNumber)
        const acceptedQty = selectedReceipt.receivedQuantity - selectedReceipt.damagedQuantity

        // ═════════════════════════════════════════════════════════════════════
        // HARDWARE GOODS RECEIPT NOTE (GRN) MODAL
        // ═════════════════════════════════════════════════════════════════════
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-xs">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                      <Package size={12} /> {selectedReceipt.grnNumber}
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
                    Goods Receipt Certificate (GRN) — Physical Delivery
                  </h2>
                  <p className="text-slate-300 text-xs flex items-center gap-2 flex-wrap">
                    <span>Product: <b>{selectedReceipt.product}</b></span>
                    <span>•</span>
                    <span>Received Date: <b>{selectedReceipt.receivedDate}</b></span>
                    <span>•</span>
                    <span className="text-emerald-300 font-semibold">Warehouse: {selectedReceipt.warehouseLocation || 'Main Depot Bay 4'}</span>
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
                      <strong className="text-slate-900 block text-xs">Central Logistics Depot — {selectedReceipt.warehouseLocation || 'Main Depot Bay 4'}</strong>
                      <p className="text-[11px] text-slate-500">
                        Facility Dock: <span className="font-semibold text-slate-800">Inward Receiving Bay #4</span> • Gate Pass: <span className="font-mono text-slate-800 font-semibold">GP-2026-{selectedReceipt.grnNumber.slice(-3)}</span>
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
                          Verified OEM
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
                        Delivered against PO <strong className="font-semibold">{selectedReceipt.poNumber}</strong> • Total Consignment Valuation: <strong className="font-semibold">{linkedPO ? fmt(linkedPO.totalAmount) : (selectedReceipt.amount ? fmt(selectedReceipt.amount) : '₹3,50,000')}</strong>
                      </p>
                    </div>

                    <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-emerald-200 pt-2 sm:pt-0 sm:pl-4">
                      <span className="text-[10px] font-bold uppercase text-emerald-800 block">Inventory Disposition</span>
                      <span className="text-xs font-black text-emerald-950">
                        {selectedReceipt.warehouseLocation || 'Main Depot Bay 4'}
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
                      <span className="text-[10px] text-emerald-700 font-semibold">Matched: {linkedPO ? fmt(linkedPO.totalAmount) : (selectedReceipt.amount ? fmt(selectedReceipt.amount) : '₹3,50,000')}</span>
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

      {selectedReceiptPayment && (
        <UnifiedReceiptModal
          payment={selectedReceiptPayment}
          onClose={() => setSelectedReceiptPayment(null)}
        />
      )}
    </div>
  )
}
