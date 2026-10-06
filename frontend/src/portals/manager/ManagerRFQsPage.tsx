import React, { useState, useMemo } from 'react'
import {
  FileSpreadsheet, Plus, Search, ChevronRight, ChevronDown,
  Calendar, Truck, Check, Clock, X, Users, Package, FileText,
  BarChart2, History, AlertCircle, Eye
} from 'lucide-react'
import { useManagerData, isMockRfq } from '../../context/ManagerDataContext'
import type { RFQ, RFQStatus, RFQItem } from '../../context/ManagerDataContext'
import { CreateRFQModal } from '../../components/portal/CreateRFQModal'
import { formatDate } from '../../utils/formatDate'

const fmt = (v?: number | string | null) => {
  if (v === undefined || v === null) return '₹0'
  const num = typeof v === 'string' ? parseFloat(v) : v
  return isNaN(num) ? '₹0' : `₹${num.toLocaleString('en-IN')}`
}

const statusConfig: Record<RFQStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Sent to Vendors', color: 'bg-blue-100 text-blue-800' },
  quotes_received: { label: 'Quotes Received', color: 'bg-purple-100 text-purple-800' },
  under_evaluation: { label: 'Under Evaluation', color: 'bg-amber-100 text-amber-800' },
  awarded: { label: 'Awarded', color: 'bg-green-100 text-green-800' },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-800' },
}

const getStatusConf = (status: string) => {
  return statusConfig[status as RFQStatus] || { label: (status || 'Unknown').toUpperCase(), color: 'bg-gray-100 text-gray-700' }
}

const vendorResponseColor = {
  Received: 'text-green-700 bg-green-50 border-green-200',
  Pending: 'text-amber-700 bg-amber-50 border-amber-200',
  Declined: 'text-red-700 bg-red-50 border-red-200',
}

type Tab = 'overview' | 'items' | 'vendors' | 'comparison'

function RFQDetail({ rfq, onBack }: { rfq: RFQ; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('overview')
  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: Eye },
    { key: 'items', label: 'Items & Requirements', icon: Package },
    { key: 'vendors', label: 'Vendors & Quotes', icon: Users },
    { key: 'comparison', label: 'Comparison', icon: BarChart2 },
  ]

  const receivedQuotes = (rfq.vendors || []).filter(v => v.response === 'Received' && v.quote)

  const resolvedItems = useMemo<RFQItem[]>(() => {
    if (Array.isArray(rfq.items) && rfq.items.length > 0) {
      return rfq.items
    }
    const prDetail = (rfq as any).purchase_request_detail
    if (prDetail) {
      if (Array.isArray(prDetail.items) && prDetail.items.length > 0) {
        return prDetail.items.map((it: any) => ({
          product: it.product || it.name || it.item_name || it.title || rfq.title || 'Required Item',
          specification: it.specification || it.description || it.spec || prDetail.description || 'Standard technical specifications',
          quantity: Number(it.quantity || it.qty || prDetail.quantity || 1),
          expectedPrice: Number(it.expectedPrice || it.unitPrice || it.unit_price || it.estimated_price || (prDetail.total_estimated_cost ? Number(prDetail.total_estimated_cost) / (Number(it.quantity || 1) || 1) : 0)),
          requiredBy: it.requiredBy || it.required_by || prDetail.required_by || rfq.deadline || '2026-10-25'
        }))
      }
      return [{
        product: prDetail.title || rfq.title || 'Required Items',
        specification: prDetail.description || (rfq as any).description || (rfq as any).terms || 'Standard enterprise technical specifications',
        quantity: Number(prDetail.quantity || (rfq as any).quantity || 1),
        expectedPrice: Number(prDetail.total_estimated_cost || rfq.estimatedAmount || 0),
        requiredBy: prDetail.required_by || rfq.deadline || '2026-10-25'
      }]
    }
    return [{
      product: rfq.title || 'Required Items',
      specification: (rfq as any).description || (rfq as any).terms || (rfq as any).remarks || 'Standard enterprise technical specifications',
      quantity: Number((rfq as any).quantity || (rfq as any).qty || 1),
      expectedPrice: Number(rfq.estimatedAmount || 0),
      requiredBy: rfq.deadline || '2026-10-25'
    }]
  }, [rfq])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold">
          ← Back to RFQs
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-xs font-bold text-gray-500">{rfq.id}</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">{rfq.id}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusConf(rfq.status).color}`}>
                {getStatusConf(rfq.status).label}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{rfq.title}</h2>
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-2">
              <span>🏢 {rfq.department}</span>
              <span>👤 {rfq.createdBy}</span>
              <span>📅 Created: {formatDate(rfq.createdDate || (rfq as any).created_at) || rfq.createdDate || '—'}</span>
              <span>⏰ Deadline: <b className="text-red-600">{formatDate(rfq.deadline) || rfq.deadline || '—'}</b></span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Estimated Amount</p>
            <p className="text-2xl font-black text-gray-900">{fmt(rfq.estimatedAmount)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 bg-gray-100 p-1 rounded-xl mb-6">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  tab === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <Icon size={13} /> {t.label}
              </button>
            )
          })}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {[
              { label: 'Total Vendors Invited', value: (rfq.vendors || []).length },
              { label: 'Quotes Received', value: (rfq.vendors || []).filter(v => v.response === 'Received').length },
              { label: 'Quotes Pending', value: (rfq.vendors || []).filter(v => v.response === 'Pending').length },
              { label: 'Declined', value: (rfq.vendors || []).filter(v => v.response === 'Declined').length },
            ].map(c => (
              <div key={c.label} className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-center">
                <p className="text-2xl font-black text-gray-900">{c.value}</p>
                <p className="text-gray-500 mt-0.5">{c.label}</p>
              </div>
            ))}
            {rfq.remarks && (
              <div className="col-span-full bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-800">Remarks / Notes</p>
                <p className="text-xs text-blue-700 mt-0.5">{rfq.remarks}</p>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        {tab === 'items' && (
          <div className="space-y-3">
            {resolvedItems.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-xl">
                <Package size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="font-semibold text-gray-600">No specific line items recorded</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  General technical requirements apply to this RFQ.
                </p>
              </div>
            ) : (
              resolvedItems.map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-xs">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{item.product}</p>
                      <p className="text-gray-500 mt-0.5">{item.specification || 'Standard enterprise technical specifications'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-right">
                      <div><p className="text-gray-400">Quantity</p><p className="font-bold text-gray-900">{item.quantity || 1}</p></div>
                      <div><p className="text-gray-400">Expected Price</p><p className="font-bold text-gray-900">{fmt(item.expectedPrice)}</p></div>
                      <div><p className="text-gray-400">Required By</p><p className="font-bold text-gray-900">{formatDate(item.requiredBy) || rfq.deadline || '—'}</p></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Vendors */}
        {tab === 'vendors' && (
          <div className="space-y-3 text-xs">
            {(rfq.vendors || []).map((v, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">{v.name[0]}</div>
                  <div>
                    <p className="font-bold text-gray-900">{v.name}</p>
                    <p className="text-gray-400 text-[10px]">Invited: {v.invitedOn}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {v.quote && <div className="text-right"><p className="text-gray-400">Quote</p><p className="font-bold text-gray-900">{fmt(v.quote)}</p></div>}
                  {v.deliveryDays && <div className="text-right"><p className="text-gray-400">Delivery</p><p className="font-bold text-gray-900">{v.deliveryDays} days</p></div>}
                  {v.warranty && <div className="text-right"><p className="text-gray-400">Warranty</p><p className="font-bold text-gray-900">{v.warranty}</p></div>}
                  {v.paymentTerms && <div className="text-right"><p className="text-gray-400">Payment</p><p className="font-bold text-gray-900">{v.paymentTerms}</p></div>}
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${vendorResponseColor[v.response]}`}>
                    {v.response}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comparison */}
        {tab === 'comparison' && (
          <div>
            {receivedQuotes.length < 2 ? (
              <div className="text-center py-8 text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-xl">
                <BarChart2 size={32} className="mx-auto mb-2" />
                Need at least 2 quotes to compare
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-gray-200 rounded-xl overflow-hidden">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-600 font-bold">Criteria</th>
                      {receivedQuotes.map(v => (
                        <th key={v.name} className="text-center px-4 py-3 text-gray-900 font-bold">{v.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { label: 'Quote Amount', key: 'quote', render: (v: any) => fmt(v.quote), highlight: (vals: number[]) => Math.min(...vals) },
                      { label: 'Delivery (Days)', key: 'deliveryDays', render: (v: any) => `${v.deliveryDays} days`, highlight: (vals: number[]) => Math.min(...vals) },
                      { label: 'Warranty', key: 'warranty', render: (v: any) => v.warranty || '—', highlight: null },
                      { label: 'Payment Terms', key: 'paymentTerms', render: (v: any) => v.paymentTerms || '—', highlight: null },
                    ].map(row => {
                      const numericVals = row.highlight ? receivedQuotes.map(v => (v as any)[row.key]).filter(Boolean) : []
                      const best = row.highlight ? row.highlight(numericVals) : null
                      return (
                        <tr key={row.label} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-600">{row.label}</td>
                          {receivedQuotes.map(v => {
                            const val = (v as any)[row.key]
                            const isBest = best !== null && val === best
                            return (
                              <td key={v.name} className={`px-4 py-3 text-center font-bold ${isBest ? 'text-green-700 bg-green-50' : 'text-gray-900'}`}>
                                {row.render(v)}
                                {isBest && <span className="ml-1 text-[9px] bg-green-200 text-green-800 px-1 py-0.5 rounded font-bold">BEST</span>}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export const ManagerRFQsPage: React.FC = () => {
  const { rfqs } = useManagerData()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<RFQStatus | 'all'>('all')
  const [deptFilter, setDeptFilter] = useState('All')
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const departments = ['All', ...Array.from(new Set(rfqs.map(r => r.department)))]

  const filtered = useMemo(() => rfqs.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    const matchDept = deptFilter === 'All' || r.department === deptFilter
    return matchSearch && matchStatus && matchDept
  }), [rfqs, search, statusFilter, deptFilter])

  // Summary card counts
  const counts = useMemo(() => ({
    total: rfqs.length,
    draft: rfqs.filter(r => r.status === 'draft').length,
    sent: rfqs.filter(r => r.status === 'sent').length,
    quotes_received: rfqs.filter(r => r.status === 'quotes_received').length,
    under_evaluation: rfqs.filter(r => r.status === 'under_evaluation').length,
    awarded: rfqs.filter(r => r.status === 'awarded').length,
    expired: rfqs.filter(r => r.status === 'expired').length,
  }), [rfqs])

  if (selectedRFQ) return <RFQDetail rfq={selectedRFQ} onBack={() => setSelectedRFQ(null)} />

  const summaryCards = [
    { label: 'Total RFQs', count: counts.total, color: 'text-blue-700 bg-blue-50 border-blue-200', filter: 'all' as const },
    { label: 'Draft', count: counts.draft, color: 'text-gray-700 bg-gray-50 border-gray-200', filter: 'draft' as const },
    { label: 'Sent to Vendors', count: counts.sent, color: 'text-blue-700 bg-blue-50 border-blue-200', filter: 'sent' as const },
    { label: 'Quotes Received', count: counts.quotes_received, color: 'text-purple-700 bg-purple-50 border-purple-200', filter: 'quotes_received' as const },
    { label: 'Under Evaluation', count: counts.under_evaluation, color: 'text-amber-700 bg-amber-50 border-amber-200', filter: 'under_evaluation' as const },
    { label: 'Awarded', count: counts.awarded, color: 'text-green-700 bg-green-50 border-green-200', filter: 'awarded' as const },
    { label: 'Expired', count: counts.expired, color: 'text-red-700 bg-red-50 border-red-200', filter: 'expired' as const },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 text-white bg-emerald-600 animate-fadeIn">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="text-blue-600" size={24} /> Requests for Quotation (RFQs)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Track vendors, bidding deadlines, quotation status, and comparisons.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all cursor-pointer"
        >
          <Plus size={15} /> Create RFQ
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
        {summaryCards.map(c => (
          <button key={c.label} onClick={() => setStatusFilter(c.filter)}
            className={`p-3 rounded-xl border text-center transition-all hover:shadow-sm cursor-pointer ${c.color} ${statusFilter === c.filter ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}>
            <p className="text-2xl font-black">{c.count}</p>
            <p className="text-[10px] font-semibold mt-0.5 leading-tight">{c.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative flex-1 min-w-44">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search RFQ ID, title…"
            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white focus:ring-2 focus:ring-blue-500">
          {departments.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white focus:ring-2 focus:ring-blue-500">
          <option value="all">All Statuses</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => { setSearch(''); setStatusFilter('all'); setDeptFilter('All') }}
          className="text-xs text-gray-500 hover:text-red-600 font-semibold px-2 py-2 hover:bg-red-50 rounded-lg transition-colors">
          Reset
        </button>
      </div>

      {/* RFQ Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileSpreadsheet size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="font-semibold text-gray-600">No RFQs found</p>
            <p className="text-xs mt-1">Adjust your filters or create a new RFQ.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-100/90 border-b border-slate-300">
              <tr className="text-slate-800 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="text-left px-4 py-3.5">RFQ ID</th>
                <th className="text-left px-4 py-3.5">Title</th>
                <th className="text-left px-4 py-3.5">Department</th>
                <th className="text-left px-4 py-3.5">Vendors</th>
                <th className="text-left px-4 py-3.5">Est. Amount</th>
                <th className="text-left px-4 py-3.5">Deadline</th>
                <th className="text-left px-4 py-3.5">Status</th>
                <th className="text-left px-4 py-3.5">Created By</th>
                <th className="text-left px-4 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map(r => {
                const received = (r.vendors || []).filter(v => v.response === 'Received').length
                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs">
                        {r.id}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 max-w-[220px]">
                      <div className="truncate">{r.title}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-semibold">{r.department}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-black text-slate-900">{(r.vendors || []).length}</span>
                        <span className="text-slate-500 font-medium">invited</span>
                        {received > 0 && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.5 rounded-md font-bold">
                            {received} received
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-black text-slate-900 text-xs">
                      {fmt(
                        Number(r.estimatedAmount) ||
                        Number((r as any).estimated_amount) ||
                        Number((r as any).purchase_request_detail?.total_estimated_cost) ||
                        Number((r as any).purchase_request_detail?.amount) ||
                        (Array.isArray(r.items) ? r.items.reduce((acc, it) => acc + ((Number(it.quantity) || 1) * (Number(it.expectedPrice) || 0)), 0) : 0) ||
                        0
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-medium flex items-center gap-1.5 mt-1">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{r.deadline}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border shadow-2xs ${getStatusConf(r.status).color}`}>
                        {getStatusConf(r.status).label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-medium">{r.createdBy}</td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => setSelectedRFQ(r)}
                        className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-blue-300 shadow-2xs transition-all cursor-pointer">
                        <Eye size={12} /> View RFQ
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create RFQ Modal */}
      <CreateRFQModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(newRfq) => {
          setToast(`✓ RFQ ${newRfq.id} created and dispatched to ${(newRfq.vendors || []).length} vendors!`)
          setTimeout(() => setToast(null), 4000)
        }}
      />
    </div>
  )
}
