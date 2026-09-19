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
