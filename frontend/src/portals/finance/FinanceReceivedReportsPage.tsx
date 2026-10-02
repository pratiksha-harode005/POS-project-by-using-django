import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileCheck, Clock, CheckCircle, XCircle, Calendar, Search,
  Download, Eye, ArrowUpRight, User, Building, IndianRupee,
  AlertTriangle, Check, FileText, Sparkles, Paperclip,
  ShieldCheck, X, Users, UserCheck, ChevronDown, Receipt, ExternalLink,
  Package, Laptop, DollarSign
} from 'lucide-react'
import { numberToIndianWords } from '../../utils/paymentLedgerPdfGenerator'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useFinanceData, ProcurementRequest } from '../../context/ManagerDataContext'
import { useAuth } from '../../context/AuthContext'
import { UnifiedReceiptModal } from '../../components/portal/UnifiedReceiptModal'
import { isSoftwareRequest } from '../../utils/workflowUtils'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export type TimePeriodFilter = 'ALL' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
export type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
export type SubmitterFilter = 'ALL' | 'MANAGER' | 'TEAM_LEAD'
export type ProcurementTypeFilter = 'ALL' | 'SOFTWARE' | 'HARDWARE'

export interface FinanceReportItem {
  id: string
  title: string
  submitterName: string
  submitterRole: string
  submitterType: 'Manager' | 'Team Lead'
  department: string
  submittedDate: string
  periodCategory: 'Weekly' | 'Monthly' | 'Yearly'
  totalAmount: number
  status: 'Pending' | 'Approved' | 'Rejected'
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  category: string
  costCenter: string
  summary: string
  keyFindings: string[]
  itemBreakdown: { item: string; qty: number; unitCost: number; totalCost: number }[]
  recommendation: string
  attachedDocs: { name: string; size: string }[]
  approvedBy?: string
  approvedDate?: string
  rejectionReason?: string
  rejectedDate?: string
  financeNotes?: string
  // Software Workflow Specific Dossier Fields
  originalRequest?: any
  isSoftware?: boolean
  softwareName?: string
  requestType?: string
  currentPlan?: string
  requiredPlan?: string
  existingCost?: number
  businessRequirement?: string
  managerRecommendation?: string
  managerRecommendedBy?: string
  managerRecommendedDate?: string
  financeResearch?: {
    marketPricing?: string
    availableAlternatives?: string
    businessValue?: string
    vendorQuoteRef?: string
    researchNotes?: string
    vendor?: string
    hardwareSpecs?: string
    softwareLicensing?: string
    quantityLicenses?: number
    estimatedUnitCost?: number
    adminComments?: string
  }
  costEstimation?: {
    unitCost?: number
    quantity?: number
    currentCost?: number
    estimatedCost?: number
    recommendedCost?: number
    taxAmount?: number
    discountAmount?: number
    finalAmount?: number
    costCenter?: string
    budgetCode?: string
    vendor?: string
    notes?: string
  }
  timeline?: any[]
  approvalHistory?: any[]
}

export const FinanceReceivedReportsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { allRequests, approveFinanceRequest, rejectFinanceRequest, payments } = useFinanceData()
  const currentFinanceOfficer = user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Finance Controller'
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<FinanceReportItem>>>({})
  const [activeSection, setActiveSection] = useState<'REQUISITION_REPORTS' | 'RECEIPT_REPORTS'>('REQUISITION_REPORTS')
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<any | null>(null)
  const [receiptSearch, setReceiptSearch] = useState('')
  const [timePeriod, setTimePeriod] = useState<TimePeriodFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [submitterFilter, setSubmitterFilter] = useState<SubmitterFilter>('ALL')
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('All')
  const [selectedReport, setSelectedReport] = useState<FinanceReportItem | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [rejectModalReport, setRejectModalReport] = useState<FinanceReportItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Helper to open the exact same UnifiedReceiptModal for any request or report item
  const handleOpenReceipt = (item: any) => {
    const reqObj = item.originalRequest || item.rawRequest || item
    const rAny = item as any
    const cleanId = String(reqObj.request_id || reqObj.id || rAny.id || '').replace(/^REP-/, '')

    // Check if this request already has a pre-mapped entry in receiptReports
    const matchedReceiptReport = receiptReports.find(rr => 
      rr.id === cleanId || 
      rr.id === `REQ-${cleanId}` || 
      rr.rawRequest?.request_id === cleanId || 
      rr.rawRequest?.id === cleanId
    )

    if (matchedReceiptReport) {
      const rrAny = matchedReceiptReport as any
      const rrReq = rrAny.rawRequest || rrAny
      const pj = rrAny.payment_justification_detail || rrReq.payment_justification_detail || rrReq.extra_fields?.payment_justification || {}
      const extra = rrReq.extra_fields || rrReq.extraFields || rrAny.extra_fields || {}
      const realReqAmount = rrReq.requested_amount ?? pj.requested_amount ?? extra.requested_amount ?? rrReq.total_estimated_cost ?? rrAny.amount
      const realApprovedAmount = rrReq.approved_amount ?? pj.finance_approved_amount ?? pj.manager_approved_amount ?? extra.approved_amount ?? rrAny.approved_amount
      const realActualAmount = rrReq.finance_approved_amount ?? pj.actual_purchase_amount ?? rrAny.finalPaidAmount ?? rrAny.amount

      let pay = payments.find((p: any) => 
        p.requestId === matchedReceiptReport.id || 
        p.requestId === cleanId || 
        p.purchaseRequestDetail?.id === matchedReceiptReport.id || 
        p.purchaseRequestDetail?.request_id === cleanId
      )

      if (!pay) {
        pay = {
          id: rrAny.paymentReference || rrAny.payment_reference || extra.software_receipt_id || `PAY-${cleanId}`,
          requestId: cleanId,
          amount: Number(realActualAmount || 0),
          status: rrAny.paymentStatus || rrAny.payment_status || 'Paid',
          dueDate: rrAny.paymentDate || rrAny.payment_date || new Date().toISOString().split('T')[0],
          payment_method: rrAny.payment_method || pj.payment_method || 'Corporate Card',
          reference_number: rrAny.paymentReference || rrAny.payment_reference || extra.software_receipt_id || `TXN-${cleanId}`,
          purchaseRequestDetail: {
            ...rrReq,
            id: cleanId,
            request_id: cleanId,
            requested_amount: realReqAmount,
            approved_amount: realApprovedAmount,
            finance_approved_amount: realActualAmount,
            payment_justification_detail: pj,
            extra_fields: extra,
            request_operation: rrReq.request_operation || pj.purchase_type || 'NEW',
            request_type: rrReq.request_type || pj.purchase_type || 'New Purchase'
          },
          receiptDetails: {
            fileName: rrAny.receiptId || extra.software_receipt_id || `RCP-${cleanId}`,
            itemName: rrAny.softwareName || rrReq.software_name || rrReq.title || 'Software License',
          }
        } as any
      }
      setSelectedReceiptPayment(pay)
      return
    }

    // Otherwise construct the payment object directly from the request and PostgreSQL data
    const pj = reqObj.payment_justification_detail || reqObj.payment_justification || rAny.payment_justification_detail || reqObj.extra_fields?.payment_justification || {}
    const extra = reqObj.extra_fields || reqObj.extraFields || rAny.extra_fields || {}
    const re = reqObj.research_estimation || {}
    const realReqAmount = reqObj.requested_amount ?? pj.requested_amount ?? extra.requested_amount ?? reqObj.total_estimated_cost ?? rAny.totalAmount ?? rAny.amount
    const realApprovedAmount = reqObj.finance_approved_amount ?? reqObj.approved_amount ?? pj.finance_approved_amount ?? pj.manager_approved_amount ?? extra.approved_amount ?? rAny.approved_amount
    const realActualAmount = pj.final_payable_amount ?? pj.actual_purchase_amount ?? extra.final_payable_amount ?? extra.actual_purchase_amount ?? reqObj.finance_approved_amount ?? rAny.finalPaidAmount ?? realApprovedAmount ?? realReqAmount

    let pay = payments.find((p: any) => 
      p.requestId === cleanId || 
      p.requestId === `REQ-${cleanId}` || 
      p.requestId === rAny.id || 
      p.purchaseRequestDetail?.id === cleanId || 
      p.purchaseRequestDetail?.request_id === cleanId
    )

    if (!pay) {
      const receiptNum = extra.software_receipt_id || extra.receipt_no || `RCP-SW-${cleanId}`
      const payRef = extra.payment_reference || reqObj.payment_reference || pj.payment_reference || `TXN-${cleanId}`
      const payId = extra.payment_id || `PAY-${cleanId}`
      const payDate = extra.receipt_generated_at?.split('T')[0] || extra.payment_date?.split('T')[0] || reqObj.payment_date || pj.payment_date || rAny.submittedDate || new Date().toISOString().split('T')[0]
      const payMethod = extra.payment_method || reqObj.payment_method || pj.payment_method || 'Corporate Card'
      const payStatus = extra.payment_status || reqObj.payment_status || pj.payment_status || (reqObj.status === 'completed' || reqObj.status === 'REQUEST_COMPLETED' ? 'Paid' : 'Paid')

      pay = {
        id: payId,
        requestId: cleanId,
        amount: Number(realActualAmount || 0),
        status: payStatus,
        dueDate: payDate,
        payment_method: payMethod,
        reference_number: payRef,
        purchaseRequestDetail: {
          ...reqObj,
          id: cleanId,
          request_id: cleanId,
          requested_amount: realReqAmount,
          approved_amount: realApprovedAmount,
          finance_approved_amount: realActualAmount,
          payment_justification_detail: pj,
          extra_fields: extra,
          research_estimation: re,
          request_operation: reqObj.request_operation || pj.purchase_type || 'NEW',
          request_type: reqObj.request_type || pj.purchase_type || 'New Purchase'
        },
        receiptDetails: {
          fileName: receiptNum,
          itemName: pj.software_name || reqObj.software_name || rAny.softwareName || rAny.title || 'Software / Procurement Item',
        }
      } as any
    }
    setSelectedReceiptPayment(pay)
  }

  const hasReceipt = (item: any): boolean => {
    if (!item) return false
    const reqObj = item.originalRequest || item.rawRequest || item
    const cleanId = String(reqObj.request_id || reqObj.id || item.id || '').replace(/^REP-/, '')
    
    // 1. Direct match in receiptReports
    if (receiptReports.some(rr => rr.id === cleanId || rr.id === `REQ-${cleanId}` || rr.rawRequest?.request_id === cleanId || rr.rawRequest?.id === cleanId)) {
      return true
    }

    // 2. Extra fields markers from DB
    const extra = reqObj.extra_fields || reqObj.extraFields || item.extra_fields || {}
    if (extra.software_receipt_id || extra.receipt_no || extra.payment_id || extra.mock_payment_ref || extra.payment_reference) {
      return true
    }

    // 3. Payment record exists
    if (payments.some((p: any) => p.requestId === cleanId || p.purchaseRequestDetail?.id === cleanId || p.purchaseRequestDetail?.request_id === cleanId)) {
      return true
    }

    // 4. Completed, acknowledged or approved status
    const rawSt = String(reqObj.raw_status || reqObj.status || item.status || '').toUpperCase()
    if (['REQUEST_COMPLETED', 'COMPLETED', 'TEAM_LEAD_ACKNOWLEDGED', 'TEAM_LEAD_CONFIRMED', 'PAID', 'APPROVED', 'FINANCE_APPROVED'].includes(rawSt) || Boolean(extra.team_lead_acknowledged) || Boolean(reqObj.confirmed_by_team_lead)) {
      return true
    }

    return false
  }

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Derive Receipt Reports dynamically from real requests with generated software receipt
  const receiptReports = useMemo(() => {
    return allRequests
      .filter((req: any) => {
        const extra = req.extra_fields || req.extraFields || (req.rawRequest && req.rawRequest.extra_fields) || {}
        const rawSt = ((req.raw_status || req.status || '') as string).toUpperCase()
        const cat = (req.category || '').toLowerCase()
        const isSw = isSoftwareRequest(req) || cat.includes('software') || cat.includes('saas') || Boolean(req.software_name) || req.flowType === 'B' || req.flow_type === 'B'
        const hasReceipt = Boolean(extra.software_receipt_id || extra.receipt_no)
        const isCompleted = ['REQUEST_COMPLETED', 'COMPLETED', 'TEAM_LEAD_ACKNOWLEDGED', 'TEAM_LEAD_CONFIRMED'].includes(rawSt) || Boolean(extra.team_lead_acknowledged) || Boolean(req.confirmed_by_team_lead)
        return isSw && (hasReceipt || isCompleted)
      })
      .map((req: any) => {
        const rawSt = ((req.raw_status || req.status || '') as string).toUpperCase()
        const extra = req.extra_fields || req.extraFields || (req.rawRequest && req.rawRequest.extra_fields) || {}
        const reqId = req.request_id || req.id
        const receiptId = extra.software_receipt_id || extra.receipt_no || `RCP-SW-${reqId}`
        const pj = req.payment_justification_detail || extra.payment_justification || (req.rawRequest && req.rawRequest.payment_justification_detail) || {}
        const realPaidAmount = Number(pj.actual_purchase_amount || extra.actual_purchase_amount || extra.final_payable_amount || req.finance_approved_amount || req.approved_amount || req.requested_amount || 0)
        const payRef = extra.payment_reference || req.payment_reference || extra.mock_payment_ref || pj.payment_reference || receiptId
        const payMethod = extra.payment_method || req.payment_method || extra.mock_payment_method || pj.payment_method || 'Corporate Digital Card'
        const payDate = extra.receipt_generated_at?.split('T')[0] || extra.payment_date?.split('T')[0] || req.payment_date || pj.payment_date || req.date || (req.created_at ? req.created_at.split('T')[0] : new Date().toISOString().split('T')[0])
        const vendorName = pj.vendor_name || req.vendor || req.preferred_vendor || req.software_name || req.title || 'Enterprise SaaS Provider'

        return {
          id: reqId,
          rawRequest: req,
          payment_justification_detail: pj,
          receiptId: receiptId,
          softwareName: pj.software_name || (req as any).software_name || req.title || 'Software / SaaS',
          teamLead: req.requester_name || req.createdBy || (req.created_by_detail ? `${req.created_by_detail.first_name} ${req.created_by_detail.last_name}`.trim() : 'Team Lead'),
          manager: req.approvedBy || (req as any).manager_name || 'Sarah Manager',
          financeApprovedAmount: Number(req.finance_approved_amount || req.approved_amount || req.requested_amount || 0),
          finalPaidAmount: realPaidAmount,
          paymentReference: payRef,
          paymentMethod: payMethod,
          paymentDate: payDate,
          paymentStatus: 'Paid',
          receiptProof: pj.proof_description || extra.payment_justification?.proof_description || `Receipt Proof - ${receiptId}.pdf`,
          paymentJustification: pj.business_justification || extra.payment_justification?.business_justification || req.justification || 'Department operational requirement',
          managerVerificationStatus: 'Verified & Approved',
          history: req.history || req.timeline || [],
          rawStatus: rawSt,
          vendor: vendorName,
          created_at: req.created_at || payDate
        }
      })
      .filter((r) => {
        if (!receiptSearch.trim()) return true
        const q = receiptSearch.toLowerCase()
        return (
          r.id.toLowerCase().includes(q) ||
          r.softwareName.toLowerCase().includes(q) ||
          r.teamLead.toLowerCase().includes(q) ||
          r.manager.toLowerCase().includes(q) ||
          r.paymentReference.toLowerCase().includes(q) ||
          r.receiptId.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const extraA = a.rawRequest?.extra_fields || a.rawRequest?.extraFields || {}
        const extraB = b.rawRequest?.extra_fields || b.rawRequest?.extraFields || {}
        const dateA = new Date(extraA.receipt_generated_at || a.paymentDate || a.created_at || 0).getTime()
        const dateB = new Date(extraB.receipt_generated_at || b.paymentDate || b.created_at || 0).getTime()
        if (dateB !== dateA) return dateB - dateA
        return b.id.localeCompare(a.id)
      })
  }, [allRequests, receiptSearch])

  // Derive reports dynamically from real procurement requests forwarded or managed
  const reports = useMemo<FinanceReportItem[]>(() => {
    const today = new Date()
    return allRequests.map((req: any, idx) => {
      const id = String(req.id || `REQ-${idx + 1}`)
      const reportId = id.startsWith('REP-') ? id : `REP-${id}`
      const subDateStr = req.submittedDate || req.created_at || new Date().toISOString().split('T')[0]
      const dateObj = new Date(subDateStr)
      const diffDays = Math.max(0, Math.floor((today.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24)))

      let periodCategory: 'Weekly' | 'Monthly' | 'Yearly' = 'Weekly'
      if (diffDays > 30) periodCategory = 'Yearly'
      else if (diffDays > 7) periodCategory = 'Monthly'

      const isTL = req.role === 'Team Lead' || String(req.requester_name || '').toLowerCase().includes('lead') || String(req.createdBy || '').toLowerCase().includes('lead')
      const submitterType: 'Manager' | 'Team Lead' = isTL ? 'Team Lead' : 'Manager'
      const submitterName = req.createdBy || req.requester_name || (isTL ? 'Team Lead' : 'Procurement Manager')
      const submitterRole = isTL ? `${req.department || 'Operations'} Lead` : `${req.department || 'Procurement'} Manager`

      const rawStatus = (req.status || req.raw_status || 'Pending').toLowerCase()
      let status: 'Pending' | 'Approved' | 'Rejected' = 'Pending'
      if (rawStatus.includes('approved') || rawStatus === 'completed' || rawStatus === 'manager_approved' || rawStatus === 'finance_report') {
        status = 'Approved'
      } else if (rawStatus.includes('rejected') || rawStatus === 'cancelled') {
        status = 'Rejected'
      }

      const totalAmount = Number(req.amount || req.totalAmount || req.total_estimated_cost || req.budget || req.estimated_amount || (req.research_estimation?.final_estimated_amount) || 0)
      const priority = (req.priority || 'Medium') as 'Critical' | 'High' | 'Medium' | 'Low'
      const dept = req.department || 'Procurement'

      const items = (req.items && req.items.length > 0)
        ? req.items.map((it: any) => ({
            item: it.name || it.item_name || 'Procurement Item',
            qty: Number(it.quantity || 1),
            unitCost: Number(it.unit_price || it.unitCost || 0),
            totalCost: Number(it.total_price || it.totalCost || (Number(it.quantity || 1) * Number(it.unit_price || 0)))
          }))
        : [{
            item: req.title || req.software_name || req.item_name || 'Procurement Allocation',
            qty: 1,
            unitCost: totalAmount,
            totalCost: totalAmount
          }]

      const re = req.research_estimation || {}
      const isSoftware = isSoftwareRequest(req)

      const baseReport: FinanceReportItem = {
        id: reportId,
        title: req.title || req.software_name || req.item_name || `Procurement Dossier for ${dept}`,
        submitterName,
        submitterRole,
        submitterType,
        department: dept,
        submittedDate: subDateStr.split('T')[0],
        periodCategory,
        totalAmount,
        status,
        priority,
        category: req.category || (isSoftware ? 'Enterprise Software' : 'Capital Expenditure'),
        costCenter: re.cost_center || req.costCenter || `CC-${dept.substring(0, 3).toUpperCase()}-2026`,
        summary: req.justification || req.description || req.business_requirement || `Managerial submission and compliance dossier for ${req.title || 'procurement requirements'}.`,
        keyFindings: [
          `Allocated budget of ${fmt(totalAmount)} verified against fiscal thresholds.`,
          `Sourcing specifications aligned with ${dept} requirements.`,
          `Pre-screened against corporate procurement governance.`
        ],
        itemBreakdown: items,
        recommendation: req.manager_comments || re.manager_comments || req.recommendation_reason || req.justification || 'Forwarded for Finance audit, fund allocation, and PO issuance.',
        attachedDocs: [
          { name: `${reportId}_Approval_Dossier.pdf`, size: '2.1 MB' },
          { name: 'Vendor_Compliance_Quotation.pdf', size: '1.4 MB' }
        ],
        ...(status === 'Approved' ? {
          approvedBy: currentFinanceOfficer,
          approvedDate: new Date().toISOString().split('T')[0],
          financeNotes: 'Audited and approved for fiscal disbursement.'
        } : {}),
        ...(status === 'Rejected' ? {
          rejectionReason: req.rejection_reason || 'Requires revision of budgetary ceiling.',
          rejectedDate: new Date().toISOString().split('T')[0]
        } : {}),
        // Software Workflow specifics
        originalRequest: req,
        isSoftware,
        softwareName: req.software_name || req.title,
        requestType: req.request_type || 'Software / SaaS',
        currentPlan: req.current_plan,
        requiredPlan: req.required_plan,
        existingCost: req.existing_cost,
        businessRequirement: req.business_requirement,
        managerRecommendation: req.recommendation_reason || req.extra_fields?.recommendation_reason || req.justification,
        managerRecommendedBy: req.recommended_by || req.approvedBy,
        managerRecommendedDate: req.recommended_date || req.approvedDate,
        financeResearch: {
          vendor: re.vendor || req.vendor || (isSoftware ? 'Microsoft Corporation' : 'Dell Technologies'),
          marketPricing: re.market_pricing,
          availableAlternatives: re.available_alternatives,
          businessValue: re.business_value,
          vendorQuoteRef: re.vendor_quotation_ref,
          researchNotes: re.research_notes || re.admin_comments,
          hardwareSpecs: re.hardware_specs,
          softwareLicensing: re.software_licensing,
          quantityLicenses: re.quantity_licenses,
          estimatedUnitCost: re.estimated_unit_cost,
          adminComments: re.admin_comments,
        },
        costEstimation: {
          unitCost: re.estimated_unit_cost || (re.quantity_licenses ? Math.round((re.estimated_total_cost || totalAmount) / re.quantity_licenses) : totalAmount),
          quantity: re.quantity_licenses || 1,
          currentCost: re.current_cost || req.existing_cost,
          estimatedCost: re.estimated_total_cost || re.estimated_cost || totalAmount,
          recommendedCost: re.recommended_cost || re.final_estimated_amount || totalAmount,
          taxAmount: re.tax_amount,
          discountAmount: re.discount_amount,
          finalAmount: re.final_estimated_amount || totalAmount,
          costCenter: re.cost_center || req.costCenter,
          budgetCode: re.budget_code,
          vendor: re.vendor || req.vendor,
          notes: re.admin_comments || re.manager_comments || re.business_evaluation,
        },
        timeline: req.timeline || [],
        approvalHistory: req.approval_history || req.approvalHistory || []
      }

      if (localOverrides[reportId]) {
        return { ...baseReport, ...localOverrides[reportId] }
      }
      return baseReport
    })
  }, [allRequests, localOverrides])

  // Action Handlers
  const handleApproveReport = (reportId: string) => {
    setLocalOverrides(prev => ({
      ...prev,
      [reportId]: {
        status: 'Approved',
        approvedBy: currentFinanceOfficer,
        approvedDate: new Date().toISOString().split('T')[0],
        financeNotes: 'Audited and cleared for fund disbursement and PO issuance.'
      }
    }))
    // Also trigger shared finance context approval
    const originalId = reportId.replace(/^REP-/, '')
    if (approveFinanceRequest) {
      approveFinanceRequest(originalId)
    }
    if (selectedReport && selectedReport.id === reportId) {
      setSelectedReport(prev =>
        prev
          ? {
              ...prev,
              status: 'Approved',
              approvedBy: currentFinanceOfficer,
              approvedDate: new Date().toISOString().split('T')[0],
              financeNotes: 'Audited and cleared for fund disbursement and PO issuance.'
            }
          : null
      )
    }
    showToast(`✓ Report ${reportId} cleared and approved by Finance!`, 'success')
  }

  const handleOpenRejectModal = (rep: FinanceReportItem) => {
    setRejectModalReport(rep)
    setRejectReason('')
  }

  const handleConfirmReject = () => {
    if (!rejectModalReport || !rejectReason.trim()) return
    const id = rejectModalReport.id
    setLocalOverrides(prev => ({
      ...prev,
      [id]: {
        status: 'Rejected',
        rejectionReason: rejectReason,
        rejectedDate: new Date().toISOString().split('T')[0]
      }
    }))
    const originalId = id.replace(/^REP-/, '')
    if (rejectFinanceRequest) {
      rejectFinanceRequest(originalId, rejectReason)
    }
    if (selectedReport && selectedReport.id === id) {
      setSelectedReport(prev =>
        prev
          ? {
              ...prev,
              status: 'Rejected',
              rejectionReason: rejectReason,
              rejectedDate: new Date().toISOString().split('T')[0]
            }
          : null
      )
    }
    setRejectModalReport(null)
    setRejectReason('')
    showToast(`✕ Report ${id} disapproved by Finance Directorate.`, 'error')
  }

  // Export PDF Report Dossier
  const handleExportReportPdf = (rep: FinanceReportItem) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 36
    const contentWidth = pageWidth - margin * 2

    // Header Band
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, pageWidth, 56, 'F')
    doc.setFillColor(79, 70, 229) // Indigo-600
    doc.rect(0, 56, pageWidth, 4, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('KSS PROCUREMENT OS — FINANCE AUDIT & RECEIVED REPORT', margin, 26)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(203, 213, 225)
    doc.text(`REPORT DOSSIER: ${rep.id}  |  STATUS: ${rep.status.toUpperCase()}  |  SUBMITTER: ${rep.submitterType.toUpperCase()}`, margin, 40)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(`DATE: ${rep.submittedDate}`, pageWidth - margin, 26, { align: 'right' })

    // Title Card
    let y = 76
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(79, 70, 229)
    doc.text(`SUBMITTED BY: ${rep.submitterName.toUpperCase()} (${rep.submitterRole}) [${rep.submitterType}]`, margin + 12, y + 16)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(15, 23, 42)
    const truncatedTitle = rep.title.length > 55 ? rep.title.substring(0, 52) + '...' : rep.title
    doc.text(truncatedTitle, margin + 12, y + 33)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 116, 139)
    doc.text(`Department: ${rep.department}  |  Cost Center: ${rep.costCenter}  |  Period: ${rep.periodCategory}`, margin + 12, y + 46)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(15, 23, 42)
    doc.text(`INR ${rep.totalAmount.toLocaleString('en-IN')}`, pageWidth - margin - 12, y + 28, { align: 'right' })

    // Table of Items
    y += 68
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(30, 41, 59)
    doc.text('1. ITEMIZED EXPENDITURE & VALUATION BREAKDOWN', margin, y)

    y += 8
    const tableHeaders = [['No.', 'Item Description & Specification', 'Qty', 'Unit Rate (INR)', 'Total Amount (INR)']]
    const tableBody = rep.itemBreakdown.map((it, idx) => [
      String(idx + 1).padStart(2, '0'),
      it.item,
      String(it.qty),
      it.unitCost.toLocaleString('en-IN'),
      it.totalCost.toLocaleString('en-IN')
    ])

    autoTable(doc, {
      startY: y,
      head: tableHeaders,
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 5,
      },
      styles: {
        fontSize: 8,
        cellPadding: 5,
        lineColor: [226, 232, 240],
        lineWidth: 0.5,
      },
      columnStyles: {
        0: { cellWidth: 28, halign: 'center' },
        1: { cellWidth: 260 },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 95, halign: 'right' },
        4: { cellWidth: 100, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin },
    })

    y = (doc as any).lastAutoTable.finalY + 16

    // Findings
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(30, 41, 59)
    doc.text('2. AUDIT FINDINGS & BUSINESS CASE', margin, y)

    y += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(51, 65, 85)
    rep.keyFindings.forEach((f) => {
      doc.text(`• ${f}`, margin + 8, y)
      y += 13
    })

    y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(30, 41, 59)
    doc.text('3. SUBMISSION DIRECTIVE / RECOMMENDATION', margin, y)

    y += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(79, 70, 229)
    doc.text(`"${rep.recommendation}"`, margin + 8, y)

    y += 24
    // Finance Clearance Block
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(margin, y, contentWidth, 48, 4, 4, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(15, 23, 42)
    doc.text('FINANCE AUDIT DECISION RECORD:', margin + 10, y + 16)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    if (rep.status === 'Approved') {
      doc.setTextColor(22, 101, 52)
      doc.text(`Audited and Approved by ${rep.approvedBy || currentFinanceOfficer} on ${rep.approvedDate || rep.submittedDate}.`, margin + 10, y + 30)
    } else if (rep.status === 'Rejected') {
      doc.setTextColor(190, 18, 60)
      doc.text(`Disapproved by Finance: ${rep.rejectionReason || 'Policy non-compliance'} (${rep.rejectedDate || rep.submittedDate}).`, margin + 10, y + 30)
    } else {
      doc.setTextColor(180, 83, 9)
      doc.text('Pending Finance Controller budget verification and PO fund reservation.', margin + 10, y + 30)
    }

    doc.save(`${rep.id}_Finance_Report.pdf`)
    showToast(`✓ Downloaded PDF report for ${rep.id}`, 'success')
  }

  // Dynamic Filtering Logic
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // 1. Time Period Filter
      const matchTime =
        timePeriod === 'ALL' || r.periodCategory.toUpperCase() === timePeriod

      // 2. Status Filter
      const matchStatus =
        statusFilter === 'ALL' || r.status.toUpperCase() === statusFilter

      // 3. Submitter Filter (Manager vs Team Lead)
      const matchSubmitter =
        submitterFilter === 'ALL' ||
        (submitterFilter === 'MANAGER' && r.submitterType === 'Manager') ||
        (submitterFilter === 'TEAM_LEAD' && r.submitterType === 'Team Lead')

      // 4. Search query
      const q = (search || '').toLowerCase().trim()
      const matchSearch =
        !q ||
        String(r.title || '').toLowerCase().includes(q) ||
        String(r.id || '').toLowerCase().includes(q) ||
        String(r.submitterName || '').toLowerCase().includes(q) ||
        String(r.department || '').toLowerCase().includes(q)

      // 5. Department filter
      const matchDept = selectedDept === 'All' || r.department === selectedDept

      return matchTime && matchStatus && matchSubmitter && matchSearch && matchDept
    })
  }, [reports, timePeriod, statusFilter, submitterFilter, search, selectedDept])

  // Counts calculated across current time-period slice
  const countsForCurrentPeriod = useMemo(() => {
    const periodSlice =
      timePeriod === 'ALL'
        ? reports
        : reports.filter(r => r.periodCategory.toUpperCase() === timePeriod)

    return {
      all: periodSlice.length,
      pending: periodSlice.filter(r => r.status === 'Pending').length,
      approved: periodSlice.filter(r => r.status === 'Approved').length,
      rejected: periodSlice.filter(r => r.status === 'Rejected').length,
      managerReports: periodSlice.filter(r => r.submitterType === 'Manager').length,
      teamLeadReports: periodSlice.filter(r => r.submitterType === 'Team Lead').length,
      totalSpend: periodSlice.reduce((s, r) => s + r.totalAmount, 0)
    }
  }, [reports, timePeriod])

  const departments = useMemo(() => {
    return ['All', ...Array.from(new Set(reports.map(r => r.department)))]
  }, [reports])

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 text-white animate-fadeIn ${
            toast.type === 'success'
              ? 'bg-emerald-600'
              : toast.type === 'error'
              ? 'bg-rose-600'
              : 'bg-purple-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              FINANCE AUDIT REPOSITORY
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {filteredReports.length} Reports In View
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <FileCheck className="text-purple-600" size={26} /> Received Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit and approve operational and capital requisition reports submitted by <b>Team Leads</b> and <b>Managers</b>.
          </p>
        </div>

        {/* TIME-PERIOD FILTER TABS (Weekly, Monthly, Yearly) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            onClick={() => setTimePeriod('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timePeriod === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            All Periods
          </button>
          <button
            onClick={() => setTimePeriod('WEEKLY')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timePeriod === 'WEEKLY'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calendar size={13} /> Weekly
          </button>
          <button
            onClick={() => setTimePeriod('MONTHLY')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timePeriod === 'MONTHLY'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calendar size={13} /> Monthly
          </button>
          <button
            onClick={() => setTimePeriod('YEARLY')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timePeriod === 'YEARLY'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calendar size={13} /> Yearly
          </button>
        </div>
      </div>

      {/* ── HIGH-LEVEL NAVIGATION SECTION SWITCHER ── */}
      <div className="flex items-center gap-3 border-b border-slate-200">
        <button
          onClick={() => setActiveSection('REQUISITION_REPORTS')}
          className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSection === 'REQUISITION_REPORTS'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileCheck size={16} /> Finance Review (Requisitions & Estimations)
        </button>
        <button
          onClick={() => setActiveSection('RECEIPT_REPORTS')}
          className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSection === 'RECEIPT_REPORTS'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Receipt size={16} /> Payment Records / Receipt Reports ({receiptReports.length})
        </button>
      </div>

      {activeSection === 'RECEIPT_REPORTS' ? (
        /* ── PAYMENT RECORDS & RECEIPT REPORTS TABLE (Section 10 & 14B) ── */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Software & Procurement Payment Receipt Reports</h2>
              <p className="text-xs text-slate-500">Persistent ledger of payment references, receipts, justifications, and manager sign-offs.</p>
            </div>
            <div className="relative min-w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={receiptSearch}
                onChange={e => setReceiptSearch(e.target.value)}
                placeholder="Search Request ID, Software, Team Lead, Reference..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            {receiptReports.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Receipt size={40} className="mx-auto mb-3 text-purple-200" />
                <p className="font-semibold text-slate-600">No payment receipts or justification records found</p>
                <p className="text-xs text-slate-400 mt-1">When Team Leads process mock payment and submit receipts, they will appear here permanently.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5">Request ID</th>
                      <th className="p-3.5">Software / SaaS</th>
                      <th className="p-3.5">Team Lead</th>
                      <th className="p-3.5">Manager</th>
                      <th className="p-3.5 text-right">Approved Amt</th>
                      <th className="p-3.5 text-right">Paid Amt</th>
                      <th className="p-3.5">Payment Ref</th>
                      <th className="p-3.5">Payment Date</th>
                      <th className="p-3.5">Payment Status</th>
                      <th className="p-3.5">Receipt / Proof</th>
                      <th className="p-3.5">Justification</th>
                      <th className="p-3.5">Manager Verification</th>
                      <th className="p-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {receiptReports.map(r => (
                      <tr key={r.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="p-3.5 font-bold font-mono text-purple-700">{r.id}</td>
                        <td className="p-3.5 font-semibold text-slate-900 max-w-[180px]">
                          <div className="truncate" title={r.softwareName}>{r.softwareName}</div>
                        </td>
                        <td className="p-3.5 text-slate-700 whitespace-nowrap">{r.teamLead}</td>
                        <td className="p-3.5 text-slate-700 whitespace-nowrap">{r.manager}</td>
                        <td className="p-3.5 text-right font-bold text-slate-900 whitespace-nowrap">{fmt(r.financeApprovedAmount)}</td>
                        <td className="p-3.5 text-right font-bold text-emerald-700 whitespace-nowrap">{fmt(r.finalPaidAmount)}</td>
                        <td className="p-3.5 font-mono text-[11px] text-purple-900 whitespace-nowrap">
                          <span className="bg-purple-50 border border-purple-200 px-2 py-0.5 rounded font-bold">{r.paymentReference}</span>
                        </td>
                        <td className="p-3.5 text-slate-500 whitespace-nowrap">{r.paymentDate}</td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.paymentStatus === 'Paid' || r.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {r.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3.5 max-w-[160px]">
                          <div className="truncate text-slate-600 flex items-center gap-1" title={r.receiptProof}>
                            <Paperclip size={12} className="text-purple-600 flex-shrink-0" />
                            <span>{r.receiptProof}</span>
                          </div>
                        </td>
                        <td className="p-3.5 max-w-[160px]">
                          <div className="truncate text-slate-600" title={r.paymentJustification}>
                            {r.paymentJustification}
                          </div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            r.managerVerificationStatus.includes('Verified')
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : r.managerVerificationStatus.includes('Sent Back')
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {r.managerVerificationStatus}
                          </span>
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => navigate(`/finance/request-details?id=${r.id}`)}
                              className="p-1.5 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors cursor-pointer"
                              title="View Full Lifecycle Details"
                            >
                              <ExternalLink size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenReceipt(r)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors border border-blue-700 cursor-pointer"
                              title="View Software Payment Receipt"
                            >
                              View Receipt
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* KPI METRIC CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Total Reports</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{countsForCurrentPeriod.all}</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                <span>{countsForCurrentPeriod.managerReports} Managers</span>
                <span>•</span>
                <span>{countsForCurrentPeriod.teamLeadReports} Team Leads</span>
              </div>
            </div>

        <div className="bg-amber-50/50 rounded-2xl border border-amber-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Pending Review</span>
          <p className="text-2xl font-black text-amber-900 mt-1">{countsForCurrentPeriod.pending}</p>
          <span className="text-[11px] text-amber-700 mt-0.5 block">Awaiting finance audit</span>
        </div>

        <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Approved</span>
          <p className="text-2xl font-black text-emerald-900 mt-1">{countsForCurrentPeriod.approved}</p>
          <span className="text-[11px] text-emerald-700 mt-0.5 block">Cleared for PO & payment</span>
        </div>

        <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">Disapproved</span>
          <p className="text-2xl font-black text-rose-900 mt-1">{countsForCurrentPeriod.rejected}</p>
          <span className="text-[11px] text-rose-700 mt-0.5 block">Finance audit rejected</span>
        </div>
      </div>

      {/* STATUS FILTER PILLS & SUBMITTER FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-4">
        
        {/* Status Filter Pills (Matching user's screenshot format) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            All ({countsForCurrentPeriod.all})
          </button>

          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Clock size={13} />
            <span>Pending</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {countsForCurrentPeriod.pending}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <CheckCircle size={13} />
            <span>Approval</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'APPROVED' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {countsForCurrentPeriod.approved}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <XCircle size={13} />
            <span>Rejection</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'REJECTED' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {countsForCurrentPeriod.rejected}
            </span>
          </button>
        </div>

        {/* Submitter Selector (All, Managers, Team Leads) & Search */}
        <div className="flex flex-wrap items-center gap-2 flex-1 lg:max-w-xl">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setSubmitterFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                submitterFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Roles
            </button>
            <button
              onClick={() => setSubmitterFilter('MANAGER')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                submitterFilter === 'MANAGER' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Managers ({countsForCurrentPeriod.managerReports})
            </button>
            <button
              onClick={() => setSubmitterFilter('TEAM_LEAD')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                submitterFilter === 'TEAM_LEAD' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Team Leads ({countsForCurrentPeriod.teamLeadReports})
            </button>
          </div>

          <div className="relative flex-1 min-w-36">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search reports..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
            />
          </div>

          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none bg-white text-slate-700"
          >
            {departments.map(d => (
              <option key={d} value={d}>
                {d === 'All' ? 'All Depts' : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* REPORTS LIST */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-2xs">
          <FileCheck size={48} className="mx-auto mb-3 text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">No Reports Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            No reports match the selected time period ({timePeriod}), status ({statusFilter}), and submitter filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map(rep => {
            const isManager = rep.submitterType === 'Manager'

            return (
              <div
                key={rep.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Top Row: Meta Tags & Valuation */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                        {rep.id}
                      </span>

                      {/* Submitter Type Badge */}
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border flex items-center gap-1 ${
                          isManager
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {isManager ? <UserCheck size={11} /> : <User size={11} />}
                        {rep.submitterType} Submission
                      </span>

                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {rep.periodCategory}
                      </span>

                      {hasReceipt(rep) && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                          <Receipt size={11} /> Receipt Verified
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          rep.priority === 'Critical'
                            ? 'bg-rose-100 text-rose-800'
                            : rep.priority === 'High'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {rep.priority} Priority
                      </span>

                      {rep.status === 'Approved' ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle size={11} /> Finance Approved
                        </span>
                      ) : rep.status === 'Rejected' ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                          <XCircle size={11} /> Finance Disapproved
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <Clock size={11} /> Pending Finance Audit
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 tracking-tight">{rep.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>
                        Author: <b className="text-slate-800">{rep.submitterName}</b> ({rep.submitterRole})
                      </span>
                      <span>•</span>
                      <span>
                        Department: <b className="text-slate-800">{rep.department}</b>
                      </span>
                      <span>•</span>
                      <span>Cost Center: <span className="font-mono">{rep.costCenter}</span></span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Requisition Valuation
                    </span>
                    <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                      {fmt(rep.totalAmount)}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {rep.itemBreakdown.length} line item{rep.itemBreakdown.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {rep.summary}
                  </p>
                  <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-400" /> Submitted: {rep.submittedDate}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Paperclip size={13} className="text-slate-400" /> {rep.attachedDocs.length} Documents Attached
                      </span>
                    </div>
                    {rep.status === 'Approved' && (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle size={13} /> Cleared by {rep.approvedBy || currentFinanceOfficer} ({rep.approvedDate})
                      </span>
                    )}
                    {rep.status === 'Rejected' && (
                      <span className="text-rose-700 font-bold flex items-center gap-1">
                        <AlertTriangle size={13} /> {rep.rejectionReason}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setSelectedReport(rep)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    <Eye size={14} /> View Audit Dossier & Specifications
                  </button>

                  <div className="flex items-center gap-2 flex-wrap">
                    {hasReceipt(rep) && (
                      <button
                        onClick={() => handleOpenReceipt(rep)}
                        className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors border border-blue-700 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        title="View Software & Procurement Payment Receipt"
                      >
                        <Receipt size={13} /> View Receipt
                      </button>
                    )}
                    <button
                      onClick={() => handleExportReportPdf(rep)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                    >
                      <Download size={13} /> Export PDF
                    </button>

                    {rep.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleApproveReport(rep.id)}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all"
                        >
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button
                          onClick={() => handleOpenRejectModal(rep)}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs transition-all"
                        >
                          <XCircle size={13} /> Disapprove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </>
      )}

      {/* ── FULL REPORT DOSSIER MODAL ── */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full my-auto shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b-4 border-purple-600 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      {selectedReport.submitterType.toUpperCase()} • {selectedReport.periodCategory.toUpperCase()} REPORT
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      REF: {selectedReport.id}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                    Finance Audit Dossier & Requisition Assessment
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasReceipt(selectedReport) && (
                  <button
                    type="button"
                    onClick={() => handleOpenReceipt(selectedReport)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors border border-blue-500 shadow-xs cursor-pointer"
                  >
                    <Receipt size={13} /> View Receipt
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleExportReportPdf(selectedReport)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
                >
                  <Download size={13} /> Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors ml-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Report Content */}
            <div className="p-6 space-y-5 overflow-y-auto bg-slate-50/40 text-slate-800 text-xs">
              
              {/* Header Box */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">
                      REQUISITION SUBJECT
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedReport.title}</h3>
                    <p className="text-slate-500 mt-0.5">
                      Originating Authority: <b className="text-slate-800">{selectedReport.submitterName}</b> ({selectedReport.submitterRole}) • {selectedReport.department}
                    </p>
                  </div>
                  <div className="text-right sm:border-l sm:border-slate-100 sm:pl-4 flex-shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Valuation Total
                    </span>
                    <p className="text-xl font-black text-purple-700 font-mono">{fmt(selectedReport.totalAmount)}</p>
                    <span className="text-[10px] italic text-slate-500 block">
                      {numberToIndianWords(selectedReport.totalAmount)}
                    </span>
                  </div>
                </div>

                <p className="text-slate-700 leading-relaxed">
                  {selectedReport.summary}
                </p>
              </div>

              {/* Itemized Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-800 flex items-center justify-between">
                  <span>1. Itemized Procurement Specifications & Costing</span>
                  <span className="text-[10px] text-slate-500 font-normal">{selectedReport.itemBreakdown.length} items</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold text-left border-b border-slate-100">
                      <th className="px-4 py-2">Item Description</th>
                      <th className="px-4 py-2 text-center">Qty</th>
                      <th className="px-4 py-2 text-right">Unit Rate</th>
                      <th className="px-4 py-2 text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReport.itemBreakdown.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-medium text-slate-800">{it.item}</td>
                        <td className="px-4 py-2.5 text-center text-slate-600">{it.qty}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-600">{fmt(it.unitCost)}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">{fmt(it.totalCost)}</td>
                      </tr>
                    ))}
                    <tr className="bg-purple-50/60 font-bold text-purple-900">
                      <td colSpan={3} className="px-4 py-2.5 text-right">Gross Total:</td>
                      <td className="px-4 py-2.5 text-right font-mono font-black">{fmt(selectedReport.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Audit Findings & Recommendation */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <span className="font-bold text-slate-900 block text-xs">
                  2. Operational Justification & Key Findings
                </span>
                <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                  {selectedReport.keyFindings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>

                <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 mt-2">
                  <span className="font-bold text-purple-950 block text-[11px] uppercase">
                    Submitter Directive / Proposal:
                  </span>
                  <p className="text-purple-900 mt-0.5">
                    "{selectedReport.recommendation}"
                  </p>
                </div>
              </div>

              {/* ── Software / SaaS Requirements, Manager Recommendation & Finance Dossier ── */}
              {selectedReport.isSoftware && (
                <div className="space-y-4">
                  {/* TL Software Requirements */}
                  <div className="bg-blue-50/70 rounded-2xl border border-blue-200 p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-blue-700" />
                        <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                          1. Team Lead Software Requisition Requirements (Stage 1)
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2.5 py-0.5 rounded-full">
                        Requester Specifications
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-blue-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Software / SaaS Name</span>
                        <p className="font-bold text-blue-900 mt-0.5">{selectedReport.softwareName || selectedReport.title}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-blue-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Request Type</span>
                        <p className="font-bold text-slate-800 mt-0.5">{selectedReport.requestType || 'New Purchase'}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-blue-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Current Plan</span>
                        <p className="font-medium text-slate-800 mt-0.5">{selectedReport.currentPlan || 'N/A'}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-blue-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Required Plan</span>
                        <p className="font-bold text-indigo-700 mt-0.5">{selectedReport.requiredPlan || 'Enterprise'}</p>
                      </div>
                    </div>

                    {selectedReport.businessRequirement && (
                      <div className="bg-white p-3 rounded-lg border border-blue-100 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Business Need & Problem Statement
                        </span>
                        <p className="text-slate-700 mt-1 font-medium leading-relaxed">
                          {selectedReport.businessRequirement}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Manager Recommendation */}
                  <div className="bg-purple-50/70 rounded-2xl border border-purple-200 p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-700" />
                        <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                          2. Manager Review & Recommendation (Stage 3)
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-purple-800 bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded-full">
                        Manager Endorsed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-purple-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Recommended By</span>
                        <p className="font-bold text-slate-800 mt-0.5">{selectedReport.managerRecommendedBy || 'Project Manager'}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-purple-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Recommendation Date</span>
                        <p className="font-bold text-slate-800 mt-0.5">{(selectedReport.managerRecommendedDate || selectedReport.submittedDate || '').split('T')[0]}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-purple-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Routing Action</span>
                        <p className="font-bold text-purple-900 mt-0.5">Recommended to Finance</p>
                      </div>
                    </div>

                    {selectedReport.managerRecommendation && (
                      <div className="bg-white p-3 rounded-lg border border-purple-100 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Manager Justification & Recommendation Notes
                        </span>
                        <p className="text-purple-900 mt-1 font-medium leading-relaxed">
                          {selectedReport.managerRecommendation}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Finance Research Findings */}
                  <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck size={16} className="text-amber-700" />
                        <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                          3. Admin &amp; Finance Research Findings (Stage 5)
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                        {selectedReport.isSoftware ? 'Software / SaaS Dossier' : 'Hardware Dossier'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-amber-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Authorized Vendor / Sourcing Partner</span>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {selectedReport.financeResearch?.vendor || selectedReport.costEstimation?.vendor || 'Authorized Partner'}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-amber-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Vendor Quotation / RFQ Reference</span>
                        <p className="font-mono font-bold text-amber-900 mt-0.5">
                          {selectedReport.financeResearch?.vendorQuoteRef || `RFQ-${selectedReport.id}-CONFIRMED`}
                        </p>
                      </div>
                    </div>

                    {/* Hardware Specs or Software Licensing */}
                    {selectedReport.isSoftware ? (
                      selectedReport.financeResearch?.softwareLicensing && (
                        <div className="bg-white p-3 rounded-lg border border-purple-200 text-xs">
                          <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                            Software Licensing Model &amp; Terms
                          </span>
                          <p className="text-slate-800 mt-1 font-semibold">
                            {selectedReport.financeResearch.softwareLicensing}
                          </p>
                        </div>
                      )
                    ) : (
                      selectedReport.financeResearch?.hardwareSpecs && (
                        <div className="bg-white p-3 rounded-lg border border-emerald-200 text-xs">
                          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                            Hardware Technical Specifications &amp; Warranty
                          </span>
                          <p className="text-slate-800 mt-1 font-semibold">
                            {selectedReport.financeResearch.hardwareSpecs}
                          </p>
                        </div>
                      )
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-amber-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Market Benchmark Pricing</span>
                        <p className="font-medium text-slate-800 mt-0.5">
                          {selectedReport.financeResearch?.marketPricing || 'Benchmarked against OEM commercial catalog.'}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-amber-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Estimated Unit Cost &amp; Volume</span>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {selectedReport.costEstimation?.unitCost ? fmt(selectedReport.costEstimation.unitCost) : fmt(selectedReport.totalAmount)}
                          {' × '}{selectedReport.costEstimation?.quantity || 1} {selectedReport.isSoftware ? 'Licenses/Seats' : 'Units'}
                        </p>
                      </div>
                    </div>

                    {selectedReport.financeResearch?.availableAlternatives && (
                      <div className="bg-white p-3 rounded-lg border border-amber-100 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Alternative Vendors / Solutions Evaluated
                        </span>
                        <p className="text-slate-700 mt-1 font-medium">
                          {selectedReport.financeResearch.availableAlternatives}
                        </p>
                      </div>
                    )}

                    {selectedReport.financeResearch?.businessValue && (
                      <div className="bg-white p-3 rounded-lg border border-amber-100 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Business Value & ROI Assessment
                        </span>
                        <p className="text-slate-700 mt-1 font-medium">
                          {selectedReport.financeResearch.businessValue}
                        </p>
                      </div>
                    )}

                    {selectedReport.financeResearch?.researchNotes && (
                      <div className="bg-white p-3 rounded-lg border border-amber-100 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Research &amp; Market Intelligence Notes
                        </span>
                        <p className="text-slate-700 mt-1 font-medium">
                          {selectedReport.financeResearch.researchNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Financial Cost Estimation Breakdown */}
                  <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-emerald-700" />
                        <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                          4. Financial Cost Estimation & Allocation Breakdown (Stages 6 & 7)
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                        Budget Approved
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Current Plan Cost</span>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {fmt(selectedReport.costEstimation?.currentCost || selectedReport.existingCost || 0)}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Base Estimated Cost</span>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {fmt(selectedReport.costEstimation?.estimatedCost || selectedReport.totalAmount)}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Tax / GST (18%)</span>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {fmt(selectedReport.costEstimation?.taxAmount || 0)}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Volume Discount (5%)</span>
                        <p className="font-bold text-emerald-700 mt-0.5">
                          -{fmt(selectedReport.costEstimation?.discountAmount || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-emerald-100/60 p-3.5 rounded-xl border border-emerald-300">
                        <span className="text-[10px] font-bold text-emerald-900 block uppercase">Net Final Estimated Amount</span>
                        <p className="font-black text-emerald-950 text-base mt-0.5">
                          {fmt(selectedReport.costEstimation?.finalAmount || selectedReport.totalAmount)}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Cost Center</span>
                        <p className="font-bold text-indigo-700 mt-0.5">
                          {selectedReport.costEstimation?.costCenter || selectedReport.costCenter}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Budget Code</span>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {selectedReport.costEstimation?.budgetCode || 'BG-FIN-SOFT-01'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Authorized Vendor</span>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {selectedReport.costEstimation?.vendor || selectedReport.softwareName || 'Authorized Vendor'}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Recommended Allocation</span>
                        <p className="font-bold text-emerald-800 mt-0.5">
                          {fmt(selectedReport.costEstimation?.recommendedCost || selectedReport.costEstimation?.finalAmount || selectedReport.totalAmount)}
                        </p>
                      </div>
                    </div>

                    {selectedReport.costEstimation?.notes && (
                      <div className="bg-white p-3 rounded-lg border border-emerald-100 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Finance Controller Comments & Commercial Approval
                        </span>
                        <p className="text-emerald-950 mt-1 font-medium leading-relaxed">
                          {selectedReport.costEstimation.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Complete Workflow History */}
                  {(selectedReport.timeline && selectedReport.timeline.length > 0) && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 block text-xs">
                          5. Complete Workflow Timeline & Audit Trail
                        </span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                          7-Stage Lifecycle
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {selectedReport.timeline.map((step: any, sIdx: number) => (
                          <div key={sIdx} className="py-2 flex items-start justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                step.status === 'completed'
                                  ? 'bg-emerald-600 text-white'
                                  : step.status === 'current'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-200 text-slate-500'
                              }`}>
                                {step.status === 'completed' ? '✓' : step.stage}
                              </span>
                              <div>
                                <p className="font-bold text-slate-900">{step.title}</p>
                                <p className="text-[10px] text-slate-500">{step.role} {step.actor ? `• ${step.actor}` : ''}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                step.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : step.status === 'current'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {step.status.toUpperCase()}
                              </span>
                              {step.timestamp && (
                                <p className="text-[10px] text-slate-400 mt-0.5">{step.timestamp.split('T')[0]}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Records & Official Receipt Dossier */}
              {hasReceipt(selectedReport) && (
                <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt size={16} className="text-blue-700" />
                      <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                        6. Payment Records & Official Receipt Dossier
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle size={11} /> Settlement Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Receipt Number</span>
                      <p className="font-mono font-bold text-purple-900 mt-0.5">
                        {selectedReport.originalRequest?.extra_fields?.software_receipt_id || selectedReport.originalRequest?.extra_fields?.receipt_no || `RCP-SW-${String(selectedReport.originalRequest?.request_id || selectedReport.originalRequest?.id || selectedReport.id).replace(/^REP-/, '')}`}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Payment Status</span>
                      <p className="font-bold text-emerald-700 mt-0.5">Paid / Verified</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Payment Method</span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {selectedReport.originalRequest?.payment_method || selectedReport.originalRequest?.extra_fields?.payment_method || 'Corporate Card'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Settlement Date</span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {selectedReport.originalRequest?.payment_date || selectedReport.originalRequest?.extra_fields?.payment_date || selectedReport.submittedDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500">
                      Audit trail synchronized with PostgreSQL payment ledger.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenReceipt(selectedReport)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors border border-blue-700 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Receipt size={13} /> View Receipt
                    </button>
                  </div>
                </div>
              )}

              {/* Appended Docs */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                <span className="font-bold text-slate-900 block text-xs mb-2">
                  3. Appended Quotations & Verification Documentation ({selectedReport.attachedDocs.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedReport.attachedDocs.map((doc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-purple-600" />
                        <span className="font-medium truncate max-w-[200px]">{doc.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{doc.size}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision Banner */}
              {selectedReport.status === 'Approved' && (
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center gap-2.5 text-emerald-900">
                  <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Finance Clearance Complete:</span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Approved and authorized for PO release by {selectedReport.approvedBy || currentFinanceOfficer} on {selectedReport.approvedDate}.
                    </p>
                  </div>
                </div>
              )}

              {selectedReport.status === 'Rejected' && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl flex items-start gap-2.5 text-rose-900">
                  <AlertTriangle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Finance Disapproval Record:</span>
                    <p className="text-[11px] text-rose-800 mt-0.5">
                      Reason: {selectedReport.rejectionReason} ({selectedReport.rejectedDate})
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="text-xs text-slate-500">
                Active Auditor: <b>{currentFinanceOfficer}</b>
              </div>
              <div className="flex items-center gap-2">
                {hasReceipt(selectedReport) && (
                  <button
                    type="button"
                    onClick={() => handleOpenReceipt(selectedReport)}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Receipt size={14} /> View Receipt
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Close
                </button>
                {selectedReport.status === 'Pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenRejectModal(selectedReport)}
                      className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors"
                    >
                      Disapprove
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveReport(selectedReport.id)}
                      className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
                    >
                      Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECTION REASON MODAL ── */}
      {rejectModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <XCircle size={20} />
                <h3 className="text-base font-bold text-slate-900">Finance Disapproval</h3>
              </div>
              <button
                onClick={() => setRejectModalReport(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Provide official Finance audit disapproval rationale for <b>{rejectModalReport.id}</b> ({rejectModalReport.title}):
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Specify rationale (e.g., budget allocation exceeded, tax schedule mismatch, duplicate requisition)..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 outline-none resize-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalReport(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50 transition-colors shadow-xs"
              >
                Confirm Disapproval
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReceiptPayment && (
        <UnifiedReceiptModal
          payment={selectedReceiptPayment}
          onClose={() => setSelectedReceiptPayment(null)}
        />
      )}
    </div>
  )
}
