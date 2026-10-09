import React, { useState, useEffect } from 'react'
import {
  X, CheckCircle, AlertCircle, AlertTriangle, ShieldCheck, IndianRupee,
  Building, FileText, Check, ArrowUpRight
} from 'lucide-react'
import { useManagerData, useFinanceData } from '../../context/ManagerDataContext'
import type { ProcurementRequest, ApprovalParameters } from '../../context/ManagerDataContext'
import { ModalPortal } from './ModalPortal'

interface RequestApprovalModalProps {
  isOpen: boolean
  request: ProcurementRequest | null
  onClose: () => void
  onConfirm: (approvalParams: ApprovalParameters) => void
  onRecommend?: (recommendationData: { reason?: string; notes?: string; approvalParams?: ApprovalParameters }) => void
  portalType?: 'MANAGER' | 'ADMIN' | 'FINANCE'
  approverName?: string
}

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export const RequestApprovalModal: React.FC<RequestApprovalModalProps> = ({
  isOpen,
  request,
  onClose,
  onConfirm,
  onRecommend,
  portalType = 'MANAGER',
  approverName,
}) => {
  if (!isOpen || !request) return null

  const { recommendToFinance } = useManagerData()
  const { recommendToHigherAuthority } = useFinanceData()
  const [isRecommending, setIsRecommending] = useState(false)

  // Check if request is Software & SaaS
  const isSoftwareSaas =
    request.category === 'Software & SaaS' ||
    request.category === 'Cloud & Infrastructure' ||
    request.category === 'SaaS & Cloud' ||
    request.category?.toLowerCase() === 'software & saas' ||
    request.category?.toLowerCase().includes('software') ||
    request.category?.toLowerCase().includes('saas') ||
    request.category?.toLowerCase().includes('cloud') ||
    request.category?.toLowerCase().includes('license') ||
    request.category?.toLowerCase().includes('subscription') ||
    request.flowType === 'B' ||
    Boolean((request as any).software_name)

  // Dynamic field numbering
  const numJustification = isSoftwareSaas ? 5 : 7
  const numImpact = isSoftwareSaas ? 6 : 8
  const numRisk = isSoftwareSaas ? 7 : 9
  const numComments = isSoftwareSaas ? 8 : 10

  // 1. Requested Amount (read-only)
  const requestedAmount = Number(request.amount ?? (request as any).total_estimated_cost ?? (request as any).estimated_cost ?? (request as any).estimatedCost ?? 0) || 0

  // 2. Approved Amount (defaults to requested amount)
  const [approvedAmount, setApprovedAmount] = useState<number | string>(requestedAmount)

  const currentApprovedNum = Number(approvedAmount) || requestedAmount

  // Approval Limits enforcement:
  // Manager: Approval limit applies to all requests (Hardware & Software): <= ₹50,000
  const isManagerLimitExceeded = portalType === 'MANAGER' && (requestedAmount > 50000 || currentApprovedNum > 50000)
  // Finance: Requested/authorized amount must be <= ₹1,00,000
  const isFinanceLimitExceeded = portalType === 'FINANCE' && (requestedAmount > 100000 || currentApprovedNum > 100000)
  const isLimitExceeded = isManagerLimitExceeded || isFinanceLimitExceeded

  // 3. Budget Available
  const [budgetAvailable, setBudgetAvailable] = useState<'Yes' | 'No'>('Yes')

  // 4. Cost Center
  const defaultCostCenter = request.costCenter || `CC-${(request.department || 'ENG').toUpperCase().slice(0, 3)}-2026-Q3`
  const [costCenter, setCostCenter] = useState<string>(defaultCostCenter)

  // 5. Vendor
  const defaultVendor = request.vendor || ''
  const [vendor, setVendor] = useState<string>(defaultVendor)

  // 6. Commercial Evaluation
  const [commercialEvaluation, setCommercialEvaluation] = useState<'Completed' | 'Pending' | 'Not Required'>('Completed')

  // 7. Business Justification
  const [businessJustification, setBusinessJustification] = useState<string>(
    request.justification || 'Required for engineering team capacity scaling and critical project delivery.'
  )

  // 8. Business Impact
  const [businessImpact, setBusinessImpact] = useState<string>(
    'Non-approval will delay scheduled Q3 deliverables, team onboarding, and sprint milestones.'
  )

  // 9. Risk & Compliance
  const [riskCompliance, setRiskCompliance] = useState<'Passed' | 'Pending' | 'Failed' | 'Not Required'>('Passed')

  // 10. Approval Comments
  const [approvalComments, setApprovalComments] = useState<string>(
    'Technical specifications and departmental headcount growth reviewed and verified. Approved for procurement.'
  )

  const [validationError, setValidationError] = useState<string>('')

  const statusStr = String(request.status || '').toLowerCase()
  const rawStatusStr = String((request as any).raw_status || '').toLowerCase()

  const isAlreadyApproved = Boolean(
    !isLimitExceeded && (
      portalType === 'MANAGER'
        ? (statusStr === 'manager_approved' ||
           rawStatusStr === 'manager_approved' ||
           statusStr === 'approved' ||
           statusStr === 'admin_approved' ||
           statusStr === 'finance_approved' ||
           statusStr === 'completed')
        : (statusStr === 'approved' ||
           statusStr === 'admin_approved' ||
           statusStr === 'finance_approved' ||
           request.financeStatus?.toLowerCase() === 'approved' ||
           statusStr === 'completed' ||
           request.financeApprovedBy ||
           request.financeApprovedDate)
    )
  )

  // Reset form when request changes
  useEffect(() => {
    if (request) {
      const currentReqAmt = Number(request.amount ?? (request as any).total_estimated_cost ?? (request as any).estimated_cost ?? (request as any).estimatedCost ?? 0) || 0
      setApprovedAmount(currentReqAmt)
      setBudgetAvailable('Yes')
      setCostCenter(request.costCenter || `CC-${(request.department || 'ENG').toUpperCase().slice(0, 3)}-2026-Q3`)
      setVendor(request.vendor || '')
      setCommercialEvaluation('Completed')
      setBusinessJustification(request.justification || 'Required for department operational and strategic delivery.')
      setBusinessImpact('Direct impact on department deliverables and sprint schedule if unapproved.')
      setRiskCompliance('Passed')
      setApprovalComments('Specifications verified against approved OPEX/CAPEX allocation. Approved for PO generation.')
      setValidationError('')
    }
  }, [request?.id, portalType])

  const handleRecommend = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault()
    setIsRecommending(true)

    const params: ApprovalParameters = {
      requestedAmount,
      approvedAmount: Number(approvedAmount) || requestedAmount,
      budgetAvailable,
      costCenter: costCenter.trim() || defaultCostCenter,
      vendor: isSoftwareSaas ? (vendor.trim() || request.vendor || 'Direct Software Provider') : vendor.trim(),
      commercialEvaluation: isSoftwareSaas ? 'Not Required' : commercialEvaluation,
      businessJustification: businessJustification.trim(),
      businessImpact: businessImpact.trim(),
      riskCompliance,
      approvalComments: approvalComments.trim(),
      approvedBy: approverName || (portalType === 'ADMIN' ? 'David Admin (Executive Authority)' : portalType === 'FINANCE' ? 'Mark Finance Officer' : 'Sarah Manager'),
      approvedAt: new Date().toISOString(),
    }

    const defaultReason = portalType === 'MANAGER'
      ? `Approval limit exceeded (₹50,000 limit). Recommended to Finance for higher authorization.`
      : `Amount exceeds Finance limit of ₹1,00,000. Recommended to Admin for executive authorization.`

    if (onRecommend) {
      onRecommend({
        reason: defaultReason,
        notes: approvalComments.trim() || defaultReason,
        approvalParams: params
      })
      setIsRecommending(false)
      onClose()
      return
    }

    try {
      if (portalType === 'MANAGER') {
        recommendToFinance(request.id, defaultReason)
      } else if (portalType === 'FINANCE') {
        await recommendToHigherAuthority(
          request.id,
          'Budget Exceeds Threshold',
          approvalComments.trim() || defaultReason,
          approverName || 'Mark Finance Officer'
        )
      }
      onClose()
    } catch (err) {
      console.error('Recommend failed:', err)
    } finally {
      setIsRecommending(false)
    }
  }

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()

    if (isAlreadyApproved) {
      setValidationError('This request has already been approved. Duplicate approval is not permitted.')
      return
    }

    if (isManagerLimitExceeded) {
      setValidationError(`Manager approval limit is ₹50,000. Requested amount (${fmt(requestedAmount)}) exceeds ₹50,000. Manager cannot approve this request directly; please use "Recommend to Higher Authority".`)
      return
    }

    if (isFinanceLimitExceeded) {
      setValidationError(`Finance approval limit is ₹1,00,000. Requested amount (${fmt(requestedAmount)}) exceeds ₹1,00,000. Finance cannot approve this request directly; please use "Recommend to Higher Authority" / "Recommend to Admin".`)
      return
    }

    // Validate fields
    const numApproved = Number(approvedAmount)
    if (isNaN(numApproved) || numApproved < 0) {
      setValidationError('Approved amount must be a valid non-negative number.')
      return
    }

    if (portalType === 'MANAGER' && numApproved > 50000) {
      setValidationError(`Manager approval limit is ₹50,000. Approved amount (${fmt(numApproved)}) cannot exceed ₹50,000. Please use "Recommend to Higher Authority".`)
      return
    }

    if (portalType === 'FINANCE' && numApproved > 100000) {
      setValidationError(`Finance approval limit is ₹1,00,000. Approved amount (${fmt(numApproved)}) cannot exceed ₹1,00,000. Please use "Recommend to Higher Authority" / "Recommend to Admin".`)
      return
    }

    if (requestedAmount > 0 && portalType !== 'FINANCE' && numApproved > requestedAmount) {
      setValidationError(`Approved amount (${fmt(numApproved)}) cannot exceed requested amount (${fmt(requestedAmount)}).`)
      return
    }

    if (!costCenter.trim()) {
      setValidationError('Cost center is required to allocate department expenditure.')
      return
    }

    if (!isSoftwareSaas && !vendor.trim()) {
      setValidationError('Vendor name is required for procurement validation.')
      return
    }

    if (!businessJustification.trim()) {
      setValidationError('Business justification is required.')
      return
    }

    if (!businessImpact.trim()) {
      setValidationError('Business impact analysis is required.')
      return
    }

    if (!approvalComments.trim()) {
      setValidationError(`${portalType === 'ADMIN' ? 'Executive admin' : portalType === 'FINANCE' ? 'Finance' : 'Manager'} approval comments are required for audit trail.`)
      return
    }

    setValidationError('')

    const params: ApprovalParameters = {
      requestedAmount,
      approvedAmount: numApproved,
      budgetAvailable,
      costCenter: costCenter.trim(),
      vendor: isSoftwareSaas ? (vendor.trim() || request.vendor || 'Direct Software Provider') : vendor.trim(),
      commercialEvaluation: isSoftwareSaas ? 'Not Required' : commercialEvaluation,
      businessJustification: businessJustification.trim(),
      businessImpact: businessImpact.trim(),
      riskCompliance,
      approvalComments: approvalComments.trim(),
      approvedBy: approverName || (portalType === 'ADMIN' ? 'David Admin (Executive Authority)' : portalType === 'FINANCE' ? 'Mark Finance Officer' : 'Sarah Manager'),
      approvedAt: new Date().toISOString(),
    }

    onConfirm(params)
    onClose()
  }

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 overflow-hidden animate-fadeIn">
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[94vh] h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center font-bold shadow-xs">
              <CheckCircle size={22} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">Approve Request</h2>
              <p className="text-xs text-slate-300">
                {portalType === 'ADMIN'
                  ? 'Executive Administrative Review & Formal Authorization Dossier'
                  : portalType === 'FINANCE'
                  ? 'Financial Authorization & Commercial Review Dossier'
                  : 'Managerial Review & Formal Authorization Dossier'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Request Summary Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
              {request.id}
            </span>
            <span className="font-bold text-slate-900">{request.title}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500 text-[11px] font-medium">
            <span>👤 Requester: <b className="text-slate-700">{request.requester}</b></span>
            <span>🏢 Dept: <b className="text-slate-700">{request.department}</b></span>
          </div>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto [scrollbar-width:thin]">
          {/* Limit Exceeded Alert Banners */}
          {isManagerLimitExceeded && (
            <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl text-amber-900 flex items-start gap-3 shadow-xs">
              <AlertTriangle size={20} className="flex-shrink-0 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-xs text-amber-900">
                  Manager Approval Limit Exceeded (Limit: ₹50,000)
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  The requested amount for this requisition is <b className="text-amber-950 font-mono">{fmt(requestedAmount)}</b>, which exceeds the Manager approval limit of <b>₹50,000</b>. Managers are not authorized to directly approve requests above ₹50,000.
                </p>
                <p className="text-[11px] font-semibold text-amber-900">
                  👉 Please click <b className="underline">"Recommend to Higher Authority"</b> below to forward this request for higher authorization.
                </p>
              </div>
            </div>
          )}

          {isFinanceLimitExceeded && (
            <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl text-amber-900 flex items-start gap-3 shadow-xs">
              <AlertTriangle size={20} className="flex-shrink-0 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-xs text-amber-900">
                  Finance Approval Limit Exceeded (Limit: ₹1,00,000)
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  The requested amount for this requisition is <b className="text-amber-950 font-mono">{fmt(requestedAmount)}</b>, which exceeds the Finance approval limit of <b>₹1,00,000</b>. Finance Officers are not authorized to directly approve requests above ₹1,00,000.
                </p>
                <p className="text-[11px] font-semibold text-amber-900">
                  👉 Please click <b className="underline">"Recommend to Higher Authority"</b> below to forward this request to Admin.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {validationError ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2 animate-shake">
              <AlertCircle size={16} className="flex-shrink-0 text-rose-600" />
              <span>{validationError}</span>
            </div>
          ) : null}

          {/* ── PART A: FINANCIAL VALIDATION ── */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
              <IndianRupee size={16} className="text-emerald-600" />
              <span className="uppercase tracking-wider text-[11px]">Financial Validation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 1. Requested Amount */}
              <div>
                <label className="block text-slate-500 font-semibold mb-1 text-[11px]">
                  1. Requested Amount (Original PR)
                </label>
                <div className="w-full px-3.5 py-2 bg-slate-100 rounded-xl border border-slate-200 text-slate-700 font-mono font-bold text-sm">
                  {fmt(requestedAmount)}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Sum total requested by user</span>
              </div>

              {/* 2. Approved Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold text-[11px]">
                    2. Approved Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  {portalType === 'MANAGER' && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isManagerLimitExceeded
                        ? 'text-rose-700 bg-rose-50 border-rose-200'
                        : 'text-amber-700 bg-amber-50 border-amber-200'
                    }`}>
                      Limit: ₹50,000
                    </span>
                  )}
                  {portalType === 'FINANCE' && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isFinanceLimitExceeded
                        ? 'text-rose-700 bg-rose-50 border-rose-200'
                        : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                    }`}>
                      Limit: ₹1,00,000
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  value={approvedAmount}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '') {
                      setApprovedAmount('')
                    } else {
                      const num = parseFloat(val)
                      setApprovedAmount(isNaN(num) ? '' : num)
                    }
                  }}
                  className={`w-full px-3.5 py-2 rounded-xl border font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                    isLimitExceeded
                      ? 'border-purple-400 focus:ring-purple-500/20 focus:border-purple-600 bg-purple-50/20'
                      : 'bg-white border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600'
                  }`}
                  placeholder={portalType === 'MANAGER' ? 'Limit ₹50,000' : portalType === 'FINANCE' ? 'Limit ₹1,00,000' : 'Enter amount'}
                  required
                />
                <div className="flex items-center justify-between mt-0.5 text-[10px]">
                  <span className="text-slate-400">
                    Actual authorized amount (cannot exceed requested)
                  </span>
                  {portalType === 'MANAGER' && (isManagerLimitExceeded || Number(approvedAmount) > 50000) && (
                    <span className="text-purple-700 font-bold">
                      &gt; ₹50,000 → Recommend to Higher Authority
                    </span>
                  )}
                  {portalType === 'FINANCE' && (isFinanceLimitExceeded || Number(approvedAmount) > 100000) && (
                    <span className="text-purple-700 font-bold">
                      &gt; ₹1,00,000 → Recommend to Higher Authority
                    </span>
                  )}
                </div>
              </div>

              {/* 3. Budget Available */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5 text-[11px]">
                  3. Budget Available in Department? <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border cursor-pointer font-bold transition-all ${
                    budgetAvailable === 'Yes'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-1 ring-emerald-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}>
                    <input
                      type="radio"
                      name="budgetAvailable"
                      value="Yes"
                      checked={budgetAvailable === 'Yes'}
                      onChange={() => setBudgetAvailable('Yes')}
                      className="hidden"
                    />
                    <Check size={14} className={budgetAvailable === 'Yes' ? 'text-emerald-600' : 'text-slate-400'} />
                    <span>Yes, Budget Confirmed</span>
                  </label>

                  {/* "No (Exception Required)" Option Removed */}
                </div>
              </div>

              {/* 4. Cost Center */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                  4. Cost Center / Budget Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={costCenter}
                  onChange={(e) => setCostCenter(e.target.value)}
                  placeholder="e.g. CC-ENG-2026-Q3"
                  className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-xs text-slate-900"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Accounting unit where expenditure will be booked</span>
              </div>
            </div>
          </div>

          {/* ── PART B: PROCUREMENT VALIDATION (Omitted for Software & SaaS) ── */}
          {!isSoftwareSaas ? (
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
                <Building size={16} className="text-blue-600" />
                <span className="uppercase tracking-wider text-[11px]">Procurement Validation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 5. Vendor */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    5. Contracted / Target Vendor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="e.g. Dell Technologies Enterprise"
                    className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-xs text-slate-900"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Designated supplier who receives the PO</span>
                </div>

                {/* 6. Commercial Evaluation */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    6. Commercial Evaluation Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={commercialEvaluation}
                    onChange={(e) => setCommercialEvaluation(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-xs text-slate-900"
                  >
                    <option value="Completed">Completed (Market Quotes Evaluated)</option>
                    <option value="Pending">Pending (Quotes Awaiting Review)</option>
                    <option value="Not Required">Not Required (Sole Supplier / Rate Contract)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Price benchmarking &amp; supplier quote validation</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── PART C: BUSINESS JUSTIFICATION ── */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
              <FileText size={16} className="text-purple-600" />
              <span className="uppercase tracking-wider text-[11px]">Business Justification &amp; Impact</span>
            </div>

            <div className="space-y-3">
              {/* Business Justification */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                  {numJustification}. Business Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={businessJustification}
                  onChange={(e) => setBusinessJustification(e.target.value)}
                  placeholder="Explain why this procurement is mandatory for the business..."
                  className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-medium text-xs text-slate-900"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Documented commercial and technical reason for purchase</span>
              </div>

              {/* Business Impact */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                  {numImpact}. Business Impact (If Disapproved) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={businessImpact}
                  onChange={(e) => setBusinessImpact(e.target.value)}
                  placeholder="What operational or compliance risks occur if this request is delayed or rejected?..."
                  className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-medium text-xs text-slate-900"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Impact analysis on company operations, schedules, and deliverables</span>
              </div>
            </div>
          </div>

          {/* ── PART D: RISK, COMPLIANCE & COMMENTS ── */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
              <ShieldCheck size={16} className="text-amber-600" />
              <span className="uppercase tracking-wider text-[11px]">Risk, Compliance &amp; Approver Audit</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Risk & Compliance */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                  {numRisk}. Risk &amp; Policy Compliance <span className="text-rose-500">*</span>
                </label>
                <select
                  value={riskCompliance}
                  onChange={(e) => setRiskCompliance(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-medium text-xs text-slate-900"
                >
                  <option value="Passed">Passed (Fully Compliant with Company Procurement Policy)</option>
                  <option value="Pending">Pending (Under Legal / InfoSec Review)</option>
                  <option value="Not Required">Not Required (Standard Hardware / Catalog Item)</option>
                  <option value="Failed">Failed (Policy Exceptions Detected)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Audit verification against procurement guidelines</span>
              </div>

              {/* Approver Meta */}
              <div>
                <label className="block text-slate-500 font-semibold mb-1 text-[11px]">
                  Authorized Reviewer Identity
                </label>
                <div className="px-3.5 py-2 bg-slate-100 rounded-xl border border-slate-200 text-slate-800 font-semibold flex items-center justify-between">
                  <span>{approverName || (portalType === 'ADMIN' ? 'David Admin' : portalType === 'FINANCE' ? 'Mark Finance Officer' : 'Sarah Manager')}</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                    {portalType === 'ADMIN' ? 'Executive Admin' : portalType === 'FINANCE' ? 'Finance Officer' : 'Dept Manager'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Timestamped on confirmation</span>
              </div>
            </div>

            {/* Approval Comments */}
            <div className="pt-2">
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                {numComments}. Approval Comments &amp; Sign-off Notes <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder="Record your executive approval rationale for Finance and Audit teams..."
                className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium text-xs text-slate-900"
                required
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">This documented note is permanently archived in the requisition audit trail</span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors"
            >
              Cancel
            </button>

            {isLimitExceeded ? (
              <button
                type="button"
                onClick={handleRecommend}
                disabled={isRecommending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-purple-600/25 hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <ArrowUpRight size={16} strokeWidth={2.5} />
                <span>{isRecommending ? 'Recommending...' : 'Recommend to Higher Authority'}</span>
              </button>
            ) : isAlreadyApproved ? (
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-100 text-emerald-850 font-bold text-xs border border-emerald-300 shadow-2xs">
                <CheckCircle size={16} className="text-emerald-700" />
                <span>Already Approved & Released</span>
              </div>
            ) : (
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 hover:shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle size={16} strokeWidth={2.5} />
                <span>Confirm Approval</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  </ModalPortal>
)
}
