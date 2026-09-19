import React, { useState, useMemo } from 'react'
import {
  Truck, PlusCircle, ShieldCheck, Award, FileText,
  CheckCircle, XCircle, AlertTriangle, Search, Filter,
  Phone, Mail, Building, FileCheck, Check, X, Eye,
  Clock, DollarSign, Download, UploadCloud, HelpCircle
} from 'lucide-react'
import { useManagerData, VendorItem } from '../../context/ManagerDataContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export const AdminVendorsPage: React.FC = () => {
  const { vendors, updateVendorStatus, addVendor } = useManagerData()

  // Sub-tabs: 'list' | 'approval' | 'risk' | 'performance' | 'docs' | 'add'
  const [subTab, setSubTab] = useState<'list' | 'approval' | 'risk' | 'performance' | 'docs' | 'add'>('list')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modals & Details
  const [selectedVendor, setSelectedVendor] = useState<VendorItem | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Add Vendor Form State
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    contactPerson: '',
    email: '',
    phone: '',
    category: 'IT Hardware',
    gstNumber: '',
    panNumber: '',
    address: '',
    paymentTerms: 'Net 30',
    notes: '',
  })

  // Categories
  const categories = useMemo(() => {
    const s = new Set<string>()
    vendors.forEach(v => { if (v.category) s.add(v.category) })
    return ['ALL', ...Array.from(s)]
  }, [vendors])

  // Filtered Vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const q = search.toLowerCase()
      const matchesSearch =
        v.id.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        v.company.toLowerCase().includes(q) ||
        v.contactPerson.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q)

      const matchesCat = categoryFilter === 'ALL' || v.category === categoryFilter
      const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter

      return matchesSearch && matchesCat && matchesStatus
    })
  }, [vendors, search, categoryFilter, statusFilter])

  // Form submit
  const handleAddVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('Vendor Name and Official Email are required', 'error')
      return
    }

    addVendor({
      name: formData.name,
      company: formData.company || formData.name,
      contactPerson: formData.contactPerson,
      email: formData.email,
      phone: formData.phone,
      category: formData.category,
      status: 'Pending Approval',
      riskLevel: 'Low',
      performanceScore: 92,
      activeContracts: 0,
      totalOrders: 0,
      totalPurchaseValue: 0,
      complianceStatus: 'Pending Audit',
      documentsCount: 4,
      onTimeDeliveryRate: 95,
      qualityIssuesCount: 0,
      complaintsCount: 0,
      notes: formData.notes,
    })

    showToast(`✓ Vendor ${formData.name} successfully submitted for approval!`, 'success')
    setFormData({
      name: '',
      company: '',
      contactPerson: '',
      email: '',
      phone: '',
      category: 'IT Hardware',
      gstNumber: '',
      panNumber: '',
      address: '',
      paymentTerms: 'Net 30',
      notes: '',
    })
    setSubTab('approval')
  }

  // Action: Approve Vendor
  const handleApproveVendor = (v: VendorItem) => {
    updateVendorStatus(v.id, 'Active')
    showToast(`✓ Vendor ${v.name} has been approved and activated!`, 'success')
  }

  // Action: Reject Vendor
  const handleRejectVendor = (v: VendorItem) => {
    updateVendorStatus(v.id, 'Rejected')
    showToast(`✕ Vendor ${v.name} has been rejected.`, 'error')
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 text-white animate-fadeIn ${
            toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-rose-600' : 'bg-indigo-600'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <Truck size={12} /> VENDOR ECOSYSTEM
            </span>
            <span className="text-xs text-slate-400 font-medium">{vendors.length} Total Registered Partners</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            Vendor Master Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Onboard new vendors, review onboarding approvals, monitor risk scores, track delivery performance, and manage compliance files.
          </p>
        </div>

        <button
          onClick={() => setSubTab('add')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all w-fit"
        >
          <PlusCircle size={15} /> Add New Vendor
        </button>
      </div>

      {/* 6 Sub-Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs">
        <div className="flex border-b border-slate-100 pb-2 overflow-x-auto gap-1">
          {[
            { id: 'list', label: 'Vendor List' },
            { id: 'approval', label: 'Vendor Approval' },
            { id: 'risk', label: 'Vendor Risk' },
            { id: 'performance', label: 'Vendor Performance' },
            { id: 'docs', label: 'Vendor Documents' },
            { id: 'add', label: 'Add Vendor' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id as any)}
              className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                subTab === t.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter bar for list/approval/risk/perf */}
        {subTab !== 'add' && (
          <div className="flex flex-col md:flex-row items-center gap-3 pt-3">
            <div className="relative flex-1 w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vendor by ID, company name, contact, category..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-slate-400 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-slate-400 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Suspended">Suspended</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Sub-Tab 1: Vendor List */}
      {subTab === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Vendor ID</th>
                  <th className="p-3.5">Company & Name</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Risk Level</th>
                  <th className="p-3.5">Score</th>
                  <th className="p-3.5">Orders & Spend</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredVendors.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-bold text-indigo-600 whitespace-nowrap">{v.id}</td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{v.name}</p>
                      <span className="text-[11px] text-slate-400">{v.company}</span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <p className="text-slate-800 font-semibold">{v.contactPerson}</p>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1"><Mail size={10} /> {v.email}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Phone size={10} /> {v.phone}</span>
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-700">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">{v.category}</span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        v.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                        v.status === 'Pending Approval' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                        v.status === 'Suspended' ? 'bg-orange-100 text-orange-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.riskLevel === 'Low' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        v.riskLevel === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {v.riskLevel} Risk
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-bold text-slate-900">
                      {v.performanceScore}%
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <p className="font-bold text-slate-900">{fmt(v.totalPurchaseValue)}</p>
                      <span className="text-[10px] text-slate-400">{v.totalOrders} POs completed</span>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedVendor(v)}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Eye size={12} /> Dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Vendor Approval */}
      {subTab === 'approval' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <FileCheck size={18} className="text-purple-600" /> Pending Vendor Onboarding Approvals
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Vendors that have submitted GST, bank details, and compliance documents awaiting Administrative verification.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Vendor ID</th>
                    <th className="p-3">Company Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Compliance Docs</th>
                    <th className="p-3">Submitted On</th>
                    <th className="p-3">Current Status</th>
                    <th className="p-3 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendors.filter(v => v.status === 'Pending Approval').map(v => (
                    <tr key={v.id} className="hover:bg-amber-50/40">
                      <td className="p-3 font-bold text-indigo-600">{v.id}</td>
                      <td className="p-3 font-bold text-slate-900">{v.name}</td>
                      <td className="p-3 text-slate-600">{v.category}</td>
                      <td className="p-3 text-emerald-700 font-semibold">{v.documentsCount} Verified Attachments</td>
                      <td className="p-3 text-slate-500">{v.registeredDate}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Pending Approval
                        </span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApproveVendor(v)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs"
                          >
                            <Check size={13} /> Approve
                          </button>
                          <button
                            onClick={() => handleRejectVendor(v)}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs"
                          >
                            <X size={13} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {vendors.filter(v => v.status === 'Pending Approval').length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        No vendors currently pending approval.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Vendor Risk */}
      {subTab === 'risk' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden text-xs">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Vendor Risk & Compliance Assessment Matrix</h3>
            <p className="text-slate-500 text-xs">Continuous evaluation of vendor statutory compliance, quality defect rates, and SLA adherence.</p>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Vendor</th>
                <th className="p-3.5">Risk Level</th>
                <th className="p-3.5">Compliance Status</th>
                <th className="p-3.5">Doc Status</th>
                <th className="p-3.5">Delivery Reliability</th>
                <th className="p-3.5">Quality Issues</th>
                <th className="p-3.5">Complaints</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredVendors.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/70">
                  <td className="p-3.5">
                    <span className="font-bold text-slate-900 block">{v.name}</span>
                    <span className="text-[11px] text-indigo-600">{v.id}</span>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded font-bold text-[10px] border ${
                      v.riskLevel === 'Low' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      v.riskLevel === 'Medium' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      {v.riskLevel} Risk
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-700">{v.complianceStatus}</td>
                  <td className="p-3.5 text-slate-700">{v.documentsCount} Files Uploaded</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full" style={{ width: `${v.onTimeDeliveryRate}%` }} />
                      </div>
                      <span className="font-bold text-slate-900">{v.onTimeDeliveryRate}%</span>
                    </div>
                  </td>
                  <td className="p-3.5 font-bold text-slate-800">{v.qualityIssuesCount} reported</td>
                  <td className="p-3.5 font-bold text-slate-800">{v.complaintsCount} tickets</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sub-Tab 4: Vendor Performance */}
      {subTab === 'performance' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden text-xs">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Vendor Performance & Fulfillment Telemetry</h3>
            <p className="text-slate-500 text-xs">Historical tracking of on-time delivery rates, total spend volume, and active contract execution.</p>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Vendor</th>
                <th className="p-3.5">Performance Score</th>
                <th className="p-3.5">Total Orders</th>
                <th className="p-3.5">On-Time Delivery</th>
                <th className="p-3.5">Delayed Deliveries</th>
                <th className="p-3.5">Total Enterprise Spend</th>
                <th className="p-3.5">Active Contracts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredVendors.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/70">
                  <td className="p-3.5 font-bold text-slate-900">{v.name}</td>
                  <td className="p-3.5">
                    <span className="text-base font-extrabold text-emerald-700">{v.performanceScore}%</span>
                  </td>
                  <td className="p-3.5 text-slate-700 font-bold">{v.totalOrders} Completed</td>
                  <td className="p-3.5 text-emerald-700 font-bold">{v.onTimeDeliveryRate}%</td>
                  <td className="p-3.5 text-slate-500">{Math.max(0, 100 - v.onTimeDeliveryRate)}%</td>
                  <td className="p-3.5 font-black text-slate-900">{fmt(v.totalPurchaseValue)}</td>
                  <td className="p-3.5 text-indigo-700 font-bold">{v.activeContracts} MSA / SLA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sub-Tab 5: Vendor Documents */}
      {subTab === 'docs' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Vendor Statutory & Compliance Document Repository</h3>
            <p className="text-slate-500 text-xs">Centralized vault for GST certificates, PAN cards, MSME registrations, and MSA contracts.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map(v => (
              <div key={v.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate max-w-[180px]">{v.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">{v.id}</span>
                </div>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><FileText size={12} className="text-slate-400" /> Certificate of Incorporation</span>
                    <span className="text-emerald-700 font-bold text-[10px]">Verified</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><FileText size={12} className="text-slate-400" /> GST Registration Form</span>
                    <span className="text-emerald-700 font-bold text-[10px]">Verified</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><FileText size={12} className="text-slate-400" /> Cancelled Cheque / Bank Mandate</span>
                    <span className="text-emerald-700 font-bold text-[10px]">Verified</span>
                  </div>
                </div>
                <button
                  onClick={() => showToast(`Downloading compliance pack for ${v.name}...`, 'info')}
                  className="w-full py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download size={13} /> Download Document Dossier
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 6: Add Vendor */}
      {subTab === 'add' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs max-w-2xl mx-auto text-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <PlusCircle className="text-indigo-600" /> Onboard New Enterprise Vendor
            </h3>
            <p className="text-slate-500 text-xs">
              Fill out company particulars, category, commercial terms, and contact representative to assign unique Vendor ID.
            </p>
          </div>

          <form onSubmit={handleAddVendorSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Vendor Trading Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cisco Systems India"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Registered Legal Entity *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cisco Commerce India Pvt Ltd"
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Contact Representative *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kulkarni"
                  value={formData.contactPerson}
                  onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Corporate Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. enterprise-sales@cisco.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +91 98200 12345"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Procurement Category *</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                >
                  <option value="IT Hardware">IT Hardware</option>
                  <option value="Software & SaaS">Software & SaaS</option>
                  <option value="Cloud & Infrastructure">Cloud & Infrastructure</option>
                  <option value="Cybersecurity">Cybersecurity</option>
                  <option value="IT Services">IT Services</option>
                  <option value="Office Accessories">Office Accessories</option>
                  <option value="Office Technology">Office Technology</option>
                  <option value="Networking & Telecom">Networking & Telecom</option>
                  <option value="Training & Certifications">Training & Certifications</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">GSTIN Number *</label>
                <input
                  type="text"
                  placeholder="e.g. 29AAAAA0000A1Z5"
                  value={formData.gstNumber}
                  onChange={e => setFormData({ ...formData, gstNumber: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Standard Payment Terms</label>
                <select
                  value={formData.paymentTerms}
                  onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                >
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Immediate Wire">Immediate Wire</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Remarks & Onboarding Justification</label>
              <textarea
                rows={2}
                placeholder="Details regarding sole source, tender selection, or master contract terms..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubTab('list')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors"
              >
                Submit Vendor for Onboarding
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vendor Dossier Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-600">{selectedVendor.id}</span>
                <h3 className="text-base font-bold text-slate-900">{selectedVendor.name}</h3>
              </div>
              <button onClick={() => setSelectedVendor(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Corporate Entity</span>
                <strong className="text-slate-800">{selectedVendor.company}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Category</span>
                <strong className="text-slate-800">{selectedVendor.category}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Contact Person</span>
                <strong className="text-slate-800">{selectedVendor.contactPerson}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Email</span>
                <strong className="text-slate-800">{selectedVendor.email}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Total Purchase Value</span>
                <strong className="text-slate-900 text-sm font-black">{fmt(selectedVendor.totalPurchaseValue)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Performance Score</span>
                <strong className="text-emerald-700 text-sm font-black">{selectedVendor.performanceScore}%</strong>
              </div>
            </div>

            {selectedVendor.notes && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase mb-1">Administrative Notes</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">{selectedVendor.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedVendor(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
