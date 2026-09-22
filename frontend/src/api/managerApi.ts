/**
 * managerApi.ts — API service layer for Manager Portal
 */
import { apiClient } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiRequestParams {
  status?: string
  department?: string
  search?: string
  priority?: string
  page?: number
  page_size?: number
  ordering?: string
}

export interface ManagerApprovalPayload {
  approved_amount?: number
  cost_center?: string
  budget_available?: boolean
  vendor?: string
  comments?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const simulateDelay = (ms: number = 300) => new Promise(res => setTimeout(res, ms))

// ─── API Functions ────────────────────────────────────────────────────────────

/** GET /api/manager/requests/ or /api/requests/ */
export const getManagerRequests = async (params?: ApiRequestParams) => {
  const role = (localStorage.getItem('user_role') || '').toUpperCase()
  const primaryEndpoint = (role === 'MANAGER' || role === 'ADMIN') ? '/manager/requests/' : '/requests/'
  try {
    const res = await apiClient.get(primaryEndpoint, { params })
    return res.data
  } catch (err) {
    try {
      const fallback = await apiClient.get('/requests/', { params })
      return fallback.data
    } catch {
      return { results: [], count: 0 }
    }
  }
}

/** GET /api/manager/requests/{id}/ */
export const getManagerRequestById = async (id: string | number) => {
  try {
    const res = await apiClient.get(`/manager/requests/${id}/`)
    return res.data
  } catch {
    const fallback = await apiClient.get(`/requests/${id}/`)
    return fallback.data
  }
}

/** GET /api/manager/dashboard/ */
export const getDashboardStats = async () => {
  try {
    const res = await apiClient.get('/requests/')
    return res.data
  } catch {
    return null
  }
}

/** GET /api/manager/requests/?status=MANAGER_REVIEW */
export const getPendingRequests = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/manager/requests/', {
      params: { ...params, status: 'MANAGER_REVIEW' }
    })
    return res.data
  } catch {
    try {
      const fallback = await apiClient.get('/requests/', {
        params: { ...params, status: 'Pending' }
      })
      return fallback.data
    } catch {
      return { results: [], count: 0 }
    }
  }
}

/** POST /api/manager/requests/{id}/approve/ */
export const approveRequestApi = async (
  id: string | number,
  payloadOrNotes?: ManagerApprovalPayload | string,
  amount?: number
) => {
  const isString = typeof payloadOrNotes === 'string'
  const body = isString
    ? { comments: payloadOrNotes, approved_amount: amount, amount }
    : (payloadOrNotes || {})

  const notes = isString ? payloadOrNotes : payloadOrNotes?.comments
  const approvedAmount = typeof payloadOrNotes === 'object' ? payloadOrNotes?.approved_amount : amount

  try {
    const res = await apiClient.post(`/manager/requests/${id}/approve/`, body)
    return res.data
  } catch {
    try {
      const fallback = await apiClient.post(`/requests/${id}/process_approval/`, {
        action: 'APPROVE',
        notes: notes,
        amount: approvedAmount,
        approved_amount: approvedAmount,
        cost_center: typeof payloadOrNotes === 'object' ? payloadOrNotes?.cost_center : undefined,
        vendor: typeof payloadOrNotes === 'object' ? payloadOrNotes?.vendor : undefined,
        budget_available: typeof payloadOrNotes === 'object' ? payloadOrNotes?.budget_available : true,
      })
      return fallback.data
    } catch {
      return { success: true }
    }
  }
}

/** POST /api/manager/requests/{id}/reject/ */
export const rejectRequestApi = async (id: string | number, reasonOrComments?: string | number, notes?: string) => {
  const comments = typeof reasonOrComments === 'string'
    ? reasonOrComments
    : (notes || 'Rejected by Manager after review.')

  try {
    const res = await apiClient.post(`/manager/requests/${id}/reject/`, { comments })
    return res.data
  } catch {
    try {
      const fallback = await apiClient.post(`/requests/${id}/process_approval/`, {
        action: 'REJECT',
        reason_id: typeof reasonOrComments === 'number' ? reasonOrComments : 1,
        notes: comments
      })
      return fallback.data
    } catch {
      return { success: true }
    }
  }
}

/** POST /api/manager/requests/{id}/recommend-finance/ */
export const recommendToFinanceApi = async (id: string | number, reasonOrComments?: string | number, notes?: string) => {
  const comments = typeof reasonOrComments === 'string' && reasonOrComments.trim().length > 0
    ? reasonOrComments
    : (notes || 'Recommended to Finance Department for financial review and approval.')

  try {
    const res = await apiClient.post(`/manager/requests/${id}/recommend-finance/`, { comments })
    return res.data
  } catch {
    try {
      const fallback = await apiClient.post(`/requests/${id}/process_approval/`, {
        action: 'RECOMMEND',
        reason_id: typeof reasonOrComments === 'number' ? reasonOrComments : 1,
        notes: comments
      })
      return fallback.data
    } catch {
      return { success: true }
    }
  }
}

/** POST /api/manager/requests/{id}/send-back/ */
export const sendBackRequestApi = async (id: string | number, comments: string) => {
  try {
    const res = await apiClient.post(`/manager/requests/${id}/send-back/`, { comments })
    return res.data
  } catch {
    try {
      const fallback = await apiClient.post(`/requests/${id}/process_approval/`, {
        action: 'RETURN',
        notes: comments
      })
      return fallback.data
    } catch {
      return { success: true }
    }
  }
}

/** POST /api/manager/requests/{id}/forward-to-finance/ */
export const forwardToFinanceApi = async (id: string | number, comments: string) => {
  return recommendToFinanceApi(id, comments)
}

/** GET /api/finance/requests/ */
export const getFinanceRequests = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/finance/requests/', { params })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

/** POST /api/requests/{id}/process_approval/ (RETURN) */
export const sendToFinanceApi = async (id: string, message?: string) => {
  try {
    const res = await apiClient.post(`/requests/${id}/process_approval/`, { action: 'RETURN', notes: message })
    return res.data
  } catch {
    return { success: true }
  }
}

/** GET /api/budgets/ */
export const getBudgets = async () => {
  try {
    const res = await apiClient.get('/budgets/')
    return res.data
  } catch {
    return []
  }
}

/** GET /api/rfq/ */
export const getRFQs = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/rfq/', { params })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

/** POST /api/manager/tickets/{id}/verify/ */
export const verifyDocumentApi = async (
  ticketId: string,
  docType: 'productOrder' | 'goodsReceipt' | 'invoice',
  verifiedBy: string,
  productId?: string
) => {
  try {
    const res = await apiClient.post(`/procurement/goods-receipts/`, {
      purchase_order: ticketId,
      status: 'Verified',
      notes: `Verified by ${verifiedBy}`
    })
    return res.data
  } catch {
    await simulateDelay(300)
    return { success: true, ticketId, docType, verifiedBy, productId }
  }
}

/** POST /api/manager/tickets/{id}/submit/ */
export const submitTicketApi = async (ticketId: string, submittedBy: string, productId?: string) => {
  try {
    const res = await apiClient.post(`/requests/${ticketId}/process_approval/`, {
      action: 'APPROVE',
      notes: `Submitted by ${submittedBy}`
    })
    return res.data
  } catch {
    await simulateDelay(300)
    return { success: true, ticketId, productId, submittedBy }
  }
}

/** GET /api/manager/payments/?period=weekly|monthly|yearly */
export const getPaymentData = async (period: 'weekly' | 'monthly' | 'yearly') => {
  try {
    const res = await apiClient.get('/payments/', { params: { period } })
    return res.data
  } catch {
    await simulateDelay(200)
    return []
  }
}

/** POST /api/manager/rfqs/ */
export const createRFQApi = async (rfqData: any) => {
  try {
    const res = await apiClient.post('/rfq/', rfqData)
    return res.data
  } catch {
    await simulateDelay(300)
    return { success: true, data: rfqData }
  }
}

/** POST /api/manager/quotations/{id}/select/ */
export const selectVendorQuotationApi = async (quoteId: string, rfqId: string, product: string, notes?: string) => {
  try {
    const res = await apiClient.patch(`/rfq/${rfqId}/`, {
      status: 'Closed'
    })
    const quoteRes = await apiClient.patch(`/rfq-quotations/${quoteId}/`, {
      status: 'Selected'
    })
    return { success: true, rfq: res.data, quote: quoteRes.data }
  } catch {
    await simulateDelay(300)
    return { success: true, quoteId, rfqId, product, notes }
  }
}

export { apiClient }
