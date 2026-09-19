import React, { useState } from 'react'
import { TrackingStepper } from '../../components/portal/TrackingStepper'
import { useProcurement, PurchaseRequest } from '../../context/ProcurementContext'
import {
  Search,
  Filter,
  Paperclip,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  AlertCircle,
  Truck,
  User,
  Calendar,
  X,
  CheckCircle,
  Upload,
  Download,
  Package,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { isFlowBCategory } from '../../components/portal/TrackingStepper'
import { getStoredDeliveryDocs } from '../vendor/VendorPortalPages'
import {
  CATEGORIES,
  SUBCATEGORIES_BY_CATEGORY,
} from './CreateRequestPage'

// Departments list (mirrors CreateRequestPage)
const DEPARTMENTS = [
  'IT & Infrastructure',
  'Finance & Accounts',
  'Operations',
  'HR',
  'Sales & Marketing',
  'Legal & Compliance',
  'Engineering',
  'Customer Support',
  'Administration',
] as const

// ─── Category helpers (mirrored from CreateRequestPage) ────────────────────────
const PHYSICAL_CATEGORIES = new Set([
  'IT Hardware',
  'Office Accessories',
  'Office Technology',
  'Networking & Telecom',
])
const isPhysicalCategory = (cat: string) => PHYSICAL_CATEGORIES.has(cat)
const isSaaSOrCloudCat = (cat: string) =>
  cat === 'Software & SaaS' || cat === 'Cloud & Infrastructure'

const VENDORS_BY_CATEGORY: Record<string, string[]> = {
  'IT Hardware': ['Dell Technologies', 'HP Enterprise', 'Lenovo', 'Apple Enterprise'],
  'Software & SaaS': ['Microsoft Corporation', 'Adobe Systems', 'Salesforce', 'Atlassian', 'Figma'],
  'Cloud & Infrastructure': ['Amazon Web Services', 'Microsoft Azure', 'Google Cloud Platform', 'DigitalOcean'],
  'Cybersecurity': ['Palo Alto Networks', 'CrowdStrike', 'Cloudflare', 'Fortinet'],
  'IT Services': ['Accenture', 'Infosys', 'Wipro', 'TCS'],
  'Office Accessories': ['Herman Miller Inc.', 'Steelcase', 'Haworth'],
  'Office Technology': ['Samsung Display Systems', 'Canon Inc.', 'Xerox', 'Logitech'],
  'Networking & Telecom': ['Cisco Systems', 'Juniper Networks', 'Aruba Networks', 'Verizon'],
  'Training & Certifications': ['Coursera for Business', 'Udemy for Business', 'Pluralsight'],
}

const CATEGORY_CONFIGS: Record<string, { quantityLabel: string; extraFieldKey?: string; extraFieldLabel?: string; extraFieldOptions?: string[]; hideDeliveryLocation?: boolean }> = {
  'Software & SaaS': { quantityLabel: 'Number of seats / licenses', extraFieldKey: 'renewalCycle', extraFieldLabel: 'Renewal Cycle', extraFieldOptions: ['Monthly', 'Yearly'], hideDeliveryLocation: true },
  'Cloud & Infrastructure': { quantityLabel: 'Instance / Resource count', extraFieldKey: 'billingModel', extraFieldLabel: 'Billing Model', extraFieldOptions: ['On-Demand', 'Reserved 1-Year', 'Reserved 3-Year'], hideDeliveryLocation: true },
  'IT Hardware': { quantityLabel: 'Quantity', extraFieldKey: 'warrantyPeriod', extraFieldLabel: 'Warranty Period', extraFieldOptions: ['1 Year', '3 Years', '5 Years'] },
  'Cybersecurity': { quantityLabel: 'Protected Endpoints / User count', extraFieldKey: 'licenseType', extraFieldLabel: 'License Type', extraFieldOptions: ['Standard', 'Enterprise Pro'] },
  'IT Services': { quantityLabel: 'Estimated Hours / Scope Units', extraFieldKey: 'engagementModel', extraFieldLabel: 'Engagement Model', extraFieldOptions: ['Time & Materials', 'Fixed Price', 'Retainer'] },
  'Office Accessories': { quantityLabel: 'Quantity', extraFieldKey: 'assemblyRequired', extraFieldLabel: 'Assembly Required', extraFieldOptions: ['Yes', 'No'] },
  'Office Technology': { quantityLabel: 'Quantity', extraFieldKey: 'maintenancePlan', extraFieldLabel: 'Maintenance Plan', extraFieldOptions: ['Standard', 'Premium'] },
  'Networking & Telecom': { quantityLabel: 'Port / Circuit count', extraFieldKey: 'bandwidthTier', extraFieldLabel: 'Bandwidth Tier', extraFieldOptions: ['1 Gbps', '10 Gbps', '100 Gbps'] },
  'Training & Certifications': { quantityLabel: 'Number of trainees', extraFieldKey: 'deliveryFormat', extraFieldLabel: 'Delivery Format', extraFieldOptions: ['Online Self-Paced', 'Instructor-Led Virtual', 'On-Site'] },
}

// ─── Edit form state type ────────────────────────────────────────────────────
interface EditForm {
  title: string
  category: string
  subcategory: string
  description: string
  quantity: number
  estimatedCost: number | ''
  requiredBy: string
  department: string
  deliveryLocation: string
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  preferredVendor: string
  justification: string
  attachment: File | null
  extraFields: Record<string, string>
}

function buildEditForm(req: PurchaseRequest): EditForm {
  const config = CATEGORY_CONFIGS[req.category]
  const defaultExtra: Record<string, string> = {}
  if (config?.extraFieldKey && config?.extraFieldOptions) {
    defaultExtra[config.extraFieldKey] = config.extraFieldOptions[0]
  }
  return {
    title: req.title,
    category: req.category,
    subcategory: req.subcategory || '',
    description: req.description || '',
    quantity: req.quantity,
    estimatedCost: req.estimatedCost,
    requiredBy: req.requiredBy || '',
    department: req.department || '',
    deliveryLocation: req.deliveryLocation || '',
    priority: req.priority || 'Medium',
    preferredVendor: req.preferredVendor || '',
    justification: req.justification || '',
    attachment: null,
    extraFields: { ...defaultExtra, ...req.extraFields },
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export const MyRequestsPage: React.FC = () => {
  const location = useLocation()
  const routeState = location.state as { filterStatus?: string } | null

  const { requests, resubmitRequest } = useProcurement()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState(() => routeState?.filterStatus || 'All')
  const [filterCategory, setFilterCategory] = useState('All')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({})
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [resubmitSuccess, setResubmitSuccess] = useState(false)

  const toggleHistory = (id: string) => {
    setExpandedHistory((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleOpenEdit = (req: PurchaseRequest) => {
    setEditingRequest(req)
    setEditForm(buildEditForm(req))
    setResubmitSuccess(false)
  }

  const handleCategoryChange = (newCat: string) => {
    if (!editForm) return
    const newConfig = CATEGORY_CONFIGS[newCat]
    const defaultExtra: Record<string, string> = {}
    if (newConfig?.extraFieldKey && newConfig?.extraFieldOptions) {
      defaultExtra[newConfig.extraFieldKey] = newConfig.extraFieldOptions[0]
    }
    setEditForm({ ...editForm, category: newCat, preferredVendor: '', extraFields: defaultExtra })
  }

  // Determine which role returned the request (for dynamic button label)
  const returnerRole = (() => {
    if (!editingRequest) return 'Manager'
    const returnStep = editingRequest.history?.slice().reverse().find(
      (s) => s.action.toLowerCase().includes('return')
    )
    return returnStep?.actorRole || editingRequest.currentlyWith?.role || 'Manager'
  })()

  const handleSaveResubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRequest || !editForm) return

    resubmitRequest(editingRequest.id, {
      title: editForm.title,
      category: editForm.category,
      subcategory: editForm.subcategory,
      description: editForm.description,
      quantity: editForm.quantity,
      estimatedCost: Number(editForm.estimatedCost) || 0,
      requiredBy: editForm.requiredBy,
      department: editForm.department,
      deliveryLocation: editForm.deliveryLocation,
      priority: editForm.priority,
      preferredVendor: editForm.preferredVendor,
      justification: editForm.justification,
      attachmentName: editForm.attachment?.name,
      attachmentCount: editForm.attachment ? 1 : 0,
      extraFields: editForm.extraFields,
    })

    setResubmitSuccess(true)
    setTimeout(() => {
      setEditingRequest(null)
      setEditForm(null)
      setResubmitSuccess(false)
    }, 1400)
  }

  const filtered = requests.filter((req) => {
    const matchesSearch =
      req.title.toLowerCase().includes(search.toLowerCase()) ||
      req.id.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = filterStatus === 'All' || req.status === filterStatus
    const matchesCategory = filterCategory === 'All' || req.category === filterCategory

    let matchesDate = true
    if (startDate) matchesDate = matchesDate && new Date(req.date) >= new Date(startDate)
    if (endDate) matchesDate = matchesDate && new Date(req.date) <= new Date(endDate)

    return matchesSearch && matchesStatus && matchesCategory && matchesDate
  })

  const totalActiveCount = filtered.filter((r) => r.status !== 'Completed' && r.status !== 'Rejected').length
  const totalCostSum = filtered.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0)

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Medium': return 'bg-amber-100 text-amber-800 border-amber-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  // Derived from editForm
  const editCategoryConfig = editForm ? CATEGORY_CONFIGS[editForm.category] || { quantityLabel: 'Quantity' } : null
  const editIsSaaSCloud = editForm ? isSaaSOrCloudCat(editForm.category) : false
  const editIsPhysical = editForm ? isPhysicalCategory(editForm.category) : false
  const editAvailableVendors = editForm ? VENDORS_BY_CATEGORY[editForm.category] || [] : []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
          <p className="text-xs text-gray-500">
            Live 10-stage tracking flow for all your submitted procurement requests.
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2 rounded-xl text-xs font-bold shadow-sm">
          📊 {totalActiveCount} Active Requests · ${totalCostSum.toLocaleString('en-US', { minimumFractionDigits: 2 })} Total Estimated Cost
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Request ID or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border rounded-lg bg-gray-50 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs font-semibold p-2 border rounded-lg bg-gray-50 border-gray-300 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="In Procurement">In Procurement</option>
              <option value="Completed">Completed</option>
              <option value="Returned">Returned</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full text-xs font-semibold p-2 border rounded-lg bg-gray-50 border-gray-300 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => { setSearch(''); setFilterStatus('All'); setFilterCategory('All'); setStartDate(''); setEndDate('') }}
              className="w-full text-xs text-gray-600 hover:text-gray-900 font-semibold py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100 text-xs">
          <Calendar size={14} className="text-gray-400" />
          <span className="font-semibold text-gray-600">Date Range:</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-1.5 border rounded-lg bg-gray-50 border-gray-300 text-xs" />
          <span className="text-gray-400">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-1.5 border rounded-lg bg-gray-50 border-gray-300 text-xs" />
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-6">
        {filtered.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 shadow-sm text-gray-500">
            <Filter size={36} className="mx-auto mb-2 text-gray-300" />
            <h3 className="text-sm font-bold text-gray-700">No requests match your current filters</h3>
            <p className="text-xs text-gray-400 mt-1">Try resetting search keywords or category filters.</p>
          </div>
        ) : (
          filtered.map((req) => {
            const isHistoryOpen = expandedHistory[req.id] || false
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                {/* Request Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">{req.id}</span>
                      <span className="text-xs text-gray-400 font-medium">{req.date}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${priorityColor(req.priority)}`}>
                        Priority: {req.priority}
                      </span>
                      {req.attachmentCount > 0 && (
                        <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 border border-gray-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Paperclip size={12} /> {req.attachmentCount} Attachment(s)
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-gray-900 mt-1">{req.title}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Category: <span className="font-semibold text-gray-700">{req.category}</span> • Qty:{' '}
                      <span className="font-semibold text-gray-700">{req.quantity}</span> • Est. Cost:{' '}
                      <span className="font-extrabold text-gray-900">RS {req.estimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {(req.status === 'Returned' || req.status === 'Pending' || req.status === 'Draft') && (
                      <button
                        onClick={() => handleOpenEdit(req)}
                        className={`flex items-center gap-1.5 font-bold text-xs px-4 py-2 rounded-xl shadow transition-all ${
                          req.status === 'Returned'
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : req.status === 'Draft'
                            ? 'bg-gray-700 hover:bg-gray-900 text-white'
                            : 'bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <RotateCcw size={15} />
                        {req.status === 'Returned' ? 'Edit & Resubmit' : req.status === 'Draft' ? 'Edit & Submit' : 'Edit & Resubmit'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Returned Reason */}
                {req.status === 'Returned' && req.returnReason && (
                  <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2 shadow-xs">
                    <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
                    <span><strong>Returned Reason from Manager:</strong> {req.returnReason}</span>
                  </div>
                )}

                {/* Rejected Reason */}
                {req.status === 'Rejected' && (() => {
                  const rejectionStep = req.history?.slice().reverse().find((s) => s.action.toLowerCase().includes('reject'))
                  const rejectorRole = rejectionStep?.actorRole || 'Approver'
                  const rejectionRemark = rejectionStep?.remark || req.returnReason || 'No specific remark provided.'
                  return (
                    <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-center gap-2 shadow-xs">
                      <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
                      <span><strong>Rejected Reason from {rejectorRole}:</strong> {rejectionRemark}</span>
                    </div>
                  )
                })()}

                {/* Currently With */}
                <div className="mb-4 bg-gray-50 p-2.5 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-blue-600" />
                    <span className="text-gray-600 font-medium">Currently with:</span>
                    <strong className="text-gray-900">{req.currentlyWith?.role} — {req.currentlyWith?.name}</strong>
                  </div>
                  {req.currentStage >= 7 && (
                    <div className="flex items-center gap-2 text-purple-700 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                      <Truck size={14} />
                      <span>Delivery Ref: {req.deliveryRef || 'TRK-994821'} | Expected: {req.expectedDelivery || '2026-09-25'}</span>
                    </div>
                  )}
                </div>

                <TrackingStepper currentStage={req.currentStage} status={req.status} category={req.category} flowType={req.flowType} />

                {/* Flow A Linked Delivery Documents Panel (Visible at Stage 6+ Delivery/Invoice/Payment for Flow A) */}
                {!isFlowBCategory(req.category) && req.currentStage >= 6 && (() => {
                  const poRef = req.poRef || `PO-VNDHW001-10`
                  const deliveryDocs = getStoredDeliveryDocs(req.id) || getStoredDeliveryDocs(poRef) || {
                    poRef,
                    challanDocName: `Delivery_Challan_${req.id}.pdf`,
                    invoiceDocName: `Commercial_Invoice_${req.id}.pdf`,
                    warrantyDocName: `OEM_Warranty_Card_${req.id}.pdf`,
                    deliveryDate: '2026-09-20',
                    status: 'Delivered & Docs Attached',
                  }

                  const handleDownloadDeliveryFile = (docName: string) => {
                    const content = `================================================================
KSS PROCUREMENT OS - VENDOR SHIPMENT SIGN-OFF DOCUMENT
================================================================
Document Name: ${docName}
Request ID: ${req.id}
PO Reference: ${poRef}
Category: ${req.category} / ${req.subcategory}
Vendor: ${req.preferredVendor || 'Dell Technologies'}
Delivery Status: ${deliveryDocs.status}
Verification Date: ${deliveryDocs.deliveryDate || '2026-09-20'}

DESCRIPTION & VERIFICATION CLAUSES:
- Official vendor dispatch sign-off document.
- Verified physical goods delivery subject to 3-way matching.
- Included in automated Audit & Compliance log.
================================================================
Certified Procurement Document - KSS Procurement OS
================================================================
`
                    const isDocx = docName.toLowerCase().endsWith('.docx')
                    const mimeType = isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'
                    const blob = new Blob([content], { type: mimeType })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = docName
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                  }

                  return (
                    <div className="my-4 p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
                        <h4 className="font-bold text-purple-950 flex items-center gap-2 text-xs">
                          <Package size={16} className="text-purple-700" />
                          Linked Delivery Documents (Vendor Shipment Sign-off)
                        </h4>
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-300">
                          Flow A Goods Sign-off ({poRef})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Delivery Challan */}
                        <div className="p-3 bg-white rounded-lg border border-purple-200 flex flex-col justify-between space-y-2 shadow-2xs">
                          <div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">📜 Delivery Challan</span>
                            <span className="font-bold text-gray-900 truncate block mt-1" title={deliveryDocs.challanDocName}>
                              {deliveryDocs.challanDocName}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">✓ Dispatch Proof Attached</span>
                          </div>
                          <button
                            onClick={() => handleDownloadDeliveryFile(deliveryDocs.challanDocName)}
                            className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded border border-purple-200 flex items-center justify-center gap-1 cursor-pointer transition-colors text-[11px]"
                          >
                            <Download size={12} /> Download Challan
                          </button>
                        </div>

                        {/* Invoice */}
                        <div className="p-3 bg-white rounded-lg border border-purple-200 flex flex-col justify-between space-y-2 shadow-2xs">
                          <div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">🧾 Commercial Invoice</span>
                            <span className="font-bold text-gray-900 truncate block mt-1" title={deliveryDocs.invoiceDocName}>
                              {deliveryDocs.invoiceDocName}
                            </span>
                            <span className="text-[10px] text-purple-700 font-semibold block mt-0.5">Linked to PO Match</span>
                          </div>
                          <button
                            onClick={() => handleDownloadDeliveryFile(deliveryDocs.invoiceDocName)}
                            className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded border border-purple-200 flex items-center justify-center gap-1 cursor-pointer transition-colors text-[11px]"
                          >
                            <Download size={12} /> Download Invoice
                          </button>
                        </div>

                        {/* Warranty Card */}
                        <div className="p-3 bg-white rounded-lg border border-purple-200 flex flex-col justify-between space-y-2 shadow-2xs">
                          <div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">🛡️ Warranty Certificate</span>
                            <span className="font-bold text-gray-900 truncate block mt-1" title={deliveryDocs.warrantyDocName || 'Warranty_Card.pdf'}>
                              {deliveryDocs.warrantyDocName || 'Warranty_Certificate_HW.pdf'}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">OEM Hardware Warranty</span>
                          </div>
                          <button
                            onClick={() => handleDownloadDeliveryFile(deliveryDocs.warrantyDocName || 'Warranty_Certificate_HW.pdf')}
                            className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded border border-purple-200 flex items-center justify-center gap-1 cursor-pointer transition-colors text-[11px]"
                          >
                            <Download size={12} /> Download Warranty
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => toggleHistory(req.id)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                  >
                    {isHistoryOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    {isHistoryOpen ? 'Hide full history' : 'View full history'} ({req.history?.length || 0} steps)
                  </button>
                  <span className="text-[11px] text-gray-400 font-medium">Last updated: {req.lastUpdated}</span>
                </div>

                {isHistoryOpen && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3 text-xs">
                    <h4 className="font-bold text-gray-800 uppercase tracking-wider text-[11px] border-b pb-2">Approval & Audit Log Trail</h4>
                    {req.history && req.history.length > 0 ? (
                      <div className="space-y-2">
                        {req.history.map((step, idx) => (
                          <div key={idx} className="p-2.5 bg-white rounded-lg border border-gray-200 flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 font-bold text-gray-900">
                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-bold">{idx + 1}</span>
                                <span>{step.action}</span>
                                <span className="text-gray-400 font-normal">by</span>
                                <span className="text-blue-700 font-semibold">{step.actorRole} ({step.actorName})</span>
                              </div>
                              {step.remark && <p className="text-gray-600 text-[11px] mt-1 pl-7 italic">"{step.remark}"</p>}
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">{step.date}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No history log recorded yet.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ─── Edit & Resubmit Modal (Full Form) ─────────────────────────────── */}
      {editingRequest && editForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-200 my-6">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <RotateCcw className="text-amber-500" size={18} />
                Edit & Resubmit — {editingRequest.id}
              </h3>
              <button onClick={() => setEditingRequest(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Returned Reason Banner */}
              {editingRequest.returnReason && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                  <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-0.5">Returned Reason from {returnerRole}:</p>
                    <p>{editingRequest.returnReason}</p>
                    <p className="mt-1.5 text-amber-700 font-semibold">↳ Address this feedback below before resubmitting.</p>
                  </div>
                </div>
              )}

              {resubmitSuccess ? (
                <div className="p-8 text-center bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle className="mx-auto mb-3 text-green-600" size={40} />
                  <h4 className="text-sm font-bold text-green-900">Resubmitted Successfully!</h4>
                  <p className="text-xs text-green-700 mt-1">Request sent back to {returnerRole} for approval.</p>
                </div>
              ) : (
                <form onSubmit={handleSaveResubmit} className="space-y-4 text-xs">

                  {/* 1. Title */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">1. Request Title *</label>
                    <input
                      type="text" required
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* 2 & 3. Category & Subcategory */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">2. Category *</label>
                      <select
                        value={editForm.category}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`block font-bold mb-1 ${editIsSaaSCloud ? 'text-blue-900' : 'text-gray-700'}`}>
                        3. {editIsSaaSCloud ? 'Subscription / Service Needed *' : 'Subcategory *'}
                      </label>
                      <input
                        type="text" required
                        placeholder={editIsSaaSCloud ? 'e.g. Figma Enterprise, AWS Cloud' : 'e.g. Laptops, Servers'}
                        value={editForm.subcategory}
                        onChange={(e) => setEditForm({ ...editForm, subcategory: e.target.value })}
                        className={`w-full p-2.5 border rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none ${editIsSaaSCloud ? 'bg-blue-50/50 border-blue-300 text-blue-900' : 'bg-gray-50 border-gray-300'}`}
                      />
                    </div>
                  </div>

                  {/* Category extra field */}
                  {editCategoryConfig?.extraFieldKey && editCategoryConfig?.extraFieldOptions && (
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                      <label className="block font-bold text-blue-900 mb-1">
                        Category Detail: {editCategoryConfig.extraFieldLabel} *
                      </label>
                      <select
                        value={editForm.extraFields[editCategoryConfig.extraFieldKey] || editCategoryConfig.extraFieldOptions[0]}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          extraFields: { ...editForm.extraFields, [editCategoryConfig.extraFieldKey!]: e.target.value }
                        })}
                        className="w-full p-2.5 border rounded-lg bg-white border-blue-200 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {editCategoryConfig.extraFieldOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  )}

                  {/* 4. Description */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-bold text-gray-700">4. Description *</label>
                      <span className="text-[10px] text-gray-400 font-semibold">{editForm.description.length}/500</span>
                    </div>
                    <textarea
                      required rows={3} maxLength={500}
                      placeholder="Detailed specifications or requirement details..."
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* 5. Quantity / Est. Cost / Required By */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        5. {editCategoryConfig?.quantityLabel || 'Quantity'} *
                      </label>
                      <input
                        type="number" required min={1}
                        value={editForm.quantity}
                        onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                        className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        6. Est. Cost (USD){editIsPhysical ? ' *' : ' (optional)'}
                      </label>
                      <input
                        type="number" min={0} step="0.01"
                        required={editIsPhysical}
                        placeholder="0.00"
                        value={editForm.estimatedCost}
                        onChange={(e) => setEditForm({ ...editForm, estimatedCost: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">7. Required By *</label>
                      <input
                        type="date" required
                        value={editForm.requiredBy}
                        onChange={(e) => setEditForm({ ...editForm, requiredBy: e.target.value })}
                        className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 8. Department / 9. Delivery Location / 10. Priority */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">8. Department *</label>
                      <select
                        required
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    {!editCategoryConfig?.hideDeliveryLocation && (
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">9. Delivery Location *</label>
                        <input
                          type="text" required
                          placeholder="e.g. Pune HQ, 4th Floor"
                          value={editForm.deliveryLocation}
                          onChange={(e) => setEditForm({ ...editForm, deliveryLocation: e.target.value })}
                          className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">10. Priority *</label>
                      <select
                        required
                        value={editForm.priority}
                        onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as EditForm['priority'] })}
                        className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  {/* 11. Preferred Vendor / Provider */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      {isSaaSOrCloudCat(editForm.category) ? '11. Preferred Provider (optional)' : '11. Preferred Vendor (optional)'}
                    </label>
                    {editAvailableVendors.length > 0 ? (
                      <select
                        value={editForm.preferredVendor}
                        onChange={(e) => setEditForm({ ...editForm, preferredVendor: e.target.value })}
                        className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">— No preference —</option>
                        {editAvailableVendors.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder={isSaaSOrCloudCat(editForm.category) ? "Enter provider name..." : "Enter vendor name..."}
                        value={editForm.preferredVendor}
                        onChange={(e) => setEditForm({ ...editForm, preferredVendor: e.target.value })}
                        className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    )}
                  </div>

                  {/* 12. Justification */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-bold text-gray-700">12. Justification / Business Case *</label>
                      <span className="text-[10px] text-gray-400 font-semibold">{editForm.justification.length}/800</span>
                    </div>
                    <textarea
                      required rows={4} maxLength={800}
                      placeholder="Address the returned reason and explain the business need clearly..."
                      value={editForm.justification}
                      onChange={(e) => setEditForm({ ...editForm, justification: e.target.value })}
                      className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Attachments */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Attachments (optional)</label>
                    <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-gray-300 rounded-xl p-3 hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                      <Upload size={16} className="text-gray-400" />
                      <span className="text-gray-500 font-medium">
                        {editForm.attachment ? editForm.attachment.name : 'Click to upload new file (PDF, XLSX, DOCX)'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.xlsx,.docx,.png,.jpg"
                        className="hidden"
                        onChange={(e) => setEditForm({ ...editForm, attachment: e.target.files?.[0] || null })}
                      />
                    </label>
                    {editingRequest.attachmentName && !editForm.attachment && (
                      <p className="text-[11px] text-gray-500 mt-1">
                        📎 Current file: <span className="font-semibold">{editingRequest.attachmentName}</span> — upload a new file to replace it
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setEditingRequest(null)}
                      className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow flex items-center gap-2 text-xs transition-colors"
                    >
                      <CheckCircle size={15} /> Resubmit to {returnerRole}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
