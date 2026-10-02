import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { TrackingStepper } from '../../components/portal/TrackingStepper'
import {
  FileText, User, Calendar, Building, ArrowLeft,
  CheckCircle2, CheckCircle, ShieldCheck, Clock, Layers, Eye,
  Search, Calculator, Send, Save, Sparkles, DollarSign, Tag, Info, ArrowUpRight
} from 'lucide-react'
import { useManagerData, ApprovalParameters } from '../../context/ManagerDataContext'
import { RequestApprovalModal } from '../../components/portal/RequestApprovalModal'
import {
  saveResearchApi,
  savePreEstimationApi,
  verifyPaymentJustificationApi,
  sendBackRequestApi,
  recommendToFinanceApi
} from '../../api/managerApi'
import { PaymentJustificationDetailsDisplay } from '../teamlead/MyRequestsPage'

const fmt = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN')}`

export const ManagerRequestDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { allRequests, tickets, approveRequest, recommendToFinance } = useManagerData()
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [savingResearch, setSavingResearch] = useState(false)
  const [savingPreEstimation, setSavingPreEstimation] = useState(false)
  const [verifyingJustification, setVerifyingJustification] = useState(false)
  const [sendingBack, setSendingBack] = useState(false)
  const [recommending, setRecommending] = useState(false)
  const [justificationNotes, setJustificationNotes] = useState('')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const reqId = searchParams.get('id') || allRequests[0]?.id || 'REQ-2026-001'

  const req = useMemo(() => {
    return allRequests.find((r) => r.id === reqId) || allRequests[0]
  }, [allRequests, reqId])

  const matchedTicket = useMemo(() => {
    if (!req) return null
    return tickets.find(t => t.requestId === req.id || t.id === req.id) || null
  }, [tickets, req])

  // Extract research & pre-estimation defaults
  const researchData = (req as any)?.research_estimation || {}

  // Local form state for Research
  const [marketPricing, setMarketPricing] = useState('')
  const [availableAlternatives, setAvailableAlternatives] = useState('')
  const [businessValue, setBusinessValue] = useState('')
  const [vendorQuotationRef, setVendorQuotationRef] = useState('')
  const [researchNotes, setResearchNotes] = useState('')

  // Local form state for Pre-Estimation
  const [currentCost, setCurrentCost] = useState<number | string>(0)
  const [finalEstimatedAmount, setFinalEstimatedAmount] = useState<number | string>('')
  const [costCenter, setCostCenter] = useState('')
  const [budgetCode, setBudgetCode] = useState('')
  const [recommendedVendor, setRecommendedVendor] = useState('')
  const [businessEvaluation, setBusinessEvaluation] = useState('')
  const [managerComments, setManagerComments] = useState('')

  useEffect(() => {
    if (req) {
      const rd = (req as any).research_estimation || {}
      setMarketPricing(rd.market_pricing || 'Enterprise tier: ₹45,000 - ₹52,000 / year standard industry benchmark')
      setAvailableAlternatives(rd.available_alternatives || 'Evaluated 3 competitive SaaS providers; current selected solution offers native SSO and lowest integration cost.')
      setBusinessValue(rd.business_value || 'Direct productivity scaling for 12 engineering squad members with zero downtime.')
      setVendorQuotationRef(rd.vendor_quotation_ref || 'QUOTE-SaaS-2026-09')
      setResearchNotes(rd.research_notes || 'Vendor confirmed 5% volume discount applied on annual prepayment.')

      const existingAmt = (req as any).existing_cost || (req as any).existingCost || 0
      const initFinalAmt = rd.final_estimated_amount || (req as any).finance_approved_amount || req.amount || 48500
      setCurrentCost(existingAmt)
      setFinalEstimatedAmount(initFinalAmt > 0 ? initFinalAmt : 48500)
      setCostCenter(rd.cost_center || req.costCenter || `CC-${(req.department || 'ENG').toUpperCase().slice(0, 3)}-2026-Q3`)
      setBudgetCode(rd.budget_code || (req as any).budget_code || 'BG-IT-SOFT-01')
      setRecommendedVendor(rd.vendor || (req as any).software_name || req.vendor || 'Authorized Cloud Provider')
      setBusinessEvaluation(rd.business_evaluation || 'Commercial assessment completed. Pre-estimation aligns with departmental quarterly CAPEX/OPEX ceiling.')
      setManagerComments(rd.manager_comments || 'Thorough research conducted. Recommended for Finance review and disbursement approval.')
    }
  }, [req?.id])

  const handleSaveResearch = async () => {
    if (!req) return
    setSavingResearch(true)
    try {
      await saveResearchApi(req.id, {
        market_pricing: marketPricing,
        available_alternatives: availableAlternatives,
        business_value: businessValue,
        vendor_quotation_ref: vendorQuotationRef,
        research_notes: researchNotes,
      })
      window.dispatchEvent(new Event('kss_backend_updated'))
      showToast('✓ Research findings saved! Stage moved to Manager Researching (Stage 3).', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to save research findings.', 'error')
    } finally {
      setSavingResearch(false)
    }
  }

  const handleSavePreEstimation = async () => {
    if (!req) return
    const finalAmtNum = Number(finalEstimatedAmount) || 0
    if (finalAmtNum <= 0) {
      showToast('Please provide a valid final estimated amount (> 0).', 'error')
      return
    }
    setSavingPreEstimation(true)
    try {
      await savePreEstimationApi(req.id, {
        current_cost: Number(currentCost) || 0,
        final_estimated_amount: finalAmtNum,
        recommended_cost: finalAmtNum,
        cost_center: costCenter,
        budget_code: budgetCode,
        vendor: recommendedVendor,
        business_evaluation: businessEvaluation,
        manager_comments: managerComments,
        is_completed: true,
      })
      window.dispatchEvent(new Event('kss_backend_updated'))
      showToast('✓ Pre-Estimation dossier saved! Stage moved to Pre-Estimation Completed (Stage 4).', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to save pre-estimation.', 'error')
    } finally {
      setSavingPreEstimation(false)
    }
  }

  const handleDirectApprove = () => {
    if (!req) return
    const finalAmt = Number(finalEstimatedAmount) || req.amount || 48500
    const params: ApprovalParameters = {
      requestedAmount: req.amount,
      approvedAmount: finalAmt,
      budgetAvailable: 'Yes',
      costCenter: costCenter || `CC-${(req.department || 'ENG').toUpperCase().slice(0, 3)}-2026-Q3`,
      vendor: recommendedVendor || (req as any).software_name || req.vendor || 'Authorized Cloud Provider',
      commercialEvaluation: 'Completed',
      businessJustification: (req as any).business_requirement || req.justification || 'Verified and endorsed for procurement.',
      businessImpact: 'High positive impact on operational roadmap.',
      riskCompliance: 'Passed',
      approvalComments: managerComments || `Manager evaluated research & pre-estimation (${fmt(finalAmt)}). Approved and forwarded to Finance.`,
      approvedBy: 'Sarah Manager',
      approvedAt: new Date().toISOString(),
    }
    approveRequest(req.id, params.approvalComments, params)
    showToast(`✓ Request ${req.id} approved & forwarded to Finance Review (Stage 6)!`, 'success')
    setShowApprovalModal(false)
  }

  const handleConfirmApprovalModal = (params: ApprovalParameters) => {
    if (!req) return
    approveRequest(req.id, params.approvalComments, params)
    showToast(`✓ Request ${req.id} approved successfully! Forwarded for procurement.`, 'success')
    setShowApprovalModal(false)
  }

  if (!req) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center text-slate-500">
        <p>No request found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
          Go Back
        </button>
      </div>
    )
  }

  const isApproved = req.approvedBy || req.status === 'approved' || req.status === 'finance_approved' || req.status === 'finance_review' || (req as any).raw_status === 'FINANCE_REVIEW' || (req as any).raw_status === 'FINANCE_APPROVED'

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 text-white animate-fadeIn ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft size={14} /> Back to Requests
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Request Details & Lifecycle Tracking</h1>
          <p className="text-xs text-slate-500">Comprehensive procurement request lifecycle, approval trail, and multi-product receipts.</p>
        </div>

        <div className="flex items-center gap-3">
          {isApproved ? (
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-xl shadow-2xs">
              <CheckCircle size={14} className="text-emerald-700" />
              {req.status === 'finance_review' ? 'Approved by Manager → Finance Review' : `Approved by ${req.approvedBy || 'Manager'}`}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <button
                disabled={recommending}
                onClick={async () => {
                  if (!window.confirm(`Recommend Software Request ${req.id} to Finance Department?`)) return
                  setRecommending(true)
                  try {
                    await recommendToFinanceApi(req.id, managerComments || 'Recommended to Finance Department for review, estimation, and payment approval.')
                    showToast(`✓ Request ${req.id} recommended to Finance Department!`, 'success')
                    window.dispatchEvent(new Event('kss_backend_updated'))
                  } catch (e: any) {
                    showToast(e?.response?.data?.error || 'Failed to recommend to Finance.', 'error')
                  } finally {
                    setRecommending(false)
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <ArrowUpRight size={15} />
                {recommending ? 'Recommending...' : 'Recommend to Finance'}
              </button>
              <button
                onClick={() => setShowApprovalModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-300"
              >
                Approval Modal
              </button>
              <button
                onClick={handleDirectApprove}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <CheckCircle size={15} />
                Approve & Forward to Finance
              </button>
            </div>
          )}

          <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl shadow-2xs">
            {req.id}
          </span>
        </div>
      </div>

      {/* Dynamic Workflow Progress Stepper (Single source of truth from backend timeline) */}
      <TrackingStepper
        category={req.category}
        title={req.title}
        status={req.raw_status || req.status}
        currentlyWith={req.currentlyWith || (req as any).currently_with}
        financeStatus={req.financeStatus}
        paymentStatus={req.paymentStatus}
        lastUpdated={req.date}
        history={req.history}
        timeline={(req as any).timeline}
      />

      {/* Request Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">
                {req.id}
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                req.priority === 'Critical'
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : req.priority === 'High'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-blue-100 text-blue-900 border-blue-300'
              }`}>
                {req.priority} Priority
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                req.status === 'approved' || req.status === 'finance_approved' || req.paymentStatus === 'Paid'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : req.status === 'finance_review'
                  ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                  : req.status === 'rejected'
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                {req.status === 'finance_review' ? 'Finance Review' : req.approvedBy ? 'Manager Approved' : req.status === 'rejected' ? 'Manager Rejected' : 'Pending Manager Review'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-2">{req.title}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Requester: <b className="text-slate-800 font-semibold">{req.requester}</b> • Department:{' '}
              <b className="text-slate-800 font-semibold">{req.department}</b> • Created: {req.date}
            </p>
          </div>
          <div className="text-right flex-shrink-0 bg-slate-50 border border-slate-200 p-3 sm:py-2.5 sm:px-4 rounded-xl">
            <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">
              {(req as any).finance_approved_amount ? 'Finance Approved Amount' : 'Estimated Amount'}
            </span>
            <span className="text-2xl font-black text-slate-900">
              {fmt((req as any).finance_approved_amount || req.amount)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Category</span>
            <span className="font-bold text-slate-900">{req.category}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Department</span>
            <span className="font-bold text-slate-900">{req.department}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Manager Status</span>
            <span className="font-bold text-slate-900">{req.status}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Finance Status</span>
            <span className="font-bold text-purple-900">{req.financeStatus || 'Not Escalated'}</span>
          </div>
        </div>

        {/* ── Team Lead's Requirements Section ── */}
        <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/60 p-5 rounded-2xl border border-blue-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-600 text-white rounded-lg">
                <FileText size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Team Lead's Requirement Specifications</h3>
                <p className="text-[11px] text-slate-500">Original requisition parameters submitted from Team Lead desk</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
              Stage 1 Submitted
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Request Type</span>
              <p className="font-bold text-blue-900 mt-0.5">{(req as any).request_type || (req as any).requestType || 'New Purchase'}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Software / Tool</span>
              <p className="font-bold text-slate-900 mt-0.5">{(req as any).software_name || (req as any).softwareName || req.title}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Current Plan</span>
              <p className="font-medium text-slate-700 mt-0.5">{(req as any).current_plan || (req as any).currentPlan || 'None / Trial'}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Required Plan</span>
              <p className="font-bold text-indigo-700 mt-0.5">{(req as any).required_plan || (req as any).requiredPlan || 'Enterprise'}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Existing Cost</span>
              <p className="font-bold text-slate-900 mt-0.5">{fmt((req as any).existing_cost || (req as any).existingCost || 0)}</p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-blue-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Business Requirement / Problem Statement</span>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {(req as any).business_requirement || (req as any).businessRequirement || req.justification || req.description || 'Business justification submitted for team productivity and technical delivery.'}
            </p>
          </div>
        </div>

        {/* ── Manager Research & Pre-Estimation Dossier (Stages 3 & 4) ── */}
        <div className="border border-purple-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="bg-purple-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-purple-700 rounded-lg">
                <Sparkles size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold">Manager Procurement Dossier: Research & Pre-Estimation</h3>
                <p className="text-[11px] text-purple-200">Execute vendor benchmarking, establish commercial pre-estimation, and forward to Finance.</p>
              </div>
            </div>
            <span className="text-[11px] font-bold bg-purple-800/80 border border-purple-500/50 px-3 py-1 rounded-xl">
              Stages 3 & 4 Controls
            </span>
          </div>

          <div className="p-6 bg-slate-50/50 space-y-6">
            {/* Step 3: Market & License Research */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">3</span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Research & Vendor Benchmarking (Stage 3)</h4>
                </div>
                <button
                  type="button"
                  disabled={savingResearch}
                  onClick={handleSaveResearch}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <Save size={13} />
                  {savingResearch ? 'Saving...' : 'Save Research Findings'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Market Pricing & Benchmark Range</label>
                  <input
                    type="text"
                    value={marketPricing}
                    onChange={(e) => setMarketPricing(e.target.value)}
                    placeholder="e.g. ₹45,000 - ₹52,000 / year"
                    className="w-full p-2.5 border rounded-lg bg-slate-50 border-slate-300 font-medium text-slate-800 focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendor Quotation Reference</label>
                  <input
                    type="text"
                    value={vendorQuotationRef}
                    onChange={(e) => setVendorQuotationRef(e.target.value)}
                    placeholder="e.g. QUOTE-2026-09"
                    className="w-full p-2.5 border rounded-lg bg-slate-50 border-slate-300 font-medium text-slate-800 focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Available Alternatives & Feasibility</label>
                  <textarea
                    rows={2}
                    value={availableAlternatives}
                    onChange={(e) => setAvailableAlternatives(e.target.value)}
                    placeholder="Options evaluated, competitor comparison, compatibility checks..."
                    className="w-full p-2.5 border rounded-lg bg-slate-50 border-slate-300 font-medium text-slate-800 focus:bg-white focus:border-indigo-600 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Direct Business Value & ROI</label>
                  <textarea
                    rows={2}
                    value={businessValue}
                    onChange={(e) => setBusinessValue(e.target.value)}
                    placeholder="Direct operational impact, scale benefits, efficiency gains..."
                    className="w-full p-2.5 border rounded-lg bg-slate-50 border-slate-300 font-medium text-slate-800 focus:bg-white focus:border-indigo-600 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-bold text-slate-700 mb-1">Manager Research Notes / Discount Negotiation</label>
                <input
                  type="text"
                  value={researchNotes}
                  onChange={(e) => setResearchNotes(e.target.value)}
                  placeholder="Terms negotiated, SLA commitments, volume discounts..."
                  className="w-full p-2.5 border rounded-lg bg-slate-50 border-slate-300 font-medium text-slate-800 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>
            </div>

            {/* Step 4: Pre-Estimation */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">4</span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Commercial Pre-Estimation (Stage 4)</h4>
                </div>
                <button
                  type="button"
                  disabled={savingPreEstimation}
                  onClick={handleSavePreEstimation}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <Save size={13} />
                  {savingPreEstimation ? 'Saving...' : 'Save Pre-Estimation'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Recommended Vendor</label>
                  <input
                    type="text"
                    value={recommendedVendor}
                    onChange={(e) => setRecommendedVendor(e.target.value)}
                    placeholder="Vendor Name"
                    className="w-full p-2.5 border rounded-lg bg-slate-50 border-slate-300 font-bold text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Final Estimated Amount (INR) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={finalEstimatedAmount}
                      onChange={(e) => setFinalEstimatedAmount(e.target.value)}
                      placeholder="e.g. 48500"
                      className="w-full p-2.5 border rounded-lg bg-emerald-50 border-emerald-300 font-black text-emerald-950 focus:bg-white focus:border-emerald-600 outline-none"
                    />
                    <DollarSign size={14} className="absolute right-3 top-3 text-emerald-700" />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cost Center Code</label>
                  <input
                    type="text"
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                    placeholder="CC-ENG-2026-Q3"
                    className="w-full p-2.5 border rounded-lg bg-slate-50 border-slate-300 font-bold text-indigo-700 focus:bg-white focus:border-purple-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Budget Allocation Code</label>
                  <input
                    type="text"
                    value={budgetCode}
                    onChange={(e) => setBudgetCode(e.target.value)}
                    placeholder="BG-IT-SOFT-01"
                    className="w-full p-2.5 border rounded-lg bg-slate-50 border-slate-300 font-bold text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Commercial Evaluation Summary</label>
                  <textarea
                    rows={2}
                    value={businessEvaluation}
                    onChange={(e) => setBusinessEvaluation(e.target.value)}
                    placeholder="Fiscal alignment, OPEX justification, contractual viability..."
                    className="w-full p-2.5 border rounded-lg bg-slate-50 border-slate-300 font-medium text-slate-800 focus:bg-white focus:border-purple-600 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Manager Sign-off Endorsement Comments</label>
                  <textarea
                    rows={2}
                    value={managerComments}
                    onChange={(e) => setManagerComments(e.target.value)}
                    placeholder="Notes forwarded to Finance Directorate..."
                    className="w-full p-2.5 border rounded-lg bg-slate-50 border-slate-300 font-medium text-slate-800 focus:bg-white focus:border-purple-600 outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 5 Action Bar: Approve and Recommend to Finance */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Stage 5 Hand-off</span>
                <p className="text-xs font-bold text-emerald-950">Ready to escalate to Finance Review (Stage 6)?</p>
                <p className="text-[11px] text-emerald-700">Pre-estimated amount: <b>{fmt(Number(finalEstimatedAmount) || 0)}</b> will be submitted for budget allocation.</p>
              </div>
              <button
                type="button"
                onClick={handleDirectApprove}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex-shrink-0"
              >
                <CheckCircle size={15} />
                Approve & Forward to Finance
              </button>
            </div>
          </div>
        </div>

        {/* Multi-Product Receipts Breakdown if Available */}
        {matchedTicket?.products && matchedTicket.products.length > 0 && (
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Procurement Products & Distinct Receipts</h3>
                <p className="text-[11px] text-slate-500">Each product has its distinct Purchase Order, Goods Receipt (GRN), and Tax Invoice.</p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                {matchedTicket.products.length} Products
              </span>
            </div>

            <div className="space-y-3">
              {matchedTicket.products.map((prod) => {
                const grnVerified = prod.goodsReceipt.verified
                const invVerified = prod.invoice.verified
                const all2Verified = grnVerified && invVerified
                const isPaid = prod.paymentSettled || req.paymentStatus === 'Paid' || req.status === 'completed'

                return (
                  <div key={prod.id} className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded shadow-2xs">
                            {prod.id}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{prod.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Vendor: <b className="text-slate-700 font-semibold">{prod.vendor}</b> • Qty: {prod.quantity} {prod.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900">{fmt(prod.totalAmount)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">PO Number</span>
                        <span className="font-mono font-bold text-indigo-700">{prod.productOrder.id}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">GRN Number</span>
                        <span className="font-mono font-bold text-emerald-700">{prod.goodsReceipt.id}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Tax Invoice</span>
                        <span className="font-mono font-bold text-purple-700">{prod.invoice.id}</span>
                      </div>
                    </div>

                    <div className={`rounded-xl p-3 flex items-center justify-between gap-3 border ${
                      isPaid
                        ? 'bg-emerald-50 border-emerald-200'
                        : all2Verified
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-amber-50/50 border-amber-200'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck size={16} className={isPaid || all2Verified ? 'text-emerald-600' : 'text-amber-600'} />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{prod.name} Status</p>
                          <p className="text-[10px] text-slate-500">
                            {isPaid
                              ? 'Both documents verified. Payment settled.'
                              : all2Verified
                              ? 'Both documents (GRN and Invoice) verified. Ready for payment.'
                              : 'Documents pending verification.'}
                          </p>
                        </div>
                      </div>

                      {isPaid ? (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 size={12} /> Payment Settled (Paid)
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                          <Clock size={12} /> Pending Treasury Payment
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── SOFTWARE & SAAS: Payment Justification Review Card ────────── */}
      {(() => {
        const rawSt = ((req as any).raw_status || (req as any).status || '').toUpperCase()
        const j = (req as any).extra_fields?.payment_justification || {}
        const isVerified = 
          rawSt === 'PAYMENT_JUSTIFIED' ||
          rawSt === 'MANAGER_VERIFIED' ||
          rawSt === 'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT' ||
          rawSt === 'TEAM_LEAD_ACKNOWLEDGED' ||
          rawSt === 'REQUEST_COMPLETED' ||
          rawSt === 'COMPLETED' ||
          Boolean((req as any).extra_fields?.justification_verified_at) ||
          Boolean((req as any).payment_justification_detail?.verified_at)

        const isAwaitingVerification = !isVerified && (
          rawSt === 'PAYMENT_JUSTIFICATION_SUBMITTED' ||
          rawSt === 'PAYMENT_PROCESSED' ||
          Boolean((req as any).payment_justification_detail || j.software_name)
        )

        if (!isAwaitingVerification && !isVerified && !j.software_name && !(req as any).payment_justification_detail) return null

        return (
          <div className="bg-gradient-to-r from-violet-50 via-purple-50 to-violet-50 border-2 border-violet-300 rounded-2xl shadow-sm p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-violet-200">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-full ${isVerified ? 'bg-emerald-600' : 'bg-violet-600'} text-white flex items-center justify-center flex-shrink-0 shadow`}>
                  {isVerified ? <CheckCircle size={18} /> : <FileText size={18} />}
                </div>
                <div>
                  <h3 className="font-bold text-violet-950 text-sm">
                    {isVerified ? 'Payment Justification (Verified)' : 'Payment Justification Review'}
                  </h3>
                  <p className="text-[11px] text-violet-700">
                    {isVerified
                      ? `Verified by ${(req as any).extra_fields?.justification_verified_by || 'Manager'}. Team Lead can now acknowledge and complete the request.`
                      : 'Team Lead submitted justification. Verify details, amount, payment proof, and documents below.'}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                isVerified
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
              }`}>
                {isVerified ? '✓ Justification Verified' : '⏳ Awaiting Manager Verification'}
              </span>
            </div>

            {/* Complete 7-Section Dossier with Document Links */}
            <PaymentJustificationDetailsDisplay req={req as any} />

            {(req as any).extra_fields?.justification_manager_notes && (
              <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 text-xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">Manager Notes</span>
                <p className="text-emerald-950 font-medium">{(req as any).extra_fields?.justification_manager_notes}</p>
              </div>
            )}

            {!isVerified && isAwaitingVerification && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-violet-700 uppercase block">Manager Verification Notes (Optional)</label>
                  <textarea
                    rows={2}
                    className="w-full border border-violet-200 rounded-xl px-3 py-2 text-xs bg-white resize-none shadow-2xs"
                    placeholder="Add your verification notes or approval comments..."
                    value={justificationNotes}
                    onChange={e => setJustificationNotes(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    disabled={sendingBack || verifyingJustification}
                    onClick={async () => {
                      if (!justificationNotes.trim()) {
                        showToast('Please provide notes explaining why you are sending back for correction.', 'error')
                        return
                      }
                      if (!window.confirm(`Send back Payment Justification for "${req.title}" for correction?`)) return
                      setSendingBack(true)
                      try {
                        await sendBackRequestApi(req.id, justificationNotes)
                        showToast('✓ Request sent back to Team Lead for correction.', 'success')
                        window.dispatchEvent(new Event('kss_backend_updated'))
                      } catch (e: any) {
                        showToast(e?.response?.data?.error || 'Send back failed.', 'error')
                      } finally {
                        setSendingBack(false)
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Clock size={14} />
                    {sendingBack ? 'Sending Back...' : 'Send Back for Correction'}
                  </button>

                  <button
                    disabled={verifyingJustification || sendingBack}
                    onClick={async () => {
                      if (!window.confirm(`Verify Payment Justification for "${req.title}"? This will enable Team Lead to acknowledge and complete the request.`)) return
                      setVerifyingJustification(true)
                      try {
                        await verifyPaymentJustificationApi(req.id, justificationNotes || 'Payment justification verified by Manager.')
                        showToast('✓ Payment Justification verified! Team Lead can now acknowledge and complete the request.', 'success')
                        window.dispatchEvent(new Event('kss_backend_updated'))
                      } catch (e: any) {
                        showToast(e?.response?.data?.error || 'Verification failed.', 'error')
                      } finally {
                        setVerifyingJustification(false)
                      }
                    }}
                    className="bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <ShieldCheck size={14} />
                    {verifyingJustification ? 'Verifying...' : 'Verify & Approve Justification'}
                  </button>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* Structured Manager Request Approval Dossier Modal */}
      <RequestApprovalModal
        isOpen={showApprovalModal}
        request={req}
        onClose={() => setShowApprovalModal(false)}
        onConfirm={handleConfirmApprovalModal}
      />
    </div>
  )
}
