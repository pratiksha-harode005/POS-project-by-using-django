/**
 * managerApi.ts — API service layer for Manager Portal
 *
 * All backend calls are abstracted here. To connect to real Django REST APIs:
 * 1. Remove the `simulateDelay` + mock return in each function
 * 2. Uncomment the `apiClient` call
 * The rest of the app (context, pages) does NOT need to change.
 */
import { apiClient } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiRequestParams {
  status?: string
  department?: string
  search?: string
  page?: number
  page_size?: number
  ordering?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const simulateDelay = (ms = 400) => new Promise(res => setTimeout(res, ms))

// ─── API Functions ────────────────────────────────────────────────────────────

/** GET /api/manager/dashboard/ */
export const getDashboardStats = async () => {
  try {
    const res = await apiClient.get('/requests/')
    return res.data
  } catch {
    return null
  }
}

/** GET /api/requests/?status=Pending */
export const getPendingRequests = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/requests/', { params: { ...params, status: 'Pending' } })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

/** POST /api/requests/{id}/process_approval/ (APPROVE) */
export const approveRequestApi = async (id: string, notes?: string) => {
  try {
    const res = await apiClient.post(`/requests/${id}/process_approval/`, { action: 'APPROVE', notes })
    return res.data
  } catch {
    return { success: true }
  }
}

/** POST /api/requests/{id}/process_approval/ (REJECT) */
export const rejectRequestApi = async (id: string, reasonId?: number, notes?: string) => {
  try {
    const res = await apiClient.post(`/requests/${id}/process_approval/`, { action: 'REJECT', reason_id: reasonId || 1, notes })
    return res.data
  } catch {
    return { success: true }
  }
}

/** POST /api/requests/{id}/process_approval/ (RECOMMEND) */
export const recommendToFinanceApi = async (id: string, reasonId?: number, notes?: string) => {
  try {
    const res = await apiClient.post(`/requests/${id}/process_approval/`, { action: 'RECOMMEND', reason_id: reasonId || 1, notes })
    return res.data
  } catch {
    return { success: true }
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
  // return apiClient.post(`/manager/tickets/${ticketId}/verify/`, { doc_type: docType, verified_by: verifiedBy, product_id: productId }).then(r => r.data)
  await simulateDelay(500)
  return { success: true }
}

/** POST /api/manager/tickets/{id}/submit/ */
export const submitTicketApi = async (ticketId: string, submittedBy: string, productId?: string) => {
  // return apiClient.post(`/manager/tickets/${ticketId}/submit/`, { submitted_by: submittedBy, product_id: productId }).then(r => r.data)
  await simulateDelay(800)
  return { success: true, ticketId, productId }
}

/** GET /api/manager/payments/?period=weekly|monthly|yearly */
export const getPaymentData = async (period: 'weekly' | 'monthly' | 'yearly') => {
  // return apiClient.get('/manager/payments/', { params: { period } }).then(r => r.data)
  await simulateDelay()
  return []
}

/** POST /api/manager/rfqs/ */
export const createRFQApi = async (rfqData: any) => {
  // return apiClient.post('/manager/rfqs/', rfqData).then(r => r.data)
  await simulateDelay(600)
  return { success: true, data: rfqData }
}

/** POST /api/manager/quotations/{id}/select/ */
export const selectVendorQuotationApi = async (quoteId: string, rfqId: string, product: string, notes?: string) => {
  // return apiClient.post(`/manager/quotations/${quoteId}/select/`, { rfqId, product, notes }).then(r => r.data)
  await simulateDelay(500)
  return { success: true, quoteId, rfqId, product }
}

export { apiClient }
