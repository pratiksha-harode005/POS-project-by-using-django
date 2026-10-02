import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  PermissionMatrix,
  RoleKey,
  ModuleId,
  ActionKey,
  AuditLogEntry,
  DEFAULT_PERMISSION_MATRIX,
  fetchPermissionsApi,
  savePermissionsApi,
  resetRolePermissionsApi,
  checkPermission,
  getAuditLogsApi
} from '../api/permissionsApi'
import { detectWorkflowType } from '../utils/workflowUtils'
import {
  getDashboardStats,
  getPendingRequests,
  approveRequestApi,
  rejectRequestApi,
  recommendToAdminApi,
  recommendToFinanceApi,
  sendToFinanceApi,
  getBudgets,
  getRFQs,
  createRFQApi,
  selectVendorQuotationApi,
  createPaymentApi,
  disbursePaymentApi,
  apiClient
} from '../api/managerApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RequestStatus =
  | 'pending_arrival'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'recommended_to_finance'
  | 'finance_review'
  | 'sent_to_finance'
  | 'finance_approved'
  | 'finance_rejected'
  | 'finance_on_hold'
  | 'clarification_requested'
  | 'recommended_to_admin'
  | 'rfq_sent'
  | 'quotes_received'
  | 'assigned_to_vendor'
  | 'vendor_accepted'
  | 'vendor_rejected'
  | 'delivered'
  | 'invoiced'
  | 'payment_pending'
  | 'completed'

export type RFQStatus = 'draft' | 'sent' | 'quotes_received' | 'under_evaluation' | 'awarded' | 'expired'

export interface ApprovalParameters {
  requestedAmount: number
  approvedAmount: number
  budgetAvailable: 'Yes' | 'No'
  costCenter: string
  vendor: string
  commercialEvaluation: 'Completed' | 'Pending' | 'Not Required'
  businessJustification: string
  businessImpact: string
  riskCompliance: 'Passed' | 'Pending' | 'Failed' | 'Not Required'
  approvalComments: string
  approvedBy: string
  approvedAt: string
}

export interface ProcurementRequest {
  id: string
  title: string
  requester: string
  department: string
  category: string
  subcategory?: string
  amount: number
  total_estimated_cost?: number
  estimated_cost?: number
  estimatedCost?: number
  requestedAmount?: number
  requested_amount?: number
  originalRequestedAmount?: number
  original_requested_amount?: number
  approvedAmount?: number
  approved_amount?: number
  quantity?: number
  requiredBy?: string
  deliveryLocation?: string
  currentStage?: number
  date: string
  createdAt?: string
  created_at?: string
  status: RequestStatus
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  vendor?: string
  costCenter?: string
  description?: string
  justification?: string
  flowType?: string
  extraFields?: Record<string, any>
  approvalParams?: ApprovalParameters
  rejectionReason?: string
  rejectedBy?: string
  rejectedDate?: string
  recommendationReason?: string
  history?: any[]
  recommendedBy?: string
  recommendedDate?: string
  approvedBy?: string
  approvedDate?: string
  financeStatus?: string
  financeApprovedBy?: string
  financeApprovedDate?: string
  financeComment?: string
  financeHoldReason?: string
  clarificationMessage?: string
  isForwardedToFinance?: boolean
  approvalLevel?: string
  paymentStatus?: 'Unpaid' | 'Pending' | 'Processing' | 'Paid' | 'On Hold'
  documents?: { name: string; type: string; url?: string; size?: string }[]
  vendorId?: string
  assignedVendorDate?: string
  vendorAcceptedDate?: string
  vendorRejectedReason?: string
  deliveryDetails?: {
    grnNumber: string
    deliveryDate: string
    receivedQty: number
    acceptedQty: number
    docName?: string
    carrier?: string
  }
  invoiceDetails?: {
    invoiceNumber: string
    invoiceDate: string
    dueDate?: string
    amount: number
    taxAmount: number
    gstNumber?: string
    docName?: string
  }
  paidDate?: string
  paymentTransactionRef?: string
  poNumber?: string
  po_number?: string
  grnNumber?: string
  grn_number?: string
  rfqId?: string
  rfq_id?: string
  currentlyWith?: string
  currently_with?: string
  updatedAt?: string
  updated_at?: string
  lastUpdated?: string
}

export interface RFQVendor {
  name: string
  invitedOn: string
  response: 'Received' | 'Pending' | 'Declined'
  quote?: number
  deliveryDays?: number
  warranty?: string
  paymentTerms?: string
}

export interface RFQItem {
  product: string
  specification: string
  quantity: number
  expectedPrice: number
  requiredBy: string
}

export interface RFQ {
  id: string
  title: string
  department: string
  category?: string
  subcategory?: string
  status: RFQStatus
  estimatedAmount: number
  deadline: string
  createdBy: string
  createdDate: string
  vendors: RFQVendor[]
  items: RFQItem[]
  remarks?: string
}

export interface BudgetDepartment {
  department: string
  category: string
  totalBudget: number
  allocated: number
  committed: number
  spent: number
  available: number
  pending: number
}

export interface PaymentDataPoint {
  period: string
  approved: number
  paid: number
  pending: number
}

export interface TicketDocument {
  id: string
  title?: string
  vendor?: string
  date?: string
  invoiceDate?: string
  receivedDate?: string
  amount?: number
  totalAmount?: number
  baseAmount?: number
  gstPercent?: number
  gstRate?: number
  invoiceAmount?: number
  receivedQty?: number
  acceptedQty?: number
  unit?: string
  taxAmount?: number
  gstNumber?: string
  productDetails?: string
  warrantyDuration?: string
  warrantyType?: string
  freeServiceCount?: string
  installationType?: string
  techSupportDuration?: string
  replacementPolicy?: string
  accessoriesIncluded?: string
  leadTime?: string
  expectedDeliveryDate?: string
  notes?: string
  quoteValidity?: string
  grnDocNumber?: string
  receiptNumber?: string
  verified: boolean
  verifiedBy?: string
  verifiedAt?: string
}

export interface TicketProduct {
  id: string
  name: string
  category?: string
  quantity: number
  unit: string
  vendor: string
  pricePerUnit: number
  totalAmount: number
  baseAmount?: number
  gstPercent?: number
  gstRate?: number
  taxAmount?: number
  warrantyDuration?: string
  warrantyType?: string
  freeServiceCount?: string
  installationType?: string
  techSupportDuration?: string
  replacementPolicy?: string
  accessoriesIncluded?: string
  leadTime?: string
  expectedDeliveryDate?: string
  notes?: string
  quoteValidity?: string
  grnDocNumber?: string
  receiptNumber?: string
  productOrder: TicketDocument
  goodsReceipt: TicketDocument
  invoice: TicketDocument
  submitted: boolean
  submittedBy?: string
  submittedAt?: string
  paymentSettled?: boolean
  paymentDate?: string
  utrRef?: string
  paymentMethod?: string
  referenceNumber?: string
}

export interface RaiseTicket {
  id: string
  requestId: string
  requestTitle: string
  requestAmount: number
  department?: string
  createdDate?: string
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
  products: TicketProduct[]
  // Backward compatibility convenience fields referencing primary product
  productOrder: TicketDocument
  goodsReceipt: TicketDocument
  invoice: TicketDocument
  submitted: boolean
  submittedBy?: string
  submittedAt?: string
}

export type PaymentStatus = 'Pending' | 'Processing' | 'Paid' | 'Failed' | 'On Hold'

export interface PaymentRecord {
  id: string
  requestId: string
  requestTitle: string
  vendor: string
  invoiceId: string
  poNumber: string
  grnNumber?: string
  amount: number
  taxAmount: number
  dueDate: string
  paymentDate?: string
  paymentMethod: string
  status: PaymentStatus
  disbursedByRole?: string
  notes?: string
  transactionRef?: string
  referenceNumber?: string
  reference_number?: string
  history?: { timestamp: string; actor: string; action: string; note?: string }[]
}

export type ComplaintStatus = 'Submitted' | 'Under Review' | 'Vendor Notified' | 'Action Taken' | 'Resolved' | 'Closed'

export interface Complaint {
  id: string
  productName: string
  productId: string
  serialNumber: string
  poNumber: string
  grnNumber: string
  vendor: string
  deliveryDate: string
  complaintType: string
  defectiveQuantity: number
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  issueDescription: string
  resolutionRequested: string
  status: ComplaintStatus
  createdBy: string
  createdDate: string
  evidenceImages?: string[]
  supportingDocuments?: string[]
  comments?: { id: string; author: string; role: string; date: string; message: string }[]
  auditTrail: { timestamp: string; actor: string; action: string; previousStatus?: string; newStatus?: string; comment?: string }[]
}

export interface FinanceAuditItem {
  id: string
  requestId: string
  requestTitle: string
  actor: string
  action: 'APPROVED' | 'REJECTED' | 'PUT_ON_HOLD' | 'CLARIFICATION_REQUESTED' | 'RECOMMENDED_TO_ADMIN'
  timestamp: string
  reason?: string
  comment?: string
  amount: number
  paymentStatus?: string
}

export interface DashboardStats {
  pendingApprovals: number
  myApprovals: number
  rejectedRequests: number
  financeReview: number
  totalRequestValue: number
  requestArrival: number
}

export interface FinanceKPIs {
  totalBudget: number
  availableBudget: number
  committedBudget: number
  spentBudget: number
  allocatedBudget: number
  pendingInvoicesCount: number
  pendingInvoicesAmount: number
  invoiceExceptionsCount: number
  invoiceExceptionsAmount: number
  pendingPaymentsCount: number
  pendingPaymentsAmount: number
  paidAmount: number
  paidPaymentsCount: number
}

export interface VendorItem {
  id: string
  name: string
  company: string
  contactPerson: string
  email: string
  phone: string
  category: string
  status: 'Active' | 'Pending Approval' | 'Suspended' | 'Rejected'
  riskLevel: 'Low' | 'Medium' | 'High'
  performanceScore: number
  activeContracts: number
  totalOrders: number
  totalPurchaseValue: number
  complianceStatus: 'Verified' | 'Pending Audit' | 'Action Required'
  documentsCount: number
  onTimeDeliveryRate: number
  qualityIssuesCount: number
  complaintsCount: number
  registeredDate: string
  approvalDate?: string
  notes?: string
}

export interface PurchaseOrderItem {
  id: string
  poNumber: string
  requestId: string
  requestTitle: string
  procurementType?: 'HARDWARE' | 'SOFTWARE'
  category?: string
  vendor: string
  vendorId?: string
  submittedBy?: string
  submittedByRole?: string
  submissionDate?: string
  poDate: string
  items: { product: string; quantity: number; unitPrice: number; total: number }[]
  quantity: number
  totalAmount: number
  deliveryDate: string
  status: 'Draft' | 'Approved' | 'Sent to Vendor' | 'Acknowledged' | 'Partially Delivered' | 'Delivered' | 'Closed' | 'Cancelled'
  paymentStatus: 'Pending' | 'Processing' | 'Paid' | 'On Hold'
  terms?: string
  document_verification?: any
  document_verification_status?: string
  base_amount?: number
  baseAmount?: number
  gst_rate?: number
  gstPercent?: number
  tax_amount?: number
  taxAmount?: number
}

export interface VendorInvoice {
  id: string
  invoiceNumber: string
  poId: string
  poNumber: string
  requestId: string
  requestTitle: string
  procurementType?: 'HARDWARE' | 'SOFTWARE'
  vendor: string
  vendorId?: string
  submittedBy?: string
  submittedByRole?: string
  submissionDate?: string
  documentType?: 'Tax Invoice' | 'Commercial Bill' | 'Software License Agreement' | 'Cloud Subscription Invoice' | 'Payment Receipt' | string
  documentUrl?: string
  gstNumber?: string
  invoiceDate: string
  dueDate: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  base_amount?: number
  baseAmount?: number
  gst_rate?: number
  gstPercent?: number
  tax_amount?: number
  status: 'Pending Review' | 'Accepted' | 'Rejected'
  rejectionReason?: string
  rejectedAt?: string
  rejectedBy?: string
  acceptedAt?: string
  acceptedBy?: string
  items: { product: string; quantity: number; unitPrice: number; total: number }[]
  notes?: string
}

export interface GoodsReceiptItem {
  id: string
  grnNumber: string
  poNumber: string
  requestId: string
  vendor: string
  receivedDate: string
  product: string
  orderedQuantity: number
  receivedQuantity: number
  damagedQuantity: number
  inspectionStatus: 'Passed' | 'Inspection Pending' | 'Discrepancy Found'
  receivedBy: string
  status: 'Verified' | 'Pending Verification' | 'Rejected'
  warehouseLocation?: string
}

export interface ContractItem {
  id: string
  vendor: string
  vendorId?: string
  contractType: 'Master Services Agreement' | 'Annual Maintenance' | 'Fixed Price Supply' | 'SaaS License' | 'Consulting Framework'
  startDate: string
  endDate: string
  contractValue: number
  renewalDate: string
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Draft' | 'Terminated'
  documentsCount: number
  documentUrl?: string
  autoRenew: boolean
  signedBy: string
}

export interface QuotationItem {
  id: string
  rfqId: string
  rfqTitle: string
  vendor: string
  vendorId?: string
  product?: string
  specification?: string
  quoteDate: string
  validUntil: string
  unitPrice: number
  quantity: number
  baseAmount?: number
  price?: number
  gstRate?: number
  gstPercent?: number
  gstAmount?: number
  taxAmount: number
  shippingCost: number
  discountAmount: number
  totalAmount: number
  unitLandedPrice?: number
  deliveryDays: number
  warranty: string
  paymentTerms: string
  complianceRating: string
  performanceScore: number
  status: 'Under Evaluation' | 'Shortlisted' | 'Selected' | 'Rejected'
  notes?: string
  currency?: string
  deliveryTerms?: string
  technicalCompliance?: string
  commercialCompliance?: string
  vendorRating?: number
  documentUrl?: string
  selectedBy?: string
  selectedAt?: string
  selectionNotes?: string

  // Vendor Detailed Submission Fields
  productQty?: string
  warrantyType?: string
  freeServiceCount?: string
  installationType?: string
  techSupportDuration?: string
  replacementPolicy?: string
  accessoriesIncluded?: string
  expectedDeliveryDate?: string
  submittedAt?: string
}

export const isFinanceRelevantRequest = (r?: ProcurementRequest | null): boolean => {
  if (!r) return false
  // If explicitly not escalated or is a Manager-only Stage 1 pending request, exclude from Finance
  if (r.financeStatus === 'Not Escalated') return false
  const isFinanceUser = (r.requester || '').toLowerCase().includes('finance') || (r as any).created_by_detail?.role === 'FINANCE'
  if (!isFinanceUser && (r.currentStage ?? 1) === 1 && !r.isForwardedToFinance && (r.status === 'pending_approval' || r.status === 'pending_arrival')) {
    return false
  }
  const rawSt = String(r.status || '').toLowerCase()
  if (rawSt === 'rejected' && !r.rejectedBy?.toLowerCase().includes('finance')) {
    return false
  }

  // A request belongs to Finance if it involves Finance, originated from Finance, or progressed beyond Stage 1:
  if (isFinanceUser) return true
  if (r.isForwardedToFinance) return true
  if (typeof r.currentStage === 'number' && r.currentStage >= 2) return true
  if (
    r.status === 'finance_review' ||
    r.status === 'recommended_to_finance' ||
    r.status === 'sent_to_finance' ||
    r.status === 'finance_approved' ||
    r.status === 'finance_rejected' ||
    r.status === 'finance_on_hold' ||
    r.status === 'recommended_to_admin'
  ) {
    return true
  }
  if (r.financeApprovedBy || r.financeApprovedDate) return true
  if (
    Array.isArray(r.history) &&
    r.history.some((h: any) =>
      (typeof h.actorRole === 'string' && h.actorRole.toUpperCase().includes('FINANCE')) ||
      h.action === 'RECOMMEND' ||
      (typeof h.remark === 'string' && h.remark.toLowerCase().includes('finance'))
    )
  ) {
    return true
  }
  if (r.financeStatus && r.financeStatus !== 'Not Escalated' && r.financeStatus !== 'Pending' && r.financeStatus !== 'Not Forwarded') {
    return true
  }

  return false
}

// ─── Context Type ─────────────────────────────────────────────────────────────

interface ManagerDataContextType {
  // Requests Data
  arrivedRequests: ProcurementRequest[]
  pendingApprovals: ProcurementRequest[]
  myApprovals: ProcurementRequest[]
  rejectedRequests: ProcurementRequest[]
  financeReview: ProcurementRequest[]
  recommendedToFinance: ProcurementRequest[]
  recommendedToAdmin: ProcurementRequest[]
  allRequests: ProcurementRequest[]

  // Finance Specific Requests Lists
  financeRequests: ProcurementRequest[]
  pendingFinancialApprovals: ProcurementRequest[]
  approvedFinanceRequests: ProcurementRequest[]
  rejectedFinanceRequests: ProcurementRequest[]
  financePayments: PaymentRecord[]
  financePaymentData: { weekly: PaymentDataPoint[]; monthly: PaymentDataPoint[]; yearly: PaymentDataPoint[] }

  // Module Data
  rfqs: RFQ[]
  budgets: BudgetDepartment[]
  paymentData: { weekly: PaymentDataPoint[]; monthly: PaymentDataPoint[]; yearly: PaymentDataPoint[] }
  tickets: RaiseTicket[]
  payments: PaymentRecord[]
  complaints: Complaint[]
  financeAuditHistory: FinanceAuditItem[]
  vendors: VendorItem[]
  purchaseOrders: PurchaseOrderItem[]
  invoices: VendorInvoice[]
  receipts: GoodsReceiptItem[]
  contracts: ContractItem[]
  quotations: QuotationItem[]

  // Stats
  dashboardStats: DashboardStats
  financeKPIs: FinanceKPIs

  // Manager Actions
  acceptRequest: (id: string) => void
  rejectRequest: (id: string, reason: string, notes?: string) => void
  recommendToFinance: (id: string, reason: string) => void
  approveRequest: (id: string, notes?: string, approvalParams?: ApprovalParameters) => void
  selectVendorQuotation: (quoteId: string, rfqId: string, product: string, notes?: string) => void
  addRFQ: (rfqData: RFQ) => void
  sendToFinance: (id: string, message?: string) => void
  verifyDocument: (
    ticketId: string,
    productIdOrDocType: string,
    docTypeOrVerifiedBy?: 'productOrder' | 'goodsReceipt' | 'invoice' | string,
    verifiedBy?: string
  ) => void
  submitTicket: (ticketId: string, submittedBy: string, productId?: string) => void
  submitProductTicket?: (ticketId: string, productId: string, submittedBy: string) => void
  acceptVendorInvoice: (invoiceId: string, actor?: string) => void
  rejectVendorInvoice: (invoiceId: string, reason: string, notes?: string, actor?: string) => void

  // Finance Actions
  approveFinanceRequest: (id: string, comment?: string, actor?: string, approvedAmount?: number) => void
  rejectFinanceRequest: (id: string, reason: string, comment?: string, actor?: string) => void
  holdFinanceRequest: (id: string, reason: string, actor?: string) => void
  requestClarification: (id: string, message: string, actor?: string) => void
  recommendToHigherAuthority: (id: string, reason: string, comment?: string, actor?: string) => Promise<void>
  adminApproveRequest: (id: string, comment?: string, actor?: string, approvedAmount?: number) => void
  adminRejectRequest: (id: string, reason: string, comment?: string, actor?: string) => void
  adminReturnRequest: (id: string, feedback: string, actor?: string) => void

  // Admin Module Actions
  updateVendorStatus: (vendorId: string, status: VendorItem['status']) => void
  addVendor: (vendor: Omit<VendorItem, 'id' | 'registeredDate'> & Partial<VendorItem>) => void
  updatePOStatus: (poId: string, status: PurchaseOrderItem['status']) => void
  verifyReceipt: (grnId: string, verifiedBy: string) => void
  renewContract: (contractId: string, newEndDate: string) => void

  // Payment Actions
  disbursePayment: (paymentId: string, actor?: string) => void
  updatePaymentStatus: (paymentId: string, status: PaymentStatus, actor?: string, notes?: string) => void

  // Vendor Lifecycle & Raise Ticket Pipeline Actions
  assignVendorToRequest: (requestId: string, vendorName: string, vendorId?: string, quoteAmount?: number, quoteId?: string) => void
  vendorAcceptRequest: (requestId: string, vendorId?: string, notes?: string) => void
  vendorRejectRequest: (requestId: string, vendorId?: string, reason?: string) => void
  vendorSubmitDeliveryAndInvoice: (
    requestId: string,
    deliveryData: { grnNumber: string; deliveryDate: string; receivedQty: number; acceptedQty: number; carrier?: string; docName?: string },
    invoiceData: { invoiceNumber: string; invoiceDate: string; amount: number; taxAmount: number; gstNumber?: string; docName?: string }
  ) => void
  makePayment: (
    requestId: string,
    ticketId?: string,
    paymentDetails?: {
      amount?: number
      paymentMethod?: string
      transactionRef?: string
      referenceNumber?: string
      productId?: string
      notes?: string
      details?: Record<string, any>
    }
  ) => {
    utrRef: string
    referenceNumber?: string
    paymentMethod?: string
    amount: number
    date: string
    vendor: string
    notes?: string
    details?: Record<string, any>
  }

  // Complaint Actions
  addComplaint: (complaint: Omit<Complaint, 'id' | 'createdDate' | 'auditTrail' | 'status'> & Partial<Complaint>) => void
  updateComplaintStatus: (id: string, newStatus: ComplaintStatus, actor: string, comment?: string) => void
  addComplaintComment: (id: string, author: string, role: string, message: string) => void

  // Enterprise RBAC & Governance
  permissionMatrix: PermissionMatrix
  updatePermissions: (matrix: PermissionMatrix, actor?: string, targetRole?: RoleKey) => Promise<{ success: boolean; message: string }>
  resetRolePermissions: (role: RoleKey, actor?: string) => Promise<PermissionMatrix>
  checkUserPermission: (module: ModuleId, action: ActionKey, context?: any) => boolean
  auditLogs: AuditLogEntry[]

  // Loading/error
  loading: boolean
}

// ─── Mock Data (Empty defaults for dynamic PostgreSQL database backend) ───────

const MOCK_ARRIVED: ProcurementRequest[] = []
const MOCK_PENDING_APPROVALS: ProcurementRequest[] = []
const MOCK_MY_APPROVALS: ProcurementRequest[] = []
const MOCK_REJECTED: ProcurementRequest[] = []
const MOCK_FINANCE_REVIEW: ProcurementRequest[] = []
const MOCK_RECOMMENDED: ProcurementRequest[] = []
const MOCK_RECOMMENDED_TO_ADMIN: ProcurementRequest[] = []
const MOCK_BUDGETS: BudgetDepartment[] = []
export function computePaymentAnalytics(
  payments: PaymentRecord[] = [],
  allRequests: ProcurementRequest[] = []
): { weekly: PaymentDataPoint[]; monthly: PaymentDataPoint[]; yearly: PaymentDataPoint[] } {
  const MONTH_INDEX_MAP: Record<number, string> = {
    0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
    6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec'
  }

  // Monthly buckets: 6-month standard window
  const monthlyKeys = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
  const monthlyMap: Record<string, { approved: number; paid: number; pending: number }> = {}
  monthlyKeys.forEach(k => { monthlyMap[k] = { approved: 0, paid: 0, pending: 0 } })

  // Weekly buckets
  const weeklyKeys = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
  const weeklyMap: Record<string, { approved: number; paid: number; pending: number }> = {}
  weeklyKeys.forEach(k => { weeklyMap[k] = { approved: 0, paid: 0, pending: 0 } })

  // Yearly buckets
  const yearlyKeys = ['2024', '2025', '2026', '2027']
  const yearlyMap: Record<string, { approved: number; paid: number; pending: number }> = {}
  yearlyKeys.forEach(k => { yearlyMap[k] = { approved: 0, paid: 0, pending: 0 } })

  // 1. Process all payments (disbursements & pending obligations)
  payments.forEach((p) => {
    const amt = Number(p.amount) || 0
    if (amt <= 0) return

    const dateStr = p.paymentDate || p.dueDate || ''
    const d = dateStr ? new Date(dateStr) : new Date()
    const validDate = !isNaN(d.getTime()) ? d : new Date()

    const mName = MONTH_INDEX_MAP[validDate.getMonth()] || 'Sep'
    const day = validDate.getDate()
    const yr = String(validDate.getFullYear())

    let weekKey = 'Week 4'
    if (day <= 7) weekKey = 'Week 1'
    else if (day <= 14) weekKey = 'Week 2'
    else if (day <= 21) weekKey = 'Week 3'
    else weekKey = 'Week 4'

    const isPaid = p.status === 'Paid'
    const isPending = p.status === 'Pending' || p.status === 'Processing'

    if (isPaid) {
      if (monthlyMap[mName]) monthlyMap[mName].paid += amt
      else if (monthlyMap['Sep']) monthlyMap['Sep'].paid += amt

      if (weeklyMap[weekKey]) weeklyMap[weekKey].paid += amt
      if (yearlyMap[yr]) yearlyMap[yr].paid += amt
      else if (yearlyMap['2026']) yearlyMap['2026'].paid += amt
    } else if (isPending) {
      if (monthlyMap[mName]) monthlyMap[mName].pending += amt
      else if (monthlyMap['Sep']) monthlyMap['Sep'].pending += amt

      if (weeklyMap[weekKey]) weeklyMap[weekKey].pending += amt
      if (yearlyMap[yr]) yearlyMap[yr].pending += amt
      else if (yearlyMap['2026']) yearlyMap['2026'].pending += amt
    }
  })

  // 2. Process all approved requests for budget committed / approved volume
  allRequests.forEach((req) => {
    const amt = Number(req.amount) || 0
    if (amt <= 0 || req.status === 'rejected') return

    const isApproved =
      (req.currentStage ?? 1) >= 4 ||
      req.status === 'approved' ||
      req.status === 'quotes_received' ||
      req.status === 'assigned_to_vendor' ||
      req.status === 'delivered' ||
      req.status === 'invoiced' ||
      req.status === 'completed' ||
      Boolean(req.approvedBy)

    if (isApproved) {
      const dateStr = req.approvedDate || req.date || ''
      const d = dateStr ? new Date(dateStr) : new Date()
      const validDate = !isNaN(d.getTime()) ? d : new Date()

      const mName = MONTH_INDEX_MAP[validDate.getMonth()] || 'Sep'
      const day = validDate.getDate()
      const yr = String(validDate.getFullYear())

      let weekKey = 'Week 4'
      if (day <= 7) weekKey = 'Week 1'
      else if (day <= 14) weekKey = 'Week 2'
      else if (day <= 21) weekKey = 'Week 3'
      else weekKey = 'Week 4'

      if (monthlyMap[mName]) monthlyMap[mName].approved += amt
      else if (monthlyMap['Sep']) monthlyMap['Sep'].approved += amt

      if (weeklyMap[weekKey]) weeklyMap[weekKey].approved += amt
      if (yearlyMap[yr]) yearlyMap[yr].approved += amt
      else if (yearlyMap['2026']) yearlyMap['2026'].approved += amt
    }
  })

  return {
    monthly: monthlyKeys.map((k) => ({
      period: k,
      approved: monthlyMap[k]?.approved || 0,
      paid: monthlyMap[k]?.paid || 0,
      pending: monthlyMap[k]?.pending || 0,
    })),
    weekly: weeklyKeys.map((k) => ({
      period: k,
      approved: weeklyMap[k]?.approved || 0,
      paid: weeklyMap[k]?.paid || 0,
      pending: weeklyMap[k]?.pending || 0,
    })),
    yearly: yearlyKeys.map((k) => ({
      period: k,
      approved: yearlyMap[k]?.approved || 0,
      paid: yearlyMap[k]?.paid || 0,
      pending: yearlyMap[k]?.pending || 0,
    })),
  }
}

const isMockKey = (k: string) => {
  if (!k) return true
  const upper = k.toUpperCase()
  return upper.includes('MOCK') ||
    upper.includes('TRK-EXPRESS') ||
    upper.includes('3PROD')
}

export const isMockRfq = (id?: string) => {
  if (!id) return true
  const upper = id.toUpperCase().trim()
  return /^RFQ-2026-0\d+/i.test(upper) || upper === 'RFQ-2026-001'
}

export function getVerifiedInvoiceRefs(): string[] {
  try {
    const saved = localStorage.getItem('kss_manager_verified_invoices')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function isInvoiceVerifiedInSystem(refOrId?: string): boolean {
  if (!refOrId) return false
  const verifiedList = getVerifiedInvoiceRefs()
  const cleanTarget = String(refOrId).replace(/^(INV-[A-Z0-9]+-|INV-)/i, '').trim().toUpperCase()
  if (!cleanTarget) return false
  return verifiedList.some((v) => {
    const cleanV = String(v).replace(/^(INV-[A-Z0-9]+-|INV-)/i, '').trim().toUpperCase()
    return cleanV === cleanTarget || v === refOrId
  })
}

export function getVerifiedGrnRefs(): string[] {
  try {
    const saved = localStorage.getItem('kss_manager_verified_grns')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function isGrnVerifiedInSystem(refOrId?: string): boolean {
  if (!refOrId) return false
  const verifiedList = getVerifiedGrnRefs()
  const cleanTarget = String(refOrId).replace(/^(REC-[A-Z0-9]+-|REC-|GRN-)/i, '').trim().toUpperCase()
  if (!cleanTarget) return false
  return verifiedList.some((v) => {
    const cleanV = String(v).replace(/^(REC-[A-Z0-9]+-|REC-|GRN-)/i, '').trim().toUpperCase()
    return cleanV === cleanTarget || v === refOrId
  })
}

// ─── DYNAMIC RAISE TICKET GENERATOR FOR DELIVERED REQUESTS & POs ──────────────
export function buildDynamicTickets(
  allReqs: ProcurementRequest[] = [],
  pos: PurchaseOrderItem[] = [],
  quotes: QuotationItem[] = [],
  receiptsList: GoodsReceiptItem[] = [],
  rfqsList: any[] = [],
  invoicesList: any[] = []
): RaiseTicket[] {
  const result: RaiseTicket[] = []

  // Purge any stale mock items directly from localStorage
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) {
        const val = localStorage.getItem(k) || ''
        const upperK = k.toUpperCase()
        const upperVal = val.toUpperCase()
        if (
          upperK.includes('VNDHW001') ||
          upperK.includes('TRK-EXPRESS') ||
          upperK.includes('1-76') ||
          upperVal.includes('VNDHW001') ||
          upperVal.includes('TRK-EXPRESS') ||
          upperVal.includes('1-76')
        ) {
          keysToRemove.push(k)
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))

    // Purge any stale RFQs and POs cache from localStorage
    localStorage.removeItem('kss_rfqs')
    localStorage.removeItem('kss_purchase_orders')

    // Purge any legacy vendor quotation/PO caches or selection overrides
    const quoteKeysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (
        k.startsWith('kss_vendor_quotes_') ||
        k.startsWith('vendor_quotes_') ||
        k.startsWith('kss_vendor_pos_') ||
        k === 'kss_selected_vendor_quotes'
      )) {
        quoteKeysToRemove.push(k)
      }
    }
    quoteKeysToRemove.forEach(k => localStorage.removeItem(k))

    // Sanitize kss_manager_verified_invoices: remove generic PO / TCK / REQ keys that were mistakenly added
    try {
      const savedInvs = JSON.parse(localStorage.getItem('kss_manager_verified_invoices') || '[]')
      if (Array.isArray(savedInvs) && savedInvs.length > 0) {
        // Only keep genuine invoice keys (starting with INV-)
        const genuineInvs = savedInvs.filter((k: string) => typeof k === 'string' && k.toUpperCase().startsWith('INV-'))
        const grnKeys = savedInvs.filter((k: string) => typeof k === 'string' && (k.toUpperCase().startsWith('REC-') || k.toUpperCase().startsWith('GRN-')))
        localStorage.setItem('kss_manager_verified_invoices', JSON.stringify(genuineInvs))
        if (grnKeys.length > 0) {
          const existingGrns = JSON.parse(localStorage.getItem('kss_manager_verified_grns') || '[]')
          localStorage.setItem('kss_manager_verified_grns', JSON.stringify(Array.from(new Set([...existingGrns, ...grnKeys]))))
        }
      }
    } catch (e) {}
  } catch (e) {}

  const deliveredKeys: string[] = (() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('kss_delivered_pos') || '[]')
      return Array.isArray(parsed) ? parsed.filter(k => !isMockKey(k)) : []
    } catch {
      return []
    }
  })()

  const selectedQuotesMap: Record<string, any> = (() => {
    try { return JSON.parse(localStorage.getItem('kss_selected_vendor_quotes') || '{}') } catch { return {} }
  })()

  const allVendorInvoices: any[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('kss_vendor_invoices_')) {
        const val = localStorage.getItem(k)
        if (val) {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed)) {
            allVendorInvoices.push(...parsed.filter(inv => !isMockKey(inv.id) && !isMockKey(inv.poRef)))
          }
        }
      }
    }
  } catch (e) {}

  const allDeliveryDocs: Record<string, any> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('kss_delivery_docs_')) {
        const poRefKey = k.replace('kss_delivery_docs_', '')
        if (!isMockKey(poRefKey)) {
          const val = localStorage.getItem(k)
          if (val) {
            const parsed = JSON.parse(val)
            if (parsed && !isMockKey(parsed.deliveryId) && !isMockKey(parsed.poRef)) {
              allDeliveryDocs[poRefKey] = parsed
              if (parsed.poRef) allDeliveryDocs[parsed.poRef] = parsed
              if (parsed.requestRef) allDeliveryDocs[parsed.requestRef] = parsed
            }
          }
        }
      }
    }
  } catch (e) {}

  const candidateKeys = new Set<string>()
  // 1. All valid requests from backend
  allReqs.forEach(r => {
    if (r.id && !isMockKey(r.id)) {
      candidateKeys.add(r.id)
    }
  })

  // 2. Real POs from backend
  pos.forEach(p => {
    const rId = p.requestId || (p as any).requestRef
    if (rId && !isMockKey(rId)) {
      candidateKeys.add(rId)
    } else if (p.id && !isMockKey(p.id)) {
      candidateKeys.add(p.id)
    }
  })

  // 3. Real quotes from backend
  quotes.forEach(q => {
    if (q.rfqId && !isMockKey(q.rfqId)) {
      candidateKeys.add(q.rfqId)
    }
  })

  // 4. Real receipts from backend
  receiptsList.forEach(gr => {
    if (gr.poNumber && !isMockKey(gr.poNumber)) {
      candidateKeys.add(gr.poNumber)
    }
    if (gr.requestId && !isMockKey(gr.requestId)) {
      candidateKeys.add(gr.requestId)
    }
    if (gr.grnNumber && !isMockKey(gr.grnNumber)) {
      candidateKeys.add(gr.grnNumber)
    }
  })

  // 5. Delivery / invoice documents only if matching a real request or PO
  Object.keys(allDeliveryDocs).forEach(k => {
    if (allReqs.some(r => r.id === k || r.id?.includes(k)) || pos.some(p => p.id === k || p.poNumber === k)) {
      candidateKeys.add(k)
    }
  })
  allVendorInvoices.forEach(inv => {
    if (inv.poRef && (allReqs.some(r => r.id === inv.poRef || r.id?.includes(inv.poRef)) || pos.some(p => p.id === inv.poRef || p.poNumber === inv.poRef))) {
      candidateKeys.add(inv.poRef)
    }
  })

  const processedNormKeys = new Set<string>()

  candidateKeys.forEach((rawKey) => {
    if (!rawKey || isMockKey(rawKey)) return
    const normKey = rawKey.replace(/^(PO-|RFQ-|REQ-|TCK-|REC-|GRN-)/, '').trim().toUpperCase()
    if (!normKey || processedNormKeys.has(normKey) || isMockKey(normKey)) return
    processedNormKeys.add(normKey)

    const matchingPo = pos.find(p =>
      (p.requestId && p.requestId.toUpperCase().includes(normKey)) ||
      ((p as any).requestRef && (p as any).requestRef.toUpperCase().includes(normKey)) ||
      (p.id && p.id.toUpperCase().includes(normKey)) ||
      (p.poNumber && p.poNumber.toUpperCase().includes(normKey))
    )
    const matchingReq = allReqs.find(r => r.id.toUpperCase().includes(normKey)) ||
      (matchingPo?.requestId ? allReqs.find(r => r.id.toUpperCase() === matchingPo.requestId.toUpperCase()) : undefined)

    if (!matchingPo && !matchingReq) {
      return
    }

    // 1. If PO has quotation id or quotation object
    let selQuote = (matchingPo as any)?.quotation
      ? quotes.find(q => q.id === (matchingPo as any).quotation || q.id === (matchingPo as any).quotation?.id || q.id === (matchingPo as any).quotation?.quotation_id)
      : undefined

    // 2. If matchingReq has rfqs, or matchingPo has rfqId, or lookup in rfqsList
    if (!selQuote) {
      const relatedRfqIds = new Set<string>()
      if ((matchingPo as any)?.rfqId) relatedRfqIds.add(String((matchingPo as any).rfqId).toUpperCase())
      if ((matchingPo as any)?.rfq_id) relatedRfqIds.add(String((matchingPo as any).rfq_id).toUpperCase())
      if ((matchingReq as any)?.rfqs && Array.isArray((matchingReq as any).rfqs)) {
        (matchingReq as any).rfqs.forEach((r: any) => {
          if (r.id) relatedRfqIds.add(String(r.id).toUpperCase())
          if (r.rfq_id) relatedRfqIds.add(String(r.rfq_id).toUpperCase())
        })
      }
      if (rfqsList && Array.isArray(rfqsList)) {
        rfqsList.forEach((r: any) => {
          const prId = r.purchase_request_detail?.request_id || r.purchase_request || r.purchase_request_id || r.requestId
          if (prId && String(prId).toUpperCase().includes(normKey)) {
            if (r.id) relatedRfqIds.add(String(r.id).toUpperCase())
            if (r.rfq_id) relatedRfqIds.add(String(r.rfq_id).toUpperCase())
          }
        })
      }

      // Check quotes matching any related RFQ
      if (relatedRfqIds.size > 0) {
        selQuote = quotes.find(q =>
          (relatedRfqIds.has(q.rfqId?.toUpperCase()) || relatedRfqIds.has((q as any).rfq_id?.toUpperCase())) &&
          (q.status === 'Selected' || (matchingPo && q.vendor === matchingPo.vendor))
        ) || quotes.find(q =>
          relatedRfqIds.has(q.rfqId?.toUpperCase()) || relatedRfqIds.has((q as any).rfq_id?.toUpperCase())
        )
      }
    }

    // 3. Fallback matching by normKey directly or by selectedQuotesMap
    if (!selQuote) {
      selQuote = quotes.find(q =>
        (q.rfqId && q.rfqId.toUpperCase().includes(normKey)) ||
        (q.id && q.id.toUpperCase().includes(normKey)) ||
        (q.product && matchingReq?.title && q.product.toLowerCase() === matchingReq.title.toLowerCase())
      ) || Object.values(selectedQuotesMap).find((sq: any) =>
        sq?.rfqId?.toUpperCase().includes(normKey) || sq?.quoteId?.toUpperCase().includes(normKey)
      )
    }

    const matchedReceipt = receiptsList.find(r =>
      (r.poNumber && r.poNumber.toUpperCase().includes(normKey)) ||
      (r.requestId && r.requestId.toUpperCase().includes(normKey)) ||
      (r.id && r.id.toUpperCase().includes(normKey)) ||
      (r.grnNumber && r.grnNumber.toUpperCase().includes(normKey))
    )

    const poId = matchingPo?.id || matchingPo?.poNumber || `PO-${normKey}`
    const reqId = matchingReq?.id || matchingPo?.requestId || `REQ-${normKey}`
    const ticketId = `TCK-${normKey}`

    const delDoc = allDeliveryDocs[rawKey] || allDeliveryDocs[`PO-${normKey}`] || allDeliveryDocs[`RFQ-${normKey}`] || allDeliveryDocs[normKey]
    const invDoc = allVendorInvoices.find(inv =>
      (inv.poRef && inv.poRef.toUpperCase().includes(normKey)) ||
      (inv.id && inv.id.toUpperCase().includes(normKey))
    )

    let title = matchingPo?.requestTitle || matchingReq?.title || (matchingReq as any)?.requestTitle || matchedReceipt?.product || selQuote?.product || 'Procurement Order'

    const originalRequestAmount = Number(
      matchingReq?.amount ??
      matchingReq?.total_estimated_cost ??
      matchingReq?.estimated_cost ??
      matchingReq?.estimatedCost ??
      (matchingPo as any)?.purchase_request_detail?.total_estimated_cost ??
      (matchingPo as any)?.purchase_request_detail?.amount ??
      0
    ) || 0

    const productAmount = matchingPo?.totalAmount || selQuote?.totalAmount || delDoc?.totalAmount || invDoc?.amount || originalRequestAmount || 0
    const amount = productAmount
    const resolvedRequestAmount = originalRequestAmount > 0 ? originalRequestAmount : productAmount

    let vendorName = matchedReceipt?.vendor || matchingPo?.vendor || selQuote?.vendor || (selQuote as any)?.vendorName || matchingReq?.vendor || invDoc?.vendorName || 'Vendor Partner'
    if (!vendorName || vendorName.toLowerCase() === 'preferred vendor' || vendorName.toLowerCase() === 'assigned vendor') {
      vendorName = 'Vendor Partner'
    }

    let qty = 1
    if (matchedReceipt?.receivedQuantity && !isNaN(Number(matchedReceipt.receivedQuantity))) {
      qty = Number(matchedReceipt.receivedQuantity)
    } else if (delDoc?.acceptedQty && !isNaN(Number(delDoc.acceptedQty))) {
      qty = Number(delDoc.acceptedQty)
    } else if (delDoc?.receivedQty && !isNaN(Number(delDoc.receivedQty))) {
      qty = Number(delDoc.receivedQty)
    } else if (selQuote?.quantity && !isNaN(Number(selQuote.quantity))) {
      qty = Number(selQuote.quantity)
    } else if (matchingPo?.quantity && !isNaN(Number(matchingPo.quantity))) {
      qty = Number(matchingPo.quantity)
    } else if (matchingReq?.quantity && !isNaN(Number(matchingReq.quantity))) {
      qty = Number(matchingReq.quantity)
    }
    const unit = (matchingReq as any)?.unit || (selQuote as any)?.unit || delDoc?.unit || 'Units'
    const department = matchingReq?.department || 'IT Department'

    const realCreatedAt = matchingReq?.createdAt || matchingReq?.created_at || (matchingPo as any)?.created_at || (matchingPo as any)?.order_date || matchingReq?.date || matchingPo?.poDate || new Date().toISOString()
    const realUpdatedAt = matchingReq?.updatedAt || matchingReq?.updated_at || (matchingPo as any)?.updated_at || realCreatedAt
    const poDate = matchingPo?.poDate || matchingPo?.submissionDate || matchingReq?.date || (realCreatedAt ? String(realCreatedAt).split('T')[0] : '2026-09-10')

    const grnId = matchedReceipt?.grnNumber || matchedReceipt?.id || ((delDoc?.deliveryId && !isMockKey(delDoc.deliveryId)) ? delDoc.deliveryId : `GRN-${normKey}`)
    const invoiceId = (invDoc?.id && !isMockKey(invDoc.id)) ? invDoc.id : `INV-DELL-${normKey}`

    const isPaid = Boolean(
      matchingReq?.status === 'completed' ||
      matchingReq?.paymentStatus === 'Paid' ||
      matchingPo?.paymentStatus === 'Paid' ||
      matchingPo?.status === 'Closed' ||
      (matchingReq?.currentStage && matchingReq.currentStage >= 9)
    )

    const isDelivered = Boolean(
      matchedReceipt !== undefined ||
      delDoc?.verified ||
      matchingPo?.status === 'Delivered' ||
      (matchingPo?.status as any) === 'Fulfilled' ||
      matchingReq?.status === 'delivered' ||
      matchingReq?.status === 'completed' ||
      isPaid
    )

    // Comprehensive invoice verification resolution
    const isVerifiedInLocal = isInvoiceVerifiedInSystem(invoiceId) || (invDoc?.id ? isInvoiceVerifiedInSystem(invDoc.id) : false)

    const isVerifiedInPo = Boolean(
      matchingPo?.document_verification?.is_invoice_verified ||
      (matchingPo as any)?.is_invoice_verified
    )

    const matchingBackendInvoice = (invoicesList || []).find((inv: any) => {
      const pRef = inv.poRef || inv.purchase_order_id || inv.purchase_order || inv.po_id || (inv.purchase_order_detail?.po_id)
      const iId = inv.id || inv.invoice_number || inv.invoice_id
      return (
        (pRef && String(pRef).toUpperCase().includes(normKey)) ||
        (iId && String(iId).toUpperCase().includes(normKey))
      )
    })
    const isVerifiedInBackendInv = Boolean(
      matchingBackendInvoice && (
        // Only truly-verified statuses: Matched or Paid
        matchingBackendInvoice.status === 'Matched' ||
        matchingBackendInvoice.status === 'Paid' ||
        // Explicit manager verification flag set by the /verify/ endpoint
        matchingBackendInvoice.is_manager_verified === true ||
        matchingBackendInvoice.verified === true
      )
    )

    const isInvoiceVerified = Boolean(
      isVerifiedInLocal ||
      isVerifiedInPo ||
      isVerifiedInBackendInv ||
      invDoc?.verified ||
      isPaid
    )

    const isGrnVerified = Boolean(
      matchedReceipt?.status === 'Verified' ||
      isGrnVerifiedInSystem(normKey) ||
      isGrnVerifiedInSystem(grnId) ||
      isGrnVerifiedInSystem(matchedReceipt?.id) ||
      isGrnVerifiedInSystem(matchedReceipt?.grnNumber) ||
      // Check backend receipt's verified_by_name (set by the dedicated /verify/ endpoint)
      (matchedReceipt as any)?.verifiedByName ||
      (matchedReceipt as any)?.verified_by_name ||
      matchingPo?.document_verification?.is_goods_receipt_verified ||
      (matchingPo?.document_verification?.goods_receipt_status === 'Verified') ||
      (matchingPo as any)?.goods_receipt_status === 'Verified' ||
      delDoc?.verified ||
      isPaid
    )

    const resolvedGstRate = Number(
      selQuote?.gstPercent ??
      (selQuote as any)?.gstRate ??
      matchingPo?.gst_rate ??
      matchingPo?.gstPercent ??
      (matchingPo as any)?.gstRate ??
      delDoc?.gstPercent ??
      delDoc?.gst_rate ??
      invDoc?.gstPercent ??
      invDoc?.gst_rate ??
      18
    )

    const resolvedBaseAmount = Number(
      selQuote?.baseAmount ??
      selQuote?.price ??
      matchingPo?.base_amount ??
      matchingPo?.baseAmount ??
      delDoc?.baseAmount ??
      delDoc?.base_amount ??
      invDoc?.baseAmount ??
      invDoc?.base_amount ??
      (amount > 0 ? Math.round(amount / (1.0 + (resolvedGstRate / 100.0))) : 0)
    )

    const resolvedTaxAmount = Number(
      selQuote?.taxAmount ??
      (selQuote as any)?.tax_amount ??
      selQuote?.gstAmount ??
      matchingPo?.tax_amount ??
      matchingPo?.taxAmount ??
      delDoc?.taxAmount ??
      delDoc?.gstAmount ??
      delDoc?.tax_amount ??
      invDoc?.taxAmount ??
      invDoc?.tax_amount ??
      invDoc?.gstAmount ??
      Math.round(amount - resolvedBaseAmount)
    )

    const resolvedWarranty = selQuote?.warranty || (selQuote?.warrantyType ? `${selQuote.warranty} (${selQuote.warrantyType})` : undefined) || delDoc?.warrantyDuration || (delDoc as any)?.warranty || '36 Months (On-site)'
    const resolvedWarrantyType = selQuote?.warrantyType || delDoc?.warrantyType || 'On-site'
    const resolvedFreeServices = selQuote?.freeServiceCount || delDoc?.freeServiceCount || '3 Services'
    const resolvedInstallation = selQuote?.installationType || delDoc?.installationType || 'Free'
    const resolvedTechSupport = selQuote?.techSupportDuration || delDoc?.techSupportDuration || '24/7 Dedicated Support'
    const resolvedReplacement = selQuote?.replacementPolicy || delDoc?.replacementPolicy || 'Standard SLA'
    const resolvedAccessories = selQuote?.accessoriesIncluded || delDoc?.accessoriesIncluded || 'Standard OEM Accessories & Documentation'
    const resolvedLeadTime = selQuote?.deliveryDays ? `${selQuote.deliveryDays} Days` : (delDoc?.leadTime || '7 Days')
    const resolvedExpectedDelivery = selQuote?.expectedDeliveryDate || delDoc?.expectedDeliveryDate || matchedReceipt?.receivedDate || poDate
    const resolvedNotes = selQuote?.notes || (selQuote as any)?.paymentTerms || delDoc?.notes || 'Net 30 payment terms upon delivery verification and commercial clearance.'
    const resolvedGrnDocNo = matchedReceipt?.grnNumber || delDoc?.grnDocNumber || delDoc?.deliveryId || (selQuote as any)?.grnDocNumber || `DOC-${grnId}`

    const product: TicketProduct = {
      id: `PRD-${normKey}-01`,
      name: title,
      category: matchingReq?.category || matchingPo?.category || 'IT Hardware & Equipment',
      quantity: qty,
      unit: unit,
      vendor: vendorName,
      pricePerUnit: Math.round(amount / (qty || 1)),
      totalAmount: amount,
      baseAmount: resolvedBaseAmount,
      gstPercent: resolvedGstRate,
      gstRate: resolvedGstRate,
      taxAmount: resolvedTaxAmount,
      warrantyDuration: resolvedWarranty,
      warrantyType: resolvedWarrantyType,
      freeServiceCount: resolvedFreeServices,
      installationType: resolvedInstallation,
      techSupportDuration: resolvedTechSupport,
      replacementPolicy: resolvedReplacement,
      accessoriesIncluded: resolvedAccessories,
      leadTime: resolvedLeadTime,
      expectedDeliveryDate: resolvedExpectedDelivery,
      notes: resolvedNotes,
      grnDocNumber: resolvedGrnDocNo,
      productOrder: {
        id: poId,
        title: `Official Purchase Order (${poId})`,
        date: poDate,
        amount: amount,
        totalAmount: amount,
        baseAmount: resolvedBaseAmount,
        gstPercent: resolvedGstRate,
        gstRate: resolvedGstRate,
        taxAmount: resolvedTaxAmount,
        warrantyDuration: resolvedWarranty,
        warrantyType: resolvedWarrantyType,
        freeServiceCount: resolvedFreeServices,
        installationType: resolvedInstallation,
        techSupportDuration: resolvedTechSupport,
        replacementPolicy: resolvedReplacement,
        accessoriesIncluded: resolvedAccessories,
        leadTime: resolvedLeadTime,
        expectedDeliveryDate: resolvedExpectedDelivery,
        notes: resolvedNotes,
        grnDocNumber: resolvedGrnDocNo,
        verified: true,
        verifiedBy: 'Procurement System',
        verifiedAt: new Date().toISOString()
      },
      goodsReceipt: {
        id: grnId,
        title: `Goods Receipt Note (${grnId})`,
        date: matchedReceipt?.receivedDate || delDoc?.deliveryDate || poDate,
        vendor: vendorName,
        amount: amount,
        totalAmount: amount,
        baseAmount: resolvedBaseAmount,
        gstPercent: resolvedGstRate,
        gstRate: resolvedGstRate,
        taxAmount: resolvedTaxAmount,
        warrantyDuration: resolvedWarranty,
        warrantyType: resolvedWarrantyType,
        freeServiceCount: resolvedFreeServices,
        installationType: resolvedInstallation,
        techSupportDuration: resolvedTechSupport,
        replacementPolicy: resolvedReplacement,
        accessoriesIncluded: resolvedAccessories,
        leadTime: resolvedLeadTime,
        expectedDeliveryDate: resolvedExpectedDelivery,
        notes: resolvedNotes,
        grnDocNumber: resolvedGrnDocNo,
        verified: isGrnVerified,
        verifiedBy: isGrnVerified ? (matchedReceipt?.receivedBy || delDoc?.verifiedBy || 'Sarah Manager') : undefined,
        verifiedAt: isGrnVerified ? (delDoc?.verifiedAt || delDoc?.deliveryDate || new Date().toISOString()) : undefined,
        receivedQty: matchedReceipt?.receivedQuantity || qty,
        acceptedQty: matchedReceipt ? (matchedReceipt.receivedQuantity - matchedReceipt.damagedQuantity) : qty,
        unit: unit
      },
      invoice: {
        id: invoiceId,
        title: `Commercial Tax Invoice (${invDoc?.docName || `Tax_Invoice_${poId}.pdf`})`,
        date: invDoc?.invoiceDate || delDoc?.deliveryDate || poDate,
        vendor: vendorName,
        amount: amount,
        totalAmount: amount,
        invoiceAmount: amount,
        baseAmount: resolvedBaseAmount,
        gstPercent: resolvedGstRate,
        gstRate: resolvedGstRate,
        taxAmount: resolvedTaxAmount,
        warrantyDuration: resolvedWarranty,
        warrantyType: resolvedWarrantyType,
        freeServiceCount: resolvedFreeServices,
        installationType: resolvedInstallation,
        techSupportDuration: resolvedTechSupport,
        replacementPolicy: resolvedReplacement,
        accessoriesIncluded: resolvedAccessories,
        leadTime: resolvedLeadTime,
        expectedDeliveryDate: resolvedExpectedDelivery,
        notes: resolvedNotes,
        grnDocNumber: resolvedGrnDocNo,
        gstNumber: '27AAACK1092F1Z9',
        verified: isInvoiceVerified,
        verifiedBy: isInvoiceVerified ? (invDoc?.verifiedBy || 'Sarah Manager') : undefined,
        verifiedAt: isInvoiceVerified ? (invDoc?.verifiedAt || new Date().toISOString()) : undefined
      },
      submitted: isPaid || matchingReq?.status === 'completed',
      paymentSettled: isPaid,
      utrRef: matchingReq?.paymentTransactionRef,
      paymentDate: matchingReq?.paidDate
    }

    result.push({
      id: ticketId,
      requestId: reqId,
      requestTitle: title,
      requestAmount: resolvedRequestAmount,
      department: department,
      createdDate: poDate,
      createdAt: realCreatedAt,
      created_at: realCreatedAt,
      updatedAt: realUpdatedAt,
      updated_at: realUpdatedAt,
      products: [product],
      productOrder: product.productOrder,
      goodsReceipt: product.goodsReceipt,
      invoice: product.invoice,
      submitted: isPaid || matchingReq?.status === 'completed'
    })
  })

  // Deterministic latest-first sorting using real DB timestamps
  result.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.createdDate || (a as any).created_at || 0).getTime()
    const timeB = new Date(b.createdAt || b.createdDate || (b as any).created_at || 0).getTime()
    if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
      return timeB - timeA
    }
    const numA = parseInt((a.requestId || a.id || '').replace(/\D/g, ''), 10) || 0
    const numB = parseInt((b.requestId || b.id || '').replace(/\D/g, ''), 10) || 0
    if (numA !== numB) {
      return numB - numA
    }
    return (b.id || '').localeCompare(a.id || '')
  })

  return result
}

const MOCK_TICKETS: RaiseTicket[] = []
const MOCK_PAYMENTS: PaymentRecord[] = []
const MOCK_COMPLAINTS: Complaint[] = []
const MOCK_FINANCE_AUDIT: FinanceAuditItem[] = []
const MOCK_VENDORS: VendorItem[] = []
const MOCK_PURCHASE_ORDERS: PurchaseOrderItem[] = []
const MOCK_INVOICES: VendorInvoice[] = []
const MOCK_GOODS_RECEIPTS: GoodsReceiptItem[] = []
const MOCK_CONTRACTS: ContractItem[] = []
const MOCK_QUOTATIONS: QuotationItem[] = []

export function resolveVendorId(vendorName?: string, vendorId?: string): string {
  if (vendorId && vendorId.startsWith('VND-')) return vendorId
  const v = (vendorName || vendorId || '').toLowerCase()
  if (v.includes('hp')) return 'VND-HW-002'
  if (v.includes('lenovo')) return 'VND-HW-003'
  if (v.includes('apple')) return 'VND-HW-004'
  if (v.includes('dell')) return 'VND-HW-001'
  return vendorId || 'VND-HW-001'
}

// ─── Context & Provider ───────────────────────────────────────────────────────

const ManagerDataContext = createContext<ManagerDataContextType | undefined>(undefined)

// Force HMR update
console.log("ManagerDataContext loaded with real API integration!")

export const ManagerDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [arrivedRequests, setArrivedRequests] = useState<ProcurementRequest[]>(MOCK_ARRIVED)
  const [pendingApprovals, setPendingApprovals] = useState<ProcurementRequest[]>(MOCK_PENDING_APPROVALS)
  const [myApprovals, setMyApprovals] = useState<ProcurementRequest[]>(MOCK_MY_APPROVALS)
  const [rejectedRequests, setRejectedRequests] = useState<ProcurementRequest[]>(MOCK_REJECTED)
  const [financeReview, setFinanceReview] = useState<ProcurementRequest[]>(MOCK_FINANCE_REVIEW)
  const [recommendedToFinance, setRecommendedToFinance] = useState<ProcurementRequest[]>(MOCK_RECOMMENDED)
  const [recommendedToAdmin, setRecommendedToAdmin] = useState<ProcurementRequest[]>(MOCK_RECOMMENDED_TO_ADMIN)
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [budgets, setBudgets] = useState<BudgetDepartment[]>([])
  const [tickets, setTickets] = useState<RaiseTicket[]>(() => buildDynamicTickets([]))
  const [payments, setPayments] = useState<PaymentRecord[]>(MOCK_PAYMENTS)
  const [complaints, setComplaints] = useState<Complaint[]>(MOCK_COMPLAINTS)
  const [financeAuditHistory, setFinanceAuditHistory] = useState<FinanceAuditItem[]>(MOCK_FINANCE_AUDIT)
  const [vendors, setVendors] = useState<VendorItem[]>(MOCK_VENDORS)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderItem[]>(MOCK_PURCHASE_ORDERS)
  const [invoices, setInvoices] = useState<VendorInvoice[]>(MOCK_INVOICES)
  const [receipts, setReceipts] = useState<GoodsReceiptItem[]>(MOCK_GOODS_RECEIPTS)
  const [contracts, setContracts] = useState<ContractItem[]>(MOCK_CONTRACTS)
  const [quotations, setQuotations] = useState<QuotationItem[]>(MOCK_QUOTATIONS)
  const [loading] = useState(false)
  const isFetchingRef = useRef(false)

  // Dynamic fetch from Django REST API backend
  const refreshManagerBackendData = async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      const res = await getDashboardStats()
      const list = Array.isArray(res) ? res : res?.results || []

      const mapped: ProcurementRequest[] = list.map((item: any) => {
        const reqId = item.request_id || item.id
        const backendAmount = Number(
          item.original_requested_amount ??
          item.originalRequestedAmount ??
          item.requested_amount ??
          item.requestedAmount ??
          item.total_estimated_cost ??
          item.amount ??
          item.estimated_cost ??
          item.estimatedCost ??
          0
        ) || 0
        const backendApprovedAmount = item.approved_amount !== undefined && item.approved_amount !== null
          ? Number(item.approved_amount)
          : (item.extra_fields?.approved_amount !== undefined ? Number(item.extra_fields.approved_amount) : undefined)
        const rawCreatedAt = item.created_at || item.createdAt || new Date().toISOString()
        const reqDate = (rawCreatedAt || '').split('T')[0] || new Date().toISOString().split('T')[0]
        const reqPriority = (item.priority || 'Medium') as 'Low' | 'Medium' | 'High' | 'Critical'
        const stage = Number(item.current_stage) || 1
        const rawSt = (item.status || '').toLowerCase().trim()

        let reqStatus: RequestStatus = 'pending_approval'
        if (rawSt === 'rejected' || rawSt.includes('reject')) {
          reqStatus = 'rejected'
        } else if (rawSt === 'returned' || rawSt.includes('return')) {
          reqStatus = 'pending_arrival'
        } else if (rawSt === 'completed' || stage >= 9) {
          reqStatus = 'completed'
        } else if (stage === 8) {
          reqStatus = 'invoiced'
        } else if (stage === 7) {
          reqStatus = 'delivered'
        } else if (stage === 6) {
          reqStatus = 'assigned_to_vendor'
        } else if (stage === 5) {
          reqStatus = 'quotes_received'
        } else if (stage === 4 || rawSt === 'rfq_sent' || rawSt === 'approved') {
          reqStatus = 'approved'
        } else if (stage === 3 || rawSt === 'recommended_to_admin') {
          reqStatus = 'recommended_to_admin'
        } else if (stage === 2 || rawSt.includes('finance') || rawSt === 'recommended_to_finance' || rawSt === 'recommended') {
          reqStatus = 'finance_review'
        } else {
          reqStatus = 'pending_approval'
        }

        return {
          id: reqId,
          title: item.title,
          requester: item.created_by_detail?.first_name ? `${item.created_by_detail.first_name} ${item.created_by_detail.last_name}` : (item.created_by_detail?.username || 'Team Lead'),
          department: item.department_detail?.name || (typeof item.department === 'string' ? item.department : 'IT'),
          category: item.category || 'General',
          subcategory: item.subcategory || '',
          amount: backendAmount,
          total_estimated_cost: backendAmount,
          estimated_cost: backendAmount,
          estimatedCost: backendAmount,
          approvedAmount: backendApprovedAmount,
          quantity: item.quantity !== undefined && item.quantity !== null ? item.quantity : 1,
          requiredBy: item.required_by || reqDate,
          deliveryLocation: item.delivery_location || 'Pune HQ',
          currentStage: stage,
          costCenter: item.cost_center || item.budget_code || '',
          date: reqDate,
          createdAt: rawCreatedAt,
          created_at: rawCreatedAt,
          priority: reqPriority,
          status: reqStatus,
          vendor: (item.preferred_vendor && item.preferred_vendor.toLowerCase() !== 'preferred vendor') ? item.preferred_vendor : '',
          description: item.description || '',
          justification: item.justification || '',
          flowType: item.flow_type || 'A',
          extraFields: item.extra_fields || {},
          approvalParams: undefined,
          approvedBy: item.approved_by || (stage >= 4 ? 'Sarah Manager' : undefined),
          approvedDate: item.approved_date || (stage >= 4 ? reqDate : undefined),
          poNumber: item.po_number || item.poNumber || (item.purchase_orders && item.purchase_orders[0]?.po_id) || undefined,
          po_number: item.po_number || item.poNumber || undefined,
          grnNumber: item.grn_number || item.grnNumber || undefined,
          grn_number: item.grn_number || item.grnNumber || undefined,
          invoiceNumber: item.invoice_number || item.invoiceNumber || undefined,
          invoice_number: item.invoice_number || item.invoiceNumber || undefined,
          invoiceId: item.invoice_id || undefined,
          is_invoice_verified: item.is_invoice_verified || false,
          isVerified: Boolean(item.is_invoice_verified || stage >= 8),
          documentsVerified: Boolean(item.is_invoice_verified || stage >= 8),
          rfqId: item.rfq_id || item.rfqId || undefined,
          rfq_id: item.rfq_id || item.rfqId || undefined,
          currentlyWith: item.currently_with || item.currentlyWith || undefined,
          currently_with: item.currently_with || item.currentlyWith || undefined,
          updatedAt: item.updated_at || item.updatedAt || rawCreatedAt,
          updated_at: item.updated_at || item.updatedAt || rawCreatedAt,
          lastUpdated: item.updated_at ? item.updated_at.split('T')[0] : reqDate,
          rejectionReason: item.rejection_reason || undefined,
          rejectedBy: item.rejected_by || undefined,
          rejectedDate: item.rejected_date || undefined,
          isForwardedToFinance: Boolean(
            item.is_forwarded_to_finance ||
            stage === 2 ||
            (Array.isArray(item.approval_steps) && item.approval_steps.some((s: any) => s.decision === 'RECOMMEND' || s.role === 'FINANCE' || (typeof s.notes === 'string' && s.notes.toLowerCase().includes('finance')))) ||
            item.status === 'Recommended' ||
            (typeof item.status === 'string' && item.status.toUpperCase().includes('FINANCE')) ||
            item.created_by_detail?.role === 'FINANCE'
          ),
          financeStatus: item.finance_status || (
            (item.is_forwarded_to_finance || stage === 2 || (Array.isArray(item.approval_steps) && item.approval_steps.some((s: any) => s.decision === 'RECOMMEND' || s.role === 'FINANCE')) || item.status === 'Recommended' || (typeof item.status === 'string' && item.status.toUpperCase().includes('FINANCE')) || item.created_by_detail?.role === 'FINANCE')
              ? (stage === 2 ? (item.status === 'Recommended' || (Array.isArray(item.approval_steps) && item.approval_steps.some((s: any) => s.decision === 'RECOMMEND')) ? 'Sent to Finance' : 'Under Review') : stage === 3 ? 'Recommended to Admin' : stage >= 4 ? 'Approved' : 'Pending Finance Approval')
              : 'Not Escalated'
          ),
          paymentStatus: item.payment_status || (stage >= 9 ? 'Paid' : 'Unpaid'),
          history: Array.isArray(item.approval_steps) && item.approval_steps.length > 0
            ? item.approval_steps.map((s: any, sIdx: number) => ({
                stageNumber: sIdx + 1,
                stageName: s.role ? `${s.role.charAt(0).toUpperCase() + s.role.slice(1).toLowerCase()} Approval` : (s.decision || `Stage ${sIdx + 1}`),
                date: s.created_at || '',
                timestamp: s.created_at || '',
                actor: s.actor_detail ? `${s.actor_detail.first_name || ''} ${s.actor_detail.last_name || ''}`.trim() || s.actor_detail.username : (s.role || 'User'),
                actorRole: s.role || 'User',
                actorName: s.actor_detail ? `${s.actor_detail.first_name || ''} ${s.actor_detail.last_name || ''}`.trim() || s.actor_detail.username : 'Unknown',
                action: s.decision === 'APPROVE' ? 'Approved' : s.decision === 'REJECT' ? 'Rejected' : s.decision === 'RECOMMEND' ? 'Forwarded / Recommended' : (s.decision || 'Action Taken'),
                remark: s.notes || s.reason_detail?.text || '',
                note: s.notes || s.reason_detail?.text || '',
              }))
            : [],
        }
      })

      // Ensure deduplication by unique request ID and newest-first sorting
      const uniqueMappedMap = new Map<string, ProcurementRequest>()
      mapped.forEach(r => {
        if (r.id && !uniqueMappedMap.has(r.id)) {
          uniqueMappedMap.set(r.id, r)
        }
      })
      const uniqueMapped = Array.from(uniqueMappedMap.values()).sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.date ? new Date(a.date).getTime() : 0)
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.date ? new Date(b.date).getTime() : 0)
        return timeB - timeA
      })

      setPendingApprovals(uniqueMapped.filter(r => ((r.currentStage ?? 1) === 1 || r.status === 'pending_approval') && r.status !== 'rejected' && r.status !== 'pending_arrival'))
      setArrivedRequests(uniqueMapped.filter(r => ((r.currentStage ?? 1) === 1 || r.status === 'pending_approval') && r.status !== 'rejected' && r.status !== 'pending_arrival'))
      setMyApprovals(uniqueMapped.filter(r => (r.currentStage ?? 1) >= 4 && r.status !== 'rejected'))
      setRejectedRequests(uniqueMapped.filter(r => r.status === 'rejected'))
      setFinanceReview(uniqueMapped.filter(r => ((r.currentStage ?? 1) === 2 || r.status === 'finance_review' || r.status === 'recommended_to_finance') && r.isForwardedToFinance && r.status !== 'rejected'))
      setRecommendedToFinance(uniqueMapped.filter(r => ((r.currentStage ?? 1) === 2 || r.status === 'finance_review' || r.status === 'recommended_to_finance') && r.isForwardedToFinance && r.status !== 'rejected'))
      setRecommendedToAdmin(uniqueMapped.filter(r => ((r.currentStage ?? 1) === 3 || r.status === 'recommended_to_admin') && r.status !== 'rejected'))

      // Fetch other core data
      try {
        const [budgetsRes, rfqsRes, vendorsRes, posRes, invRes, payRes, quotesRes, grsRes] = await Promise.all([
          apiClient.get('/budgets/allocations/').catch(() => apiClient.get('/budgets/')),
          apiClient.get('/rfq/?page_size=1000'),
          apiClient.get('/vendors/?page_size=1000'),
          apiClient.get('/procurement/purchase-orders/'),
          apiClient.get('/invoices/'),
          apiClient.get('/payments/'),
          apiClient.get('/rfq/quotations/?page_size=1000').catch(() => ({ data: [] })),
          apiClient.get('/procurement/goods-receipts/?page_size=1000').catch(() => ({ data: [] }))
        ])
        const rawBudgets = Array.isArray(budgetsRes.data) ? budgetsRes.data : budgetsRes.data?.results || []
        const mappedBudgets: BudgetDepartment[] = rawBudgets.map((b: any) => {
          const tot = Number(b.total_allocated) || Number(b.totalBudget) || 0
          const cmt = Number(b.committed_amount) || Number(b.committed) || 0
          const spnt = Number(b.spent_amount) || Number(b.spent) || 0
          const avail = (b.available_amount !== undefined && b.available_amount !== null && !isNaN(Number(b.available_amount)))
            ? Number(b.available_amount)
            : (tot - cmt - spnt)
          const deptName = b.department_detail?.name || (typeof b.department === 'string' ? b.department : 'General')
          return {
            department: deptName,
            category: b.department_detail?.description || b.category || `${deptName} Operations`,
            totalBudget: tot,
            allocated: tot,
            committed: cmt,
            spent: spnt,
            available: avail,
            pending: cmt,
          }
        })
        setBudgets(mappedBudgets)
        const rawRfqs = Array.isArray(rfqsRes.data) ? rfqsRes.data : rfqsRes.data?.results || []
          
          // Sync purchase request stages from RFQs
          rawRfqs.forEach((backendRfq: any) => {
              if (backendRfq.purchase_request_detail) {
                  const pr = backendRfq.purchase_request_detail;
                  const updateReq = (r: ProcurementRequest) => r.id === pr.request_id ? { ...r, currentStage: pr.current_stage, status: pr.current_stage === 5 ? 'quotes_received' : r.status } : r;
                  setMyApprovals((prev: any) => prev.map(updateReq));
              }
          })
        const backendRfqs: RFQ[] = rawRfqs.map((r: any) => {
          const rQuotes = Array.isArray(r.quotations) ? r.quotations : []
          const rawQuotesList = Array.isArray(quotesRes?.data) ? quotesRes.data : quotesRes?.data?.results || []

          // Combine rQuotes and any quotes from rawQuotesList matching this RFQ
          const allMatchingQuotes = [...rQuotes]
          rawQuotesList.forEach((q: any) => {
            const qRfqId = String(q.rfq_id || q.rfq || '')
            const qRfqPk = String(q.rfq_detail?.id || q.rfq || '')
            if (
              (r.rfq_id && qRfqId === String(r.rfq_id)) ||
              (r.id && (qRfqPk === String(r.id) || qRfqId === String(r.id))) ||
              (r.purchase_request_detail?.request_id && q.request_id === r.purchase_request_detail.request_id)
            ) {
              if (!allMatchingQuotes.some((existing: any) => (existing.quotation_id && existing.quotation_id === q.quotation_id) || (existing.id && existing.id === q.id))) {
                allMatchingQuotes.push(q)
              }
            }
          })

          const vendorMap = new Map<string, any>();

          // 1. First add all invited vendors
          (r.invited_vendors_detail || []).forEach((iv: any) => {
            const vKey = (iv.unique_vendor_id || iv.name || String(iv.id)).toLowerCase()
            const q = allMatchingQuotes.find((qt: any) => 
              qt.vendor === iv.id || 
              qt.vendor_detail?.id === iv.id ||
              qt.vendor_detail?.unique_vendor_id === iv.unique_vendor_id ||
              (qt.vendor_detail?.name && iv.name && qt.vendor_detail.name.toLowerCase() === iv.name.toLowerCase()) ||
              (typeof qt.vendor === 'string' && iv.name && qt.vendor.toLowerCase() === iv.name.toLowerCase())
            )
            vendorMap.set(vKey, {
              name: iv.name,
              vendorId: iv.unique_vendor_id || String(iv.id),
              invitedOn: (r.created_at || '').split('T')[0] || r.deadline,
              response: q ? 'Received' : 'Pending',
              quote: q ? Number(q.price) : undefined,
              deliveryDays: q ? q.delivery_days : undefined,
              warranty: q ? `${q.warranty_months} months` : undefined,
              paymentTerms: q ? q.terms_conditions : undefined
            })
          })

          // 2. Also include any vendor that submitted a quote for this RFQ (even if not explicitly in invited_vendors)
          allMatchingQuotes.forEach((qt: any) => {
            const vName = qt.vendor_detail?.name || (typeof qt.vendor === 'string' ? qt.vendor : 'Vendor')
            const vId = qt.vendor_detail?.unique_vendor_id || String(qt.vendor_detail?.id || qt.vendor || '')
            const vKey = (vId || vName).toLowerCase()
            if (!vendorMap.has(vKey)) {
              vendorMap.set(vKey, {
                name: vName,
                vendorId: vId,
                invitedOn: (r.created_at || '').split('T')[0] || r.deadline,
                response: 'Received',
                quote: Number(qt.price),
                deliveryDays: qt.delivery_days,
                warranty: `${qt.warranty_months} months`,
                paymentTerms: qt.terms_conditions
              })
            }
          })

          const vendors = Array.from(vendorMap.values())
          
          let st = 'draft'
          const rawStatus = (r.status || '').toUpperCase()
          if (rawStatus === 'OPEN') {
            st = (vendors.some((v: any) => v.response === 'Received') || allMatchingQuotes.length > 0) ? 'quotes_received' : 'sent'
          } else if (rawStatus === 'CLOSED') {
            st = 'awarded'
          } else if (rawStatus === 'EXPIRED') {
            st = 'expired'
          }

          const cb = r.purchase_request_detail?.created_by_detail
          const createdByStr = cb ? `${cb.first_name || ''} ${cb.last_name || ''}`.trim() || cb.username : 'System'

          return {
            ...r,
            id: r.rfq_id || r.id,
            pk: r.id,
            status: st,
            department: r.purchase_request_detail?.department_detail?.name || 'IT',
            createdBy: createdByStr,
            vendors,
            estimatedAmount: r.estimatedAmount || r.purchase_request_detail?.total_estimated_cost || r.estimated_amount || 0
          }
        })

        // Exclusively use PostgreSQL backend RFQs as single source of truth - sort newest first
        backendRfqs.sort((a, b) => {
          const timeA = new Date(a.createdDate || (a as any).created_at || 0).getTime()
          const timeB = new Date(b.createdDate || (b as any).created_at || 0).getTime()
          if (timeA !== timeB) return timeB - timeA
          return (b.id || '').localeCompare(a.id || '')
        })
        setRfqs(backendRfqs)
        localStorage.removeItem('kss_rfqs')
        const rawPOs = Array.isArray(posRes.data) ? posRes.data : posRes.data?.results || []
        const mappedBackendPOs: PurchaseOrderItem[] = rawPOs.map((p: any) => {
          const vObj = p.vendor_detail || (typeof p.vendor === 'object' ? p.vendor : null)
          const prObj = p.purchase_request_detail || (typeof p.purchase_request === 'object' ? p.purchase_request : null)
          const vendorName = vObj?.name || (typeof p.vendor === 'string' ? p.vendor : 'Vendor Partner')
          const vendorId = vObj?.unique_vendor_id || resolveVendorId(vendorName, String(vObj?.id || ''))
          const reqId = prObj?.request_id || (typeof p.purchase_request === 'string' ? p.purchase_request : `REQ-${p.id}`)
          const reqTitle = prObj?.title || p.title || p.requestTitle || `Procurement Order: ${reqId}`
          const amount = Number(p.total_amount) || Number(p.totalAmount) || Number(p.amount) || (prObj?.total_estimated_cost ? Number(prObj.total_estimated_cost) : 94400)
          const poNum = p.po_id || p.poNumber || (p.id ? (String(p.id).startsWith('PO-') ? String(p.id) : `PO-${p.id}`) : `PO-${reqId.replace(/^(REQ-|RFQ-)/, '')}`)
          const dateStr = (p.order_date || p.created_at || p.poDate || new Date().toISOString()).split('T')[0]
          const delDate = (p.expected_delivery || p.deliveryDate || new Date(Date.now() + 7 * 86400000).toISOString()).split('T')[0]
          
          let poStatus: PurchaseOrderItem['status'] = 'Sent to Vendor'
          const rawSt = (p.status || '').toUpperCase()
          if (rawSt === 'ISSUED' || rawSt === 'SENT TO VENDOR') poStatus = 'Sent to Vendor'
          else if (rawSt === 'ACKNOWLEDGED' || rawSt === 'ACCEPTED') poStatus = 'Acknowledged'
          else if (rawSt === 'DELIVERED' || rawSt === 'FULFILLED') poStatus = 'Delivered'
          else if (rawSt === 'CLOSED') poStatus = 'Closed'
          else if (rawSt === 'CANCELLED') poStatus = 'Cancelled'
          else if (p.status) poStatus = p.status

          return {
            id: poNum,
            poNumber: poNum,
            requestId: reqId,
            requestTitle: reqTitle,
            procurementType: (prObj?.category === 'Software' || reqTitle.toLowerCase().includes('software') || reqTitle.toLowerCase().includes('license')) ? 'SOFTWARE' : 'HARDWARE',
            category: prObj?.category || 'IT Hardware',
            vendor: vendorName,
            vendorId: vendorId,
            submittedBy: `${vendorName} (Vendor Partner)`,
            submittedByRole: 'Vendor',
            submissionDate: dateStr,
            poDate: dateStr,
            items: p.items || [{ product: reqTitle, quantity: prObj?.quantity || 1, unitPrice: amount, total: amount }],
            quantity: prObj?.quantity || 1,
            totalAmount: amount,
            deliveryDate: delDate,
            status: poStatus,
            paymentStatus: p.payment_status || 'Pending',
            terms: p.terms || 'Net 30',
            document_verification: p.document_verification,
            document_verification_status: p.document_verification_status
          }
        })

        // Exclusively use PostgreSQL backend POs as single source of truth
        const poMap = new Map<string, PurchaseOrderItem>()
        mappedBackendPOs.forEach(p => {
          if (p && p.id && !isMockKey(p.id)) {
            const reqKey = `${p.requestId || p.id}_${p.vendorId || p.vendor}`
            if (!poMap.has(reqKey)) {
              poMap.set(reqKey, p)
            }
          }
        })
        const combinedPOs = Array.from(poMap.values())
        setPurchaseOrders(combinedPOs)

        const rawVendors = Array.isArray(vendorsRes.data) ? vendorsRes.data : vendorsRes.data?.results || []
        setVendors(rawVendors.map((v: any) => {
          let st: VendorItem['status'] = 'Pending Approval'
          const rawStatus = (v.status || '').toUpperCase()
          if (rawStatus === 'APPROVED' || rawStatus === 'ACTIVE') st = 'Active'
          else if (rawStatus === 'SUSPENDED') st = 'Suspended'
          else if (rawStatus === 'REJECTED') st = 'Rejected'
          
          const vId = v.unique_vendor_id || String(v.id)
          const matchingPOs = combinedPOs.filter(po => 
            (po.vendorId && (po.vendorId === vId || po.vendorId === String(v.id))) ||
            (po.vendor && v.name && (po.vendor.toLowerCase() === v.name.toLowerCase() || po.vendor.toLowerCase().includes(v.name.toLowerCase())))
          )
          const poSpend = matchingPOs.reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0)

          return {
            ...v,
            id: v.unique_vendor_id || v.id,
            unique_vendor_id: v.unique_vendor_id || v.id,
            name: v.name,
            company: v.name,
            contactPerson: v.contact_person || 'N/A',
            email: v.email,
            phone: v.phone,
            category: v.category_detail?.name || (typeof v.category === 'string' ? v.category : 'General'),
            status: st,
            riskLevel: (v.risk_rating || 'Low') as VendorItem['riskLevel'],
            performanceScore: parseFloat(v.performance_score) || 90,
            activeContracts: matchingPOs.length > 0 ? matchingPOs.length : 1,
            totalOrders: matchingPOs.length,
            totalPurchaseValue: poSpend,
            complianceStatus: 'Verified' as const,
            documentsCount: (v.documents && v.documents.length) || 4,
            onTimeDeliveryRate: 95,
            qualityIssuesCount: 0,
            complaintsCount: 0,
            registeredDate: (v.created_at || '').split('T')[0] || '2026-09-01',
          }
        }))
        // Exclusively use PostgreSQL backend Invoices as single source of truth
        const rawInvoices = Array.isArray(invRes.data) ? invRes.data : invRes.data?.results || []
        const mappedBackendInvoices: VendorInvoice[] = rawInvoices.map((inv: any) => {
          const poObj = inv.purchase_order_detail || (typeof inv.purchase_order === 'object' ? inv.purchase_order : null)
          const prObj = poObj?.purchase_request_detail || mapped.find(r => r.id === poObj?.purchase_request || r.id === poObj?.request_id)
          const reqId = prObj?.request_id || prObj?.id || poObj?.request_id || ''
          const reqTitle = prObj?.title || poObj?.request_title || inv.request_title || (reqId ? `Procurement Requisition: ${reqId}` : 'Procured Item')
          const vObj = inv.vendor_detail || (typeof inv.vendor === 'object' ? inv.vendor : null)
          let vendorName = vObj?.name || (typeof inv.vendor === 'string' && isNaN(Number(inv.vendor)) ? inv.vendor : '')
          if (!vendorName || !isNaN(Number(vendorName))) {
            const vFound = rawVendors.find((v: any) => String(v.id) === String(inv.vendor) || String(v.unique_vendor_id) === String(inv.vendor))
            vendorName = vFound?.name || 'Vendor Partner'
          }
          const vendorId = vObj?.unique_vendor_id || String(inv.vendor || '')

          const invNum = inv.invoice_number || inv.invoice_id || (inv.id ? `INV-${inv.id}` : 'INV-001')
          const poNum = poObj?.po_id || inv.po_number || (inv.purchase_order ? `PO-${inv.purchase_order}` : '')

          const amountNum = Number(inv.amount) || Number(inv.total_amount) || Number(inv.totalAmount) || 0
          const taxAmt = Number(inv.tax_amount) || Number(inv.taxAmount) || Math.round(amountNum * 0.18)
          const subtotalAmt = Number(inv.subtotal) || (amountNum - taxAmt)

          return {
            id: inv.invoice_id || invNum,
            invoiceNumber: invNum,
            poId: poNum,
            poRef: poNum,
            poNumber: poNum,
            requestId: reqId,
            requestTitle: reqTitle,
            procurementType: (prObj?.category === 'Software' || reqTitle.toLowerCase().includes('software')) ? 'SOFTWARE' : 'HARDWARE',
            vendor: vendorName,
            vendorId: vendorId,
            submittedBy: `${vendorName} (Vendor Portal)`,
            submittedByRole: 'Vendor',
            submissionDate: (inv.created_at || inv.invoice_date || new Date().toISOString()).split('T')[0],
            invoiceDate: inv.invoice_date || (inv.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0],
            dueDate: inv.due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
            subtotal: subtotalAmt,
            taxAmount: taxAmt,
            totalAmount: amountNum,
            amount: amountNum,
            status: inv.status || 'Pending Review',
            documentType: 'Tax Invoice',
            gstNumber: inv.gst_number || '27AAACK1092F1Z9',
            // Explicit manager verification flag — set by the /verify/ endpoint (separate from status)
            is_manager_verified: inv.is_manager_verified === true,
            verified: inv.is_manager_verified === true || inv.status === 'Matched' || inv.status === 'Paid',
            verified_by_name: inv.verified_by_name || '',
            verifiedBy: inv.verified_by_name || '',
            items: [{
              product: reqTitle,
              quantity: prObj?.quantity || 1,
              unitPrice: Math.round(amountNum / (prObj?.quantity || 1)),
              total: amountNum,
            }]
          }
        })
        setInvoices(mappedBackendInvoices)

        // ─── MAP BACKEND PAYMENTS PROPERLY ────────────────────────────────────
        const rawPayments = Array.isArray(payRes.data) ? payRes.data : payRes.data?.results || []
        const mappedBackendPayments: PaymentRecord[] = rawPayments.map((p: any) => {
          const prObj = p.purchase_request_detail || (typeof p.purchase_request === 'object' ? p.purchase_request : null) || mapped.find(r => r.id === p.purchase_request || String(r.id) === String(p.purchase_request) || r.id === p.request_id || r.id === p.requestId)
          const reqId = p.requestId || p.request_id || prObj?.request_id || prObj?.id || (typeof p.purchase_request === 'string' ? p.purchase_request : (p.purchase_request ? `REQ-${p.purchase_request}` : ''))
          const reqTitle = p.requestTitle || p.request_title || prObj?.title || (reqId ? `Procurement Order: ${reqId}` : 'Procurement Order')

          const vObj = p.vendor_detail || (typeof p.vendor === 'object' ? p.vendor : null)
          let vendorName = p.vendor_name || vObj?.name || (typeof p.vendor === 'string' && isNaN(Number(p.vendor)) ? p.vendor : '')
          if (!vendorName || !isNaN(Number(vendorName))) {
            const vFound = rawVendors.find((v: any) => String(v.id) === String(p.vendor) || String(v.unique_vendor_id) === String(p.vendor))
            if (vFound?.name) {
              vendorName = vFound.name
            } else {
              const matchedPo = combinedPOs.find(po => po.requestId === reqId)
              vendorName = matchedPo?.vendor || prObj?.vendor || 'Vendor Partner'
            }
          }

          const invObj = p.invoice_detail || (typeof p.invoice === 'object' ? p.invoice : null)
          const invNum = p.invoiceId || p.invoice_number || invObj?.invoice_number || (typeof p.invoice === 'string' && isNaN(Number(p.invoice)) ? p.invoice : '') || (reqId ? `INV-${reqId.replace(/^REQ-/, '')}` : (p.id ? `INV-${p.id}` : 'INV-PENDING'))
          const poNum = p.poNumber || p.po_number || invObj?.purchase_order_detail?.po_id || combinedPOs.find(po => po.requestId === reqId)?.poNumber || (reqId ? `PO-${reqId.replace(/^REQ-/, '')}` : (p.id ? `PO-${p.id}` : 'PO-PENDING'))
          const grnNum = p.grnNumber || p.grn_number || (reqId ? `GRN-${reqId.replace(/^REQ-/, '')}` : 'GRN-VERIFIED')

          const amountNum = Number(p.amount) || Number(p.totalAmount) || prObj?.amount || 0
          const taxAmt = Number(p.taxAmount) || Number(p.tax_amount) || Math.round(amountNum * 0.18)
          const payDate = p.paymentDate || p.payment_date || (p.status === 'Paid' ? (p.updated_at || p.created_at || new Date().toISOString()).split('T')[0] : undefined)
          const dueDate = p.dueDate || p.due_date || (p.created_at ? new Date(new Date(p.created_at).getTime() + 15 * 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
          const payMethod = p.paymentMethod || p.payment_method || 'Bank Transfer'
          const payId = p.payment_id || (p.id ? (String(p.id).startsWith('PAY-') ? String(p.id) : `PAY-${p.id}`) : 'PAY-001')

          let status: PaymentStatus = 'Pending'
          const rawSt = (p.status || '').toLowerCase()
          if (rawSt === 'paid') status = 'Paid'
          else if (rawSt === 'processing') status = 'Processing'
          else if (rawSt === 'on hold' || rawSt === 'on_hold') status = 'On Hold'
          else if (rawSt === 'failed') status = 'Failed'
          else status = 'Pending'

          const notesStr = String(p.notes || '')
          const disbursedByRole = p.disbursed_by_role || (
            notesStr.toLowerCase().includes('finance') ? 'FINANCE' :
            notesStr.toLowerCase().includes('admin') ? 'ADMIN' :
            notesStr.toLowerCase().includes('manager') ? 'MANAGER' :
            (prObj?.history?.some((h: any) => h.actorRole === 'FINANCE' && h.action?.includes('Payment')) ? 'FINANCE' : 'MANAGER')
          )

          return {
            id: payId,
            requestId: reqId,
            requestTitle: reqTitle,
            vendor: vendorName,
            invoiceId: invNum,
            poNumber: poNum,
            grnNumber: grnNum,
            amount: amountNum,
            taxAmount: taxAmt,
            dueDate: dueDate,
            paymentDate: payDate,
            paymentMethod: payMethod,
            status: status,
            disbursedByRole: disbursedByRole,
            notes: p.notes || (status === 'Paid' ? 'Payment settled successfully via banking gateway.' : 'Awaiting treasury authorization.'),
            transactionRef: p.transactionRef || p.reference_number || (status === 'Paid' ? `UTR-${(payDate || new Date().toISOString().split('T')[0]).replace(/-/g, '')}-${payId.replace('PAY-', '')}` : undefined),
            history: Array.isArray(p.history) && p.history.length > 0 ? p.history : [
              {
                timestamp: `${payDate || dueDate} 10:00 AM`,
                actor: disbursedByRole === 'FINANCE' ? 'Finance Treasury Officer' : 'Procurement Manager',
                action: status === 'Paid' ? 'Payment Released & Settled' : 'Payment Queued',
                note: p.notes || (status === 'Paid' ? 'Bank Transfer UTR Generated' : 'Pending Disbursal')
              }
            ]
          }
        })
        setPayments(mappedBackendPayments)

        // ─── MAP AND COMBINE BACKEND & REAL LOCAL QUOTATIONS ────────────────
        const rawQuotesList = Array.isArray(quotesRes?.data) ? quotesRes.data : quotesRes?.data?.results || []
        const nestedQuotesList = rawRfqs.flatMap((r: any) => Array.isArray(r.quotations) ? r.quotations : [])
        
        // Deduplicate quotes by quotation_id or id
        const quoteMap = new Map<string, any>()
        rawQuotesList.forEach((q: any) => {
          const qKey = q.quotation_id || String(q.id)
          if (qKey) quoteMap.set(qKey, q)
        })
        nestedQuotesList.forEach((q: any) => {
          const qKey = q.quotation_id || String(q.id)
          if (qKey && !quoteMap.has(qKey)) quoteMap.set(qKey, q)
        })
        const rawQuotes = Array.from(quoteMap.values())

        const computeQuoteAttributes = (q: any, rfqTitle: string, rfqQty: number, price: number) => {
          const extra = q.extra_fields || {}
          const quoteDate = (q.created_at || q.issueDate || q.submittedDate || new Date().toISOString()).split('T')[0]
          const deliveryDays = Number(q.delivery_days) || parseInt(q.leadTime) || 7

          let expectedDeliveryDate = q.expectedDeliveryDate || q.expected_delivery_date || extra.expected_delivery_date
          if (!expectedDeliveryDate && deliveryDays > 0) {
            const d = new Date(quoteDate)
            if (!isNaN(d.getTime())) {
              d.setDate(d.getDate() + deliveryDays)
              expectedDeliveryDate = d.toISOString().split('T')[0]
            }
          }

          const validUntil = q.valid_until || q.validUntil || q.rfq_deadline || q.expiryDate || q.quoteValidUntil || extra.expiry_date || ''
          const terms = (q.terms_conditions || q.paymentTerms || q.notes || extra.notes || '').trim()

          const warranty = q.warranty_duration || q.warrantyDuration || extra.warranty_duration || (q.warranty_months ? `${q.warranty_months} Months` : (q.warranty || '12 Months'))
          const qty = (rfqQty && rfqQty > 0) ? rfqQty : (Number(q.quantity) || 1)
          const baseSubtotal = Number(q.baseAmount ?? q.base_amount ?? extra.base_amount) || Number(q.price) || price || 0
          const unitRate = Number(q.unitPrice ?? q.unit_price) || (qty > 0 ? Math.round(baseSubtotal / qty) : baseSubtotal)
          const gstPct = Number(q.gstPercent ?? q.gst_rate ?? q.gst_percent ?? extra.gst_percent ?? extra.gst_rate) || 18
          const taxAmt = Number(q.taxAmount ?? q.tax_amount ?? q.gstAmount ?? q.gst_amount ?? extra.gst_amount ?? extra.tax_amount) || Math.round(baseSubtotal * (gstPct / 100))
          const grandTotal = Number(q.totalAmount ?? q.total_amount ?? extra.total_amount) || (baseSubtotal + taxAmt)
          const unitLandedPrice = Number(q.unitLandedPrice ?? q.unit_landed_price) || (qty > 0 ? Math.round(grandTotal / qty) : grandTotal)

          return {
            quoteDate,
            deliveryDays,
            expectedDeliveryDate,
            validUntil,
            terms,
            warranty,
            gstPct,
            unitRate,
            unitLandedPrice,
            taxAmt,
            grandTotal,
            baseSubtotal
          }
        }

        const mappedBackendQuotes: QuotationItem[] = rawQuotes.map((q: any) => {
          const extra = q.extra_fields || {}
          const rfqObj = typeof q.rfq === 'object' 
            ? q.rfq 
            : rawRfqs.find((r: any) => 
                String(r.id) === String(q.rfq) || 
                String(r.rfq_id) === String(q.rfq) || 
                String(r.rfq_id) === String(q.rfq_id) || 
                String(r.id) === String(q.rfq_id)
              )
          const vendorObj = q.vendor_detail || (typeof q.vendor === 'object' ? q.vendor : null)
          const vendorName = vendorObj?.name || (typeof q.vendor === 'string' ? q.vendor : 'Vendor')
          const price = Number(q.price) || Number(q.totalAmount) || Number(q.baseAmount) || 0
          const rfqId = q.rfq_id || q.rfq_detail?.rfq_id || rfqObj?.rfq_id || (typeof q.rfq === 'string' ? q.rfq : (q.rfq ? `RFQ-${q.rfq}` : ''))
          const rfqTitle = q.rfq_title || rfqObj?.title || rfqObj?.purchase_request_detail?.title || 'Procured Item'
          const rfqQty = Number(q.quantity) || rfqObj?.purchase_request_detail?.quantity || rfqObj?.qty || 1

          const attrs = computeQuoteAttributes(q, rfqTitle, rfqQty, price)

          return {
            id: q.quotation_id || (q.id ? (String(q.id).startsWith('QUO-') ? String(q.id) : `QUO-${q.id}`) : ''),
            rfqId,
            rfq_id: rfqId,
            rfqRef: rfqId,
            rfqTitle,
            vendor: vendorName,
            vendorId: vendorObj?.unique_vendor_id || q.vendor_id || String(q.vendor || ''),
            product: rfqTitle,
            specification: q.terms_conditions || '',
            quoteDate: attrs.quoteDate,
            validUntil: attrs.validUntil,
            unitPrice: attrs.unitRate,
            unitLandedPrice: attrs.unitLandedPrice,
            baseAmount: attrs.baseSubtotal,
            price: price || attrs.baseSubtotal,
            quantity: rfqQty,
            gstRate: attrs.gstPct,
            gstPercent: attrs.gstPct,
            gstAmount: attrs.taxAmt,
            taxAmount: attrs.taxAmt,
            shippingCost: 0,
            discountAmount: 0,
            totalAmount: attrs.grandTotal,
            deliveryDays: attrs.deliveryDays,
            warranty: attrs.warranty,
            paymentTerms: attrs.terms,
            complianceRating: 'Verified',
            performanceScore: vendorObj?.performance_score ? parseFloat(vendorObj.performance_score) : 95,
            vendorRating: vendorObj?.rating ? parseFloat(vendorObj.rating) : 4.8,
            status: (q.status === 'Selected' || q.status === 'Shortlisted' || q.status === 'Rejected') ? q.status : 'Under Evaluation',
            notes: q.terms_conditions || q.notes || extra.notes,
            technicalCompliance: 'Compliant',
            commercialCompliance: 'Approved',
            productQty: q.productQty || q.product_qty || extra.product_qty || `${rfqQty} Units`,
            warrantyType: q.warrantyType || q.warranty_type || extra.warranty_type || 'On-site',
            freeServiceCount: q.freeServiceCount || q.free_service_count || extra.free_service_count || '3 Services',
            installationType: q.installationType || q.installation_type || extra.installation_type || 'Free',
            techSupportDuration: q.techSupportDuration || q.tech_support_duration || extra.tech_support_duration || '24/7 Dedicated Support',
            replacementPolicy: q.replacementPolicy || q.replacement_policy || extra.replacement_policy || 'Standard SLA',
            accessoriesIncluded: q.accessoriesIncluded || q.accessories_included || extra.accessories_included || 'Standard OEM Accessories & Documentation',
            expectedDeliveryDate: attrs.expectedDeliveryDate,
            grnDocNumber: q.grnDocNumber || q.grn_doc_number || extra.grn_doc_number,
            receiptNumber: q.receiptNumber || q.receipt_number || extra.receipt_number,
            submittedAt: (q.created_at || '').split('T')[0]
          }
        })

        // Exclusively use PostgreSQL backend quotations as single source of truth - sort newest-first
        mappedBackendQuotes.sort((a, b) => {
          const timeA = new Date(a.submittedAt || a.quoteDate || 0).getTime()
          const timeB = new Date(b.submittedAt || b.quoteDate || 0).getTime()
          if (timeA !== timeB) return timeB - timeA
          return (b.id || '').localeCompare(a.id || '')
        })
        setQuotations(mappedBackendQuotes)

        // ─── MAP AND SET BACKEND GOODS RECEIPTS ───────────────────────────────
        const rawGRs = Array.isArray(grsRes?.data) ? grsRes.data : grsRes?.data?.results || []
        const mappedBackendReceipts: GoodsReceiptItem[] = rawGRs.map((gr: any) => {
          const poObj = gr.purchase_order_detail || (typeof gr.purchase_order === 'object' ? gr.purchase_order : null)
          const prObj = poObj?.purchase_request_detail || gr.purchase_request_detail || mapped.find(r => r.id === poObj?.purchase_request || r.id === poObj?.request_id || r.id === gr.purchase_request || r.id === gr.request_id)
          const vObj = poObj?.vendor_detail || gr.vendor_detail || (typeof gr.vendor === 'object' ? gr.vendor : null)
          const poNum = gr.po_id || poObj?.po_id || (gr.purchase_order ? (String(gr.purchase_order).startsWith('PO-') ? String(gr.purchase_order) : `PO-${gr.purchase_order}`) : '')
          const reqId = gr.request_id || prObj?.request_id || prObj?.id || (poObj?.purchase_request ? `REQ-${poObj.purchase_request}` : '')
          const vendorName = gr.vendor_name || vObj?.name || (typeof gr.vendor === 'string' && isNaN(Number(gr.vendor)) ? gr.vendor : '') || (poObj?.vendor_name || 'Vendor Partner')
          const prodName = gr.product_name || prObj?.title || poObj?.title || 'Procured Equipment'
          const ordQty = Number(gr.ordered_quantity) || Number(prObj?.quantity) || 1
          const recQty = Number(gr.received_quantity) || ordQty
          const damQty = Number(gr.damaged_quantity) || 0
          const dateStr = (gr.delivery_date || gr.created_at || new Date().toISOString()).split('T')[0]
          const grnNum = gr.receipt_id || (gr.id ? (String(gr.id).startsWith('REC-') || String(gr.id).startsWith('GRN-') ? String(gr.id) : `GRN-${gr.id}`) : `GRN-${poNum.replace('PO-', '')}`)
          
          let st: GoodsReceiptItem['status'] = 'Pending Verification'
          const rawSt = (gr.status || '').toLowerCase()
          if (rawSt === 'verified' || rawSt === 'confirmed' || rawSt === 'approved' || rawSt.includes('verified')) {
            st = 'Verified'
          } else if (rawSt === 'rejected') {
            st = 'Rejected'
          }

          const recBy = gr.received_by_detail ? `${gr.received_by_detail.first_name || ''} ${gr.received_by_detail.last_name || ''}`.trim() || gr.received_by_detail.username : (gr.received_by || 'Warehouse Team')

          return {
            id: grnNum,
            grnNumber: grnNum,
            poNumber: poNum,
            requestId: reqId,
            vendor: vendorName,
            receivedDate: dateStr,
            product: prodName,
            orderedQuantity: ordQty,
            receivedQuantity: recQty,
            damagedQuantity: damQty,
            inspectionStatus: damQty > 0 ? 'Discrepancy Found' : (st === 'Verified' ? 'Passed' : 'Inspection Pending'),
            receivedBy: recBy,
            status: st,
            warehouseLocation: gr.delivery_location || 'Pune HQ Warehouse',
            // Explicit manager verification data from /verify/ endpoint
            verified_by_name: gr.verified_by_name || '',
            verifiedByName: gr.verified_by_name || '',
            verified_at: gr.verified_at || null,
          }
        })
        setReceipts(mappedBackendReceipts)

        // ─── ENRICH REQUESTS WITH REAL PAYMENT & FULFILLMENT DATA ─────────────
        const enrichedRequests = uniqueMapped.map(r => {
          const reqNorm = (r.id || '').replace(/^(REQ-|PO-|TCK-|RFQ-)/, '').trim().toUpperCase()
          
          // Match payment
          const matchingPayment = mappedBackendPayments.find(p => {
            if (!p.requestId) return false
            const pNorm = p.requestId.replace(/^(REQ-|PO-|TCK-|RFQ-)/, '').trim().toUpperCase()
            return p.requestId === r.id || pNorm === reqNorm || (r.poNumber && p.poNumber === r.poNumber)
          })

          // Match PO
          const matchingPo = combinedPOs.find(po => {
            if (!po.requestId) return false
            const poNorm = po.requestId.replace(/^(REQ-|PO-|TCK-|RFQ-)/, '').trim().toUpperCase()
            return po.requestId === r.id || poNorm === reqNorm
          })

          // Match GRN
          const matchingGrn = mappedBackendReceipts.find(gr => {
            const grReqNorm = (gr.requestId || '').replace(/^(REQ-|PO-|TCK-|RFQ-)/, '').trim().toUpperCase()
            return gr.requestId === r.id || (grReqNorm && grReqNorm === reqNorm) || (matchingPo && gr.poNumber === matchingPo.poNumber)
          })

          // Match Invoice
          const matchingInv = mappedBackendInvoices.find(inv => {
            const invReqNorm = (inv.requestId || '').replace(/^(REQ-|PO-|TCK-|RFQ-)/, '').trim().toUpperCase()
            return inv.requestId === r.id || (invReqNorm && invReqNorm === reqNorm) || (matchingPo && inv.poNumber === matchingPo.poNumber)
          })

          const isPaid = matchingPayment?.status === 'Paid' || r.paymentStatus === 'Paid' || (r.currentStage !== undefined && r.currentStage >= 9)

          const effectiveUtr = matchingPayment?.transactionRef || r.paymentTransactionRef || (isPaid ? (matchingPayment?.referenceNumber || `UTR-${(matchingPayment?.paymentDate || r.date || '20260928').replace(/-/g, '')}-${reqNorm}`) : undefined)
          const effectivePaidDate = matchingPayment?.paymentDate || r.paidDate || (isPaid ? (r.date || new Date().toISOString().split('T')[0]) : undefined)
          const effectiveVendor = matchingPayment?.vendor || matchingPo?.vendor || matchingInv?.vendor || r.vendor || 'Dell Technologies India'
          const effectivePoNum = matchingPo?.poNumber || r.poNumber || (matchingPayment?.poNumber ? matchingPayment.poNumber : undefined)
          const effectiveGrnNum = matchingGrn?.grnNumber || r.grnNumber || (matchingPayment?.grnNumber ? matchingPayment.grnNumber : undefined)

          return {
            ...r,
            poNumber: effectivePoNum,
            po_number: effectivePoNum,
            grnNumber: effectiveGrnNum,
            grn_number: effectiveGrnNum,
            vendor: effectiveVendor,
            paymentStatus: (isPaid ? 'Paid' : (matchingPayment?.status || r.paymentStatus || 'Unpaid')) as 'Paid' | 'Pending' | 'Processing' | 'Unpaid' | 'On Hold',
            paidDate: effectivePaidDate,
            paymentTransactionRef: effectiveUtr,
            status: isPaid ? 'completed' : (matchingInv ? 'invoiced' : matchingGrn ? 'delivered' : matchingPo ? 'assigned_to_vendor' : r.status),
            currentStage: isPaid ? 9 : (matchingInv ? 8 : matchingGrn ? 7 : matchingPo ? 6 : r.currentStage),
            financeStatus: isPaid ? 'Completed — Payment Settled' : (matchingInv ? 'Invoice Received — Ready for Settlement' : matchingGrn ? 'Delivery Verified' : matchingPo ? `PO Released (${effectivePoNum})` : r.financeStatus),
            deliveryDetails: matchingGrn ? {
              grnNumber: matchingGrn.grnNumber,
              deliveryDate: matchingGrn.receivedDate,
              receivedQty: matchingGrn.receivedQuantity,
              acceptedQty: matchingGrn.receivedQuantity - (matchingGrn.damagedQuantity || 0)
            } : r.deliveryDetails,
            invoiceDetails: matchingInv ? {
              invoiceNumber: matchingInv.invoiceNumber,
              invoiceDate: matchingInv.invoiceDate,
              dueDate: matchingInv.dueDate,
              amount: matchingInv.totalAmount,
              taxAmount: matchingInv.taxAmount,
              gstNumber: matchingInv.gstNumber
            } : r.invoiceDetails
          }
        })

        // Re-set lists with enriched requests
        setPendingApprovals(enrichedRequests.filter(r => ((r.currentStage ?? 1) === 1 || r.status === 'pending_approval') && r.status !== 'rejected' && r.status !== 'pending_arrival'))
        setArrivedRequests(enrichedRequests.filter(r => ((r.currentStage ?? 1) === 1 || r.status === 'pending_approval') && r.status !== 'rejected' && r.status !== 'pending_arrival'))
        setMyApprovals(enrichedRequests.filter(r => (r.currentStage ?? 1) >= 4 && r.status !== 'rejected'))
        setRejectedRequests(enrichedRequests.filter(r => r.status === 'rejected'))
        setFinanceReview(enrichedRequests.filter(r => (
          r.isForwardedToFinance ||
          r.status === 'finance_review' ||
          r.status === 'recommended_to_finance' ||
          r.status === 'sent_to_finance' ||
          r.paymentStatus === 'Paid' ||
          mappedBackendPayments.some(p => (p.requestId === r.id || p.requestId?.includes(r.id.replace('REQ-', ''))) && p.status === 'Paid')
        ) && r.status !== 'rejected'))
        setRecommendedToFinance(enrichedRequests.filter(r => ((r.currentStage ?? 1) === 2 || r.status === 'finance_review' || r.status === 'recommended_to_finance') && r.isForwardedToFinance && r.status !== 'rejected'))
        setRecommendedToAdmin(enrichedRequests.filter(r => ((r.currentStage ?? 1) === 3 || r.status === 'recommended_to_admin') && r.status !== 'rejected'))
      } catch (err) {
        console.warn('Failed fetching secondary data in manager context:', err)
      }

    } catch (e) {
      console.warn('Backend manager fetch fallback:', e)
    } finally {
      isFetchingRef.current = false
    }
  }

  useEffect(() => {
    refreshManagerBackendData()
    const handleUpdate = () => refreshManagerBackendData()
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshManagerBackendData()
      }
    }
    window.addEventListener('kss_backend_updated', handleUpdate)
    window.addEventListener('focus', handleUpdate)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 3s active background heartbeat for real-time live synchronization across all portals
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }
      refreshManagerBackendData()
    }, 3000)
    return () => {
      window.removeEventListener('kss_backend_updated', handleUpdate)
      window.removeEventListener('focus', handleUpdate)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(interval)
    }
  }, [])

  // Computed: ALL requests across the procurement lifecycle
  const allRequests = useMemo(() => {
    const list = [
      ...arrivedRequests,
      ...pendingApprovals,
      ...myApprovals,
      ...rejectedRequests,
      ...financeReview,
      ...recommendedToFinance,
      ...recommendedToAdmin,
    ]
    const deduplicated = list.filter((item, idx, self) => idx === self.findIndex(t => t.id === item.id))
    return deduplicated.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.date ? new Date(a.date).getTime() : 0)
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.date ? new Date(b.date).getTime() : 0)
      return timeB - timeA
    })
  }, [arrivedRequests, pendingApprovals, myApprovals, rejectedRequests, financeReview, recommendedToFinance, recommendedToAdmin])

  const allRequestsRef = React.useRef<ProcurementRequest[]>([])
  useEffect(() => {
    allRequestsRef.current = allRequests
    const dynamic = buildDynamicTickets(allRequests, purchaseOrders, quotations, receipts, rfqs, invoices)
    setTickets(dynamic)
  }, [allRequests, purchaseOrders, quotations, receipts, rfqs, invoices])

  // Computed: Finance-relevant requests (only those forwarded, escalated, or reached Finance review/approval)
  const financeRequests = useMemo(() => {
    return allRequests.filter(isFinanceRelevantRequest)
  }, [allRequests])

  // Computed: Pending Financial Approvals (all requests awaiting finance action)
  const pendingFinancialApprovals = useMemo(() => {
    return allRequests.filter(r => {
      const isApp = Boolean(
        r.status === 'approved' ||
        r.status === 'finance_approved' ||
        (r.currentStage !== undefined && r.currentStage >= 4) ||
        r.status === 'quotes_received' ||
        r.status === 'assigned_to_vendor' ||
        r.status === 'delivered' ||
        r.status === 'invoiced' ||
        r.status === 'completed' ||
        r.financeApprovedBy ||
        r.financeApprovedDate ||
        r.financeStatus === 'Approved'
      )
      const isRej = Boolean(
        r.status === 'rejected' ||
        r.status === 'finance_rejected' ||
        r.financeStatus === 'Rejected'
      )
      return (
        r.isForwardedToFinance &&
        !isApp &&
        !isRej &&
        ((r.currentStage ?? 1) === 2 ||
         r.status === 'finance_review' ||
         r.status === 'recommended_to_finance' ||
         r.status === 'sent_to_finance' ||
         r.financeStatus === 'Pending Finance Approval' ||
         r.financeStatus === 'Under Review' ||
         r.financeStatus === 'Sent to Finance')
      )
    })
  }, [allRequests])

  // Computed: Approved Finance Requests
  const approvedFinanceRequests = useMemo(() => {
    return allRequests.filter(r => {
      const isApp = Boolean(
        r.financeStatus === 'Approved' ||
        r.status === 'approved' ||
        r.status === 'finance_approved' ||
        (r.currentStage !== undefined && r.currentStage >= 4) ||
        r.status === 'quotes_received' ||
        r.status === 'assigned_to_vendor' ||
        r.status === 'delivered' ||
        r.status === 'invoiced' ||
        r.status === 'completed' ||
        r.financeApprovedBy ||
        r.financeApprovedDate
      )
      const isRej = Boolean(
        r.status === 'rejected' ||
        r.status === 'finance_rejected' ||
        r.financeStatus === 'Rejected'
      )
      return r.isForwardedToFinance && isApp && !isRej
    })
  }, [allRequests])

  // Computed: Rejected Finance Requests
  const rejectedFinanceRequests = useMemo(() => {
    return [
      ...rejectedRequests.filter(r => r.rejectedBy?.toLowerCase().includes('finance') || r.status === 'finance_rejected'),
      ...financeAuditHistory.filter(a => a.action === 'REJECTED').map(a => ({
        id: a.requestId,
        title: a.requestTitle,
        requester: 'Procurement Requester',
        department: 'Corporate',
        category: 'Procurement',
        amount: a.amount,
        date: a.timestamp.split(' ')[0],
        status: 'rejected' as RequestStatus,
        priority: 'Medium' as const,
        rejectionReason: a.reason || 'Finance Review Rejection',
        rejectedBy: a.actor,
        rejectedDate: a.timestamp.split(' ')[0],
        financeComment: a.comment,
      })),
    ].filter((item, idx, self) => idx === self.findIndex(t => t.id === item.id))
  }, [rejectedRequests, financeAuditHistory])

  // Finance-scoped payments and payment analytics
  const financePayments = useMemo(() => {
    return payments.filter(p => p.disbursedByRole === 'FINANCE' || (p.notes && p.notes.toLowerCase().includes('finance')))
  }, [payments])

  const financePaymentData = useMemo(() => {
    return computePaymentAnalytics(financePayments, financeRequests)
  }, [financePayments, financeRequests])

  // Manager Dashboard stats
  const dashboardStats = useMemo<DashboardStats>(() => ({
    pendingApprovals: pendingApprovals.length,
    myApprovals: myApprovals.length,
    rejectedRequests: rejectedRequests.length,
    financeReview: financeReview.length,
    totalRequestValue: allRequests.reduce((sum, r) => sum + r.amount, 0),
    requestArrival: arrivedRequests.length,
  }), [pendingApprovals, myApprovals, rejectedRequests, financeReview, allRequests, arrivedRequests])

  // Finance KPIs — computed strictly from real database arrays and finance-scoped transactions
  const financeKPIs = useMemo<FinanceKPIs>(() => {
    const totalBudget = budgets.reduce((acc, b) => acc + (Number(b.totalBudget) || 0), 0)
    const allocatedBudget = budgets.reduce((acc, b) => acc + (Number(b.allocated) || 0), 0)
    const committedBudget = budgets.reduce((acc, b) => acc + (Number(b.committed) || 0), 0)
    const spentBudget = budgets.reduce((acc, b) => acc + (Number(b.spent) || 0), 0)
    const availableBudget = totalBudget - spentBudget - committedBudget

    // Pending Invoices: Real invoices in PostgreSQL that are awaiting verification or payment
    const pendingInvoicesList = invoices.filter(inv => {
      const st = (inv.status || '').toLowerCase()
      return st !== 'paid' && st !== 'rejected' && st !== 'accepted'
    })
    const pendingInvoicesCount = pendingInvoicesList.length
    const pendingInvoicesAmount = pendingInvoicesList.reduce((acc, inv) => acc + (Number(inv.totalAmount) || Number((inv as any).amount) || 0), 0)

    // Invoice Exceptions: Invoices on hold / error / rejected or payments failed
    const invoiceExceptionsList = [
      ...invoices.filter(inv => {
        const st = (inv.status || '').toLowerCase()
        return st === 'on hold' || st === 'on_hold' || st === 'exception' || st === 'rejected'
      }),
      ...financePayments.filter(p => p.status === 'Failed' || p.status === 'On Hold')
    ]
    const invoiceExceptionsCount = invoiceExceptionsList.length
    const invoiceExceptionsAmount = invoiceExceptionsList.reduce((acc, item: any) => acc + (Number(item.totalAmount) || Number(item.amount) || 0), 0)

    // Pending Payments (Finance Queue)
    const pendingPaymentsList = financePayments.filter(p => p.status === 'Pending' || p.status === 'Processing')
    const pendingPaymentsCount = pendingPaymentsList.length
    const pendingPaymentsAmount = pendingPaymentsList.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)

    // Paid Payments (Finance Completed Only)
    const financePaidList = payments.filter(p => p.status === 'Paid' && (p.disbursedByRole === 'FINANCE' || (p.notes && p.notes.toLowerCase().includes('finance'))))
    const paidAmount = financePaidList.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
    const paidPaymentsCount = financePaidList.length

    return {
      totalBudget,
      availableBudget,
      committedBudget,
      spentBudget,
      allocatedBudget,
      pendingInvoicesCount,
      pendingInvoicesAmount,
      invoiceExceptionsCount,
      invoiceExceptionsAmount,
      pendingPaymentsCount,
      pendingPaymentsAmount,
      paidAmount,
      paidPaymentsCount,
    }
  }, [budgets, invoices, payments, financePayments])

  // Real-time dynamic payment analytics for Manager & Finance dashboards
  const paymentData = useMemo(() => {
    return computePaymentAnalytics(payments, allRequests)
  }, [payments, allRequests])

  // ─── Manager Actions ────────────────────────────────────────────────────────

  const acceptRequest = useCallback((id: string) => {
    const req = arrivedRequests.find(r => r.id === id)
    if (!req) return
    setArrivedRequests(prev => prev.filter(r => r.id !== id))
    setPendingApprovals(prev => [...prev, { ...req, status: 'pending_approval' }])
  }, [arrivedRequests])

  const rejectRequest = useCallback((id: string, reason: string, notes?: string) => {
    rejectRequestApi(id, 1, reason)
      .then(() => refreshManagerBackendData())
      .catch((e) => console.warn('Backend reject warning:', e))
    const req = arrivedRequests.find(r => r.id === id) || pendingApprovals.find(r => r.id === id)
    if (!req) return
    setArrivedRequests(prev => prev.filter(r => r.id !== id))
    setPendingApprovals(prev => prev.filter(r => r.id !== id))
    setRejectedRequests(prev => [...prev, {
      ...req,
      status: 'rejected',
      rejectionReason: reason,
      rejectedBy: 'Sarah Manager',
      rejectedDate: new Date().toISOString().split('T')[0],
      description: notes || req.description,
    }])
  }, [arrivedRequests, pendingApprovals])

  const recommendToFinance = useCallback((id: string, reason: string) => {
    recommendToFinanceApi(id, 1, reason)
      .then(() => {
        refreshManagerBackendData()
        window.dispatchEvent(new Event('kss_backend_updated'))
      })
      .catch((e) => console.warn('Backend recommend warning:', e))
    const req = arrivedRequests.find(r => r.id === id) || pendingApprovals.find(r => r.id === id) || allRequestsRef.current.find(r => r.id === id)
    if (!req) return
    setArrivedRequests(prev => prev.filter(r => r.id !== id))
    setPendingApprovals(prev => prev.filter(r => r.id !== id))
    const updated: ProcurementRequest = {
      ...req,
      status: 'recommended_to_finance',
      currentStage: 2,
      isForwardedToFinance: true,
      recommendationReason: reason,
      recommendedBy: 'Sarah Manager',
      recommendedDate: new Date().toISOString().split('T')[0],
      financeStatus: 'Pending Finance Approval',
    }
    setRecommendedToFinance(prev => [...prev.filter(r => r.id !== id), updated])
    setFinanceReview(prev => [...prev.filter(r => r.id !== id), { ...updated, status: 'finance_review' }])
    window.dispatchEvent(new Event('kss_backend_updated'))
  }, [arrivedRequests, pendingApprovals])

  const approveRequest = useCallback((id: string, notes?: string, approvalParams?: ApprovalParameters) => {
    const req = pendingApprovals.find(r => r.id === id) || arrivedRequests.find(r => r.id === id) || allRequestsRef.current.find(r => r.id === id)
    if (!req) return
    const today = new Date().toISOString().split('T')[0]

    const finalParams: ApprovalParameters = approvalParams || {
      requestedAmount: req.amount,
      approvedAmount: req.amount,
      budgetAvailable: 'Yes',
      costCenter: req.costCenter || `CC-${req.department.toUpperCase().slice(0, 3)}-2026`,
      vendor: req.vendor || 'Approved Vendor',
      commercialEvaluation: 'Completed',
      businessJustification: req.justification || 'Department operational need',
      businessImpact: 'Maintains operational readiness and project schedule',
      riskCompliance: 'Passed',
      approvalComments: notes || 'Verified and approved by department manager',
      approvedBy: 'Sarah Manager',
      approvedAt: new Date().toISOString()
    }

    const approvedAmountVal = finalParams.approvedAmount || req.amount || 0

    approveRequestApi(id, notes, approvedAmountVal)
      .then(() => refreshManagerBackendData())
      .catch((e) => console.warn('Backend approve warning:', e))

    // 1. Remove from Manager's pending queue
    setPendingApprovals(prev => prev.filter(r => r.id !== id))
    setArrivedRequests(prev => prev.filter(r => r.id !== id))

    const approvedReq: ProcurementRequest = {
      ...req,
      status: 'approved',
      currentStage: 4,
      isForwardedToFinance: false,
      financeStatus: 'Not Escalated',
      approvedBy: finalParams.approvedBy,
      approvedDate: today,
      description: notes || req.description,
      amount: req.amount,
      approvedAmount: approvedAmountVal,
      vendor: finalParams.vendor || req.vendor,
      costCenter: finalParams.costCenter || req.costCenter,
      approvalParams: finalParams
    }

    // 2. Track in Manager approved list
    setMyApprovals(prev => [approvedReq, ...prev.filter(r => r.id !== id)])

    // 3. Ensure it is NOT placed in Finance review queue (Manager direct approval bypasses finance)
    setFinanceReview(prev => prev.filter(r => r.id !== id))
    setRecommendedToFinance(prev => prev.filter(r => r.id !== id))
  }, [pendingApprovals, arrivedRequests])

  const addRFQ = useCallback(async (rfqData: RFQ) => {
    try {
      // Submit to backend
      const payload: any = {
        title: rfqData.title,
        deadline: rfqData.deadline,
        terms: rfqData.remarks,
        status: 'Open',
        category: rfqData.category,
        purchase_request: rfqData.remarks?.includes('Mapped from Approved PR: ')
            ? rfqData.remarks.split('Mapped from Approved PR: ')[1]
            : null,
      }
      if (rfqData.vendors && rfqData.vendors.length > 0) {
        payload.invited_vendors = rfqData.vendors.map(v => (v as any).unique_vendor_id || (v as any).id || v.name)
      }
      const backendRes = await createRFQApi(payload).catch(err => {
        console.warn('createRFQApi fallback:', err)
        return null
      })

      const backendRfq = backendRes?.data || backendRes
      const effectiveRfqId = backendRfq?.rfq_id || backendRfq?.id || rfqData.id
      const finalRfq: RFQ = {
        ...rfqData,
        id: effectiveRfqId,
        status: 'sent',
        department: backendRfq?.purchase_request_detail?.department_detail?.name || rfqData.department || 'IT'
      }

      // Optimistically add it locally so it appears immediately
      setRfqs(prev => [finalRfq, ...prev.filter(r => r.id !== finalRfq.id && r.id !== rfqData.id && !isMockRfq(r.id))])
      localStorage.removeItem('kss_rfqs')

      // Update local PR stage to show tracking progress
      if (payload.purchase_request) {
          const prId = payload.purchase_request
          const updateReq = (r: ProcurementRequest) => r.id === prId ? { ...r, status: 'In Procurement' as RequestStatus, currentStage: 5 } : r
          setMyApprovals(prev => prev.map(updateReq))
          setPendingApprovals(prev => prev.map(updateReq))
          setArrivedRequests(prev => prev.map(updateReq))
          setFinanceReview(prev => prev.map(updateReq))
      }

      // Refresh full dataset from backend to link relations immediately
      await refreshManagerBackendData()
    } catch (error: any) {
      console.error("Failed to save RFQ to backend:", error)
    } finally {
      // Broadcast real-time update event to all portals
      window.dispatchEvent(new Event('kss_backend_updated'))
      window.dispatchEvent(new Event('storage'))
    }
  }, [])

  const selectVendorQuotation = useCallback((quoteId: string, rfqId: string, product: string, notes?: string) => {
    const now = new Date().toISOString()
    const selNotes = notes || 'Selected as best value / technical compliance'

    const chosenQuote = quotations.find(q => q.id === quoteId)
    const vName = chosenQuote?.vendor || ''
    const vId = resolveVendorId(vName, chosenQuote?.vendorId)
    const qAmount = chosenQuote?.totalAmount || chosenQuote?.unitPrice || 94400

    setQuotations(prev => prev.map(q => {
      const isTargetQuote = q.id === quoteId
      const isSameProduct = q.rfqId === rfqId || (product && q.product === product)

      if (isTargetQuote) {
        return {
          ...q,
          status: 'Selected',
          selectedBy: 'Sarah Manager',
          selectedAt: now,
          selectionNotes: selNotes
        }
      }
      if (isSameProduct) {
        return {
          ...q,
          status: q.status === 'Selected' ? 'Under Evaluation' : q.status
        }
      }
      return q
    }))

    // Also update RFQ remarks
    setRfqs(prev => prev.map(r => {
      if (r.id === rfqId) {
        return {
          ...r,
          status: 'under_evaluation',
          remarks: `Vendor quotation ${quoteId} selected for ${product} by Sarah Manager`
        }
      }
      return r
    }))

    // Directly assign & forward matching procurement request to the chosen vendor
    if (chosenQuote) {
      const today = new Date().toISOString().split('T')[0]
      const vendorName = chosenQuote.vendor
      const vendorId = resolveVendorId(vendorName, chosenQuote.vendorId)

      const matchReq = (r: ProcurementRequest): ProcurementRequest => {
        const isMatch = r.id === rfqId ||
          (r.title && product && (r.title.toLowerCase().includes(product.toLowerCase()) || product.toLowerCase().includes(r.title.toLowerCase())))
        if (isMatch) {
          return {
            ...r,
            status: 'assigned_to_vendor',
            vendor: vendorName,
            vendorId,
            assignedVendorDate: today,
            financeStatus: `Assigned to ${vendorName}`,
          }
        }
        return r
      }

      setMyApprovals(prev => prev.map(matchReq))
      setRecommendedToAdmin(prev => prev.map(matchReq))
      setFinanceReview(prev => prev.map(matchReq))
      setPendingApprovals(prev => prev.map(matchReq))
      setArrivedRequests(prev => prev.map(matchReq))
    }

    // Persist selected quote locally so vendor portal immediate loads match
    try {
      const selKey = 'kss_selected_vendor_quotes'
      const existingSel = JSON.parse(localStorage.getItem(selKey) || '{}')
      existingSel[rfqId] = {
        rfqId,
        quoteId,
        product,
        notes: selNotes,
        selectedAt: now,
        vendor: vName,
        vendorName: vName,
        vendorId: vId,
        amount: qAmount,
        totalAmount: qAmount,
        quantity: chosenQuote?.quantity || 15
      }
      localStorage.setItem(selKey, JSON.stringify(existingSel))
    } catch (e) {
      console.warn('Failed writing kss_selected_vendor_quotes:', e)
    }

    // Call backend select API
    selectVendorQuotationApi(quoteId, rfqId, product, selNotes).then(() => {
      refreshManagerBackendData()
      window.dispatchEvent(new Event('kss_backend_updated'))
      window.dispatchEvent(new Event('storage'))
    }).catch(err => {
      console.warn('Backend quote selection sync error:', err)
    })

    // Broadcast update event to all portals
    window.dispatchEvent(new Event('kss_backend_updated'))
    window.dispatchEvent(new Event('storage'))
  }, [quotations])

  const sendToFinance = useCallback((id: string, message?: string) => {
    sendToFinanceApi(id, message)
      .then(() => {
        refreshManagerBackendData()
        window.dispatchEvent(new Event('kss_backend_updated'))
      })
      .catch((e) => console.warn('Backend sendToFinance warning:', e))
    const req = arrivedRequests.find(r => r.id === id) || pendingApprovals.find(r => r.id === id) || financeReview.find(r => r.id === id) || allRequestsRef.current.find(r => r.id === id)
    if (req) {
      setArrivedRequests(prev => prev.filter(r => r.id !== id))
      setPendingApprovals(prev => prev.filter(r => r.id !== id))
      const updated: ProcurementRequest = {
        ...req,
        status: 'recommended_to_finance',
        currentStage: 2,
        isForwardedToFinance: true,
        recommendationReason: message || 'Forwarded to Finance',
        recommendedBy: 'Sarah Manager',
        recommendedDate: new Date().toISOString().split('T')[0],
        financeStatus: 'Sent to Finance',
      }
      setRecommendedToFinance(prev => [...prev.filter(r => r.id !== id), updated])
      setFinanceReview(prev => [...prev.filter(r => r.id !== id), { ...updated, status: 'finance_review' }])
    }
    window.dispatchEvent(new Event('kss_backend_updated'))
  }, [arrivedRequests, pendingApprovals, financeReview])

  const verifyDocument = useCallback((
    ticketId: string,
    productIdOrDocType: string,
    docTypeOrVerifiedBy?: 'productOrder' | 'goodsReceipt' | 'invoice' | string,
    verifiedByParam?: string
  ) => {
    const now = new Date().toISOString()
    const isMultiProductCall = typeof verifiedByParam === 'string'
    const productId = isMultiProductCall ? productIdOrDocType : undefined
    const docType = (isMultiProductCall ? docTypeOrVerifiedBy : productIdOrDocType) as 'productOrder' | 'goodsReceipt' | 'invoice'
    const verifiedBy = isMultiProductCall ? verifiedByParam : (docTypeOrVerifiedBy as string)

    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t

      const updatedProducts = (t.products || []).map(p => {
        if (!productId || p.id === productId) {
          return {
            ...p,
            [docType]: { ...p[docType], verified: true, verifiedBy, verifiedAt: now },
          }
        }
        return p
      })

      const primaryProd = updatedProducts.find(p => !productId || p.id === productId) || updatedProducts[0]

      // Persist verified document reference to sync with local state & Vendor portal
      try {
        if (docType === 'goodsReceipt') {
          const saved = JSON.parse(localStorage.getItem('kss_manager_verified_grns') || '[]')
          const newRefs = [
            primaryProd?.goodsReceipt?.id,
            t.goodsReceipt?.id,
          ].filter(Boolean) as string[]
          const merged = Array.from(new Set([...saved, ...newRefs]))
          localStorage.setItem('kss_manager_verified_grns', JSON.stringify(merged))
        } else if (docType === 'invoice') {
          const saved = JSON.parse(localStorage.getItem('kss_manager_verified_invoices') || '[]')
          const newRefs = [
            primaryProd?.invoice?.id,
            t.invoice?.id,
          ].filter(Boolean) as string[]
          const merged = Array.from(new Set([...saved, ...newRefs]))
          localStorage.setItem('kss_manager_verified_invoices', JSON.stringify(merged))
        }
        window.dispatchEvent(new Event('kss_backend_updated'))
        window.dispatchEvent(new Event('storage'))
      } catch (e) {}

      return {
        ...t,
        products: updatedProducts,
        [docType]: primaryProd ? primaryProd[docType] : { ...t[docType], verified: true, verifiedBy, verifiedAt: now },
      }
    }))
  }, [])

  const submitProductTicket = useCallback((ticketId: string, productId: string, submittedBy: string) => {
    const now = new Date().toISOString()
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t
      const updatedProducts = (t.products || []).map(p => {
        if (p.id === productId) {
          return { ...p, submitted: true, submittedBy, submittedAt: now }
        }
        return p
      })

      const targetProd = updatedProducts.find(p => p.id === productId)
      const allSubmitted = updatedProducts.length > 0 && updatedProducts.every(p => p.submitted)

      // Auto-schedule payment for this specific product
      if (targetProd) {
        setPayments(currPayments => {
          const paymentKey = `${t.requestId}-${targetProd.id}`
          if (currPayments.some(p => p.requestId === paymentKey || (p.poNumber === targetProd.productOrder.id && p.invoiceId === targetProd.invoice.id))) {
            return currPayments
          }
          const newPay: PaymentRecord = {
            id: `PAY-2026-00${currPayments.length + 1}`,
            requestId: paymentKey,
            requestTitle: `${t.requestTitle} — ${targetProd.name}`,
            vendor: targetProd.vendor,
            invoiceId: targetProd.invoice.id,
            poNumber: targetProd.productOrder.id,
            grnNumber: targetProd.goodsReceipt.id,
            amount: targetProd.totalAmount,
            taxAmount: targetProd.invoice.taxAmount || Math.round(targetProd.totalAmount * 0.18),
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            paymentMethod: 'NEFT / RTGS Corporate',
            status: 'Pending',
            notes: `Auto-generated on 3-way match completion for ${targetProd.name}`,
            history: [{ timestamp: now, actor: submittedBy, action: 'Product Ticket Verified & Queued for Payment' }],
          }
          return [newPay, ...currPayments]
        })
      }

      return {
        ...t,
        products: updatedProducts,
        submitted: allSubmitted,
        submittedBy,
        submittedAt: now,
      }
    }))
  }, [])

  const submitTicket = useCallback((ticketId: string, submittedBy: string, productId?: string) => {
    if (productId) {
      submitProductTicket(ticketId, productId, submittedBy)
      return
    }
    const now = new Date().toISOString()
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t
      const updatedProducts = (t.products || []).map(p => ({ ...p, submitted: true, submittedBy, submittedAt: now }))
      
      // Auto-schedule payment if not existing
      setPayments(currPayments => {
        if (currPayments.some(p => p.requestId === t.requestId)) return currPayments
        const newPay: PaymentRecord = {
          id: `PAY-2026-00${currPayments.length + 1}`,
          requestId: t.requestId,
          requestTitle: t.requestTitle,
          vendor: t.products?.[0]?.vendor || t.productOrder?.vendor || 'Vendor Partner',
          invoiceId: t.products?.[0]?.invoice?.id || t.invoice?.id || 'INV-AUTH',
          poNumber: t.products?.[0]?.productOrder?.id || t.productOrder?.id || 'PO-AUTH',
          grnNumber: t.products?.[0]?.goodsReceipt?.id || t.goodsReceipt?.id || 'GRN-AUTH',
          amount: t.requestAmount,
          taxAmount: t.products?.[0]?.invoice?.taxAmount || t.invoice?.taxAmount || Math.round(t.requestAmount * 0.18),
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          paymentMethod: 'NEFT / RTGS Corporate',
          status: 'Pending',
          notes: 'Generated upon 3-way matching completion',
          history: [{ timestamp: now, actor: submittedBy, action: 'Ticket Submitted & Payment Queued' }],
        }
        return [newPay, ...currPayments]
      })

      return {
        ...t,
        products: updatedProducts,
        submitted: true,
        submittedBy,
        submittedAt: now,
      }
    }))
  }, [submitProductTicket])

  const acceptVendorInvoice = useCallback((invoiceId: string, actor = 'Sarah Manager') => {
    const today = new Date().toISOString().split('T')[0]
    let linkedRequestId = ''
    let linkedPoId = ''
    let invoiceRecord: VendorInvoice | undefined

    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId || inv.invoiceNumber === invoiceId) {
        invoiceRecord = inv
        linkedRequestId = inv.requestId
        linkedPoId = inv.poId
        return {
          ...inv,
          status: 'Accepted',
          acceptedAt: today,
          acceptedBy: actor,
          rejectionReason: undefined,
          rejectedAt: undefined,
          rejectedBy: undefined,
        }
      }
      return inv
    }))

    // 1. Update linked Purchase Order
    if (linkedPoId) {
      setPurchaseOrders(prev => prev.map(po => {
        if (po.id === linkedPoId || po.poNumber === linkedPoId) {
          return {
            ...po,
            paymentStatus: po.paymentStatus === 'Paid' ? 'Paid' : 'Pending',
          }
        }
        return po
      }))
    }

    // 2. Advance workflow stage on the linked request (to Stage 10: Payment / payment_pending)
    if (linkedRequestId) {
      const updateReq = (r: ProcurementRequest): ProcurementRequest => {
        if (r.id === linkedRequestId) {
          return {
            ...r,
            status: 'payment_pending',
            financeStatus: 'Invoice Accepted - Queued for Payment',
          }
        }
        return r
      }
      setMyApprovals(prev => prev.map(updateReq))
      setFinanceReview(prev => prev.map(updateReq))
      setArrivedRequests(prev => prev.map(updateReq))
      setPendingApprovals(prev => prev.map(updateReq))
    }

    // 3. Ensure a PaymentRecord is queued for Finance
    if (invoiceRecord) {
      const inv = invoiceRecord
      setPayments(prev => {
        const exists = prev.some(p => p.invoiceId === inv.invoiceNumber || p.requestId === inv.requestId)
        if (exists) {
          return prev.map(p => {
            if (p.invoiceId === inv.invoiceNumber || p.requestId === inv.requestId) {
              return {
                ...p,
                status: p.status === 'Paid' ? 'Paid' : 'Pending',
                notes: `Invoice ${inv.invoiceNumber} accepted by ${actor}. Queued for disbursement.`,
                history: [
                  ...(p.history || []),
                  {
                    timestamp: `${today} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                    actor,
                    action: 'Invoice Accepted',
                    note: `Manager approved vendor invoice ${inv.invoiceNumber}. Stage moved to Payment.`,
                  }
                ]
              }
            }
            return p
          })
        }

        const newPayment: PaymentRecord = {
          id: `PAY-2026-${String(prev.length + 1).padStart(3, '0')}`,
          requestId: inv.requestId,
          requestTitle: inv.requestTitle,
          vendor: inv.vendor,
          invoiceId: inv.invoiceNumber,
          poNumber: inv.poNumber,
          grnNumber: inv.procurementType === 'SOFTWARE' ? 'N/A — Digital Provision' : 'GRN-PENDING',
          amount: inv.subtotal,
          taxAmount: inv.taxAmount,
          dueDate: inv.dueDate,
          paymentMethod: 'NEFT / RTGS Corporate',
          status: 'Pending',
          notes: `Invoice accepted by ${actor}. Awaiting Finance disbursement.`,
          history: [
            {
              timestamp: `${today} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
              actor,
              action: 'Invoice Accepted',
              note: `Manager approved vendor invoice ${inv.invoiceNumber}.`,
            }
          ]
        }
        return [newPayment, ...prev]
      })
    }
  }, [])

  const rejectVendorInvoice = useCallback((invoiceId: string, reason: string, notes?: string, actor = 'Sarah Manager') => {
    const today = new Date().toISOString().split('T')[0]
    let linkedRequestId = ''
    let linkedPoId = ''

    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId || inv.invoiceNumber === invoiceId) {
        linkedRequestId = inv.requestId
        linkedPoId = inv.poId
        return {
          ...inv,
          status: 'Rejected',
          rejectionReason: reason,
          rejectedAt: today,
          rejectedBy: actor,
          notes: notes ? `${inv.notes || ''} | Rejection: ${reason} - ${notes}` : `${inv.notes || ''} | Rejection: ${reason}`,
        }
      }
      return inv
    }))

    // 1. Put linked PO on Hold
    if (linkedPoId) {
      setPurchaseOrders(prev => prev.map(po => {
        if (po.id === linkedPoId || po.poNumber === linkedPoId) {
          return {
            ...po,
            paymentStatus: 'On Hold',
          }
        }
        return po
      }))
    }

    // 2. Put linked Request on clarification_requested
    if (linkedRequestId) {
      const updateReq = (r: ProcurementRequest): ProcurementRequest => {
        if (r.id === linkedRequestId) {
          return {
            ...r,
            status: 'clarification_requested',
            financeStatus: `Invoice Rejected: ${reason}`,
          }
        }
        return r
      }
      setMyApprovals(prev => prev.map(updateReq))
      setFinanceReview(prev => prev.map(updateReq))
      setArrivedRequests(prev => prev.map(updateReq))
      setPendingApprovals(prev => prev.map(updateReq))
    }

    // 3. Update payment history/status
    setPayments(prev => prev.map(p => {
      if (p.requestId === linkedRequestId || p.invoiceId === invoiceId) {
        return {
          ...p,
          notes: `Invoice rejected by ${actor}: ${reason}. Action required before disbursement.`,
          history: [
            ...(p.history || []),
            {
              timestamp: `${today} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
              actor,
              action: 'Invoice Rejected',
              note: `Manager rejected invoice: ${reason}. Notes: ${notes || 'None'}`,
            }
          ]
        }
      }
      return p
    }))
  }, [])

  const approveFinanceRequest = useCallback((id: string, comment?: string, actor = 'Mark Finance Officer', approvedAmountVal?: number) => {
    const req = financeReview.find(r => r.id === id) || allRequests.find(r => r.id === id)
    if (!req) return

    // Guard: Block if already approved or stage >= 4
    if (
      req.status === 'approved' ||
      req.status === 'finance_approved' ||
      (req.currentStage !== undefined && req.currentStage >= 4) ||
      req.financeApprovedBy ||
      req.status === 'completed'
    ) {
      console.warn(`Request ${id} is already approved. Duplicate approval blocked.`)
      return
    }

    const now = new Date().toISOString()
    const today = now.split('T')[0]

    // 1. Remove from finance review
    setFinanceReview(prev => prev.filter(r => r.id !== id))
    setRecommendedToFinance(prev => prev.filter(r => r.id !== id))

    // 2. Mark approved in myApprovals / allRequests
    const reqAmount = (approvedAmountVal !== undefined && approvedAmountVal > 0)
      ? approvedAmountVal
      : (Number(req.amount ?? (req as any).total_estimated_cost ?? (req as any).estimated_cost ?? (req as any).estimatedCost ?? 0) || 0)

    const approvedReq: ProcurementRequest = {
      ...req,
      amount: req.amount,
      total_estimated_cost: req.total_estimated_cost,
      estimated_cost: req.estimated_cost,
      estimatedCost: req.estimatedCost,
      approvedAmount: (approvedAmountVal !== undefined && approvedAmountVal > 0) ? approvedAmountVal : req.approvedAmount,
      status: 'finance_approved',
      financeStatus: 'Approved',
      currentStage: Math.max(req.currentStage || 1, 4),
      approvalLevel: 'Approved & Released',
      financeApprovedBy: actor,
      financeApprovedDate: today,
      financeComment: comment || 'Budget verified and approved by Finance. Authorized for PO release.',
    }
    setMyApprovals(prev => [approvedReq, ...prev.filter(r => r.id !== id)])

    // 3. Add to finance audit history
    setFinanceAuditHistory(prev => [
      {
        id: `AUD-${Date.now()}`,
        requestId: req.id,
        requestTitle: req.title,
        actor,
        action: 'APPROVED',
        timestamp: `${today} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        comment: comment || 'Budget verified and approved by Finance.',
        amount: reqAmount,
        paymentStatus: 'Pending',
      },
      ...prev,
    ])

    // 4. Sync with Backend Django / PostgreSQL API
    approveRequestApi(id, comment, reqAmount).then(() => {
      refreshManagerBackendData()
      window.dispatchEvent(new Event('kss_backend_updated'))
    }).catch(err => {
      console.warn('Backend finance approval sync:', err)
    })
  }, [financeReview, allRequests])

  const rejectFinanceRequest = useCallback((id: string, reason: string, comment?: string, actor = 'Mark Finance Officer') => {
    const req = financeReview.find(r => r.id === id)
    if (!req) return
    const today = new Date().toISOString().split('T')[0]

    // 1. Remove from finance review
    setFinanceReview(prev => prev.filter(r => r.id !== id))
    setRecommendedToFinance(prev => prev.filter(r => r.id !== id))

    // 2. Add to rejected requests
    const rejectedReq: ProcurementRequest = {
      ...req,
      status: 'finance_rejected',
      rejectionReason: reason,
      rejectedBy: actor,
      rejectedDate: today,
      financeStatus: 'Rejected',
      financeComment: comment,
    }
    setRejectedRequests(prev => [rejectedReq, ...prev])

    // 3. Add to finance audit history
    setFinanceAuditHistory(prev => [
      {
        id: `AUD-${Date.now()}`,
        requestId: req.id,
        requestTitle: req.title,
        actor,
        action: 'REJECTED',
        timestamp: `${today} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        reason,
        comment,
        amount: req.amount,
      },
      ...prev,
    ])
  }, [financeReview])

  const holdFinanceRequest = useCallback((id: string, reason: string, actor = 'Mark Finance Officer') => {
    const today = new Date().toISOString().split('T')[0]
    setFinanceReview(prev => prev.map(r => {
      if (r.id !== id) return r
      return {
        ...r,
        status: 'finance_on_hold',
        financeStatus: 'On Hold',
        financeHoldReason: reason,
      }
    }))

    setFinanceAuditHistory(prev => [
      {
        id: `AUD-${Date.now()}`,
        requestId: id,
        requestTitle: financeReview.find(r => r.id === id)?.title || id,
        actor,
        action: 'PUT_ON_HOLD',
        timestamp: `${today} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        reason,
        amount: financeReview.find(r => r.id === id)?.amount || 0,
      },
      ...prev,
    ])
  }, [financeReview])

  const requestClarification = useCallback((id: string, message: string, actor = 'Mark Finance Officer') => {
    const today = new Date().toISOString().split('T')[0]
    setFinanceReview(prev => prev.map(r => {
      if (r.id !== id) return r
      return {
        ...r,
        status: 'clarification_requested',
        financeStatus: 'Clarification Requested',
        clarificationMessage: message,
      }
    }))

    setFinanceAuditHistory(prev => [
      {
        id: `AUD-${Date.now()}`,
        requestId: id,
        requestTitle: financeReview.find(r => r.id === id)?.title || id,
        actor,
        action: 'CLARIFICATION_REQUESTED',
        timestamp: `${today} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        comment: message,
        amount: financeReview.find(r => r.id === id)?.amount || 0,
      },
      ...prev,
    ])
  }, [financeReview])

  const recommendToHigherAuthority = useCallback(async (
    id: string,
    reason: string,
    comment?: string,
    actor = 'Mark Finance Officer'
  ) => {
    const today = new Date().toISOString().split('T')[0]
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const base = financeReview.find(r => r.id === id) || allRequests.find(r => r.id === id)
    if (!base) return

    // Persist the handoff before removing the request from Finance's queue.
    await recommendToAdminApi(id, reason, comment)

    const record: ProcurementRequest = {
      ...base,
      status: 'recommended_to_admin',
      financeStatus: 'Recommended to Admin',
      approvalLevel: 'Admin / Executive Authority',
      recommendationReason: reason,
      financeComment: comment || reason,
      recommendedBy: actor,
      recommendedDate: today,
    }

    // 1. Remove from finance review
    setFinanceReview(prev => prev.filter(r => r.id !== id))
    setRecommendedToFinance(prev => prev.filter(r => r.id !== id))

    // 2. Move to Admin pending queue
    setRecommendedToAdmin(prev => [record, ...prev.filter(r => r.id !== id)])
    setMyApprovals(prev => [record, ...prev.filter(r => r.id !== id)])

    setFinanceAuditHistory(prev => [
      {
        id: `AUD-${Date.now()}`,
        requestId: id,
        requestTitle: base.title,
        actor,
        action: 'RECOMMENDED_TO_ADMIN',
        timestamp: `${today} ${time}`,
        reason,
        comment: comment || 'Forwarded to Admin / Executive Authority for higher-level review and approval.',
        amount: base.amount,
      },
      ...prev,
    ])

    window.dispatchEvent(new Event('kss_backend_updated'))
  }, [financeReview, allRequests, refreshManagerBackendData])

  const adminApproveRequest = useCallback((
    id: string,
    comment?: string,
    actor = 'Priyanka Sharma (Admin)',
    approvedAmountVal?: number
  ) => {
    const req = recommendedToAdmin.find(r => r.id === id) || financeReview.find(r => r.id === id) || allRequests.find(r => r.id === id)
    if (!req) return
    const today = new Date().toISOString().split('T')[0]

    // 1. Remove from Admin pending queue and Finance queues
    setRecommendedToAdmin(prev => prev.filter(r => r.id !== id))
    setFinanceReview(prev => prev.filter(r => r.id !== id))
    setRecommendedToFinance(prev => prev.filter(r => r.id !== id))

    // 2. Determine workflow type: Software vs Hardware
    const wfType = detectWorkflowType(req.category, req.title)
    const isSoftware = wfType === 'SOFTWARE'

    const reqAmount = (approvedAmountVal !== undefined && approvedAmountVal > 0)
      ? approvedAmountVal
      : (Number(req.amount ?? (req as any).total_estimated_cost ?? (req as any).estimated_cost ?? (req as any).estimatedCost ?? 0) || 0)

    const nextStatus: RequestStatus = isSoftware ? 'payment_pending' : 'approved'
    const nextFinanceStatus = isSoftware ? 'Admin Approved - Queued for Payment' : 'Admin Approved'

    const approvedReq: ProcurementRequest = {
      ...req,
      amount: req.amount,
      total_estimated_cost: req.total_estimated_cost,
      estimated_cost: req.estimated_cost,
      estimatedCost: req.estimatedCost,
      approvedAmount: (approvedAmountVal !== undefined && approvedAmountVal > 0) ? approvedAmountVal : req.approvedAmount,
      status: nextStatus,
      financeStatus: nextFinanceStatus,
      approvalLevel: 'Admin Approved',
      currentStage: Math.max(req.currentStage || 1, 4),
      approvedBy: actor,
      approvedDate: today,
      financeApprovedBy: req.financeApprovedBy || actor,
      financeApprovedDate: req.financeApprovedDate || today,
      financeComment: comment || 'Executive authority approval ratified.',
      paymentStatus: 'Pending',
    }

    // 3. For Software requests: Auto-queue directly into Payments (bypasses RFQ/PO/GRN/Invoice)
    if (isSoftware) {
      setPayments(currPayments => {
        if (currPayments.some(p => p.requestId === req.id)) return currPayments
        const newPay: PaymentRecord = {
          id: `PAY-2026-${String(currPayments.length + 1).padStart(3, '0')}`,
          requestId: req.id,
          requestTitle: req.title,
          vendor: 'Software / SaaS Provider',
          invoiceId: `INV-${req.id}`,
          poNumber: `PO-${req.id}`,
          grnNumber: `LIC-${req.id}`,
          amount: reqAmount,
          taxAmount: Math.round(reqAmount * 0.18),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          paymentMethod: 'NEFT / RTGS Corporate',
          status: 'Pending',
          notes: 'Software/Digital requisition auto-routed to payment upon Admin approval.',
          history: [{ timestamp: new Date().toISOString(), actor, action: 'Admin Approved — Payment Queued' }],
        }
        return [newPay, ...currPayments]
      })
    }

    // 4. Update myApprovals history
    setMyApprovals(prev => [approvedReq, ...prev.filter(r => r.id !== id)])

    setFinanceAuditHistory(prev => [
      {
        id: `AUD-${Date.now()}`,
        requestId: req.id,
        requestTitle: req.title,
        actor,
        action: 'APPROVED',
        timestamp: `${today} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        comment: comment || `Approved by Executive Admin (${isSoftware ? 'Software Direct-to-Payment' : 'Hardware Procurement Workflow'}).`,
        amount: reqAmount,
        paymentStatus: 'Pending',
      },
      ...prev,
    ])

    // Sync with PostgreSQL backend API
    approveRequestApi(id, comment, reqAmount).then(() => {
      refreshManagerBackendData()
      window.dispatchEvent(new Event('kss_backend_updated'))
    }).catch(err => {
      console.warn('Backend admin approval sync:', err)
    })
  }, [recommendedToAdmin, financeReview, allRequests, refreshManagerBackendData])

  const adminRejectRequest = useCallback((
    id: string,
    reason: string,
    comment?: string,
    actor = 'Priyanka Sharma (Admin)'
  ) => {
    const req = financeReview.find(r => r.id === id) || allRequests.find(r => r.id === id) || recommendedToAdmin.find(r => r.id === id)
    if (!req) return
    const today = new Date().toISOString().split('T')[0]

    setFinanceReview(prev => prev.filter(r => r.id !== id))
    setRecommendedToFinance(prev => prev.filter(r => r.id !== id))
    setRecommendedToAdmin(prev => prev.filter(r => r.id !== id))

    const rejectedReq: ProcurementRequest = {
      ...req,
      status: 'rejected',
      financeStatus: 'Admin Rejected',
      approvalLevel: 'Admin Rejected',
      rejectedBy: actor,
      rejectedDate: today,
      rejectionReason: reason,
      financeComment: comment || reason,
    }

    setRejectedRequests(prev => [rejectedReq, ...prev.filter(r => r.id !== id)])

    setFinanceAuditHistory(prev => [
      {
        id: `AUD-${Date.now()}`,
        requestId: req.id,
        requestTitle: req.title,
        actor,
        action: 'REJECTED',
        timestamp: `${today} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        reason,
        comment: comment || 'Executive authority rejected the requisition.',
        amount: req.amount,
      },
      ...prev,
    ])

    rejectRequestApi(id, 1, comment || reason).then(() => {
      refreshManagerBackendData()
      window.dispatchEvent(new Event('kss_backend_updated'))
    }).catch(err => {
      console.warn('Backend admin reject sync:', err)
    })
  }, [financeReview, allRequests, recommendedToAdmin, refreshManagerBackendData])

  const adminReturnRequest = useCallback((
    id: string,
    feedback: string,
    actor = 'Priyanka Sharma (Admin)'
  ) => {
    const today = new Date().toISOString().split('T')[0]
    setFinanceReview(prev => prev.filter(r => r.id !== id))
    setRecommendedToAdmin(prev => prev.filter(r => r.id !== id))

    const returnedReq: ProcurementRequest = {
      ...(allRequests.find(r => r.id === id) || { id, title: id, requester: 'Requester', department: 'General', category: 'General', amount: 0, date: today, priority: 'Medium' as const }),
      status: 'clarification_requested',
      financeStatus: 'Returned by Admin',
      clarificationMessage: feedback,
      financeComment: feedback,
    }

    setMyApprovals(prev => [returnedReq, ...prev.filter(r => r.id !== id)])

    setFinanceAuditHistory(prev => [
      {
        id: `AUD-${Date.now()}`,
        requestId: id,
        requestTitle: allRequests.find(r => r.id === id)?.title || id,
        actor,
        action: 'CLARIFICATION_REQUESTED',
        timestamp: `${today} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        comment: `Returned by Admin: ${feedback}`,
        amount: allRequests.find(r => r.id === id)?.amount || 0,
      },
      ...prev,
    ])

    apiClient.post(`/requests/${id}/process_approval/`, { action: 'RETURN', notes: feedback }).then(() => {
      refreshManagerBackendData()
      window.dispatchEvent(new Event('kss_backend_updated'))
    }).catch(err => {
      console.warn('Backend admin return sync:', err)
    })
  }, [allRequests, refreshManagerBackendData])

  const updateVendorStatus = useCallback((vendorId: string, status: VendorItem['status']) => {
    setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, status } : v))
  }, [])

  const addVendor = useCallback((vendorData: Omit<VendorItem, 'id' | 'registeredDate'> & Partial<VendorItem>) => {
    const newId = `VND-2026-00${vendors.length + 1}`
    const today = new Date().toISOString().split('T')[0]
    const newVendor: VendorItem = {
      ...vendorData,
      id: newId,
      name: vendorData.name || 'New Vendor Partner',
      company: vendorData.company || vendorData.name || 'Vendor Corp',
      contactPerson: vendorData.contactPerson || 'Vendor Rep',
      email: vendorData.email || 'contact@vendor.com',
      phone: vendorData.phone || '+91 99000 11223',
      category: vendorData.category || 'General Supplies',
      registeredDate: today,
      status: vendorData.status || 'Active',
      riskLevel: vendorData.riskLevel || 'Low',
      performanceScore: vendorData.performanceScore || 90,
      activeContracts: vendorData.activeContracts || 0,
      totalOrders: vendorData.totalOrders || 0,
      totalPurchaseValue: vendorData.totalPurchaseValue || 0,
      complianceStatus: vendorData.complianceStatus || 'Verified',
      documentsCount: vendorData.documentsCount || 3,
      onTimeDeliveryRate: vendorData.onTimeDeliveryRate || 95,
      qualityIssuesCount: 0,
      complaintsCount: 0,
    }
    setVendors(prev => [newVendor, ...prev])
  }, [vendors.length])

  const updatePOStatus = useCallback((poId: string, status: PurchaseOrderItem['status']) => {
    setPurchaseOrders(prev => prev.map(po => po.id === poId || po.poNumber === poId ? { ...po, status } : po))
  }, [])

  const verifyReceipt = useCallback((grnId: string, verifiedBy: string) => {
    setReceipts(prev => prev.map(grn => grn.id === grnId || grn.grnNumber === grnId ? { ...grn, status: 'Verified', inspectionStatus: 'Passed', receivedBy: verifiedBy } : grn))
    const cleanId = grnId.replace(/^(DOC-|GRN-|REC-)/, '').trim()
    apiClient.patch(`/procurement/goods-receipts/${grnId}/`, { status: 'Verified', received_by_name: verifiedBy }).catch(async () => {
      await apiClient.patch(`/procurement/goods-receipts/${cleanId}/`, { status: 'Verified' }).catch(async () => {
        await apiClient.post(`/procurement/goods-receipts/`, { purchase_order: grnId, status: 'Verified' }).catch(() => {})
      })
    }).then(() => {
      window.dispatchEvent(new Event('kss_backend_updated'))
    })
  }, [])

  const renewContract = useCallback((contractId: string, newEndDate: string) => {
    setContracts(prev => prev.map(c => c.id === contractId ? { ...c, endDate: newEndDate, status: 'Active' } : c))
  }, [])

  // ─── Payment Actions ────────────────────────────────────────────────────────

  const disbursePayment = useCallback((paymentId: string, actor = 'Mark Finance Officer') => {
    const today = new Date().toISOString().split('T')[0]
    let paidRequestId = ''
    let paidPoNumber = ''
    let paidAmount = 0
    let paidVendor = ''

    setPayments(prev => prev.map(p => {
      if (p.id !== paymentId) return p
      paidRequestId = p.requestId
      paidPoNumber = p.poNumber
      paidAmount = p.amount
      paidVendor = p.vendor
      return {
        ...p,
        status: 'Paid',
        paymentDate: today,
        history: [
          ...(p.history || []),
          { timestamp: `${today} ${new Date().toLocaleTimeString()}`, actor, action: 'Payment Disbursed' },
        ],
      }
    }))

    // Persist to PostgreSQL backend via Django REST API
    disbursePaymentApi(paymentId).catch(() => null)
    createPaymentApi({
      requestId: paidRequestId,
      poNumber: paidPoNumber,
      amount: paidAmount,
      vendor: paidVendor,
      status: 'Paid'
    }).then(() => {
      window.dispatchEvent(new Event('kss_backend_updated'))
    }).catch(() => null)

    // Synchronize request status to completed
    if (paidRequestId) {
      const matchId = paidRequestId.split('-PROD-')[0]
      setMyApprovals(prev => prev.map(r => {
        if (r.id === paidRequestId || r.id === matchId) {
          return { ...r, status: 'completed', paymentStatus: 'Paid', financeStatus: 'Completed' }
        }
        return r
      }))
    }
  }, [])

  const updatePaymentStatus = useCallback((paymentId: string, status: PaymentStatus, actor = 'Mark Finance Officer', notes?: string) => {
    const today = new Date().toISOString().split('T')[0]
    let paidRequestId = ''
    let paidPoNumber = ''
    let paidAmount = 0
    let paidVendor = ''

    setPayments(prev => prev.map(p => {
      if (p.id !== paymentId) return p
      if (status === 'Paid') {
        paidRequestId = p.requestId
        paidPoNumber = p.poNumber
        paidAmount = p.amount
        paidVendor = p.vendor
      }
      return {
        ...p,
        status,
        notes: notes || p.notes,
        paymentDate: status === 'Paid' ? today : p.paymentDate,
        history: [
          ...(p.history || []),
          { timestamp: `${today} ${new Date().toLocaleTimeString()}`, actor, action: `Status changed to ${status}`, note: notes },
        ],
      }
    }))

    // If status changed to Paid, persist to backend
    if (status === 'Paid') {
      disbursePaymentApi(paymentId).catch(() => null)
      createPaymentApi({
        requestId: paidRequestId,
        poNumber: paidPoNumber,
        amount: paidAmount,
        vendor: paidVendor,
        status: 'Paid',
        notes
      }).then(() => {
        window.dispatchEvent(new Event('kss_backend_updated'))
      }).catch(() => null)
    }

    // Synchronize request status to completed
    if (status === 'Paid' && paidRequestId) {
      const matchId = paidRequestId.split('-PROD-')[0]
      setMyApprovals(prev => prev.map(r => {
        if (r.id === paidRequestId || r.id === matchId) {
          return { ...r, status: 'completed', paymentStatus: 'Paid', financeStatus: 'Completed' }
        }
        return r
      }))
    }
  }, [])

  // ─── Vendor Lifecycle & Raise Ticket Pipeline Actions ────────────────────────

  const assignVendorToRequest = useCallback((
    requestId: string,
    vendorName: string,
    vendorId?: string,
    quoteAmount?: number,
    quoteId?: string
  ) => {
    const today = new Date().toISOString().split('T')[0]
    const effectiveVendorId = resolveVendorId(vendorName, vendorId)
    const matchedReq = allRequests.find(r => r.id === requestId || r.id === `REQ-${requestId.replace(/^(RFQ-|REQ-)/, '')}`)
    const effectiveAmount = quoteAmount || matchedReq?.amount || 94400
    const cleanId = requestId.replace('REQ-', '').replace('RFQ-', '')
    const targetPoId = `PO-${cleanId}`

    const updateReq = (r: ProcurementRequest): ProcurementRequest => {
      if (r.id === requestId || r.id === matchedReq?.id) {
        return {
          ...r,
          status: 'assigned_to_vendor',
          vendor: vendorName,
          vendorId: effectiveVendorId,
          assignedVendorDate: today,
          financeStatus: `Assigned to ${vendorName}`,
          currentStage: 6,
        }
      }
      return r
    }

    setMyApprovals(prev => prev.map(updateReq))
    setRecommendedToAdmin(prev => prev.map(updateReq))
    setFinanceReview(prev => prev.map(updateReq))
    setPendingApprovals(prev => prev.map(updateReq))
    setArrivedRequests(prev => prev.map(updateReq))

    const newPO: PurchaseOrderItem = {
      id: targetPoId,
      poNumber: targetPoId,
      requestId: matchedReq?.id || requestId,
      requestTitle: matchedReq?.title || `Procurement Fulfillment: ${requestId}`,
      procurementType: 'HARDWARE',
      category: matchedReq?.category || 'IT Hardware',
      vendor: vendorName,
      vendorId: effectiveVendorId,
      submittedBy: `${vendorName} (Vendor Partner)`,
      submittedByRole: 'Vendor',
      submissionDate: today,
      poDate: today,
      items: [{ product: matchedReq?.title || `Items for ${requestId}`, quantity: matchedReq?.quantity || 1, unitPrice: effectiveAmount, total: effectiveAmount }],
      quantity: matchedReq?.quantity || 1,
      totalAmount: effectiveAmount,
      deliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'Sent to Vendor',
      paymentStatus: 'Pending',
      terms: 'Net 30'
    }

    setPurchaseOrders(prev => {
      const filtered = prev.filter(po => po.id !== targetPoId && po.requestId !== requestId && po.requestId !== matchedReq?.id)
      return [newPO, ...filtered]
    })
    localStorage.removeItem('kss_purchase_orders')

    // Post to Django REST API backend to persist PurchaseOrder in database
    apiClient.post('/procurement/purchase-orders/', {
      purchase_request: requestId,
      vendor: vendorName,
      quotation: quoteId,
      total_amount: effectiveAmount,
      status: 'Issued'
    }).then(() => {
      window.dispatchEvent(new Event('kss_backend_updated'))
    }).catch(err => {
      console.warn('Backend PO creation API error:', err)
      window.dispatchEvent(new Event('kss_backend_updated'))
    })
  }, [allRequests])

  const vendorAcceptRequest = useCallback((requestId: string, _vendorId?: string, _notes?: string) => {
    const today = new Date().toISOString().split('T')[0]

    const updateReq = (r: ProcurementRequest): ProcurementRequest => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'vendor_accepted',
          vendorAcceptedDate: today,
          financeStatus: 'Vendor Accepted — Delivery in Progress',
        }
      }
      return r
    }

    setMyApprovals(prev => prev.map(updateReq))
    setRecommendedToAdmin(prev => prev.map(updateReq))
    setFinanceReview(prev => prev.map(updateReq))
    setPendingApprovals(prev => prev.map(updateReq))
    setArrivedRequests(prev => prev.map(updateReq))

    // Update Purchase Order status to Acknowledged
    setPurchaseOrders(prev => prev.map(po => {
      if (po.requestId === requestId) {
        return {
          ...po,
          status: 'Acknowledged',
        }
      }
      return po
    }))
  }, [])

  const vendorRejectRequest = useCallback((requestId: string, _vendorId?: string, reason = 'Vendor capacity unavailable') => {
    const updateReq = (r: ProcurementRequest): ProcurementRequest => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'vendor_rejected',
          vendorRejectedReason: reason,
          financeStatus: `Vendor Declined: ${reason}`,
        }
      }
      return r
    }

    setMyApprovals(prev => prev.map(updateReq))
    setRecommendedToAdmin(prev => prev.map(updateReq))
    setFinanceReview(prev => prev.map(updateReq))
    setPendingApprovals(prev => prev.map(updateReq))
    setArrivedRequests(prev => prev.map(updateReq))

    // Update Purchase Order to Cancelled
    setPurchaseOrders(prev => prev.map(po => {
      if (po.requestId === requestId) {
        return {
          ...po,
          status: 'Cancelled',
        }
      }
      return po
    }))
  }, [])

  const vendorSubmitDeliveryAndInvoice = useCallback((
    requestId: string,
    deliveryData: { grnNumber: string; deliveryDate: string; receivedQty: number; acceptedQty: number; carrier?: string; docName?: string },
    invoiceData: { invoiceNumber: string; invoiceDate: string; amount: number; taxAmount: number; gstNumber?: string; docName?: string }
  ) => {
    const today = new Date().toISOString().split('T')[0]
    const matchedReq = allRequests.find(r => r.id === requestId) || {
      id: requestId,
      title: 'Procured Hardware & Supplies',
      department: 'IT / Engineering',
      amount: invoiceData.amount,
      vendor: 'Dell Technologies India',
      vendorId: 'VND-HW-001',
      category: 'IT Hardware'
    }

    const effectiveVendor = matchedReq.vendor || 'Dell Technologies India'
    const effectiveVendorId = matchedReq.vendorId || 'VND-HW-001'

    // 1. Update request status to 'delivered' and record delivery/invoice details
    const updateReq = (r: ProcurementRequest): ProcurementRequest => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'delivered',
          deliveryDetails: deliveryData,
          invoiceDetails: invoiceData,
          financeStatus: 'Delivery Completed — Documents Submitted for Verification',
        }
      }
      return r
    }

    setMyApprovals(prev => prev.map(updateReq))
    setRecommendedToAdmin(prev => prev.map(updateReq))
    setFinanceReview(prev => prev.map(updateReq))
    setPendingApprovals(prev => prev.map(updateReq))
    setArrivedRequests(prev => prev.map(updateReq))

    // 2. Add or update GoodsReceiptItem
    setReceipts(prev => {
      const newGRN: GoodsReceiptItem = {
        id: deliveryData.grnNumber,
        grnNumber: deliveryData.grnNumber,
        poNumber: `PO-${requestId}`,
        requestId: requestId,
        vendor: effectiveVendor,
        receivedDate: deliveryData.deliveryDate,
        product: matchedReq.title,
        orderedQuantity: deliveryData.receivedQty,
        receivedQuantity: deliveryData.receivedQty,
        damagedQuantity: 0,
        inspectionStatus: 'Passed',
        receivedBy: deliveryData.carrier ? `Carrier: ${deliveryData.carrier}` : 'Vendor Logistics Desk',
        status: 'Pending Verification',
        warehouseLocation: 'Bay 4 - Pune Receiving Dock',
      }
      return [newGRN, ...prev.filter(g => g.grnNumber !== deliveryData.grnNumber && g.requestId !== requestId)]
    })

    // 3. Add or update VendorInvoice
    setInvoices(prev => {
      const newInv: VendorInvoice = {
        id: invoiceData.invoiceNumber,
        invoiceNumber: invoiceData.invoiceNumber,
        poId: `PO-${requestId}`,
        poNumber: `PO-${requestId}`,
        requestId: requestId,
        requestTitle: matchedReq.title,
        procurementType: 'HARDWARE',
        vendor: effectiveVendor,
        vendorId: effectiveVendorId,
        submittedBy: `${effectiveVendor} (Vendor Portal)`,
        submittedByRole: 'Vendor',
        submissionDate: today,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        subtotal: invoiceData.amount - (invoiceData.taxAmount || 0),
        taxAmount: invoiceData.taxAmount || 0,
        totalAmount: invoiceData.amount,
        status: 'Pending Review',
        documentType: 'Tax Invoice',
        gstNumber: invoiceData.gstNumber || 'GSTIN27DELLT5432D1Z9',
        items: [{
          product: matchedReq.title,
          quantity: deliveryData.receivedQty,
          unitPrice: Math.round(invoiceData.amount / (deliveryData.receivedQty || 1)),
          total: invoiceData.amount,
        }]
      }
      return [newInv, ...prev.filter(inv => inv.invoiceNumber !== invoiceData.invoiceNumber && inv.requestId !== requestId)]
    })

    // 4. Automatically create/update Raise Ticket under Raise Ticket section
    const newTicketId = `TKT-2026-${requestId.replace(/[^0-9]/g, '').slice(-3) || '999'}`
    const ticketProduct: TicketProduct = {
      id: `PROD-${requestId}`,
      name: matchedReq.title,
      category: matchedReq.category || 'Hardware',
      quantity: deliveryData.receivedQty,
      unit: 'Units',
      vendor: effectiveVendor,
      pricePerUnit: Math.round(invoiceData.amount / (deliveryData.receivedQty || 1)),
      totalAmount: invoiceData.amount,
      productOrder: {
        id: `PO-${requestId}`,
        vendor: effectiveVendor,
        date: today,
        amount: invoiceData.amount,
        productDetails: `${deliveryData.receivedQty}x ${matchedReq.title}`,
        verified: true,
        verifiedBy: 'System Auto-PO',
        verifiedAt: `${today} 09:00 AM`
      },
      goodsReceipt: {
        id: deliveryData.grnNumber,
        vendor: effectiveVendor,
        receivedDate: deliveryData.deliveryDate,
        receivedQty: deliveryData.receivedQty,
        acceptedQty: deliveryData.acceptedQty,
        unit: 'Units',
        verified: false,
      },
      invoice: {
        id: invoiceData.invoiceNumber,
        vendor: effectiveVendor,
        invoiceDate: invoiceData.invoiceDate,
        invoiceAmount: invoiceData.amount,
        taxAmount: invoiceData.taxAmount,
        gstNumber: invoiceData.gstNumber,
        verified: false,
      },
      submitted: false,
    }

    setTickets(prev => {
      const existingIdx = prev.findIndex(t => t.requestId === requestId || t.id === newTicketId)
      const constructedTicket: RaiseTicket = {
        id: newTicketId,
        requestId: requestId,
        requestTitle: matchedReq.title,
        requestAmount: invoiceData.amount,
        department: matchedReq.department || 'Procurement',
        createdDate: today,
        products: [ticketProduct],
        productOrder: ticketProduct.productOrder,
        goodsReceipt: ticketProduct.goodsReceipt,
        invoice: ticketProduct.invoice,
        submitted: false,
      }

      if (existingIdx >= 0) {
        const copy = [...prev]
        copy[existingIdx] = constructedTicket
        return copy
      }
      return [constructedTicket, ...prev]
    })

    // 5. Update Purchase Order to Delivered
    setPurchaseOrders(prev => prev.map(po => {
      if (po.requestId === requestId) {
        return {
          ...po,
          status: 'Delivered',
          deliveryDate: deliveryData.deliveryDate,
          totalAmount: invoiceData.amount,
        }
      }
      return po
    }))
  }, [allRequests])

  const makePayment = useCallback((
    requestId: string,
    ticketId?: string,
    paymentDetails?: {
      amount?: number
      paymentMethod?: string
      transactionRef?: string
      referenceNumber?: string
      productId?: string
      notes?: string
      details?: Record<string, any>
    }
  ) => {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const refNum = paymentDetails?.referenceNumber || paymentDetails?.transactionRef || `UTR${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`
    const utrRef = refNum
    const selectedMethod = paymentDetails?.paymentMethod || 'Online Bank Transfer'
    const targetProductId = paymentDetails?.productId
    const userNotes = paymentDetails?.notes || `Payment disbursed via ${selectedMethod}. Ref: ${refNum}`

    // Find the request
    const matchedReq = allRequests.find(r => r.id === requestId)
    const effectiveAmount = paymentDetails?.amount || matchedReq?.amount || 350000
    const effectiveVendor = matchedReq?.vendor || 'Dell Technologies India'

    // 1. Update request across all lists to 'completed' and 'Paid'
    const markCompleted = (r: ProcurementRequest): ProcurementRequest => {
      if (r.id === requestId || (ticketId && r.id === ticketId.replace('TKT-', 'REQ-'))) {
        return {
          ...r,
          status: 'completed',
          paymentStatus: 'Paid',
          financeStatus: 'Completed — Payment Settled',
          paidDate: today,
          paymentTransactionRef: utrRef,
        }
      }
      return r
    }

    setMyApprovals(prev => prev.map(markCompleted))
    setRecommendedToAdmin(prev => prev.map(markCompleted))
    setFinanceReview(prev => prev.map(markCompleted))
    setPendingApprovals(prev => prev.map(markCompleted))
    setArrivedRequests(prev => prev.map(markCompleted))

    // 2. Mark linked ticket as completed and products as submitted & paid
    setTickets(prev => prev.map(t => {
      if (t.requestId === requestId || t.id === ticketId) {
        const updatedProducts = (t.products || []).map(p => {
          if (!targetProductId || p.id === targetProductId) {
            return {
              ...p,
              submitted: true,
              paymentSettled: true,
              paymentDate: today,
              utrRef,
              paymentMethod: selectedMethod,
              submittedBy: 'Finance Treasury Officer',
              submittedAt: `${today} ${time}`,
              goodsReceipt: { ...p.goodsReceipt, verified: true, verifiedBy: 'Finance Treasury Officer', verifiedAt: `${today} ${time}` },
              invoice: { ...p.invoice, verified: true, verifiedBy: 'Finance Treasury Officer', verifiedAt: `${today} ${time}` },
            }
          }
          return p
        })

        const allProdsPaid = updatedProducts.every(p => p.paymentSettled)

        return {
          ...t,
          submitted: allProdsPaid || !targetProductId,
          submittedBy: 'Finance Treasury Officer',
          submittedAt: `${today} ${time}`,
          products: updatedProducts
        }
      }
      return t
    }))

    // 3. Mark/Add payment record as Paid
    setPayments(prev => {
      const existing = prev.find(p => p.requestId === requestId || (ticketId && p.requestId === ticketId))
      if (existing) {
        return prev.map(p => {
          if (p.id === existing.id) {
            return {
              ...p,
              status: 'Paid',
              paymentDate: today,
              paymentMethod: selectedMethod,
              transactionRef: utrRef,
              notes: userNotes,
              history: [
                ...(p.history || []),
                { timestamp: `${today} ${time}`, actor: 'Finance Treasury Officer', action: 'Payment Released & Settled', note: `${selectedMethod} — Ref: ${utrRef}` }
              ]
            }
          }
          return p
        })
      }
      const newPay: PaymentRecord = {
        id: `PAY-${requestId}`,
        requestId: requestId,
        requestTitle: matchedReq?.title || `Payment for ${requestId}`,
        vendor: effectiveVendor,
        invoiceId: `INV-${requestId}`,
        poNumber: `PO-${requestId}`,
        grnNumber: `GRN-${requestId}`,
        amount: effectiveAmount,
        taxAmount: Math.round(effectiveAmount * 0.18),
        dueDate: today,
        paymentDate: today,
        transactionRef: utrRef,
        paymentMethod: selectedMethod,
        status: 'Paid',
        notes: userNotes,
        history: [{ timestamp: `${today} ${time}`, actor: 'Finance Treasury Officer', action: 'Payment Released & Settled', note: `${selectedMethod} — Ref: ${utrRef}` }]
      }
      return [newPay, ...prev]
    })

    // 4. Update purchase order status to Closed & Paid
    setPurchaseOrders(prev => prev.map(po => {
      if (po.requestId === requestId) {
        return {
          ...po,
          status: 'Closed',
          paymentStatus: 'Paid',
        }
      }
      return po
    }))

    // 5. Update invoice status to Accepted
    setInvoices(prev => prev.map(inv => {
      if (inv.requestId === requestId) {
        return {
          ...inv,
          status: 'Accepted',
          acceptedAt: today,
          acceptedBy: 'Finance Treasury Officer',
        }
      }
      return inv
    }))

    // 6. Persist Payment to PostgreSQL backend via Django REST API
    createPaymentApi({
      requestId: requestId,
      invoiceId: `INV-${requestId}`,
      poNumber: `PO-${requestId}`,
      amount: effectiveAmount,
      vendor: effectiveVendor,
      paymentMethod: selectedMethod,
      referenceNumber: utrRef,
      notes: userNotes,
      status: 'Paid'
    }).then(() => {
      window.dispatchEvent(new Event('kss_backend_updated'))
    }).catch(e => {
      console.warn('Backend payment creation warning:', e)
    })

    // Broadcast update event to all portals
    window.dispatchEvent(new Event('kss_backend_updated'))

    return {
      utrRef,
      referenceNumber: refNum,
      paymentMethod: selectedMethod,
      amount: effectiveAmount,
      date: `${today}, ${time}`,
      vendor: effectiveVendor,
      notes: userNotes,
      details: paymentDetails?.details
    }
  }, [allRequests])

  // ─── Complaint Actions ──────────────────────────────────────────────────────

  const addComplaint = useCallback((complaintData: Omit<Complaint, 'id' | 'createdDate' | 'auditTrail' | 'status'> & Partial<Complaint>) => {
    const newId = `CMP-2026-00${125 + complaints.length}`
    const today = new Date().toISOString().split('T')[0]
    const newComplaint: Complaint = {
      id: newId,
      productName: complaintData.productName,
      productId: complaintData.productId,
      serialNumber: complaintData.serialNumber,
      poNumber: complaintData.poNumber,
      grnNumber: complaintData.grnNumber,
      vendor: complaintData.vendor,
      deliveryDate: complaintData.deliveryDate || today,
      complaintType: complaintData.complaintType,
      defectiveQuantity: complaintData.defectiveQuantity || 1,
      severity: complaintData.severity || 'Medium',
      issueDescription: complaintData.issueDescription,
      resolutionRequested: complaintData.resolutionRequested || 'Replacement',
      status: 'Submitted',
      createdBy: complaintData.createdBy || 'Sarah Manager',
      createdDate: today,
      evidenceImages: complaintData.evidenceImages || [],
      supportingDocuments: complaintData.supportingDocuments || [],
      comments: complaintData.comments || [],
      auditTrail: [
        { timestamp: `${today} ${new Date().toLocaleTimeString()}`, actor: complaintData.createdBy || 'Sarah Manager', action: 'Complaint Submitted', newStatus: 'Submitted' },
      ],
    }
    setComplaints(prev => [newComplaint, ...prev])
  }, [complaints.length])

  const updateComplaintStatus = useCallback((id: string, newStatus: ComplaintStatus, actor: string, comment?: string) => {
    const now = `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    setComplaints(prev => prev.map(c => {
      if (c.id !== id) return c
      const prevStatus = c.status
      return {
        ...c,
        status: newStatus,
        comments: comment ? [
          ...(c.comments || []),
          { id: `c-${Date.now()}`, author: actor, role: actor.includes('Finance') ? 'Finance Officer' : 'Procurement Manager', date: now, message: comment },
        ] : c.comments,
        auditTrail: [
          ...c.auditTrail,
          { timestamp: now, actor, action: `Status updated to ${newStatus}`, previousStatus: prevStatus, newStatus, comment },
        ],
      }
    }))
  }, [])

  const addComplaintComment = useCallback((id: string, author: string, role: string, message: string) => {
    const now = `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    setComplaints(prev => prev.map(c => {
      if (c.id !== id) return c
      return {
        ...c,
        comments: [
          ...(c.comments || []),
          { id: `c-${Date.now()}`, author, role, date: now, message },
        ],
      }
    }))
  }, [])

  // Enterprise RBAC & Governance
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>(DEFAULT_PERMISSION_MATRIX)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => getAuditLogsApi())

  useEffect(() => {
    fetchPermissionsApi().then(matrix => setPermissionMatrix(matrix))
    const handleStorage = () => {
      fetchPermissionsApi().then(matrix => setPermissionMatrix(matrix))
      setAuditLogs(getAuditLogsApi())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const updatePermissions = useCallback(async (matrix: PermissionMatrix, actor?: string, targetRole?: RoleKey) => {
    const res = await savePermissionsApi(matrix, actor, targetRole)
    setPermissionMatrix(matrix)
    setAuditLogs(getAuditLogsApi())
    return res
  }, [])

  const resetRolePermissions = useCallback(async (role: RoleKey, actor?: string) => {
    const updated = await resetRolePermissionsApi(role, actor)
    setPermissionMatrix(updated)
    setAuditLogs(getAuditLogsApi())
    return updated
  }, [])

  const checkUserPermission = useCallback((module: ModuleId, action: ActionKey, context?: any) => {
    const activeRole = (localStorage.getItem('user_role') as RoleKey) || 'ADMIN'
    return checkPermission(permissionMatrix, activeRole, module, action, context)
  }, [permissionMatrix])

  return (
    <ManagerDataContext.Provider value={{
      arrivedRequests,
      pendingApprovals,
      myApprovals,
      rejectedRequests,
      financeReview,
      recommendedToFinance,
      recommendedToAdmin,
      allRequests,
      financeRequests,
      pendingFinancialApprovals,
      approvedFinanceRequests,
      rejectedFinanceRequests,
      financePayments,
      financePaymentData,
      rfqs,
      budgets,
      paymentData,
      tickets,
      payments,
      complaints,
      financeAuditHistory,
      vendors,
      purchaseOrders,
      invoices,
      receipts,
      contracts,
      quotations,
      dashboardStats,
      financeKPIs,
      loading,
      acceptRequest,
      rejectRequest,
      recommendToFinance,
      approveRequest,
      selectVendorQuotation,
      addRFQ,
      sendToFinance,
      verifyDocument,
      submitTicket,
      submitProductTicket,
      acceptVendorInvoice,
      rejectVendorInvoice,
      approveFinanceRequest,
      rejectFinanceRequest,
      holdFinanceRequest,
      requestClarification,
      recommendToHigherAuthority,
      adminApproveRequest,
      adminRejectRequest,
      adminReturnRequest,
      updateVendorStatus,
      addVendor,
      updatePOStatus,
      verifyReceipt,
      renewContract,
      disbursePayment,
      updatePaymentStatus,
      assignVendorToRequest,
      vendorAcceptRequest,
      vendorRejectRequest,
      vendorSubmitDeliveryAndInvoice,
      makePayment,
      addComplaint,
      updateComplaintStatus,
      addComplaintComment,
      permissionMatrix,
      updatePermissions,
      resetRolePermissions,
      checkUserPermission,
      auditLogs,
    }}>
      {children}
    </ManagerDataContext.Provider>
  )
}

const noop = () => {}
const asyncNoop = async () => ({ success: false, message: '' })

export const defaultManagerDataContextValue: ManagerDataContextType = {
  arrivedRequests: [],
  pendingApprovals: [],
  myApprovals: [],
  rejectedRequests: [],
  financeReview: [],
  recommendedToFinance: [],
  recommendedToAdmin: [],
  allRequests: [],
  financeRequests: [],
  pendingFinancialApprovals: [],
  approvedFinanceRequests: [],
  rejectedFinanceRequests: [],
  financePayments: [],
  financePaymentData: { weekly: [], monthly: [], yearly: [] },
  rfqs: [],
  budgets: [],
  paymentData: { weekly: [], monthly: [], yearly: [] },
  tickets: [],
  payments: [],
  complaints: [],
  financeAuditHistory: [],
  vendors: [],
  purchaseOrders: [],
  invoices: [],
  receipts: [],
  contracts: [],
  quotations: [],
  dashboardStats: {
    pendingApprovals: 0,
    myApprovals: 0,
    rejectedRequests: 0,
    financeReview: 0,
    totalRequestValue: 0,
    requestArrival: 0,
  },
  financeKPIs: {
    totalBudget: 0,
    availableBudget: 0,
    committedBudget: 0,
    spentBudget: 0,
    allocatedBudget: 0,
    pendingInvoicesCount: 0,
    pendingInvoicesAmount: 0,
    invoiceExceptionsCount: 0,
    invoiceExceptionsAmount: 0,
    pendingPaymentsCount: 0,
    pendingPaymentsAmount: 0,
    paidAmount: 0,
    paidPaymentsCount: 0,
  },
  acceptRequest: noop,
  rejectRequest: noop,
  recommendToFinance: noop,
  approveRequest: noop,
  selectVendorQuotation: noop,
  addRFQ: noop,
  sendToFinance: noop,
  verifyDocument: noop,
  submitTicket: noop,
  acceptVendorInvoice: noop,
  rejectVendorInvoice: noop,
  approveFinanceRequest: noop,
  rejectFinanceRequest: noop,
  holdFinanceRequest: noop,
  requestClarification: noop,
  recommendToHigherAuthority: async () => {},
  adminApproveRequest: noop,
  adminRejectRequest: noop,
  adminReturnRequest: noop,
  updateVendorStatus: noop,
  addVendor: noop,
  updatePOStatus: noop,
  verifyReceipt: noop,
  renewContract: noop,
  disbursePayment: noop,
  updatePaymentStatus: noop,
  assignVendorToRequest: noop,
  vendorAcceptRequest: noop,
  vendorRejectRequest: noop,
  vendorSubmitDeliveryAndInvoice: noop,
  makePayment: () => ({ utrRef: '', amount: 0, date: '', vendor: '' }),
  addComplaint: noop,
  updateComplaintStatus: noop,
  addComplaintComment: noop,
  permissionMatrix: DEFAULT_PERMISSION_MATRIX,
  updatePermissions: asyncNoop,
  resetRolePermissions: async () => DEFAULT_PERMISSION_MATRIX,
  checkUserPermission: () => true,
  auditLogs: [],
  loading: false,
}

export const useManagerData = () => {
  const ctx = useContext(ManagerDataContext)
  if (!ctx) {
    return defaultManagerDataContextValue
  }
  return ctx
}

// Convenient aliases for Finance and Admin portal components
export const useFinanceData = useManagerData
export const useAdminData = useManagerData
