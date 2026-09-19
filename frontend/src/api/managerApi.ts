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
  // TODO: uncomment when backend is ready
  // return apiClient.get('/manager/dashboard/').then(r => r.data)
  await simulateDelay()
  return null // context uses computed stats; this is the future real API hook
}

/** GET /api/manager/requests/?status=pending_approval */
export const getPendingRequests = async (params?: ApiRequestParams) => {
  // return apiClient.get('/manager/requests/', { params }).then(r => r.data)
  await simulateDelay()
  return { results: [], count: 0 }
}

/** POST /api/manager/requests/{id}/approve/ */
export const approveRequestApi = async (id: string, notes?: string) => {
  // return apiClient.post(`/manager/requests/${id}/approve/`, { notes }).then(r => r.data)
  await simulateDelay(600)
  return { success: true }
}

/** POST /api/manager/requests/{id}/reject/ */
export const rejectRequestApi = async (id: string, reason: string, notes?: string) => {
  // return apiClient.post(`/manager/requests/${id}/reject/`, { reason, notes }).then(r => r.data)
  await simulateDelay(600)
  return { success: true }
}

/** POST /api/manager/requests/{id}/recommend/ */
export const recommendToFinanceApi = async (id: string, reason: string) => {
  // return apiClient.post(`/manager/requests/${id}/recommend/`, { reason }).then(r => r.data)
  await simulateDelay(600)
  return { success: true }
}

/** POST /api/manager/requests/{id}/send-to-finance/ */
export const sendToFinanceApi = async (id: string, message?: string) => {
  // return apiClient.post(`/manager/requests/${id}/send-to-finance/`, { message }).then(r => r.data)
  await simulateDelay(600)
  return { success: true }
}

/** GET /api/manager/budgets/ */
export const getBudgets = async () => {
  // return apiClient.get('/manager/budgets/').then(r => r.data)
  await simulateDelay()
  return []
}

/** GET /api/manager/rfqs/ */
export const getRFQs = async (params?: ApiRequestParams) => {
  // return apiClient.get('/manager/rfqs/', { params }).then(r => r.data)
  await simulateDelay()
  return { results: [], count: 0 }
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
