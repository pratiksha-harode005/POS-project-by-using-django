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
  quantity?: number
  currentStage?: number
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

// ─── Mock Data (Empty defaults for dynamic PostgreSQL database backend) ───────

const MOCK_ARRIVED: ProcurementRequest[] = []
const MOCK_PENDING_APPROVALS: ProcurementRequest[] = []
const MOCK_MY_APPROVALS: ProcurementRequest[] = []
const MOCK_REJECTED: ProcurementRequest[] = []
const MOCK_FINANCE_REVIEW: ProcurementRequest[] = []
const MOCK_RECOMMENDED: ProcurementRequest[] = []
const MOCK_RECOMMENDED_TO_ADMIN: ProcurementRequest[] = []
const MOCK_BUDGETS: BudgetDepartment[] = []
const MOCK_RFQS: RFQ[] = []
const MOCK_PAYMENT_DATA = {
  weekly: [],
  monthly: [],
  yearly: [],
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
      const mapped: ProcurementRequest[] = list.map((item: any) => ({
        id: item.request_id || item.id,
        title: item.title,
        requester: item.created_by_detail?.first_name ? `${item.created_by_detail.first_name} ${item.created_by_detail.last_name}` : 'Team Lead',
        department: item.department_detail?.name || 'IT',
        category: item.category,
        amount: Number(item.total_estimated_cost) || 0,
        quantity: item.quantity || 1,
        currentStage: item.current_stage || 1,
        costCenter: item.cost_center || item.budget_code,
        date: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        status: item.status === 'Pending' ? 'pending_approval' : item.status === 'Approved' ? 'approved' : item.status === 'Rejected' ? 'rejected' : 'finance_review',
        priority: item.priority || 'Medium',
        vendor: item.preferred_vendor || 'Preferred Vendor',
        description: item.description,
        justification: item.justification,
      }))
      setPendingApprovals(mapped.filter(r => r.status === 'pending_approval'))
      setMyApprovals(mapped.filter(r => r.status === 'approved'))
      setRejectedRequests(mapped.filter(r => r.status === 'rejected'))
      setFinanceReview(mapped.filter(r => r.status === 'finance_review'))
    } catch (e) {
      console.warn('Backend manager fetch fallback:', e)
    }
  }

  useEffect(() => {
    refreshManagerBackendData()
    const handleUpdate = () => refreshManagerBackendData()
    window.addEventListener('kss_backend_updated', handleUpdate)
    const interval = setInterval(refreshManagerBackendData, 5000)
    return () => {
      window.removeEventListener('kss_backend_updated', handleUpdate)
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
