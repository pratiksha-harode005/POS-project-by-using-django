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
  vendor?: string
  purchase_order?: string
  request?: string
  [key: string]: any
}

// ─── Helpers ─────────────────────────────────────────────────────────────────



// ─── API Functions ────────────────────────────────────────────────────────────

/** GET /api/manager/dashboard/ (Fetch all requests) */
export const getDashboardStats = async () => {
  try {
    const res = await apiClient.get('/requests/?page_size=1000')
    return res.data
  } catch {
    return null
  }
}

/** GET /api/requests/?status=Pending */
export const getPendingRequests = async (params?: ApiRequestParams) => {
  try {
    const res = await apiClient.get('/requests/', { params: { page_size: 1000, ...params, status: 'Pending' } })
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

/** POST /api/requests/{id}/process_approval/ (Finance recommendation to Admin) */
export const recommendToAdminApi = async (id: string, reason: string, notes?: string) => {
  let matchedReasonId: number | undefined
  try {
    const reasonsResponse = await apiClient.get('/requests/reasons/', {
      params: { reason_type: 'RECOMMEND', page_size: 100 },
    })
    const reasons = Array.isArray(reasonsResponse.data)
      ? reasonsResponse.data
      : reasonsResponse.data?.results || []
    const normalizedReason = (reason || '').toLowerCase()
    const reasonKeywords = normalizedReason.includes('budget') || normalizedReason.includes('delegation') || normalizedReason.includes('exceeds')
      ? ['budget', 'exceeds']
      : normalizedReason.includes('strategic') || normalizedReason.includes('director') || normalizedReason.includes('board') || normalizedReason.includes('executive')
        ? ['executive', 'director', 'high-value', 'strategic']
        : normalizedReason.includes('policy') || normalizedReason.includes('exception')
          ? ['policy exception', 'policy']
          : normalizedReason.includes('cross-department')
            ? ['cross-department']
            : ['additional financial review', 'review', 'recommend']
    const matchedReason = reasons.find((item: { id: number; text: string }) =>
      reasonKeywords.some(keyword => item.text.toLowerCase().includes(keyword))
    ) || reasons[0]

    matchedReasonId = matchedReason?.id
  } catch (err) {
    console.warn('Failed fetching recommendation reasons from backend:', err)
  }

  return apiClient.post(`/requests/${id}/process_approval/`, {
    action: 'RECOMMEND',
    ...(matchedReasonId ? { reason_id: matchedReasonId } : {}),
    notes: [reason, notes].filter(Boolean).join('\n'),
  })
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
    const res = await apiClient.get('/rfq/', { params })
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
  } catch (err) {
    throw err
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

export { apiClient }
