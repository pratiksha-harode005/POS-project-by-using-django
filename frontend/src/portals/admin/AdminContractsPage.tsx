import React, { useState, useMemo } from 'react'
import {
  FolderOpen, Search, Filter, Calendar, Building, IndianRupee,
  AlertTriangle, CheckCircle, Clock, Eye, X, RefreshCw, FileText,
  Printer, ShieldCheck, Scale, Lock, CheckCircle2, Award, Briefcase, FileSpreadsheet
} from 'lucide-react'
import { useManagerData, ContractItem } from '../../context/ManagerDataContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

const numberToIndianWords = (num: number): string => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen ']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const inWords = (n: number): string => {
    if (n === 0) return ''
    if (n < 20) return a[n]
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10]
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + inWords(n % 100)
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000)
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000)
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000)
  }
  const res = inWords(Math.floor(num)).trim()
  return res ? `${res} Rupees Only` : 'Zero Rupees'
}

export const AdminContractsPage: React.FC = () => {
  const { contracts, renewContract } = useManagerData()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null)
  const [renewModalContract, setRenewModalContract] = useState<ContractItem | null>(null)
  const [newEndDate, setNewEndDate] = useState('2028-01-01')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Filtered contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const term = search.toLowerCase()
      const matchesSearch =
        c.id.toLowerCase().includes(term) ||
        c.vendor.toLowerCase().includes(term) ||
        c.contractType.toLowerCase().includes(term)

      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [contracts, search, statusFilter])

  // Renewal submit
  const handleRenewSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!renewModalContract) return
    renewContract(renewModalContract.id, newEndDate)
    showToast(`✓ Contract ${renewModalContract.id} successfully renewed until ${newEndDate}!`)
    setRenewModalContract(null)
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
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
              <FolderOpen size={12} /> LEGAL & GOVERNANCE
            </span>
            <span className="text-xs text-slate-400 font-medium">{contracts.length} Active Master Agreements</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Vendor Contract & Service Agreement Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor Master Services Agreements (MSAs), Annual Maintenance Contracts (AMCs), expiration dates, and auto-renewal triggers.
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
            placeholder="Search by Contract ID, Vendor name, Type..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-slate-400 font-medium whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium"
          >
            <option value="ALL">All Contract Statuses</option>
            <option value="Active">Active</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Expired">Expired</option>
            <option value="Draft">Draft</option>
            <option value="Terminated">Terminated</option>
          </select>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Contract ID</th>
                <th className="p-3.5">Vendor Partner</th>
                <th className="p-3.5">Agreement Type</th>
                <th className="p-3.5">Term Period</th>
                <th className="p-3.5">Contract Value (INR)</th>
                <th className="p-3.5">Renewal Date</th>
                <th className="p-3.5">Status & Indicator</th>
                <th className="p-3.5">Documents</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredContracts.map(c => {
                const isExpiringSoon = c.status === 'Expiring Soon'
                const isExpired = c.status === 'Expired'

                return (
                  <tr key={c.id} className={isExpiringSoon ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50/70 transition-colors'}>
                    <td className="p-3.5 font-bold text-indigo-600 whitespace-nowrap">{c.id}</td>
                    <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">{c.vendor}</td>
                    <td className="p-3.5 whitespace-nowrap text-slate-700">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">{c.contractType}</span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-600">
                      <div>Start: {c.startDate}</div>
                      <div className="text-[10px] text-slate-400">End: {c.endDate}</div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-black text-slate-900 text-sm">
                      {fmt(c.contractValue)}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-600">
                      {c.renewalDate}
                      {c.autoRenew && (
                        <span className="text-[10px] text-indigo-600 block font-semibold">Auto-Renew Enabled</span>
                      )}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {isExpiringSoon ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                          <AlertTriangle size={11} /> Expiring Soon
                        </span>
                      ) : isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <Clock size={11} /> Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle size={11} /> Active
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-indigo-600 font-semibold cursor-pointer hover:underline">
                      <FileText size={12} className="inline mr-1" /> {c.documentsCount} Signed Files
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedContract(c)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          onClick={() => setRenewModalContract(c)}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                        >
                          <RefreshCw size={12} /> Renew
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Enterprise Contract Agreement & Governance Dossier Modal */}
      {selectedContract && (() => {
        const invoicedSpend = Math.round(selectedContract.contractValue * 0.38)
        const remainingBalance = selectedContract.contractValue - invoicedSpend
        const isExpiringSoon = selectedContract.status === 'Expiring Soon'
        const isExpired = selectedContract.status === 'Expired'

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-xs">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-200 border border-purple-400/30">
                      {selectedContract.id}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-slate-200 border border-white/10">
                      {selectedContract.contractType}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isExpiringSoon ? 'bg-amber-500 text-white' :
                      isExpired ? 'bg-rose-500 text-white' :
                      'bg-emerald-500 text-white'
                    }`}>
                      {selectedContract.status}
                    </span>
                    {selectedContract.autoRenew && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                        Auto-Renew Active
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg font-black text-white tracking-tight mt-1">
                    Master Contract Agreement &amp; Governance Dossier
                  </h2>
                  <p className="text-slate-300 text-xs flex items-center gap-2 flex-wrap">
                    <span>Vendor Partner: <b>{selectedContract.vendor}</b></span>
                    <span>•</span>
                    <span>Signatories: <b>{selectedContract.signedBy}</b></span>
                    <span>•</span>
                    <span className="text-purple-300 font-semibold">Active Period: {selectedContract.startDate} to {selectedContract.endDate}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                    title="Print Official Contract Dossier"
                  >
                    <Printer size={14} />
                    <span className="hidden sm:inline">Print Agreement Dossier</span>
                  </button>
                  <button
                    onClick={() => setSelectedContract(null)}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* 1. Dual Contracting Parties (Consignee vs Contractor) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Party: Enterprise */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-2">
                      <Building size={16} className="text-purple-600" />
                      <span>First Party — Enterprise Client (Principal)</span>
                    </div>
                    <div className="space-y-1 text-slate-700">
                      <strong className="text-slate-900 block text-xs">Procurement OS Corporate Enterprises Ltd.</strong>
                      <p className="text-[11px] text-slate-500">
                        CIN: <span className="font-mono text-slate-800 font-semibold">U72200KA2022PTC158941</span> • PAN: <span className="font-mono text-slate-800 font-semibold">AAACP9876Q</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Registered Office: <span className="text-slate-800">Tech Park Campus, Outer Ring Road, Bengaluru - 560103</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Authorized Signatories: <span className="font-medium text-slate-900">Chief Executive Officer &amp; Procurement Admin</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Legal Counsel: <span className="text-slate-800">Corporate Legal &amp; Governance Directorate</span>
                      </p>
                    </div>
                  </div>

                  {/* Second Party: Vendor Partner */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-2">
                      <ShieldCheck size={16} className="text-blue-600" />
                      <span>Second Party — Contracting Supplier (Contractor)</span>
                    </div>
                    <div className="space-y-1 text-slate-700">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 text-xs">{selectedContract.vendor}</strong>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Empanelled Vendor
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Vendor ID: <span className="font-mono text-slate-800 font-semibold">VND-2026-001</span> • GSTIN: <span className="font-mono text-slate-800 font-semibold">29AAACD1234F1Z5</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Registered Office: <span className="text-slate-800">Industrial Logistics Center, Domlur Phase 2, Bengaluru - 560071</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Contract Signatory: <span className="font-medium text-slate-900">{selectedContract.signedBy}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Legal Notice Desk: <span className="text-slate-800">legal@partner.in • +91 98111 22334</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Financial Valuation & Commercial Spend Commitment */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <IndianRupee size={13} className="text-purple-600" /> Commercial Valuation &amp; Spend Utilization
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Master Contract Cap</span>
                      <span className="text-base font-black text-slate-900 mt-0.5 block">{fmt(selectedContract.contractValue)}</span>
                      <span className="text-[10px] text-slate-500">Total authorized commitment</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Realized Invoiced Spend</span>
                      <span className="text-base font-black text-indigo-700 mt-0.5 block">{fmt(invoicedSpend)}</span>
                      <span className="text-[10px] text-indigo-600 font-semibold">38% Cumulative Drawdown</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Remaining Balance</span>
                      <span className="text-base font-black text-emerald-700 mt-0.5 block">{fmt(remainingBalance)}</span>
                      <span className="text-[10px] text-slate-500">Available for PO call-offs</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Settlement Cadence</span>
                      <span className="text-base font-black text-slate-900 mt-0.5 block">Net 30 Days</span>
                      <span className="text-[10px] text-slate-500">Post GRN 3-Way Match</span>
                    </div>
                  </div>

                  {/* Valuation Words Banner */}
                  <div className="mt-3 p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 rounded-2xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-800 block">
                        Binding Total Master Agreement Value
                      </span>
                      <span className="text-2xl font-black text-purple-950 tracking-tight">
                        {fmt(selectedContract.contractValue)}
                      </span>
                      <p className="text-[11px] text-purple-800 italic mt-0.5">
                        Amount in words: <strong className="font-semibold">{numberToIndianWords(selectedContract.contractValue)}</strong>
                      </p>
                    </div>

                    <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-purple-200 pt-2 sm:pt-0 sm:pl-4">
                      <span className="text-[10px] font-bold uppercase text-purple-800 block">Price Firmness Policy</span>
                      <span className="text-xs font-black text-purple-950">Fixed Pricing Locked</span>
                      <span className="text-[10px] text-purple-700 block font-medium">Zero price escalation across term</span>
                    </div>
                  </div>
                </div>

                {/* 3. Term, Expiry, Renewal & Milestones Timeline */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <Calendar size={13} className="text-purple-600" /> Contract Term, Milestones &amp; Renewal Parameters
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Execution Date</span>
                      <strong className="text-slate-900 text-xs block">{selectedContract.startDate}</strong>
                      <span className="text-[10px] text-slate-500">Effective legal commencement</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Contract Expiry Date</span>
                      <strong className={`text-xs block ${isExpired ? 'text-rose-600' : isExpiringSoon ? 'text-amber-600' : 'text-slate-900'}`}>
                        {selectedContract.endDate}
                      </strong>
                      <span className="text-[10px] text-slate-500">Standard expiration milestone</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Renewal Notice Cutoff</span>
                      <strong className="text-purple-700 text-xs block">{selectedContract.renewalDate}</strong>
                      <span className="text-[10px] text-slate-500">30-day advance executive review</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Auto-Renewal Clause</span>
                      <strong className="text-slate-900 text-xs block">
                        {selectedContract.autoRenew ? 'Enabled (12-Month Roll)' : 'Manual Review Only'}
                      </strong>
                      <span className="text-[10px] text-slate-500">Requires 60-day written opt-out</span>
                    </div>
                  </div>
                </div>

                {/* 4. Service Level Agreements (SLAs) & Penalty Matrix */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <Award size={13} className="text-purple-600" /> Service Level Agreements (SLAs) &amp; Operational Benchmarks
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Guaranteed SLA</span>
                        <CheckCircle2 size={13} className="text-emerald-600" />
                      </div>
                      <strong className="text-slate-900 text-xs block">99.8% Hardware Uptime</strong>
                      <span className="text-[10px] text-slate-500">24×7 enterprise operations</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Incident Response</span>
                        <CheckCircle2 size={13} className="text-emerald-600" />
                      </div>
                      <strong className="text-slate-900 text-xs block">4-Hour Critical Onsite</strong>
                      <span className="text-[10px] text-slate-500">Tier-1 OEM certified engineer</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Delay Damages (LD)</span>
                        <AlertTriangle size={13} className="text-amber-600" />
                      </div>
                      <strong className="text-slate-900 text-xs block">0.5% Per Week Delay</strong>
                      <span className="text-[10px] text-slate-500">Liquidated damages capped at 5%</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Defect Swap SLA</span>
                        <CheckCircle2 size={13} className="text-emerald-600" />
                      </div>
                      <strong className="text-slate-900 text-xs block">48-Hour Rapid Swap</strong>
                      <span className="text-[10px] text-slate-500">Immediate hot-spare replacement</span>
                    </div>
                  </div>
                </div>

                {/* 5. Legal Covenants, Jurisdiction & Governance */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <Scale size={13} className="text-purple-600" /> Legal Governance, Covenants &amp; Dispute Resolution
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Governing Law:</span>
                        <strong className="text-slate-900">Laws of the Republic of India</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Judicial Jurisdiction:</span>
                        <span className="text-slate-800 font-semibold">Exclusive Courts in Bengaluru, Karnataka</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Dispute Escalation:</span>
                        <span className="text-slate-700">30-Day Executive Consultation</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Arbitration Clause:</span>
                        <span className="text-purple-700 font-semibold">Indian Arbitration &amp; Conciliation Act, 1996</span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Intellectual Property (IPR):</span>
                        <strong className="text-emerald-700">100% Retained by Enterprise Client</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Confidentiality (NDA):</span>
                        <span className="text-slate-800 font-semibold">Perpetual Non-Disclosure Covenant</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Termination for Convenience:</span>
                        <span className="text-slate-700">60-Day Written Notice by Either Party</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Indemnity Cap:</span>
                        <span className="text-slate-800 font-medium">100% of Cumulative Agreement Fees</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Signed Legal Annexures & Executed Documents Repository */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText size={13} className="text-purple-600" /> Executed Legal Annexures &amp; Document Repository
                    </span>
                    <span className="text-[10px] font-bold text-purple-700">
                      {selectedContract.documentsCount} Signed Files on Record
                    </span>
                  </h4>

                  <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        <tr>
                          <th className="p-3">Annexure</th>
                          <th className="p-3">Legal Instrument Description</th>
                          <th className="p-3 text-center">Pages</th>
                          <th className="p-3 text-center">Format</th>
                          <th className="p-3 text-center">Execution Stamp</th>
                          <th className="p-3 text-right">Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-purple-700">ANNEXURE-A</td>
                          <td className="p-3">
                            <strong className="text-slate-900 block text-xs">Master Services Agreement (MSA) Main Body</strong>
                            <span className="text-slate-500 text-[10px]">Contains standard legal terms, representations and warranties</span>
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-700">28 Pages</td>
                          <td className="p-3 text-center font-mono text-slate-600">PDF (Signed)</td>
                          <td className="p-3 text-center text-slate-600 font-mono text-[10px]">e-Stamp #IN-KA991204</td>
                          <td className="p-3 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Digitally Verified
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-purple-700">ANNEXURE-B</td>
                          <td className="p-3">
                            <strong className="text-slate-900 block text-xs">Commercial Rate Card &amp; HSN Schedule</strong>
                            <span className="text-slate-500 text-[10px]">Negotiated item rate ceilings and tax applicability</span>
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-700">8 Pages</td>
                          <td className="p-3 text-center font-mono text-slate-600">PDF (Signed)</td>
                          <td className="p-3 text-center text-slate-600 font-mono text-[10px]">e-Stamp #IN-KA991205</td>
                          <td className="p-3 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Digitally Verified
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-purple-700">ANNEXURE-C</td>
                          <td className="p-3">
                            <strong className="text-slate-900 block text-xs">Service Level Agreement (SLA) &amp; Penalty Matrix</strong>
                            <span className="text-slate-500 text-[10px]">Incident response commitments and liquidated damages formula</span>
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-700">6 Pages</td>
                          <td className="p-3 text-center font-mono text-slate-600">PDF (Signed)</td>
                          <td className="p-3 text-center text-slate-600 font-mono text-[10px]">e-Stamp #IN-KA991206</td>
                          <td className="p-3 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Digitally Verified
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-purple-700">ANNEXURE-D</td>
                          <td className="p-3">
                            <strong className="text-slate-900 block text-xs">Mutual Non-Disclosure Agreement (NDA) &amp; Code of Ethics</strong>
                            <span className="text-slate-500 text-[10px]">Perpetual trade secret protection and anti-bribery covenants</span>
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-700">4 Pages</td>
                          <td className="p-3 text-center font-mono text-slate-600">PDF (Signed)</td>
                          <td className="p-3 text-center text-slate-600 font-mono text-[10px]">e-Stamp #IN-KA991207</td>
                          <td className="p-3 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Digitally Verified
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 7. Legal Certification & Digital Seal Stamp */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-600 text-[11px]">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800">Legal Enforceability &amp; Corporate Stamping:</p>
                    <p className="text-[10px] text-slate-500">
                      This agreement constitutes a legally binding contract under the Indian Contract Act, 1872, duly executed with government e-stamping and bilateral digital authorizations.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 shrink-0">
                    <span>Digital Seal: SHA256:CTR-{selectedContract.id}-9A3E2</span>
                    <span>•</span>
                    <span className="text-purple-600 font-bold">Legally Binding</span>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                <div className="text-[11px] text-slate-500 hidden sm:block">
                  Agreement Status: <b className="text-slate-800">{selectedContract.status}</b> • Signatures: <span className="font-semibold text-slate-800">{selectedContract.signedBy}</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => {
                      const c = selectedContract
                      setSelectedContract(null)
                      setRenewModalContract(c)
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} /> Renew Agreement
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
                  >
                    <Printer size={14} /> Print Dossier
                  </button>
                  <button
                    onClick={() => setSelectedContract(null)}
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

      {/* Renew Modal */}
      {renewModalContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 text-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-purple-700 text-sm">
              <RefreshCw size={18} /> Renew Contract {renewModalContract.id}
            </div>
            <p className="text-slate-600">
              Select the extended end date for {renewModalContract.vendor}:
            </p>
            <form onSubmit={handleRenewSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">New Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={newEndDate}
                  onChange={e => setNewEndDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenewModalContract(null)}
                  className="px-4 py-2 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Confirm Renewal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
