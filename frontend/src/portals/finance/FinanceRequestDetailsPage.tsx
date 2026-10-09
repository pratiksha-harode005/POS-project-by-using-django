import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  FileText, Check, Clock, X, AlertTriangle, ArrowLeft, Building,
  User, Calendar, IndianRupee, Tag, Paperclip, Truck, Box, Package,
  CreditCard, GitCompare, ChevronDown, CheckCircle2, ChevronRight,
  PlusCircle, ShieldCheck, Layers, ArrowUpRight, CheckCircle, Sparkles,
  Save, Calculator, Send, DollarSign
} from 'lucide-react'
import { useFinanceData, ProcurementRequest, RFQ, ApprovalParameters } from '../../context/ManagerDataContext'
import { getWorkflowProgression } from '../../utils/workflowUtils'
import { RequestApprovalModal } from '../../components/portal/RequestApprovalModal'
import { formatDate } from '../../utils/formatDate'
import { TrackingStepper } from '../../components/portal/TrackingStepper'
import { ProcessPaymentModal } from '../../components/portal/ProcessPaymentModal'
import { useAuth } from '../../context/AuthContext'
import {
  saveFinanceResearchApi,
  saveFinanceCostEstimationApi,
  submitFinanceCostEstimationApi
} from '../../api/financeApi'

const fmt = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN')}`

const isAwaitingAdminApproval = (req: ProcurementRequest) => {
  const rawStatus = String((req as any).raw_status || '').toUpperCase()
  return req.status === 'recommended_to_admin' ||
    rawStatus === 'RECOMMENDED_TO_ADMIN' ||
    rawStatus === 'FINANCE_RECOMMENDED_TO_ADMIN' ||
    req.financeStatus === 'Recommended to Admin'
}

const isAdminApproved = (req: ProcurementRequest) => {
  const rawStatus = String((req as any).raw_status || '').toUpperCase()
  const extra = req.extra_fields || req.extraFields || {}
  return req.status === 'admin_approved' ||
    rawStatus === 'APPROVED' ||
    rawStatus === 'ADMIN_APPROVED' ||
    req.financeStatus === 'Admin Approved' ||
    (!rawStatus && req.status === 'approved' && req.approvalLevel === 'Admin Approved') ||
    Boolean(extra.admin_approved) ||
    extra.final_approval_by === 'ADMIN'
}

const HARDWARE_STAGES_CONFIG = [
  { name: 'CREATE REQUEST', dept: 'Requester / Department' },
  { name: 'MANAGER APPROVAL', dept: 'Procurement Manager' },
  { name: 'FINANCE APPROVAL', dept: 'Finance & Treasury' },
  { name: 'ADMIN APPROVAL', dept: 'Executive Admin' },
  { name: 'RFQ SENT', dept: 'Sourcing Team' },
  { name: 'VENDOR QUOTES RECEIVED', dept: 'Invited Vendors' },
  { name: 'PRODUCT ORDER', dept: 'Selected Vendor (PO Issued)' },
  { name: 'DELIVERY', dept: 'Logistics & Dock Receiving' },
  { name: 'VERIFICATION AND ORDER COMPLETE', dept: 'Audit & 3-Way Match' },
  { name: 'PAYMENT', dept: 'Treasury & Bank Clearing' },
]

const SOFTWARE_STAGES_CONFIG = [
  { name: 'REQUEST CREATED', dept: 'Team Lead / Requester' },
  { name: 'MANAGER REVIEW', dept: 'Project Manager' },
  { name: 'RECOMMENDED TO FINANCE', dept: 'Project Manager' },
  { name: 'FINANCE REVIEW', dept: 'Finance Directorate' },
  { name: 'FINANCE RESEARCH', dept: 'Finance Specialist' },
  { name: 'COST ESTIMATION', dept: 'Finance Controller' },
  { name: 'FINANCE REPORT', dept: 'Finance & Treasury' },
]

export const FinanceRequestDetailsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const { allRequests, financeRequests, rfqs, approveFinanceRequest } = useFinanceData()

  const actorName = user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Finance Officer'

  const reqId = searchParams.get('id') || allRequests[0]?.id || ''
  const [selectedId, setSelectedId] = useState(reqId)
  const [viewMode, setViewMode] = useState<'FORM' | 'STEPPER'>('FORM')

  // Approval modal state (Image 2)
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [approvalNote, setApprovalNote] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Finance Research State (Stage 5)
  const [marketPricing, setMarketPricing] = useState('')
  const [availableAlternatives, setAvailableAlternatives] = useState('')
  const [businessValue, setBusinessValue] = useState('')
  const [vendorQuotationRef, setVendorQuotationRef] = useState('')
  const [researchNotes, setResearchNotes] = useState('')
  const [savingResearch, setSavingResearch] = useState(false)

  // Finance Cost Estimation State (Stage 6 & 7)
  const [currentCost, setCurrentCost] = useState<number | string>(0)
  const [estimatedBaseCost, setEstimatedBaseCost] = useState<number | string>(45000)
  const [recommendedCost, setRecommendedCost] = useState<number | string>(48500)
  const [taxAmount, setTaxAmount] = useState<number | string>(0)
  const [discountAmount, setDiscountAmount] = useState<number | string>(0)
  const [finalEstimatedAmount, setFinalEstimatedAmount] = useState<number | string>(48500)
  const [costCenter, setCostCenter] = useState('')
  const [budgetCode, setBudgetCode] = useState('')
  const [recommendedVendor, setRecommendedVendor] = useState('')
  const [financeComments, setFinanceComments] = useState('')
  const [savingEstimation, setSavingEstimation] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleConfirmApproval = async (params: ApprovalParameters) => {
    if (!request) return
    if (isAwaitingAdminApproval(request)) {
      showToast(`Request ${request.id} is awaiting Admin approval.`, 'error')
      setApproveModalOpen(false)
      return
    }
    const isAlreadyApproved = Boolean(
      request.status === 'approved' ||
      request.status === 'admin_approved' ||
      request.status === 'finance_approved' ||
      isAdminApproved(request) ||
      request.financeStatus?.toLowerCase() === 'approved' ||
      request.status === 'quotes_received' ||
      request.status === 'assigned_to_vendor' ||
      request.status === 'delivered' ||
      request.status === 'invoiced' ||
      request.status === 'completed' ||
      request.financeApprovedBy ||
      request.financeApprovedDate
    )
    if (isAlreadyApproved) {
      showToast(`Request ${request.id} is already approved.`, 'error')
      setApproveModalOpen(false)
      return
    }
    await approveFinanceRequest(
      request.id,
      params.approvalComments || 'Verified within budget allocation. Authorized for PO release.',
      actorName,
      params
    )
    showToast(`✓ Request ${request.id} approved! Amount: ${fmt(params.approvedAmount)}. Ready for payment processing.`, 'success')
    setApproveModalOpen(false)
    setApprovalNote('')
  }

  // Current request
  const request = useMemo(() => {
    return financeRequests.find((r) => r.id === selectedId) || financeRequests[0]
  }, [financeRequests, selectedId])

  useEffect(() => {
    if (request) {
      const rd = (request as any).research_estimation || {}
      setMarketPricing(rd.market_pricing || 'Enterprise SaaS pricing tier benchmarked at ₹45,000 - ₹52,000 / year.')
      setAvailableAlternatives(rd.available_alternatives || '3 alternatives evaluated; current solution verified for seamless security integration and lowest TCO.')
      setBusinessValue(rd.business_value || 'Direct technical enablement for team operations with automated cloud backup.')
      setVendorQuotationRef(rd.vendor_quotation_ref || 'QUOTE-SaaS-2026-FIN-01')
      setResearchNotes(rd.research_notes || 'Confirmed 5% volume discount with annual prepaid terms.')

      const existingAmt = (request as any).existing_cost || (request as any).existingCost || 0
      const baseAmt = rd.estimated_cost || request.amount || 45000
      const recAmt = rd.recommended_cost || baseAmt || 48500
      const taxAmt = rd.tax_amount || Math.round(Number(baseAmt) * 0.18)
      const discAmt = rd.discount_amount || Math.round(Number(baseAmt) * 0.05)
      const netFinal = rd.final_estimated_amount || (Number(baseAmt) + Number(taxAmt) - Number(discAmt)) || 48500

      setCurrentCost(existingAmt)
      setEstimatedBaseCost(baseAmt)
      setRecommendedCost(recAmt)
      setTaxAmount(taxAmt)
      setDiscountAmount(discAmt)
      setFinalEstimatedAmount(netFinal)
      setCostCenter(rd.cost_center || request.costCenter || `CC-${(request.department || 'ENG').toUpperCase().slice(0, 3)}-2026-Q3`)
      setBudgetCode(rd.budget_code || (request as any).budget_code || 'BG-FIN-SOFT-01')
      setRecommendedVendor(rd.vendor || (request as any).software_name || request.vendor || 'Authorized Vendor')
      setFinanceComments(rd.manager_comments || rd.business_evaluation || 'Finance research & cost estimation complete. Budget verified within departmental capex allocations.')
    }
  }, [request?.id])

  const handleSaveFinanceResearch = async () => {
    if (!request) return
    setSavingResearch(true)
    try {
      await saveFinanceResearchApi(request.id, {
        market_pricing: marketPricing,
        available_alternatives: availableAlternatives,
        business_value: businessValue,
        vendor_quotation_ref: vendorQuotationRef,
        research_notes: researchNotes,
      })
      window.dispatchEvent(new Event('kss_backend_updated'))
      showToast('✓ Finance Research recorded! Stage updated to Finance Research (Stage 5).', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to save research findings.', 'error')
    } finally {
      setSavingResearch(false)
    }
  }

  const handleSubmitFinanceCostEstimation = async () => {
    if (!request) return
    const finalAmtNum = Number(finalEstimatedAmount) || 0
    if (finalAmtNum <= 0) {
      showToast('Please provide a valid final estimated amount (> 0).', 'error')
      return
    }
    setSavingEstimation(true)
    try {
      await submitFinanceCostEstimationApi(request.id, {
        current_cost: Number(currentCost) || 0,
        estimated_cost: Number(estimatedBaseCost) || 0,
        recommended_cost: Number(recommendedCost) || finalAmtNum,
        tax_amount: Number(taxAmount) || 0,
        discount_amount: Number(discountAmount) || 0,
        final_estimated_amount: finalAmtNum,
        cost_center: costCenter,
        budget_code: budgetCode,
        vendor: recommendedVendor,
        manager_comments: financeComments,
        business_evaluation: financeComments,
        is_completed: true,
      })
      window.dispatchEvent(new Event('kss_backend_updated'))
      showToast(`✓ Cost Estimation submitted! Request ${request.id} is now available in Finance Reports.`, 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to submit cost estimation.', 'error')
    } finally {
      setSavingEstimation(false)
    }
  }


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
      currentStage: request.currentStage,
      history: request.history,
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
            {financeRequests.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} — {r.title.slice(0, 26)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Dynamic Workflow Progress Stepper (Single source of truth from backend timeline) ── */}
      <TrackingStepper
        category={request.category}
        title={request.title}
        status={request.status}
        financeStatus={request.financeStatus}
        paymentStatus={request.paymentStatus}
        lastUpdated={request.date}
        history={request.history}
        timeline={(request as any).timeline}
      />

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
                      : request.status === 'approved' || request.status === 'admin_approved' || request.status === 'finance_approved' || request.financeStatus?.toLowerCase() === 'approved'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : request.status === 'recommended_to_admin'
                      ? 'bg-purple-100 text-purple-900 border-purple-300'
                      : 'bg-rose-100 text-rose-900 border-rose-300'
                  }`}>
                    {isAwaitingAdminApproval(request)
                      ? 'Awaiting Admin Approval'
                      : isAdminApproved(request)
                      ? 'Admin Approved'
                      : request.financeStatus
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
              {((request as any).payment_status === 'Paid' || request.status === 'payment_completed' || request.status === 'completed' || request.paymentStatus === 'Paid') ? (
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-100 text-emerald-900 font-bold text-xs rounded-xl border border-emerald-300 shadow-2xs">
                  <CheckCircle size={14} className="text-emerald-700" /> Payment Disbursed: {(request as any).payment_reference || 'Paid'}
                </span>
              ) : isAwaitingAdminApproval(request) ? (
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-100 text-purple-900 font-bold text-xs rounded-xl border border-purple-300 shadow-2xs">
                  <Clock size={14} /> Awaiting Admin Approval
                </span>
              ) : (request.status === 'finance_approved' || request.financeStatus === 'approved' || (request as any).raw_status === 'FINANCE_APPROVED') ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-900 font-bold text-xs rounded-xl border border-emerald-300 shadow-2xs">
                    <CheckCircle size={14} className="text-emerald-700" /> Finance Approved ({fmt((request as any).finance_approved_amount || request.amount)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setPaymentModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    <CreditCard size={14} /> Process Payment
                  </button>
                </div>
              ) : isAdminApproved(request) ? (
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-100 text-emerald-900 font-bold text-xs rounded-xl border border-emerald-300 shadow-2xs">
                  <CheckCircle size={14} /> Admin Approved
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
                  value={fmt(
                    (() => {
                      const check = (...vals: any[]) => {
                        for (const v of vals) {
                          if (v !== undefined && v !== null && v !== '') {
                            const num = Number(v)
                            if (!isNaN(num) && num > 0) return num
                          }
                        }
                        return 0
                      }

                      const isRenewalOrUpgrade = 
                        (request as any).request_operation === 'RENEWAL' ||
                        (request as any).request_operation === 'UPGRADE' ||
                        (request as any).rawRequest?.request_operation === 'RENEWAL' ||
                        (request as any).rawRequest?.request_operation === 'UPGRADE' ||
                        (request.title || '').toLowerCase().startsWith('renewal:') ||
                        (request.title || '').toLowerCase().startsWith('upgrade:') ||
                        (request.title || '').toLowerCase().startsWith('renew:')

                      if (isRenewalOrUpgrade) {
                        const origId = (request as any).original_request || 
                                       (request as any).parent_request || 
                                       (request as any).rawRequest?.original_request || 
                                       (request as any).rawRequest?.parent_request || 
                                       (request as any).rawRequest?.original_request_id || 
                                       (request as any).rawRequest?.parent_request_id

                        let root = allRequests.find((r: any) => 
                          (origId && (r.id === origId || r.request_id === origId || (r as any).rawRequest?.id === origId))
                        )

                        if (!root && request.title) {
                          const cleanTitle = request.title.replace(/^(renewal|upgrade|renew):\s*/i, '').trim().toLowerCase()
                          root = allRequests.find((r: any) => 
                            r.id !== request.id &&
                            r.title &&
                            r.title.toLowerCase().trim() === cleanTitle
                          )
                        }

                        if (root) {
                          const rootCost = check(
                            (root as any).total_estimated_cost,
                            (root as any).requested_amount,
                            root.amount,
                            (root as any).approved_amount,
                            (root as any).rawRequest?.total_estimated_cost,
                            (root as any).rawRequest?.requested_amount,
                            (root as any).rawRequest?.approved_amount
                          )
                          if (rootCost > 0) return rootCost
                        }
                      }

                      return check(
                        (request as any).original_estimated_cost,
                        (request as any).rawRequest?.original_estimated_cost,
                        (request as any).total_estimated_cost,
                        (request as any).requested_amount,
                        request.amount,
                        (request as any).existing_cost,
                        (request as any).extraFields?.original_estimated_cost,
                        (request as any).extraFields?.existingCost,
                        (request as any).extraFields?.payment_justification?.existing_cost,
                        (request as any).rawRequest?.total_estimated_cost,
                        (request as any).rawRequest?.requested_amount,
                        (request as any).rawRequest?.existing_cost
                      )
                    })()
                  )}
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

          {/* ── Team Lead Requisition Requirements (Stage 1) ── */}
          <div className="p-5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-blue-700" />
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">Team Lead Requisition Requirements (Stage 1)</h4>
              </div>
              <span className="text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2.5 py-0.5 rounded-full">
                Requester Submitted
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-blue-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Request Type</span>
                <p className="font-bold text-blue-900 mt-0.5">{(request as any).request_type || (request as any).requestType || 'New Purchase'}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Current Plan</span>
                <p className="font-medium text-slate-800 mt-0.5">{(request as any).current_plan || (request as any).currentPlan || 'N/A'}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Required Plan</span>
                <p className="font-bold text-indigo-700 mt-0.5">{(request as any).required_plan || (request as any).requiredPlan || 'Enterprise'}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Existing Cost</span>
                <p className="font-bold text-slate-900 mt-0.5">{fmt((request as any).existing_cost || (request as any).existingCost || 0)}</p>
              </div>
            </div>
            {(request as any).business_requirement && (
              <div className="bg-white p-3 rounded-lg border border-blue-100 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Business Need & Problem Statement</span>
                <p className="text-slate-700 mt-1 font-medium leading-relaxed">{(request as any).business_requirement}</p>
              </div>
            )}
          </div>

          {/* ── Manager Review & Recommendation (Stage 3) ── */}
          <div className="p-5 bg-purple-50/60 rounded-xl border border-purple-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-700" />
                <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">Manager Recommendation & Review (Stage 3)</h4>
              </div>
              <span className="text-[10px] font-bold text-purple-800 bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded-full">
                Manager Endorsed
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-purple-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Recommended By</span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {(request as any).recommended_by || (request as any).extra_fields?.recommended_by || request.approvedBy || 'Project Manager'}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Recommendation Date</span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {((request as any).recommended_date || (request as any).extra_fields?.recommended_date || request.date || '').split('T')[0]}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Target Department</span>
                <p className="font-bold text-indigo-700 mt-0.5">{request.department || 'Operations'}</p>
              </div>
            </div>
            {((request as any).recommendation_reason || (request as any).extra_fields?.recommendation_reason || (request as any).justification) && (
              <div className="bg-white p-3 rounded-lg border border-purple-100 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Manager Recommendation Notes</span>
                <p className="text-purple-900 mt-1 font-medium leading-relaxed">
                  {(request as any).recommendation_reason || (request as any).extra_fields?.recommendation_reason || (request as any).justification}
                </p>
              </div>
            )}
          </div>

          {/* ── Finance Research Desk (Stage 5) ── */}
          <div className="p-5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calculator size={18} className="text-amber-700" />
                <div>
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Finance Research Desk (Stage 5)
                  </h4>
                  <p className="text-[11px] text-amber-800">
                    Record market benchmarks, vendor quotes, alternatives, and ROI justification.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {((request as any).raw_status === 'FINANCE_RESEARCH' || (request as any).raw_status === 'COST_ESTIMATION' || (request as any).raw_status === 'FINANCE_REPORT') && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={12} /> Research Saved
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveFinanceResearch}
                  disabled={savingResearch}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Save size={13} /> {savingResearch ? 'Saving Research...' : 'Save Finance Research (Stage 5)'}
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Market Pricing & Industry Benchmark *
                  </label>
                  <input
                    type="text"
                    value={marketPricing}
                    onChange={(e) => setMarketPricing(e.target.value)}
                    placeholder="e.g. Enterprise SaaS benchmarked at ₹45,000 - ₹52,000 / year"
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Vendor Quotation / Contract Ref #
                  </label>
                  <input
                    type="text"
                    value={vendorQuotationRef}
                    onChange={(e) => setVendorQuotationRef(e.target.value)}
                    placeholder="e.g. QUOTE-SaaS-2026-FIN-01"
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alternative Vendors / Solutions Evaluated
                </label>
                <textarea
                  rows={2}
                  value={availableAlternatives}
                  onChange={(e) => setAvailableAlternatives(e.target.value)}
                  placeholder="e.g. 3 alternatives evaluated; current vendor chosen for SLA compliance and lowest TCO."
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Business Value & Technical Enablement
                </label>
                <textarea
                  rows={2}
                  value={businessValue}
                  onChange={(e) => setBusinessValue(e.target.value)}
                  placeholder="e.g. Direct productivity enablement for team operations with automated cloud backup."
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Finance Research Notes & Volume Terms
                </label>
                <textarea
                  rows={2}
                  value={researchNotes}
                  onChange={(e) => setResearchNotes(e.target.value)}
                  placeholder="e.g. Confirmed 5% volume discount with annual prepaid terms and verified security clearance."
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* ── Finance Cost Estimation Form (Stages 6 & 7) ── */}
          <div className="p-5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-700" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    Finance Cost Estimation & Report Form (Stages 6 & 7)
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    Prepare commercial costing, tax, discount, cost center, and finalize for Finance Report.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSubmitFinanceCostEstimation}
                disabled={savingEstimation}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <Send size={13} /> {savingEstimation ? 'Submitting...' : 'Submit Cost Estimation & Generate Finance Report (Stage 7)'}
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Current Plan Cost (₹)</label>
                  <input
                    type="number"
                    value={currentCost}
                    onChange={(e) => setCurrentCost(e.target.value)}
                    className="w-full p-2 bg-white border border-emerald-300 rounded-lg text-slate-900 font-bold outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Base Estimated Cost (₹) *</label>
                  <input
                    type="number"
                    value={estimatedBaseCost}
                    onChange={(e) => {
                      const base = Number(e.target.value) || 0
                      setEstimatedBaseCost(base)
                      const tax = Math.round(base * 0.18)
                      const disc = Math.round(base * 0.05)
                      setTaxAmount(tax)
                      setDiscountAmount(disc)
                      setFinalEstimatedAmount(base + tax - disc)
                      setRecommendedCost(base + tax - disc)
                    }}
                    className="w-full p-2 bg-white border border-emerald-300 rounded-lg text-slate-900 font-bold outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tax / GST Amount (₹)</label>
                  <input
                    type="number"
                    value={taxAmount}
                    onChange={(e) => {
                      const tax = Number(e.target.value) || 0
                      setTaxAmount(tax)
                      const base = Number(estimatedBaseCost) || 0
                      const disc = Number(discountAmount) || 0
                      setFinalEstimatedAmount(base + tax - disc)
                      setRecommendedCost(base + tax - disc)
                    }}
                    className="w-full p-2 bg-white border border-emerald-300 rounded-lg text-slate-900 font-bold outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discount Amount (₹)</label>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => {
                      const disc = Number(e.target.value) || 0
                      setDiscountAmount(disc)
                      const base = Number(estimatedBaseCost) || 0
                      const tax = Number(taxAmount) || 0
                      setFinalEstimatedAmount(base + tax - disc)
                      setRecommendedCost(base + tax - disc)
                    }}
                    className="w-full p-2 bg-white border border-emerald-300 rounded-lg text-slate-900 font-bold outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-lg border-2 border-emerald-400 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-800 block uppercase">Net Final Estimated Amount (₹) *</span>
                  <input
                    type="number"
                    value={finalEstimatedAmount}
                    onChange={(e) => setFinalEstimatedAmount(e.target.value)}
                    className="w-full mt-1 text-lg font-black text-emerald-950 bg-emerald-50/50 p-1.5 rounded border border-emerald-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cost Center *</label>
                  <input
                    type="text"
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                    placeholder="e.g. CC-ENG-2026-Q3"
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg text-slate-900 font-bold outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Budget Code *</label>
                  <input
                    type="text"
                    value={budgetCode}
                    onChange={(e) => setBudgetCode(e.target.value)}
                    placeholder="e.g. BG-FIN-SOFT-01"
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg text-slate-900 font-bold outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Authorized Software / SaaS Vendor *</label>
                  <input
                    type="text"
                    value={recommendedVendor}
                    onChange={(e) => setRecommendedVendor(e.target.value)}
                    placeholder="e.g. Jira Software Enterprise / Atlassian"
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg text-slate-900 font-medium outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Recommended Budgetary Allocation (₹)</label>
                  <input
                    type="number"
                    value={recommendedCost}
                    onChange={(e) => setRecommendedCost(e.target.value)}
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg text-slate-900 font-bold outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Finance Controller Commercial Evaluation & Comments *
                </label>
                <textarea
                  rows={2}
                  value={financeComments}
                  onChange={(e) => setFinanceComments(e.target.value)}
                  placeholder="Finance research and cost estimation complete. Budget verified and allocated for Finance Report."
                  className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none resize-none"
                />
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
                <span className="font-bold text-slate-800">{formatDate(request.date)}</span>
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

            {/* 10-Stage Horizontal Node Bar — two-row layout for perfect alignment */}
            <div className="overflow-x-auto pb-2">
              <div style={{ minWidth: '760px' }}>
                {/* ROW 1: Circles + Connectors — labels cannot affect this row */}
                <div className="flex items-center relative px-1">
                  {stageDetails.map((s, idx) => (
                    <React.Fragment key={`fc-${s.name}-${idx}`}>
                      <div className="flex-none flex items-center justify-center" style={{ width: '32px' }}>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all relative z-10 ${
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
                      </div>
                      {idx < stageDetails.length - 1 && (
                        <div
                          className={`flex-1 h-[2px] z-0 ${
                            s.statusType === 'completed' ? 'bg-emerald-400' : 'bg-slate-200'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                {/* ROW 2: Labels — absolute-positioned to avoid clipping */}
                <div className="flex items-start px-1 mt-2" style={{ overflow: 'visible' }}>
                  {stageDetails.map((s, idx) => (
                    <React.Fragment key={`fl-${s.name}-${idx}`}>
                      <div
                        className="flex-none"
                        style={{ position: 'relative', width: '32px', minHeight: '4.5em' }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: 0,
                            transform: 'translateX(-50%)',
                            width: '68px',
                            textAlign: 'center',
                            fontSize: '0.65rem',
                            lineHeight: '1.25em',
                            fontWeight: 700,
                            color: s.statusType === 'current' ? '#4338ca' : s.statusType === 'completed' ? '#1e293b' : '#94a3b8',
                            overflowWrap: 'normal',
                            wordBreak: 'normal',
                            whiteSpace: 'normal',
                            hyphens: 'none',
                          }}
                        >
                          {s.name}
                        </span>
                      </div>
                      {idx < stageDetails.length - 1 && (
                        <div className="flex-1" style={{ minHeight: '4.5em' }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
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

      {/* Process Payment Settlement Modal (Stage 8) */}
      <ProcessPaymentModal
        isOpen={paymentModalOpen}
        request={request}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={(ref) => {
          showToast(`✓ Treasury payment successfully disbursed! Reference: ${ref}`, 'success')
          setPaymentModalOpen(false)
          navigate('/portal/finance/purchase-requests')
        }}
      />
    </div>
  )
}
