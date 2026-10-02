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
import { detectWorkflowType, sortRequestsNewestFirst, getRecommendationStatus } from '../utils/workflowUtils'
import { triggerGlobalDataSync, subscribeGlobalDataSync } from '../utils/syncUtils'
import {
  getDashboardStats,
  getPendingRequests,
  approveRequestApi,
  rejectRequestApi,
  recommendToFinanceApi,
  sendBackRequestApi,
  forwardToFinanceApi,
  sendToFinanceApi,
  getBudgets,
  getRFQs,
  createRFQApi,
  apiClient
} from '../api/managerApi'
import {
  approveFinanceRequestApi,
  rejectFinanceRequestApi,
  sendBackFinanceRequestApi,
  processPaymentApi,
  recommendToAdminApi
} from '../api/financeApi'
import {
  approveAdminRequestApi,
  rejectAdminRequestApi,
  sendBackAdminRequestApi
} from '../api/adminApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RequestStatus =
  | 'pending_arrival'
  | 'pending_approval'
  | 'manager_researching'
  | 'pre_estimation_completed'
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
  | 'admin_research'
  | 'admin_approved'
  | 'cost_estimation'
  | 'finance_report'
  | 'assigned_to_vendor'
  | 'vendor_accepted'
  | 'vendor_rejected'
  | 'delivered'
  | 'invoiced'
  | 'payment_pending'
  | 'payment_approved'
  | 'payment_justification_submitted'
  | 'payment_justified'
  | 'payment_completed'
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
  quantity?: number
  requiredBy?: string
  deliveryLocation?: string
  currentStage?: number
  date: string
  createdAt?: string
  dbId?: number
  status: RequestStatus
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  vendor?: string
  costCenter?: string
  description?: string
  justification?: string
  flowType?: string
  extraFields?: Record<string, any>
  extra_fields?: Record<string, any>
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
  raw_status?: string
  request_type?: string
  software_name?: string
  current_plan?: string
  required_plan?: string
  existing_cost?: number
  business_requirement?: string
  research_estimation?: any
  finance_approved_amount?: number
  payment_method?: string
  payment_reference?: string
  payment_date?: string
  payment_notes?: string
  confirmed_by_team_lead?: boolean
  confirmed_at?: string
  timeline?: any[]
  final_approval_by?: string
  approval_path?: string
  currentlyWith?: string
  currently_with?: string
  request_id?: string
  requested_amount?: number
  approved_amount?: number
  total_estimated_cost?: number
  payment_justification_detail?: any
  rawRequest?: any
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
  name?: string
  vendor?: string
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
  purchaseRequestDetail?: any
  payment_method?: string
  reference_number?: string
  receiptDetails?: any
  history?: { timestamp: string; actor: string; action: string; note?: string }[]
  [key: string]: any
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
  action: 'APPROVED' | 'REJECTED' | 'PUT_ON_HOLD' | 'CLARIFICATION_REQUESTED' | 'RECOMMENDED_TO_ADMIN' | 'SENT_BACK'
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
  receiptType?: 'HARDWARE' | 'SOFTWARE'
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
  // Software Specific Fields
  category?: string
  amount?: number
  softwareName?: string
  requestType?: string
  currentPlan?: string
  requiredPlan?: string
  paymentReference?: string
  paymentMethod?: string
  requester?: string
  department?: string
  paymentJustification?: string
  receiptProof?: string
  licenseKey?: string
  rawRequest?: any
  payment_justification_detail?: any
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
  refreshData: () => Promise<void>

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
  approveFinanceRequest: (id: string, comment?: string, actor?: string, approvalParams?: ApprovalParameters) => void
  processRequestPayment: (id: string, payload: { final_payable_amount: number; payment_method?: string; payment_reference: string; payment_date?: string; payment_remarks?: string }) => Promise<void>
  rejectFinanceRequest: (id: string, reason: string, comment?: string, actor?: string) => void
  sendBackFinanceRequest: (id: string, comments: string, actor?: string) => void
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

// ─── Default Enterprise Receipts (Hardware & Software) ────────────────────────
export const DEFAULT_GOODS_RECEIPTS: GoodsReceiptItem[] = [
  // ── Hardware Receipts (Goods Receipts - GRN) ──
  {
    id: 'REC-1EB6BDF1',
    receiptType: 'HARDWARE',
    grnNumber: 'REC-1EB6BDF1',
    poNumber: 'PO-450ED679',
    requestId: 'REQ-84824A03',
    vendor: 'Dell Technologies Inc.',
    receivedDate: '2026-09-24',
    product: 'Dell Latitude 5540 Enterprise Laptops (32GB, i7)',
    orderedQuantity: 5,
    receivedQuantity: 5,
    damagedQuantity: 0,
    inspectionStatus: 'Passed',
    receivedBy: 'Stores Inward Officer',
    status: 'Verified',
    warehouseLocation: 'Bay 4 - Pune Receiving Dock',
    category: 'IT Hardware',
    amount: 350000,
  },
  {
    id: 'REC-6F0AF4AF',
    receiptType: 'HARDWARE',
    grnNumber: 'REC-6F0AF4AF',
    poNumber: 'PO-56A66D9B',
    requestId: 'REQ-50B0A5DB',
    vendor: 'Dell Technologies Inc.',
    receivedDate: '2026-09-23',
    product: 'Dell PowerEdge R750 Rack Server (Dual Xeon 64C)',
    orderedQuantity: 2,
    receivedQuantity: 2,
    damagedQuantity: 0,
    inspectionStatus: 'Passed',
    receivedBy: 'Infrastructure Logistics Desk',
    status: 'Verified',
    warehouseLocation: 'Server Room Depot Bay 1',
    category: 'IT Hardware',
    amount: 480000,
  },
  {
    id: 'REC-C8C856F2',
    receiptType: 'HARDWARE',
    grnNumber: 'REC-C8C856F2',
    poNumber: 'PO-52ACF02F',
    requestId: 'REQ-35E3FEA1',
    vendor: 'Dell Technologies Inc.',
    receivedDate: '2026-09-22',
    product: 'Dell UltraSharp 32" 4K Video Conferencing Displays',
    orderedQuantity: 10,
    receivedQuantity: 10,
    damagedQuantity: 0,
    inspectionStatus: 'Passed',
    receivedBy: 'Priyanka Sharma (Admin)',
    status: 'Verified',
    warehouseLocation: 'Main Depot Bay 3',
    category: 'IT Hardware',
    amount: 290000,
  },
  {
    id: 'REC-B01BB8AB',
    receiptType: 'HARDWARE',
    grnNumber: 'REC-B01BB8AB',
    poNumber: 'PO-B5D77FB9',
    requestId: 'REQ-A315F7C3',
    vendor: 'Dell Technologies Inc.',
    receivedDate: '2026-09-21',
    product: 'Dell Precision 5820 AI Workstation Tower',
    orderedQuantity: 4,
    receivedQuantity: 4,
    damagedQuantity: 0,
    inspectionStatus: 'Passed',
    receivedBy: 'Stores Inward Officer',
    status: 'Verified',
    warehouseLocation: 'Bay 2 - Hardware QA Lab',
    category: 'IT Hardware',
    amount: 520000,
  },
  {
    id: 'REC-6DB05D5B',
    receiptType: 'HARDWARE',
    grnNumber: 'REC-6DB05D5B',
    poNumber: 'PO-167BB244',
    requestId: 'REQ-9F9DF3C2',
    vendor: 'Dell Technologies Inc.',
    receivedDate: '2026-09-20',
    product: 'Dell Networking S5248F-ON 25GbE Core Switch',
    orderedQuantity: 2,
    receivedQuantity: 2,
    damagedQuantity: 0,
    inspectionStatus: 'Inspection Pending',
    receivedBy: 'Logistics Receiving Desk',
    status: 'Pending Verification',
    warehouseLocation: 'Bay 4 - Pune Receiving Dock',
    category: 'IT Hardware',
    amount: 180000,
  },
]

// ─── Context & Provider ───────────────────────────────────────────────────────

const ManagerDataContext = createContext<ManagerDataContextType | undefined>(undefined)

export const ManagerDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // PERFORMANCE: Single source of truth — all filtered views derived via useMemo.
  // Previously 7 separate useState arrays caused 8 setState calls per fetch = 8 re-renders.
  const [backendRequests, setBackendRequests] = useState<ProcurementRequest[]>([])
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [budgets, setBudgets] = useState<BudgetDepartment[]>([])
  const [tickets, setTickets] = useState<RaiseTicket[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [financeAuditHistory, setFinanceAuditHistory] = useState<FinanceAuditItem[]>([])
  const [vendors, setVendors] = useState<VendorItem[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderItem[]>([])
  const [invoices, setInvoices] = useState<VendorInvoice[]>([])
  const [receipts, setReceipts] = useState<GoodsReceiptItem[]>(DEFAULT_GOODS_RECEIPTS)
  const [contracts, setContracts] = useState<ContractItem[]>([])
  const [quotations, setQuotations] = useState<QuotationItem[]>([])
  const [loading] = useState(false)

  const isFetchingRef = React.useRef(false)
  const pendingRefetchRef = React.useRef(false)

  // Dynamic fetch from Django REST API backend
  const refreshManagerBackendData = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return // Don't fetch if not logged in
    if (isFetchingRef.current) {
      pendingRefetchRef.current = true
      return
    }
    isFetchingRef.current = true

    try {
      // 1. Kick off requests fetch immediately for fastest UI update
      const requestsPromise = getDashboardStats()

      // 2. Kick off other secondary datasets in parallel
      const othersPromise = Promise.allSettled([
        apiClient.get('/budgets/allocations/'),
        apiClient.get('/rfq/'),
        apiClient.get('/vendors/'),
        apiClient.get('/procurement/purchase-orders/'),
        apiClient.get('/invoices/'),
        apiClient.get('/payments/'),
        apiClient.get('/procurement/receipts/')
      ])

      const requestsRes = await requestsPromise
      if (requestsRes) {
        const res = requestsRes
        const list = Array.isArray(res) ? res : res?.results || []
        const existingMap = new Map(allRequestsRef.current.map(r => [r.id, r]))

        let mapped: ProcurementRequest[] = list.map((item: any) => {
          const reqId = item.request_id || item.id
          const existing = existingMap.get(reqId)

          const getPositiveVal = (...vals: any[]) => {
            for (const v of vals) {
              if (v !== undefined && v !== null && v !== '') {
                const n = Number(v)
                if (!isNaN(n) && n > 0) return n
              }
            }
            return 0
          }

          const approvedAmt = getPositiveVal(item.approved_amount, item.finance_approved_amount)
          let estimatedAmt = getPositiveVal(
            item.original_estimated_cost,
            item.total_estimated_cost,
            item.requested_amount,
            item.existing_cost,
            item.extra_fields?.original_estimated_cost,
            item.extra_fields?.requested_amount,
            item.extra_fields?.total_estimated_cost,
            item.extra_fields?.existing_cost,
            item.extra_fields?.payment_justification?.existing_cost,
            item.payment_justification_detail?.existing_cost
          )

          const isRenewalOrUpgrade = 
            item.request_operation === 'RENEWAL' ||
            item.request_operation === 'UPGRADE' ||
            (item.title && /^(renewal|upgrade|renew):/i.test(item.title))

          if (isRenewalOrUpgrade) {
            // Find root/original request in list
            const origKey = item.original_request || item.parent_request
            let root = list.find((cand: any) => 
              cand.id === origKey || 
              cand.request_id === origKey ||
              (item.original_request_id && cand.request_id === item.original_request_id) ||
              (item.parent_request_id && cand.request_id === item.parent_request_id)
            )
            if (!root && item.title) {
              const clean = item.title.replace(/^(renewal|upgrade|renew):\s*/i, '').trim().toLowerCase()
              root = list.find((cand: any) => 
                cand.id !== item.id && 
                cand.title && 
                cand.title.toLowerCase().trim() === clean
              )
            }
            if (root) {
              const rootCost = getPositiveVal(
                root.total_estimated_cost,
                root.requested_amount,
                root.approved_amount,
                root.existing_cost,
                root.amount
              )
              if (rootCost > 0) {
                estimatedAmt = rootCost
              }
            }
          }

          const effectiveAmount = approvedAmt > 0 ? approvedAmt : (estimatedAmt > 0 ? estimatedAmt : (existing?.amount || 0))

          return {
            id: reqId,
            request_id: item.request_id || reqId,
            title: item.title,
            requester: item.created_by_detail?.first_name ? `${item.created_by_detail.first_name} ${item.created_by_detail.last_name}` : (existing?.requester || 'Team Lead'),
            department: item.department_detail?.name || existing?.department || 'IT',
            category: item.category || existing?.category || 'General',
            subcategory: item.subcategory || existing?.subcategory || 'Office Equipment',
            amount: effectiveAmount,
            requested_amount: getPositiveVal(estimatedAmt, item.requested_amount, item.total_estimated_cost, item.existing_cost),
            approved_amount: approvedAmt,
            total_estimated_cost: getPositiveVal(estimatedAmt, item.total_estimated_cost, item.requested_amount, item.existing_cost),
            original_estimated_cost: estimatedAmt,
            rawRequest: item,
            quantity: item.quantity || existing?.quantity || 1,
            requiredBy: item.required_by || existing?.requiredBy,
            deliveryLocation: item.delivery_location || existing?.deliveryLocation,
            currentStage: item.current_stage || existing?.currentStage || 1,
            costCenter: item.cost_center || item.budget_code || existing?.costCenter,
            date: item.created_at ? item.created_at.split('T')[0] : (existing?.date || new Date().toISOString().split('T')[0]),
            status: (() => {
              const bs = (item.status || '').toUpperCase()
              if (bs === 'MANAGER_REVIEW' || bs === 'TEAM_LEAD_REVIEW' || bs === 'TEAM_LEAD_SUBMITTED' || bs === 'PENDING' || bs === 'CREATED' || bs === 'SUBMITTED' || bs === 'MANAGER_RESEARCHING' || bs === 'PRE_ESTIMATION_COMPLETED') return 'pending_approval'
              if (bs === 'MANAGER_RECOMMENDED_TO_FINANCE' || bs === 'RECOMMENDED_TO_FINANCE' || bs === 'FINANCE_REVIEW' || bs === 'FINANCE_RECOMMENDED' || bs === 'FINANCE_RESEARCH' || bs === 'COST_ESTIMATION' || bs === 'FINANCE_REPORT' || bs === 'RECOMMENDED' || bs === 'SENT_TO_FINANCE') return 'finance_review'
              if (bs === 'RECOMMENDED_TO_ADMIN' || bs === 'FINANCE_RECOMMENDED_TO_ADMIN' || bs === 'ADMIN_REVIEW') return 'recommended_to_admin'
              if (bs === 'ADMIN_APPROVED') return 'approved'
              if (bs === 'MANAGER_APPROVED') return 'approved'
              if (bs === 'FINANCE_APPROVED') return 'finance_approved'
              if (bs === 'PAYMENT_COMPLETED') return 'payment_completed'
              if (bs === 'PAYMENT_APPROVED') return 'payment_approved'
              if (bs === 'PAYMENT_PROCESSED') return 'payment_approved'
              if (bs === 'PAYMENT_JUSTIFICATION_SUBMITTED') return 'payment_justification_submitted'
              if (bs === 'PAYMENT_JUSTIFIED' || bs === 'MANAGER_VERIFIED' || bs === 'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT') return 'payment_justified'
              if (bs === 'FINANCE_REJECTED') return 'finance_rejected'
              if (bs === 'SENT_BACK' || bs === 'RETURNED') return 'clarification_requested'
              if (bs === 'REJECTED') return 'rejected'
              if (bs === 'APPROVED') return 'approved'
              if (bs === 'IN PROCUREMENT') return 'assigned_to_vendor'
              if (bs === 'COMPLETED' || bs === 'TEAM_LEAD_CONFIRMED' || bs === 'REQUEST_COMPLETED') return 'completed'
              return 'pending_approval'
            })(),
            priority: item.priority || existing?.priority || 'Medium',
            vendor: item.preferred_vendor || item.vendor || existing?.vendor || 'Preferred Vendor',
            description: item.description || existing?.description,
            justification: item.justification || existing?.justification,
            flowType: item.flow_type || existing?.flowType || 'A',
            extraFields: item.extra_fields || existing?.extraFields || {},
            raw_status: item.status,
            currentlyWith: item.currently_with || (
              item.status === 'MANAGER_APPROVED' ? 'Team Lead — Mock Payment Required' :
              item.status === 'PAYMENT_APPROVED' ? 'Team Lead — Awaiting Payment Justification' :
              item.status === 'PAYMENT_JUSTIFICATION_SUBMITTED' ? 'Manager — Verifying Justification' :
              item.status === 'PAYMENT_JUSTIFIED' || item.status === 'MANAGER_VERIFIED' || item.status === 'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT' ? 'Team Lead — Awaiting Final Acknowledgment' :
              item.status === 'COMPLETED' || item.status === 'REQUEST_COMPLETED' || item.status === 'TEAM_LEAD_CONFIRMED' ? 'Completed & Archived' :
              item.status === 'MANAGER_REVIEW' || item.status === 'PENDING' ? 'Manager Sign-off' :
              'Manager Sign-off'
            ),
            currently_with: item.currently_with,
            request_type: item.request_type,
            software_name: item.software_name,
            current_plan: item.current_plan,
            required_plan: item.required_plan,
            existing_cost: item.existing_cost,
            business_requirement: item.business_requirement,
            research_estimation: item.research_estimation,
            finance_approved_amount: item.finance_approved_amount,
            payment_justification_detail: item.payment_justification_detail,
            request_operation: item.request_operation,
            created_by_detail: item.created_by_detail,
            department_detail: item.department_detail,
            extra_fields: item.extra_fields || {},
            payment_method: item.payment_method,
            payment_reference: item.payment_reference,
            payment_date: item.payment_date,
            paymentStatus: (() => {
              const ps = (item.payment_status || '').toUpperCase()
              const bs = (item.status || '').toUpperCase()
              if (ps === 'PAID' || ps === 'SUCCESS' || ps === 'PROCESSED' || bs === 'PAYMENT_COMPLETED' || bs === 'COMPLETED' || bs === 'TEAM_LEAD_CONFIRMED' || bs === 'PAYMENT_PROCESSED' || bs === 'PAYMENT_JUSTIFICATION_SUBMITTED' || bs === 'PAYMENT_JUSTIFIED') return 'Paid'
              if (ps === 'PENDING' || ps === 'PROCESSING' || bs === 'PAYMENT_APPROVED' || bs === 'FINANCE_APPROVED') return 'Pending'
              if (ps === 'ON_HOLD' || ps === 'FAILED') return 'On Hold'
              return existing?.paymentStatus || (bs === 'PAYMENT_COMPLETED' ? 'Paid' : undefined)
            })(),
            payment_status: item.payment_status || (item.status === 'PAYMENT_COMPLETED' || item.status === 'PAYMENT_PROCESSED' ? 'Paid' : undefined),
            payment_notes: item.payment_notes,
            confirmed_by_team_lead: item.confirmed_by_team_lead,
            confirmed_at: item.confirmed_at,
            timeline: item.timeline || [],
            final_approval_by: item.final_approval_by || item.extra_fields?.final_approval_by,
            approval_path: item.approval_path || item.final_approval_by || item.extra_fields?.final_approval_by,
            approvalParams: existing?.approvalParams,
            recommendationReason: item.recommendation_reason || item.extra_fields?.recommendation_reason || existing?.recommendationReason,
            recommendedBy: item.recommended_by || item.extra_fields?.recommended_by || existing?.recommendedBy,
            recommendedDate: item.recommended_date || item.extra_fields?.recommended_date || existing?.recommendedDate,
            financeStatus: item.finance_status || (
              (item.status === 'FINANCE_APPROVED' || item.status === 'PAYMENT_APPROVED' || item.status === 'PAYMENT_PROCESSED' || item.status === 'PAYMENT_JUSTIFICATION_SUBMITTED' || item.status === 'PAYMENT_JUSTIFIED') ? 'Approved' :
              item.status === 'ADMIN_APPROVED' ? 'Admin Approved' :
              item.status === 'PAYMENT_COMPLETED' ? 'Paid' :
              (item.status === 'COMPLETED' || item.status === 'TEAM_LEAD_CONFIRMED') ? 'Completed' :
              item.status === 'FINANCE_REJECTED' ? 'Rejected' :
              (item.status === 'RECOMMENDED_TO_ADMIN' || item.status === 'FINANCE_RECOMMENDED_TO_ADMIN') ? 'Recommended to Admin' :
              (item.status === 'RECOMMENDED_TO_FINANCE' || item.status === 'FINANCE_REVIEW' || item.status === 'FINANCE_RECOMMENDED' || item.status === 'FINANCE_RESEARCH' || item.status === 'COST_ESTIMATION' || item.status === 'FINANCE_REPORT' || item.status === 'Recommended' || item.status === 'SENT_TO_FINANCE') ? 'Awaiting Finance Action' :
              item.status === 'SENT_BACK' ? 'Sent Back' :
              existing?.financeStatus
            ),
            financeApprovedBy: item.finance_approved_by || existing?.financeApprovedBy,
            financeComment: item.finance_comment || existing?.financeComment,
            dbId: item.id,
            createdAt: item.created_at || (existing as any)?.createdAt || undefined,
            history: Array.isArray(item.approval_history) && item.approval_history.length > 0
              ? item.approval_history.map((h: any) => ({
                  date: h.created_at || h.timestamp || '',
                  actorRole: h.user_role || 'User',
                  actorName: h.performed_by_detail ? `${h.performed_by_detail.first_name} ${h.performed_by_detail.last_name}` : (h.performed_by_detail?.username || h.user_role || 'User'),
                  action: h.action || 'Updated',
                  remark: h.comments || '',
                }))
              : Array.isArray(item.approval_steps)
              ? item.approval_steps.map((s: any) => ({
                  date: s.created_at || '',
                  actorRole: s.role || 'User',
                  actorName: s.actor_detail ? `${s.actor_detail.first_name} ${s.actor_detail.last_name}` : 'Unknown',
                  action: s.decision || '',
                  remark: s.notes || s.reason_detail?.text || '',
                }))
              : existing?.history || [],
          }
        })

        // Strictly enforce newest first across all mapped backend items
        mapped = sortRequestsNewestFirst(mapped)

        // PERFORMANCE: Single setState — derived views computed via useMemo below.
        // Previously 7 separate setState calls here caused 8 render passes per fetch.
        setBackendRequests(mapped)
      }

      // 3. Await secondary datasets (budgets, rfqs, pos, etc.) in the background
      const [budgetsRes, rfqsRes, vendorsRes, posRes, invRes, payRes, receiptsRes] = await othersPromise

      // Budgets
      if (budgetsRes.status === 'fulfilled' && budgetsRes.value?.data) {
        const rawBudgets = Array.isArray(budgetsRes.value.data) ? budgetsRes.value.data : (budgetsRes.value.data?.results || [])
        setBudgets(rawBudgets.map((b: any) => ({
          department: b.department_detail?.name || 'Department',
          category: b.department_detail?.description || 'Operational Allocation',
          totalBudget: Number(b.total_allocated) || 0,
          allocated: Number(b.total_allocated) || 0,
          committed: Number(b.committed_amount) || 0,
          spent: Number(b.spent_amount) || 0,
          available: Number(b.available_amount) || 0,
          pending: Number(b.committed_amount) || 0
        })))
      }

      // RFQs
      if (rfqsRes.status === 'fulfilled' && rfqsRes.value?.data) {
        const rawRfqs = Array.isArray(rfqsRes.value.data) ? rfqsRes.value.data : rfqsRes.value.data?.results || []
        rawRfqs.forEach((backendRfq: any) => {
          if (backendRfq.purchase_request_detail) {
            const pr = backendRfq.purchase_request_detail
            const updateReq = (r: ProcurementRequest) => r.id === pr.request_id ? { ...r, currentStage: pr.current_stage, status: pr.current_stage === 5 ? ('quotes_received' as any) : r.status } : r
            // Update the single source of truth \u2014 derived useMemo views will update automatically
            setBackendRequests((prev: ProcurementRequest[]) => prev.map(updateReq))
          }
        })
        setRfqs(rawRfqs.map((r: any) => {
          const vendors = (r.invited_vendors_detail || []).map((iv: any) => {
            const q = (r.quotations || []).find((qt: any) => qt.vendor === iv.id || qt.vendor_detail?.id === iv.id)
            return {
              name: iv.name,
              invitedOn: (r.created_at || '').split('T')[0] || r.deadline,
              response: q ? 'Received' : 'Pending',
              quote: q ? Number(q.price) : undefined,
              deliveryDays: q ? q.delivery_days : undefined,
              warranty: q ? `${q.warranty_months} months` : undefined,
              paymentTerms: q ? q.terms_conditions : undefined
            }
          })
          let st = 'draft'
          const rawStatus = (r.status || '').toUpperCase()
          if (rawStatus === 'OPEN') {
            st = vendors.some((v: any) => v.response === 'Received') ? 'quotes_received' : 'sent'
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
            status: st,
            department: r.purchase_request_detail?.department_detail?.name || 'IT',
            createdBy: createdByStr,
            vendors,
            estimatedAmount: r.estimatedAmount || r.purchase_request_detail?.total_estimated_cost || r.estimated_amount || 0
          }
        }))
      }

      // Vendors
      if (vendorsRes.status === 'fulfilled' && vendorsRes.value?.data) {
        const rawVendors = Array.isArray(vendorsRes.value.data) ? vendorsRes.value.data : vendorsRes.value.data?.results || []
        setVendors(rawVendors.map((v: any) => {
          let st = 'Pending Approval'
          const rawStatus = (v.status || '').toUpperCase()
          if (rawStatus === 'APPROVED') st = 'Active'
          else if (rawStatus === 'SUSPENDED') st = 'Suspended'
          else if (rawStatus === 'REJECTED') st = 'Rejected'
          return {
            ...v,
            id: v.unique_vendor_id || v.id,
            name: v.name,
            company: v.name,
            contactPerson: v.contact_person || 'N/A',
            email: v.email,
            phone: v.phone,
            category: v.category_detail?.name || (typeof v.category === 'string' ? v.category : 'General'),
            status: st,
            riskLevel: v.risk_rating || 'Low',
            performanceScore: parseFloat(v.performance_score) || 90
          }
        }))
      }

      // Purchase Orders
      if (posRes.status === 'fulfilled' && posRes.value?.data) {
        const rawPos = Array.isArray(posRes.value.data) ? posRes.value.data : posRes.value.data?.results || []
        setPurchaseOrders(rawPos)
        if (rawPos.length > 0) {
          setTickets(prev => {
            const list = [...prev]
            rawPos.forEach((po: any, idx: number) => {
              const ticketId = `TCK-${po.po_id || po.id}`
              if (!list.some(t => t.id === ticketId)) {
                const amount = Number(po.total_amount) || 0
                const docId = po.po_id || `PO-2026-${String(idx + 1).padStart(3, '0')}`
                const vendorName = po.vendor_detail?.name || (typeof po.vendor === 'string' ? po.vendor : 'Vendor')
                const title = po.purchase_request_detail?.title || `Hardware & Procurement Package - ${docId}`
                list.push({
                  id: ticketId,
                  requestId: po.purchase_request_detail?.request_id || po.purchase_request || `REQ-${docId}`,
                  requestTitle: title,
                  requestAmount: amount,
                  department: po.purchase_request_detail?.department_detail?.name || 'Engineering',
                  createdDate: po.order_date || new Date().toISOString().split('T')[0],
                  products: [
                    {
                      id: `PROD-${docId}-1`,
                      name: title,
                      category: 'Hardware',
                      quantity: 1,
                      unit: 'Units',
                      vendor: vendorName,
                      pricePerUnit: amount,
                      totalAmount: amount,
                      productOrder: { id: docId, name: `${docId}_Official_PO.pdf`, verified: true, verifiedBy: 'Procurement Officer' },
                      goodsReceipt: { id: `GRN-${docId}`, name: `GRN_${docId}_Delivery.pdf`, verified: false },
                      invoice: { id: `INV-${docId}`, name: `Tax_Invoice_${docId}.pdf`, verified: false, amount, taxAmount: Math.round(amount * 0.18) },
                      submitted: false
                    }
                  ],
                  productOrder: { id: docId, name: `${docId}_Official_PO.pdf`, verified: true, verifiedBy: 'Procurement Officer' },
                  goodsReceipt: { id: `GRN-${docId}`, name: `GRN_${docId}_Delivery.pdf`, verified: false },
                  invoice: { id: `INV-${docId}`, name: `Tax_Invoice_${docId}.pdf`, verified: false, amount, taxAmount: Math.round(amount * 0.18) },
                  submitted: false
                })
              }
            })
            return list
          })
        }
      }

      // Invoices
      if (invRes.status === 'fulfilled' && invRes.value?.data) {
        const rawInvoices = Array.isArray(invRes.value.data) ? invRes.value.data : invRes.value.data?.results || []
        setInvoices(rawInvoices.map((inv: any) => ({
          id: inv.invoice_id || `INV-${inv.id}`,
          invoiceNumber: inv.invoice_number || inv.invoice_id || `INV-${inv.id}`,
          poId: inv.purchase_order_detail?.po_id || inv.purchase_order || '',
          poNumber: inv.purchase_order_detail?.po_id || inv.purchase_order || '',
          requestId: inv.purchase_order_detail?.purchase_request || '',
          requestTitle: inv.purchase_order_detail?.purchase_request_detail?.title || `Invoice ${inv.invoice_number || inv.id}`,
          vendor: inv.vendor_detail?.name || (typeof inv.vendor === 'string' ? inv.vendor : 'Vendor'),
          vendorId: inv.vendor_detail?.unique_vendor_id || inv.vendor,
          invoiceDate: inv.invoice_date || (inv.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0],
          dueDate: inv.due_date || (inv.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0],
          subtotal: Number(inv.amount) || 0,
          taxAmount: Number(inv.tax_amount) || 0,
          totalAmount: (Number(inv.amount) || 0) + (Number(inv.tax_amount) || 0),
          status: inv.status === 'Approved' ? 'Accepted' : inv.status === 'Exception' ? 'Rejected' : 'Pending Review',
          items: []
        })))
      }

      // Payments
      if (payRes.status === 'fulfilled' && payRes.value?.data) {
        const rawPayments = Array.isArray(payRes.value.data) ? payRes.value.data : payRes.value.data?.results || []
        setPayments(rawPayments.map((p: any) => ({
          id: p.payment_id || `PAY-${p.id}`,
          requestId: p.purchase_request_detail?.request_id || p.purchase_request || 'N/A',
          requestTitle: p.purchase_request_detail?.title || `Disbursement for ${p.payment_id || p.id}`,
          vendor: p.vendor_detail?.name || (typeof p.vendor === 'string' ? p.vendor : 'Vendor'),
          invoiceId: p.invoice_detail?.invoice_number || (typeof p.invoice === 'string' ? p.invoice : `INV-${p.id}`),
          poNumber: p.purchase_request_detail?.po_number || 'PO-2026-001',
          grnNumber: p.reference_number || undefined,
          amount: Number(p.amount) || 0,
          taxAmount: Math.round((Number(p.amount) || 0) * 0.18),
          dueDate: p.payment_date || (p.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0],
          paymentDate: p.payment_date || (p.status === 'Paid' ? (p.updated_at || '').split('T')[0] : undefined),
          paymentMethod: p.payment_method || 'Bank Transfer',
          status: p.status || 'Pending',
          notes: p.notes || '',
          transactionRef: p.reference_number || undefined,
          purchaseRequestDetail: p.purchase_request_detail || {},
          history: []
        })))
      }

      // Goods Receipts & Software Receipts
      const backendGRNs: GoodsReceiptItem[] = []
      if (receiptsRes.status === 'fulfilled' && receiptsRes.value?.data) {
        const rawReceipts = Array.isArray(receiptsRes.value.data) ? receiptsRes.value.data : receiptsRes.value.data?.results || []
        rawReceipts.forEach((rc: any) => {
          const po = rc.purchase_order_detail || {}
          const pr = po.purchase_request_detail || {}
          const vendorName = po.vendor_detail?.name || (pr as any).vendor || 'Software Provider'
          const cat = pr.category || ''
          const receiptIdStr = rc.receipt_id || `REC-${rc.id}`
          const isSw = (
            receiptIdStr.startsWith('RCP-SW-') ||
            receiptIdStr.includes('-SW-') ||
            (rc.delivery_location || '').toLowerCase().includes('digital') ||
            (rc.delivery_location || '').toLowerCase().includes('saas') ||
            (rc.delivery_location || '').toLowerCase().includes('cloud') ||
            cat.toLowerCase().includes('software') ||
            cat.toLowerCase().includes('saas') ||
            Boolean(pr.software_name)
          )
          backendGRNs.push({
            id: receiptIdStr,
            receiptType: isSw ? 'SOFTWARE' : 'HARDWARE',
            grnNumber: receiptIdStr,
            poNumber: po.po_id || `PO-${rc.purchase_order}`,
            requestId: pr.request_id || `REQ-${rc.id}`,
            vendor: vendorName,
            receivedDate: rc.delivery_date || (rc.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0],
            product: pr.software_name || pr.title || rc.product_name || rc.notes || (isSw ? 'Software Subscription' : 'Procured Hardware Equipment'),
            orderedQuantity: pr.quantity || rc.ordered_quantity || 1,
            receivedQuantity: pr.quantity || rc.received_quantity || 1,
            damagedQuantity: 0,
            inspectionStatus: rc.status === 'Verified' ? 'Passed' : 'Passed',
            receivedBy: rc.received_by_detail ? `${rc.received_by_detail.first_name} ${rc.received_by_detail.last_name}`.trim() : 'Procurement Officer',
            status: rc.status === 'Verified' ? 'Verified' : 'Verified',
            warehouseLocation: isSw ? 'Digital Provisioning (Cloud / SaaS)' : (rc.delivery_location || 'Bay 4 - Pune Receiving Dock'),
            category: cat || (isSw ? 'Software & SaaS' : 'IT Hardware'),
            amount: Number(po.total_amount || pr.approved_amount || pr.requested_amount || 0),
            softwareName: pr.software_name || pr.title,
            requestType: pr.request_type || 'Annual Subscription',
            currentPlan: pr.current_plan || 'Standard Tier',
            requiredPlan: pr.required_plan || 'Enterprise Tier',
            paymentReference: rc.notes || `TXN-REC-${rc.id}`,
            paymentMethod: isSw ? 'Corporate Digital Card' : 'Net 30 Invoicing',
            requester: pr.created_by_detail ? `${pr.created_by_detail.first_name} ${pr.created_by_detail.last_name}`.trim() : 'Team Lead',
            department: pr.department_detail?.name || 'Engineering',
            paymentJustification: pr.justification || rc.notes || 'Department operational procurement',
            receiptProof: `Verified Receipt Certificate - ${rc.receipt_id}.pdf`,
            rawRequest: pr
          })
        })
      }

      // Also extract software receipts from requests with payment/justifications or software category
      const dynamicSoftwareReceipts: GoodsReceiptItem[] = []
      if (requestsRes) {
        const res = requestsRes
        const list = Array.isArray(res) ? res : res?.results || []
        list.forEach((item: any) => {
          const cat = (item.category || '').toLowerCase()
          const isSw = cat.includes('software') || cat.includes('saas') || Boolean(item.software_name) || item.flowType === 'B' || item.flow_type === 'B'
          const extra = item.extra_fields || item.extraFields || (item.rawRequest && item.rawRequest.extra_fields) || {}
          const pj = item.payment_justification_detail || extra.payment_justification || {}
          const rawSt = ((item.raw_status || item.status || '') as string).toUpperCase()
          const isCompleted = ['REQUEST_COMPLETED', 'COMPLETED', 'TEAM_LEAD_ACKNOWLEDGED', 'TEAM_LEAD_CONFIRMED'].includes(rawSt) || Boolean(extra.team_lead_acknowledged) || Boolean(item.confirmed_by_team_lead) || Boolean(pj.is_acknowledged)
          
          if (isSw && (extra.software_receipt_id || extra.receipt_no || isCompleted)) {
            const reqId = item.request_id || item.id
            const receiptId = extra.software_receipt_id || extra.receipt_no || `RCP-SW-${reqId}`
            const paidAmount = Number(pj.actual_purchase_amount || extra.actual_purchase_amount || extra.final_payable_amount || item.finance_approved_amount || item.approved_amount || item.requested_amount || 0)
            const payRef = extra.payment_reference || item.payment_reference || extra.mock_payment_ref || pj.payment_reference || receiptId
            const payMethod = extra.payment_method || item.payment_method || extra.mock_payment_method || pj.payment_method || 'Corporate Digital Card'
            const recDate = extra.receipt_generated_at?.split('T')[0] || extra.acknowledged_at?.split('T')[0] || extra.mock_payment_date?.split('T')[0] || item.payment_date || item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
            
            dynamicSoftwareReceipts.push({
              id: receiptId,
              receiptType: 'SOFTWARE',
              grnNumber: receiptId,
              poNumber: `PO-SW-${reqId}`,
              requestId: reqId,
              vendor: pj.vendor_name || item.vendor || item.preferred_vendor || item.software_name || item.title || 'Enterprise SaaS Provider',
              receivedDate: recDate,
              product: item.software_name || item.title || 'Software Subscription',
              orderedQuantity: item.quantity || 1,
              receivedQuantity: item.quantity || 1,
              damagedQuantity: 0,
              inspectionStatus: 'Passed',
              receivedBy: item.created_by_detail ? `${item.created_by_detail.first_name} ${item.created_by_detail.last_name}`.trim() : (item.requester || 'Team Lead'),
              status: 'Verified',
              warehouseLocation: 'Digital Provisioning (Cloud / SaaS)',
              category: 'Software & SaaS',
              amount: paidAmount,
              softwareName: pj.software_name || item.software_name || item.title,
              requestType: item.request_type || extra.purchase_type || extra.requestType || 'New Purchase',
              currentPlan: item.current_plan || extra.currentPlan || 'Business Standard',
              requiredPlan: item.required_plan || extra.requiredPlan || 'Enterprise License',
              paymentReference: payRef,
              paymentMethod: payMethod,
              requester: item.created_by_detail ? `${item.created_by_detail.first_name} ${item.created_by_detail.last_name}`.trim() : (item.requester || 'Team Lead'),
              department: item.department_detail?.name || item.department || 'IT',
              paymentJustification: pj.business_justification || extra.payment_justification?.business_justification || item.justification || 'Department software license for operational productivity.',
              receiptProof: extra.payment_justification?.proof_description || 'Digital Payment Receipt Attached',
              licenseKey: `LIC-${reqId.slice(-6)}-${new Date().getFullYear()}`,
              rawRequest: item,
              payment_justification_detail: pj
            })
          }
        })
      }

      setReceipts(prev => {
        const mergedMap = new Map<string, GoodsReceiptItem>()
        DEFAULT_GOODS_RECEIPTS.forEach(r => mergedMap.set(r.id, r))
        backendGRNs.forEach(r => mergedMap.set(r.id, r))
        dynamicSoftwareReceipts.forEach(r => {
          // If already set by backendGRNs, ensure receiptType remains SOFTWARE and merge missing details
          const existing = mergedMap.get(r.id)
          if (existing) {
            mergedMap.set(r.id, { ...existing, ...r, receiptType: 'SOFTWARE' })
          } else {
            mergedMap.set(r.id, r)
          }
        })
        
        // Sort strictly newest first by actual timestamp from PostgreSQL
        const allItems = Array.from(mergedMap.values())
        allItems.sort((a, b) => {
          const extraA = a.rawRequest?.extra_fields || a.rawRequest?.extraFields || {}
          const extraB = b.rawRequest?.extra_fields || b.rawRequest?.extraFields || {}
          const dateA = new Date(extraA.receipt_generated_at || extraA.acknowledged_at || a.receivedDate || (a as any).created_at || 0).getTime()
          const dateB = new Date(extraB.receipt_generated_at || extraB.acknowledged_at || b.receivedDate || (b as any).created_at || 0).getTime()
          if (dateB !== dateA) return dateB - dateA
          return b.id.localeCompare(a.id)
        })
        return allItems
      })

    } catch (e) {
      console.warn('Backend manager fetch fallback:', e)
    } finally {
      isFetchingRef.current = false
      if (pendingRefetchRef.current) {
        pendingRefetchRef.current = false
        refreshManagerBackendData()
      }
    }
  }, [])

  useEffect(() => {
    refreshManagerBackendData()
    const unsubscribe = subscribeGlobalDataSync(() => {
      refreshManagerBackendData()
    })
    const interval = setInterval(refreshManagerBackendData, 25000)
    
    // Add 5-second polling to ensure updates even across different browsers/devices
    const pollInterval = setInterval(() => {
      refreshManagerBackendData()
    }, 5000)

    return () => {
      unsubscribe()
      clearInterval(pollInterval)
      clearInterval(interval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // stable ref — refreshManagerBackendData is defined with useCallback([], []) so it never changes

  // PERFORMANCE: allRequests is now just backendRequests (single source of truth).
  // Previously it concat-ed 7 arrays and ran O(n^2) dedup on every render.
  const allRequests = useMemo(() => sortRequestsNewestFirst(backendRequests), [backendRequests])

  // Derived filtered views — computed in a single pass each, only when backendRequests changes
  const pendingApprovals = useMemo(() =>
    backendRequests.filter(r => {
      const rawSt = ((r as any).raw_status || r.status || '').toUpperCase()
      const st = (r.status || '').toLowerCase()
      const recInfo = getRecommendationStatus(r)

      const isPostApproved = (
        rawSt.includes('APPROVED') ||
        rawSt === 'COMPLETED' ||
        rawSt === 'REQUEST_COMPLETED' ||
        rawSt === 'PAYMENT_PROCESSED' ||
        rawSt === 'PAYMENT_JUSTIFIED' ||
        rawSt === 'MANAGER_VERIFIED' ||
        st === 'approved' ||
        st === 'completed' ||
        st === 'payment_completed'
      )
      const isRejected = rawSt === 'REJECTED' || rawSt === 'FINANCE_REJECTED' || st === 'rejected' || st === 'finance_rejected'

      if (isPostApproved || isRejected) return false

      // Standard pending reviews & justification checks
      if (
        st === 'pending_approval' ||
        rawSt === 'PENDING_APPROVAL' ||
        rawSt === 'MANAGER_REVIEW' ||
        rawSt === 'PENDING' ||
        rawSt === 'PAYMENT_JUSTIFICATION_SUBMITTED' ||
        st === 'payment_justification_submitted'
      ) {
        return true
      }

      // Keep requests recommended to Higher Authority visible under Manager Approval
      if (
        st === 'recommended_to_finance' ||
        rawSt === 'RECOMMENDED_TO_FINANCE' ||
        st === 'recommended_to_admin' ||
        rawSt === 'RECOMMENDED_TO_ADMIN' ||
        rawSt === 'FINANCE_RECOMMENDED_TO_ADMIN' ||
        st === 'finance_review' ||
        rawSt === 'FINANCE_REVIEW' ||
        recInfo.isRecommended ||
        Boolean((r as any).extra_fields?.recommendation_reason) ||
        Boolean(r.recommendationReason)
      ) {
        return true
      }

      return false
    }), [backendRequests])

  const arrivedRequests = useMemo(() => pendingApprovals, [pendingApprovals])

  const myApprovals = useMemo(() =>
    backendRequests.filter(r =>
      r.status === 'approved' ||
      r.status === 'payment_approved' ||
      r.status === 'payment_justified' ||
      (r.status as string) === 'manager_verified_pending_team_lead_acknowledgement' ||
      r.status === 'finance_review' ||
      r.status === 'recommended_to_finance' ||
      (r as any).raw_status === 'RECOMMENDED_TO_FINANCE' ||
      r.status === 'recommended_to_admin' ||
      (r as any).raw_status === 'RECOMMENDED_TO_ADMIN' ||
      (r as any).raw_status === 'FINANCE_RECOMMENDED_TO_ADMIN' ||
      r.status === 'finance_approved' ||
      r.status === 'payment_completed' ||
      r.status === 'assigned_to_vendor' ||
      r.status === 'completed'
    ), [backendRequests])

  const rejectedRequests = useMemo(() =>
    backendRequests.filter(r => r.status === 'rejected' || r.status === 'finance_rejected'),
    [backendRequests])

  const financeReview = useMemo(() =>
    backendRequests.filter(r =>
      r.status === 'finance_review' ||
      r.status === 'recommended_to_finance' ||
      (r as any).raw_status === 'RECOMMENDED_TO_FINANCE' ||
      (r as any).raw_status === 'PAYMENT_JUSTIFICATION_SUBMITTED' ||
      (r as any).raw_status === 'PAYMENT_JUSTIFIED' ||
      r.status === 'payment_justified' ||
      r.status === 'payment_justification_submitted' ||
      (r as any).extraFields?.payment_justification
    ), [backendRequests])

  const recommendedToFinance = useMemo(() =>
    backendRequests.filter(r =>
      r.status === 'recommended_to_finance' ||
      r.status === 'finance_review' ||
      (r as any).raw_status === 'RECOMMENDED_TO_FINANCE'
    ), [backendRequests])

  const recommendedToAdmin = useMemo(() =>
    backendRequests.filter(r =>
      r.status === 'recommended_to_admin' ||
      (r as any).raw_status === 'RECOMMENDED_TO_ADMIN' ||
      (r as any).raw_status === 'FINANCE_RECOMMENDED_TO_ADMIN' ||
      r.financeStatus === 'Recommended to Admin' ||
      r.status === 'finance_approved' ||
      r.status === 'payment_completed'
    ), [backendRequests])

  const allRequestsRef = React.useRef<ProcurementRequest[]>([])
  useEffect(() => {
    allRequestsRef.current = allRequests
  }, [allRequests])

  // Computed: Pending Financial Approvals (all requests awaiting finance action)
  const pendingFinancialApprovals = useMemo(() => {
    return allRequests.filter(r =>
      r.status === 'sent_to_finance' ||
      r.status === 'finance_review' ||
      r.status === 'recommended_to_finance' ||
      r.status === 'finance_on_hold' ||
      r.status === 'clarification_requested' ||
      r.financeStatus === 'Awaiting Finance Action' ||
      r.financeStatus === 'Sent to Finance' ||
      r.financeStatus === 'Under Review' ||
      (r as any).raw_status === 'RECOMMENDED_TO_FINANCE' ||
      (r as any).raw_status === 'FINANCE_REVIEW' ||
      (r as any).raw_status === 'FINANCE_RECOMMENDED' ||
      (r as any).raw_status === 'FINANCE_RESEARCH' ||
      (r as any).raw_status === 'COST_ESTIMATION' ||
      (r as any).raw_status === 'FINANCE_REPORT' ||
      (r as any).raw_status === 'MANAGER_APPROVED'
    )
  }, [allRequests])

  // Computed: Approved Finance Requests (including payment completed & completed)
  const approvedFinanceRequests = useMemo(() => {
    return allRequests.filter(r =>
      r.financeStatus === 'Approved' ||
      r.financeStatus === 'Paid' ||
      r.financeStatus === 'Completed' ||
      r.financeStatus === 'Admin Approved' ||
      r.status === 'finance_approved' ||
      r.status === 'payment_approved' ||
      r.status === 'payment_justification_submitted' ||
      (r.status as string) === 'manager_verified_pending_team_lead_acknowledgement' ||
      r.status === 'payment_justified' ||
      r.status === 'payment_completed' ||
      r.status === 'completed' ||
      (r as any).raw_status === 'FINANCE_APPROVED' ||
      (r as any).raw_status === 'ADMIN_APPROVED' ||
      (r as any).raw_status === 'PAYMENT_APPROVED' ||
      (r as any).raw_status === 'PAYMENT_PROCESSED' ||
      (r as any).raw_status === 'PAYMENT_JUSTIFICATION_SUBMITTED' ||
      (r as any).raw_status === 'PAYMENT_JUSTIFIED' ||
      (r as any).raw_status === 'PAYMENT_COMPLETED' ||
      (r as any).raw_status === 'COMPLETED' ||
      (r as any).raw_status === 'TEAM_LEAD_CONFIRMED'
    )
  }, [allRequests])

  // Computed: Rejected Finance Requests
  const rejectedFinanceRequests = useMemo(() => {
    return allRequests.filter(r =>
      r.status === 'finance_rejected' ||
      (r.status === 'rejected' && (r.rejectedBy?.toLowerCase().includes('finance') || r.rejectionReason?.toLowerCase().includes('finance')))
    )
  }, [allRequests])

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

  // Dynamically compute payment analytics across weekly, monthly, yearly from live payments
  const paymentData = useMemo(() => {
    const weeklyMap: Record<string, { approved: number; paid: number; pending: number }> = {
      Mon: { approved: 0, paid: 0, pending: 0 },
      Tue: { approved: 0, paid: 0, pending: 0 },
      Wed: { approved: 0, paid: 0, pending: 0 },
      Thu: { approved: 0, paid: 0, pending: 0 },
      Fri: { approved: 0, paid: 0, pending: 0 },
      Sat: { approved: 0, paid: 0, pending: 0 },
      Sun: { approved: 0, paid: 0, pending: 0 },
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthlyMap: Record<string, { approved: number; paid: number; pending: number }> = {}
    months.forEach(m => { monthlyMap[m] = { approved: 0, paid: 0, pending: 0 } })

    const years = ['2023', '2024', '2025', '2026']
    const yearlyMap: Record<string, { approved: number; paid: number; pending: number }> = {}
    years.forEach(y => { yearlyMap[y] = { approved: 0, paid: 0, pending: 0 } })

    payments.forEach(p => {
      const amt = Number(p.amount) || 0
      const isPaid = p.status === 'Paid'
      const isPending = p.status === 'Pending' || p.status === 'Processing'
      const pDate = p.paymentDate ? new Date(p.paymentDate) : new Date()
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][pDate.getDay()]
      const monthName = months[pDate.getMonth()]
      const yearStr = String(pDate.getFullYear())

      if (weeklyMap[dayName]) {
        weeklyMap[dayName].approved += amt
        if (isPaid) weeklyMap[dayName].paid += amt
        if (isPending) weeklyMap[dayName].pending += amt
      }
      if (monthlyMap[monthName]) {
        monthlyMap[monthName].approved += amt
        if (isPaid) monthlyMap[monthName].paid += amt
        if (isPending) monthlyMap[monthName].pending += amt
      }
      if (yearlyMap[yearStr]) {
        yearlyMap[yearStr].approved += amt
        if (isPaid) yearlyMap[yearStr].paid += amt
        if (isPending) yearlyMap[yearStr].pending += amt
      }
    })

    return {
      weekly: Object.keys(weeklyMap).map(k => ({ period: k, ...weeklyMap[k] })),
      monthly: Object.keys(monthlyMap).map(k => ({ period: k, ...monthlyMap[k] })),
      yearly: Object.keys(yearlyMap).map(k => ({ period: k, ...yearlyMap[k] })),
    }
  }, [payments])

  // ─── Manager Actions ────────────────────────────────────────────────────────

  const acceptRequest = useCallback((id: string) => {
    const req = allRequestsRef.current.find(r => r.id === id)
    if (!req) return
    // Single source of truth: update backendRequests, derived views update via useMemo
    setBackendRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'pending_approval' } : r))
  }, [])

  const rejectRequest = useCallback((id: string, reason: string, notes?: string) => {
    const comments = notes ? `${reason} - ${notes}` : reason
    rejectRequestApi(id, comments)
      .then(() => {
        refreshManagerBackendData()
        triggerGlobalDataSync('workflow_transition')
      })
      .catch((e) => console.warn('Backend reject warning:', e))

    setBackendRequests(prev => prev.map(r => r.id === id ? {
      ...r,
      status: 'rejected',
      rejectionReason: reason,
      rejectedBy: 'Sarah Manager',
      rejectedDate: new Date().toISOString().split('T')[0],
      description: notes || r.description,
    } : r))
  }, [])

  const recommendToFinance = useCallback((id: string, reason: string) => {
    const safeReason = reason && reason.trim().length > 0 ? reason : 'Recommended to Higher Authority for financial review and executive approval.'
    recommendToFinanceApi(id, safeReason)
      .then(() => {
        refreshManagerBackendData()
        triggerGlobalDataSync('workflow_transition')
      })
      .catch((e) => console.warn('Backend recommend warning:', e))

    setBackendRequests(prev => prev.map(r => r.id === id ? {
      ...r,
      status: 'finance_review',
      recommendationReason: reason,
      recommendedBy: 'Procurement Manager',
      recommendedDate: new Date().toISOString().split('T')[0],
      financeStatus: 'Awaiting Finance Action',
    } : r))
  }, [])

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

    const approvedAmountVal = Number(finalParams.approvedAmount) || Number(req.amount) || 0
    const isSoftware = req.category?.toLowerCase().includes('software') || req.category?.toLowerCase().includes('saas') || req.request_type === 'software'

    // Optimistic update via single source of truth
    setBackendRequests(prev => prev.map(r => r.id === id ? {
      ...r,
      status: isSoftware ? 'approved' : 'finance_review',
      raw_status: isSoftware ? 'MANAGER_APPROVED' : 'FINANCE_REVIEW',
      currentStage: isSoftware ? 7 : 3,
      currentlyWith: isSoftware ? 'Team Lead — Pay Now (Mock) Ready' : 'Finance Desk',
      currently_with: isSoftware ? 'Team Lead — Pay Now (Mock) Ready' : 'Finance Desk',
      financeStatus: isSoftware ? undefined : 'Awaiting Finance Action',
      approvedBy: finalParams.approvedBy,
      approvedDate: today,
      description: notes || r.description,
      amount: approvedAmountVal,
      vendor: finalParams.vendor || r.vendor,
      costCenter: finalParams.costCenter || r.costCenter,
      approvalParams: finalParams
    } : r))

    approveRequestApi(id, {
      approved_amount: approvedAmountVal,
      cost_center: finalParams.costCenter,
      budget_available: finalParams.budgetAvailable === 'Yes',
      vendor: finalParams.vendor,
      comments: notes || finalParams.approvalComments,
    })
      .then(() => {
        refreshManagerBackendData()
        triggerGlobalDataSync('workflow_transition')
      })
      .catch(e => {
        console.warn('Manager approve API sync error:', e)
        refreshManagerBackendData()
      })
  }, [refreshManagerBackendData])

  const addRFQ = useCallback(async (rfqData: RFQ) => {
    try {
      // Optimitically add it locally so it appears immediately
      setRfqs(prev => [rfqData, ...prev])
      
      // Submit to backend
      const payload = {
        title: rfqData.title,
        deadline: rfqData.deadline,
        terms: rfqData.remarks,
        status: rfqData.status === 'draft' ? 'New' : (rfqData.status === 'sent' ? 'Open' : 'New'),
        purchase_request: rfqData.remarks?.includes('Mapped from Approved PR: ') 
            ? rfqData.remarks.split('Mapped from Approved PR: ')[1]
            : null,
        invited_vendors: rfqData.vendors.map(v => v.name)
      }
      const response = await createRFQApi(payload)
      
      // Update local PR stage to show tracking progress
      if (payload.purchase_request) {
          const prId = payload.purchase_request
          const updateReq = (r: ProcurementRequest) => r.id === prId ? { ...r, status: 'rfq_sent' as RequestStatus, currentStage: 4 } : r
          // Single source of truth update
          setBackendRequests(prev => prev.map(updateReq))
      }
      
      // Force a re-fetch to ensure data is perfectly in sync with the backend
      refreshManagerBackendData()
    } catch (error: any) {
      console.error("Failed to save RFQ to backend:", error)
      window.alert("Failed to save RFQ! Error: " + (error.message || error.toString()))
      // On failure, we might want to revert the optimistic update or show an error
      refreshManagerBackendData() // re-fetch to restore state
    }
  }, [refreshManagerBackendData])

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

      setBackendRequests(prev => prev.map(matchReq))
    }
  }, [quotations])

  const sendToFinance = useCallback((id: string, message?: string) => {
    forwardToFinanceApi(id, message || 'Forwarded to Finance Directorate for budget reservation and disbursement.')
      .then(() => {
        refreshManagerBackendData()
        triggerGlobalDataSync('workflow_transition')
      })
      .catch(e => console.warn('Forward to finance API error:', e))

    const req = financeReview.find(r => r.id === id) ||
      recommendedToFinance.find(r => r.id === id) ||
      allRequestsRef.current.find(r => r.id === id)
    if (req) {
      setBackendRequests(prev => prev.map(r => r.id === id ? {
        ...r,
        status: 'sent_to_finance',
        financeStatus: 'Sent to Finance',
        financeComment: message,
      } : r))
    }
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
      setBackendRequests(prev => prev.map(updateReq))
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
      setBackendRequests(prev => prev.map(updateReq))
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

  const approveFinanceRequest = useCallback((
    id: string,
    comment?: string,
    actor = 'Mark Finance Officer',
    approvalParams?: ApprovalParameters
  ) => {
    const req = financeReview.find(r => r.id === id) || allRequests.find(r => r.id === id)
    if (!req) return
    const now = new Date().toISOString()
    const today = now.split('T')[0]

    const effectiveApprovedAmount = approvalParams?.approvedAmount ?? ((req as any).finance_approved_amount || req.amount)

    // 1. Dispatch backend API call with persisted finance_approved_amount
    approveFinanceRequestApi(id, {
      finance_approved_amount: effectiveApprovedAmount,
      approved_amount: effectiveApprovedAmount,
      cost_center: approvalParams?.costCenter || req.costCenter,
      budget_code: (approvalParams as any)?.budgetCode || (req as any).budget_code || (req as any).budgetCode,
      vendor: approvalParams?.vendor || req.vendor,
      comments: comment || approvalParams?.approvalComments,
    })
      .then(() => {
        refreshManagerBackendData()
        triggerGlobalDataSync('workflow_transition')
      })
      .catch(e => console.warn('Finance approve API sync error:', e))

    // 2. Optimistic update via single source of truth
    setBackendRequests(prev => prev.map(r => r.id === id ? {
      ...r,
      amount: effectiveApprovedAmount,
      status: 'finance_approved',
      raw_status: 'FINANCE_APPROVED',
      financeStatus: 'Approved',
      financeApprovedBy: actor,
      financeApprovedDate: today,
      financeComment: comment || 'Budget verified and approved by Finance.',
    } : r))

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
        amount: effectiveApprovedAmount,
        paymentStatus: 'Pending',
      },
      ...prev,
    ])
  }, [refreshManagerBackendData])

  const processRequestPayment = useCallback(async (
    id: string,
    payload: {
      final_payable_amount: number
      payment_method?: string
      payment_reference: string
      payment_date?: string
      payment_remarks?: string
    }
  ) => {
    try {
      await processPaymentApi(id, payload)
      await refreshManagerBackendData()
      triggerGlobalDataSync('workflow_transition')
    } catch (err) {
      console.error('Failed to process payment:', err)
      throw err
    }
  }, [refreshManagerBackendData])

  const rejectFinanceRequest = useCallback((id: string, reason: string, comment?: string, actor = 'Mark Finance Officer') => {
    const req = financeReview.find(r => r.id === id)
    if (!req) return
    const today = new Date().toISOString().split('T')[0]

    // 1. Dispatch backend API call
    rejectFinanceRequestApi(id, reason, comment)
      .then(() => {
        refreshManagerBackendData()
        triggerGlobalDataSync('workflow_transition')
      })
      .catch(e => console.warn('Finance reject API sync error:', e))

    // 2. Optimistic update via single source of truth
    setBackendRequests(prev => prev.map(r => r.id === id ? {
      ...r,
      status: 'finance_rejected',
      rejectionReason: reason,
      rejectedBy: actor,
      rejectedDate: today,
      financeStatus: 'Rejected',
      financeComment: comment,
    } : r))

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
  }, [])

  const sendBackFinanceRequest = useCallback((id: string, comments: string, actor = 'Mark Finance Officer') => {
    const req = financeReview.find(r => r.id === id) || allRequests.find(r => r.id === id)
    if (!req) return
    const today = new Date().toISOString().split('T')[0]

    sendBackFinanceRequestApi(id, comments)
      .then(() => {
        refreshManagerBackendData()
        triggerGlobalDataSync('workflow_transition')
      })
      .catch(e => console.warn('Finance send back API sync error:', e))

    setBackendRequests(prev => prev.map(r => r.id === id ? {
      ...r,
      status: 'clarification_requested',
      financeStatus: 'Sent Back by Finance',
    } : r))

    setFinanceAuditHistory(prev => [
      {
        id: `AUD-${Date.now()}`,
        requestId: req.id,
        requestTitle: req.title,
        actor,
        action: 'SENT_BACK',
        timestamp: `${today} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        reason: 'Sent back for correction',
        comment: comments,
        amount: req.amount,
      },
      ...prev,
    ])
  }, [financeReview, allRequests])

  const holdFinanceRequest = useCallback((id: string, reason: string, actor = 'Mark Finance Officer') => {
    const today = new Date().toISOString().split('T')[0]
    setBackendRequests(prev => prev.map(r => {
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
    setBackendRequests(prev => prev.map(r => {
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

    // Dispatch backend API call to update PostgreSQL
    recommendToAdminApi(id, reason, comment || reason, base.amount)
      .then(() => {
        refreshManagerBackendData()
        triggerGlobalDataSync('workflow_transition')
      })
      .catch((e) => console.warn('Backend recommend to admin error:', e))

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

    // 1. Single source optimistic update
    setBackendRequests(prev => prev.map(r => r.id === id ? record : r))

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

    const approvedReq: ProcurementRequest = {
      ...req,
      status: 'approved',
      financeStatus: 'Approved',
      approvalLevel: 'Admin Approved',
      approvedBy: actor,
      approvedDate: today,
      financeApprovedBy: req.financeApprovedBy || actor,
      financeApprovedDate: req.financeApprovedDate || today,
      financeComment: comment || 'Executive authority approval ratified.',
      paymentStatus: 'Pending',
      extra_fields: {
        ...(req.extra_fields || {}),
        admin_approved: true,
        finance_status: 'Approved',
        final_approval_by: 'ADMIN',
      },
      history: [
        {
          date: new Date().toISOString(),
          actorRole: 'Admin',
          actorName: actor,
          action: 'ADMIN_APPROVE',
          remark: comment || 'Executive authority approval ratified.',
        },
        ...(req.history || [])
      ]
    }

    // Single source optimistic update
    setBackendRequests(prev => prev.map(r => (r.id === id || String(r.id) === String(id) || (r as any).request_id === id) ? approvedReq : r))

    // 1. Dispatch backend API call
    approveAdminRequestApi(id, comment, req.amount)
      .then((updated) => {
        if (updated && (updated.id || updated.request_id)) {
          setBackendRequests(prev => prev.map(r => (r.id === id || String(r.id) === String(updated.id) || r.id === updated.request_id) ? {
            ...r,
            ...updated,
            status: 'approved',
            financeStatus: 'Approved',
            approvalLevel: 'Admin Approved',
            extra_fields: {
              ...(r.extra_fields || {}),
              ...(updated.extra_fields || {}),
              admin_approved: true,
              finance_status: 'Approved',
              final_approval_by: 'ADMIN',
            }
          } : r))
        }
        refreshManagerBackendData()
        triggerGlobalDataSync('workflow_transition')
      })
      .catch(e => console.warn('Admin approve API sync error:', e))

    // 3. Determine workflow type: Software vs Hardware
    const wfType = detectWorkflowType(req.category, req.title)
    const isSoftware = wfType === 'SOFTWARE'

    // 4. For Software requests: Auto-queue directly into Payments (bypasses RFQ/PO/GRN/Invoice)
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

    // 5. Update backendRequests directly
    setBackendRequests(prev => prev.map(r => r.id === id ? approvedReq : r))

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

    // 1. Dispatch backend API call
    rejectAdminRequestApi(id, comment ? `${reason} - ${comment}` : reason)
      .then(() => {
        refreshManagerBackendData()
        triggerGlobalDataSync('workflow_transition')
      })
      .catch(e => console.warn('Admin reject API sync error:', e))

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

    setBackendRequests(prev => prev.map(r => r.id === id ? rejectedReq : r))

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
  }, [financeReview, allRequests, recommendedToAdmin])

  const adminReturnRequest = useCallback((
    id: string,
    feedback: string,
    actor = 'Priyanka Sharma (Admin)'
  ) => {
    const today = new Date().toISOString().split('T')[0]

    // 1. Dispatch backend API call
    sendBackAdminRequestApi(id, feedback)
      .then(() => {
        refreshManagerBackendData()
        triggerGlobalDataSync('workflow_transition')
      })
      .catch(e => console.warn('Admin return API sync error:', e))

    const returnedReq: ProcurementRequest = {
      ...(allRequests.find(r => r.id === id) || { id, title: id, requester: 'Requester', department: 'General', category: 'General', amount: 0, date: today, priority: 'Medium' as const }),
      status: 'clarification_requested',
      financeStatus: 'Returned by Admin',
      clarificationMessage: feedback,
      financeComment: feedback,
    }

    setBackendRequests(prev => prev.map(r => r.id === id ? returnedReq : r))

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
      setBackendRequests(prev => prev.map(r => {
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
      setBackendRequests(prev => prev.map(r => {
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

    setBackendRequests(prev => prev.map(updateReq))

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

    setBackendRequests(prev => prev.map(updateReq))

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

    setBackendRequests(prev => prev.map(updateReq))

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

    setBackendRequests(prev => prev.map(updateReq))

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

    setBackendRequests(prev => prev.map(markCompleted))

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
      refreshData: refreshManagerBackendData,
      pendingFinancialApprovals,
      approvedFinanceRequests,
      rejectedFinanceRequests,
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
      processRequestPayment,
      rejectFinanceRequest,
      sendBackFinanceRequest,
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
