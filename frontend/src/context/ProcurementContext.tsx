import React, { createContext, useContext, useState, useEffect } from 'react'
import { getTeamLeadRequests, createTeamLeadRequest, resubmitTeamLeadRequest } from '../api/teamleadApi'
import { getWorkflowProgression } from '../utils/workflowUtils'

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
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
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

  const normalizeStatus = (raw: string, stageNum: number): PurchaseRequest['status'] => {
    const s = (raw || '').trim().toUpperCase()
    if (s === 'COMPLETED' || s === 'REQUEST_COMPLETED' || s === 'PAYMENT_PROCESSED' || s === 'PAID' || stageNum >= 9) return 'Completed'
    if (s === 'APPROVED' || s === 'MANAGER_APPROVED' || s === 'PAYMENT_APPROVED' || stageNum === 4) return 'Approved'
    if (s === 'REJECTED' || s === 'FINANCE_REJECTED') return 'Rejected'
    if (s === 'RETURNED' || s === 'CLARIFICATION_REQUESTED') return 'Returned'
    if (s === 'IN PROCUREMENT' || s === 'IN_PROCUREMENT' || s === 'RFQ_SENT' || s === 'QUOTES_RECEIVED' || s === 'ASSIGNED_TO_VENDOR' || s === 'DELIVERED' || s === 'INVOICED' || (stageNum >= 4 && stageNum < 9)) return 'In Procurement'
    if (s === 'DRAFT' || stageNum === 0) return 'Draft'
    return 'Pending'
  }

  // Dynamic parallel fetch from Django REST API backend
  const refreshBackendRequests = async () => {
    try {
      const { apiClient } = await import('../api/client')
      const savedRole = (localStorage.getItem('user_role') || 'TEAM_LEAD').toUpperCase()
      const savedProfile = localStorage.getItem('user_profile')
      let notifParams: any = { role: savedRole, page_size: 100 }
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile)
          if (parsed?.username) notifParams = { user: parsed.username, role: savedRole, page_size: 100 }
          if (parsed?.role === 'VENDOR' && parsed?.vendor_id_code) {
            notifParams = { vendor: parsed.vendor_id_code, page_size: 100 }
          }
        } catch {}
      }

      const [reqRes, payRes, notifRes] = await Promise.allSettled([
        apiClient.get('/requests/', { params: { page_size: 1000 } }),
        apiClient.get('/payments/'),
        apiClient.get('/notifications/', { params: notifParams })
      ])

      if (reqRes.status === 'fulfilled') {
        const data = reqRes.value.data
        const list = Array.isArray(data) ? data : data?.results || []
        const mapped: PurchaseRequest[] = list.map((item: any) => {
          const stageNum = item.current_stage !== undefined && item.current_stage !== null ? Number(item.current_stage) : 1
          const rawStatus = item.status || 'Pending'
          const normalized = normalizeStatus(rawStatus, stageNum)
          const prog = getWorkflowProgression({
            currentStage: stageNum,
            status: normalized,
            category: item.category,
            title: item.title,
            history: item.approval_steps,
          })

          const costVal = Number(item.total_estimated_cost ?? item.amount ?? item.estimated_cost ?? item.estimatedCost ?? 0) || 0

          return {
            id: item.request_id || (item.id ? `REQ-${item.id}` : `REQ-${Math.floor(1000 + Math.random() * 9000)}`),
            title: item.title,
            category: item.category,
            subcategory: item.subcategory || '',
            description: item.description || '',
            quantity: item.quantity !== undefined && item.quantity !== null ? item.quantity : 1,
            estimatedCost: costVal,
            requiredBy: item.required_by || new Date().toISOString().split('T')[0],
            department: item.department_detail?.name || 'IT & Infrastructure',
            deliveryLocation: item.delivery_location || 'Pune HQ',
            priority: item.priority || 'Medium',
            preferredVendor: item.preferred_vendor || '',
            justification: item.justification || '',
            attachmentCount: item.attachments ? 1 : 0,
            status: normalized,
            currentStage: stageNum,
            date: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            lastUpdated: item.updated_at ? item.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
            currentlyWith: { role: prog.currentlyWith, name: prog.currentStageName },
            flowType: item.flow_type || 'A',
            extraFields: item.extra_fields || {},
            history: Array.isArray(item.approval_steps)
              ? item.approval_steps.map((s: any) => ({
                  date: s.created_at || '',
                  actorRole: s.role || 'User',
                  actorName: s.actor_detail?.first_name ? `${s.actor_detail.first_name} ${s.actor_detail.last_name}` : (s.actor_detail?.username || 'User'),
                  action: s.decision || 'Updated',
                  remark: s.notes || s.reason_detail?.text || '',
                }))
              : [],
          }
        })
        setRequests(mapped)
      }

      if (payRes.status === 'fulfilled') {
        setPayments(Array.isArray(payRes.value.data) ? payRes.value.data : payRes.value.data?.results || [])
      }

      if (notifRes.status === 'fulfilled') {
        const rawNotifs = Array.isArray(notifRes.value.data) ? notifRes.value.data : notifRes.value.data?.results || []
        setNotifications(rawNotifs.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          timestamp: n.timestamp || 'Just now',
          dateGroup: 'Today',
          isRead: Boolean(n.is_read || n.isRead),
          requestId: n.request_id || n.requestId,
          type: (n.category || 'Approvals') as any,
          targetRole: savedRole
        })))
      }
    } catch (e) {
      console.warn('Backend requests fetch fallback:', e)
    }
  }

  useEffect(() => {
    refreshBackendRequests()
    const handleUpdate = () => refreshBackendRequests()
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshBackendRequests()
      }
    }
    window.addEventListener('kss_backend_updated', handleUpdate)
    window.addEventListener('focus', handleUpdate)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }
      refreshBackendRequests()
    }, 3000)

    return () => {
      window.removeEventListener('kss_backend_updated', handleUpdate)
      window.removeEventListener('focus', handleUpdate)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(interval)
    }
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
      subcategory: reqData.subcategory || '',
      description: reqData.description,
      quantity: reqData.quantity,
      required_by: reqData.requiredBy || today,
      delivery_location: reqData.deliveryLocation || 'Pune HQ',
      priority: reqData.priority || 'Medium',
      preferred_vendor: reqData.preferredVendor || '',
      justification: reqData.justification || '',
      total_estimated_cost: Number(reqData.estimatedCost) || 0,
      flow_type: reqData.flowType || 'A',
      extra_fields: reqData.extraFields || {},
    })
      .then((res) => {
        if (res && (res.request_id || res.id)) {
          const realId = res.request_id || `REQ-${res.id}`
          setRequests((prev) => prev.map(r => r.id === nextId ? { ...r, id: realId } : r))
        }
        refreshBackendRequests()
        window.dispatchEvent(new Event('kss_backend_updated'))
      })
      .catch((e) => {
        console.warn('Backend persist warning:', e)
        window.dispatchEvent(new Event('kss_backend_updated'))
      })

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

    refreshBackendRequests()
    window.dispatchEvent(new Event('kss_backend_updated'))
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

      refreshBackendRequests()
      window.dispatchEvent(new Event('kss_backend_updated'))
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

    refreshBackendRequests()
    window.dispatchEvent(new Event('kss_backend_updated'))
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
            deliveryRef: trackingRef || r.deliveryRef || `GRN-2026-${r.id.replace(/^(PO-|RFQ-|REQ-)/, '')}`,
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

    refreshBackendRequests()
    window.dispatchEvent(new Event('kss_backend_updated'))
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

    refreshBackendRequests()
    window.dispatchEvent(new Event('kss_backend_updated'))
  }

  const markNotificationRead = async (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    try {
      const { markNotificationRead: apiMarkRead } = await import('../api/notificationApi')
      await apiMarkRead(id)
    } catch (err) {
      console.error('Failed to mark notification read in context:', err)
    }
  }

  const markAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try {
      const { markAllNotificationsRead: apiMarkAllRead } = await import('../api/notificationApi')
      await apiMarkAllRead()
    } catch (err) {
      console.error('Failed to mark all notifications read in context:', err)
    }
  }

  const updateNotificationPreferences = (prefs: Record<string, boolean>) => {
    setNotificationPreferences(prefs)
  }

  const releaseFinancePayment = (paymentIdOrPoRef: string) => {
    const today = new Date().toISOString().split('T')[0]
    setPayments((prev) =>
      prev.map((p) => {
        if (p.id === paymentIdOrPoRef || p.requestId === paymentIdOrPoRef || (p.requestId && paymentIdOrPoRef.includes(p.requestId))) {
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
    const paidKeys = JSON.parse(localStorage.getItem('kss_manager_released_payments') || '[]')
    if (!paidKeys.includes(paymentIdOrPoRef)) {
      const updated = [...paidKeys, paymentIdOrPoRef]
      localStorage.setItem('kss_manager_released_payments', JSON.stringify(updated))
      localStorage.setItem('kss_paid_payments', JSON.stringify(updated))
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
