import React, { createContext, useContext, useState, useEffect } from 'react'
import { getTeamLeadRequests, createTeamLeadRequest, resubmitTeamLeadRequest } from '../api/teamleadApi'

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
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Returned' | 'In Procurement' | 'Completed'
  currentStage: number // 0 to 9 for Flow A, 0 to 6 for Flow B
  date: string
  lastUpdated: string
  returnReason?: string
  currentlyWith: { role: string; name: string }
  flowType: 'A' | 'B' // Flow A: Vendor-paid, Flow B: Funds released to Team Lead
  extraFields?: Record<string, string>
  history: ApprovalStep[]
  deliveryRef?: string
  expectedDelivery?: string
  poRef?: string
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
  status: 'Processing' | 'Paid' | 'Awaiting Receipt'
  dueDate: string
  paymentStage: string
  flowType: 'A' | 'B'
  releaseDate?: string
  releasedBy?: { role: string; name: string }
  releaseReason?: string
  receiptUploaded?: boolean
  receiptFileName?: string
  receiptDetails?: ReceiptDetails
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
  addRequest: (req: Omit<PurchaseRequest, 'id' | 'date' | 'lastUpdated' | 'currentlyWith' | 'history'> & { id?: string }) => PurchaseRequest
  resubmitRequest: (id: string, updatedData?: Partial<PurchaseRequest>) => void
  uploadReceipt: (paymentId: string, receiptData: ReceiptSubmissionPayload | File) => void
  assignVendorToRequest: (requestId: string, vendorId: string, vendorName: string, notes?: string) => void
  updateVendorPOStatus: (poId: string, newStatus: 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered', trackingRef?: string) => void
  sendRFQToMultipleVendors: (requestId: string) => void
  markNotificationRead: (id: number) => void
  markAllNotificationsRead: () => void
  releaseFinancePayment: (paymentIdOrPoRef: string) => void
  updateNotificationPreferences: (prefs: Record<string, boolean>) => void
  notificationPreferences: Record<string, boolean>
  updateProfile: (data: Partial<ExtendedProfile>) => void
}

const INITIAL_REQUESTS: PurchaseRequest[] = [
  {
    id: 'REQ-DEMO-001',
    title: 'High Performance Laptops for Engineering Team',
    category: 'IT Hardware',
    subcategory: 'Laptops',
    description: '10x High-end developer laptops with 32GB RAM & 1TB SSD for new joiners in IT & Core Infrastructure team.',
    quantity: 10,
    estimatedCost: 35000.0,
    requiredBy: '2026-09-30',
    department: 'IT & Infrastructure',
    deliveryLocation: 'Pune HQ, 4th Floor',
    priority: 'High',
    preferredVendor: 'Dell Technologies',
    justification: 'New developer onboarding requirements for Q4 expansion.',
    attachmentName: 'Dell_Laptop_Specs.pdf',
    attachmentCount: 1,
    status: 'In Procurement',
    currentStage: 6, // Product Order
    date: '2026-09-08',
    lastUpdated: '2026-09-10',
    currentlyWith: { role: 'Admin', name: 'Alex Admin' },
    flowType: 'A',
    deliveryRef: 'TRK-DELL-99481',
    expectedDelivery: '2026-09-22',
    history: [
      { date: '2026-09-08 10:00', actorRole: 'Team Lead', actorName: 'Alex Lead', action: 'Submitted Request', remark: 'Initial submission for developer hardware' },
      { date: '2026-09-08 14:30', actorRole: 'Manager', actorName: 'Sarah Manager', action: 'Approved', remark: 'Approved under engineering budget limit' },
      { date: '2026-09-09 09:15', actorRole: 'Finance', actorName: 'David Finance', action: 'Approved Budget Allocation', remark: 'Sufficient CapEx allocated' },
      { date: '2026-09-09 16:00', actorRole: 'Admin', actorName: 'Alex Admin', action: 'RFQ Issued', remark: 'RFQ sent to Dell & HP' },
      { date: '2026-09-10 11:20', actorRole: 'Vendor', actorName: 'Dell Technologies', action: 'Quotation Received', remark: 'RS 35,000 quote accepted' },
      { date: '2026-09-10 15:45', actorRole: 'Admin', actorName: 'Alex Admin', action: 'PO Created & Ordered', remark: 'PO-2026-089 issued to Dell' },
    ],
  },
  {
    id: 'REQ-DEMO-002',
    title: 'Cloud Infrastructure Yearly Renewal',
    category: 'Software & SaaS',
    subcategory: 'AWS Cloud Renewal',
    description: 'Annual AWS Cloud infrastructure commitment renewal for production clusters.',
    quantity: 1,
    estimatedCost: 60000.0,
    requiredBy: '2026-10-01',
    department: 'IT & Infrastructure',
    deliveryLocation: 'N/A (Digital / Cloud Service)',
    priority: 'Urgent',
    preferredVendor: 'Amazon Web Services',
    justification: 'Avoid service disruption for customer facing production SaaS apps.',
    attachmentName: 'AWS_Renewal_Estimate.pdf',
    attachmentCount: 2,
    status: 'Pending',
    currentStage: 1, // Manager Approval
    date: '2026-09-10',
    lastUpdated: '2026-09-10',
    currentlyWith: { role: 'Manager', name: 'Sarah Manager' },
    flowType: 'B', // Subscription direct fund release to TL
    history: [
      { date: '2026-09-10 09:00', actorRole: 'Team Lead', actorName: 'Alex Lead', action: 'Submitted Request', remark: 'Yearly subscription renewal requested' },
    ],
  },
  {
    id: 'REQ-DEMO-003',
    title: 'Ergonomic Desk Chairs for Ops Team',
    category: 'Office Accessories',
    subcategory: 'Chair',
    description: '5x Mesh ergonomic adjustable chairs for Ops team workstations.',
    quantity: 5,
    estimatedCost: 2500.0,
    requiredBy: '2026-09-20',
    department: 'Operations',
    deliveryLocation: 'Pune HQ, 3rd Floor',
    priority: 'Medium',
    preferredVendor: 'Herman Miller Inc.',
    justification: 'Replacing broken seating in office Bay 3.',
    attachmentCount: 0,
    status: 'Returned',
    currentStage: 0, // Returned to creator
    date: '2026-09-05',
    lastUpdated: '2026-09-06',
    returnReason: 'Insufficient details provided regarding chair specifications and model warranty.',
    currentlyWith: { role: 'Team Lead', name: 'Alex Lead (You)' },
    flowType: 'A',
    history: [
      { date: '2026-09-05 11:30', actorRole: 'Team Lead', actorName: 'Alex Lead', action: 'Submitted Request' },
      { date: '2026-09-06 14:10', actorRole: 'Manager', actorName: 'Sarah Manager', action: 'Returned Request', remark: 'Insufficient details provided regarding chair specifications and model warranty.' },
    ],
  },
  {
    id: 'REQ-DEMO-004',
    title: '4K Conference Room Displays',
    category: 'Office Technology',
    subcategory: 'Displays',
    description: '2x 75-inch 4K Smart displays for main conference rooms.',
    quantity: 2,
    estimatedCost: 4200.0,
    requiredBy: '2026-08-20',
    department: 'IT & Infrastructure',
    deliveryLocation: 'Pune HQ, 4th Floor',
    priority: 'Medium',
    preferredVendor: 'Samsung Display Systems',
    justification: 'Upgrade old projectors for client presentations.',
    attachmentName: 'Samsung_Quote.pdf',
    attachmentCount: 1,
    status: 'Completed',
    currentStage: 9, // Payment Disbursed
    date: '2026-08-20',
    lastUpdated: '2026-08-25',
    currentlyWith: { role: 'Completed', name: 'System Archive' },
    flowType: 'A',
    history: [
      { date: '2026-08-20 09:00', actorRole: 'Team Lead', actorName: 'Alex Lead', action: 'Submitted Request' },
      { date: '2026-08-21 11:00', actorRole: 'Manager', actorName: 'Sarah Manager', action: 'Approved' },
      { date: '2026-08-22 15:00', actorRole: 'Finance', actorName: 'David Finance', action: 'Approved' },
      { date: '2026-08-25 17:30', actorRole: 'Finance', actorName: 'David Finance', action: 'Payment Disbursed' },
    ],
  },
  {
    id: 'REQ-DEMO-005',
    title: 'Legacy Server Rack Replacement',
    category: 'IT Hardware',
    subcategory: 'Servers',
    description: 'Complete replacement of legacy datacenter rack units.',
    quantity: 1,
    estimatedCost: 80000.0,
    requiredBy: '2026-08-15',
    department: 'IT & Infrastructure',
    deliveryLocation: 'Pune HQ, Server Room',
    priority: 'Low',
    justification: 'Preventative upgrade for aging server infrastructure.',
    attachmentCount: 0,
    status: 'Rejected',
    currentStage: 1,
    date: '2026-08-15',
    lastUpdated: '2026-08-16',
    returnReason: 'Exceeds current quarterly CapEx ceiling. Defer to next fiscal year budget cycle.',
    currentlyWith: { role: 'Rejected', name: 'System Archive' },
    flowType: 'A',
    history: [
      { date: '2026-08-15 10:00', actorRole: 'Team Lead', actorName: 'Alex Lead', action: 'Submitted Request' },
      { date: '2026-08-16 16:20', actorRole: 'Manager', actorName: 'Sarah Manager', action: 'Rejected Request', remark: 'Exceeds current quarterly CapEx ceiling.' },
    ],
  },
]

const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: 'PAY-2026-001',
    requestId: 'REQ-DEMO-001',
    title: 'High Performance Laptops for Engineering Team',
    vendor: 'Dell Technologies',
    amount: 35000.0,
    status: 'Processing',
    dueDate: '2026-09-20',
    paymentStage: 'Invoice Verified (Stage 8/10)',
    flowType: 'A',
  },
  {
    id: 'PAY-2026-000',
    requestId: 'REQ-DEMO-004',
    title: '4K Conference Room Displays',
    vendor: 'Samsung Display Systems',
    amount: 4200.0,
    status: 'Paid',
    dueDate: '2026-08-25',
    paymentStage: 'Payment Disbursed (Stage 9/10)',
    flowType: 'A',
  },
  {
    id: 'PAY-2026-FLB-01',
    requestId: 'REQ-DEMO-002',
    title: 'Cloud Infrastructure Yearly Renewal',
    vendor: 'Direct Team Lead Advance',
    amount: 60000.0,
    status: 'Awaiting Receipt',
    dueDate: '2026-09-25',
    paymentStage: 'Funds Disbursed to Team Lead',
    flowType: 'B',
    releaseDate: '2026-09-11',
    releasedBy: { role: 'Manager', name: 'Sarah Manager' },
    releaseReason: 'Approved by Manager under engineering CapEx allocation',
    receiptUploaded: false,
  },
]

const INITIAL_NOTIFICATIONS: NotificationRecord[] = [
  {
    id: 1,
    title: 'Request REQ-DEMO-001 Updated',
    message: 'Status changed to In Procurement by Admin. Stage: Product Order (6/10).',
    timestamp: '10 mins ago',
    dateGroup: 'Today',
    isRead: false,
    requestId: 'REQ-DEMO-001',
    type: 'Status updates',
    targetRole: 'TEAM_LEAD',
  },
  {
    id: 2,
    title: 'Approval Required for REQ-DEMO-002',
    message: 'Cloud Infrastructure Yearly Renewal (RS 60,000.00) awaits Manager Approval.',
    timestamp: '1 hour ago',
    dateGroup: 'Today',
    isRead: false,
    requestId: 'REQ-DEMO-002',
    type: 'Approvals',
    targetRole: 'MANAGER',
  },
  {
    id: 3,
    title: 'Quotation Received from Dell Technologies',
    message: 'Quotation QUO-001 submitted for RFQ-001 (RS 35,000.00).',
    timestamp: '3 hours ago',
    dateGroup: 'Today',
    isRead: true,
    requestId: 'REQ-DEMO-001',
    type: 'Vendor activity',
    targetRole: 'TEAM_LEAD',
  },
  {
    id: 4,
    title: 'Funds Disbursed for REQ-DEMO-002',
    message: 'Advance of RS 60,000.00 released to your account for AWS Cloud renewal. Please upload official receipt upon payment.',
    timestamp: 'Yesterday at 4:30 PM',
    dateGroup: 'Yesterday',
    isRead: false,
    requestId: 'REQ-DEMO-002',
    type: 'Payments',
    targetRole: 'TEAM_LEAD',
  },
  {
    id: 5,
    title: 'Request REQ-DEMO-003 Returned',
    message: 'Sarah Manager returned REQ-DEMO-003 for specification revision.',
    timestamp: '3 days ago',
    dateGroup: 'Earlier this week',
    isRead: true,
    requestId: 'REQ-DEMO-003',
    type: 'Status updates',
    targetRole: 'TEAM_LEAD',
  },
]

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
  const [requests, setRequests] = useState<PurchaseRequest[]>(() => {
    const saved = localStorage.getItem('kss_tl_requests')
    return saved ? JSON.parse(saved) : INITIAL_REQUESTS
  })

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem('kss_tl_payments')
    return saved ? JSON.parse(saved) : INITIAL_PAYMENTS
  })

  const [notifications, setNotifications] = useState<NotificationRecord[]>(() => {
    const saved = localStorage.getItem('kss_tl_notifications')
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS
  })

  const [profile, setProfile] = useState<ExtendedProfile>(() => {
    const saved = localStorage.getItem('kss_tl_profile')
    return saved ? JSON.parse(saved) : INITIAL_PROFILE
  })

  const [notificationPreferences, setNotificationPreferences] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('kss_tl_notif_prefs')
    return saved ? JSON.parse(saved) : {
      inAppApprovals: true,
      inAppStatus: true,
      inAppPayments: true,
      inAppVendor: true,
      emailApprovals: true,
      emailStatus: true,
      emailPayments: true,
      emailVendor: false,
    }
  })

  useEffect(() => {
    localStorage.setItem('kss_tl_requests', JSON.stringify(requests))
  }, [requests])

  useEffect(() => {
    localStorage.setItem('kss_tl_payments', JSON.stringify(payments))
  }, [payments])

  useEffect(() => {
    localStorage.setItem('kss_tl_notifications', JSON.stringify(notifications))
  }, [notifications])

  useEffect(() => {
    localStorage.setItem('kss_tl_profile', JSON.stringify(profile))
  }, [profile])

  useEffect(() => {
    localStorage.setItem('kss_tl_notif_prefs', JSON.stringify(notificationPreferences))
  }, [notificationPreferences])

  // Dynamic fetch from Django REST API backend
  const refreshBackendRequests = async () => {
    try {
      const data = await getTeamLeadRequests()
      const list = Array.isArray(data) ? data : data?.results || []
      if (list.length > 0) {
        const mapped: PurchaseRequest[] = list.map((item: any) => ({
          id: item.request_id || item.id,
          title: item.title,
          category: item.category,
          subcategory: item.subcategory || 'General',
          description: item.description || '',
          quantity: item.quantity || 1,
          estimatedCost: Number(item.total_estimated_cost) || 0,
          requiredBy: item.required_by || new Date().toISOString().split('T')[0],
          department: item.department_detail?.name || 'IT & Infrastructure',
          deliveryLocation: item.delivery_location || 'Pune HQ',
          priority: item.priority || 'Medium',
          preferredVendor: item.preferred_vendor || '',
          justification: item.justification || '',
          attachmentCount: item.attachments ? 1 : 0,
          status: item.status || 'Pending',
          currentStage: item.current_stage ?? 1,
          date: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          lastUpdated: item.updated_at ? item.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
          currentlyWith: item.status === 'Pending' ? { role: 'Manager', name: 'Sarah Manager' } : { role: item.status, name: 'System' },
          flowType: item.flow_type || 'A',
          extraFields: item.extra_fields || {},
          history: Array.isArray(item.approval_steps)
            ? item.approval_steps.map((s: any) => ({
                date: s.created_at || '',
                actorRole: s.role || 'User',
                actorName: s.actor_detail?.first_name ? `${s.actor_detail.first_name} ${s.actor_detail.last_name}` : 'User',
                action: s.decision || 'Updated',
                remark: s.notes || '',
              }))
            : [],
        }))
        setRequests(mapped)
      }
    } catch (e) {
      console.warn('Backend requests fetch fallback:', e)
    }
  }

  useEffect(() => {
    refreshBackendRequests()
  }, [])

  const addRequest = (
    reqData: Omit<PurchaseRequest, 'id' | 'date' | 'lastUpdated' | 'currentlyWith' | 'history'> & { id?: string }
  ): PurchaseRequest => {
    const today = new Date().toISOString().split('T')[0]
    const nextId = reqData.id || `REQ-${Math.floor(1000 + Math.random() * 9000)}`
    const isDraft = reqData.status === 'Draft'

    const newReq: PurchaseRequest = {
      ...reqData,
      id: nextId,
      date: today,
      lastUpdated: today,
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

    setRequests((prev) => [newReq, ...prev])

    // Persist to PostgreSQL backend via Django REST API
    createTeamLeadRequest({
      title: reqData.title,
      category: reqData.category,
      subcategory: reqData.subcategory || 'General',
      description: reqData.description,
      quantity: reqData.quantity,
      required_by: reqData.requiredBy || today,
      delivery_location: reqData.deliveryLocation || 'Pune HQ',
      priority: reqData.priority || 'Medium',
      preferred_vendor: reqData.preferredVendor || '',
      justification: reqData.justification || '',
      total_estimated_cost: reqData.estimatedCost || 0,
    })
      .then(() => refreshBackendRequests())
      .catch((e) => console.warn('Backend persist warning:', e))

    if (!isDraft) {
      const newNotif: NotificationRecord = {
        id: Date.now(),
        title: `Approval Required for ${nextId}`,
        message: `${newReq.title} awaits Manager Approval.`,
        timestamp: 'Just now',
        dateGroup: 'Today',
        isRead: false,
        requestId: nextId,
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
