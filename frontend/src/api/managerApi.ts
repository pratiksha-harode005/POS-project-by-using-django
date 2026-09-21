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
export const approveRequestApi = async (id: string, notes?: string, amount?: number) => {
  try {
    const res = await apiClient.post(`/requests/${id}/process_approval/`, {
      action: 'APPROVE',
      notes,
      amount: amount || undefined
    })
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
  try {
    const res = await apiClient.post(`/procurement/goods-receipts/`, {
      purchase_order: ticketId,
      status: 'Verified',
      notes: `Verified by ${verifiedBy}`
    })
    return res.data
  } catch (err) {
    throw err
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
  } catch (err) {
    throw err
  }
}

/** GET /api/manager/payments/?period=weekly|monthly|yearly */
export const getPaymentData = async (period: 'weekly' | 'monthly' | 'yearly') => {
  try {
    const res = await apiClient.get('/payments/', { params: { period } })
    return res.data
  } catch (err) {
    return { results: [], count: 0 }
  }
}

/** POST /api/manager/rfqs/ */
export const createRFQApi = async (rfqData: any) => {
  try {
    const res = await apiClient.post('/rfq/', rfqData)
    return res.data
  } catch (err) {
    throw err
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
  } catch (err) {
    throw err
  }
}

export { apiClient }
