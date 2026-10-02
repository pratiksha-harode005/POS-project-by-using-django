import React, { createContext, useContext, useState, useEffect } from 'react'
import { getTeamLeadRequests, createTeamLeadRequest, resubmitTeamLeadRequest } from '../api/teamleadApi'
import { apiClient } from '../api/client'
import { triggerGlobalDataSync, subscribeGlobalDataSync } from '../utils/syncUtils'
import { sortRequestsNewestFirst } from '../utils/workflowUtils'

export interface ApprovalStep {
  date: string
  actorRole: string
  actorName: string
  action: string
  remark?: string
}

export interface PurchaseRequest {
  id: string
  title: string
  category: string
  subcategory: string
  description: string
  quantity: number
  estimatedCost: number
  requiredBy: string
  department: string
  deliveryLocation: string
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  preferredVendor?: string
  justification: string
  attachmentName?: string
  attachmentCount: number
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Returned' | 'In Procurement' | 'Completed' | 'Payment Completed' | 'Payment Approved' | 'Payment Processed' | 'Payment Justification Submitted' | 'Payment Justified'
  currentStage: number
  date: string
  lastUpdated: string
  returnReason?: string
  currentlyWith: { role: string; name: string }
  flowType: 'A' | 'B'
  extraFields?: Record<string, any>
  history: ApprovalStep[]
  deliveryRef?: string
  expectedDelivery?: string
  poRef?: string
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
  payment_status?: string
  payment_notes?: string
  confirmed_by_team_lead?: boolean
  confirmed_at?: string
  timeline?: any[]
  final_approval_by?: string
  approval_path?: string
  createdAt?: string
  dbId?: number
  extra_fields?: Record<string, any>
  payment_justification_detail?: any
  request_operation?: string
  created_by_detail?: any
  department_detail?: any
  requested_amount?: number
  request_id?: string
  rawRequest?: any
  subscription_type?: string
  renewalCycle?: string
  renewal_cycle?: string
  renewal_eligibility?: any
}

export interface ReceiptDetails {
  itemName: string
  actualAmount: number
  purchaseDate: string
  fileName: string
  notes?: string
  submittedAt: string
}

export interface ReceiptSubmissionPayload {
  itemName: string
  actualAmount: number
  purchaseDate: string
  file: File
  notes?: string
}

export interface PaymentRecord {
  id: string
  requestId: string
  title: string
  vendor: string
  amount: number
  status: 'Processing' | 'Paid' | 'Awaiting Receipt' | string
  dueDate: string
  paymentStage: string
  flowType: 'A' | 'B'
  releaseDate?: string
  releasedBy?: { role: string; name: string }
  releaseReason?: string
  receiptUploaded?: boolean
  receiptFileName?: string
  receiptDetails?: ReceiptDetails
  purchaseRequestDetail?: any
  payment_id?: string
  reference_number?: string
  payment_date?: string
  vendor_name?: string
  payment_method?: string
  paymentMethod?: string
}

export interface NotificationRecord {
  id: number
  title: string
  message: string
  timestamp: string
  dateGroup: 'Today' | 'Yesterday' | 'Earlier this week' | 'Older'
  isRead: boolean
  requestId?: string
  type: 'Approvals' | 'Status updates' | 'Vendor activity' | 'Payments'
  targetRole?: string
}

export interface ExtendedProfile {
  firstName: string
  lastName: string
  email: string
  phone: string
  workLocation: string
  jobTitle: string
  department: string
  employeeId: string
  dateOfJoining: string
  avatarUrl: string | null
  role: string
  accountCreated: string
  lastLogin: string
  accountStatus: string
  twoFactorEnabled: boolean
  loginHistory: Array<{ device: string; location: string; timestamp: string }>
}

interface ProcurementContextType {
  requests: PurchaseRequest[]
  payments: PaymentRecord[]
  notifications: NotificationRecord[]
  profile: ExtendedProfile
  addRequest: (req: Omit<PurchaseRequest, 'id' | 'date' | 'lastUpdated' | 'currentlyWith' | 'history'> & { id?: string }) => Promise<PurchaseRequest>
  refreshBackendRequests: () => Promise<void>
  resubmitRequest: (id: string, updatedData?: Partial<PurchaseRequest>) => void
  uploadReceipt: (paymentId: string, receiptData: ReceiptSubmissionPayload | File) => void
  assignVendorToRequest: (requestId: string, vendorId: string, vendorName: string, notes?: string) => void
  updateVendorPOStatus: (poId: string, newStatus: 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered', trackingRef?: string) => void
  sendRFQToMultipleVendors: (requestId: string) => void
  markNotificationRead: (id: number) => void
  isPaymentsLoading: boolean
  paymentsError: string | null
  markAllNotificationsRead: () => void
  releaseFinancePayment: (paymentIdOrPoRef: string) => void
  updateNotificationPreferences: (prefs: Record<string, boolean>) => void
  notificationPreferences: Record<string, boolean>
  updateProfile: (data: Partial<ExtendedProfile>) => void
}

const INITIAL_REQUESTS: PurchaseRequest[] = []

const INITIAL_PAYMENTS: PaymentRecord[] = []

const INITIAL_NOTIFICATIONS: NotificationRecord[] = []

const INITIAL_PROFILE: ExtendedProfile = {
  firstName: 'Alex',
  lastName: 'Lead',
  email: 'tl@procurementos.com',
  phone: '+91 98765 11111',
  workLocation: 'Pune HQ, 4th Floor',
  jobTitle: 'Engineering Lead',
  department: 'IT & Infrastructure',
  employeeId: 'EMP-TL-8042',
  dateOfJoining: '2024-03-15',
  avatarUrl: null,
  role: 'TEAM_LEAD',
  accountCreated: '2024-03-15',
  lastLogin: 'Today, 11:30 AM',
  accountStatus: 'Active',
  twoFactorEnabled: true,
  loginHistory: [
    { device: 'Chrome on Windows 11', location: 'Pune, India', timestamp: '2026-09-11 11:30 AM' },
    { device: 'Safari on macOS', location: 'Pune, India', timestamp: '2026-09-10 09:15 AM' },
    { device: 'Mobile App on Android', location: 'Mumbai, India', timestamp: '2026-09-08 04:20 PM' },
  ],
}

const ProcurementContext = createContext<ProcurementContextType | undefined>(undefined)

export const ProcurementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(true)
  const [paymentsError, setPaymentsError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [profile, setProfile] = useState<ExtendedProfile>(INITIAL_PROFILE)
  const [notificationPreferences, setNotificationPreferences] = useState<Record<string, boolean>>({
    inAppApprovals: true,
    inAppStatus: true,
    inAppPayments: true,
    inAppVendor: true,
    emailApprovals: true,
    emailStatus: true,
    emailPayments: true,
    emailVendor: false,
  })

  // No longer syncing to localStorage

  const isFetchingRef = React.useRef(false)

  // Dynamic fetch from Django REST API backend
  const refreshBackendRequests = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setIsPaymentsLoading(false)
      return
    }
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      // PERFORMANCE FIX: Fetch requests and payments in parallel.
      // Previously requests were awaited first, then payments — doubling round-trip time.
      // Now both kick off simultaneously and we process each result when both arrive.
      const [requestsResult, paymentsResult] = await Promise.allSettled([
        getTeamLeadRequests(),
        apiClient.get('/payments/', { params: { page_size: 100 } })
      ])

      const data = requestsResult.status === 'fulfilled' ? requestsResult.value : null
      const list = Array.isArray(data) ? data : data?.results || []
      const mapped: PurchaseRequest[] = list.map((item: any) => {

        let normalizedStatus: PurchaseRequest['status'] = 'Pending'
        const bs = (item.status || '').toUpperCase()
        if (bs === 'PAYMENT_COMPLETED') {
          normalizedStatus = 'Payment Completed'
        } else if (bs === 'COMPLETED' || bs === 'TEAM_LEAD_CONFIRMED' || bs === 'REQUEST_COMPLETED') {
          normalizedStatus = 'Completed'
        } else if (bs === 'ADMIN_APPROVED' || bs === 'PAYMENT_APPROVED' || bs === 'APPROVED' || bs === 'MANAGER_APPROVED' || bs === 'FINANCE_APPROVED') {
          normalizedStatus = 'Approved'
        } else if (bs === 'PAYMENT_PROCESSED') {
          normalizedStatus = 'Payment Processed'
        } else if (bs === 'PAYMENT_JUSTIFICATION_SUBMITTED') {
          normalizedStatus = 'Payment Justification Submitted'
        } else if (bs === 'PAYMENT_JUSTIFIED' || bs === 'MANAGER_VERIFIED' || bs === 'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT') {
          normalizedStatus = 'Payment Justified'
        } else if (bs === 'REJECTED' || bs === 'FINANCE_REJECTED') {
          normalizedStatus = 'Rejected'
        } else if (bs === 'RETURNED' || bs === 'SENT_BACK') {
          normalizedStatus = 'Returned'
        } else if (bs === 'IN PROCUREMENT') {
          normalizedStatus = 'In Procurement'
        } else if (bs === 'DRAFT') {
          normalizedStatus = 'Draft'
        }

        let currentlyWithRole = 'Manager'
        let currentlyWithName = 'Sarah Manager'
        if (bs === 'PAYMENT_COMPLETED') {
          currentlyWithRole = 'Team Lead'
          currentlyWithName = 'Awaiting Your Confirmation'
        } else if (bs === 'COMPLETED' || bs === 'TEAM_LEAD_CONFIRMED' || bs === 'REQUEST_COMPLETED') {
          currentlyWithRole = 'Completed'
          currentlyWithName = 'Procurement Completed'
        } else if (bs === 'ADMIN_APPROVED') {
          currentlyWithRole = 'Team Lead'
          currentlyWithName = 'Pay Now (Mock) Ready'
        } else if (bs === 'PAYMENT_APPROVED') {
          currentlyWithRole = 'Team Lead'
          currentlyWithName = 'Awaiting Payment Justification'
        } else if (bs === 'PAYMENT_PROCESSED') {
          currentlyWithRole = 'Team Lead'
          currentlyWithName = 'Awaiting Payment Justification'
        } else if (bs === 'PAYMENT_JUSTIFICATION_SUBMITTED') {
          currentlyWithRole = 'Manager'
          currentlyWithName = 'Payment Justification Pending Verification'
        } else if (bs === 'PAYMENT_JUSTIFIED' || bs === 'MANAGER_VERIFIED' || bs === 'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT') {
          currentlyWithRole = 'Team Lead'
          currentlyWithName = 'Final Acknowledgment Required'
        } else if (bs === 'RECOMMENDED_TO_ADMIN' || bs === 'FINANCE_RECOMMENDED_TO_ADMIN' || bs === 'ADMIN_REVIEW') {
          currentlyWithRole = 'Admin'
          currentlyWithName = 'Executive Administrator'
        } else if (bs === 'FINANCE_REVIEW' || bs === 'FINANCE_RECOMMENDED' || bs === 'RECOMMENDED_TO_FINANCE' || bs === 'MANAGER_RECOMMENDED_TO_FINANCE' || bs === 'FINANCE_APPROVED') {
          currentlyWithRole = 'Finance'
          currentlyWithName = 'Finance Department'
        } else if (bs === 'SENT_BACK' || bs === 'RETURNED') {
          currentlyWithRole = 'Team Lead'
          currentlyWithName = 'Awaiting Re-submission'
        } else if (normalizedStatus === 'Approved' || bs === 'MANAGER_APPROVED') {
          const isSoftReq = (
            (item.category || '').toLowerCase().includes('software') ||
            (item.category || '').toLowerCase().includes('saas') ||
            (item.category || '').toLowerCase().includes('cloud') ||
            (item.category || '').toLowerCase().includes('license') ||
            (item.category || '').toLowerCase().includes('subscription') ||
            Boolean(item.software_name) ||
            item.flow_type === 'B'
          )
          if (isSoftReq) {
            currentlyWithRole = 'Team Lead'
            currentlyWithName = 'Pay Now (Mock) Ready'
          } else {
            currentlyWithRole = 'Procurement Sourcing Desk'
            currentlyWithName = 'Sourcing Team (RFQ Sent)'
          }
        }

        if (item.currently_with) {
          const parts = item.currently_with.split('—').map((s: string) => s.trim())
          if (parts.length >= 2) {
            currentlyWithRole = parts[0]
            currentlyWithName = parts.slice(1).join('—').trim()
          } else if (parts.length === 1 && parts[0]) {
            currentlyWithName = parts[0]
          }
        }

        const isSoftReq = (
          (item.category || '').toLowerCase().includes('software') ||
          (item.category || '').toLowerCase().includes('saas') ||
          (item.category || '').toLowerCase().includes('cloud') ||
          (item.category || '').toLowerCase().includes('license') ||
          (item.category || '').toLowerCase().includes('subscription') ||
          Boolean(item.software_name) ||
          item.flow_type === 'B'
        )

        let effectiveCurrentStage = item.current_stage || 1
        if (isSoftReq) {
          if (item.current_stage) {
            effectiveCurrentStage = item.current_stage
          } else if (bs === 'ADMIN_APPROVED' || bs === 'PAYMENT_APPROVED') {
            effectiveCurrentStage = 7
          } else if (bs === 'PAYMENT_PROCESSED') {
            effectiveCurrentStage = 9
          } else if (bs === 'PAYMENT_JUSTIFICATION_SUBMITTED') {
            effectiveCurrentStage = 10
          } else if (bs === 'PAYMENT_JUSTIFIED' || bs === 'MANAGER_VERIFIED' || bs === 'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT') {
            effectiveCurrentStage = 11
          } else if (bs === 'REQUEST_COMPLETED' || bs === 'COMPLETED') {
            effectiveCurrentStage = 12
          }
        } else {
          if (normalizedStatus === 'Approved' || bs === 'IN PROCUREMENT' || bs === 'IN_PROCUREMENT') {
            effectiveCurrentStage = Math.max(item.current_stage ?? 4, 4)
          }
        }

        const effectiveCost = Number(
          item.finance_approved_amount ||
          item.approved_amount ||
          item.total_estimated_cost ||
          item.requested_amount ||
          item.existing_cost
        ) || 0

        return {
          id: item.request_id || item.id,
          title: item.title,
          category: item.category,
          subcategory: item.subcategory || 'General',
          description: item.description || '',
          quantity: item.quantity || 1,
          estimatedCost: effectiveCost,
          requiredBy: item.required_by || new Date().toISOString().split('T')[0],
          department: item.department_detail?.name || 'IT & Infrastructure',
          deliveryLocation: item.delivery_location || 'Pune HQ',
          priority: item.priority || 'Medium',
          preferredVendor: item.preferred_vendor || item.vendor || '',
          justification: item.justification || '',
          attachmentCount: item.attachments ? 1 : 0,
          status: normalizedStatus,
          currentStage: effectiveCurrentStage,
          date: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          createdAt: item.created_at,
          dbId: item.id,
          lastUpdated: item.updated_at ? item.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
          currentlyWith: { role: currentlyWithRole, name: currentlyWithName },
          flowType: item.flow_type || 'A',
          extraFields: item.extra_fields || {},
          extra_fields: item.extra_fields || {},
          raw_status: item.status,
          can_pay_mock: Boolean(item.can_pay_mock),
          is_payment_eligible: Boolean(item.is_payment_eligible),
          can_acknowledge: Boolean(item.can_acknowledge || item.is_awaiting_acknowledgement),
          is_awaiting_acknowledgement: Boolean(item.is_awaiting_acknowledgement || item.can_acknowledge),
          approved_amount: item.approved_amount,
          requested_amount: Number(item.requested_amount ?? item.total_estimated_cost ?? 0),
          request_id: item.request_id || item.id,
          rawRequest: item,
          vendor: item.vendor,
          total_estimated_cost: item.total_estimated_cost,
          payment_justification_detail: item.payment_justification_detail,
          request_operation: item.request_operation,
          created_by_detail: item.created_by_detail,
          department_detail: item.department_detail,
          request_type: item.request_type,
          software_name: item.software_name,
          current_plan: item.current_plan,
          required_plan: item.required_plan,
          existing_cost: item.existing_cost,
          business_requirement: item.business_requirement,
          research_estimation: item.research_estimation,
          finance_approved_amount: item.finance_approved_amount,
          payment_method: item.payment_method,
          payment_reference: item.payment_reference,
          payment_date: item.payment_date,
          payment_status: item.payment_status,
          payment_notes: item.payment_notes,
          confirmed_by_team_lead: item.confirmed_by_team_lead,
          confirmed_at: item.confirmed_at,
          timeline: item.timeline || [],
          final_approval_by: item.final_approval_by || item.extra_fields?.final_approval_by,
          approval_path: item.approval_path || item.final_approval_by || item.extra_fields?.final_approval_by,
          renewal_eligibility: item.renewal_eligibility,
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
                actorName: s.actor_detail?.first_name ? `${s.actor_detail.first_name} ${s.actor_detail.last_name}` : 'User',
                action: s.decision || 'Updated',
                remark: s.notes || '',
              }))
            : [],
        }
      })
      const sorted = sortRequestsNewestFirst(mapped)
      // console.log removed — was serializing entire array on every poll tick
      setRequests(sorted)

      try {
        setPaymentsError(null)
        // Use the pre-fetched payments result from the parallel Promise.allSettled above
        const payRes = paymentsResult.status === 'fulfilled' ? paymentsResult.value : null
        const rawPayments = payRes ? (Array.isArray(payRes.data) ? payRes.data : payRes.data?.results || []) : []

        
        const mappedPayments: PaymentRecord[] = rawPayments.map((rp: any) => {
          const req = sorted.find(r => String(r.dbId) === String(rp.purchase_request) || String(r.id) === String(rp.purchase_request))
          
          let st = rp.status
          if (st === 'SUCCESS' || st === 'MOCK_SUCCESS' || st === 'PAID') st = 'Paid'
          if (st === 'Pending' || st === 'Processing') st = 'Processing'
          
          return {
            id: rp.payment_id || String(rp.id),
            requestId: req?.id || String(rp.purchase_request),
            title: req?.title || 'Unknown Request',
            vendor: rp.vendor_name || req?.preferredVendor || rp.vendor_detail?.name || 'Unknown Vendor',
            amount: Number(rp.amount) || 0,
            status: st,
            paymentStage: 'Payment Processed',
            dueDate: req?.requiredBy || rp.payment_date || rp.created_at?.split('T')[0] || '',
            receiptUploaded: Boolean(rp.payment_proof),
            flowType: req?.flowType || 'A',
            releaseReason: rp.notes || '',
            releasedBy: { role: 'System', name: rp.payment_method || 'Bank' },
            receiptDetails: {
              itemName: req?.software_name || req?.title || rp.purchase_request_detail?.software_name || rp.purchase_request_detail?.title || 'Item',
              actualAmount: Number(rp.amount) || 0,
              purchaseDate: rp.payment_date || rp.created_at?.split('T')[0] || '',
              fileName: rp.reference_number || 'Reference',
              notes: rp.notes || '',
              submittedAt: rp.created_at?.split('T')[0] || ''
            },
            purchaseRequestDetail: (() => {
              const base = rp.purchase_request_detail || (req ? { ...req, request_id: req.id } : null) || {}
              if (!base.payment_justification_detail && req?.payment_justification_detail) {
                base.payment_justification_detail = req.payment_justification_detail
              }
              if (!base.extra_fields && (req?.extra_fields || req?.extraFields)) {
                base.extra_fields = req.extra_fields || req.extraFields
              }
              if (!base.created_by_detail && req?.created_by_detail) {
                base.created_by_detail = req.created_by_detail
              }
              if (!base.department_detail && req?.department_detail) {
                base.department_detail = req.department_detail
              }
              return base
            })()
          } as PaymentRecord
        })

        // ALSO: Include all Software/SaaS requests that have completed/approved/justified payment statuses
        const existingReqIds = new Set(mappedPayments.map(p => String(p.requestId)))
        
        sorted.forEach((req: any) => {
          const reqIdStr = String(req.id || '')
          const dbIdStr = String(req.dbId || '')
          if (!existingReqIds.has(reqIdStr) && !existingReqIds.has(dbIdStr)) {
            const isSoft = (
              (req.category || '').toLowerCase().includes('software') ||
              (req.category || '').toLowerCase().includes('saas') ||
              (req.category || '').toLowerCase().includes('cloud') ||
              (req.category || '').toLowerCase().includes('license') ||
              (req.category || '').toLowerCase().includes('subscription') ||
              Boolean(req.software_name) ||
              req.flowType === 'B'
            )
            
            const rawSt = (req.raw_status || req.status || '').toUpperCase()
            const extra = req.extra_fields || req.extraFields || {}
            const pj = req.payment_justification_detail || extra.payment_justification || {}
            const hasPaymentInfo = (
              Boolean(extra.software_receipt_id || extra.receipt_no) ||
              ['REQUEST_COMPLETED', 'COMPLETED', 'TEAM_LEAD_ACKNOWLEDGED', 'TEAM_LEAD_CONFIRMED'].includes(rawSt) ||
              Boolean(extra.team_lead_acknowledged) ||
              Boolean(req.confirmed_by_team_lead) ||
              Boolean(pj.is_acknowledged)
            )

            if (isSoft && hasPaymentInfo) {
              const amt = Number(pj.actual_purchase_amount || pj.final_payable_amount || extra.actual_purchase_amount || extra.final_payable_amount || req.finance_approved_amount || req.approved_amount || req.estimatedCost || 0)
              const receiptId = extra.software_receipt_id || extra.receipt_no || `RCP-SW-${req.id}`
              const refNo = extra.software_receipt_id || extra.receipt_no || req.payment_reference || extra.payment_reference || `TXN-${req.id}`
              const payDate = extra.receipt_generated_at?.split('T')[0] || extra.acknowledged_at?.split('T')[0] || pj.payment_date || extra.mock_payment_date?.split('T')[0] || req.requiredBy || req.date || ''

              let st = 'Paid'
              if (rawSt === 'ADMIN_APPROVED' || rawSt === 'PAYMENT_APPROVED') {
                st = 'Processing'
              }

              mappedPayments.push({
                id: receiptId,
                requestId: req.id,
                title: req.title,
                vendor: pj.vendor_name || req.preferredVendor || req.vendor || 'Microsoft Corporation',
                amount: amt,
                status: st,
                paymentStage: 'Payment Processed',
                dueDate: payDate,
                receiptUploaded: true,
                flowType: req.flowType || 'A',
                releaseReason: req.justification || '',
                releasedBy: { role: 'System', name: pj.payment_method || 'Corporate Credit Card' },
                receiptDetails: {
                  itemName: req.software_name || req.title,
                  actualAmount: amt,
                  purchaseDate: payDate,
                  fileName: refNo,
                  notes: pj.why_required || req.business_requirement || '',
                  submittedAt: payDate
                },
                purchaseRequestDetail: {
                  ...req,
                  request_id: req.id,
                  software_name: req.software_name || req.title,
                  payment_justification_detail: pj || req.payment_justification_detail,
                  extra_fields: req.extra_fields || req.extraFields || {},
                  created_by_detail: req.created_by_detail || { first_name: 'Team', last_name: 'Lead', role: 'Team Lead' },
                  department_detail: req.department_detail || { name: req.department || 'Engineering' }
                }
              } as PaymentRecord)
              existingReqIds.add(reqIdStr)
            }
          }
        })
        
        setPayments(mappedPayments)
      } catch (payErr: any) {
        console.warn('Failed to fetch payments in ProcurementContext', payErr)
        setPaymentsError(payErr?.message || 'Failed to fetch payments')
      }
    } catch (e) {
      console.warn('Backend requests fetch fallback:', e)
      setIsPaymentsLoading(false)
      setPaymentsError('Failed to fetch requests or payments')
    } finally {
      isFetchingRef.current = false
      setIsPaymentsLoading(false)
    }
  }

  useEffect(() => {
    refreshBackendRequests()
    const unsubscribe = subscribeGlobalDataSync(() => {
      refreshBackendRequests()
    })
    
    // Poll every 30 seconds — 5s was hammering the backend (12× per minute per tab).
    // Global sync (subscribeGlobalDataSync) handles immediate cross-tab updates.
    const pollInterval = setInterval(() => {
      refreshBackendRequests()
    }, 30000)

    return () => {
      unsubscribe()
      clearInterval(pollInterval)
    }
  }, [])

  const addRequest = async (
    reqData: Omit<PurchaseRequest, 'id' | 'date' | 'lastUpdated' | 'currentlyWith' | 'history'> & { id?: string }
  ): Promise<PurchaseRequest> => {
    const today = new Date().toISOString().split('T')[0]
    const isDraft = reqData.status === 'Draft'

    const createdData = await createTeamLeadRequest({
      title: reqData.title,
      category: reqData.category,
      subcategory: reqData.subcategory || 'General',
      description: reqData.description,
      quantity: reqData.quantity,
      required_by: reqData.requiredBy || today,
      department: reqData.department || profile.department || 'IT & Infrastructure',
      delivery_location: reqData.deliveryLocation || 'Pune HQ',
      priority: reqData.priority || 'Medium',
      preferred_vendor: reqData.preferredVendor || '',
      justification: reqData.justification || '',
      requested_amount: reqData.estimatedCost || reqData.existing_cost || 0,
      total_estimated_cost: reqData.estimatedCost || reqData.existing_cost || 0,
      flow_type: reqData.flowType || 'A',
      request_type: reqData.request_type,
      software_name: reqData.software_name,
      current_plan: reqData.current_plan,
      required_plan: reqData.required_plan,
      existing_cost: reqData.existing_cost,
      business_requirement: reqData.business_requirement,
      extra_fields: reqData.extraFields || {},
    })

    const actualId = createdData?.request_id || createdData?.id || reqData.id || `REQ-${Date.now()}`

    const newReq: PurchaseRequest = {
      ...reqData,
      id: actualId,
      dbId: createdData?.id,
      createdAt: createdData?.created_at || new Date().toISOString(),
      date: createdData?.created_at ? createdData.created_at.split('T')[0] : today,
      lastUpdated: today,
      status: isDraft ? 'Draft' : 'Pending',
      currentStage: createdData?.current_stage || (isDraft ? 0 : 2),
      currentlyWith: isDraft
        ? { role: 'Team Lead', name: `${profile.firstName} ${profile.lastName} (Draft)` }
        : { role: 'Manager', name: 'Sarah Manager' },
      history: [
        {
          date: `${today} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          actorRole: 'Team Lead',
          actorName: `${profile.firstName} ${profile.lastName}`,
          action: isDraft ? 'Saved Draft' : 'Submitted Request',
          remark: reqData.justification || 'Initial submission',
        },
      ],
    }

    setRequests((prev) => sortRequestsNewestFirst([newReq, ...prev.filter(r => r.id !== actualId)]))
    triggerGlobalDataSync('request_created')
    // PERFORMANCE FIX: Removed duplicate refreshBackendRequests() call here.
    // triggerGlobalDataSync fires refreshBackendRequests via subscribeGlobalDataSync listener.
    // Calling it again here was causing double API fetching on every request submission.


    if (!isDraft) {
      const newNotif: NotificationRecord = {
        id: Date.now(),
        title: `Approval Required for ${actualId}`,
        message: `${newReq.title}${newReq.estimatedCost ? ` (₹${newReq.estimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })})` : ''} awaits Manager Approval.`,
        timestamp: 'Just now',
        dateGroup: 'Today',
        isRead: false,
        requestId: actualId,
        type: 'Approvals',
        targetRole: 'MANAGER',
      }
      setNotifications((prev) => [newNotif, ...prev])
    }

    return newReq
  }

  const resubmitRequest = (id: string, updatedData?: Partial<PurchaseRequest>) => {
    const today = new Date().toISOString().split('T')[0]
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updatedHistory: ApprovalStep = {
            date: `${today} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            actorRole: 'Team Lead',
            actorName: `${profile.firstName} ${profile.lastName}`,
            action: 'Resubmitted Request',
            remark: 'Revised details provided and resubmitted for Manager approval',
          }

          return {
            ...r,
            ...updatedData,
            status: 'Pending',
            currentStage: 1,
            returnReason: undefined,
            lastUpdated: today,
            currentlyWith: { role: 'Manager', name: 'Sarah Manager' },
            history: [...r.history, updatedHistory],
          }
        }
        return r
      })
    )

    setNotifications((prev) => [
      {
        id: Date.now(),
        title: `Approval Required for ${id}`,
        message: `Resubmitted request ${id} is now awaiting Manager approval.`,
        timestamp: 'Just now',
        dateGroup: 'Today',
        isRead: false,
        requestId: id,
        type: 'Approvals',
        targetRole: 'MANAGER',
      },
      ...prev,
    ])

    resubmitTeamLeadRequest(id, updatedData)
      .then(() => {
        refreshBackendRequests()
        window.dispatchEvent(new Event('kss_backend_updated'))
      })
      .catch((err) => console.warn('Backend request resubmit sync error:', err))
  }

  const uploadReceipt = (paymentId: string, receiptData: ReceiptSubmissionPayload | File) => {
    const today = new Date().toISOString().split('T')[0]
    const file = 'file' in receiptData ? receiptData.file : receiptData
    const isPayload = 'itemName' in receiptData

    const receiptObj: ReceiptDetails | undefined = isPayload
      ? {
          itemName: (receiptData as ReceiptSubmissionPayload).itemName,
          actualAmount: (receiptData as ReceiptSubmissionPayload).actualAmount,
          purchaseDate: (receiptData as ReceiptSubmissionPayload).purchaseDate,
          fileName: file.name,
          notes: (receiptData as ReceiptSubmissionPayload).notes,
          submittedAt: today,
        }
      : undefined

    let releasingRole = 'MANAGER'
    let releasingName = 'Sarah Manager'

    setPayments((prev) =>
      prev.map((p) => {
        if (p.id === paymentId) {
          if (p.releasedBy?.role) releasingRole = p.releasedBy.role.toUpperCase()
          if (p.releasedBy?.name) releasingName = p.releasedBy.name
          return {
            ...p,
            status: 'Paid',
            receiptUploaded: true,
            receiptFileName: file.name,
            receiptDetails: receiptObj,
            paymentStage: p.flowType === 'B' ? 'Receipt Submitted (Stage 7/7)' : 'Receipt Uploaded & Verified (Stage 10/10)',
          }
        }
        return p
      })
    )

    const linkedPayment = payments.find((p) => p.id === paymentId)
    if (linkedPayment) {
      if (linkedPayment.releasedBy?.role) releasingRole = linkedPayment.releasedBy.role.toUpperCase()
      if (linkedPayment.releasedBy?.name) releasingName = linkedPayment.releasedBy.name

      const isFlowB = linkedPayment.flowType === 'B'
      const targetStage = isFlowB ? 6 : 9 // Stage 6/7 for Flow B, Stage 9/10 for Flow A

      setRequests((prev) =>
        prev.map((r) => {
          if (r.id === linkedPayment.requestId) {
            return {
              ...r,
              status: 'Completed',
              currentStage: targetStage,
              lastUpdated: today,
              currentlyWith: { role: 'Completed', name: 'System Archive' },
              history: [
                ...r.history,
                {
                  date: `${today} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                  actorRole: 'Team Lead',
                  actorName: `${profile.firstName} ${profile.lastName}`,
                  action: 'Submitted Receipt',
                  remark: isPayload
                    ? `Submitted receipt for ${(receiptData as ReceiptSubmissionPayload).itemName} (RS {(
                        receiptData as ReceiptSubmissionPayload
                      ).actualAmount.toLocaleString()}). File: ${file.name}`
                    : `Uploaded receipt (${file.name}) for direct fund release reconciliation.`,
                },
              ],
            }
          }
          return r
        })
      )

      setNotifications((prev) => [
        {
          id: Date.now(),
          title: `Receipt Submitted for ${linkedPayment.requestId}`,
          message: `Team Lead submitted payment receipt (${file.name}) for ${linkedPayment.requestId}. Reconciled by ${releasingName}.`,
          timestamp: 'Just now',
          dateGroup: 'Today',
          isRead: false,
          requestId: linkedPayment.requestId,
          type: 'Payments',
          targetRole: releasingRole,
        },
        ...prev,
      ])
    }
  }

  const assignVendorToRequest = (requestId: string, vendorId: string, vendorName: string, notes?: string) => {
    const today = new Date().toISOString().split('T')[0]
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId || (!requestId && r.status === 'Pending')) {
          return {
            ...r,
            preferredVendor: vendorName,
            status: 'In Procurement',
            currentStage: 5, // Stage 5: Vendor Assigned / PO Issued
            lastUpdated: today,
            currentlyWith: { role: 'Vendor', name: vendorName },
            history: [
              ...r.history,
              {
                date: `${today} ${nowTime}`,
                actorRole: 'Approver',
                actorName: `${profile.firstName} ${profile.lastName}`,
                action: 'Vendor Assigned',
                remark: notes || `Assigned to ${vendorName} (${vendorId}) via AI Recommendation Engine.`,
              },
            ],
          }
        }
        return r
      })
    )

    setNotifications((prev) => [
      {
        id: Date.now(),
        title: `Vendor Assigned for ${requestId}`,
        message: `${vendorName} (${vendorId}) was assigned to ${requestId}. Purchase Order issued.`,
        timestamp: 'Just now',
        dateGroup: 'Today',
        isRead: false,
        requestId: requestId,
        type: 'Vendor activity',
        targetRole: 'VENDOR',
      },
      ...prev,
    ])
  }

  const updateVendorPOStatus = (
    poId: string,
    newStatus: 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered',
    trackingRef?: string
  ) => {
    const today = new Date().toISOString().split('T')[0]
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    let stageNum = 5
    if (newStatus === 'Confirmed') stageNum = 5
    if (newStatus === 'Processing') stageNum = 6
    if (newStatus === 'Shipped') stageNum = 7
    if (newStatus === 'Delivered') stageNum = 8

    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === poId || poId.includes(r.id) || r.status === 'In Procurement') {
          return {
            ...r,
            currentStage: stageNum,
            lastUpdated: today,
            deliveryRef: trackingRef || r.deliveryRef || `TRK-EXPRESS-${Date.now().toString().slice(-5)}`,
            expectedDelivery: r.expectedDelivery || '2026-09-26',
            history: [
              ...r.history,
              {
                date: `${today} ${nowTime}`,
                actorRole: 'Vendor',
                actorName: r.preferredVendor || 'Assigned Vendor',
                action: `PO Status Updated: ${newStatus}`,
                remark: `Vendor updated order status to ${newStatus}${trackingRef ? ` (Tracking: ${trackingRef})` : ''}.`,
              },
            ],
          }
        }
        return r
      })
    )

    setNotifications((prev) => [
      {
        id: Date.now(),
        title: `PO Status Update: ${newStatus}`,
        message: `Order status for ${poId} updated to ${newStatus}. Live tracking updated on requester dashboard.`,
        timestamp: 'Just now',
        dateGroup: 'Today',
        isRead: false,
        requestId: poId,
        type: 'Status updates',
      },
      ...prev,
    ])
  }

  const sendRFQToMultipleVendors = (requestId: string) => {
    const today = new Date().toISOString().split('T')[0]
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'In Procurement',
            currentStage: 4, // Stage 4: RFQ Bidding / Vendor Selection
            lastUpdated: today,
            history: [
              ...r.history,
              {
                date: `${today} ${nowTime}`,
                actorRole: 'Admin',
                actorName: `${profile.firstName} ${profile.lastName}`,
                action: 'RFQ Issued',
                remark: 'RFQ sent to all registered category vendors for competitive bidding.',
              },
            ],
          }
        }
        return r
      })
    )

    setNotifications((prev) => [
      {
        id: Date.now(),
        title: `Multi-Vendor RFQ Issued for ${requestId}`,
        message: `Competitive RFQ bidding opened for request ${requestId}. Registered vendors notified.`,
        timestamp: 'Just now',
        dateGroup: 'Today',
        isRead: false,
        requestId: requestId,
        type: 'Vendor activity',
      },
      ...prev,
    ])
  }

  const markNotificationRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
  }

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const updateNotificationPreferences = (prefs: Record<string, boolean>) => {
    setNotificationPreferences(prefs)
  }

  const releaseFinancePayment = (paymentIdOrPoRef: string) => {
    const today = new Date().toISOString().split('T')[0]
    setPayments((prev) =>
      prev.map((p) => {
        if (p.id === paymentIdOrPoRef || p.requestId === paymentIdOrPoRef) {
          return {
            ...p,
            status: 'Paid',
            releaseDate: today,
            releasedBy: { role: 'FINANCE', name: 'David Finance' },
            paymentStage: 'Payment Disbursed (Stage 9/10)',
          }
        }
        return p
      })
    )
    const paidKeys = JSON.parse(localStorage.getItem('kss_paid_payments') || '[]')
    if (!paidKeys.includes(paymentIdOrPoRef)) {
      localStorage.setItem('kss_paid_payments', JSON.stringify([...paidKeys, paymentIdOrPoRef]))
    }
  }

  const updateProfile = (data: Partial<ExtendedProfile>) => {
    setProfile((prev) => ({ ...prev, ...data }))
  }

  return (
    <ProcurementContext.Provider
      value={{
        requests,
        payments,
        notifications,
        profile,
        addRequest,
        refreshBackendRequests,
        resubmitRequest,
        uploadReceipt,
        assignVendorToRequest,
        updateVendorPOStatus,
        sendRFQToMultipleVendors,
        markNotificationRead,
        markAllNotificationsRead,
        releaseFinancePayment,
        updateNotificationPreferences,
        notificationPreferences,
        updateProfile,
        isPaymentsLoading,
        paymentsError,
      }}
    >
      {children}
    </ProcurementContext.Provider>
  )
}

export const useProcurement = () => {
  const context = useContext(ProcurementContext)
  if (!context) {
    throw new Error('useProcurement must be used within a ProcurementProvider')
  }
  return context
}
