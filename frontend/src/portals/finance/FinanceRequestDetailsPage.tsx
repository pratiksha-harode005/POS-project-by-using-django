import React, { useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  FileText, Check, Clock, X, AlertTriangle, ArrowLeft, Building,
  User, Calendar, DollarSign, Tag, Paperclip, Truck, Box, Package,
  CreditCard, GitCompare, ChevronDown, CheckCircle2, ChevronRight,
  PlusCircle, ShieldCheck, Layers, ArrowUpRight, CheckCircle
} from 'lucide-react'
import { useFinanceData, ProcurementRequest, RFQ, ApprovalParameters } from '../../context/ManagerDataContext'
import { getWorkflowProgression } from '../../utils/workflowUtils'
import { RequestApprovalModal } from '../../components/portal/RequestApprovalModal'
import { useAuth } from '../../context/AuthContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

const HARDWARE_STAGES_CONFIG = [
  { name: 'CREATE REQUEST', dept: 'Requester / Department' },
  { name: 'MANAGER APPROVAL', dept: 'Procurement Manager' },
  { name: 'FINANCE APPROVAL', dept: 'Finance & Treasury' },
  { name: 'ADMIN APPROVAL', dept: 'Executive Admin' },
  { name: 'RFQ SENT', dept: 'Sourcing Team' },
  { name: 'VENDOR QUOTES RECEIVED', dept: 'Invited Vendors' },
  { name: 'DELIVERY', dept: 'Logistics & Dock Receiving' },
  { name: 'INVOICE', dept: 'Commercial Accounts' },
  { name: 'VERIFICATION AND ORDER COMPLETE', dept: 'Audit & Order Settlement' },
  { name: 'PAYMENT', dept: 'Treasury & Bank Clearing' },
]

const SOFTWARE_STAGES_CONFIG = [
  { name: 'CREATE REQUEST', dept: 'Requester / Department' },
  { name: 'MANAGER APPROVAL', dept: 'Procurement Manager' },
  { name: 'FINANCE APPROVAL', dept: 'Finance & Treasury' },
  { name: 'ADMIN APPROVAL', dept: 'Executive Admin' },
  { name: 'VERIFICATION AND ORDER COMPLETE', dept: 'IT Operations & Provisioning' },
  { name: 'PAYMENT', dept: 'Treasury & Bank Clearing' },
]

export const FinanceRequestDetailsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const { allRequests, rfqs, approveFinanceRequest } = useFinanceData()

  const actorName = user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Finance Officer'

  const reqId = searchParams.get('id') || allRequests[0]?.id || ''
  const [selectedId, setSelectedId] = useState(reqId)
  const [viewMode, setViewMode] = useState<'FORM' | 'STEPPER'>('FORM')

  // Approval modal state (Image 2)
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [approvalNote, setApprovalNote] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleConfirmApproval = (params: ApprovalParameters) => {
    if (!request) return
    approveFinanceRequest(
      request.id,
      params.approvalComments || 'Verified within budget allocation. Authorized for PO release.',
      actorName
    )
    showToast(`✓ Request ${request.id} approved! Forwarded for PO release.`, 'success')
    setApproveModalOpen(false)
    setApprovalNote('')
  }

  // Current request
  const request = useMemo(() => {
    return allRequests.find((r) => r.id === selectedId) || allRequests[0]
  }, [allRequests, selectedId])

  // Matched RFQ (department-aligned or general)
  const matchedRfq: RFQ | undefined = useMemo(() => {
    if (!request) return undefined
    return (
      rfqs.find((rf) => rf.department === request.department) ||
      rfqs.find((rf) => rf.title.toLowerCase().includes(request.category.toLowerCase())) ||
      rfqs[0]
    )
  }, [rfqs, request])

  // Dynamic workflow progression
  const progression = useMemo(() => {
    if (!request) return null
    return getWorkflowProgression({
      status: request.status,
      financeStatus: request.financeStatus,
      category: request.category,
      title: request.title,
      paymentStatus: request.paymentStatus,
    })
  }, [request])

  if (!request || !progression) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center text-slate-400">
        <FileText size={40} className="mx-auto mb-2 text-slate-300" />
        <p className="font-bold text-slate-800">No request found</p>
      </div>
    )
  }

  // Derive subcategory
  const getSubcategory = () => {
    const t = (request.title + ' ' + (request.category || '')).toLowerCase()
    if (t.includes('laptop') || t.includes('macbook')) return 'Laptops'
    if (t.includes('server')) return 'Rack Servers'
    if (t.includes('monitor') || t.includes('display')) return 'Monitors'
    if (t.includes('cloud') || t.includes('aws') || t.includes('azure')) return 'Cloud Infrastructure'
    if (t.includes('software') || t.includes('saas') || t.includes('license')) return 'Enterprise Software'
    if (t.includes('chair') || t.includes('furniture') || t.includes('desk')) return 'Office Furniture'
    if (t.includes('steel') || t.includes('raw')) return 'Raw Materials'
    return 'Office Equipment'
  }

  // Derive warranty
  const getWarranty = () => {
    const t = (request.title + ' ' + (request.category || '')).toLowerCase()
    if (t.includes('cloud') || t.includes('software') || t.includes('renewal')) return '1 Year'
    if (t.includes('macbook') || t.includes('laptop')) return '3 Years'
    if (t.includes('server')) return '5 Years'
    if (t.includes('chair') || t.includes('furniture')) return '5 Years'
    return '1 Year'
  }

  const subcategory = getSubcategory()
  const warranty = getWarranty()

  // Derive quantity
  const quantity = request.title.toLowerCase().includes('laptop')
    ? 10
    : request.title.toLowerCase().includes('monitor')
    ? 25
    : request.title.toLowerCase().includes('chair')
    ? 50
    : 1

  const requiredByDate = request.date
    ? (() => {
        const d = new Date(request.date)
        d.setDate(d.getDate() + 20)
        return d.toISOString().split('T')[0]
      })()
    : new Date().toISOString().split('T')[0]

  const deliveryLocation = request.department ? `${request.department} Department Facilities` : 'Corporate Headquarters'
  const preferredVendor = request.vendor || 'Vendor to be Assigned'
  const justification = request.justification || `${request.title} required for operational workflow.`
  const description = request.description || `${request.title} requested by ${request.requester} for ${request.department}.`

  // Product specifications breakdown
  const getProductDetails = () => {
    const reqAny = request as any
    const firstItem = reqAny.items && reqAny.items[0]
    return {
      modelName: firstItem?.name || request.title,
      partNumber: firstItem?.sku || `SKU-${request.id}`,
      technicalSpecs: request.description || `Enterprise procurement specification for ${request.department}`,
      unitPrice: firstItem?.unitPrice || Math.round(request.amount / quantity),
      warrantyTerms: `${warranty} Enterprise Warranty & Support`,
      certifications: 'Standard Commercial Standards & Regulatory Clearance',
      deliveryTimeline: 'Standard Procurement Timeline',
    }
  }

  const product = getProductDetails()

  const activeStages = progression.workflowType === 'SOFTWARE' ? SOFTWARE_STAGES_CONFIG : HARDWARE_STAGES_CONFIG
  const currentStageIndex = progression.currentStageIndex
  const isRejected = progression.isRejected

  // Stage timeline history items generator
  const stageDetails = activeStages.map((s, idx) => {
    let statusType: 'completed' | 'current' | 'pending' | 'rejected' = 'pending'
    let date = ''
    let responsible = ''
    let comment = ''
    let action = ''
    let doc = ''

    if (isRejected && idx === currentStageIndex) {
      statusType = 'rejected'
      date = request.rejectedDate || request.date
      responsible = request.rejectedBy || 'Finance Audit'
      comment = request.rejectionReason || 'Disallowed requisition'
      action = 'Requisition Disapproved'
    } else if (idx < currentStageIndex || (idx === currentStageIndex && progression.isCompleted)) {
      statusType = 'completed'
      const reqAny = request as any
      const hist = (reqAny.approvalHistory as any[])?.find(
        (h: any) => h.role?.toLowerCase().includes(s.name.toLowerCase()) || h.action?.toLowerCase().includes(s.name.toLowerCase())
      )
      if (idx === 0) {
        date = request.date ? `${request.date}` : ''
        responsible = `${request.requester} (${request.department})`
        action = 'Requisition Created & Submitted'
        doc = 'Requisition_PR_Form.pdf'
      } else if (idx === 1) {
        date = request.approvedDate || hist?.date || request.date || ''
        responsible = request.approvedBy || hist?.approverName || 'Manager Verification'
        action = 'Manager Verified & Budget Endorsed'
        comment = hist?.comment || 'Justification verified against project objectives.'
      } else if (idx === 2) {
        date = request.financeApprovedDate || hist?.date || request.date || ''
        responsible = request.financeApprovedBy || hist?.approverName || actorName
        action = 'Finance Approved & Capital Allocated'
        comment = request.financeComment || hist?.comment || 'Headroom verified and approved.'
      } else {
        date = hist?.date || request.date || ''
        responsible = hist?.approverName || s.dept
        action = `${s.name} Complete`
        comment = hist?.comment || ''
      }
    } else if (idx === currentStageIndex) {
      statusType = 'current'
      date = 'In Progress'
      responsible = s.dept
      action = `Currently in ${s.name}`
      comment = request.description || 'Under active operational workflow'
    } else {
      statusType = 'pending'
      responsible = s.dept
      action = 'Awaiting preceding stage sign-off'
    }

    return {
      ...s,
      stageNumber: idx + 1,
      statusType,
      date,
      responsible,
      comment,
      action,
      doc,
    }
  })

  return (
    <div className="max-w-7xl mx-auto space-y-7 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {progression.workflowType === 'SOFTWARE' ? `${progression.totalStages}-STAGE SOFTWARE WORKFLOW` : `${progression.totalStages}-STAGE HARDWARE WORKFLOW`}
              </span>
              <span className="font-mono text-xs text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {request.id}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Procurement Request Details & Lifecycle Stepper
            </h1>
          </div>
        </div>

        {/* Request Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">Inspect Request:</span>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-600 shadow-2xs"
          >
            {allRequests.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} — {r.title.slice(0, 26)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main View Mode Selector Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setViewMode('FORM')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'FORM'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <PlusCircle size={16} />
          <span>Create Purchase Request Form & Product Details</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('STEPPER')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'STEPPER'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Layers size={16} />
          <span>Lifecycle Stepper & Audit Log</span>
        </button>
      </div>

      {/* ── VIEW MODE 1: Complete Create Purchase Request Form (Image 1) & Product Details ── */}
      {viewMode === 'FORM' && (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          {/* Header matching Image 1 */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <PlusCircle className="text-blue-600 flex-shrink-0" size={28} />
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-900">Create Purchase Request</h2>
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                    {request.id}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    request.status === 'pending_approval' || request.financeStatus === 'pending'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : request.status === 'approved' || request.financeStatus === 'approved'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : request.status === 'recommended_to_admin'
                      ? 'bg-purple-100 text-purple-900 border-purple-300'
                      : 'bg-rose-100 text-rose-900 border-rose-300'
                  }`}>
                    {request.financeStatus
                      ? `Finance: ${request.financeStatus.toUpperCase()}`
                      : request.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Fill in request details for approval & procurement workflow.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {request.status === 'finance_approved' || request.financeStatus === 'approved' ? (
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-100 text-emerald-900 font-bold text-xs rounded-xl border border-emerald-300 shadow-2xs">
                  <CheckCircle size={14} className="text-emerald-700" /> Finance Approved
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setApproveModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  <CheckCircle size={14} /> Approve Request
                </button>
              )}
            </div>
          </div>

          {/* Form Fields — Exactly matching Image 1 layout */}
          <div className="space-y-4 text-xs">
            {/* 1. Request Title * */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">1. Request Title *</label>
              <input
                type="text"
                readOnly
                value={request.title}
                className="w-full p-2.5 border rounded-lg bg-white border-blue-500 ring-2 ring-blue-500/20 font-bold text-gray-900 outline-none cursor-default shadow-xs"
              />
            </div>

            {/* 2 & 3. Category * & Subcategory * */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">2. Category *</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={request.category}
                    className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-gray-800 outline-none cursor-default"
                  />
                  <ChevronDown size={15} className="absolute right-3 top-3 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">3. Subcategory *</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={subcategory}
                    className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-gray-800 outline-none cursor-default"
                  />
                  <ChevronDown size={15} className="absolute right-3 top-3 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Category Detail: Warranty Period * (Image 1 Callout Box) */}
            <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-1.5 shadow-2xs">
              <label className="block font-bold text-blue-900 text-xs">
                Category Detail: Warranty Period *
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={warranty}
                  className="w-full p-2.5 border rounded-lg bg-white border-blue-200 font-bold text-blue-950 text-xs outline-none cursor-default"
                />
                <ChevronDown size={15} className="absolute right-3 top-3 text-blue-500" />
              </div>
            </div>

            {/* 4. Description * */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-gray-700">4. Description *</label>
                <span className="text-[10px] text-gray-400 font-mono font-medium">
                  {description.length}/500
                </span>
              </div>
              <textarea
                readOnly
                rows={3}
                value={description}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-gray-800 outline-none resize-none cursor-default leading-relaxed"
              />
            </div>

            {/* 5. Quantity *, Estimated Cost (USD/INR) *, 6. Required By (Date) * */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">5. Quantity *</label>
                <input
                  type="text"
                  readOnly
                  value={quantity}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-bold text-gray-900 outline-none cursor-default"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Estimated Cost (INR) *
                </label>
                <input
                  type="text"
                  readOnly
                  value={fmt(request.amount)}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-bold text-gray-900 outline-none cursor-default"
                />
                <span className="text-[10px] text-gray-400 block mt-1">
                  Required for physical goods.
                </span>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  6. Required By (Date) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={requiredByDate}
                    className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-gray-800 outline-none cursor-default"
                  />
                  <Calendar size={15} className="absolute right-3 top-3 text-gray-400" />
                </div>
              </div>
            </div>

            {/* 7. Department * & 8. Preferred Vendor (Optional) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">7. Department *</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={request.department}
                    className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-gray-800 outline-none cursor-default"
                  />
                  <ChevronDown size={15} className="absolute right-3 top-3 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  8. Preferred Vendor (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={preferredVendor}
                    className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-gray-800 outline-none cursor-default"
                  />
                  <ChevronDown size={15} className="absolute right-3 top-3 text-gray-400" />
                </div>
              </div>
            </div>

            {/* 9. Delivery Location * & 10. Priority * */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">9. Delivery Location *</label>
                <input
                  type="text"
                  readOnly
                  value={deliveryLocation}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-gray-800 outline-none cursor-default"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">10. Priority *</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={request.priority}
                    className={`w-full p-2.5 border rounded-lg font-bold outline-none cursor-default ${
                      request.priority === 'Critical'
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : request.priority === 'High'
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : request.priority === 'Medium'
                        ? 'bg-blue-50 border-blue-300 text-blue-900'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    }`}
                  />
                  <ChevronDown size={15} className="absolute right-3 top-3 text-gray-400" />
                </div>
              </div>
            </div>

            {/* 11. Reason / Business Justification * */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-gray-700">
                  11. Reason / Business Justification *
                </label>
                <span className="text-[10px] text-gray-400 font-mono font-medium">
                  {justification.length}/500
                </span>
              </div>
              <textarea
                readOnly
                rows={3}
                value={justification}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-gray-800 outline-none resize-none cursor-default leading-relaxed"
              />
            </div>
          </div>

          {/* ── Product Technical Details & Specifications Card ── */}
          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Package size={18} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-gray-900">
                Product Specifications & Line Items Breakdown
              </h3>
            </div>

            <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Product Item & Enterprise Model
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{product.modelName}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Part / SKU Number
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded">
                    {product.partNumber}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Technical Architecture & Component Specifications
                </span>
                <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed font-medium">
                  {product.technicalSpecs}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Unit Price</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{fmt(product.unitPrice)} / unit</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Quantity Requested</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{quantity} Units</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 block uppercase">Total Requisition Value</span>
                  <p className="font-black text-emerald-900 text-base mt-0.5">{fmt(request.amount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="flex items-center gap-2 text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                  <ShieldCheck size={16} className="text-blue-600 flex-shrink-0" />
                  <span><strong>Warranty / SLA:</strong> {product.warrantyTerms}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                  <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                  <span><strong>Compliance & Safety:</strong> {product.certifications}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW MODE 2: Stepper Timeline & RFQ Audit Log ── */}
      {viewMode === 'STEPPER' && (
        <div className="space-y-6">
          {/* Main Request Summary Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                    {request.id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      request.priority === 'Critical'
                        ? 'bg-rose-100 text-rose-800'
                        : request.priority === 'High'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {request.priority} Priority
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {request.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{request.title}</h2>
                <p className="text-xs text-slate-500">
                  Requester: <b className="text-slate-800">{request.requester}</b> • Department:{' '}
                  <b className="text-slate-800">{request.department}</b> • Category:{' '}
                  <b className="text-slate-800">{request.category}</b>
                </p>
              </div>

              <div className="text-right flex-shrink-0 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Authorized Request Value
                </span>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{fmt(request.amount)}</p>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Creation Date</span>
                <span className="font-bold text-slate-800">{request.date}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Manager Status</span>
                <span className="font-bold text-emerald-700">
                  {request.approvedBy ? 'Manager Endorsed' : 'Under Review'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Finance Sign-off</span>
                <span className="font-bold text-indigo-700">
                  {request.financeApprovedBy ? 'Finance Approved' : request.financeStatus || 'In Review'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Payment Pipeline</span>
                <span className="font-bold text-amber-700">
                  {request.paymentStatus || 'Pending Invoice Clearance'}
                </span>
              </div>
            </div>

            {/* Business Justification */}
            {request.justification && (
              <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100 text-xs">
                <span className="font-bold text-indigo-950 block mb-0.5">Business Justification:</span>
                <p className="text-slate-700 leading-relaxed">{request.justification}</p>
              </div>
            )}
          </div>

          {/* 10-Stage Horizontal Stepper Legend & Quick Bar */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Procurement Lifecycle Timeline
              </h3>
              <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                <span className="flex items-center gap-1"><span className="text-emerald-600 font-bold">✓</span> Completed</span>
                <span className="flex items-center gap-1"><span className="text-indigo-600 font-bold">●</span> Current</span>
                <span className="flex items-center gap-1"><span className="text-slate-400 font-bold">○</span> Pending</span>
                <span className="flex items-center gap-1"><span className="text-rose-600 font-bold">×</span> Rejected</span>
              </div>
            </div>

            {/* 10-Stage Horizontal Node Bar */}
            <div className="overflow-x-auto pb-2">
              <div className="flex items-center justify-between min-w-[760px] relative">
                <div className="absolute left-4 right-4 top-4 h-0.5 bg-slate-200 -z-0" />
                {stageDetails.map((s) => (
                  <div key={s.name} className="relative z-10 flex flex-col items-center text-center w-20">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        s.statusType === 'completed'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : s.statusType === 'current'
                          ? 'bg-indigo-600 text-white shadow-md ring-4 ring-indigo-100'
                          : s.statusType === 'rejected'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-white border-2 border-slate-300 text-slate-400'
                      }`}
                    >
                      {s.statusType === 'completed' && '✓'}
                      {s.statusType === 'current' && '●'}
                      {s.statusType === 'pending' && '○'}
                      {s.statusType === 'rejected' && '×'}
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 mt-2 leading-tight">
                      {s.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Vertical Stage Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Stage-by-Stage Audit Trail & Execution Log
            </h3>

            <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {stageDetails.map((s) => (
                <div key={s.name} className="relative flex items-start gap-4 pl-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 z-10 ${
                      s.statusType === 'completed'
                        ? 'bg-emerald-600 text-white'
                        : s.statusType === 'current'
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                        : s.statusType === 'rejected'
                        ? 'bg-rose-600 text-white'
                        : 'bg-white border-2 border-slate-300 text-slate-400'
                    }`}
                  >
                    {s.statusType === 'completed' && '✓'}
                    {s.statusType === 'current' && '●'}
                    {s.statusType === 'pending' && '○'}
                    {s.statusType === 'rejected' && '×'}
                  </div>

                  <div className="flex-1 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          Stage {s.stageNumber}: {s.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            s.statusType === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.statusType === 'current'
                              ? 'bg-indigo-100 text-indigo-800'
                              : s.statusType === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {s.statusType.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-semibold">{s.date}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Action Taken</span>
                        <span className="font-semibold text-slate-800">{s.action}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Responsible Entity</span>
                        <span className="font-semibold text-slate-800">{s.responsible}</span>
                      </div>
                    </div>

                    {s.comment && (
                      <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100 italic">
                        "{s.comment}"
                      </p>
                    )}

                    {s.doc && (
                      <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-[11px] pt-1">
                        <Paperclip size={12} />
                        <span className="hover:underline cursor-pointer">{s.doc}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sourcing & RFQ Evaluation Matrix */}
          {matchedRfq && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                    Commercial Sourcing Data
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    RFQ #{matchedRfq.id} — Vendor Quotation Analysis
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                  Status: {matchedRfq.status.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Budget</span>
                  <span className="font-extrabold text-slate-900">{fmt(matchedRfq.estimatedAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Lowest / Best Bid</span>
                  <span className="font-extrabold text-emerald-700">
                    {(() => {
                      const quotes = (matchedRfq.vendors || []).filter((v) => typeof v.quote === 'number').map((v) => v.quote as number)
                      return quotes.length > 0 ? fmt(Math.min(...quotes)) : 'Pending'
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Quotes Received</span>
                  <span className="font-extrabold text-emerald-700">
                    {(matchedRfq.vendors || []).filter((v) => v.response === 'Received').length} Bids
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Submission Deadline</span>
                  <span className="font-bold text-slate-700">{matchedRfq.deadline}</span>
                </div>
              </div>

              {/* Vendors Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-3">Vendor Name</th>
                      <th className="p-3">Response</th>
                      <th className="p-3 text-right">Quoted Amount</th>
                      <th className="p-3">Delivery Terms</th>
                      <th className="p-3">Warranty</th>
                      <th className="p-3">Payment Terms</th>
                      <th className="p-3 text-center">Award Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {(matchedRfq.vendors || []).map((v) => {
                      const isLowest =
                        v.quote &&
                        v.quote ===
                          Math.min(
                            ...((matchedRfq.vendors || []).filter((vnd) => vnd.quote).map((vnd) => vnd.quote as number))
                          )

                      return (
                        <tr key={v.name} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{v.name}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                v.response === 'Received'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {v.response}
                            </span>
                          </td>
                          <td className="p-3 text-right font-extrabold text-slate-900">
                            {v.quote ? fmt(v.quote) : '—'}
                          </td>
                          <td className="p-3 text-slate-600">
                            {v.deliveryDays ? `${v.deliveryDays} Days` : 'Standard'}
                          </td>
                          <td className="p-3 text-slate-600">{v.warranty || '1 Year Standard'}</td>
                          <td className="p-3 text-slate-600">{v.paymentTerms || 'Net 30'}</td>
                          <td className="p-3 text-center">
                            {isLowest ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Selected / L1 Bidder
                              </span>
                            ) : v.response === 'Received' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] text-slate-500 bg-slate-100">
                                Evaluated
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 text-white animate-fadeIn ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Structured Financial Request Approval Dossier Modal (Image 2) */}
      <RequestApprovalModal
        isOpen={approveModalOpen}
        request={request}
        portalType="FINANCE"
        approverName={actorName}
        onClose={() => setApproveModalOpen(false)}
        onConfirm={handleConfirmApproval}
      />
    </div>
  )
}
