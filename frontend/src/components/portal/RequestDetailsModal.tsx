import React from 'react'
import {
  X, PlusCircle, CheckCircle, XCircle, ArrowUpRight, Calendar,
  MapPin, Building, ShieldCheck, Tag, IndianRupee, Clock, Package,
  FileText, ChevronDown, Check, Info, Cpu, Layers
} from 'lucide-react'
import type { ProcurementRequest } from '../../context/ManagerDataContext'
import { formatDate } from '../../utils/formatDate'
import { useManagerData } from '../../context/ManagerDataContext'
import { TrackingStepper } from './TrackingStepper'
import { getRecommendationStatus } from '../../utils/workflowUtils'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

const CATEGORY_CONFIGS: Record<string, { quantityLabel?: string; extraFieldKey?: string; extraFieldLabel?: string }> = {
  'Software & SaaS': {
    quantityLabel: 'Number of seats / licenses',
    extraFieldKey: 'renewalCycle',
    extraFieldLabel: 'Renewal Cycle',
  },
  'Cloud & Infrastructure': {
    quantityLabel: 'Instance / Resource count',
    extraFieldKey: 'billingModel',
    extraFieldLabel: 'Billing Model',
  },
  'IT Hardware': {
    quantityLabel: 'Quantity',
    extraFieldKey: 'warrantyPeriod',
    extraFieldLabel: 'Warranty Period',
  },
  'Cybersecurity': {
    quantityLabel: 'Protected Endpoints / User count',
    extraFieldKey: 'licenseType',
    extraFieldLabel: 'License Type',
  },
  'IT Services': {
    quantityLabel: 'Estimated Hours / Scope Units',
    extraFieldKey: 'engagementModel',
    extraFieldLabel: 'Engagement Model',
  },
  'Office Accessories': {
    quantityLabel: 'Quantity',
    extraFieldKey: 'assemblyRequired',
    extraFieldLabel: 'Assembly Required',
  },
  'Office Technology': {
    quantityLabel: 'Quantity',
    extraFieldKey: 'maintenancePlan',
    extraFieldLabel: 'Maintenance Plan',
  },
  'Networking & Telecom': {
    quantityLabel: 'Port / Circuit count',
    extraFieldKey: 'bandwidthTier',
    extraFieldLabel: 'Bandwidth Tier',
  },
}

export interface RequestDetailsModalProps {
  isOpen: boolean
  request: ProcurementRequest | null
  onClose: () => void
  onApprove?: (req: ProcurementRequest) => void
  onReject?: (req: ProcurementRequest) => void
  onRecommend?: (req: ProcurementRequest) => void
  recommendLabel?: string
  isFinancePortal?: boolean
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({
  isOpen,
  request,
  onClose,
  onApprove,
  onReject,
  onRecommend,
  recommendLabel = 'Recommend to Higher Authority',
  isFinancePortal = false,
}) => {
  let allRequests: ProcurementRequest[] = []
  try {
    const mgr = useManagerData()
    allRequests = mgr.allRequests || []
  } catch (e) {
    allRequests = []
  }

  if (!isOpen || !request) return null

  const catConfig = CATEGORY_CONFIGS[request.category]
  const subcategory = request.subcategory || 'Office Equipment'
  
  const isSoft = (
    (request.category || '').toLowerCase().includes('software') ||
    (request.category || '').toLowerCase().includes('saas') ||
    (request.category || '').toLowerCase().includes('cloud') ||
    (request.category || '').toLowerCase().includes('license') ||
    (request.category || '').toLowerCase().includes('subscription') ||
    Boolean((request as any).softwareName)
  )

  let detailLabel = 'Category Detail: Warranty Period *'
  let detailValue = '1 Year'

  if (isSoft) {
    detailLabel = 'Subscription Type *'
    const pjSub = (request as any).payment_justification_detail?.subscription_type || request.extraFields?.payment_justification?.subscription_type || request.extraFields?.subscription_type || (request as any).subscription_type
    const rc = pjSub || request.extraFields?.renewalCycle || (request as any).renewalCycle

    if (rc) {
      const s = String(rc).trim().toLowerCase()
      if (s.includes('one')) detailValue = 'One-Time'
      else if (s.includes('year') || s.includes('annual')) detailValue = 'Annual'
      else if (s.includes('month')) detailValue = 'Monthly'
      else detailValue = rc
    } else {
      const sDate = request.extraFields?.start_date || (request as any).start_date
      const eDate = request.extraFields?.end_date || (request as any).end_date
      let diffDays: number | null = null
      if (sDate && eDate) {
        try {
          const d1 = new Date(sDate)
          const d2 = new Date(eDate)
          diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
        } catch {}
      }
      if (diffDays !== null && diffDays > 0 && diffDays <= 45) detailValue = 'Monthly'
      else if (diffDays !== null && diffDays >= 300) detailValue = 'Annual'
      else detailValue = 'Annual'
    }
  } else if (request.extraFields?.warrantyPeriod) {
    detailValue = request.extraFields.warrantyPeriod
  }

  const warranty = detailValue

  // Extract category detail / extra field dynamically if provided
  const extraFieldKey = catConfig?.extraFieldKey
  const extraFieldLabel = catConfig?.extraFieldLabel || 'Detail'
  const extraFieldValue =
    (extraFieldKey && request.extraFields?.[extraFieldKey]) ||
    (request as any)[extraFieldKey || ''] ||
    (request.extraFields && Object.keys(request.extraFields).length > 0 ? Object.values(request.extraFields)[0] : null) ||
    null

  const hasQuantity = request.quantity !== undefined && request.quantity !== null && (request.quantity as any) !== ''
  const quantity = hasQuantity ? request.quantity : '—'
  const quantityNum = typeof quantity === 'number' ? quantity : parseInt(String(quantity), 10) || 1
  const quantityLabel = catConfig?.quantityLabel || 'Quantity'

  const requiredByDate = request.requiredBy ? formatDate(request.requiredBy) : '—'

  const deliveryLocation = request.deliveryLocation || '—'
  const preferredVendor = (request as any).preferredVendor || request.vendor || '—'
  const justification = request.justification || '—'
  const description = request.description || request.title || '—'

  // Product specifications breakdown
  const getProductDetails = () => {
    const t = (request.title + ' ' + (request.category || '')).toLowerCase()
    const warrantyDisplay = extraFieldValue && extraFieldKey === 'warrantyPeriod' ? String(extraFieldValue) : 'Standard'
    if (t.includes('laptop') || t.includes('macbook')) {
      return {
        modelName: 'Apple MacBook Pro 14" M3 Pro / Dell Latitude Enterprise Workstation',
        partNumber: 'SKU-HW-LPT-2026-09',
        technicalSpecs: 'Apple M3 Pro / Intel Core i9, 32GB Unified RAM, 1TB NVMe PCIe Gen4 SSD, Liquid Retina XDR Display, 70W Fast Charger.',
        unitPrice: Math.round(request.amount / quantityNum),
        warrantyTerms: `${warrantyDisplay} Enterprise OEM Onsite Support with priority coverage`,
        certifications: 'RoHS, EnergyStar, ISO 27001 Security Compliant',
        deliveryTimeline: '3 to 5 Business Days upon PO Issuance',
      }
    }
    if (t.includes('server')) {
      return {
        modelName: 'Dell PowerEdge R760 2U Rack Server Dual Intel Xeon',
        partNumber: 'SKU-SRV-R760-2026',
        technicalSpecs: '2x Intel Xeon Gold 6430 (64 Cores), 128GB DDR5 ECC Registered RAM, 4x 3.84TB Enterprise NVMe SSD in RAID 10, Dual 1100W Redundant Titanium PSUs.',
        unitPrice: Math.round(request.amount / quantityNum),
        warrantyTerms: `${warrantyDisplay} Mission-Critical ProSupport with Onsite Response`,
        certifications: 'Tier-4 Datacenter Certified, CE, FCC, UL',
        deliveryTimeline: '7 to 10 Business Days',
      }
    }
    if (t.includes('monitor') || t.includes('display')) {
      return {
        modelName: 'Dell UltraSharp 32" 4K USB-C Hub Monitor (U3223QE)',
        partNumber: 'SKU-MON-U32-2026',
        technicalSpecs: 'IPS Black Technology, 4K UHD 3840x2160 @ 60Hz, 90W USB-C Power Delivery, Built-in KVM Switch & RJ45 Ethernet Port.',
        unitPrice: Math.round(request.amount / quantityNum),
        warrantyTerms: `${warrantyDisplay} Advanced Exchange Service & Premium Panel Guarantee`,
        certifications: 'TCO Certified Displays 9.0, EPEAT Gold',
        deliveryTimeline: '2 to 4 Business Days',
      }
    }
    if (isSoft || t.includes('software') || t.includes('saas') || t.includes('cloud')) {
      return {
        modelName: (request as any).softwareName || 'Enterprise SaaS Multi-Seat Production License & Cloud Capacity',
        partNumber: 'SKU-SW-CORP-2026',
        technicalSpecs: 'Dedicated Tenant Deployment, SSO/SAML 2.0 Integration, 99.99% Uptime SLA, Audit Logging, Automated Daily Encrypted Backups.',
        unitPrice: Math.round(request.amount / quantityNum),
        warrantyTerms: `${warrantyDisplay} 24x7 Premium Enterprise Technical SLA Support with Dedicated Account Manager`,
        certifications: 'SOC 2 Type II, ISO 27001, GDPR, HIPAA Certified',
        deliveryTimeline: 'Instant Digital Provisioning within 2 Hours of Finance Clearance',
      }
    }
    return {
      modelName: `${request.title} — Commercial Enterprise Specification`,
      partNumber: `SKU-COMM-${request.id}`,
      technicalSpecs: `Commercial grade deployment specifications certified for ${request.department} operational infrastructure.`,
      unitPrice: Math.round(request.amount / quantityNum),
      warrantyTerms: `${warrantyDisplay} Comprehensive Enterprise Onsite Support`,
      certifications: 'Standard Commercial Standards & Regulatory Clearance',
      deliveryTimeline: '5 to 7 Business Days',
    }
  }

  const product = getProductDetails()
  const recInfo = request ? getRecommendationStatus(request) : null
  const rawSt = ((request as any).raw_status || request.status || '').toUpperCase()
  const st = (request.status || '').toLowerCase()
  // Authoritative approved check: based ONLY on the backend-returned raw_status / status.
  // Do NOT use currentStage, extra_fields content, approvedBy, or approval_history action strings
  // to infer approval — these fire incorrectly on pending renewals that inherit parent data.
  const isAlreadyApproved = Boolean(
    !request ? false :
    // For Manager portal: request is already approved if it moved past Manager Review
    rawSt === 'MANAGER_APPROVED' ||
    rawSt === 'FINANCE_APPROVED' ||
    rawSt === 'ADMIN_APPROVED' ||
    rawSt === 'PAYMENT_APPROVED' ||
    rawSt === 'PAYMENT_PROCESSED' ||
    rawSt === 'PAYMENT_JUSTIFICATION_SUBMITTED' ||
    rawSt === 'PAYMENT_JUSTIFIED' ||
    rawSt === 'MANAGER_VERIFIED' ||
    rawSt === 'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT' ||
    rawSt === 'TEAM_LEAD_ACKNOWLEDGED' ||
    rawSt === 'REQUEST_COMPLETED' ||
    rawSt === 'COMPLETED' ||
    rawSt === 'IN_PROCUREMENT' ||
    rawSt === 'RFQ_SENT' ||
    rawSt === 'QUOTES_RECEIVED' ||
    rawSt === 'DELIVERED' ||
    rawSt === 'INVOICED' ||
    rawSt === 'VERIFIED' ||
    rawSt === 'PAYMENT_COMPLETED' ||
    st === 'approved' ||
    st === 'manager_approved' ||
    st === 'finance_approved' ||
    st === 'admin_approved' ||
    st === 'payment_approved' ||
    st === 'payment_processed' ||
    st === 'payment_justification_submitted' ||
    st === 'payment_justified' ||
    st === 'manager_verified' ||
    st === 'manager_verified_pending_team_lead_acknowledgement' ||
    st === 'team_lead_acknowledged' ||
    st === 'request_completed' ||
    st === 'completed'
  )

  const isAlreadyRejected = Boolean(
    st === 'rejected' ||
    st === 'finance_rejected' ||
    rawSt.includes('REJECT') ||
    Boolean((request as any).extra_fields?.manager_rejected)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-8 animate-fadeIn">
        {/* Modal Header — Matches Image 1 */}
        <div className="px-8 pt-6 pb-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <PlusCircle className="text-blue-600 flex-shrink-0" size={28} />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">Create Purchase Request</h1>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                  {request.id}
                </span>
                {recInfo?.isRecommended ? (
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-2xs ${
                    recInfo.isRecommendedToAdmin
                      ? 'bg-purple-100 text-purple-950 border-purple-300'
                      : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                  }`}>
                    <ArrowUpRight size={11} /> {recInfo.statusLabel}
                  </span>
                ) : (
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
                      : String(request.status || '').replace(/_/g, ' ').toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Fill in request details for approval & procurement workflow.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Close Form"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Body — Exact 1:1 Layout from Image 1 */}
        <div className="p-8 space-y-4 text-xs max-h-[78vh] overflow-y-auto">
          {/* Recommendation Banner if present */}
          {recInfo?.isRecommended && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-2xs ${
              recInfo.isRecommendedToAdmin
                ? 'bg-purple-50 border-purple-300 text-purple-950'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg text-white flex items-center justify-center flex-shrink-0 shadow-xs ${
                  recInfo.isRecommendedToAdmin ? 'bg-purple-600' : 'bg-emerald-600'
                }`}>
                  <ArrowUpRight size={18} />
                </div>
                <div>
                  <span className="font-black text-sm">{recInfo.statusLabel}</span>
                  <p className="text-[11px] font-medium opacity-90 mt-0.5">
                    {recInfo.reason}
                  </p>
                  <p className="text-[10px] font-bold opacity-80 mt-1">
                    Source: {recInfo.portalName} ({recInfo.actorName}) • Date: {recInfo.date}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border ${
                recInfo.isRecommendedToAdmin
                  ? 'bg-purple-200 text-purple-950 border-purple-300'
                  : 'bg-emerald-200 text-emerald-950 border-emerald-300'
              }`}>
                {recInfo.shortBadgeLabel}
              </span>
            </div>
          )}

          {/* Tracking Progress Bar */}
          <div className="pb-2">
            <TrackingStepper
              requestId={request.id}
              category={request.category}
              title={request.title}
              status={request.raw_status || request.status}
              currentStage={request.currentStage}
              currentlyWith={request.currentlyWith || (request as any).currently_with}
              financeStatus={request.financeStatus}
              paymentStatus={request.paymentStatus}
              lastUpdated={request.date}
              history={request.history}
              approval_steps={(request as any).approval_steps}
              timeline={(request as any).timeline}
              rfqId={(request as any).rfqId || (request as any).rfq_id}
              poNumber={(request as any).poNumber || (request as any).po_number}
              grnNumber={(request as any).grnNumber || (request as any).grn_number}
              invoiceNumber={(request as any).invoiceNumber || (request as any).invoice_number || (request as any).invoiceDetails?.invoiceNumber}
              isVerified={(request as any).isVerified || (request as any).documentsVerified}
              documentsVerified={(request as any).documentsVerified}
            />
          </div>

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
              {detailLabel}
            </label>
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
              <label className="block font-bold text-gray-700 mb-1">5. {quantityLabel} *</label>
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
                                     request.rawRequest?.original_request || 
                                     request.rawRequest?.parent_request || 
                                     request.rawRequest?.original_request_id || 
                                     request.rawRequest?.parent_request_id

                      let root = allRequests.find((r: any) => 
                        (origId && (r.id === origId || r.request_id === origId || r.rawRequest?.id === origId))
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
                          root.total_estimated_cost,
                          root.requested_amount,
                          root.amount,
                          root.approved_amount,
                          root.rawRequest?.total_estimated_cost,
                          root.rawRequest?.requested_amount,
                          root.rawRequest?.approved_amount
                        )
                        if (rootCost > 0) return rootCost
                      }
                    }

                    return check(
                      (request as any).original_estimated_cost,
                      request.rawRequest?.original_estimated_cost,
                      request.total_estimated_cost,
                      request.requested_amount,
                      request.amount,
                      (request as any).existing_cost,
                      request.extraFields?.original_estimated_cost,
                      request.extraFields?.existingCost,
                      request.extraFields?.payment_justification?.existing_cost,
                      request.rawRequest?.total_estimated_cost,
                      request.rawRequest?.requested_amount,
                      request.rawRequest?.existing_cost
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

          {/* ── Product Technical Details & Specifications Section ── */}
          <div className="mt-6 pt-5 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Package size={18} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-gray-900">
                Product Details & Technical Specifications
              </h3>
            </div>

            <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Product Item & Model
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{product.modelName}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Part / SKU Number
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    {product.partNumber}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Full Technical Specifications & Hardware / SaaS Architecture
                </span>
                <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed font-medium">
                  {product.technicalSpecs}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Unit Price</span>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">{fmt(product.unitPrice)} / unit</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Quantity Requested</span>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">{quantity} Units</p>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 block uppercase">Total Requisition Spend</span>
                  <p className="font-black text-emerald-900 text-sm mt-0.5">{fmt(request.amount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px]">
                <div className="flex items-center gap-2 text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                  <ShieldCheck size={14} className="text-blue-600 flex-shrink-0" />
                  <span><strong>{isSoft ? 'Subscription:' : 'Warranty / SLA:'}</strong> {product.warrantyTerms}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                  <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
                  <span><strong>Compliance:</strong> {product.certifications}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Software / SaaS Payment Justification Details (if submitted) */}
          {(request as any).extra_fields?.payment_justification && (() => {
            const j = (request as any).extra_fields.payment_justification
            const isVerified = (request as any).raw_status === 'PAYMENT_JUSTIFIED' || Boolean((request as any).extra_fields?.justification_verified_at)
            return (
              <div className="bg-violet-50/90 border border-violet-300 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-violet-200">
                  <span className="font-bold text-xs text-violet-950 flex items-center gap-1.5">
                    <FileText size={15} className="text-violet-600" />
                    Team Lead Payment Justification & Proofs
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isVerified ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {isVerified ? '✓ Verified' : 'Awaiting Manager Verification'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-violet-100">
                    <span className="text-[10px] text-violet-500 font-bold block uppercase">Software</span>
                    <span className="font-semibold text-slate-900">{j.software_name || request.title}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-violet-100">
                    <span className="text-[10px] text-violet-500 font-bold block uppercase">Plan</span>
                    <span className="font-semibold text-slate-900">{j.subscription_plan || '—'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-violet-100">
                    <span className="text-[10px] text-violet-500 font-bold block uppercase">Payment Ref</span>
                    <span className="font-mono font-bold text-violet-900">{j.payment_reference || '—'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-violet-100">
                    <span className="text-[10px] text-violet-500 font-bold block uppercase">Paid Amount</span>
                    <span className="font-black text-slate-900">₹{Number(j.payment_amount || request.amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                {j.business_justification && (
                  <div className="bg-white p-2.5 rounded-lg border border-violet-100 text-xs">
                    <span className="text-[10px] text-violet-500 font-bold block uppercase mb-0.5">Business Justification</span>
                    <p className="text-slate-700">{j.business_justification}</p>
                  </div>
                )}
                {j.proof_description && (
                  <div className="bg-white p-2.5 rounded-lg border border-violet-100 text-xs">
                    <span className="text-[10px] text-violet-500 font-bold block uppercase mb-0.5">Proof Description</span>
                    <p className="text-slate-700">{j.proof_description}</p>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Requester & Submission Metadata Footer Strip */}
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between text-xs text-slate-700 font-semibold gap-2">
            <span>👤 Requester: <b className="text-slate-950">{request.requester}</b></span>
            <span>📅 Submitted Date: <b className="text-slate-950">{formatDate(request.date)}</b></span>
            <span>🏢 Cost Center: <b className="text-indigo-900">{request.costCenter || `CC-${request.department?.toUpperCase().slice(0, 3)}-2026`}</b></span>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            Save as Draft / Close
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {isAlreadyApproved ? (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs">
                <CheckCircle size={15} className="text-emerald-600" /> Manager Sign-Off Completed
              </span>
            ) : isAlreadyRejected ? (
              <span className="text-xs font-bold text-rose-800 bg-rose-100 border border-rose-300 px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs">
                <XCircle size={15} className="text-rose-600" /> Request Disapproved
              </span>
            ) : (
              <>
                {onReject && (
                  <button
                    type="button"
                    onClick={() => onReject(request)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                )}
                {onRecommend && (
                  <button
                    type="button"
                    onClick={() => onRecommend(request)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    <ArrowUpRight size={14} /> {recommendLabel}
                  </button>
                )}
                {onApprove && (
                  <button
                    type="button"
                    onClick={() => onApprove(request)}
                    className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    <CheckCircle size={15} /> Approve Request
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
