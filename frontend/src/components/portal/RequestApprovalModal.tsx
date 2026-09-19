import React, { useState, useEffect } from 'react'
import {
  X, CheckCircle, AlertCircle, ShieldCheck, DollarSign,
  Building, FileText, Check
} from 'lucide-react'
import type { ProcurementRequest, ApprovalParameters } from '../../context/ManagerDataContext'

interface RequestApprovalModalProps {
  isOpen: boolean
  request: ProcurementRequest | null
  onClose: () => void
  onConfirm: (approvalParams: ApprovalParameters) => void
  portalType?: 'MANAGER' | 'ADMIN' | 'FINANCE'
  approverName?: string
}

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export const RequestApprovalModal: React.FC<RequestApprovalModalProps> = ({
  isOpen,
  request,
  onClose,
  onConfirm,
  portalType = 'MANAGER',
  approverName,
}) => {
  if (!isOpen || !request) return null

  // 1. Requested Amount (read-only)
  const requestedAmount = request.amount

  // 2. Approved Amount (editable)
  const [approvedAmount, setApprovedAmount] = useState<number | string>(request.amount || '')

  // 3. Budget Available
  const [budgetAvailable, setBudgetAvailable] = useState<'Yes' | 'No'>('Yes')

  // 4. Cost Center
  const defaultCostCenter = request.costCenter || `CC-${(request.department || 'ENG').toUpperCase().slice(0, 3)}-2026-Q3`
  const [costCenter, setCostCenter] = useState<string>(defaultCostCenter)

  // 5. Vendor
  const defaultVendor = request.vendor || 'Dell Technologies Enterprise'
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

  // Reset form when request changes
  useEffect(() => {
    if (request) {
      setApprovedAmount(request.amount || '')
      setBudgetAvailable('Yes')
      setCostCenter(request.costCenter || `CC-${(request.department || 'ENG').toUpperCase().slice(0, 3)}-2026-Q3`)
      setVendor(request.vendor || 'Dell Technologies Enterprise')
      setCommercialEvaluation('Completed')
      setBusinessJustification(request.justification || 'Required for department operational and strategic delivery.')
      setBusinessImpact('Direct impact on department deliverables and sprint schedule if unapproved.')
      setRiskCompliance('Passed')
      setApprovalComments('Specifications verified against approved OPEX/CAPEX allocation. Approved for PO generation.')
      setValidationError('')
    }
  }, [request])

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()

    const numApproved = typeof approvedAmount === 'number' ? approvedAmount : parseFloat(String(approvedAmount)) || 0

    // Validate fields
    if (!numApproved || numApproved <= 0) {
      setValidationError('Approved amount must be greater than zero.')
      return
    }

    if (requestedAmount > 0 && numApproved > requestedAmount) {
      setValidationError(`Approved amount (${fmt(numApproved)}) cannot exceed requested amount (${fmt(requestedAmount)}).`)
      return
    }

    if (!costCenter.trim()) {
      setValidationError('Cost center is required to allocate department expenditure.')
      return
    }

    if (!vendor.trim()) {
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
      vendor: vendor.trim(),
      commercialEvaluation,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
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
          {/* Error Message */}
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2 animate-shake">
              <AlertCircle size={16} className="flex-shrink-0 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* ── PART A: FINANCIAL VALIDATION ── */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
              <DollarSign size={16} className="text-emerald-600" />
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
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                  2. Approved Amount (₹) <span className="text-rose-500">*</span>
                </label>
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
                  className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono font-bold text-sm text-slate-900"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Actual authorized amount (cannot exceed requested)</span>
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

                  <label className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border cursor-pointer font-bold transition-all ${
                    budgetAvailable === 'No'
                      ? 'bg-rose-50 border-rose-300 text-rose-800 ring-1 ring-rose-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}>
                    <input
                      type="radio"
                      name="budgetAvailable"
                      value="No"
                      checked={budgetAvailable === 'No'}
                      onChange={() => setBudgetAvailable('No')}
                      className="hidden"
                    />
                    <span>No (Exception Required)</span>
                  </label>
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

          {/* ── PART B: PROCUREMENT VALIDATION ── */}
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

          {/* ── PART C: BUSINESS JUSTIFICATION ── */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
              <FileText size={16} className="text-purple-600" />
              <span className="uppercase tracking-wider text-[11px]">Business Justification &amp; Impact</span>
            </div>

            <div className="space-y-3">
              {/* 7. Business Justification */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                  7. Business Justification <span className="text-rose-500">*</span>
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

              {/* 8. Business Impact */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                  8. Business Impact (If Disapproved) <span className="text-rose-500">*</span>
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
              {/* 9. Risk & Compliance */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                  9. Risk &amp; Policy Compliance <span className="text-rose-500">*</span>
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
                  <span>Sarah Manager</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                    Dept Manager
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Timestamped on confirmation</span>
              </div>
            </div>

            {/* 10. Approval Comments */}
            <div className="pt-2">
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                10. Approval Comments &amp; Sign-off Notes <span className="text-rose-500">*</span>
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

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 hover:shadow-lg transition-all active:scale-95"
            >
              <CheckCircle size={16} strokeWidth={2.5} />
              <span>Confirm APPROVE</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
