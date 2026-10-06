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
  vendor?: string
  purchase_order?: string
  request?: string
  [key: string]: any
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
    const res = await apiClient.get(primaryEndpoint, { params: { ...params, page_size: 100 } })
    return res.data
  } catch (err) {
    try {
      const fallback = await apiClient.get('/requests/', { params: { ...params, page_size: 100 } })
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

/** GET /api/manager/dashboard/ or /api/requests/ */
export const getDashboardStats = async () => {
  try {
    const role = (localStorage.getItem('user_role') || '').toUpperCase()
    const endpoint = (role === 'MANAGER' || role === 'ADMIN') ? '/manager/requests/' : '/requests/'
    const res = await apiClient.get(endpoint, { params: { page_size: 100 } })
    return res.data
  } catch {
    try {
      const fallback = await apiClient.get('/requests/', { params: { page_size: 100 } })
      return fallback.data
    } catch {
      return null
    }
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
    // page_size capped at 100: backend max_page_size=200 would silently truncate 10000 anyway
    const res = await apiClient.get('/finance/requests/', { params: { ...params, page_size: 100 } })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

/** POST /api/finance/requests/{id}/recommend-admin/ */
export const recommendToAdminApi = async (id: string, reason: string, notes?: string) => {
  const res = await apiClient.post(`/finance/requests/${id}/recommend-admin/`, {
    reason,
    comments: notes || reason,
  })
  return res.data
}

/** POST /api/requests/{id}/process_approval/ (RECOMMEND to Finance) */
export const sendToFinanceApi = async (id: string, message?: string) => {
  try {
    const res = await apiClient.post(`/requests/${id}/process_approval/`, { action: 'RECOMMEND', reason_id: 1, notes: message })
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
    const res = await apiClient.get('/rfq/', { params: { ...params, page_size: 100 } })
    return res.data
  } catch {
    return { results: [], count: 0 }
  }
}

/**
 * Verify a specific Goods Receipt or Invoice document via the proper backend endpoint.
 *
 * @param documentId  - The actual DB record ID to verify:
 *                      for goodsReceipt: the GoodsReceipt receipt_id or PK (e.g. "REC-33EEFBA1" or numeric PK)
 *                      for invoice:      the Invoice invoice_id or PK (e.g. "INV-DELL-E37DC5E8" or numeric PK)
 * @param docType     - 'goodsReceipt' | 'invoice' | 'productOrder'
 * @param verifiedBy  - Name of the person verifying (e.g. "Sarah Manager")
 * @param productId   - (unused, kept for backwards compat)
 */
export const verifyDocumentApi = async (
  documentId: string,
  docType: 'productOrder' | 'goodsReceipt' | 'invoice',
  verifiedBy: string,
  productId?: string
): Promise<any> => {
  const body = { verified_by: verifiedBy }

  // Helper: try an ID as-is, then as numeric PK extracted from the suffix
  const tryVerify = async (baseUrl: string, id: string): Promise<any> => {
    // 1. Try the raw id first (e.g. "REC-33EEFBA1")
    const r1 = await apiClient.patch(`${baseUrl}${id}/verify/`, body).catch(() => null)
    if (r1?.data) return r1.data

    // 2. Try the id without its prefix (e.g. "33EEFBA1") — backend get_object resolves by receipt_id contains
    const stripped = id.replace(/^(REC-|INV-DELL-|INV-|PO-|GRN-|TCK-)/i, '')
    if (stripped && stripped !== id) {
      const r2 = await apiClient.patch(`${baseUrl}${stripped}/verify/`, body).catch(() => null)
      if (r2?.data) return r2.data
    }

    return { success: false, id, docType }
  }

  try {
    if (docType === 'goodsReceipt') {
      // documentId is a GoodsReceipt receipt_id like "REC-33EEFBA1" or PO ID used as fallback
      return await tryVerify('/procurement/goods-receipts/', documentId)
    } else if (docType === 'invoice') {
      // documentId is an Invoice invoice_id like "INV-DELL-E37DC5E8"
      return await tryVerify('/invoices/', documentId)
    } else {
      // productOrder: update PO status to Confirmed
      const cleanId = String(documentId).replace(/^(TCK-|PO-)/i, '')
      const r = await apiClient.patch(`/procurement/purchase-orders/${documentId}/`, { status: 'Confirmed' })
        .catch(() => apiClient.patch(`/procurement/purchase-orders/${cleanId}/`, { status: 'Confirmed' }))
        .catch(() => null)
      return r?.data || { success: false }
    }
  } catch (err) {
    console.error('Failed to verify document via API:', err)
    return { success: false }
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

/** POST /api/payments/ (CREATE / COMPLETE PAYMENT) */
export const createPaymentApi = async (data: {
  requestId?: string
  invoiceId?: string
  poNumber?: string
  amount?: number
  vendor?: string
  paymentMethod?: string
  referenceNumber?: string
  notes?: string
  status?: string
}) => {
  try {
    const res = await apiClient.post('/payments/', {
      purchase_request: data.requestId,
      invoice: data.invoiceId,
      purchase_order: data.poNumber,
      amount: data.amount,
      vendor: data.vendor,
      payment_method: data.paymentMethod || 'Bank Transfer',
      reference_number: data.referenceNumber,
      notes: data.notes,
      status: data.status || 'Paid'
    })
    return res.data
  } catch (err) {
    console.warn('Failed to record payment in backend:', err)
    return null
  }
}

/** POST /api/payments/{id}/mark_paid/ */
export const disbursePaymentApi = async (paymentId: string) => {
  try {
    const cleanId = paymentId.replace(/^PAY-/, '')
    const res = await apiClient.post(`/payments/${paymentId}/mark_paid/`).catch(async () => {
      return await apiClient.post(`/payments/${cleanId}/mark_paid/`)
    })
    return res.data
  } catch (err) {
    console.warn('Failed to mark payment paid in backend:', err)
    return null
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

/** POST /api/rfq/quotations/{id}/select_quotation/ */
export const selectVendorQuotationApi = async (quoteId: string, rfqId: string, product?: string, notes?: string) => {
  try {
    const cleanQuoteId = quoteId.replace(/^QUO-/, '')
    const cleanRfqId = rfqId.replace(/^RFQ-/, '')
    
    // Select quotation on backend (triggers single-Selected enforcement, PO creation, and PR stage advance)
    const quoteRes = await apiClient.post(`/rfq/quotations/${quoteId}/select_quotation/`).catch(async () => {
      return await apiClient.post(`/rfq/quotations/${cleanQuoteId}/select_quotation/`).catch(async () => {
        return await apiClient.patch(`/rfq/quotations/${quoteId}/`, { status: 'Selected' }).catch(async () => {
          return await apiClient.patch(`/rfq/quotations/${cleanQuoteId}/`, { status: 'Selected' })
        })
      })
    })

    // Update RFQ status to Closed/Awarded
    const rfqRes = await apiClient.patch(`/rfq/${cleanRfqId}/`, {
      status: 'Closed'
    }).catch(async () => {
      return await apiClient.patch(`/rfq/${rfqId}/`, { status: 'Closed' })
    }).catch(() => null)

    // Broadcast real-time update to all portal listeners
    window.dispatchEvent(new Event('kss_backend_updated'))
    window.dispatchEvent(new Event('storage'))

    return { success: true, rfq: rfqRes?.data, quote: quoteRes?.data }
  } catch (err) {
    console.error('Error selecting vendor quotation:', err)
    return { success: false, error: err }
  }
}

export const saveResearchApi = async (id: string | number, data: any) => {
  try {
    const res = await apiClient.post(`/manager/requests/${id}/save-research/`, data)
    return res.data
  } catch {
    const fallback = await apiClient.post(`/requests/${id}/save-research/`, data)
    return fallback.data
  }
}

export const savePreEstimationApi = async (id: string | number, data: any) => {
  try {
    const res = await apiClient.post(`/manager/requests/${id}/save-pre-estimation/`, data)
    return res.data
  } catch {
    const fallback = await apiClient.post(`/requests/${id}/save-pre-estimation/`, data)
    return fallback.data
  }
}

/** POST /api/manager/requests/{id}/verify-justification/ (Software & SaaS) */
export const verifyPaymentJustificationApi = async (id: string | number, notes?: string) => {
  const res = await apiClient.post(`/manager/requests/${id}/verify-justification/`, {
    notes: notes || 'Payment justification verified by Manager.',
    comments: notes || 'Payment justification verified by Manager.',
  })
  return res.data
}

export { apiClient }

