import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
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
  recommendToFinanceApi,
  sendToFinanceApi,
  getBudgets,
  getRFQs
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
  amount: number
  date: string
  status: RequestStatus
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  vendor?: string
  costCenter?: string
  description?: string
  justification?: string
  approvalParams?: ApprovalParameters
  rejectionReason?: string
  rejectedBy?: string
  rejectedDate?: string
  recommendationReason?: string
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
  vendor: string
  date?: string
  invoiceDate?: string
  receivedDate?: string
  amount?: number
  invoiceAmount?: number
  receivedQty?: number
  acceptedQty?: number
  unit?: string
  taxAmount?: number
  gstNumber?: string
  productDetails?: string
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
  productOrder: TicketDocument
  goodsReceipt: TicketDocument
  invoice: TicketDocument
  submitted: boolean
  submittedBy?: string
  submittedAt?: string
  paymentSettled?: boolean
  paymentDate?: string
  utrRef?: string
}

export interface RaiseTicket {
  id: string
  requestId: string
  requestTitle: string
  requestAmount: number
  department?: string
  createdDate?: string
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
  notes?: string
  transactionRef?: string
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
  product?: string
  specification?: string
  quoteDate: string
  validUntil: string
  unitPrice: number
  quantity: number
  taxAmount: number
  shippingCost: number
  discountAmount: number
  totalAmount: number
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
  pendingFinancialApprovals: ProcurementRequest[]
  approvedFinanceRequests: ProcurementRequest[]
  rejectedFinanceRequests: ProcurementRequest[]

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
  approveFinanceRequest: (id: string, comment?: string, actor?: string) => void
  rejectFinanceRequest: (id: string, reason: string, comment?: string, actor?: string) => void
  holdFinanceRequest: (id: string, reason: string, actor?: string) => void
  requestClarification: (id: string, message: string, actor?: string) => void
  recommendToHigherAuthority: (id: string, reason: string, comment?: string, actor?: string) => void
  adminApproveRequest: (id: string, comment?: string, actor?: string) => void
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
  assignVendorToRequest: (requestId: string, vendorName: string, vendorId?: string) => void
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
    paymentDetails?: { amount?: number; paymentMethod?: string; transactionRef?: string; productId?: string }
  ) => { utrRef: string; amount: number; date: string; vendor: string }

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

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ARRIVED: ProcurementRequest[] = [
  { id: 'REQ-2026-018', title: 'Standing Desks for Operations Floor', requester: 'Ravi Kumar', department: 'Operations', category: 'Furniture', amount: 285000, date: '2026-09-11', status: 'pending_arrival', priority: 'Medium', description: '20 ergonomic standing desks', justification: 'Employee health initiative' },
  { id: 'REQ-2026-019', title: 'Network Security Audit Tools', requester: 'Priya Sharma', department: 'IT', category: 'Software', amount: 175000, date: '2026-09-11', status: 'pending_arrival', priority: 'High', description: 'Annual security compliance tools', justification: 'Mandatory compliance requirement' },
  { id: 'REQ-2026-020', title: 'Conference Room AV System Upgrade', requester: 'Anil Mehta', department: 'Admin', category: 'IT Hardware', amount: 420000, date: '2026-09-10', status: 'pending_arrival', priority: 'Low', description: 'Replace projectors with LED panels', justification: 'Improve presentation quality' },
  { id: 'REQ-2026-021', title: 'Employee Training Platform Subscription', requester: 'Deepa Nair', department: 'HR', category: 'SaaS', amount: 96000, date: '2026-09-10', status: 'pending_arrival', priority: 'Medium', description: 'Annual LMS subscription for 200 users', justification: 'Upskilling initiative FY2026' },
]

const MOCK_PENDING_APPROVALS: ProcurementRequest[] = [
  { id: 'REQ-2026-012', title: 'Cloud Infrastructure Yearly Renewal', requester: 'Alex Developer', department: 'IT', category: 'Software & SaaS', amount: 580000, date: '2026-09-10', status: 'pending_approval', priority: 'High', approvalLevel: 'Level 2 - Manager', description: 'AWS reserve instances renewal for production and staging clusters.' },
  { id: 'REQ-2026-015', title: 'Marketing Analytics Dashboard', requester: 'Sneha Patel', department: 'Marketing', category: 'Software & SaaS', amount: 85000, date: '2026-09-08', status: 'pending_approval', priority: 'Medium', approvalLevel: 'Level 1 - Manager', description: 'Enterprise tier dashboard access for digital marketing analytics.' },
  { id: 'REQ-2026-016', title: 'Office Supplies Q4 Bulk Order', requester: 'Ramesh Gupta', department: 'Admin', category: 'Office Accessories', amount: 42000, date: '2026-09-07', status: 'pending_approval', priority: 'Low', approvalLevel: 'Level 1 - Manager', description: 'Stationery and ergonomic accessories bulk requisition.' },
  { id: 'REQ-2026-020', title: 'Developer Dual-Monitor Stations', requester: 'Karan Verma', department: 'IT', category: 'IT Hardware', amount: 165000, date: '2026-09-11', status: 'pending_approval', priority: 'Medium', approvalLevel: 'Level 1 - Manager', description: '10x 27-inch 4K monitors for frontend engineering team.' },
]

const MOCK_MY_APPROVALS: ProcurementRequest[] = [
  { id: 'REQ-2026-001', title: 'High Performance Laptops for Engineering', requester: 'Team Lead Alex', department: 'IT', category: 'IT Hardware', amount: 350000, date: '2026-09-08', status: 'approved', priority: 'High', approvedBy: 'Sarah Manager', approvedDate: '2026-09-09', approvalLevel: 'Level 2', financeStatus: 'Approved', financeApprovedBy: 'Mark Finance Officer', financeApprovedDate: '2026-09-10', financeComment: 'Within Q3 Capex threshold. Approved for PO generation.', paymentStatus: 'Pending' },
  { id: 'REQ-2026-003', title: 'CRM Software Annual License', requester: 'Vikram Sales', department: 'Sales', category: 'Software & SaaS', amount: 120000, date: '2026-09-06', status: 'payment_pending', priority: 'Medium', approvedBy: 'Sarah Manager', approvedDate: '2026-09-07', approvalLevel: 'Level 1', financeStatus: 'Admin Approved - Queued for Payment', financeApprovedBy: 'Mark Finance Officer', financeApprovedDate: '2026-09-08', financeComment: 'Department budget available. Net 30 terms approved.', paymentStatus: 'Pending' },
  { id: 'REQ-2026-007', title: 'Server Room UPS Replacement', requester: 'Nitesh IT', department: 'IT', category: 'IT Hardware', amount: 195000, date: '2026-09-04', status: 'completed', priority: 'Critical', approvedBy: 'Sarah Manager', approvedDate: '2026-09-05', approvalLevel: 'Level 2', financeStatus: 'Completed', financeApprovedBy: 'Mark Finance Officer', financeApprovedDate: '2026-09-06', paymentStatus: 'Paid' },
  { id: 'REQ-2026-009', title: 'Security Compliance Audit Services', requester: 'Kajal Marketing', department: 'Security', category: 'IT Services', amount: 55000, date: '2026-09-02', status: 'completed', priority: 'Low', approvedBy: 'Sarah Manager', approvedDate: '2026-09-03', approvalLevel: 'Level 1', financeStatus: 'Completed', financeApprovedBy: 'Mark Finance Officer', financeApprovedDate: '2026-09-04', paymentStatus: 'Paid' },
]

const MOCK_REJECTED: ProcurementRequest[] = [
  { id: 'REQ-2026-005', title: 'Legacy Server Rack Replacement', requester: 'Nitesh IT', department: 'IT', category: 'IT Hardware', amount: 680000, date: '2026-08-28', status: 'rejected', priority: 'Medium', rejectionReason: 'Not aligned with department priorities', rejectedBy: 'Sarah Manager', rejectedDate: '2026-08-30' },
  { id: 'REQ-2026-008', title: 'Premium Coffee Machine for Lounge', requester: 'HR Admin', department: 'HR', category: 'Office Accessories', amount: 35000, date: '2026-09-01', status: 'rejected', priority: 'Low', rejectionReason: 'Budget not available', rejectedBy: 'Sarah Manager', rejectedDate: '2026-09-02' },
  { id: 'REQ-2026-010', title: 'Duplicate Software License Request', requester: 'Dev Team', department: 'IT', category: 'Software & SaaS', amount: 48000, date: '2026-09-03', status: 'rejected', priority: 'Medium', rejectionReason: 'Duplicate request', rejectedBy: 'Sarah Manager', rejectedDate: '2026-09-04' },
]

const MOCK_FINANCE_REVIEW: ProcurementRequest[] = [
  { id: 'REQ-2026-011', title: 'Annual Insurance Premium Renewal', requester: 'Admin', department: 'Admin', category: 'IT Services', amount: 320000, date: '2026-09-06', status: 'finance_review', priority: 'High', financeStatus: 'Pending Finance Approval', description: 'Comprehensive liability & asset coverage renewal for all 3 company premises.', justification: 'Statutory compliance and executive asset risk coverage.' },
  { id: 'REQ-2026-017', title: 'High-Density Switch Infrastructure', requester: 'Vikram Telecom', department: 'IT', category: 'Networking & Telecom', amount: 460000, date: '2026-09-09', status: 'finance_review', priority: 'High', financeStatus: 'Pending Finance Approval', description: 'Replacement switches for secondary data floor.', justification: 'Port density exhaustion on existing switches.' },
  { id: 'REQ-2026-018', title: 'Cybersecurity EDR License Renewal', requester: 'Security Desk', department: 'IT', category: 'Cybersecurity', amount: 215000, date: '2026-09-10', status: 'finance_review', priority: 'Critical', financeStatus: 'Pending Finance Approval', description: 'Endpoint detection and response SaaS license renewal for 250 nodes.', justification: 'SOC mandated endpoint protection.' },
]

const MOCK_RECOMMENDED: ProcurementRequest[] = [
  { id: 'REQ-2026-011', title: 'Annual Insurance Premium Renewal', requester: 'Admin', department: 'Admin', category: 'IT Services', amount: 320000, date: '2026-09-06', status: 'finance_review', priority: 'High', recommendationReason: 'High-value request — financial verification required', recommendedBy: 'Sarah Manager', recommendedDate: '2026-09-06', financeStatus: 'Pending Finance Approval' },
  { id: 'REQ-2026-017', title: 'High-Density Switch Infrastructure', requester: 'Vikram Telecom', department: 'IT', category: 'Networking & Telecom', amount: 460000, date: '2026-09-09', status: 'finance_review', priority: 'High', recommendationReason: 'Exceeds manager approval limit', recommendedBy: 'Sarah Manager', recommendedDate: '2026-09-09', financeStatus: 'Pending Finance Approval' },
]

const MOCK_RECOMMENDED_TO_ADMIN: ProcurementRequest[] = [
  {
    id: 'REQ-2026-002',
    title: 'Enterprise ERP System Upgrade',
    requester: 'Finance Team',
    department: 'Finance',
    category: 'Software & SaaS',
    amount: 1250000,
    date: '2026-09-05',
    status: 'recommended_to_admin',
    priority: 'Critical',
    recommendationReason: 'Exceeds Finance departmental approval limit (Threshold ₹10,00,000)',
    recommendedBy: 'Mark Finance Officer',
    recommendedDate: '2026-09-06',
    financeStatus: 'Recommended to Admin',
    approvalLevel: 'Admin / Executive Authority',
    financeComment: 'Budget provision confirmed in multi-year capex, but requires C-suite/Admin ratification before issuing PO.',
    description: 'Core ERP system migration to cloud edition with enterprise database upgrade.',
    justification: 'Current legacy server ERP reaching end of support this fiscal year.'
  },
  {
    id: 'REQ-2026-006',
    title: 'Data Center Migration Services',
    requester: 'IT Infrastructure',
    department: 'IT',
    category: 'Cloud & Infrastructure',
    amount: 875000,
    date: '2026-09-03',
    status: 'recommended_to_admin',
    priority: 'High',
    recommendationReason: 'Multi-vendor contractual milestone exceeding single-officer sign-off threshold',
    recommendedBy: 'Mark Finance Officer',
    recommendedDate: '2026-09-04',
    financeStatus: 'Recommended to Admin',
    approvalLevel: 'Admin / Executive Authority',
    financeComment: 'Requires Admin executive board resolution and legal indemnity clearance before fund release.',
    description: 'Specialized consultant support for Phase 2 zero-downtime datacenter migration.',
    justification: 'Mandatory risk mitigation protocol approved by CTO.'
  },
  {
    id: 'REQ-2026-014',
    title: 'AI Workstation GPU Clusters',
    requester: 'Maria Lead',
    department: 'IT',
    category: 'IT Hardware',
    amount: 450000,
    date: '2026-09-09',
    status: 'recommended_to_admin',
    priority: 'Critical',
    recommendationReason: 'Cross-departmental asset sharing agreement required between IT and R&D',
    recommendedBy: 'Mark Finance Officer',
    recommendedDate: '2026-09-10',
    financeStatus: 'Recommended to Admin',
    approvalLevel: 'Admin / Executive Authority',
    financeComment: 'High capital outlay for deep learning servers; requires Admin asset allocation approval.',
    description: '4x NVIDIA H100 GPU compute nodes for internal AI models.',
    justification: 'Essential for generative AI research roadmap.'
  }
]

const MOCK_BUDGETS: BudgetDepartment[] = [
  { department: 'IT', category: 'IT Hardware', totalBudget: 2500000, allocated: 1800000, committed: 350000, spent: 1200000, available: 950000, pending: 350000 },
  { department: 'IT', category: 'SaaS & Cloud', totalBudget: 1800000, allocated: 1200000, committed: 180000, spent: 700000, available: 920000, pending: 180000 },
  { department: 'Operations', category: 'Furniture & Equipment', totalBudget: 700000, allocated: 450000, committed: 95000, spent: 285000, available: 320000, pending: 95000 },
  { department: 'Marketing', category: 'Software & Tools', totalBudget: 500000, allocated: 320000, committed: 65000, spent: 175000, available: 260000, pending: 65000 },
  { department: 'HR', category: 'Training & Development', totalBudget: 400000, allocated: 260000, committed: 55000, spent: 150000, available: 195000, pending: 55000 },
  { department: 'Admin', category: 'Office Supplies', totalBudget: 300000, allocated: 180000, committed: 42000, spent: 110000, available: 148000, pending: 42000 },
]

const MOCK_RFQS: RFQ[] = [
  {
    id: 'RFQ-2026-028', title: 'Office Laptop Procurement', department: 'IT', status: 'under_evaluation',
    estimatedAmount: 850000, deadline: '2026-09-15', createdBy: 'Priya Sharma', createdDate: '2026-09-08',
    remarks: 'Need high performance laptops for development team',
    vendors: [
      { name: 'ABC Technologies', invitedOn: '2026-09-10', response: 'Received', quote: 1120000, deliveryDays: 14, warranty: '3 years', paymentTerms: 'Net 30' },
      { name: 'XYZ Solutions', invitedOn: '2026-09-10', response: 'Received', quote: 1080000, deliveryDays: 21, warranty: '2 years', paymentTerms: 'Net 45' },
      { name: 'Global IT', invitedOn: '2026-09-10', response: 'Pending' },
      { name: 'Tech World', invitedOn: '2026-09-10', response: 'Received', quote: 1210000, deliveryDays: 7, warranty: '3 years', paymentTerms: 'Net 15' },
      { name: 'NextGen Systems', invitedOn: '2026-09-10', response: 'Received', quote: 1350000, deliveryDays: 10, warranty: '4 years', paymentTerms: 'Net 30' },
    ],
    items: [
      { product: 'Laptop', specification: 'i7 / 16GB / 512GB', quantity: 20, expectedPrice: 60000, requiredBy: '2026-09-30' },
      { product: 'Monitor', specification: '24" IPS', quantity: 20, expectedPrice: 12000, requiredBy: '2026-09-30' },
      { product: 'Mouse', specification: 'Wireless', quantity: 20, expectedPrice: 2000, requiredBy: '2026-09-30' },
    ],
  },
  {
    id: 'RFQ-2026-027', title: 'Raw Material Supply', department: 'Production', status: 'quotes_received',
    estimatedAmount: 1200000, deadline: '2026-09-18', createdBy: 'Amit Verma', createdDate: '2026-09-05',
    vendors: [
      { name: 'Prime Supplies', invitedOn: '2026-09-06', response: 'Received', quote: 1180000, deliveryDays: 7 },
      { name: 'Material World', invitedOn: '2026-09-06', response: 'Received', quote: 1250000, deliveryDays: 5 },
      { name: 'Global Materials', invitedOn: '2026-09-06', response: 'Received', quote: 1100000, deliveryDays: 10 },
      { name: 'FastSupply Co', invitedOn: '2026-09-06', response: 'Pending' },
    ],
    items: [{ product: 'Steel Rods', specification: 'Grade A, 12mm', quantity: 500, expectedPrice: 2400, requiredBy: '2026-09-25' }],
  },
  {
    id: 'RFQ-2026-026', title: 'Packaging Material', department: 'Operations', status: 'sent',
    estimatedAmount: 240000, deadline: '2026-09-20', createdBy: 'Neha Gupta', createdDate: '2026-09-04',
    vendors: [
      { name: 'PackPro India', invitedOn: '2026-09-05', response: 'Pending' },
      { name: 'BoxCraft Ltd', invitedOn: '2026-09-05', response: 'Received', quote: 228000, deliveryDays: 3 },
      { name: 'EcoPack', invitedOn: '2026-09-05', response: 'Pending' },
    ],
    items: [{ product: 'Cardboard Boxes', specification: 'Double wall, 30x20x15cm', quantity: 10000, expectedPrice: 24, requiredBy: '2026-09-28' }],
  },
  {
    id: 'RFQ-2026-025', title: 'Office Furniture', department: 'Admin', status: 'awarded',
    estimatedAmount: 420000, deadline: '2026-09-10', createdBy: 'Rahul Mehta', createdDate: '2026-09-01',
    vendors: [
      { name: 'FurniCo', invitedOn: '2026-09-02', response: 'Received', quote: 390000, deliveryDays: 14 },
      { name: 'ErgoSpace', invitedOn: '2026-09-02', response: 'Received', quote: 415000, deliveryDays: 10 },
      { name: 'OfficeWorld', invitedOn: '2026-09-02', response: 'Received', quote: 398000, deliveryDays: 12 },
      { name: 'DesignDesk', invitedOn: '2026-09-02', response: 'Declined' },
      { name: 'StyleFurn', invitedOn: '2026-09-02', response: 'Received', quote: 425000, deliveryDays: 7 },
      { name: 'ModernInterior', invitedOn: '2026-09-02', response: 'Received', quote: 380000, deliveryDays: 21 },
    ],
    items: [{ product: 'Office Chair', specification: 'Ergonomic, adjustable', quantity: 50, expectedPrice: 8400, requiredBy: '2026-09-30' }],
  },
]

const MOCK_PAYMENT_DATA = {
  weekly: [
    { period: 'Mon', approved: 120000, paid: 95000, pending: 25000 },
    { period: 'Tue', approved: 85000, paid: 70000, pending: 15000 },
    { period: 'Wed', approved: 210000, paid: 180000, pending: 30000 },
    { period: 'Thu', approved: 165000, paid: 140000, pending: 25000 },
    { period: 'Fri', approved: 290000, paid: 240000, pending: 50000 },
    { period: 'Sat', approved: 45000, paid: 45000, pending: 0 },
    { period: 'Sun', approved: 0, paid: 0, pending: 0 },
  ],
  monthly: [
    { period: 'Jan', approved: 1800000, paid: 1500000, pending: 300000 },
    { period: 'Feb', approved: 1200000, paid: 1100000, pending: 100000 },
    { period: 'Mar', approved: 2200000, paid: 1800000, pending: 400000 },
    { period: 'Apr', approved: 1600000, paid: 1400000, pending: 200000 },
    { period: 'May', approved: 1900000, paid: 1700000, pending: 200000 },
    { period: 'Jun', approved: 2500000, paid: 2100000, pending: 400000 },
    { period: 'Jul', approved: 2100000, paid: 1900000, pending: 200000 },
    { period: 'Aug', approved: 1750000, paid: 1600000, pending: 150000 },
    { period: 'Sep', approved: 2800000, paid: 2100000, pending: 700000 },
  ],
  yearly: [
    { period: 'FY2022', approved: 18000000, paid: 16000000, pending: 2000000 },
    { period: 'FY2023', approved: 22000000, paid: 20000000, pending: 2000000 },
    { period: 'FY2024', approved: 26000000, paid: 24000000, pending: 2000000 },
    { period: 'FY2025', approved: 31000000, paid: 28000000, pending: 3000000 },
    { period: 'FY2026', approved: 19850000, paid: 15700000, pending: 4150000 },
  ],
}

const MOCK_TICKETS: RaiseTicket[] = [
  {
    id: 'TKT-2026-001',
    requestId: 'REQ-2026-001',
    requestTitle: 'High Performance Laptops for Engineering',
    requestAmount: 925000,
    department: 'IT Hardware',
    products: [
      {
        id: 'PROD-101',
        name: 'Dell XPS 15 Developer Laptop (Core i9, 32GB RAM, 1TB SSD)',
        category: 'Laptops',
        quantity: 10,
        unit: 'Units',
        vendor: 'ABC Technologies',
        pricePerUnit: 35000,
        totalAmount: 350000,
        productOrder: { id: 'PO-4582', vendor: 'ABC Technologies', date: '2026-09-10', amount: 350000, productDetails: 'Purchase order raised for 10x developer laptops from ABC Technologies.', verified: false },
        goodsReceipt: { id: 'GRN-2214', vendor: 'ABC Technologies', receivedDate: '2026-09-12', receivedQty: 10, acceptedQty: 10, unit: 'Units', verified: false },
        invoice: { id: 'INV-9841', vendor: 'ABC Technologies', invoiceDate: '2026-09-14', invoiceAmount: 350000, taxAmount: 63000, gstNumber: 'GSTIN27ABCDE1234F1Z5', verified: false },
        submitted: false,
      },
      {
        id: 'PROD-102',
        name: 'Dell UltraSharp 32" 4K UHD Thunderbolt Hub Monitor (U3223QE)',
        category: 'Displays',
        quantity: 10,
        unit: 'Units',
        vendor: 'Dell Technologies India',
        pricePerUnit: 45000,
        totalAmount: 450000,
        productOrder: { id: 'PO-4583', vendor: 'Dell Technologies India', date: '2026-09-11', amount: 450000, productDetails: '10x Dell UltraSharp 32" 4K UHD monitors with USB-C 90W charging.', verified: false },
        goodsReceipt: { id: 'GRN-2215', vendor: 'Dell Technologies India', receivedDate: '2026-09-13', receivedQty: 10, acceptedQty: 10, unit: 'Units', verified: false },
        invoice: { id: 'INV-9842', vendor: 'Dell Technologies India', invoiceDate: '2026-09-15', invoiceAmount: 450000, taxAmount: 81000, gstNumber: 'GSTIN29AABCD1234E1Z6', verified: false },
        submitted: false,
      },
      {
        id: 'PROD-103',
        name: 'Dell Premier Multi-Device Wireless Keyboard & ANC Headset Bundle',
        category: 'Peripherals',
        quantity: 10,
        unit: 'Units',
        vendor: 'TechEdge Peripherals Ltd',
        pricePerUnit: 12500,
        totalAmount: 125000,
        productOrder: { id: 'PO-4584', vendor: 'TechEdge Peripherals Ltd', date: '2026-09-12', amount: 125000, productDetails: '10x Dell Premier multi-device wireless peripheral kits.', verified: false },
        goodsReceipt: { id: 'GRN-2216', vendor: 'TechEdge Peripherals Ltd', receivedDate: '2026-09-14', receivedQty: 10, acceptedQty: 10, unit: 'Units', verified: false },
        invoice: { id: 'INV-9843', vendor: 'TechEdge Peripherals Ltd', invoiceDate: '2026-09-16', invoiceAmount: 125000, taxAmount: 22500, gstNumber: 'GSTIN27TECHP9988D1Z1', verified: false },
        submitted: false,
      }
    ],
    productOrder: { id: 'PO-4582', vendor: 'ABC Technologies', date: '2026-09-10', amount: 350000, productDetails: 'Purchase order raised for 10x developer laptops from ABC Technologies.', verified: false },
    goodsReceipt: { id: 'GRN-2214', vendor: 'ABC Technologies', receivedDate: '2026-09-12', receivedQty: 10, acceptedQty: 10, unit: 'Units', verified: false },
    invoice: { id: 'INV-9841', vendor: 'ABC Technologies', invoiceDate: '2026-09-14', invoiceAmount: 350000, taxAmount: 63000, gstNumber: 'GSTIN27ABCDE1234F1Z5', verified: false },
    submitted: false,
  },
  {
    id: 'TKT-2026-002',
    requestId: 'REQ-2026-002',
    requestTitle: 'Data Center Infrastructure Modernization',
    requestAmount: 1250000,
    department: 'Infrastructure',
    products: [
      {
        id: 'PROD-201',
        name: 'Dell PowerEdge R750 Rack Server Nodes',
        category: 'Servers',
        quantity: 4,
        unit: 'Units',
        vendor: 'PowerEdge Enterprise Solutions',
        pricePerUnit: 162500,
        totalAmount: 650000,
        productOrder: { id: 'PO-4601', vendor: 'PowerEdge Enterprise Solutions', date: '2026-09-08', amount: 650000, productDetails: '4x Dual Xeon 32-core compute nodes.', verified: false },
        goodsReceipt: { id: 'GRN-2231', vendor: 'PowerEdge Enterprise Solutions', receivedDate: '2026-09-10', receivedQty: 4, acceptedQty: 4, unit: 'Units', verified: false },
        invoice: { id: 'INV-9911', vendor: 'PowerEdge Enterprise Solutions', invoiceDate: '2026-09-11', invoiceAmount: 650000, taxAmount: 117000, gstNumber: 'GSTIN33GLOBE9988A1Z2', verified: false },
        submitted: false,
      },
      {
        id: 'PROD-202',
        name: 'Cisco Nexus 9300 100GbE Top-of-Rack Switch',
        category: 'Networking',
        quantity: 2,
        unit: 'Units',
        vendor: 'Cisco Enterprise Direct',
        pricePerUnit: 190000,
        totalAmount: 380000,
        productOrder: { id: 'PO-4602', vendor: 'Cisco Enterprise Direct', date: '2026-09-08', amount: 380000, productDetails: '2x 32-port 100GbE QSFP28 switches.', verified: false },
        goodsReceipt: { id: 'GRN-2232', vendor: 'Cisco Enterprise Direct', receivedDate: '2026-09-11', receivedQty: 2, acceptedQty: 2, unit: 'Units', verified: false },
        invoice: { id: 'INV-9912', vendor: 'Cisco Enterprise Direct', invoiceDate: '2026-09-12', invoiceAmount: 380000, taxAmount: 68400, gstNumber: 'GSTIN27CISCO1122C1Z4', verified: false },
        submitted: false,
      },
      {
        id: 'PROD-203',
        name: 'APC Smart-UPS 10kVA Modular Online UPS System',
        category: 'Power & Cooling',
        quantity: 2,
        unit: 'Units',
        vendor: 'Schneider Electric India',
        pricePerUnit: 110000,
        totalAmount: 220000,
        productOrder: { id: 'PO-4603', vendor: 'Schneider Electric India', date: '2026-09-09', amount: 220000, productDetails: '2x 10kVA rackmount UPS with extended runtime battery modules.', verified: false },
        goodsReceipt: { id: 'GRN-2233', vendor: 'Schneider Electric India', receivedDate: '2026-09-12', receivedQty: 2, acceptedQty: 2, unit: 'Units', verified: false },
        invoice: { id: 'INV-9913', vendor: 'Schneider Electric India', invoiceDate: '2026-09-13', invoiceAmount: 220000, taxAmount: 39600, gstNumber: 'GSTIN29SCHNE8877S1Z0', verified: false },
        submitted: false,
      }
    ],
    productOrder: { id: 'PO-4601', vendor: 'PowerEdge Enterprise Solutions', date: '2026-09-08', amount: 650000, productDetails: '4x Dual Xeon 32-core compute nodes.', verified: false },
    goodsReceipt: { id: 'GRN-2231', vendor: 'PowerEdge Enterprise Solutions', receivedDate: '2026-09-10', receivedQty: 4, acceptedQty: 4, unit: 'Units', verified: false },
    invoice: { id: 'INV-9911', vendor: 'PowerEdge Enterprise Solutions', invoiceDate: '2026-09-11', invoiceAmount: 650000, taxAmount: 117000, gstNumber: 'GSTIN33GLOBE9988A1Z2', verified: false },
    submitted: false,
  },
  {
    id: 'TKT-2026-003',
    requestId: 'REQ-2026-018',
    requestTitle: 'Modern Ergonomic Workspace & Operations Fitout',
    requestAmount: 2230000,
    department: 'Operations & Facilities',
    products: [
      {
        id: 'PROD-301',
        name: 'Motorized Dual-Motor Height-Adjustable Standing Desks',
        category: 'Furniture',
        quantity: 25,
        unit: 'Units',
        vendor: 'ErgoWorkspace India',
        pricePerUnit: 15000,
        totalAmount: 375000,
        productOrder: { id: 'PO-4701', vendor: 'ErgoWorkspace India', date: '2026-09-01', amount: 375000, productDetails: '25x Motorized dual-motor standing desks with memory presets.', verified: false },
        goodsReceipt: { id: 'GRN-2301', vendor: 'ErgoWorkspace India', receivedDate: '2026-09-03', receivedQty: 25, acceptedQty: 25, unit: 'Units', verified: false },
        invoice: { id: 'INV-10001', vendor: 'ErgoWorkspace India', invoiceDate: '2026-09-04', invoiceAmount: 375000, taxAmount: 67500, gstNumber: 'GSTIN33ERGO8877E1Z3', verified: false },
        submitted: false,
      },
      {
        id: 'PROD-302',
        name: 'Ergonomic High-Back Lumbar Mesh Executive Chairs',
        category: 'Furniture',
        quantity: 25,
        unit: 'Units',
        vendor: 'Steelform Seating Solutions',
        pricePerUnit: 10000,
        totalAmount: 250000,
        productOrder: { id: 'PO-4702', vendor: 'Steelform Seating Solutions', date: '2026-09-01', amount: 250000, productDetails: '25x Breathable mesh chairs with 4D armrests.', verified: false },
        goodsReceipt: { id: 'GRN-2302', vendor: 'Steelform Seating Solutions', receivedDate: '2026-09-04', receivedQty: 25, acceptedQty: 25, unit: 'Units', verified: false },
        invoice: { id: 'INV-10002', vendor: 'Steelform Seating Solutions', invoiceDate: '2026-09-05', invoiceAmount: 250000, taxAmount: 45000, gstNumber: 'GSTIN27STEEL5544A1Z7', verified: false },
        submitted: false,
      },
      {
        id: 'PROD-303',
        name: 'Heavy-Duty Dual Monitor Gas-Spring Desk Mounts',
        category: 'Accessories',
        quantity: 30,
        unit: 'Units',
        vendor: 'North Bayou Tech Systems',
        pricePerUnit: 3000,
        totalAmount: 90000,
        productOrder: { id: 'PO-4703', vendor: 'North Bayou Tech Systems', date: '2026-09-02', amount: 90000, productDetails: '30x Heavy-duty aluminum dual monitor arms.', verified: false },
        goodsReceipt: { id: 'GRN-2303', vendor: 'North Bayou Tech Systems', receivedDate: '2026-09-05', receivedQty: 30, acceptedQty: 30, unit: 'Units', verified: false },
        invoice: { id: 'INV-10003', vendor: 'North Bayou Tech Systems', invoiceDate: '2026-09-06', invoiceAmount: 90000, taxAmount: 16200, gstNumber: 'GSTIN27BAYOU3322B1Z6', verified: false },
        submitted: false,
      },
      {
        id: 'PROD-304',
        name: '27-inch 4K UHD USB-C IPS Display Monitors',
        category: 'Displays',
        quantity: 30,
        unit: 'Units',
        vendor: 'LG Electronics Commercial',
        pricePerUnit: 24000,
        totalAmount: 720000,
        productOrder: { id: 'PO-4704', vendor: 'LG Electronics Commercial', date: '2026-09-02', amount: 720000, productDetails: '30x 27-inch 4K IPS monitors with 90W USB-C PD.', verified: false },
        goodsReceipt: { id: 'GRN-2304', vendor: 'LG Electronics Commercial', receivedDate: '2026-09-05', receivedQty: 30, acceptedQty: 30, unit: 'Units', verified: false },
        invoice: { id: 'INV-10004', vendor: 'LG Electronics Commercial', invoiceDate: '2026-09-06', invoiceAmount: 720000, taxAmount: 129600, gstNumber: 'GSTIN27LGELE9988C1Z5', verified: false },
        submitted: false,
      },
      {
        id: 'PROD-305',
        name: 'Under-Desk Modular Cable Management Trays & Spines',
        category: 'Accessories',
        quantity: 25,
        unit: 'Units',
        vendor: 'CableCraft India Ltd',
        pricePerUnit: 1400,
        totalAmount: 35000,
        productOrder: { id: 'PO-4705', vendor: 'CableCraft India Ltd', date: '2026-09-03', amount: 35000, productDetails: '25x Steel wire cable baskets and vertical articulating spines.', verified: false },
        goodsReceipt: { id: 'GRN-2305', vendor: 'CableCraft India Ltd', receivedDate: '2026-09-06', receivedQty: 25, acceptedQty: 25, unit: 'Units', verified: false },
        invoice: { id: 'INV-10005', vendor: 'CableCraft India Ltd', invoiceDate: '2026-09-07', invoiceAmount: 35000, taxAmount: 6300, gstNumber: 'GSTIN27CABLE7766D1Z4', verified: false },
        submitted: false,
      },
      {
        id: 'PROD-306',
        name: 'Active Noise-Cancelling Wireless Bluetooth Headsets',
        category: 'Peripherals',
        quantity: 25,
        unit: 'Units',
        vendor: 'Jabra Enterprise Audio',
        pricePerUnit: 9000,
        totalAmount: 225000,
        productOrder: { id: 'PO-4706', vendor: 'Jabra Enterprise Audio', date: '2026-09-03', amount: 225000, productDetails: '25x Evolve2 65 UC stereo wireless headsets with charging stands.', verified: false },
        goodsReceipt: { id: 'GRN-2306', vendor: 'Jabra Enterprise Audio', receivedDate: '2026-09-06', receivedQty: 25, acceptedQty: 25, unit: 'Units', verified: false },
        invoice: { id: 'INV-10006', vendor: 'Jabra Enterprise Audio', invoiceDate: '2026-09-07', invoiceAmount: 225000, taxAmount: 40500, gstNumber: 'GSTIN27JABRA4433E1Z3', verified: false },
        submitted: false,
      },
      {
        id: 'PROD-307',
        name: 'Thunderbolt 4 Dual 4K Universal Docking Stations',
        category: 'Hardware',
        quantity: 25,
        unit: 'Units',
        vendor: 'Belkin Pro Commercial',
        pricePerUnit: 12000,
        totalAmount: 300000,
        productOrder: { id: 'PO-4707', vendor: 'Belkin Pro Commercial', date: '2026-09-04', amount: 300000, productDetails: '25x Thunderbolt 4 docks with dual 4K HDMI/DP and 96W pass-through.', verified: false },
        goodsReceipt: { id: 'GRN-2307', vendor: 'Belkin Pro Commercial', receivedDate: '2026-09-07', receivedQty: 25, acceptedQty: 25, unit: 'Units', verified: false },
        invoice: { id: 'INV-10007', vendor: 'Belkin Pro Commercial', invoiceDate: '2026-09-08', invoiceAmount: 300000, taxAmount: 54000, gstNumber: 'GSTIN27BELKN1199F1Z2', verified: false },
        submitted: false,
      },
      {
        id: 'PROD-308',
        name: 'High-Density Anti-Fatigue Beveled Floor Mats',
        category: 'Wellness',
        quantity: 25,
        unit: 'Units',
        vendor: 'ErgoMatics Comfort Systems',
        pricePerUnit: 1800,
        totalAmount: 45000,
        productOrder: { id: 'PO-4708', vendor: 'ErgoMatics Comfort Systems', date: '2026-09-04', amount: 45000, productDetails: '25x 3/4-inch high density commercial polyurethane comfort mats.', verified: false },
        goodsReceipt: { id: 'GRN-2308', vendor: 'ErgoMatics Comfort Systems', receivedDate: '2026-09-07', receivedQty: 25, acceptedQty: 25, unit: 'Units', verified: false },
        invoice: { id: 'INV-10008', vendor: 'ErgoMatics Comfort Systems', invoiceDate: '2026-09-08', invoiceAmount: 45000, taxAmount: 8100, gstNumber: 'GSTIN27ERGOM2233G1Z1', verified: false },
        submitted: false,
      },
      {
        id: 'PROD-309',
        name: 'Smart IoT Meeting Room Interactive Scheduling Panels',
        category: 'IoT & Smart Office',
        quantity: 6,
        unit: 'Units',
        vendor: 'Crestron India Pvt Ltd',
        pricePerUnit: 30000,
        totalAmount: 180000,
        productOrder: { id: 'PO-4709', vendor: 'Crestron India Pvt Ltd', date: '2026-09-05', amount: 180000, productDetails: '6x 10-inch PoE touch panels with room availability LED bars.', verified: false },
        goodsReceipt: { id: 'GRN-2309', vendor: 'Crestron India Pvt Ltd', receivedDate: '2026-09-08', receivedQty: 6, acceptedQty: 6, unit: 'Units', verified: false },
        invoice: { id: 'INV-10009', vendor: 'Crestron India Pvt Ltd', invoiceDate: '2026-09-09', invoiceAmount: 180000, taxAmount: 32400, gstNumber: 'GSTIN27CREST8822H1Z0', verified: false },
        submitted: false,
      },
      {
        id: 'PROD-310',
        name: 'All-in-One 360-Degree 4K Conference Room Video Bar',
        category: 'AV Conference',
        quantity: 2,
        unit: 'Units',
        vendor: 'Logitech Enterprise Division',
        pricePerUnit: 105000,
        totalAmount: 210000,
        productOrder: { id: 'PO-4710', vendor: 'Logitech Enterprise Division', date: '2026-09-05', amount: 210000, productDetails: '2x Rally Bar Mini motorized PTZ conference systems.', verified: false },
        goodsReceipt: { id: 'GRN-2310', vendor: 'Logitech Enterprise Division', receivedDate: '2026-09-08', receivedQty: 2, acceptedQty: 2, unit: 'Units', verified: false },
        invoice: { id: 'INV-10010', vendor: 'Logitech Enterprise Division', invoiceDate: '2026-09-09', invoiceAmount: 210000, taxAmount: 37800, gstNumber: 'GSTIN27LOGIT5511J1Z9', verified: false },
        submitted: false,
      }
    ],
    productOrder: { id: 'PO-4701', vendor: 'ErgoWorkspace India', date: '2026-09-01', amount: 375000, productDetails: '25x Motorized dual-motor standing desks with memory presets.', verified: false },
    goodsReceipt: { id: 'GRN-2301', vendor: 'ErgoWorkspace India', receivedDate: '2026-09-03', receivedQty: 25, acceptedQty: 25, unit: 'Units', verified: false },
    invoice: { id: 'INV-10001', vendor: 'ErgoWorkspace India', invoiceDate: '2026-09-04', invoiceAmount: 375000, taxAmount: 67500, gstNumber: 'GSTIN33ERGO8877E1Z3', verified: false },
    submitted: false,
  },
  {
    id: 'TKT-2026-004',
    requestId: 'REQ-2026-003',
    requestTitle: 'CRM Software Enterprise License Renewal',
    requestAmount: 120000,
    department: 'Sales',
    products: [
      {
        id: 'PROD-401',
        name: 'SalesCloud CRM Enterprise Annual License Seats',
        category: 'Software & SaaS',
        quantity: 50,
        unit: 'Seats',
        vendor: 'SalesCloud Global Inc',
        pricePerUnit: 2400,
        totalAmount: 120000,
        productOrder: { id: 'PO-4490', vendor: 'SalesCloud Global Inc', date: '2026-09-06', amount: 120000, productDetails: 'Annual enterprise seats for CRM system renewal.', verified: false },
        goodsReceipt: { id: 'GRN-2180', vendor: 'SalesCloud Global Inc', receivedDate: '2026-09-08', receivedQty: 50, acceptedQty: 50, unit: 'Seats', verified: false },
        invoice: { id: 'INV-8812', vendor: 'SalesCloud Global Inc', invoiceDate: '2026-09-09', invoiceAmount: 120000, taxAmount: 21600, gstNumber: 'GSTIN27SALES8899D1Z4', verified: false },
        submitted: false,
      }
    ],
    productOrder: { id: 'PO-4490', vendor: 'SalesCloud Global Inc', date: '2026-09-06', amount: 120000, productDetails: 'Annual enterprise seats for CRM system renewal.', verified: false },
    goodsReceipt: { id: 'GRN-2180', vendor: 'SalesCloud Global Inc', receivedDate: '2026-09-08', receivedQty: 50, acceptedQty: 50, unit: 'Seats', verified: false },
    invoice: { id: 'INV-8812', vendor: 'SalesCloud Global Inc', invoiceDate: '2026-09-09', invoiceAmount: 120000, taxAmount: 21600, gstNumber: 'GSTIN27SALES8899D1Z4', verified: false },
    submitted: false,
  },
]

const MOCK_PAYMENTS: PaymentRecord[] = [
  {
    id: 'PAY-2026-001',
    requestId: 'REQ-2026-001',
    requestTitle: 'High Performance Laptops for Engineering',
    vendor: 'ABC Technologies',
    invoiceId: 'INV-9841',
    poNumber: 'PO-4582',
    grnNumber: 'GRN-2214',
    amount: 350000,
    taxAmount: 63000,
    dueDate: '2026-09-25',
    paymentMethod: 'NEFT / RTGS Corporate',
    status: 'Pending',
    notes: 'Awaiting final 3-way match submission before release',
    history: [{ timestamp: '2026-09-14 11:00', actor: 'Finance System', action: 'Payment Scheduled', note: 'Invoice INV-9841 queued for payment' }],
  },
  {
    id: 'PAY-2026-002',
    requestId: 'REQ-2026-003',
    requestTitle: 'CRM Software Annual License',
    vendor: 'SalesCloud Global Inc',
    invoiceId: 'INV-8812',
    poNumber: 'PO-4490',
    grnNumber: 'GRN-2180',
    amount: 120000,
    taxAmount: 21600,
    dueDate: '2026-09-22',
    paymentDate: '2026-09-20',
    paymentMethod: 'Corporate Credit Card',
    status: 'Processing',
    notes: 'Sent to corporate bank gateway for batch settlement',
    history: [{ timestamp: '2026-09-20 09:15', actor: 'Mark Finance Officer', action: 'Initiated Processing', note: 'Batch transfer authorized' }],
  },
  {
    id: 'PAY-2026-003',
    requestId: 'REQ-2026-007',
    requestTitle: 'Server Room UPS Replacement',
    vendor: 'PowerCore Solutions',
    invoiceId: 'INV-7921',
    poNumber: 'PO-4410',
    grnNumber: 'GRN-2140',
    amount: 195000,
    taxAmount: 35100,
    dueDate: '2026-09-18',
    paymentDate: '2026-09-18',
    paymentMethod: 'ACH / Direct Wire',
    status: 'Paid',
    notes: 'UTR: UTR998821908234 - Settled successfully',
    history: [{ timestamp: '2026-09-18 16:30', actor: 'Mark Finance Officer', action: 'Payment Disbursed', note: 'UTR verified and recorded' }],
  },
  {
    id: 'PAY-2026-004',
    requestId: 'REQ-2026-009',
    requestTitle: 'Print & Marketing Material Q3',
    vendor: 'PrintMasters Ltd',
    invoiceId: 'INV-7412',
    poNumber: 'PO-4380',
    grnNumber: 'GRN-2090',
    amount: 55000,
    taxAmount: 9900,
    dueDate: '2026-09-15',
    paymentDate: '2026-09-15',
    paymentMethod: 'NEFT / RTGS Corporate',
    status: 'Paid',
    notes: 'UTR: UTR772210098412 - Completed',
    history: [{ timestamp: '2026-09-15 14:00', actor: 'Mark Finance Officer', action: 'Payment Disbursed' }],
  },
  {
    id: 'PAY-2026-005',
    requestId: 'REQ-2026-015',
    requestTitle: 'Marketing Analytics Dashboard',
    vendor: 'DataViz SaaS Corp',
    invoiceId: 'INV-9905',
    poNumber: 'PO-4610',
    grnNumber: 'GRN-2240',
    amount: 85000,
    taxAmount: 15300,
    dueDate: '2026-09-28',
    paymentMethod: 'Corporate Credit Card',
    status: 'On Hold',
    notes: 'Awaiting updated GST compliance invoice from vendor',
    history: [{ timestamp: '2026-09-10 12:40', actor: 'Mark Finance Officer', action: 'Put On Hold', note: 'GST discrepancy of 2% detected' }],
  },
  {
    id: 'PAY-2026-006',
    requestId: 'REQ-2026-016',
    requestTitle: 'Office Supplies Q4 Bulk Order',
    vendor: 'Stationery Hub India',
    invoiceId: 'INV-9850',
    poNumber: 'PO-4601',
    grnNumber: 'GRN-2231',
    amount: 42000,
    taxAmount: 7560,
    dueDate: '2026-09-12',
    paymentMethod: 'Bank Wire',
    status: 'Failed',
    notes: 'Beneficiary bank account details returned invalid IFSC code',
    history: [{ timestamp: '2026-09-12 17:00', actor: 'Banking Gateway', action: 'Transfer Failed', note: 'Invalid IFSC' }],
  },
]

const MOCK_COMPLAINTS: Complaint[] = [
  {
    id: 'CMP-2026-00124',
    productName: 'Dell Latitude 5440 Laptop',
    productId: 'SKU-DELL-LAT54',
    serialNumber: 'SN-DL-8899214',
    poNumber: 'PO-4582',
    grnNumber: 'GRN-2214',
    vendor: 'Dell Technologies Enterprise',
    deliveryDate: '2026-09-12',
    complaintType: 'Defective Product',
    defectiveQuantity: 5,
    severity: 'High',
    issueDescription: 'Five units failed hardware boot diagnostics with persistent motherboard memory parity errors.',
    resolutionRequested: 'Replacement',
    status: 'Under Review',
    createdBy: 'Sarah Manager',
    createdDate: '2026-09-12',
    evidenceImages: ['/evidence/laptop_diag_error.png'],
    supportingDocuments: ['PO-4582_Signed.pdf', 'GRN-2214_Defect_Report.pdf'],
    comments: [
      { id: 'c1', author: 'Sarah Manager', role: 'Procurement Manager', date: '2026-09-12 10:15', message: 'Defect noticed during staging batch testing.' },
      { id: 'c2', author: 'Mark Finance Officer', role: 'Finance Officer', date: '2026-09-12 11:30', message: 'Placed associated payment PAY-2026-001 on alert pending replacement credit confirmation.' }
    ],
    auditTrail: [
      { timestamp: '2026-09-12 10:15', actor: 'Sarah Manager', action: 'Complaint Submitted', newStatus: 'Submitted' },
      { timestamp: '2026-09-12 11:00', actor: 'Mark Finance Officer', action: 'Review Started', previousStatus: 'Submitted', newStatus: 'Under Review' },
    ],
  },
  {
    id: 'CMP-2026-00123',
    productName: 'Samsung 27" 4K UHD Monitor',
    productId: 'SKU-SAMS-M274K',
    serialNumber: 'SN-SM-4451201',
    poNumber: 'PO-4412',
    grnNumber: 'GRN-2190',
    vendor: 'Samsung Display Systems',
    deliveryDate: '2026-09-10',
    complaintType: 'Damaged Product',
    defectiveQuantity: 2,
    severity: 'Medium',
    issueDescription: 'Screen panels cracked during shipping transit. Outer cartons showed heavy compression.',
    resolutionRequested: 'Replacement',
    status: 'Submitted',
    createdBy: 'Sarah Manager',
    createdDate: '2026-09-10',
    evidenceImages: ['/evidence/monitor_cracked_panel.jpg'],
    supportingDocuments: ['Delivery_Challan_Signed.pdf'],
    auditTrail: [
      { timestamp: '2026-09-10 14:20', actor: 'Sarah Manager', action: 'Complaint Submitted', newStatus: 'Submitted' },
    ],
  },
  {
    id: 'CMP-2026-00122',
    productName: 'Logitech Zone Wireless 2 Headset',
    productId: 'SKU-LOGI-ZW2',
    serialNumber: 'SN-LG-9912440',
    poNumber: 'PO-4390',
    grnNumber: 'GRN-2145',
    vendor: 'Logitech Peripheral Corp',
    deliveryDate: '2026-09-08',
    complaintType: 'Wrong Product',
    defectiveQuantity: 10,
    severity: 'Low',
    issueDescription: 'Ordered Active Noise Cancelling models but standard wired models were shipped.',
    resolutionRequested: 'Return to Vendor',
    status: 'Resolved',
    createdBy: 'Sarah Manager',
    createdDate: '2026-09-08',
    comments: [
      { id: 'c3', author: 'Mark Finance Officer', role: 'Finance Officer', date: '2026-09-09 15:00', message: 'Vendor issued Credit Note CN-7712 for $2,400. Resolved.' }
    ],
    auditTrail: [
      { timestamp: '2026-09-08 09:00', actor: 'Sarah Manager', action: 'Complaint Submitted', newStatus: 'Submitted' },
      { timestamp: '2026-09-08 11:30', actor: 'Mark Finance Officer', action: 'Vendor Notified', previousStatus: 'Submitted', newStatus: 'Vendor Notified' },
      { timestamp: '2026-09-09 15:00', actor: 'Mark Finance Officer', action: 'Resolution Approved', previousStatus: 'Vendor Notified', newStatus: 'Resolved', comment: 'Credit Note Received' },
    ],
  },
  {
    id: 'CMP-2026-00121',
    productName: 'Keychron K8 Pro Mechanical Keyboard',
    productId: 'SKU-KEYC-K8PRO',
    serialNumber: 'SN-KC-3312098',
    poNumber: 'PO-4320',
    grnNumber: 'GRN-2101',
    vendor: 'Keychron Tech',
    deliveryDate: '2026-09-05',
    complaintType: 'Missing Parts',
    defectiveQuantity: 4,
    severity: 'Medium',
    issueDescription: 'USB-C coiled cables and switch puller tools missing from internal box packaging.',
    resolutionRequested: 'Replacement',
    status: 'Action Taken',
    createdBy: 'Team Lead Alex',
    createdDate: '2026-09-05',
    auditTrail: [
      { timestamp: '2026-09-05 16:00', actor: 'Team Lead Alex', action: 'Complaint Submitted', newStatus: 'Submitted' },
      { timestamp: '2026-09-06 10:00', actor: 'Sarah Manager', action: 'Vendor Notified', previousStatus: 'Submitted', newStatus: 'Vendor Notified' },
      { timestamp: '2026-09-07 11:00', actor: 'Vendor Rep', action: 'Replacement Parts Dispatched via DHL', previousStatus: 'Vendor Notified', newStatus: 'Action Taken' },
    ],
  },
  {
    id: 'CMP-2026-00120',
    productName: 'Logitech MX Master 3S Mouse',
    productId: 'SKU-LOGI-MXM3S',
    serialNumber: 'SN-LG-1100982',
    poNumber: 'PO-4288',
    grnNumber: 'GRN-2070',
    vendor: 'Logitech Peripheral Corp',
    deliveryDate: '2026-09-02',
    complaintType: 'Quality Issue',
    defectiveQuantity: 1,
    severity: 'Low',
    issueDescription: 'Scroll wheel loose click ratchet mechanism.',
    resolutionRequested: 'Replacement',
    status: 'Closed',
    createdBy: 'Sarah Manager',
    createdDate: '2026-09-02',
    auditTrail: [
      { timestamp: '2026-09-02 11:00', actor: 'Sarah Manager', action: 'Submitted', newStatus: 'Submitted' },
      { timestamp: '2026-09-04 14:00', actor: 'Mark Finance Officer', action: 'Closed', previousStatus: 'Resolved', newStatus: 'Closed' },
    ],
  },
]

const MOCK_FINANCE_AUDIT: FinanceAuditItem[] = [
  { id: 'AUD-001', requestId: 'REQ-2026-001', requestTitle: 'High Performance Laptops for Engineering', actor: 'Mark Finance Officer', action: 'APPROVED', timestamp: '2026-09-10 11:30 AM', comment: 'Approved within Q3 department Capex budget allocation.', amount: 350000, paymentStatus: 'Pending' },
  { id: 'AUD-002', requestId: 'REQ-2026-003', requestTitle: 'CRM Software Annual License', actor: 'Mark Finance Officer', action: 'APPROVED', timestamp: '2026-09-08 02:15 PM', comment: 'Department budget available. Net 30 payment schedule confirmed.', amount: 120000, paymentStatus: 'Processing' },
  { id: 'AUD-003', requestId: 'REQ-2026-007', requestTitle: 'Server Room UPS Replacement', actor: 'Mark Finance Officer', action: 'APPROVED', timestamp: '2026-09-06 10:00 AM', comment: 'Critical infrastructure emergency allocation approved.', amount: 195000, paymentStatus: 'Paid' },
  { id: 'AUD-004', requestId: 'REQ-2026-009', requestTitle: 'Print & Marketing Material Q3', actor: 'Mark Finance Officer', action: 'APPROVED', timestamp: '2026-09-04 04:45 PM', comment: 'Marketing operational spend threshold verified.', amount: 55000, paymentStatus: 'Paid' },
  { id: 'AUD-005', requestId: 'REQ-2026-005', requestTitle: 'Legacy Server Rack Replacement', actor: 'Mark Finance Officer', action: 'REJECTED', timestamp: '2026-08-30 03:20 PM', reason: 'Insufficient Capex allocation remaining in IT hardware pool', comment: 'Recommend re-submitting in FY2027 budgeting cycle.', amount: 680000 },
  { id: 'AUD-006', requestId: 'REQ-2026-008', requestTitle: 'Premium Coffee Machine for Lounge', actor: 'Mark Finance Officer', action: 'REJECTED', timestamp: '2026-09-02 01:10 PM', reason: 'Non-essential luxury purchase exceeding discretionary threshold', comment: 'Disallowed under corporate austerity policy.', amount: 35000 },
]

const MOCK_VENDORS: VendorItem[] = [
  {
    id: 'VND-2026-001',
    name: 'Dell Technologies India',
    company: 'Dell Global B.V.',
    contactPerson: 'Arun Deshmukh',
    email: 'arun.d@dellenterprise.com',
    phone: '+91 98201 44550',
    category: 'IT Hardware',
    status: 'Active',
    riskLevel: 'Low',
    performanceScore: 96,
    activeContracts: 3,
    totalOrders: 28,
    totalPurchaseValue: 4850000,
    complianceStatus: 'Verified',
    documentsCount: 6,
    onTimeDeliveryRate: 98,
    qualityIssuesCount: 0,
    complaintsCount: 0,
    registeredDate: '2024-02-15',
    approvalDate: '2024-02-20',
    notes: 'Tier 1 preferred OEM for laptops and server infrastructure.'
  },
  {
    id: 'VND-2026-002',
    name: 'Amazon Web Services India Pvt Ltd',
    company: 'Amazon Internet Services',
    contactPerson: 'Neha Chawla',
    email: 'cloud-contracts@amazon.in',
    phone: '+91 98450 11223',
    category: 'SaaS & Cloud',
    status: 'Active',
    riskLevel: 'Low',
    performanceScore: 99,
    activeContracts: 2,
    totalOrders: 14,
    totalPurchaseValue: 3200000,
    complianceStatus: 'Verified',
    documentsCount: 8,
    onTimeDeliveryRate: 100,
    qualityIssuesCount: 0,
    complaintsCount: 0,
    registeredDate: '2023-08-10',
    approvalDate: '2023-08-15',
    notes: 'Strategic cloud infrastructure partner.'
  },
  {
    id: 'VND-2026-003',
    name: 'Prime Steel & Construction Supplies',
    company: 'Prime Materials Ltd',
    contactPerson: 'Rajesh Singhania',
    email: 'orders@primesteel.co.in',
    phone: '+91 97110 88992',
    category: 'Raw Materials',
    status: 'Active',
    riskLevel: 'Medium',
    performanceScore: 88,
    activeContracts: 1,
    totalOrders: 9,
    totalPurchaseValue: 1820000,
    complianceStatus: 'Verified',
    documentsCount: 4,
    onTimeDeliveryRate: 90,
    qualityIssuesCount: 1,
    complaintsCount: 1,
    registeredDate: '2025-01-18',
    approvalDate: '2025-01-25',
    notes: 'Raw material partner for operations plant.'
  },
  {
    id: 'VND-2026-004',
    name: 'ErgoSpace Furniture Solutions',
    company: 'ErgoSpace Designs Pvt Ltd',
    contactPerson: 'Vikram Joshi',
    email: 'v.joshi@ergospace.in',
    phone: '+91 99203 77441',
    category: 'Furniture',
    status: 'Pending Approval',
    riskLevel: 'Low',
    performanceScore: 92,
    activeContracts: 0,
    totalOrders: 0,
    totalPurchaseValue: 0,
    complianceStatus: 'Pending Audit',
    documentsCount: 4,
    onTimeDeliveryRate: 95,
    qualityIssuesCount: 0,
    complaintsCount: 0,
    registeredDate: '2026-09-08',
    notes: 'Submitted onboard documents for Standing Desks tender.'
  },
  {
    id: 'VND-2026-005',
    name: 'QuickServe Logistics Partners',
    company: 'QuickServe Freight Corp',
    contactPerson: 'Mohan Lal',
    email: 'ops@quickservefreight.in',
    phone: '+91 98112 55667',
    category: 'Logistics & Transport',
    status: 'Suspended',
    riskLevel: 'High',
    performanceScore: 68,
    activeContracts: 1,
    totalOrders: 12,
    totalPurchaseValue: 640000,
    complianceStatus: 'Action Required',
    documentsCount: 3,
    onTimeDeliveryRate: 65,
    qualityIssuesCount: 3,
    complaintsCount: 2,
    registeredDate: '2024-05-12',
    approvalDate: '2024-05-20',
    notes: 'Temporary suspension pending SLA penalty investigation.'
  },
  {
    id: 'VND-2026-006',
    name: 'FastSupply Industrial Co',
    company: 'FastSupply Group Ltd',
    contactPerson: 'Deepak Patel',
    email: 'deepak@fastsupply.in',
    phone: '+91 97223 44119',
    category: 'Consumables',
    status: 'Active',
    riskLevel: 'Low',
    performanceScore: 94,
    activeContracts: 2,
    totalOrders: 19,
    totalPurchaseValue: 1490000,
    complianceStatus: 'Verified',
    documentsCount: 5,
    onTimeDeliveryRate: 96,
    qualityIssuesCount: 0,
    complaintsCount: 0,
    registeredDate: '2024-09-15',
    approvalDate: '2024-09-20',
    notes: 'Consumables bulk supply vendor.'
  },
  {
    id: 'VND-2026-007',
    name: 'BoxCraft Packaging Ltd',
    company: 'BoxCraft India',
    contactPerson: 'Karan Mehra',
    email: 'karan@boxcraft.com',
    phone: '+91 99334 11228',
    category: 'Packaging Material',
    status: 'Active',
    riskLevel: 'Low',
    performanceScore: 91,
    activeContracts: 1,
    totalOrders: 8,
    totalPurchaseValue: 520000,
    complianceStatus: 'Verified',
    documentsCount: 4,
    onTimeDeliveryRate: 92,
    qualityIssuesCount: 0,
    complaintsCount: 0,
    registeredDate: '2025-04-10',
    approvalDate: '2025-04-18',
    notes: 'Cardboard box and eco-packing provider.'
  },
  {
    id: 'VND-2026-008',
    name: 'ModernOffice Interior Systems',
    company: 'ModernOffice Global',
    contactPerson: 'Pooja Bhatt',
    email: 'pooja@modernoffice.in',
    phone: '+91 98881 22334',
    category: 'Furniture',
    status: 'Rejected',
    riskLevel: 'High',
    performanceScore: 55,
    activeContracts: 0,
    totalOrders: 0,
    totalPurchaseValue: 0,
    complianceStatus: 'Action Required',
    documentsCount: 2,
    onTimeDeliveryRate: 60,
    qualityIssuesCount: 2,
    complaintsCount: 1,
    registeredDate: '2026-08-20',
    notes: 'Failed financial audit and GST verification.'
  }
]

const MOCK_PURCHASE_ORDERS: PurchaseOrderItem[] = [
  {
    id: 'PO-2026-001',
    poNumber: 'PO-4381',
    requestId: 'REQ-2026-001',
    requestTitle: 'High Performance Laptops for Engineering',
    procurementType: 'HARDWARE',
    category: 'IT Hardware',
    vendor: 'Dell Technologies India',
    vendorId: 'VND-2026-001',
    submittedBy: 'Dell Technologies India (Vendor)',
    submittedByRole: 'Vendor',
    submissionDate: '2026-09-14',
    poDate: '2026-09-10',
    items: [{ product: 'Dell XPS 15 Laptops', quantity: 5, unitPrice: 70000, total: 350000 }],
    quantity: 5,
    totalAmount: 350000,
    deliveryDate: '2026-09-20',
    status: 'Delivered',
    paymentStatus: 'Pending',
    terms: 'Net 30'
  },
  {
    id: 'PO-2026-001B',
    poNumber: 'PO-4583',
    requestId: 'REQ-2026-001',
    requestTitle: 'High Performance Laptops for Engineering — 4K Displays',
    procurementType: 'HARDWARE',
    category: 'IT Hardware',
    vendor: 'Dell Technologies India',
    vendorId: 'VND-2026-001',
    submittedBy: 'Dell Technologies India (Vendor)',
    submittedByRole: 'Vendor',
    submissionDate: '2026-09-14',
    poDate: '2026-09-11',
    items: [{ product: 'Dell UltraSharp 32" 4K UHD Thunderbolt Hub Monitor (U3223QE)', quantity: 10, unitPrice: 45000, total: 450000 }],
    quantity: 10,
    totalAmount: 450000,
    deliveryDate: '2026-09-22',
    status: 'Delivered',
    paymentStatus: 'Pending',
    terms: 'Net 30'
  },
  {
    id: 'PO-2026-001C',
    poNumber: 'PO-4584',
    requestId: 'REQ-2026-001',
    requestTitle: 'High Performance Laptops for Engineering — Peripherals Bundle',
    procurementType: 'HARDWARE',
    category: 'IT Hardware',
    vendor: 'TechEdge Peripherals Ltd',
    vendorId: 'VND-2026-006',
    submittedBy: 'TechEdge Peripherals Ltd (Vendor)',
    submittedByRole: 'Vendor',
    submissionDate: '2026-09-15',
    poDate: '2026-09-12',
    items: [{ product: 'Dell Premier Multi-Device Wireless Keyboard & ANC Headset Bundle', quantity: 10, unitPrice: 12500, total: 125000 }],
    quantity: 10,
    totalAmount: 125000,
    deliveryDate: '2026-09-24',
    status: 'Delivered',
    paymentStatus: 'Pending',
    terms: 'Net 30'
  },
  {
    id: 'PO-2026-002',
    poNumber: 'PO-4382',
    requestId: 'REQ-2026-003',
    requestTitle: 'CRM Software Annual License',
    procurementType: 'SOFTWARE',
    category: 'Software & SaaS',
    vendor: 'Amazon Web Services India Pvt Ltd',
    vendorId: 'VND-2026-002',
    submittedBy: 'Team Lead Alex',
    submittedByRole: 'Team Lead',
    submissionDate: '2026-09-10',
    poDate: '2026-09-08',
    items: [{ product: 'CRM Enterprise Cloud License', quantity: 50, unitPrice: 2400, total: 120000 }],
    quantity: 50,
    totalAmount: 120000,
    deliveryDate: '2026-09-12',
    status: 'Delivered',
    paymentStatus: 'Paid',
    terms: 'Net 15'
  },
  {
    id: 'PO-2026-003',
    poNumber: 'PO-4383',
    requestId: 'REQ-2026-007',
    requestTitle: 'Server Room UPS Replacement',
    procurementType: 'HARDWARE',
    category: 'IT Hardware',
    vendor: 'Dell Technologies India',
    vendorId: 'VND-2026-001',
    submittedBy: 'Dell Technologies India (Vendor)',
    submittedByRole: 'Vendor',
    submissionDate: '2026-09-12',
    poDate: '2026-09-06',
    items: [{ product: 'Industrial Rackmount UPS 10kVA', quantity: 2, unitPrice: 97500, total: 195000 }],
    quantity: 2,
    totalAmount: 195000,
    deliveryDate: '2026-09-18',
    status: 'Acknowledged',
    paymentStatus: 'Pending',
    terms: 'Net 30'
  },
  {
    id: 'PO-2026-004',
    poNumber: 'PO-4384',
    requestId: 'REQ-2026-009',
    requestTitle: 'Print & Marketing Material Q3',
    procurementType: 'HARDWARE',
    category: 'Consumables',
    vendor: 'FastSupply Industrial Co',
    vendorId: 'VND-2026-006',
    submittedBy: 'FastSupply Industrial Co (Vendor)',
    submittedByRole: 'Vendor',
    submissionDate: '2026-09-08',
    poDate: '2026-09-04',
    items: [{ product: 'Corporate Collateral Printing', quantity: 5000, unitPrice: 11, total: 55000 }],
    quantity: 5000,
    totalAmount: 55000,
    deliveryDate: '2026-09-15',
    status: 'Delivered',
    paymentStatus: 'Paid',
    terms: 'Net 30'
  },
  {
    id: 'PO-2026-005',
    poNumber: 'PO-4385',
    requestId: 'REQ-2026-012',
    requestTitle: 'Cloud Infrastructure Yearly Renewal',
    procurementType: 'SOFTWARE',
    category: 'Software & SaaS',
    vendor: 'Amazon Web Services India Pvt Ltd',
    vendorId: 'VND-2026-002',
    submittedBy: 'Alex Developer (Team Lead)',
    submittedByRole: 'Team Lead',
    submissionDate: '2026-09-05',
    poDate: '2026-09-02',
    items: [{ product: 'AWS Reserved Instance Plan', quantity: 1, unitPrice: 580000, total: 580000 }],
    quantity: 1,
    totalAmount: 580000,
    deliveryDate: '2026-09-25',
    status: 'Approved',
    paymentStatus: 'Processing',
    terms: 'Immediate Wire'
  },
  {
    id: 'PO-2026-006',
    poNumber: 'PO-4386',
    requestId: 'REQ-2026-015',
    requestTitle: 'Marketing Analytics Dashboard',
    procurementType: 'SOFTWARE',
    category: 'Software & SaaS',
    vendor: 'FastSupply Industrial Co',
    vendorId: 'VND-2026-006',
    submittedBy: 'Sneha Patel (Team Lead)',
    submittedByRole: 'Team Lead',
    submissionDate: '2026-09-11',
    poDate: '2026-09-09',
    items: [{ product: 'Analytics SaaS License Q4', quantity: 1, unitPrice: 85000, total: 85000 }],
    quantity: 1,
    totalAmount: 85000,
    deliveryDate: '2026-09-30',
    status: 'Sent to Vendor',
    paymentStatus: 'On Hold',
    terms: 'Net 30'
  },
  {
    id: 'PO-2026-007',
    poNumber: 'PO-4387',
    requestId: 'REQ-2026-025',
    requestTitle: 'Office Furniture',
    procurementType: 'HARDWARE',
    category: 'Furniture',
    vendor: 'Prime Steel & Construction Supplies',
    vendorId: 'VND-2026-003',
    submittedBy: 'Prime Steel & Construction Supplies (Vendor)',
    submittedByRole: 'Vendor',
    submissionDate: '2026-09-12',
    poDate: '2026-09-11',
    items: [{ product: 'Ergonomic Task Chairs', quantity: 50, unitPrice: 7800, total: 390000 }],
    quantity: 50,
    totalAmount: 390000,
    deliveryDate: '2026-09-30',
    status: 'Draft',
    paymentStatus: 'Pending',
    terms: 'Net 45'
  },
  {
    id: 'PO-2026-008',
    poNumber: 'PO-4388',
    requestId: 'REQ-2026-019',
    requestTitle: 'Network Security Audit Tools',
    procurementType: 'SOFTWARE',
    category: 'Software',
    vendor: 'CyberGuard Enterprise Software',
    vendorId: 'VND-2026-002',
    submittedBy: 'Priya Sharma (Security Lead)',
    submittedByRole: 'Team Lead',
    submissionDate: '2026-09-13',
    poDate: '2026-09-11',
    items: [{ product: 'Vulnerability Scanner Enterprise Node Licenses', quantity: 5, unitPrice: 35000, total: 175000 }],
    quantity: 5,
    totalAmount: 175000,
    deliveryDate: '2026-09-20',
    status: 'Approved',
    paymentStatus: 'Pending',
    terms: 'Net 30'
  }
]

const MOCK_INVOICES: VendorInvoice[] = [
  {
    id: 'INV-2026-001',
    invoiceNumber: 'INV-9841',
    poId: 'PO-2026-001',
    poNumber: 'PO-4381',
    requestId: 'REQ-2026-001',
    requestTitle: 'High Performance Laptops for Engineering',
    procurementType: 'HARDWARE',
    vendor: 'Dell Technologies India',
    vendorId: 'VND-2026-001',
    submittedBy: 'Dell Technologies India (Vendor)',
    submittedByRole: 'Vendor',
    submissionDate: '2026-09-14',
    documentType: 'Tax Invoice',
    gstNumber: 'GSTIN29AABCD1234E1Z6',
    invoiceDate: '2026-09-14',
    dueDate: '2026-10-14',
    subtotal: 350000,
    taxAmount: 63000,
    totalAmount: 413000,
    status: 'Pending Review',
    items: [
      { product: 'Dell XPS 15 Laptops (Core i9, 32GB RAM, 1TB SSD)', quantity: 5, unitPrice: 70000, total: 350000 }
    ],
    notes: 'Standard Net 30 commercial tax bill. Hardware serial numbers included on delivery challan.'
  },
  {
    id: 'INV-2026-001B',
    invoiceNumber: 'INV-9842',
    poId: 'PO-2026-001B',
    poNumber: 'PO-4583',
    requestId: 'REQ-2026-001',
    requestTitle: 'High Performance Laptops for Engineering — 4K Displays',
    procurementType: 'HARDWARE',
    vendor: 'Dell Technologies India',
    vendorId: 'VND-2026-001',
    submittedBy: 'Dell Technologies India (Vendor)',
    submittedByRole: 'Vendor',
    submissionDate: '2026-09-15',
    documentType: 'Tax Invoice',
    gstNumber: 'GSTIN29AABCD1234E1Z6',
    invoiceDate: '2026-09-15',
    dueDate: '2026-10-15',
    subtotal: 450000,
    taxAmount: 81000,
    totalAmount: 531000,
    status: 'Pending Review',
    items: [
      { product: 'Dell UltraSharp 32" 4K UHD Thunderbolt Hub Monitor (U3223QE)', quantity: 10, unitPrice: 45000, total: 450000 }
    ],
    notes: 'Commercial tax bill for 10x 4K UHD monitors.'
  },
  {
    id: 'INV-2026-001C',
    invoiceNumber: 'INV-9843',
    poId: 'PO-2026-001C',
    poNumber: 'PO-4584',
    requestId: 'REQ-2026-001',
    requestTitle: 'High Performance Laptops for Engineering — Peripherals Bundle',
    procurementType: 'HARDWARE',
    vendor: 'TechEdge Peripherals Ltd',
    vendorId: 'VND-2026-006',
    submittedBy: 'TechEdge Peripherals Ltd (Vendor)',
    submittedByRole: 'Vendor',
    submissionDate: '2026-09-16',
    documentType: 'Tax Invoice',
    gstNumber: 'GSTIN27TECHP9988D1Z1',
    invoiceDate: '2026-09-16',
    dueDate: '2026-10-16',
    subtotal: 125000,
    taxAmount: 22500,
    totalAmount: 147500,
    status: 'Pending Review',
    items: [
      { product: 'Dell Premier Multi-Device Wireless Keyboard & ANC Headset Bundle', quantity: 10, unitPrice: 12500, total: 125000 }
    ],
    notes: 'Commercial tax bill for peripheral kits.'
  },
  {
    id: 'INV-2026-002',
    invoiceNumber: 'INV-8812',
    poId: 'PO-2026-002',
    poNumber: 'PO-4382',
    requestId: 'REQ-2026-003',
    requestTitle: 'CRM Software Annual License',
    procurementType: 'SOFTWARE',
    vendor: 'Amazon Web Services India Pvt Ltd',
    vendorId: 'VND-2026-002',
    submittedBy: 'Team Lead Alex',
    submittedByRole: 'Team Lead',
    submissionDate: '2026-09-10',
    documentType: 'Software License Agreement',
    gstNumber: 'GSTIN27AABCA4567F1Z8',
    invoiceDate: '2026-09-10',
    dueDate: '2026-09-25',
    subtotal: 120000,
    taxAmount: 21600,
    totalAmount: 141600,
    status: 'Accepted',
    acceptedAt: '2026-09-11',
    acceptedBy: 'Sarah Manager',
    items: [
      { product: 'CRM Enterprise Cloud License (Annual)', quantity: 50, unitPrice: 2400, total: 120000 }
    ],
    notes: 'Software subscription license document and payment challan submitted by Team Lead Alex.'
  },
  {
    id: 'INV-2026-003',
    invoiceNumber: 'INV-9913',
    poId: 'PO-2026-003',
    poNumber: 'PO-4383',
    requestId: 'REQ-2026-007',
    requestTitle: 'Server Room UPS Replacement',
    procurementType: 'HARDWARE',
    vendor: 'Dell Technologies India',
    vendorId: 'VND-2026-001',
    submittedBy: 'Dell Technologies India (Vendor)',
    submittedByRole: 'Vendor',
    submissionDate: '2026-09-12',
    documentType: 'Tax Invoice',
    gstNumber: 'GSTIN29AABCD1234E1Z6',
    invoiceDate: '2026-09-12',
    dueDate: '2026-10-12',
    subtotal: 195000,
    taxAmount: 35100,
    totalAmount: 230100,
    status: 'Pending Review',
    items: [
      { product: 'Industrial Rackmount UPS 10kVA with Battery Modules', quantity: 2, unitPrice: 97500, total: 195000 }
    ],
    notes: 'Installation and commissioning certificate attached.'
  },
  {
    id: 'INV-2026-004',
    invoiceNumber: 'INV-7921',
    poId: 'PO-2026-004',
    poNumber: 'PO-4384',
    requestId: 'REQ-2026-009',
    requestTitle: 'Print & Marketing Material Q3',
    procurementType: 'HARDWARE',
    vendor: 'FastSupply Industrial Co',
    vendorId: 'VND-2026-006',
    submittedBy: 'FastSupply Industrial Co (Vendor)',
    submittedByRole: 'Vendor',
    submissionDate: '2026-09-08',
    documentType: 'Commercial Bill',
    gstNumber: 'GSTIN27FASTS9988C1Z2',
    invoiceDate: '2026-09-08',
    dueDate: '2026-10-08',
    subtotal: 55000,
    taxAmount: 9900,
    totalAmount: 64900,
    status: 'Accepted',
    acceptedAt: '2026-09-09',
    acceptedBy: 'Sarah Manager',
    items: [
      { product: 'Corporate Collateral Printing & Binding', quantity: 5000, unitPrice: 11, total: 55000 }
    ],
    notes: 'Delivered in full to corporate HQ reception.'
  },
  {
    id: 'INV-2026-005',
    invoiceNumber: 'INV-9911',
    poId: 'PO-2026-005',
    poNumber: 'PO-4385',
    requestId: 'REQ-2026-012',
    requestTitle: 'Cloud Infrastructure Yearly Renewal',
    procurementType: 'SOFTWARE',
    vendor: 'Amazon Web Services India Pvt Ltd',
    vendorId: 'VND-2026-002',
    submittedBy: 'Alex Developer (Team Lead)',
    submittedByRole: 'Team Lead',
    submissionDate: '2026-09-05',
    documentType: 'Cloud Subscription Invoice',
    gstNumber: 'GSTIN27AABCA4567F1Z8',
    invoiceDate: '2026-09-05',
    dueDate: '2026-09-20',
    subtotal: 580000,
    taxAmount: 104400,
    totalAmount: 684400,
    status: 'Pending Review',
    items: [
      { product: 'AWS Reserved Instance Plan - EC2 & RDS Multi-AZ', quantity: 1, unitPrice: 580000, total: 580000 }
    ],
    notes: 'Submitted by Alex Developer (Team Lead). Annual billing invoice with upfront reserved capacity agreement.'
  },
  {
    id: 'INV-2026-006',
    invoiceNumber: 'INV-7412',
    poId: 'PO-2026-006',
    poNumber: 'PO-4386',
    requestId: 'REQ-2026-015',
    requestTitle: 'Marketing Analytics Dashboard',
    procurementType: 'SOFTWARE',
    vendor: 'FastSupply Industrial Co',
    vendorId: 'VND-2026-006',
    submittedBy: 'Sneha Patel (Team Lead)',
    submittedByRole: 'Team Lead',
    submissionDate: '2026-09-11',
    documentType: 'Subscription Proof',
    gstNumber: 'GSTIN27FASTS9988C1Z2',
    invoiceDate: '2026-09-11',
    dueDate: '2026-10-11',
    subtotal: 85000,
    taxAmount: 15300,
    totalAmount: 100300,
    status: 'Pending Review',
    items: [
      { product: 'Analytics SaaS License Q4', quantity: 1, unitPrice: 85000, total: 85000 }
    ],
    notes: 'Submitted by Sneha Patel (Team Lead). Enterprise tier analytics user seat allocation receipt.'
  },
  {
    id: 'INV-2026-007',
    invoiceNumber: 'INV-10022',
    poId: 'PO-2026-007',
    poNumber: 'PO-4387',
    requestId: 'REQ-2026-025',
    requestTitle: 'Office Furniture',
    procurementType: 'HARDWARE',
    vendor: 'Prime Steel & Construction Supplies',
    vendorId: 'VND-2026-003',
    submittedBy: 'Prime Steel & Construction Supplies (Vendor)',
    submittedByRole: 'Vendor',
    submissionDate: '2026-09-12',
    documentType: 'Tax Invoice',
    gstNumber: 'GSTIN07PRIME1234D1Z9',
    invoiceDate: '2026-09-12',
    dueDate: '2026-10-27',
    subtotal: 390000,
    taxAmount: 70200,
    totalAmount: 460200,
    status: 'Rejected',
    rejectionReason: 'Price Mismatch with PO',
    rejectedAt: '2026-09-13',
    rejectedBy: 'Sarah Manager',
    items: [
      { product: 'Ergonomic Task Chairs (Model Elite)', quantity: 50, unitPrice: 7800, total: 390000 }
    ],
    notes: 'Billing unit price did not match agreed contract rate. Rejected for supplier correction.'
  },
  {
    id: 'INV-2026-008',
    invoiceNumber: 'INV-7720',
    poId: 'PO-2026-008',
    poNumber: 'PO-4388',
    requestId: 'REQ-2026-019',
    requestTitle: 'Network Security Audit Tools',
    procurementType: 'SOFTWARE',
    vendor: 'CyberGuard Enterprise Software',
    vendorId: 'VND-2026-002',
    submittedBy: 'Priya Sharma (Security Lead)',
    submittedByRole: 'Team Lead',
    submissionDate: '2026-09-13',
    documentType: 'Software License Agreement',
    gstNumber: 'GSTIN27CYBER1122C1Z7',
    invoiceDate: '2026-09-13',
    dueDate: '2026-09-28',
    subtotal: 175000,
    taxAmount: 31500,
    totalAmount: 206500,
    status: 'Pending Review',
    items: [
      { product: 'Vulnerability Scanner Enterprise Node Licenses', quantity: 5, unitPrice: 35000, total: 175000 }
    ],
    notes: 'Submitted by Priya Sharma (Security Lead). Security tool enterprise agreement with vendor proforma invoice.'
  }
]

const MOCK_GOODS_RECEIPTS: GoodsReceiptItem[] = [
  {
    id: 'GRN-2026-001',
    grnNumber: 'GRN-2026-001',
    poNumber: 'PO-4381',
    requestId: 'REQ-2026-001',
    vendor: 'Dell Technologies India',
    receivedDate: '2026-09-18',
    product: 'Dell XPS 15 Laptops',
    orderedQuantity: 5,
    receivedQuantity: 5,
    damagedQuantity: 0,
    inspectionStatus: 'Passed',
    receivedBy: 'Suresh Warehouse Lead',
    status: 'Verified',
    warehouseLocation: 'Main Depot Bay 3'
  },
  {
    id: 'GRN-2026-001B',
    grnNumber: 'GRN-2215',
    poNumber: 'PO-4583',
    requestId: 'REQ-2026-001',
    vendor: 'Dell Technologies India',
    receivedDate: '2026-09-13',
    product: 'Dell UltraSharp 32" 4K UHD Thunderbolt Hub Monitor (U3223QE)',
    orderedQuantity: 10,
    receivedQuantity: 10,
    damagedQuantity: 0,
    inspectionStatus: 'Passed',
    receivedBy: 'Suresh Warehouse Lead',
    status: 'Verified',
    warehouseLocation: 'Bay 4 - Display Staging'
  },
  {
    id: 'GRN-2026-001C',
    grnNumber: 'GRN-2216',
    poNumber: 'PO-4584',
    requestId: 'REQ-2026-001',
    vendor: 'TechEdge Peripherals Ltd',
    receivedDate: '2026-09-14',
    product: 'Dell Premier Multi-Device Wireless Keyboard & ANC Headset Bundle',
    orderedQuantity: 10,
    receivedQuantity: 10,
    damagedQuantity: 0,
    inspectionStatus: 'Passed',
    receivedBy: 'Kunal Logistics Officer',
    status: 'Verified',
    warehouseLocation: 'Main Depot Bay 1'
  },
  {
    id: 'GRN-2026-002',
    grnNumber: 'GRN-2026-002',
    poNumber: 'PO-4382',
    requestId: 'REQ-2026-003',
    vendor: 'Amazon Web Services India Pvt Ltd',
    receivedDate: '2026-09-12',
    product: 'CRM Enterprise Cloud License',
    orderedQuantity: 50,
    receivedQuantity: 50,
    damagedQuantity: 0,
    inspectionStatus: 'Passed',
    receivedBy: 'Priya Sharma (IT Lead)',
    status: 'Verified',
    warehouseLocation: 'Digital Cloud Vault'
  },
  {
    id: 'GRN-2026-003',
    grnNumber: 'GRN-2026-003',
    poNumber: 'PO-4383',
    requestId: 'REQ-2026-007',
    vendor: 'Dell Technologies India',
    receivedDate: '2026-09-17',
    product: 'Industrial Rackmount UPS 10kVA',
    orderedQuantity: 2,
    receivedQuantity: 2,
    damagedQuantity: 0,
    inspectionStatus: 'Inspection Pending',
    receivedBy: 'Kunal Logistics Officer',
    status: 'Pending Verification',
    warehouseLocation: 'Substation Building B'
  },
  {
    id: 'GRN-2026-004',
    grnNumber: 'GRN-2026-004',
    poNumber: 'PO-4384',
    requestId: 'REQ-2026-009',
    vendor: 'FastSupply Industrial Co',
    receivedDate: '2026-09-14',
    product: 'Corporate Collateral Printing',
    orderedQuantity: 5000,
    receivedQuantity: 4950,
    damagedQuantity: 50,
    inspectionStatus: 'Discrepancy Found',
    receivedBy: 'Priyanka Sharma (Admin)',
    status: 'Pending Verification',
    warehouseLocation: 'HQ Mailroom'
  }
]

const MOCK_CONTRACTS: ContractItem[] = [
  {
    id: 'CTR-2026-001',
    vendor: 'Dell Technologies India',
    vendorId: 'VND-2026-001',
    contractType: 'Master Services Agreement',
    startDate: '2025-01-01',
    endDate: '2027-01-01',
    contractValue: 7500000,
    renewalDate: '2026-12-01',
    status: 'Active',
    documentsCount: 4,
    autoRenew: true,
    signedBy: 'Chief Executive Officer & Admin'
  },
  {
    id: 'CTR-2026-002',
    vendor: 'Amazon Web Services India Pvt Ltd',
    vendorId: 'VND-2026-002',
    contractType: 'SaaS License',
    startDate: '2025-10-01',
    endDate: '2026-10-01',
    contractValue: 4500000,
    renewalDate: '2026-09-20',
    status: 'Expiring Soon',
    documentsCount: 6,
    autoRenew: true,
    signedBy: 'CTO & System Administrator'
  },
  {
    id: 'CTR-2026-003',
    vendor: 'Prime Steel & Construction Supplies',
    vendorId: 'VND-2026-003',
    contractType: 'Fixed Price Supply',
    startDate: '2026-03-01',
    endDate: '2027-03-01',
    contractValue: 3000000,
    renewalDate: '2027-02-01',
    status: 'Active',
    documentsCount: 3,
    autoRenew: false,
    signedBy: 'Admin Director'
  },
  {
    id: 'CTR-2026-004',
    vendor: 'QuickServe Logistics Partners',
    vendorId: 'VND-2026-005',
    contractType: 'Annual Maintenance',
    startDate: '2024-06-01',
    endDate: '2025-06-01',
    contractValue: 1200000,
    renewalDate: '2025-05-15',
    status: 'Expired',
    documentsCount: 2,
    autoRenew: false,
    signedBy: 'Admin Operations'
  }
]

const MOCK_QUOTATIONS: QuotationItem[] = [
  {
    id: 'QT-2026-001',
    rfqId: 'RFQ-2026-028',
    rfqTitle: 'Office Laptop Procurement',
    product: 'Dell Latitude 14-inch Laptop',
    specification: 'Intel Core i7 13th Gen, 16GB RAM, 512GB NVMe SSD, 14" FHD IPS',
    vendor: 'Dell Technologies India',
    quoteDate: '2026-09-10',
    validUntil: '2026-10-10',
    unitPrice: 56000,
    quantity: 20,
    taxAmount: 201600,
    shippingCost: 0,
    discountAmount: 20000,
    totalAmount: 1120000,
    deliveryDays: 14,
    warranty: '3 Years Comprehensive Onsite',
    paymentTerms: 'Net 30',
    deliveryTerms: 'DDP - Delivered Duty Paid to Site',
    commercialCompliance: 'Completed',
    technicalCompliance: '100% Meets Specs',
    complianceRating: '100% Meets Specs',
    vendorRating: 4.8,
    performanceScore: 96,
    status: 'Under Evaluation',
    notes: 'Includes accidental damage protection and enterprise asset tagging.'
  },
  {
    id: 'QT-2026-002',
    rfqId: 'RFQ-2026-028',
    rfqTitle: 'Office Laptop Procurement',
    product: 'Dell Latitude 14-inch Laptop',
    specification: 'HP EliteBook 840 G10, Core i7, 16GB, 512GB SSD',
    vendor: 'HP Enterprise India',
    quoteDate: '2026-09-10',
    validUntil: '2026-10-05',
    unitPrice: 54000,
    quantity: 20,
    taxAmount: 194400,
    shippingCost: 5000,
    discountAmount: 15000,
    totalAmount: 1080000,
    deliveryDays: 21,
    warranty: '2 Years Standard Onsite',
    paymentTerms: 'Net 45',
    deliveryTerms: 'FOB Destination - Warehouse Central',
    commercialCompliance: 'Completed',
    technicalCompliance: '95% Meets Specs',
    complianceRating: '95% Meets Specs',
    vendorRating: 4.5,
    performanceScore: 90,
    status: 'Under Evaluation',
    notes: 'Competitive commercial pricing, longer fulfillment lead time.'
  },
  {
    id: 'QT-2026-003',
    rfqId: 'RFQ-2026-028',
    rfqTitle: 'Office Laptop Procurement',
    product: 'Dell Latitude 14-inch Laptop',
    specification: 'Lenovo ThinkPad T14 Gen 4, Core i7, 16GB, 512GB SSD',
    vendor: 'Lenovo India Solutions',
    quoteDate: '2026-09-10',
    validUntil: '2026-09-30',
    unitPrice: 60500,
    quantity: 20,
    taxAmount: 217800,
    shippingCost: 0,
    discountAmount: 18000,
    totalAmount: 1210000,
    deliveryDays: 7,
    warranty: '3 Years Premier Support + Accidental Damage',
    paymentTerms: 'Net 15',
    deliveryTerms: 'Doorstep Courier Express',
    commercialCompliance: 'Completed',
    technicalCompliance: '100% Meets Specs',
    complianceRating: '100% Meets Specs',
    vendorRating: 4.7,
    performanceScore: 94,
    status: 'Under Evaluation',
    notes: 'Fastest delivery (7 days), premium build quality.'
  },
  {
    id: 'QT-2026-007',
    rfqId: 'RFQ-2026-028',
    rfqTitle: 'Office Laptop Procurement',
    product: 'Dell Latitude 14-inch Laptop',
    specification: 'Acer TravelMate P6 Commercial, Core i7, 16GB, 512GB SSD',
    vendor: 'NextGen Systems Pvt Ltd',
    quoteDate: '2026-09-10',
    validUntil: '2026-10-15',
    unitPrice: 52500,
    quantity: 20,
    taxAmount: 189000,
    shippingCost: 2000,
    discountAmount: 10000,
    totalAmount: 1050000,
    deliveryDays: 18,
    warranty: '3 Years Extended Onsite Warranty',
    paymentTerms: 'Net 30',
    deliveryTerms: 'Delivered to Central IT Depot',
    commercialCompliance: 'Completed',
    technicalCompliance: '90% Meets Specs',
    complianceRating: '90% Meets Specs',
    vendorRating: 4.2,
    performanceScore: 86,
    status: 'Under Evaluation',
    notes: 'Lowest unit price bid among all participating suppliers.'
  },
  {
    id: 'QT-2026-008',
    rfqId: 'RFQ-2026-028',
    rfqTitle: 'Office Laptop Procurement',
    product: 'Professional 24-inch IPS Monitor',
    specification: '24" 1080p IPS, 75Hz, Height Adjustable Stand, USB-C Hub 65W',
    vendor: 'Samsung Commercial Electronics',
    quoteDate: '2026-09-11',
    validUntil: '2026-10-20',
    unitPrice: 12500,
    quantity: 20,
    taxAmount: 45000,
    shippingCost: 0,
    discountAmount: 5000,
    totalAmount: 250000,
    deliveryDays: 10,
    warranty: '3 Years Replacement Warranty',
    paymentTerms: 'Net 30',
    deliveryTerms: 'Direct to Facility Floor',
    commercialCompliance: 'Completed',
    technicalCompliance: '100% Meets Specs',
    complianceRating: '100% Meets Specs',
    vendorRating: 4.6,
    performanceScore: 93,
    status: 'Under Evaluation',
    notes: 'Certified zero bright dot panel policy.'
  },
  {
    id: 'QT-2026-009',
    rfqId: 'RFQ-2026-028',
    rfqTitle: 'Office Laptop Procurement',
    product: 'Professional 24-inch IPS Monitor',
    specification: 'LG UltraFine 24" IPS, Height Swivel Pivot, DisplayPort + HDMI',
    vendor: 'LG Commercial Displays India',
    quoteDate: '2026-09-11',
    validUntil: '2026-10-15',
    unitPrice: 11800,
    quantity: 20,
    taxAmount: 42480,
    shippingCost: 2000,
    discountAmount: 4000,
    totalAmount: 236000,
    deliveryDays: 12,
    warranty: '3 Years Standard Commercial',
    paymentTerms: 'Net 30',
    deliveryTerms: 'Delivered to IT Warehouse',
    commercialCompliance: 'Completed',
    technicalCompliance: '98% Meets Specs',
    complianceRating: '98% Meets Specs',
    vendorRating: 4.5,
    performanceScore: 91,
    status: 'Under Evaluation',
    notes: 'Bulk discount applied for 20+ units.'
  },
  {
    id: 'QT-2026-010',
    rfqId: 'RFQ-2026-028',
    rfqTitle: 'Office Laptop Procurement',
    product: 'Professional 24-inch IPS Monitor',
    specification: 'BenQ DesignVue 24" IPS Color Accurate Display, sRGB 100%',
    vendor: 'BenQ Corporate India',
    quoteDate: '2026-09-11',
    validUntil: '2026-10-10',
    unitPrice: 13200,
    quantity: 20,
    taxAmount: 47520,
    shippingCost: 0,
    discountAmount: 6000,
    totalAmount: 264000,
    deliveryDays: 8,
    warranty: '3 Years Premier Swap',
    paymentTerms: 'Net 15',
    deliveryTerms: 'DDP - Building A Dock',
    commercialCompliance: 'Completed',
    technicalCompliance: '100% Meets Specs',
    complianceRating: '100% Meets Specs',
    vendorRating: 4.7,
    performanceScore: 95,
    status: 'Under Evaluation',
    notes: 'Factory calibrated with delta E < 2 verification sheet.'
  },
  {
    id: 'QT-2026-011',
    rfqId: 'RFQ-2026-013',
    rfqTitle: 'Enterprise Cloud Infrastructure Renewal',
    product: 'Dedicated Cloud Compute & Storage Reservation',
    specification: 'Multi-AZ Kubernetes Clusters, 128 vCPU, 512GB RAM, 10TB NVMe Object Storage',
    vendor: 'Amazon Web Services India Pvt Ltd',
    quoteDate: '2026-09-08',
    validUntil: '2026-10-08',
    unitPrice: 580000,
    quantity: 1,
    taxAmount: 104400,
    shippingCost: 0,
    discountAmount: 45000,
    totalAmount: 580000,
    deliveryDays: 1,
    warranty: '99.99% Monthly SLA Uptime Guarantee',
    paymentTerms: 'Annual Advance Wire',
    deliveryTerms: 'Instant Cloud Tenant Provisioning',
    commercialCompliance: 'Completed',
    technicalCompliance: '100% Compliant',
    complianceRating: 'Enterprise Tier 1',
    vendorRating: 4.9,
    performanceScore: 98,
    status: 'Under Evaluation',
    notes: 'Includes 24/7 Enterprise Support concierge and TAM.'
  },
  {
    id: 'QT-2026-012',
    rfqId: 'RFQ-2026-013',
    rfqTitle: 'Enterprise Cloud Infrastructure Renewal',
    product: 'Dedicated Cloud Compute & Storage Reservation',
    specification: 'Google Cloud Platform Anthos Hybrid Clusters, Cloud Spanner HA',
    vendor: 'Google Cloud India Pvt Ltd',
    quoteDate: '2026-09-08',
    validUntil: '2026-10-05',
    unitPrice: 550000,
    quantity: 1,
    taxAmount: 99000,
    shippingCost: 0,
    discountAmount: 50000,
    totalAmount: 550000,
    deliveryDays: 1,
    warranty: '99.95% High Availability SLA',
    paymentTerms: 'Annual Advance Wire',
    deliveryTerms: 'Instant Cloud Tenant Provisioning',
    commercialCompliance: 'Completed',
    technicalCompliance: '97% Compliant',
    complianceRating: 'Enterprise Tier 1',
    vendorRating: 4.8,
    performanceScore: 95,
    status: 'Under Evaluation',
    notes: 'Competitive pricing with GCP committed use discount.'
  },
  {
    id: 'QT-2026-004',
    rfqId: 'RFQ-2026-027',
    rfqTitle: 'Raw Material Supply',
    product: 'Structural Steel Rods 12mm',
    specification: 'Fe 550D TMT Reinforcement Steel Rods, 12mm Diameter',
    vendor: 'Prime Steel & Construction Supplies',
    quoteDate: '2026-09-06',
    validUntil: '2026-09-25',
    unitPrice: 2360,
    quantity: 500,
    taxAmount: 212400,
    shippingCost: 12000,
    discountAmount: 10000,
    totalAmount: 1180000,
    deliveryDays: 7,
    warranty: 'Mill Test Certificate Grade A',
    paymentTerms: 'Net 30',
    deliveryTerms: 'Site Yard Delivery with Crane Unloading',
    commercialCompliance: 'Completed',
    technicalCompliance: 'ISO 9001 Certified',
    complianceRating: 'ISO 9001 Certified',
    vendorRating: 4.6,
    performanceScore: 92,
    status: 'Shortlisted',
    notes: 'Primary shortlisted vendor for steel rods.'
  },
  {
    id: 'QT-2026-005',
    rfqId: 'RFQ-2026-027',
    rfqTitle: 'Raw Material Supply',
    product: 'Structural Steel Rods 12mm',
    specification: 'Fe 500 TMT Steel Bars, Batch Test Certified',
    vendor: 'FastSupply Industrial Co',
    quoteDate: '2026-09-06',
    validUntil: '2026-09-22',
    unitPrice: 2500,
    quantity: 500,
    taxAmount: 225000,
    shippingCost: 0,
    discountAmount: 0,
    totalAmount: 1250000,
    deliveryDays: 5,
    warranty: 'Standard Manufacturer Warranty',
    paymentTerms: 'Net 30',
    deliveryTerms: 'Ex-Works Hub Delivery',
    commercialCompliance: 'Completed',
    technicalCompliance: 'Compliant',
    complianceRating: 'Compliant',
    vendorRating: 4.3,
    performanceScore: 88,
    status: 'Under Evaluation'
  },
  {
    id: 'QT-2026-006',
    rfqId: 'RFQ-2026-025',
    rfqTitle: 'Office Furniture',
    product: 'Ergonomic Executive Office Chair',
    specification: 'High-back mesh, 4D armrests, dynamic lumbar support, BIFMA certified',
    vendor: 'Prime Steel & Construction Supplies',
    quoteDate: '2026-09-02',
    validUntil: '2026-09-30',
    unitPrice: 7800,
    quantity: 50,
    taxAmount: 70200,
    shippingCost: 0,
    discountAmount: 10000,
    totalAmount: 390000,
    deliveryDays: 14,
    warranty: '5 Years BIFMA Certified Onsite',
    paymentTerms: 'Net 30',
    deliveryTerms: 'Assembly & Floor Installation Included',
    commercialCompliance: 'Completed',
    technicalCompliance: '100% Compliant',
    complianceRating: '100% Compliant',
    vendorRating: 4.8,
    performanceScore: 95,
    status: 'Selected',
    selectedBy: 'Sarah Manager',
    selectedAt: '2026-09-05T14:30:00.000Z',
    selectionNotes: 'Awarded PO-4387. Best ergonomics and 5-year commercial warranty.'
  }
]

// ─── Context & Provider ───────────────────────────────────────────────────────

const ManagerDataContext = createContext<ManagerDataContextType | undefined>(undefined)

export const ManagerDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [arrivedRequests, setArrivedRequests] = useState<ProcurementRequest[]>(MOCK_ARRIVED)
  const [pendingApprovals, setPendingApprovals] = useState<ProcurementRequest[]>(MOCK_PENDING_APPROVALS)
  const [myApprovals, setMyApprovals] = useState<ProcurementRequest[]>(MOCK_MY_APPROVALS)
  const [rejectedRequests, setRejectedRequests] = useState<ProcurementRequest[]>(MOCK_REJECTED)
  const [financeReview, setFinanceReview] = useState<ProcurementRequest[]>(MOCK_FINANCE_REVIEW)
  const [recommendedToFinance, setRecommendedToFinance] = useState<ProcurementRequest[]>(MOCK_RECOMMENDED)
  const [recommendedToAdmin, setRecommendedToAdmin] = useState<ProcurementRequest[]>(MOCK_RECOMMENDED_TO_ADMIN)
  const [rfqs, setRfqs] = useState<RFQ[]>(MOCK_RFQS)
  const [budgets] = useState<BudgetDepartment[]>(MOCK_BUDGETS)
  const [tickets, setTickets] = useState<RaiseTicket[]>(MOCK_TICKETS)
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

  // Dynamic fetch from Django REST API backend
  const refreshManagerBackendData = async () => {
    try {
      const res = await getDashboardStats()
      const list = Array.isArray(res) ? res : res?.results || []
      if (list.length > 0) {
        const mapped: ProcurementRequest[] = list.map((item: any) => ({
          id: item.request_id || item.id,
          title: item.title,
          requester: item.created_by_detail?.first_name ? `${item.created_by_detail.first_name} ${item.created_by_detail.last_name}` : 'Team Lead',
          department: item.department_detail?.name || 'IT',
          category: item.category,
          amount: Number(item.total_estimated_cost) || 0,
          date: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          status: item.status === 'Pending' ? 'pending_approval' : item.status === 'Approved' ? 'approved' : item.status === 'Rejected' ? 'rejected' : 'finance_review',
          priority: item.priority || 'Medium',
          vendor: item.preferred_vendor || 'Preferred Vendor',
          description: item.description,
          justification: item.justification,
        }))
        const pending = mapped.filter(r => r.status === 'pending_approval')
        if (pending.length > 0) {
          setPendingApprovals(pending)
        }
      }
    } catch (e) {
      console.warn('Backend manager fetch fallback:', e)
    }
  }

  useEffect(() => {
    refreshManagerBackendData()
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
    return list.filter((item, idx, self) => idx === self.findIndex(t => t.id === item.id))
  }, [arrivedRequests, pendingApprovals, myApprovals, rejectedRequests, financeReview, recommendedToFinance, recommendedToAdmin])

  // Computed: Pending Financial Approvals (all requests awaiting finance action)
  const pendingFinancialApprovals = useMemo(() => {
    return financeReview.filter(r =>
      r.status === 'sent_to_finance' ||
      r.status === 'finance_review' ||
      r.status === 'recommended_to_finance' ||
      r.status === 'finance_on_hold' ||
      r.status === 'clarification_requested'
    )
  }, [financeReview])

  // Computed: Approved Finance Requests
  const approvedFinanceRequests = useMemo(() => {
    return myApprovals.filter(r => r.financeStatus === 'Approved' || r.status === 'finance_approved')
  }, [myApprovals])

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

  // Manager Dashboard stats
  const dashboardStats = useMemo<DashboardStats>(() => ({
    pendingApprovals: pendingApprovals.length,
    myApprovals: myApprovals.length,
    rejectedRequests: rejectedRequests.length,
    financeReview: financeReview.length,
    totalRequestValue: allRequests.reduce((sum, r) => sum + r.amount, 0),
    requestArrival: arrivedRequests.length,
  }), [pendingApprovals, myApprovals, rejectedRequests, financeReview, allRequests, arrivedRequests])

  // Finance KPIs — computed strictly from real database arrays
  const financeKPIs = useMemo<FinanceKPIs>(() => {
    const totalBudget = budgets.reduce((acc, b) => acc + b.totalBudget, 0)
    const allocatedBudget = budgets.reduce((acc, b) => acc + b.allocated, 0)
    const committedBudget = budgets.reduce((acc, b) => acc + b.committed, 0)
    const spentBudget = budgets.reduce((acc, b) => acc + b.spent, 0)
    const availableBudget = totalBudget - spentBudget - committedBudget

    // Pending Invoices: Tickets where invoice is verified or PO submitted, but not paid
    const pendingInvoices = tickets.filter(t => !t.invoice.verified || !t.submitted)
    const pendingInvoicesCount = pendingInvoices.length
    const pendingInvoicesAmount = pendingInvoices.reduce((acc, t) => acc + t.requestAmount, 0)

    // Invoice Exceptions: Tickets with missing/unverified documents or failed payments
    const invoiceExceptions = payments.filter(p => p.status === 'Failed' || p.status === 'On Hold')
    const invoiceExceptionsCount = invoiceExceptions.length
    const invoiceExceptionsAmount = invoiceExceptions.reduce((acc, p) => acc + p.amount, 0)

    // Pending Payments
    const pendingPaymentsList = payments.filter(p => p.status === 'Pending' || p.status === 'Processing')
    const pendingPaymentsCount = pendingPaymentsList.length
    const pendingPaymentsAmount = pendingPaymentsList.reduce((acc, p) => acc + p.amount, 0)

    // Paid Payments
    const paidList = payments.filter(p => p.status === 'Paid')
    const paidAmount = paidList.reduce((acc, p) => acc + p.amount, 0)
    const paidPaymentsCount = paidList.length

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
  }, [budgets, tickets, payments])

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
      .then(() => refreshManagerBackendData())
      .catch((e) => console.warn('Backend recommend warning:', e))
    const req = arrivedRequests.find(r => r.id === id) || pendingApprovals.find(r => r.id === id)
    if (!req) return
    setArrivedRequests(prev => prev.filter(r => r.id !== id))
    setPendingApprovals(prev => prev.filter(r => r.id !== id))
    const updated: ProcurementRequest = {
      ...req,
      status: 'recommended_to_finance',
      recommendationReason: reason,
      recommendedBy: 'Sarah Manager',
      recommendedDate: new Date().toISOString().split('T')[0],
      financeStatus: 'Awaiting Finance Action',
    }
    setRecommendedToFinance(prev => [...prev, updated])
    setFinanceReview(prev => [...prev, { ...updated, status: 'finance_review' }])
  }, [arrivedRequests, pendingApprovals])

  const approveRequest = useCallback((id: string, notes?: string, approvalParams?: ApprovalParameters) => {
    approveRequestApi(id, notes)
      .then(() => refreshManagerBackendData())
      .catch((e) => console.warn('Backend approve warning:', e))
    const req = pendingApprovals.find(r => r.id === id) || arrivedRequests.find(r => r.id === id)
    if (!req) return
    const today = new Date().toISOString().split('T')[0]

    // 1. Remove from Manager's pending queue
    setPendingApprovals(prev => prev.filter(r => r.id !== id))
    setArrivedRequests(prev => prev.filter(r => r.id !== id))

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

    const approvedReq: ProcurementRequest = {
      ...req,
      status: 'finance_review',
      financeStatus: 'Pending Finance Approval',
      approvedBy: finalParams.approvedBy,
      approvedDate: today,
      description: notes || req.description,
      amount: finalParams.approvedAmount,
      vendor: finalParams.vendor || req.vendor,
      costCenter: finalParams.costCenter || req.costCenter,
      approvalParams: finalParams
    }

    // 2. Track in Manager approved list
    setMyApprovals(prev => [approvedReq, ...prev.filter(r => r.id !== id)])

    // 3. Move directly to Finance pending review queue
    setFinanceReview(prev => [approvedReq, ...prev.filter(r => r.id !== id)])
  }, [pendingApprovals, arrivedRequests])

  const addRFQ = useCallback((rfqData: RFQ) => {
    setRfqs(prev => [rfqData, ...prev])
  }, [])

  const selectVendorQuotation = useCallback((quoteId: string, rfqId: string, product: string, notes?: string) => {
    const now = new Date().toISOString()
    setQuotations(prev => prev.map(q => {
      const isTargetQuote = q.id === quoteId
      const isSameProduct = q.rfqId === rfqId && (q.product === product || !q.product)

      if (isTargetQuote) {
        return {
          ...q,
          status: 'Selected',
          selectedBy: 'Sarah Manager',
          selectedAt: now,
          selectionNotes: notes || 'Selected as best value / technical compliance'
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
    const chosenQuote = quotations.find(q => q.id === quoteId)
    if (chosenQuote) {
      const today = new Date().toISOString().split('T')[0]
      const vendorName = chosenQuote.vendor
      const vendorId = 'VND-HW-001'

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
  }, [quotations])

  const sendToFinance = useCallback((id: string, _message?: string) => {
    setFinanceReview(prev => prev.map(r =>
      r.id === id ? { ...r, status: 'sent_to_finance', financeStatus: 'Sent to Finance' } : r
    ))
  }, [])

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

  const approveFinanceRequest = useCallback((id: string, comment?: string, actor = 'Mark Finance Officer') => {
    const req = financeReview.find(r => r.id === id) || allRequests.find(r => r.id === id)
    if (!req) return
    const now = new Date().toISOString()
    const today = now.split('T')[0]

    // 1. Remove from finance review
    setFinanceReview(prev => prev.filter(r => r.id !== id))
    setRecommendedToFinance(prev => prev.filter(r => r.id !== id))

    // 2. Move to Admin pending queue
    const forwardedReq: ProcurementRequest = {
      ...req,
      status: 'recommended_to_admin',
      financeStatus: 'Recommended to Admin',
      approvalLevel: 'Admin / Executive Authority',
      financeApprovedBy: actor,
      financeApprovedDate: today,
      financeComment: comment || 'Budget verified and approved by Finance. Forwarded for Admin Approval.',
    }
    setRecommendedToAdmin(prev => [forwardedReq, ...prev.filter(r => r.id !== id)])
    setMyApprovals(prev => [forwardedReq, ...prev.filter(r => r.id !== id)])

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
        amount: req.amount,
        paymentStatus: 'Pending',
      },
      ...prev,
    ])
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

  const recommendToHigherAuthority = useCallback((
    id: string,
    reason: string,
    comment?: string,
    actor = 'Mark Finance Officer'
  ) => {
    const today = new Date().toISOString().split('T')[0]
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const base = financeReview.find(r => r.id === id) || allRequests.find(r => r.id === id)
    if (!base) return

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
  }, [financeReview, allRequests])

  const adminApproveRequest = useCallback((
    id: string,
    comment?: string,
    actor = 'Priyanka Sharma (Admin)'
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

    const nextStatus: RequestStatus = isSoftware ? 'payment_pending' : 'approved'
    const nextFinanceStatus = isSoftware ? 'Admin Approved - Queued for Payment' : 'Admin Approved'

    const approvedReq: ProcurementRequest = {
      ...req,
      status: nextStatus,
      financeStatus: nextFinanceStatus,
      approvalLevel: 'Admin Approved',
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
          amount: req.amount,
          taxAmount: Math.round(req.amount * 0.18),
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
        amount: req.amount,
        paymentStatus: 'Pending',
      },
      ...prev,
    ])
  }, [recommendedToAdmin, financeReview, allRequests])

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
  }, [financeReview, allRequests, recommendedToAdmin])

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
  }, [allRequests])

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
  }, [])

  const renewContract = useCallback((contractId: string, newEndDate: string) => {
    setContracts(prev => prev.map(c => c.id === contractId ? { ...c, endDate: newEndDate, status: 'Active' } : c))
  }, [])

  // ─── Payment Actions ────────────────────────────────────────────────────────

  const disbursePayment = useCallback((paymentId: string, actor = 'Mark Finance Officer') => {
    const today = new Date().toISOString().split('T')[0]
    let paidRequestId = ''

    setPayments(prev => prev.map(p => {
      if (p.id !== paymentId) return p
      paidRequestId = p.requestId
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

    setPayments(prev => prev.map(p => {
      if (p.id !== paymentId) return p
      if (status === 'Paid') paidRequestId = p.requestId
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

  const assignVendorToRequest = useCallback((requestId: string, vendorName: string, vendorId?: string) => {
    const today = new Date().toISOString().split('T')[0]
    const effectiveVendorId = vendorId || 'VND-HW-001'

    const updateReq = (r: ProcurementRequest): ProcurementRequest => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'assigned_to_vendor',
          vendor: vendorName,
          vendorId: effectiveVendorId,
          assignedVendorDate: today,
          financeStatus: `Assigned to ${vendorName}`,
        }
      }
      return r
    }

    setMyApprovals(prev => prev.map(updateReq))
    setRecommendedToAdmin(prev => prev.map(updateReq))
    setFinanceReview(prev => prev.map(updateReq))
    setPendingApprovals(prev => prev.map(updateReq))
    setArrivedRequests(prev => prev.map(updateReq))

    // Ensure corresponding Purchase Order exists with status 'Sent to Vendor'
    setPurchaseOrders(prev => {
      const existing = prev.find(po => po.requestId === requestId)
      if (existing) {
        return prev.map(po => po.requestId === requestId ? {
          ...po,
          vendor: vendorName,
          vendorId: effectiveVendorId,
          status: 'Sent to Vendor',
        } : po)
      }
      const matchedReq = allRequests.find(r => r.id === requestId)
      const poAmount = matchedReq?.amount || 100000
      const newPO: PurchaseOrderItem = {
        id: `PO-${requestId}`,
        poNumber: `PO-${requestId.replace('REQ-', '')}`,
        requestId: requestId,
        requestTitle: matchedReq?.title || `Fulfillment: ${requestId}`,
        procurementType: 'HARDWARE',
        category: matchedReq?.category || 'IT Hardware',
        vendor: vendorName,
        vendorId: effectiveVendorId,
        submittedBy: `${vendorName} (Vendor Partner)`,
        submittedByRole: 'Vendor',
        submissionDate: today,
        poDate: today,
        items: [{ product: matchedReq?.title || `Items for ${requestId}`, quantity: 1, unitPrice: poAmount, total: poAmount }],
        quantity: 1,
        totalAmount: poAmount,
        deliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'Sent to Vendor',
        paymentStatus: 'Pending',
        terms: 'Net 30'
      }
      return [newPO, ...prev]
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
    paymentDetails?: { amount?: number; paymentMethod?: string; transactionRef?: string; productId?: string }
  ) => {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const utrRef = paymentDetails?.transactionRef || `UTR${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`
    const targetProductId = paymentDetails?.productId

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
              transactionRef: utrRef,
              notes: `Payment disbursed successfully. UTR: ${utrRef}`,
              history: [
                ...(p.history || []),
                { timestamp: `${today} ${time}`, actor: 'Finance Treasury Officer', action: 'Payment Released & Settled', note: `UTR: ${utrRef}` }
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
        paymentMethod: paymentDetails?.paymentMethod || 'NEFT / RTGS Corporate Treasury',
        status: 'Paid',
        notes: `Payment disbursed. UTR: ${utrRef}`,
        history: [{ timestamp: `${today} ${time}`, actor: 'Finance Treasury Officer', action: 'Payment Released & Settled', note: `UTR: ${utrRef}` }]
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

    return {
      utrRef,
      amount: effectiveAmount,
      date: `${today}, ${time}`,
      vendor: effectiveVendor,
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
      pendingFinancialApprovals,
      approvedFinanceRequests,
      rejectedFinanceRequests,
      rfqs,
      budgets,
      paymentData: MOCK_PAYMENT_DATA,
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

export const useManagerData = () => {
  const ctx = useContext(ManagerDataContext)
  if (!ctx) throw new Error('useManagerData must be used within ManagerDataProvider')
  return ctx
}

// Convenient aliases for Finance and Admin portal components
export const useFinanceData = useManagerData
export const useAdminData = useManagerData
