import React, { useState, useEffect, useMemo } from 'react'
import {
  X, CheckCircle, AlertCircle, ShieldCheck, DollarSign,
  Building, FileText, Check, Search, TrendingUp, Layers,
  Cpu, KeyRound, Calculator, ArrowRight, UserCheck, Clock
} from 'lucide-react'
import type { ProcurementRequest } from '../../context/ManagerDataContext'
import { saveAdminResearchApi, saveAdminCostEstimationApi } from '../../api/adminApi'

interface AdminResearchModalProps {
  isOpen: boolean
  request: ProcurementRequest | null
  onClose: () => void
  onSuccess: (updatedRequest?: any) => void
}

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export const AdminResearchModal: React.FC<AdminResearchModalProps> = ({
  isOpen,
  request,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !request) return null

  // Determine whether this request is Software or Hardware
  const isSoftware = useMemo(() => {
    const cat = (request.category || '').toLowerCase()
    const title = (request.title || '').toLowerCase()
    return (
      request.flowType === 'B' ||
      Boolean((request as any).software_name) ||
      Boolean((request as any).request_type) ||
      cat.includes('software') ||
      cat.includes('saas') ||
      title.includes('software') ||
      title.includes('saas') ||
      cat.includes('cloud')
    )
  }, [request])

  const initialQuantity = Number(request.quantity || (request as any).extra_fields?.quantity || 1)
  const initialAmount = Number(request.amount || 0)

  // Form State
  // Research Fields
  const [vendor, setVendor] = useState(request.vendor || (isSoftware ? 'Microsoft Corporation' : 'Dell Technologies'))
  const [marketPricing, setMarketPricing] = useState('')
  const quotationRef = (request as any).vendor_quotation_ref || (request as any).quotation_reference || `RFQ-${request.id}-ADMIN`
  const [researchNotes, setResearchNotes] = useState('')
  // Specific Specs
  const [softwareLicensing, setSoftwareLicensing] = useState(
    (request as any).software_licensing || 'Enterprise Annual Seat License with 24/7 SLA'
  )
  const [requestedPlan, setRequestedPlan] = useState((request as any).required_plan || (request as any).extra_fields?.requiredPlan || 'Enterprise Tier')
  const [hardwareSpecs, setHardwareSpecs] = useState(
    (request as any).hardware_specs || 'Intel Core i7-13700, 32GB DDR5 RAM, 1TB NVMe Gen4 SSD, 3-Yr Onsite ProSupport Plus'
  )

  // Cost Estimation Fields
  const [unitCost, setUnitCost] = useState<number>(() => {
    if (initialQuantity > 0 && initialAmount > 0) {
      return Math.round(initialAmount / initialQuantity)
    }
    return isSoftware ? 12000 : 75000
  })
  const [quantity, setQuantity] = useState<number>(initialQuantity > 0 ? initialQuantity : 1)
  const [taxPercent, setTaxPercent] = useState<number>(18)
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [costCenter, setCostCenter] = useState(
    request.costCenter || `CC-${(request.department || 'ENG').toUpperCase().slice(0, 3)}-2026`
  )
  const [budgetCode, setBudgetCode] = useState(
    (request as any).budget_code || `BG-${isSoftware ? 'SOFT' : 'HARD'}-2026-Q3`
  )
  const [adminComments, setAdminComments] = useState('')

  // Computed Values
  const baseTotal = useMemo(() => unitCost * quantity, [unitCost, quantity])
  const taxAmount = useMemo(() => Math.round((baseTotal * taxPercent) / 100), [baseTotal, taxPercent])
  const finalAmount = useMemo(() => Math.max(0, baseTotal + taxAmount - discountAmount), [baseTotal, taxAmount, discountAmount])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSaveOnlyResearch = async () => {
    setIsSubmitting(true)
    setErrorMsg('')
    try {
      const payload = {
        vendor,
        market_pricing: marketPricing || `Benchmarked for ${vendor} market tier`,
        vendor_quotation_ref: quotationRef || `RFQ-${request.id}-ADMIN`,
        research_notes: researchNotes || adminComments || 'Admin market research complete.',
        hardware_specs: !isSoftware ? hardwareSpecs : '',
        software_licensing: isSoftware ? softwareLicensing : '',
        requested_plan: isSoftware ? requestedPlan : '',
        quantity_licenses: quantity,
        estimated_unit_cost: unitCost,
        admin_comments: adminComments,
      }
      const updated = await saveAdminResearchApi(request.id, payload)
      onSuccess(updated)
      onClose()
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to save research.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitCostEstimation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (unitCost <= 0) {
      setErrorMsg('Please enter a valid estimated unit cost greater than 0.')
      return
    }
    if (quantity <= 0) {
      setErrorMsg('Quantity / licenses must be at least 1.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg('')
    try {
      const payload = {
        vendor,
        estimated_unit_cost: unitCost,
        quantity_licenses: quantity,
        hardware_specs: !isSoftware ? hardwareSpecs : '',
        software_licensing: isSoftware ? softwareLicensing : '',
        currency: 'INR',
        tax_percentage: taxPercent,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        estimated_total_cost: baseTotal,
        final_estimated_amount: finalAmount,
        budget_code: budgetCode,
        cost_center: costCenter,
        business_evaluation: `Admin verified ${isSoftware ? 'Software licensing' : 'Hardware specifications'} and commercial terms.`,
        admin_comments: adminComments || `Admin approved cost estimation for ${request.title}. Total: ${fmt(finalAmount)}`,
        notes: researchNotes,
      }
      const updated = await saveAdminCostEstimationApi(request.id, payload)
      onSuccess(updated)
      onClose()
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to submit cost estimation.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shadow-inner">
              <ShieldCheck className="text-purple-300" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">
                  ADMIN WORKFLOW • STAGE 4 & 5
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                  isSoftware
                    ? 'bg-purple-500/30 text-purple-200 border-purple-400/30'
                    : 'bg-emerald-500/30 text-emerald-200 border-emerald-400/30'
                }`}>
                  {isSoftware ? 'Software / SaaS Requisition' : 'IT Hardware Requisition'}
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Research & Cost Estimation — {request.title} ({request.id})
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 font-bold">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Dossier Summary: Team Lead -> Manager -> Finance Recommendations */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText size={14} className="text-indigo-600" />
              1. Multi-Stage Escalation Dossier
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">1. Team Lead Requisition</span>
                <p className="font-bold text-slate-800 mt-1">{request.requester || 'Team Lead'}</p>
                <p className="text-[11px] text-slate-500">Dept: <b>{request.department}</b></p>
                <p className="text-[11px] text-slate-500">Requested: <b>{fmt(request.amount)}</b></p>
                {request.justification && (
                  <p className="text-[11px] text-slate-600 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-100">
                    "{request.justification}"
                  </p>
                )}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-purple-600 uppercase block">2. Manager Recommendation</span>
                <p className="font-bold text-slate-800 mt-1">{request.recommendedBy || 'Department Manager'}</p>
                <p className="text-[11px] text-purple-700 font-medium mt-0.5">Escalated due to departmental budget limits</p>
                {request.recommendationReason && (
                  <p className="text-[11px] text-purple-900 italic mt-1 bg-purple-50 p-1.5 rounded border border-purple-100 font-medium">
                    "{request.recommendationReason}"
                  </p>
                )}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-emerald-600 uppercase block">3. Finance Recommendation</span>
                <p className="font-bold text-slate-800 mt-1">Mark Finance Officer</p>
                <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Requires Executive Admin spend authorization</p>
                {(request as any).financeComment && (
                  <p className="text-[11px] text-emerald-950 italic mt-1 bg-emerald-50 p-1.5 rounded border border-emerald-100 font-medium">
                    "{(request as any).financeComment}"
                  </p>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitCostEstimation} className="space-y-6">
            {/* Stage 1: Admin Research Form */}
            <div className="bg-purple-50/40 rounded-2xl border border-purple-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search size={16} className="text-purple-700" />
                  <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                    2. Admin Market Research &amp; Vendor Analysis
                  </h4>
                </div>
                <span className="text-[10px] font-extrabold text-purple-800 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-full">
                  Step 1: Market Intelligence
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Selected Authorized Vendor / Sourcing Partner *
                </label>
                <input
                  type="text"
                  required
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="e.g. Microsoft Enterprise, Dell Technologies, AWS"
                />
              </div>

              {/* Dynamic Software vs Hardware Specs */}
              {isSoftware ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-3.5 rounded-xl border border-purple-200">
                  <div>
                    <label className="text-xs font-bold text-purple-950 block mb-1">
                      Software Licensing Model &amp; Terms *
                    </label>
                    <input
                      type="text"
                      required
                      value={softwareLicensing}
                      onChange={(e) => setSoftwareLicensing(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      placeholder="e.g. Annual Per-User SaaS License with Enterprise Support"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-purple-950 block mb-1">
                      Tier / Plan Selected *
                    </label>
                    <input
                      type="text"
                      required
                      value={requestedPlan}
                      onChange={(e) => setRequestedPlan(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      placeholder="e.g. Enterprise Tier / Cloud Business Pro"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white p-3.5 rounded-xl border border-purple-200 space-y-1">
                  <label className="text-xs font-bold text-purple-950 block mb-1">
                    Hardware Technical Specifications &amp; Warranty *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={hardwareSpecs}
                    onChange={(e) => setHardwareSpecs(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="e.g. 14th Gen Intel Core i7, 32GB RAM, 1TB SSD, 3-Yr Onsite Warranty"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Market Pricing Benchmark &amp; Source
                  </label>
                  <input
                    type="text"
                    value={marketPricing}
                    onChange={(e) => setMarketPricing(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="e.g. Direct OEM commercial portal & verified distributor rate"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Research Notes &amp; Comparative Analysis
                  </label>
                  <input
                    type="text"
                    value={researchNotes}
                    onChange={(e) => setResearchNotes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="e.g. Evaluated 3 authorized partners. Sourced maximum volume discount."
                  />
                </div>
              </div>
            </div>

            {/* Stage 2: Cost Estimation Form */}
            <div className="bg-emerald-50/40 rounded-2xl border border-emerald-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator size={16} className="text-emerald-700" />
                  <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                    3. Admin Cost Estimation &amp; Financial Model
                  </h4>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  Step 2: Commercial Structure
                </span>
              </div>

              {/* Price Calculation Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Estimated Unit Cost (₹) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Quantity / Seats *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    GST / Tax Rate (%)
                  </label>
                  <select
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value={0}>0% (Tax Exempt)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST (Standard)</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Discount / Rebate (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Real-time Calculation Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Subtotal (Base)</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{fmt(baseTotal)}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Tax / GST ({taxPercent}%)</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">+{fmt(taxAmount)}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Commercial Discount</span>
                  <p className="font-bold text-emerald-700 text-sm mt-0.5">-{fmt(discountAmount)}</p>
                </div>
                <div className="bg-emerald-100/80 p-3 rounded-xl border border-emerald-300 shadow-2xs">
                  <span className="text-[10px] font-black text-emerald-950 block uppercase">Final Estimated Total</span>
                  <p className="font-black text-emerald-950 text-base mt-0.5">{fmt(finalAmount)}</p>
                </div>
              </div>

              {/* Financial Allocation & Comments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Cost Center Allocation *
                  </label>
                  <input
                    type="text"
                    required
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Budget Code Allocation *
                  </label>
                  <input
                    type="text"
                    required
                    value={budgetCode}
                    onChange={(e) => setBudgetCode(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Admin Comments / Executive Justification for Finance Report *
                </label>
                <textarea
                  rows={2}
                  required
                  value={adminComments}
                  onChange={(e) => setAdminComments(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Detail why this pricing and vendor is recommended for final fiscal disbursement..."
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveOnlyResearch}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  Save Research Findings Only
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle size={15} />
                  <span>Submit Cost Estimation to Finance Report</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
