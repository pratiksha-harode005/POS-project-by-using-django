import React, { useState, useEffect, useMemo } from 'react'
import { TrackingStepper } from '../../components/portal/TrackingStepper'
import { useProcurement, PurchaseRequest } from '../../context/ProcurementContext'
import { useAuth } from '../../context/AuthContext'
import { RequestTypeFilter } from '../../components/portal/RequestTypeFilter'
import { isSoftwareRequest, isHardwareRequest, sortRequestsNewestFirst, getRecommendationStatus } from '../../utils/workflowUtils'
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
  CheckCircle2,
  Upload,
  Download,
  Package,
  CreditCard,
  FileText,
  Zap,
  ShieldCheck,
  Building,
  DollarSign,
  Briefcase,
  HelpCircle,
  Receipt,
  ArrowUpRight,
  Landmark,
  QrCode,
  Coins,
} from 'lucide-react'
import { UnifiedReceiptModal } from '../../components/portal/UnifiedReceiptModal'
import { useLocation } from 'react-router-dom'
import { isFlowBCategory } from '../../components/portal/TrackingStepper'
import { getStoredDeliveryDocs } from '../vendor/VendorPortalPages'
import { confirmTeamLeadRequest, mockPaymentApi, submitPaymentJustificationApi, acknowledgeRequestApi, renewRequestApi, upgradeRequestApi } from '../../api/teamleadApi'
import { triggerGlobalDataSync } from '../../utils/syncUtils'
import {
  CATEGORIES,
  SUBCATEGORIES_BY_CATEGORY,
} from './CreateRequestPage'
import { formatDate, formatDateTime } from '../../utils/formatDate'

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

const CATEGORY_CONFIGS: Record<string, { quantityLabel?: string; hideQuantity?: boolean; extraFieldKey?: string; extraFieldLabel?: string; extraFieldOptions?: string[]; hideDeliveryLocation?: boolean }> = {
  'Software & SaaS': { hideQuantity: true, extraFieldKey: 'renewalCycle', extraFieldLabel: 'Renewal Cycle', extraFieldOptions: ['Monthly', 'Yearly'], hideDeliveryLocation: true },
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

// ─── Payment Justification Details Display (7 Sections Read-Only View) ────────
export const PaymentJustificationDetailsDisplay: React.FC<{ req: PurchaseRequest }> = ({ req }) => {
  const detail = (req as any).payment_justification_detail || {}
  const extraJust = (req as any).extra_fields?.payment_justification || (req as any).extraFields?.payment_justification || {}

  const softwareName = detail.software_name || extraJust.software_name || (req as any).software_name || req.title
  const vendorName = detail.vendor_name || extraJust.vendor_name || req.preferredVendor || (req as any).vendor || '—'

  const rawPt = detail.purchase_type || extraJust.purchase_type || (req as any).extra_fields?.purchase_type || (req as any).extraFields?.purchase_type || (req as any).request_type || (req as any).request_operation || ''
  const normalizePt = (v: string): string => {
    const s = (v || '').trim().toUpperCase()
    if (s === 'RENEWAL' || s.includes('RENEW')) return 'Renewal'
    if (s === 'UPGRADE' || s.includes('UPGRADE')) return 'Upgrade'
    if (s === 'NEW' || s.includes('NEW')) return 'New Purchase'
    return v || '—'
  }
  const purchaseType = normalizePt(rawPt)

  const rawRenewalCycle = (req as any).extra_fields?.renewalCycle || (req as any).extraFields?.renewalCycle || (req as any).renewalCycle
  const startDate = detail.start_date || extraJust.start_date || (req as any).extra_fields?.start_date || (req as any).extraFields?.start_date || '—'
  const endDate = detail.end_date || extraJust.end_date || (req as any).extra_fields?.end_date || (req as any).extraFields?.end_date || '—'

  const resolveSubscriptionType = (): string => {
    // 1. Direct saved DB / extra fields subscription_type
    const rawSub = detail.subscription_type || extraJust.subscription_type || (req as any).extra_fields?.subscription_type || (req as any).extraFields?.subscription_type || (req as any).subscription_type
    if (rawSub) {
      const s = String(rawSub).trim().toLowerCase()
      if (s.includes('one')) return 'One-Time'
      if (s.includes('year') || s.includes('annual')) return 'Annual'
      if (s.includes('month')) return 'Monthly'
      return rawSub
    }
    // 2. Renewal cycle selected in Create Request (e.g. Monthly, Yearly)
    if (rawRenewalCycle) {
      const s = String(rawRenewalCycle).trim().toLowerCase()
      if (s.includes('one')) return 'One-Time'
      if (s.includes('year') || s.includes('annual')) return 'Annual'
      if (s.includes('month')) return 'Monthly'
    }
    // 3. Fallback: If start and end dates are provided, calculate real difference in days
    if (startDate !== '—' && endDate !== '—') {
      try {
        const d1 = new Date(startDate)
        const d2 = new Date(endDate)
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays > 0 && diffDays <= 45) return 'Monthly'
        if (diffDays >= 300) return 'Annual'
      } catch {}
    }
    return 'Monthly'
  }
  const subscriptionType = resolveSubscriptionType()
  const usersLicenses = detail.users_licenses || extraJust.users_licenses || String(req.quantity || (req as any).extra_fields?.users_licenses || (req as any).extraFields?.users_licenses || 1)
  const planEdition = detail.plan_edition || extraJust.subscription_plan || (req as any).required_plan || (req as any).current_plan || (req as any).extra_fields?.requiredPlan || (req as any).extraFields?.requiredPlan || (req as any).extra_fields?.currentPlan || 'NA'

  const reqAmt = Number(detail.requested_amount || (req as any).requested_amount || req.estimatedCost || 0)
  const mgrAmt = Number(detail.manager_approved_amount || (req as any).approved_amount || req.estimatedCost || 0)
  const finAmt = Number(detail.finance_approved_amount || req.finance_approved_amount || (req as any).approved_amount || req.estimatedCost || 0)
  const actualAmt = Number(detail.actual_purchase_amount || extraJust.payment_amount || finAmt)
  const gstTax = Number(detail.gst_tax || 0)
  const discount = Number(detail.discount || 0)
  const finalPayable = Number(detail.final_payable_amount || extraJust.payment_amount || (actualAmt + gstTax - discount))

  const whyRequired = detail.why_required || extraJust.business_justification || req.justification || '—'
  const businessPurpose = detail.business_purpose || (req as any).business_requirement || req.description || '—'
  const whoWillUse = detail.who_will_use || `${req.department || 'Engineering'} Team`
  const expectedBenefits = detail.expected_benefits || '—'
  const impactIfNotPurchased = detail.impact_if_not_purchased || '—'
  const urgency = detail.urgency || req.priority || 'Medium'
  const requiredByDate = detail.required_by_date || req.requiredBy || '—'

  const vendorContact = detail.vendor_contact || '—'
  const quoteNumber = detail.quote_number || '—'
  const purchaseDate = detail.purchase_date || extraJust.payment_date || '—'
  const poNumber = detail.po_number || req.poRef || '—'
  const purchaseUrl = detail.purchase_url || '—'
  const selectedPlan = detail.selected_plan || planEdition
  const purchaseRemarks = detail.purchase_remarks || '—'

  const paymentMethod = detail.payment_method || (req as any).payment_method || 'Corporate Card'
  const paymentRef = detail.payment_reference || extraJust.payment_reference || (req as any).payment_reference || '—'
  const paymentDate = detail.payment_date || extraJust.payment_date || (req as any).payment_date || '—'
  const paymentStatus = detail.payment_status || (req as any).payment_status || 'Paid'

  const teamLeadName = detail.team_lead_name || extraJust.submitted_by || 'Team Lead'
  const submittedAt = detail.submitted_at || extraJust.submitted_at || '—'
  const commentsRemarks = detail.comments_remarks || extraJust.proof_description || '—'

  return (
    <div className="mb-4 p-4 bg-white border-2 border-violet-200 rounded-2xl shadow-sm text-xs space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-violet-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold shadow">
            <FileText size={18} />
          </div>
          <div>
            <h4 className="font-bold text-violet-950 text-sm">Payment Justification Dossier</h4>
            <p className="text-[11px] text-violet-600">Submitted by {teamLeadName} on {submittedAt ? new Date(submittedAt).toLocaleDateString('en-IN') : '—'}</p>
          </div>
        </div>
        <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-violet-100 text-violet-800 border border-violet-300">
          7-Section Verified Record
        </span>
      </div>

      {/* 1. Request Details */}
      <div className="space-y-1.5">
        <h5 className="font-bold text-violet-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" /> 1. Request Details (Auto-Filled)
        </h5>
        <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Request ID</span>
              <span className="font-mono font-bold text-violet-900 text-xs truncate block">{req.id}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Title</span>
              <span className="font-semibold text-slate-800 text-xs truncate block" title={req.title}>{req.title}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Requester</span>
              <span className="font-semibold text-slate-800 text-xs truncate block">{(req as any).created_by_detail?.first_name || (req as any).requester?.name || 'Team Lead'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Department</span>
              <span className="font-semibold text-slate-800 text-xs truncate block">{req.department}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Manager</span>
              <span className="font-semibold text-slate-800 text-xs truncate block">{(req as any).assigned_manager_detail?.first_name || 'Dept Manager'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Current Status</span>
              <span className="font-bold text-violet-700 text-xs truncate block">{req.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Software / SaaS Details */}
      <div className="space-y-1.5">
        <h5 className="font-bold text-violet-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" /> 2. Software / SaaS Details
        </h5>
        <div className="bg-violet-50/50 p-3 rounded-2xl border border-violet-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white p-2.5 rounded-xl border border-violet-100 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Software Name</span>
              <span className="font-bold text-slate-900 text-xs truncate block">{softwareName}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-violet-100 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Vendor</span>
              <span className="font-semibold text-slate-900 text-xs truncate block">{vendorName}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-violet-100 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Purchase Type</span>
              <span className="font-semibold text-slate-900 text-xs truncate block">{purchaseType}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-violet-100 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Subscription</span>
              <span className="font-semibold text-slate-900 text-xs truncate block">{subscriptionType}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-violet-100 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Users / Licenses</span>
              <span className="font-semibold text-slate-900 text-xs truncate block">{usersLicenses}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-violet-100 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Start Date</span>
              <span className="font-semibold text-slate-900 text-xs font-mono truncate block">{startDate}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-violet-100 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">End Date</span>
              <span className="font-semibold text-slate-900 text-xs font-mono truncate block">{endDate}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-violet-100 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Plan / Edition</span>
              <span className="font-semibold text-slate-900 text-xs truncate block">{planEdition}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Financial Breakdown */}
      <div className="space-y-1.5">
        <h5 className="font-bold text-violet-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> 3. Financial Breakdown (PostgreSQL Verified)
        </h5>
        <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
              <span className="text-[9px] uppercase text-emerald-800 font-bold block mb-0.5">Requested</span>
              <span className="font-semibold text-slate-700 text-xs block">₹{reqAmt.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
              <span className="text-[9px] uppercase text-emerald-800 font-bold block mb-0.5">Mgr Appr</span>
              <span className="font-semibold text-slate-700 text-xs block">₹{mgrAmt.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
              <span className="text-[9px] uppercase text-emerald-800 font-bold block mb-0.5">Fin Appr</span>
              <span className="font-semibold text-slate-700 text-xs block">₹{finAmt.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
              <span className="text-[9px] uppercase text-emerald-800 font-bold block mb-0.5">Actual Purchase</span>
              <span className="font-bold text-slate-900 text-xs block">₹{actualAmt.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
              <span className="text-[9px] uppercase text-emerald-800 font-bold block mb-0.5">GST / Tax</span>
              <span className="font-semibold text-slate-800 text-xs block">₹{gstTax.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
              <span className="text-[9px] uppercase text-emerald-800 font-bold block mb-0.5">Discount</span>
              <span className="font-semibold text-emerald-700 text-xs block">-₹{discount.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-emerald-600 text-white p-2.5 rounded-xl font-bold flex flex-col justify-center shadow">
              <span className="text-[8px] uppercase block opacity-90">Final Payable</span>
              <span className="text-xs font-black">₹{finalPayable.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Business Justification */}
      <div className="space-y-1.5">
        <h5 className="font-bold text-violet-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" /> 4. Business Justification
        </h5>
        <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Why Required</span>
              <p className="text-gray-800 font-medium text-xs leading-relaxed">{whyRequired}</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Business Purpose</span>
              <p className="text-gray-800 font-medium text-xs leading-relaxed">{businessPurpose}</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Who Will Use</span>
              <p className="text-gray-800 font-medium text-xs">{whoWillUse}</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Expected Benefits</span>
              <p className="text-gray-800 font-medium text-xs">{expectedBenefits}</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Impact If Not Purchased</span>
              <p className="text-gray-800 font-medium text-xs">{impactIfNotPurchased}</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Urgency</span>
                <span className="font-bold text-amber-700 text-xs">{urgency}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Required By Date</span>
                <span className="font-semibold text-gray-800 text-xs font-mono">{requiredByDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Vendor & Purchase Details */}
      <div className="space-y-1.5">
        <h5 className="font-bold text-violet-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" /> 5. Vendor & Purchase Details
        </h5>
        <div className="bg-violet-50/50 p-3 rounded-2xl border border-violet-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white p-2.5 rounded-xl border border-violet-100 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Vendor Contact</span>
              <span className="font-semibold text-slate-900 text-xs truncate block">{vendorContact}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-violet-100 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Quote Number</span>
              <span className="font-mono font-semibold text-slate-900 text-xs truncate block">{quoteNumber}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-violet-100 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Purchase Date</span>
              <span className="font-semibold text-slate-900 text-xs font-mono truncate block">{purchaseDate}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-violet-100 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">PO Number</span>
              <span className="font-mono font-semibold text-slate-900 text-xs truncate block">{poNumber}</span>
            </div>
            {purchaseUrl !== '—' && (
              <div className="col-span-2 bg-white p-2.5 rounded-xl border border-violet-100 shadow-2xs">
                <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Purchase URL</span>
                <a href={purchaseUrl} target="_blank" rel="noreferrer" className="text-violet-600 underline font-semibold text-xs truncate block">{purchaseUrl}</a>
              </div>
            )}
            <div className={`${purchaseUrl !== '—' ? 'col-span-2' : 'col-span-2 sm:col-span-4'} bg-white p-2.5 rounded-xl border border-violet-100 shadow-2xs`}>
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Remarks</span>
              <span className="font-semibold text-slate-900 text-xs truncate block">{purchaseRemarks}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Payment & Documents */}
      <div className="space-y-2 pt-1">
        <h5 className="font-bold text-violet-700 uppercase text-[10px] tracking-wider flex items-center gap-1.5 mb-2">
          <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" /> 6. PAYMENT & DOCUMENT PROOFS
        </h5>
        
        <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Payment Method</span>
              <span className="font-medium text-slate-900 text-xs">{paymentMethod}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Payment Reference</span>
              <span className="font-mono font-bold text-indigo-950 text-xs truncate block">{paymentRef}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Payment Date</span>
              <span className="font-medium text-slate-900 text-xs font-mono">{paymentDate}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Status</span>
              <span className="font-bold text-emerald-700 text-xs">{paymentStatus}</span>
            </div>
          </div>

          {/* Uploaded Documents */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {detail.quote_file_url ? (
              <a href={detail.quote_file_url} target="_blank" rel="noreferrer" className="px-3 py-2 bg-white border border-violet-200 hover:border-violet-400 rounded-xl flex items-center text-violet-700 font-semibold transition-all shadow-2xs text-[11px]">
                <FileText size={14} className="text-violet-600 mr-1.5" /> Vendor Quote ✓
              </a>
            ) : (
              <div className="px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-xl text-slate-400 flex items-center text-[11px] font-medium">Quote: Not uploaded</div>
            )}

            {detail.receipt_file_url ? (
              <a href={detail.receipt_file_url} target="_blank" rel="noreferrer" className="px-3 py-2 bg-white border border-emerald-400 hover:border-emerald-500 rounded-xl flex items-center text-emerald-700 font-semibold transition-all shadow-2xs text-[11px]">
                <CheckCircle2 size={14} className="text-emerald-500 mr-1.5" /> Payment Receipt ✓
              </a>
            ) : (
              <div className="px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-xl text-slate-400 flex items-center text-[11px] font-medium">Receipt: Reference logged</div>
            )}

            {detail.invoice_file_url && (
              <a href={detail.invoice_file_url} target="_blank" rel="noreferrer" className="px-3 py-2 bg-white border border-violet-200 hover:border-violet-400 rounded-xl flex items-center text-violet-700 font-semibold transition-all shadow-2xs text-[11px]">
                <FileText size={14} className="text-violet-600 mr-1.5" /> Invoice File ✓
              </a>
            )}

            {detail.supporting_doc_url && (
              <a href={detail.supporting_doc_url} target="_blank" rel="noreferrer" className="px-3 py-2 bg-white border border-violet-200 hover:border-violet-400 rounded-xl flex items-center text-violet-700 font-semibold transition-all shadow-2xs text-[11px]">
                <FileText size={14} className="text-violet-600 mr-1.5" /> Supporting Doc ✓
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 7. Team Lead Confirmation */}
      <div className="space-y-1.5">
        <h5 className="font-bold text-violet-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" /> 7. Team Lead Confirmation
        </h5>
        <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Team Lead Name</span>
              <span className="font-bold text-slate-900 text-xs">{teamLeadName}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase text-emerald-800 font-bold block mb-0.5">Verification Status</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1 text-xs"><CheckCircle size={14} /> Confirmation Verified &amp; Submitted</span>
              </div>
            </div>
          </div>
          {commentsRemarks !== '—' && (
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Remarks / Notes</span>
              <p className="text-gray-700 text-xs italic font-medium">"{commentsRemarks}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Software Payment Justification Form (Complete 7-Section Interactive Form) ──
const SoftwareJustificationForm: React.FC<{ req: PurchaseRequest }> = ({ req }) => {
  const { user } = useAuth()

  // 1. Request Details (Auto-filled read-only)
  const reqId = req.id
  const reqTitle = req.title
  const requesterName = (req as any).created_by_detail?.first_name
    ? `${(req as any).created_by_detail.first_name} ${(req as any).created_by_detail.last_name || ''}`.trim()
    : (req as any).requester?.name || user?.username || 'Team Lead'
  const departmentName = req.department || 'Engineering'
  const managerName = (req as any).assigned_manager_detail?.first_name
    ? `${(req as any).assigned_manager_detail.first_name} ${(req as any).assigned_manager_detail.last_name || ''}`.trim()
    : 'Department Manager'
  const currentStatus = req.status

  // 2. Software / SaaS Details & Create Request Auto-Fill
  const extraFields = (req as any).extra_fields || (req as any).extraFields || {}
  const rawRenewalCycle = extraFields.renewalCycle || extraFields.renewal_cycle || (req as any).renewalCycle || ''

  const isRenewalOrUpgrade = 
    (req as any).request_operation === 'RENEWAL' ||
    (req as any).request_operation === 'UPGRADE' ||
    (req as any).rawRequest?.request_operation === 'RENEWAL' ||
    (req as any).rawRequest?.request_operation === 'UPGRADE' ||
    (req.title || '').toLowerCase().startsWith('renewal:') ||
    (req.title || '').toLowerCase().startsWith('upgrade:') ||
    (req.title || '').toLowerCase().startsWith('renew:')

  const { requests: allRequests = [] } = useProcurement()

  const origKey = (req as any).original_request || 
                  (req as any).parent_request || 
                  (req as any).rawRequest?.original_request || 
                  (req as any).rawRequest?.parent_request || 
                  (req as any).rawRequest?.original_request_id || 
                  (req as any).rawRequest?.parent_request_id

  const parentReq = allRequests.find((cand: any) => 
    (origKey && (cand.id === origKey || cand.request_id === origKey || (cand as any).rawRequest?.id === origKey)) ||
    (req.title && cand.id !== req.id && cand.title && cand.title.toLowerCase().trim() === req.title.replace(/^(renewal|upgrade|renew):\s*/i, '').trim().toLowerCase())
  )

  const origPj: any = 
    (req as any).original_payment_justification ||
    (req as any).payment_justification_detail ||
    (parentReq as any)?.payment_justification_detail ||
    (parentReq as any)?.extra_fields?.payment_justification ||
    (parentReq as any)?.extra_fields?.original_payment_justification ||
    (parentReq as any)?.extraFields?.payment_justification ||
    (parentReq as any)?.extraFields?.original_payment_justification ||
    extraFields.payment_justification ||
    extraFields.original_payment_justification ||
    {}

  // Derive initial subscription type from request creation or original justification
  const initialSubscriptionType = (() => {
    // 1. Existing payment justification saved in DB / origPj
    const pjSub = origPj.subscription_type || (req as any).payment_justification_detail?.subscription_type || extraFields.payment_justification?.subscription_type || extraFields.subscription_type
    if (pjSub) {
      const s = String(pjSub).trim().toLowerCase()
      if (s.includes('one')) return 'One-Time'
      if (s.includes('year') || s.includes('annual')) return 'Annual'
      if (s.includes('month')) return 'Monthly'
    }
    // 2. If renewalCycle was specified during create request, prioritize it
    if (rawRenewalCycle) {
      const rc = String(rawRenewalCycle).trim().toLowerCase()
      if (rc.includes('one')) return 'One-Time'
      if (rc.includes('year') || rc.includes('annual')) return 'Annual'
      if (rc.includes('month')) return 'Monthly'
    }
    // 3. Date duration check if start and end dates already exist
    const s = origPj.start_date || extraFields.start_date || (req as any).start_date
    const e = origPj.end_date || extraFields.end_date || (req as any).end_date
    if (s && e) {
      const diff = (new Date(e).getTime() - new Date(s).getTime()) / (1000 * 60 * 60 * 24)
      if (diff > 0 && diff <= 45) return 'Monthly'
      if (diff >= 300) return 'Annual'
    }
    return 'Annual'
  })()

  // Normalize date string to standard HTML5 YYYY-MM-DD
  const normalizeDateToYMD = (dStr: any): string => {
    if (!dStr) return new Date().toISOString().split('T')[0]
    const s = String(dStr).trim()
    if (s.includes('T')) return s.split('T')[0]
    if (s.includes('-')) {
      const parts = s.split('-').map(Number)
      if (parts.length === 3 && !parts.some(isNaN)) {
        if (parts[0] > 1000) {
          // YYYY-MM-DD
          return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`
        } else {
          // DD-MM-YYYY
          return `${parts[2]}-${String(parts[1]).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}`
        }
      }
    }
    try {
      const d = new Date(s)
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    } catch {}
    return new Date().toISOString().split('T')[0]
  }

  // Calculate End Date based on Start Date and Subscription Type:
  // - Annual -> Start Date + 1 year
  // - Monthly -> Start Date + 1 month
  // - One-Time -> Keep manually entered End Date
  // - Never set End Date equal to Start Date.
  const calcEndDate = (start: string, cycle: string, existingEnd?: string) => {
    if (!start) return ''
    try {
      let year: number, month: number, day: number
      if (start.includes('-')) {
        const parts = start.split('-').map(Number)
        if (parts.length === 3 && !parts.some(isNaN)) {
          if (parts[0] > 1000) {
            // YYYY-MM-DD
            year = parts[0]
            month = parts[1]
            day = parts[2]
          } else {
            // DD-MM-YYYY
            day = parts[0]
            month = parts[1]
            year = parts[2]
          }
        } else {
          const d = new Date(start)
          if (isNaN(d.getTime())) return ''
          year = d.getFullYear()
          month = d.getMonth() + 1
          day = d.getDate()
        }
      } else {
        const d = new Date(start)
        if (isNaN(d.getTime())) return ''
        year = d.getFullYear()
        month = d.getMonth() + 1
        day = d.getDate()
      }

      if (cycle === 'Annual') {
        // Start Date + 1 year (e.g. 2026-10-02 -> 2027-10-02)
        const targetYear = year + 1
        const d = new Date(targetYear, month - 1, day)
        if (month === 2 && day === 29 && d.getMonth() !== 1) {
          return `${targetYear}-02-28`
        }
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const dt = String(d.getDate()).padStart(2, '0')
        const res = `${y}-${m}-${dt}`
        return res === start ? `${targetYear + 1}-${m}-${dt}` : res
      } else if (cycle === 'Monthly') {
        // Start Date + 1 month (e.g. 2026-10-02 -> 2026-11-02)
        let targetYear = year
        let targetMonth = month + 1
        if (targetMonth > 12) {
          targetYear += 1
          targetMonth = 1
        }
        const lastDayOfTargetMonth = new Date(targetYear, targetMonth, 0).getDate()
        const targetDay = Math.min(day, lastDayOfTargetMonth)
        const res = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
        return res === start ? `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay + 1).padStart(2, '0')}` : res
      } else if (cycle === 'One-Time') {
        // One-Time: Keep manually entered End Date unless it's equal to start date
        if (existingEnd && existingEnd !== start) {
          return existingEnd
        }
        // Default to +1 month so End Date !== Start Date
        let targetYear = year
        let targetMonth = month + 1
        if (targetMonth > 12) {
          targetYear += 1
          targetMonth = 1
        }
        const lastDayOfTargetMonth = new Date(targetYear, targetMonth, 0).getDate()
        const targetDay = Math.min(day, lastDayOfTargetMonth)
        return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
      }
      return ''
    } catch {
      return ''
    }
  }

  const initialStartDate = normalizeDateToYMD(
    (isRenewalOrUpgrade && origPj.end_date ? origPj.end_date : '') ||
    origPj.start_date ||
    extraFields.start_date ||
    (req as any).start_date ||
    (req as any).payment_justification_detail?.start_date
  )
  const rawSavedEndDate = (
    origPj.end_date ||
    extraFields.end_date ||
    (req as any).end_date ||
    (req as any).payment_justification_detail?.end_date ||
    ''
  )
  const initialEndDate = (() => {
    // Annual and Monthly: ALWAYS calculate automatically from initialStartDate
    if (initialSubscriptionType === 'Annual') {
      return calcEndDate(initialStartDate, 'Annual')
    }
    if (initialSubscriptionType === 'Monthly') {
      return calcEndDate(initialStartDate, 'Monthly')
    }
    if (initialSubscriptionType === 'One-Time') {
      const normalizedSaved = rawSavedEndDate ? normalizeDateToYMD(rawSavedEndDate) : ''
      if (normalizedSaved && normalizedSaved !== initialStartDate) {
        return normalizedSaved
      }
      return calcEndDate(initialStartDate, 'One-Time')
    }
    return calcEndDate(initialStartDate, 'Annual')
  })()

  const initialPurchaseType = (() => {
    const raw = (req as any).request_type || (req as any).request_operation || extraFields.requestType || extraFields.purchase_type || ''
    const s = String(raw).trim().toUpperCase()
    if (s.includes('RENEW')) return 'Renewal'
    if (s.includes('UPGRADE')) return 'Upgrade'
    return 'New Purchase'
  })()

  const [softwareName, setSoftwareName] = useState(
    origPj.software_name ||
    (parentReq as any)?.software_name ||
    (req as any).software_name ||
    extraFields.subscriptionServiceName ||
    req.title?.replace(/^(renewal|upgrade|renew):\s*/i, '') ||
    ''
  )
  const [vendorName, setVendorName] = useState(
    origPj.vendor_name ||
    (parentReq as any)?.preferredVendor ||
    (parentReq as any)?.vendor ||
    req.preferredVendor ||
    (req as any).vendor ||
    extraFields.preferredVendor ||
    ''
  )
  const [purchaseType, setPurchaseType] = useState(initialPurchaseType)
  const [subscriptionType, setSubscriptionType] = useState(initialSubscriptionType)
  const [usersLicenses, setUsersLicenses] = useState(
    String(origPj.users_licenses || (parentReq as any)?.quantity || req.quantity || extraFields.users_licenses || 1)
  )
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)

  // Automatically calculate and update End Date whenever Start Date or Subscription Type changes
  useEffect(() => {
    if (!startDate) return
    const normalizedStart = normalizeDateToYMD(startDate)
    if (subscriptionType === 'Annual') {
      setEndDate(calcEndDate(normalizedStart, 'Annual'))
    } else if (subscriptionType === 'Monthly') {
      setEndDate(calcEndDate(normalizedStart, 'Monthly'))
    } else if (subscriptionType === 'One-Time') {
      if (!endDate || endDate === normalizedStart) {
        setEndDate(calcEndDate(normalizedStart, 'One-Time'))
      }
    }
  }, [startDate, subscriptionType])

  const [planEdition, setPlanEdition] = useState(
    origPj.plan_edition ||
    origPj.selected_plan ||
    (parentReq as any)?.required_plan ||
    (parentReq as any)?.current_plan ||
    (req as any).required_plan ||
    (req as any).current_plan ||
    extraFields.requiredPlan ||
    extraFields.currentPlan ||
    (req as any).payment_justification_detail?.plan_edition ||
    'Standard'
  )

  // 3. Financial Details
  const requestedAmount = req.estimatedCost || (req as any).requested_amount || (parentReq as any)?.estimatedCost || 0
  const managerApprovedAmount = (req as any).approved_amount || (parentReq as any)?.approved_amount || requestedAmount
  const financeApprovedAmount = (req as any).finance_approved_amount || (req as any).approved_amount || requestedAmount

  const [actualPurchaseAmount, setActualPurchaseAmount] = useState<number | string>(
    origPj.actual_purchase_amount ||
    origPj.final_payable_amount ||
    origPj.requested_amount ||
    financeApprovedAmount ||
    managerApprovedAmount ||
    requestedAmount ||
    2000
  )
  const [gstTax, setGstTax] = useState<number | string>(origPj.gst_tax !== undefined ? origPj.gst_tax : 0)
  const [discount, setDiscount] = useState<number | string>(origPj.discount !== undefined ? origPj.discount : 0)

  const numericActual = Number(actualPurchaseAmount) || 0
  const numericGst = Number(gstTax) || 0
  const numericDiscount = Number(discount) || 0
  const finalPayableAmount = Math.max(0, numericActual + numericGst - numericDiscount)

  // 4. Business Justification (Auto-filled from Request / Original Request)
  const [whyRequired, setWhyRequired] = useState(
    origPj.why_required ||
    (parentReq as any)?.justification ||
    req.justification ||
    extraFields.businessRequirement ||
    extraFields.justification ||
    (isRenewalOrUpgrade ? 'Continued operational requirement and uninterrupted subscription access for team productivity.' : '')
  )
  const [businessPurpose, setBusinessPurpose] = useState(
    origPj.business_purpose ||
    (parentReq as any)?.business_requirement ||
    (parentReq as any)?.description ||
    (parentReq as any)?.justification ||
    (req as any).business_requirement ||
    extraFields.businessRequirement ||
    req.description ||
    req.justification ||
    (isRenewalOrUpgrade ? 'Department software license for core team operations and ongoing workflows.' : '')
  )
  const [whoWillUse, setWhoWillUse] = useState(
    origPj.who_will_use || `${departmentName} Team`
  )
  const [expectedBenefits, setExpectedBenefits] = useState(
    origPj.expected_benefits || (isRenewalOrUpgrade ? 'Uninterrupted access to essential tooling, automated security patches, and cloud data synchronisation.' : '')
  )
  const [impactIfNotPurchased, setImpactIfNotPurchased] = useState(
    origPj.impact_if_not_purchased || (isRenewalOrUpgrade ? 'Service interruption, loss of access to cloud infrastructure, and operational downtime for the team.' : '')
  )
  const [urgency, setUrgency] = useState(
    origPj.urgency || (parentReq as any)?.priority || req.priority || 'Medium'
  )
  const [requiredByDate, setRequiredByDate] = useState(
    origPj.required_by_date ? normalizeDateToYMD(origPj.required_by_date) : ((parentReq as any)?.requiredBy || req.requiredBy || (req as any).required_by || extraFields.requiredBy || new Date().toISOString().split('T')[0])
  )

  // 5. Vendor & Purchase Details
  const [vendorContact, setVendorContact] = useState(
    origPj.vendor_contact || (isRenewalOrUpgrade ? 'support@vendor.com' : '')
  )
  const [quoteNumber, setQuoteNumber] = useState(
    origPj.quote_number || (isRenewalOrUpgrade ? `QUOTE-RNW-${(req.request_id || req.id).toString().slice(-4)}` : '')
  )
  const [purchaseDate, setPurchaseDate] = useState(
    origPj.purchase_date ? normalizeDateToYMD(origPj.purchase_date) : new Date().toISOString().split('T')[0]
  )
  const [poNumber, setPoNumber] = useState(
    origPj.po_number || (parentReq as any)?.poRef || req.poRef || (isRenewalOrUpgrade ? `PO-${new Date().getFullYear()}-${(req.request_id || req.id).toString().slice(-4)}` : '')
  )
  const [purchaseUrl, setPurchaseUrl] = useState(
    origPj.purchase_url || (isRenewalOrUpgrade ? 'https://portal.vendor.com' : '')
  )
  const [selectedPlan, setSelectedPlan] = useState(
    origPj.selected_plan || origPj.plan_edition || planEdition
  )
  const [purchaseRemarks, setPurchaseRemarks] = useState(
    origPj.purchase_remarks || (isRenewalOrUpgrade ? `${initialPurchaseType} of existing active subscription license.` : '')
  )

  // 6. Payment & Documents
  const [paymentMethod, setPaymentMethod] = useState(
    origPj.payment_method || (req as any).payment_method || 'Corporate Card'
  )
  const [paymentReference, setPaymentReference] = useState(
    origPj.payment_reference || (req as any).payment_reference || (isRenewalOrUpgrade ? `TXN-RNW-${Date.now().toString().slice(-6)}` : '')
  )
  const [paymentDate, setPaymentDate] = useState(
    origPj.payment_date ? normalizeDateToYMD(origPj.payment_date) : ((req as any).payment_date ? normalizeDateToYMD((req as any).payment_date) : new Date().toISOString().split('T')[0])
  )
  const [paymentStatus] = useState('Paid')

  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [quoteFile, setQuoteFile] = useState<File | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [supportingDoc, setSupportingDoc] = useState<File | null>(null)
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({})

  // 7. Team Lead Confirmation
  const teamLeadName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : 'Team Lead'
  const submissionDate = new Date().toISOString().split('T')[0]
  const [commentsRemarks, setCommentsRemarks] = useState(
    origPj.comments_remarks || (isRenewalOrUpgrade ? `Payment completed for ${initialPurchaseType.toLowerCase()} of ${req.title}. All details verified from initial subscription.` : '')
  )
  const [confirmationChecked, setConfirmationChecked] = useState(isRenewalOrUpgrade ? true : false)

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleFileChange = (key: string, file: File | null) => {
    if (!file) {
      setFileErrors(prev => ({ ...prev, [key]: '' }))
      return
    }
    const maxBytes = 10 * 1024 * 1024 // 10MB
    const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx']
    const ext = file.name.split('.').pop()?.toLowerCase() || ''

    if (file.size > maxBytes) {
      setFileErrors(prev => ({ ...prev, [key]: `File '${file.name}' exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)` }))
      return
    }
    if (!allowed.includes(ext)) {
      setFileErrors(prev => ({ ...prev, [key]: `File type .${ext} not allowed. Supported: PDF, PNG, JPG, DOCX, XLSX` }))
      return
    }
    setFileErrors(prev => ({ ...prev, [key]: '' }))
  }

  const isFormValid = Boolean(
    softwareName.trim() &&
    vendorName.trim() &&
    (whyRequired.trim() || businessPurpose.trim()) &&
    paymentReference.trim() &&
    confirmationChecked &&
    !Object.values(fileErrors).some(Boolean)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmationChecked) {
      setErrorMsg('You must check the confirmation checkbox before submitting.')
      return
    }
    if (!paymentReference.trim()) {
      setErrorMsg('Payment Reference / Transaction ID is required.')
      return
    }
    if (Object.values(fileErrors).some(Boolean)) {
      setErrorMsg('Please fix file validation errors before submitting.')
      return
    }

    const effectiveEndDate = endDate || (startDate ? calcEndDate(startDate, subscriptionType) : '')
    if (startDate && effectiveEndDate && startDate === effectiveEndDate) {
      setErrorMsg('End Date cannot be equal to Start Date. Please select a later date.')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    try {
      const formData = new FormData()
      formData.append('software_name', softwareName)
      formData.append('vendor_name', vendorName)
      formData.append('purchase_type', purchaseType)
      formData.append('subscription_type', subscriptionType)
      formData.append('users_licenses', usersLicenses)
      if (startDate) formData.append('start_date', startDate)
      if (effectiveEndDate) formData.append('end_date', effectiveEndDate)
      formData.append('plan_edition', planEdition)

      formData.append('actual_purchase_amount', String(numericActual))
      formData.append('gst_tax', String(numericGst))
      formData.append('discount', String(numericDiscount))

      formData.append('why_required', whyRequired)
      formData.append('business_purpose', businessPurpose)
      formData.append('who_will_use', whoWillUse)
      formData.append('expected_benefits', expectedBenefits)
      formData.append('impact_if_not_purchased', impactIfNotPurchased)
      formData.append('urgency', urgency)
      if (requiredByDate) formData.append('required_by_date', requiredByDate)

      formData.append('vendor_contact', vendorContact)
      formData.append('quote_number', quoteNumber)
      if (purchaseDate) formData.append('purchase_date', purchaseDate)
      formData.append('po_number', poNumber)
      formData.append('purchase_url', purchaseUrl)
      formData.append('selected_plan', selectedPlan)
      formData.append('purchase_remarks', purchaseRemarks)

      formData.append('payment_method', paymentMethod)
      formData.append('payment_reference', paymentReference)
      if (paymentDate) formData.append('payment_date', paymentDate)
      formData.append('payment_status', paymentStatus)

      if (invoiceFile) formData.append('invoice_file', invoiceFile)
      if (quoteFile) formData.append('quote_file', quoteFile)
      if (receiptFile) formData.append('receipt_file', receiptFile)
      if (supportingDoc) formData.append('supporting_doc', supportingDoc)

      formData.append('comments_remarks', commentsRemarks)
      formData.append('confirmation_checked', 'true')

      // Legacy fallback fields
      formData.append('subscription_plan', planEdition)
      formData.append('business_justification', businessPurpose || whyRequired)
      formData.append('payment_amount', String(finalPayableAmount))
      formData.append('proof_description', commentsRemarks || 'Payment justification submitted with uploaded documents.')

      await submitPaymentJustificationApi(req.id, formData)
      // Removed blocking alert to allow seamless transition
      triggerGlobalDataSync('payment_justification_submitted')
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.error || e?.message || 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mb-4 p-5 bg-gradient-to-r from-violet-50 via-purple-50 to-violet-50 border-2 border-violet-300 rounded-2xl shadow-sm text-xs space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-violet-200">
        <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center flex-shrink-0 shadow">
          <FileText size={20} />
        </div>
        <div>
          <h4 className="font-bold text-violet-950 text-base">Payment Justification Form</h4>
          <p className="text-[11px] text-violet-700">Fill in the 7 required sections below to submit your payment proof and SaaS purchase details for Manager verification.</p>
        </div>
      </div>

      {isRenewalOrUpgrade && (
        <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-900 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h5 className="font-bold text-emerald-950 text-xs">Auto-Filled from Original Request</h5>
            <p className="text-[11px] text-emerald-800 font-medium">
              SaaS details, pricing, vendor info, business justification, and payment terms have been auto-populated from your initial subscription. You do not need to re-enter existing details.
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ================= SECTION 1: REQUEST DETAILS ================= */}
        <div className="bg-white p-3.5 rounded-xl border border-violet-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between pb-1">
            <h5 className="font-bold text-violet-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" /> 1. Request Details (Auto-Filled)
            </h5>
            <span className="text-[9px] uppercase font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Read-Only</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
              <span className="text-[9px] uppercase text-gray-500 font-bold block">Request ID</span>
              <span className="font-mono font-bold text-violet-900">{reqId}</span>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
              <span className="text-[9px] uppercase text-gray-500 font-bold block">Request Title</span>
              <span className="font-semibold text-gray-800 truncate block">{reqTitle}</span>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
              <span className="text-[9px] uppercase text-gray-500 font-bold block">Requester</span>
              <span className="font-semibold text-gray-800">{requesterName}</span>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
              <span className="text-[9px] uppercase text-gray-500 font-bold block">Department</span>
              <span className="font-semibold text-gray-800">{departmentName}</span>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
              <span className="text-[9px] uppercase text-gray-500 font-bold block">Manager</span>
              <span className="font-semibold text-gray-800">{managerName}</span>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
              <span className="text-[9px] uppercase text-gray-500 font-bold block">Current Status</span>
              <span className="font-bold text-violet-700">{currentStatus}</span>
            </div>
          </div>
        </div>

        {/* ================= SECTION 2: SOFTWARE / SaaS DETAILS ================= */}
        <div className="bg-white p-3.5 rounded-xl border border-violet-200 shadow-2xs space-y-3">
          <h5 className="font-bold text-violet-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" /> 2. Software / SaaS Details
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Software / SaaS Name *</label>
              <input className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-violet-400 outline-none" value={softwareName} onChange={e => setSoftwareName(e.target.value)} required />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Vendor *</label>
              <input className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-violet-400 outline-none" value={vendorName} onChange={e => setVendorName(e.target.value)} required />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Purchase Type</label>
              <select className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-violet-400 outline-none font-medium" value={purchaseType} onChange={e => setPurchaseType(e.target.value)}>
                <option value="New Purchase">New Purchase</option>
                <option value="Renewal">Renewal</option>
                <option value="Upgrade">Upgrade</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Subscription Type</label>
              <select
                className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-violet-400 outline-none font-semibold text-violet-950"
                value={subscriptionType}
                onChange={e => {
                  const newSub = e.target.value
                  setSubscriptionType(newSub)
                  if (startDate) {
                    if (newSub === 'Annual') {
                      setEndDate(calcEndDate(startDate, 'Annual'))
                    } else if (newSub === 'Monthly') {
                      setEndDate(calcEndDate(startDate, 'Monthly'))
                    } else if (newSub === 'One-Time') {
                      // One-Time: Keep manually entered End Date, or default if missing or equal to start date
                      if (!endDate || endDate === startDate) {
                        setEndDate(calcEndDate(startDate, 'One-Time'))
                      }
                    }
                  }
                }}
              >
                <option value="Annual">Annual</option>
                <option value="Monthly">Monthly</option>
                <option value="One-Time">One-Time</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Users / Licenses</label>
              <input className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-violet-400 outline-none" value={usersLicenses} placeholder="e.g. 1 License" onChange={e => setUsersLicenses(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Start Date</label>
              <input
                type="date"
                className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-violet-400 outline-none"
                value={startDate}
                onChange={e => {
                  const newStart = e.target.value
                  setStartDate(newStart)
                  if (newStart) {
                    if (subscriptionType === 'Annual') {
                      setEndDate(calcEndDate(newStart, 'Annual'))
                    } else if (subscriptionType === 'Monthly') {
                      setEndDate(calcEndDate(newStart, 'Monthly'))
                    } else if (subscriptionType === 'One-Time') {
                      if (!endDate || endDate === newStart) {
                        setEndDate(calcEndDate(newStart, 'One-Time'))
                      }
                    }
                  }
                }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase font-bold text-violet-700 block">End Date</label>
                {subscriptionType !== 'One-Time' ? (
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Auto ({subscriptionType === 'Annual' ? '+1 Year' : '+1 Month'})
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    Manual Entry
                  </span>
                )}
              </div>
              <input
                type="date"
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-violet-400 outline-none font-semibold ${
                  subscriptionType !== 'One-Time'
                    ? 'bg-violet-50/70 border-violet-300 text-violet-950 cursor-not-allowed'
                    : 'bg-white border-violet-200 text-slate-800'
                }`}
                value={endDate}
                readOnly={subscriptionType !== 'One-Time'}
                title={subscriptionType !== 'One-Time' ? `Automatically calculated from Start Date (${subscriptionType === 'Annual' ? '+1 year' : '+1 month'})` : 'Enter custom End Date'}
                min={startDate ? new Date(new Date(startDate).getTime() + 86400000).toISOString().split('T')[0] : undefined}
                onChange={e => {
                  if (subscriptionType === 'One-Time') {
                    const newEnd = e.target.value
                    if (startDate && newEnd && newEnd === startDate) {
                      alert('End Date cannot be equal to Start Date. Please select a later date.')
                      return
                    }
                    setEndDate(newEnd)
                  }
                }}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Plan / Edition</label>
              <input className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-violet-400 outline-none" value={planEdition} placeholder="e.g. Enterprise or NA" onChange={e => setPlanEdition(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ================= SECTION 3: FINANCIAL DETAILS ================= */}
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h5 className="font-bold text-emerald-950 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> 3. Financial Details (Fetched from PostgreSQL)
            </h5>
            <span className="text-[9px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">DB Verified</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
            <div>
              <span className="text-[9px] uppercase font-bold text-emerald-800 block">Requested Amount (Read-Only)</span>
              <span className="font-bold text-slate-800 text-sm">₹{Number(requestedAmount).toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-emerald-800 block">Manager Approved (Read-Only)</span>
              <span className="font-bold text-slate-800 text-sm">₹{Number(managerApprovedAmount).toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-emerald-800 block">Finance Approved (Read-Only)</span>
              <span className="font-bold text-emerald-900 text-sm">₹{Number(financeApprovedAmount).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            <div>
              <label className="text-[10px] uppercase font-bold text-emerald-800 block mb-1">Actual Purchase Amount (₹) *</label>
              <input type="number" step="0.01" className="w-full border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-bold text-slate-900 focus:ring-2 focus:ring-emerald-400 outline-none" value={actualPurchaseAmount} onChange={e => setActualPurchaseAmount(e.target.value)} required />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-emerald-800 block mb-1">GST / Tax (₹)</label>
              <input type="number" step="0.01" className="w-full border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-emerald-400 outline-none" value={gstTax} onChange={e => setGstTax(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-emerald-800 block mb-1">Discount (₹)</label>
              <input type="number" step="0.01" className="w-full border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-emerald-400 outline-none" value={discount} onChange={e => setDiscount(e.target.value)} />
            </div>
            <div className="bg-emerald-700 text-white p-2.5 rounded-xl font-bold flex flex-col justify-center shadow">
              <span className="text-[9px] uppercase block text-emerald-200">Final Payable Amount</span>
              <span className="text-base font-black">₹{finalPayableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* ================= SECTION 4: BUSINESS JUSTIFICATION ================= */}
        <div className="bg-white p-3.5 rounded-xl border border-violet-200 shadow-2xs space-y-3">
          <h5 className="font-bold text-violet-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" /> 4. Business Justification
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Why is this required? *</label>
              <textarea rows={2} className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white resize-none" value={whyRequired} onChange={e => setWhyRequired(e.target.value)} required />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Business Purpose *</label>
              <textarea rows={2} className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white resize-none" value={businessPurpose} onChange={e => setBusinessPurpose(e.target.value)} required />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Who will use it?</label>
              <input className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white" value={whoWillUse} onChange={e => setWhoWillUse(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Expected Benefits</label>
              <input className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white" value={expectedBenefits} placeholder="e.g. 30% productivity boost" onChange={e => setExpectedBenefits(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Impact if not purchased</label>
              <input className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white" value={impactIfNotPurchased} placeholder="e.g. Workflow delay" onChange={e => setImpactIfNotPurchased(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Urgency</label>
                <select className="w-full border border-violet-200 rounded-lg px-2 py-1.5 text-xs bg-white" value={urgency} onChange={e => setUrgency(e.target.value as any)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent / Critical</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Required By Date</label>
                <input type="date" className="w-full border border-violet-200 rounded-lg px-2 py-1.5 text-xs bg-white" value={requiredByDate} onChange={e => setRequiredByDate(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* ================= SECTION 5: VENDOR & PURCHASE DETAILS ================= */}
        <div className="bg-white p-3.5 rounded-xl border border-violet-200 shadow-2xs space-y-3">
          <h5 className="font-bold text-violet-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" /> 5. Vendor & Purchase Details
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Vendor Contact</label>
              <input className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white" value={vendorContact} placeholder="Email / Phone" onChange={e => setVendorContact(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Quote Number</label>
              <input className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono" value={quoteNumber} placeholder="e.g. QT-2024-889" onChange={e => setQuoteNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Purchase Date *</label>
              <input type="date" className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} required />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">PO Number</label>
              <input className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono" value={poNumber} placeholder="e.g. PO-99021" onChange={e => setPoNumber(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Purchase URL</label>
              <input type="url" className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white" value={purchaseUrl} placeholder="https://..." onChange={e => setPurchaseUrl(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Selected Plan</label>
              <input className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white" value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)} />
            </div>
            <div className="sm:col-span-4">
              <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Purchase Remarks</label>
              <input className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white" value={purchaseRemarks} placeholder="Additional purchase notes..." onChange={e => setPurchaseRemarks(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ================= SECTION 6: PAYMENT & DOCUMENTS ================= */}
        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs space-y-3">
          <h5 className="font-bold text-blue-950 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> 6. Payment & Secure Document Uploads
          </h5>

          {/* Visual Payment Method Selection Boxes (Matching Image 2) */}
          <div className="space-y-1.5 pb-2 border-b border-blue-100">
            <label className="text-[10px] uppercase font-bold text-blue-800 block">Select Payment Method *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'Bank Transfer', label: 'Bank Transfer', sub: 'NEFT / RTGS / IMPS', icon: <Landmark size={18} /> },
                { id: 'UPI', label: 'UPI', sub: 'Instant Transfer', icon: <QrCode size={18} /> },
                { id: 'Cash on Hand', label: 'Cash on Hand', sub: 'Petty Cash / Voucher', icon: <Coins size={18} /> },
                { id: 'Corporate Card', label: 'Corporate Card', sub: 'Corporate Card / Credit', icon: <CreditCard size={18} /> },
              ].map((m) => {
                const isSelected = paymentMethod === m.id || (m.id === 'Bank Transfer' && (paymentMethod === 'Wire Transfer' || paymentMethod === 'Direct Bank Transfer')) || (m.id === 'Corporate Card' && paymentMethod === 'Credit Card')
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex flex-col items-center sm:items-start sm:flex-row gap-2 p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 text-blue-950 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`p-1.5 rounded-lg flex-shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {m.icon}
                    </span>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold block leading-tight truncate">{m.label}</span>
                      <span className="text-[9px] text-slate-400 block leading-tight truncate">{m.sub}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-blue-800 block mb-1">Payment Method</label>
              <select className="w-full border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs bg-white" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="Corporate Card">Corporate Card</option>
                <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                <option value="Wire Transfer">Wire Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="UPI">UPI</option>
                <option value="Cash on Hand">Cash on Hand / Petty Cash</option>
                <option value="Direct Bank Transfer">Direct Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-blue-800 block mb-1">Payment Reference / Txn ID *</label>
              <input className="w-full border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono" value={paymentReference} placeholder="e.g. TXN-9988123" onChange={e => setPaymentReference(e.target.value)} required />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-blue-800 block mb-1">Payment Date *</label>
              <input type="date" className="w-full border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs bg-white" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-blue-800 block mb-1">Payment Status</label>
              <input className="w-full border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs bg-gray-50 font-bold text-emerald-700" value={paymentStatus} readOnly />
            </div>
          </div>

          {/* Secure File Upload Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
              <label className="text-[10px] uppercase font-bold text-blue-900 block">Quote Upload (PDF/Image)</label>
              <input type="file" className="text-xs text-gray-600 block w-full file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" onChange={e => {
                const f = e.target.files?.[0] || null
                setQuoteFile(f)
                handleFileChange('quote', f)
              }} />
              {quoteFile && <span className="text-[10px] text-emerald-700 font-semibold block">✓ Selected: {quoteFile.name} ({(quoteFile.size / 1024).toFixed(0)} KB)</span>}
              {fileErrors.quote && <span className="text-[10px] text-red-600 font-bold block">{fileErrors.quote}</span>}
            </div>

            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
              <label className="text-[10px] uppercase font-bold text-blue-900 block">Payment Receipt Upload *</label>
              <input type="file" className="text-xs text-gray-600 block w-full file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" onChange={e => {
                const f = e.target.files?.[0] || null
                setReceiptFile(f)
                handleFileChange('receipt', f)
              }} />
              {receiptFile && <span className="text-[10px] text-emerald-700 font-semibold block">✓ Selected: {receiptFile.name} ({(receiptFile.size / 1024).toFixed(0)} KB)</span>}
              {fileErrors.receipt && <span className="text-[10px] text-red-600 font-bold block">{fileErrors.receipt}</span>}
            </div>
          </div>
        </div>

        {/* ================= SECTION 7: TEAM LEAD CONFIRMATION ================= */}
        <div className="bg-white p-4 rounded-xl border-2 border-violet-300 shadow-2xs space-y-3">
          <h5 className="font-bold text-violet-950 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" /> 7. Team Lead Confirmation & Declaration
          </h5>

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-violet-200 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Team Lead Name (Auto-Filled)</span>
              <span className="font-bold text-slate-900 text-xs">{teamLeadName}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-violet-200 shadow-2xs">
              <span className="text-[9px] uppercase text-violet-700 font-bold block mb-0.5">Submission Date (Auto-Filled)</span>
              <span className="font-bold text-slate-900 text-xs">{submissionDate}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-violet-700 block mb-1">Comments / Remarks</label>
            <textarea rows={2} className="w-full border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs bg-white resize-none" placeholder="Add any additional context or notes for Manager verification..." value={commentsRemarks} onChange={e => setCommentsRemarks(e.target.value)} />
          </div>

          <div className="flex items-start gap-2.5 pt-1 bg-violet-50/80 p-3 rounded-xl border border-violet-200">
            <input type="checkbox" id={`confirm_check_${reqId}`} className="mt-0.5 w-4 h-4 text-violet-600 rounded border-violet-300 focus:ring-violet-500 cursor-pointer" checked={confirmationChecked} onChange={e => setConfirmationChecked(e.target.checked)} />
            <label htmlFor={`confirm_check_${reqId}`} className="text-xs text-violet-950 font-semibold cursor-pointer select-none">
              I confirm that all SaaS software details, actual financial amounts, payment proofs, and uploaded documents provided above are accurate and match the authorized purchase for Request <span className="font-mono font-bold text-violet-700">{reqId}</span>.
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={submitting || !isFormValid} className="bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer">
              <Zap size={16} /> {submitting ? 'Submitting Justification…' : 'Submit Payment Justification'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────
export const MyRequestsPage: React.FC = () => {

  const location = useLocation()
  const routeState = location.state as { filterStatus?: string } | null

  const { requests, resubmitRequest, refreshBackendRequests } = useProcurement()

  useEffect(() => {
    if (refreshBackendRequests) {
      refreshBackendRequests()
    }
  }, [refreshBackendRequests])

  const [requestType, setRequestType] = useState<'all' | 'software' | 'hardware'>('all')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState(() => routeState?.filterStatus || 'All')
  const [filterCategory, setFilterCategory] = useState('All')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({})
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [resubmitSuccess, setResubmitSuccess] = useState(false)
  const [mockPaymentMethods, setMockPaymentMethods] = useState<Record<string, string>>({})
  const [receiptModalPayment, setReceiptModalPayment] = useState<any | null>(null)
  const [expandedJustificationId, setExpandedJustificationId] = useState<string | number | null>(null)

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
    setEditForm({ ...editForm, category: newCat, preferredVendor: '', extraFields: {} })
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

  const softwareCount = useMemo(() => requests.filter(r => isSoftwareRequest(r)).length, [requests])
  const hardwareCount = useMemo(() => requests.filter(r => isHardwareRequest(r)).length, [requests])

  const filtered = useMemo(() => {
    const matching = requests
      .filter((req) => {
        const matchesSearch =
          req.title.toLowerCase().includes(search.toLowerCase()) ||
          req.id.toLowerCase().includes(search.toLowerCase())
        const isApprovedRaw = (req as any).raw_status === 'ADMIN_APPROVED' || (req as any).raw_status === 'PAYMENT_APPROVED' || (req as any).raw_status === 'PAYMENT_PROCESSED' || (req as any).raw_status === 'PAYMENT_JUSTIFICATION_SUBMITTED'
        const matchesStatus = filterStatus === 'All' || req.status === filterStatus || (filterStatus === 'Approved' && (req.status === 'Approved' || isApprovedRaw))
        const matchesCategory = filterCategory === 'All' || req.category === filterCategory

        let matchesDate = true
        if (startDate) matchesDate = matchesDate && new Date(req.date) >= new Date(startDate)
        if (endDate) matchesDate = matchesDate && new Date(req.date) <= new Date(endDate)

        const matchesType = requestType === 'all'
          ? true
          : requestType === 'software'
          ? isSoftwareRequest(req)
          : isHardwareRequest(req)

        return matchesSearch && matchesStatus && matchesCategory && matchesDate && matchesType
      })
    return sortRequestsNewestFirst(matching)
  }, [requests, search, filterStatus, filterCategory, startDate, endDate, requestType])

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

      {/* Request Type Segmented Filter */}
      <div className="flex items-center justify-between">
        <RequestTypeFilter
          value={requestType}
          onChange={setRequestType}
          totalCount={requests.length}
          softwareCount={softwareCount}
          hardwareCount={hardwareCount}
        />
        <button
          type="button"
          onClick={() => refreshBackendRequests && refreshBackendRequests()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all shadow-sm"
          title="Refresh requests from server"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Refresh
        </button>
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
            const recInfo = getRecommendationStatus(req)
            const isHistoryOpen = expandedHistory[req.id] || false
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                {/* Request Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">{req.id}</span>
                      <span className="text-xs text-gray-400 font-medium">{formatDate(req.date)}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${priorityColor(req.priority)}`}>
                        Priority: {req.priority}
                      </span>
                      {recInfo.isRecommendedToAdmin ? (
                        <span className="text-[11px] font-black text-purple-950 bg-purple-100 border border-purple-300 px-3 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <ArrowUpRight size={12} /> {recInfo.statusLabel}
                        </span>
                      ) : recInfo.isRecommendedToFinance && req.status !== 'Approved' && req.raw_status !== 'FINANCE_APPROVED' ? (
                        <span className="text-[11px] font-black text-emerald-950 bg-emerald-100 border border-emerald-300 px-3 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <ArrowUpRight size={12} /> {recInfo.statusLabel}
                        </span>
                      ) : null}
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

                <TrackingStepper
                  currentStage={req.currentStage}
                  status={req.status}
                  category={req.category}
                  title={req.title}
                  flowType={req.flowType}
                  history={req.history as any}
                  approval_steps={(req as any).approval_steps}
                  financeStatus={(req as any).financeStatus}
                  paymentStatus={(req as any).paymentStatus}
                  poNumber={req.poRef || (req as any).poNumber || (req as any).po_number}
                  grnNumber={(req as any).grnNumber || (req as any).grn_number}
                  invoiceNumber={(req as any).invoiceNumber || (req as any).invoice_number}
                  is_invoice_verified={(req as any).is_invoice_verified || (req as any).documentsVerified}
                  rfqId={(req as any).rfqId || (req as any).rfq_id}
                />

                {/* ─── SUBSCRIPTION & RENEWAL SECTION ─────────────────────────────────── */}
                {(req as any).renewal_eligibility && (req as any).renewal_eligibility.available !== undefined && (
                  <div className="mt-4 p-4 bg-white rounded-xl border border-blue-200 shadow-sm space-y-3 text-xs">
                    <h4 className="font-bold text-blue-900 uppercase tracking-wider text-[11px] border-b border-blue-100 pb-2 flex items-center gap-1">
                      <Package size={14} /> Subscription Details & Renewal Options
                    </h4>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                      <div>
                        <span className="text-[10px] uppercase text-gray-500 font-semibold block">Subscription Status</span>
                        <span className="font-bold text-emerald-700">Active</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-gray-500 font-semibold block">End Date</span>
                        <span className="font-bold text-gray-900">{(req as any).renewal_eligibility.subscription_end_date || 'N/A'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] uppercase text-gray-500 font-semibold block">Eligibility</span>
                        <span className="font-bold text-gray-900">{(req as any).renewal_eligibility.reason}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      {(req as any).renewal_eligibility.available ? (
                        <>
                          <button
                            onClick={async () => {
                              try {
                                await renewRequestApi(req.id)
                                refreshBackendRequests()
                                triggerGlobalDataSync()
                                alert("Renewal request created successfully! Check your Drafts/Pending requests.")
                              } catch (e: any) {
                                alert("Error creating renewal request: " + (e.response?.data?.error || e.message))
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <RotateCcw size={14} /> Renew Subscription
                          </button>
                          
                          <button
                            onClick={async () => {
                              try {
                                await upgradeRequestApi(req.id)
                                refreshBackendRequests()
                                triggerGlobalDataSync()
                                alert("Upgrade request created successfully! Check your Drafts/Pending requests.")
                              } catch (e: any) {
                                alert("Error creating upgrade request: " + (e.response?.data?.error || e.message))
                              }
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Zap size={14} /> Upgrade Subscription
                          </button>
                        </>
                      ) : (
                        <div className="text-gray-500 italic text-[11px] bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                          {(req as any).renewal_eligibility.reason}
                          {(req as any).renewal_eligibility.active_request_id && (
                            <span className="ml-1 font-bold">({(req as any).renewal_eligibility.active_request_id})</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Subscription History Array */}
                    {(req as any).renewal_eligibility.history && (req as any).renewal_eligibility.history.length > 0 && (
                      <div className="mt-4 border-t border-blue-100 pt-3">
                        <span className="text-[10px] uppercase text-gray-500 font-semibold block mb-2">Subscription History</span>
                        <div className="space-y-1.5">
                          {(req as any).renewal_eligibility.history.map((h: any, idx: number) => (
                            <div key={h.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100 text-[11px]">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${h.operation === 'ORIGINAL' ? 'bg-blue-100 text-blue-800' : h.operation === 'RENEWAL' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                                  {h.operation}
                                </span>
                                <span className="font-medium text-gray-700">{h.request_id}</span>
                                {h.request_id === req.id && <span className="text-blue-500 font-bold ml-1">(Current)</span>}
                              </div>
                              <span className="text-gray-500 font-medium">{h.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => toggleHistory(req.id)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                  >
                    {isHistoryOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    {isHistoryOpen ? 'Hide full history' : 'View full history'} ({req.history?.length || 0} steps)
                  </button>
                  <span className="text-[11px] text-gray-400 font-medium">Last updated: {formatDate(req.lastUpdated)}</span>
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
                            <span className="text-[10px] text-gray-400 font-medium">{formatDateTime(step.date)}</span>
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
                        Category Detail: {editCategoryConfig.extraFieldLabel} (Optional)
                      </label>
                      <select
                        value={editForm.extraFields[editCategoryConfig.extraFieldKey] || ''}
                        onChange={(e) => {
                          const updated = { ...editForm.extraFields }
                          if (e.target.value) {
                            updated[editCategoryConfig.extraFieldKey!] = e.target.value
                          } else {
                            delete updated[editCategoryConfig.extraFieldKey!]
                          }
                          setEditForm({ ...editForm, extraFields: updated })
                        }}
                        className="w-full p-2.5 border rounded-lg bg-white border-blue-200 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">-- Select {editCategoryConfig.extraFieldLabel} (Optional) --</option>
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

      {receiptModalPayment && (
        <UnifiedReceiptModal
          payment={receiptModalPayment}
          onClose={() => setReceiptModalPayment(null)}
        />
      )}
    </div>
  )
}
